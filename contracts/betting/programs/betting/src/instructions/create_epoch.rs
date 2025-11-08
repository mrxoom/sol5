use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, AssetConfig, Epoch, EpochStatus, WinningSide, ts_to_epoch_id, epoch_id_to_start_ts};
use crate::events::EpochCreated;

/// Create a new betting epoch for an asset
/// Anyone can call this to create the next epoch on the grid
pub fn create_epoch(
    ctx: Context<CreateEpoch>,
    asset_symbol: String,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let asset_config = &mut ctx.accounts.asset_config;
    let epoch = &mut ctx.accounts.epoch;

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Calculate epoch ID based on current time and epoch grid
    let epoch_id = ts_to_epoch_id(now, config.epoch_length_secs);
    let start_ts = epoch_id_to_start_ts(epoch_id, config.epoch_length_secs);
    let end_ts = start_ts + config.epoch_length_secs as i64;
    let cutoff_ts = end_ts - config.cutoff_secs as i64;

    // Initialize epoch
    epoch.asset_symbol = asset_symbol.clone();
    epoch.epoch_id = epoch_id;
    epoch.start_ts = start_ts;
    epoch.cutoff_ts = cutoff_ts;
    epoch.end_ts = end_ts;
    epoch.settle_price = 0;
    epoch.settle_expo = 0;
    epoch.status = EpochStatus::Open;
    epoch.winning_side = WinningSide::None;
    epoch.sum_up = 0;
    epoch.sum_down = 0;
    epoch.mint = asset_config.usdc_mint;
    epoch.bump = ctx.bumps.epoch;

    // Update active epoch ID
    asset_config.active_epoch_id = epoch_id;

    emit!(EpochCreated {
        asset_symbol,
        epoch_id,
        start_ts,
        cutoff_ts,
        end_ts,
    });

    msg!("Epoch created: {}", epoch_id);
    msg!("Start: {}, Cutoff: {}, End: {}", start_ts, cutoff_ts, end_ts);

    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: String)]
pub struct CreateEpoch<'info> {
    #[account(
        init,
        payer = payer,
        space = Epoch::LEN,
        seeds = [
            b"epoch",
            asset_symbol.as_bytes(),
            &ts_to_epoch_id(Clock::get()?.unix_timestamp, config.epoch_length_secs).to_be_bytes()
        ],
        bump
    )]
    pub epoch: Account<'info, Epoch>,

    #[account(
        mut,
        seeds = [b"asset", asset_symbol.as_bytes()],
        bump = asset_config.bump,
    )]
    pub asset_config: Box<Account<'info, AssetConfig>>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
