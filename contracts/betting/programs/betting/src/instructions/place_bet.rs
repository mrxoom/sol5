use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{GlobalConfig, AssetConfig, Epoch, UserBet, BetSide, EpochStatus};
use crate::errors::BettingError;
use crate::events::BetPlaced;

/// Place a bet on Up or Down for a specific epoch
pub fn place_bet(
    ctx: Context<PlaceBet>,
    asset_symbol: String,
    epoch_id: u64,
    side: BetSide,
    amount: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let epoch = &mut ctx.accounts.epoch;
    let user_bet = &mut ctx.accounts.user_bet;

    // Check protocol is not paused
    require!(!config.paused, BettingError::Paused);

    // Check amount is valid
    require!(amount > 0, BettingError::InvalidBetAmount);

    // Check epoch status
    require!(
        epoch.status == EpochStatus::Open,
        BettingError::InvalidEpochStatus
    );

    // Check we haven't reached cutoff time
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp < epoch.cutoff_ts,
        BettingError::BettingClosed
    );

    // Check mint matches
    require!(
        ctx.accounts.vault.mint == epoch.mint,
        BettingError::WrongMint
    );

    // Transfer USDC from user to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // Update epoch pool totals
    match side {
        BetSide::Up => {
            epoch.sum_up = epoch.sum_up
                .checked_add(amount)
                .ok_or(BettingError::Overflow)?;
        }
        BetSide::Down => {
            epoch.sum_down = epoch.sum_down
                .checked_add(amount)
                .ok_or(BettingError::Overflow)?;
        }
    }

    // Record user bet
    user_bet.user = ctx.accounts.user.key();
    user_bet.asset_symbol = asset_symbol.clone();
    user_bet.epoch_id = epoch_id;
    user_bet.side = side;
    user_bet.stake = amount;
    user_bet.claimed = false;
    user_bet.bump = ctx.bumps.user_bet;

    emit!(BetPlaced {
        user: ctx.accounts.user.key(),
        asset_symbol,
        epoch_id,
        side,
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!("Bet placed: {:?} {} USDC", side, amount);

    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: String, epoch_id: u64, side: BetSide, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(
        init,
        payer = user,
        space = UserBet::LEN,
        seeds = [
            b"bet",
            user.key().as_ref(),
            asset_symbol.as_bytes(),
            &epoch_id.to_be_bytes()
        ],
        bump
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(
        mut,
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
        token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
