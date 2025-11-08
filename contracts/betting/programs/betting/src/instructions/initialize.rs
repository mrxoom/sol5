use anchor_lang::prelude::*;
use crate::state::GlobalConfig;

/// Initialize the global configuration for the betting protocol
pub fn initialize(
    ctx: Context<Initialize>,
    admin: Pubkey,
    treasury: Pubkey,
    fee_bps: u16,
    settle_tip_lamports: u64,
    cutoff_secs: u32,
    epoch_length_secs: u32,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.admin = admin;
    config.treasury = treasury;
    config.fee_bps = fee_bps;
    config.settle_tip_lamports = settle_tip_lamports;
    config.cutoff_secs = cutoff_secs;
    config.epoch_length_secs = epoch_length_secs;
    config.paused = false;
    config.bump = ctx.bumps.config;

    msg!("Betting protocol initialized");
    msg!("Admin: {}", admin);
    msg!("Treasury: {}", treasury);
    msg!("Fee: {} bps", fee_bps);

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = GlobalConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
