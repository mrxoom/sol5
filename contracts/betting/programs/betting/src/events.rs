use anchor_lang::prelude::*;
use crate::state::{BetSide, WinningSide};

/// Emitted when a user places a bet
#[event]
pub struct BetPlaced {
    pub user: Pubkey,
    pub asset_symbol: String,
    pub epoch_id: u64,
    pub side: BetSide,
    pub amount: u64,
    pub timestamp: i64,
}

/// Emitted when an epoch is locked (betting closed)
#[event]
pub struct EpochLocked {
    pub asset_symbol: String,
    pub epoch_id: u64,
    pub timestamp: i64,
    pub sum_up: u64,
    pub sum_down: u64,
}

/// Emitted when an epoch is settled
#[event]
pub struct EpochSettled {
    pub asset_symbol: String,
    pub epoch_id: u64,
    pub settle_price: i64,
    pub settle_expo: i32,
    pub winning_side: WinningSide,
    pub fee_amount: u64,
    pub net_pool: u64,
    pub timestamp: i64,
}

/// Emitted when a user claims their winnings
#[event]
pub struct Claimed {
    pub user: Pubkey,
    pub asset_symbol: String,
    pub epoch_id: u64,
    pub payout: u64,
    pub timestamp: i64,
}

/// Emitted when a new epoch is created
#[event]
pub struct EpochCreated {
    pub asset_symbol: String,
    pub epoch_id: u64,
    pub start_ts: i64,
    pub cutoff_ts: i64,
    pub end_ts: i64,
}
