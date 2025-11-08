use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, AssetConfig, Epoch, EpochStatus};
use crate::errors::BettingError;
use crate::events::EpochLocked;

/// Lock an epoch once cutoff time is reached (optional, can go straight to close)
/// This is idempotent and anyone can call it
pub fn lock_epoch(
    ctx: Context<LockEpoch>,
    asset_symbol: String,
    epoch_id: u64,
) -> Result<()> {
    let epoch = &mut ctx.accounts.epoch;

    // Check we've reached cutoff time
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= epoch.cutoff_ts,
        BettingError::NotYetCutoff
    );

    // Idempotent: if already locked or settled, do nothing
    if epoch.status == EpochStatus::Locked || epoch.status == EpochStatus::Settled {
        msg!("Epoch already locked or settled");
        return Ok(());
    }

    // Lock the epoch
    epoch.status = EpochStatus::Locked;

    emit!(EpochLocked {
        asset_symbol,
        epoch_id,
        timestamp: clock.unix_timestamp,
        sum_up: epoch.sum_up,
        sum_down: epoch.sum_down,
    });

    msg!("Epoch {} locked", epoch_id);

    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: String, epoch_id: u64)]
pub struct LockEpoch<'info> {
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

    /// Anyone can call this
    pub caller: Signer<'info>,
}
