use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, AssetConfig};
use crate::errors::BettingError;

/// Set or update the Pyth price feed for a specific asset
pub fn set_asset_feed(
    ctx: Context<SetAssetFeed>,
    asset_symbol: String,
    pyth_price_account: Pubkey,
    usdc_mint: Pubkey,
) -> Result<()> {
    require!(
        asset_symbol.len() <= AssetConfig::MAX_SYMBOL_LEN,
        BettingError::AssetSymbolTooLong
    );

    let asset_config = &mut ctx.accounts.asset_config;

    asset_config.asset_symbol = asset_symbol.clone();
    asset_config.pyth_price_account = pyth_price_account;
    asset_config.usdc_mint = usdc_mint;
    asset_config.active_epoch_id = 0;
    asset_config.bump = ctx.bumps.asset_config;

    msg!("Asset feed configured: {}", asset_symbol);
    msg!("Pyth price account: {}", pyth_price_account);
    msg!("USDC mint: {}", usdc_mint);

    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: String)]
pub struct SetAssetFeed<'info> {
    #[account(
        init_if_needed,
        payer = admin,
        space = AssetConfig::LEN,
        seeds = [b"asset", asset_symbol.as_bytes()],
        bump
    )]
    pub asset_config: Account<'info, AssetConfig>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ BettingError::Unauthorized
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}
