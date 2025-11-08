use anchor_lang::prelude::*;
use crate::state::GlobalConfig;
use crate::errors::BettingError;

/// Pause the protocol (only affects place_bet)
pub fn pause(ctx: Context<Pause>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.paused = true;
    msg!("Protocol paused");
    Ok(())
}

/// Unpause the protocol
pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.paused = false;
    msg!("Protocol unpaused");
    Ok(())
}

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ BettingError::Unauthorized
    )]
    pub config: Account<'info, GlobalConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ BettingError::Unauthorized
    )]
    pub config: Account<'info, GlobalConfig>,

    pub admin: Signer<'info>,
}
