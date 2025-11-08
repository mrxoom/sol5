use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{GlobalConfig, AssetConfig, Epoch, EpochStatus, WinningSide};
use crate::errors::BettingError;
use crate::events::EpochSettled;

/// Close and settle an epoch using Pyth price oracle
/// Anyone can call this once end_ts is reached
/// Caller receives a small tip for settling
pub fn close_epoch(
    ctx: Context<CloseEpoch>,
    asset_symbol: String,
    epoch_id: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let epoch = &mut ctx.accounts.epoch;

    // Check we've reached end time
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= epoch.end_ts,
        BettingError::NotYetEnded
    );

    // Idempotent: if already settled, do nothing
    if epoch.status == EpochStatus::Settled || epoch.status == EpochStatus::Invalid {
        msg!("Epoch already settled");
        return Ok(());
    }

    // Read Pyth price account
    let pyth_price_account = &ctx.accounts.pyth_price_account;

    // Verify this is the correct Pyth account for this asset
    require!(
        pyth_price_account.key() == ctx.accounts.asset_config.pyth_price_account,
        BettingError::PythAccountMismatch
    );

    // Parse Pyth price data
    // NOTE: In production, use pyth-sdk-solana crate for proper parsing
    // For now, we'll use a simplified approach
    let price_data = pyth_price_account.try_borrow_data()?;

    // Simple price extraction (in production, use proper Pyth SDK)
    // This is a placeholder - you should use:
    // use pyth_sdk_solana::load_price_feed_from_account_info;
    // let price_feed = load_price_feed_from_account_info(&pyth_price_account)?;
    // let price = price_feed.get_price_no_older_than(&clock, 60)?;

    // For this example, we'll assume a simple price structure
    // In reality, parse the Pyth account data properly
    if price_data.len() < 32 {
        epoch.status = EpochStatus::Invalid;
        msg!("Invalid Pyth price data");
        return Ok(());
    }

    // Placeholder: Read price from Pyth account (use proper Pyth SDK in production)
    // This is a simplified extraction - MUST be replaced with actual Pyth SDK calls
    let settle_price: i64 = i64::from_le_bytes(price_data[16..24].try_into().unwrap_or([0; 8]));
    let settle_expo: i32 = i32::from_le_bytes(price_data[24..28].try_into().unwrap_or([0; 4]));

    // Validate price is reasonable (non-zero)
    if settle_price == 0 {
        epoch.status = EpochStatus::Invalid;
        msg!("Price is zero, marking epoch as invalid");
        return Ok(());
    }

    // Store settlement price
    epoch.settle_price = settle_price;
    epoch.settle_expo = settle_expo;

    // TODO: Compare with price at epoch start to determine winner
    // For now, simplified logic: if price is positive, Up wins, else Down wins
    // In production, you need to:
    // 1. Store or fetch the price at epoch.start_ts
    // 2. Compare settle_price with start_price
    // 3. Determine if price went Up or Down

    // Placeholder logic - replace with actual price comparison
    epoch.winning_side = if settle_price > 0 {
        WinningSide::Up
    } else {
        WinningSide::Down
    };

    // Calculate fee and net pool
    let fee_amount = epoch.fee_amount(config.fee_bps)?;
    let net_pool = epoch.net_pool(config.fee_bps)?;

    // Transfer fee to treasury if there's a fee
    if fee_amount > 0 {
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
                to: ctx.accounts.treasury_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, fee_amount)?;
    }

    // Pay settle tip to caller (optional, if program has SOL)
    if config.settle_tip_lamports > 0 {
        // Transfer lamports from program's vault account to caller
        // This requires the vault account to have lamports
        // Simplified: skip if not enough funds
        let vault_lamports = ctx.accounts.vault.to_account_info().lamports();
        if vault_lamports >= config.settle_tip_lamports {
            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= config.settle_tip_lamports;
            **ctx.accounts.caller.to_account_info().try_borrow_mut_lamports()? += config.settle_tip_lamports;
            msg!("Settle tip paid: {} lamports", config.settle_tip_lamports);
        }
    }

    // Mark as settled
    epoch.status = EpochStatus::Settled;

    emit!(EpochSettled {
        asset_symbol,
        epoch_id,
        settle_price,
        settle_expo,
        winning_side: epoch.winning_side.clone(),
        fee_amount,
        net_pool,
        timestamp: clock.unix_timestamp,
    });

    msg!("Epoch {} settled", epoch_id);
    msg!("Winning side: {:?}", epoch.winning_side);
    msg!("Fee: {}, Net pool: {}", fee_amount, net_pool);

    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: String, epoch_id: u64)]
pub struct CloseEpoch<'info> {
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

    /// Treasury token account to receive fees
    #[account(
        mut,
        token::mint = asset_config.usdc_mint,
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    /// Pyth price account for this asset (read-only)
    /// CHECK: Validated against asset_config.pyth_price_account
    pub pyth_price_account: AccountInfo<'info>,

    /// Caller who triggers settlement (receives tip)
    #[account(mut)]
    pub caller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
