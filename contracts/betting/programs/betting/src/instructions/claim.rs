use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{GlobalConfig, AssetConfig, Epoch, UserBet, EpochStatus, WinningSide, BetSide};
use crate::errors::BettingError;
use crate::events::Claimed;

/// Claim winnings for a settled epoch
pub fn claim(
    ctx: Context<Claim>,
    asset_symbol: String,
    epoch_id: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let epoch = &ctx.accounts.epoch;
    let user_bet = &mut ctx.accounts.user_bet;

    // Check epoch is settled
    require!(
        epoch.status == EpochStatus::Settled,
        BettingError::InvalidEpochStatus
    );

    // Check user hasn't already claimed
    require!(!user_bet.claimed, BettingError::AlreadyClaimed);

    // Check user is a winner
    let is_winner = match (epoch.winning_side.clone(), user_bet.side) {
        (WinningSide::Up, BetSide::Up) => true,
        (WinningSide::Down, BetSide::Down) => true,
        _ => false,
    };

    require!(is_winner, BettingError::NotWinner);

    // Calculate payout
    let payout = epoch.calculate_payout(user_bet.stake, config.fee_bps)?;

    require!(payout > 0, BettingError::ZeroWinningPool);

    // Transfer payout from vault to user
    let seeds = &[
        b"vault",
        ctx.accounts.asset_config.usdc_mint.as_ref(),
        asset_symbol.as_bytes(),
        &[ctx.bumps.vault],
    ];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, payout)?;

    // Mark as claimed
    user_bet.claimed = true;

    let clock = Clock::get()?;
    emit!(Claimed {
        user: ctx.accounts.user.key(),
        asset_symbol,
        epoch_id,
        payout,
        timestamp: clock.unix_timestamp,
    });

    msg!("Claimed {} USDC", payout);

    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: String, epoch_id: u64)]
pub struct Claim<'info> {
    #[account(
        mut,
        seeds = [
            b"bet",
            user.key().as_ref(),
            asset_symbol.as_bytes(),
            &epoch_id.to_be_bytes()
        ],
        bump = user_bet.bump,
        has_one = user @ BettingError::Unauthorized,
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(
        seeds = [
            b"epoch",
            asset_symbol.as_bytes(),
            &epoch_id.to_be_bytes()
        ],
        bump = epoch.bump,
    )]
    pub epoch: Account<'info, Epoch>,

    #[account(
        seeds = [b"asset", asset_symbol.as_bytes()],
        bump = asset_config.bump,
    )]
    pub asset_config: Account<'info, AssetConfig>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    /// Vault token account holding USDC for this asset
    #[account(
        mut,
        seeds = [b"vault", asset_config.usdc_mint.as_ref(), asset_symbol.as_bytes()],
        bump,
        token::mint = asset_config.usdc_mint,
        token::authority = vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// User's USDC token account
    #[account(
        mut,
        token::mint = asset_config.usdc_mint,
    )]
    pub user_ata: Account<'info, TokenAccount>,

    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}
