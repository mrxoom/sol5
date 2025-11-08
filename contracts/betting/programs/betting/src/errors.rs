use anchor_lang::prelude::*;

#[error_code]
pub enum BettingError {
    #[msg("Betting is closed for this epoch (cutoff time has passed)")]
    BettingClosed,

    #[msg("Epoch is already locked")]
    AlreadyLocked,

    #[msg("Epoch is already settled")]
    AlreadySettled,

    #[msg("Invalid or unavailable price from oracle")]
    InvalidPrice,

    #[msg("User is not a winner for this epoch")]
    NotWinner,

    #[msg("User has already claimed their winnings")]
    AlreadyClaimed,

    #[msg("Wrong mint provided (expected USDC)")]
    WrongMint,

    #[msg("Arithmetic overflow occurred")]
    Overflow,

    #[msg("Epoch has not reached cutoff time yet")]
    NotYetCutoff,

    #[msg("Epoch has not reached end time yet")]
    NotYetEnded,

    #[msg("Epoch is not in the correct status for this operation")]
    InvalidEpochStatus,

    #[msg("Protocol is currently paused")]
    Paused,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid bet amount (must be greater than zero)")]
    InvalidBetAmount,

    #[msg("Asset symbol too long")]
    AssetSymbolTooLong,

    #[msg("Epoch is in invalid state and cannot be claimed")]
    EpochInvalid,

    #[msg("Zero total pool for winning side")]
    ZeroWinningPool,

    #[msg("Pyth price account mismatch")]
    PythAccountMismatch,
}
