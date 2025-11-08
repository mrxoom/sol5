use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod events;
pub mod instructions;

use instructions::*;
use state::BetSide;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod betting {
    use super::*;

    /// Initialize the global betting protocol configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        admin: Pubkey,
        treasury: Pubkey,
        fee_bps: u16,
        settle_tip_lamports: u64,
        cutoff_secs: u32,
        epoch_length_secs: u32,
    ) -> Result<()> {
        instructions::initialize(
            ctx,
            admin,
            treasury,
            fee_bps,
            settle_tip_lamports,
            cutoff_secs,
            epoch_length_secs,
        )
    }

    /// Set or update the Pyth price feed for a specific asset
    pub fn set_asset_feed(
        ctx: Context<SetAssetFeed>,
        asset_symbol: String,
        pyth_price_account: Pubkey,
        usdc_mint: Pubkey,
    ) -> Result<()> {
        instructions::set_asset_feed(ctx, asset_symbol, pyth_price_account, usdc_mint)
    }

    /// Create a new betting epoch for an asset
    pub fn create_epoch(
        ctx: Context<CreateEpoch>,
        asset_symbol: String,
    ) -> Result<()> {
        instructions::create_epoch(ctx, asset_symbol)
    }

    /// Place a bet on Up or Down for a specific epoch
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        asset_symbol: String,
        epoch_id: u64,
        side: BetSide,
        amount: u64,
    ) -> Result<()> {
        instructions::place_bet(ctx, asset_symbol, epoch_id, side, amount)
    }

    /// Lock an epoch once cutoff time is reached
    pub fn lock_epoch(
        ctx: Context<LockEpoch>,
        asset_symbol: String,
        epoch_id: u64,
    ) -> Result<()> {
        instructions::lock_epoch(ctx, asset_symbol, epoch_id)
    }

    /// Close and settle an epoch using Pyth price oracle
    pub fn close_epoch(
        ctx: Context<CloseEpoch>,
        asset_symbol: String,
        epoch_id: u64,
    ) -> Result<()> {
        instructions::close_epoch(ctx, asset_symbol, epoch_id)
    }

    /// Claim winnings for a settled epoch
    pub fn claim(
        ctx: Context<Claim>,
        asset_symbol: String,
        epoch_id: u64,
    ) -> Result<()> {
        instructions::claim(ctx, asset_symbol, epoch_id)
    }

    /// Pause the protocol (only affects place_bet)
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        instructions::pause(ctx)
    }

    /// Unpause the protocol
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        instructions::unpause(ctx)
    }
}
