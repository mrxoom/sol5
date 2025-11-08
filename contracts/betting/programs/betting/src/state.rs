use anchor_lang::prelude::*;

/// Global configuration for the betting protocol
/// PDA: ["config"]
#[account]
pub struct GlobalConfig {
    /// Admin authority who can pause and update settings
    pub admin: Pubkey,
    /// Treasury wallet that receives protocol fees
    pub treasury: Pubkey,
    /// Fee in basis points (100 = 1%)
    pub fee_bps: u16,
    /// Reward in lamports for settling an epoch
    pub settle_tip_lamports: u64,
    /// Seconds before epoch end when betting is disabled
    pub cutoff_secs: u32,
    /// Duration of each epoch in seconds (300 = 5 minutes)
    pub epoch_length_secs: u32,
    /// Emergency pause flag (pauses place_bet only)
    pub paused: bool,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // treasury
        2 + // fee_bps
        8 + // settle_tip_lamports
        4 + // cutoff_secs
        4 + // epoch_length_secs
        1 + // paused
        1; // bump
}

/// Configuration for a specific asset (e.g., BTC/USD, ETH/USD)
/// PDA: ["asset", asset_symbol]
#[account]
pub struct AssetConfig {
    /// Symbol identifier (e.g., "BTCUSD")
    pub asset_symbol: String,
    /// Pyth price feed account for this asset
    pub pyth_price_account: Pubkey,
    /// USDC mint address
    pub usdc_mint: Pubkey,
    /// Current active epoch ID
    pub active_epoch_id: u64,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl AssetConfig {
    pub const MAX_SYMBOL_LEN: usize = 16;

    pub const LEN: usize = 8 + // discriminator
        4 + Self::MAX_SYMBOL_LEN + // asset_symbol (String with length prefix)
        32 + // pyth_price_account
        32 + // usdc_mint
        8 + // active_epoch_id
        1; // bump
}

/// Epoch status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum EpochStatus {
    /// Bets are being accepted
    Open,
    /// Betting cutoff reached, waiting for settlement
    Locked,
    /// Settlement complete, winners can claim
    Settled,
    /// Price feed invalid, refunds available
    Invalid,
}

/// Winning side enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum WinningSide {
    /// Price went up
    Up,
    /// Price went down
    Down,
    /// No winner (price unchanged or invalid)
    None,
}

/// Betting side enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Copy)]
pub enum BetSide {
    Up = 0,
    Down = 1,
}

/// Represents a single 5-minute betting round for an asset
/// PDA: ["epoch", asset_symbol, epoch_id (u64 in BE bytes)]
#[account]
pub struct Epoch {
    /// Asset symbol this epoch is for
    pub asset_symbol: String,
    /// Sequential epoch identifier
    pub epoch_id: u64,
    /// Timestamp when epoch started (betting opens)
    pub start_ts: i64,
    /// Timestamp when betting closes (30s before end)
    pub cutoff_ts: i64,
    /// Timestamp when epoch ends and can be settled
    pub end_ts: i64,
    /// Settlement price (i64 mantissa from Pyth)
    pub settle_price: i64,
    /// Settlement price exponent (i32 from Pyth)
    pub settle_expo: i32,
    /// Current status of the epoch
    pub status: EpochStatus,
    /// Which side won after settlement
    pub winning_side: WinningSide,
    /// Total USDC bet on Up
    pub sum_up: u64,
    /// Total USDC bet on Down
    pub sum_down: u64,
    /// USDC mint for this epoch
    pub mint: Pubkey,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl Epoch {
    pub const LEN: usize = 8 + // discriminator
        4 + AssetConfig::MAX_SYMBOL_LEN + // asset_symbol
        8 + // epoch_id
        8 + // start_ts
        8 + // cutoff_ts
        8 + // end_ts
        8 + // settle_price
        4 + // settle_expo
        1 + 1 + // status (enum: 1 discriminant + max variant size)
        1 + 1 + // winning_side (enum)
        8 + // sum_up
        8 + // sum_down
        32 + // mint
        1; // bump

    /// Calculate net pool after fees
    pub fn net_pool(&self, fee_bps: u16) -> Result<u64> {
        let total = (self.sum_up as u128)
            .checked_add(self.sum_down as u128)
            .ok_or(error!(crate::errors::BettingError::Overflow))?;

        let fee = (total * fee_bps as u128) / 10_000u128;
        let net = total.checked_sub(fee)
            .ok_or(error!(crate::errors::BettingError::Overflow))?;

        Ok(net as u64)
    }

    /// Calculate fee amount
    pub fn fee_amount(&self, fee_bps: u16) -> Result<u64> {
        let total = (self.sum_up as u128)
            .checked_add(self.sum_down as u128)
            .ok_or(error!(crate::errors::BettingError::Overflow))?;

        let fee = (total * fee_bps as u128) / 10_000u128;
        Ok(fee as u64)
    }

    /// Calculate payout for a winning bet
    pub fn calculate_payout(&self, stake: u64, fee_bps: u16) -> Result<u64> {
        let net_pool = self.net_pool(fee_bps)? as u128;
        let pool_winning_side = match self.winning_side {
            WinningSide::Up => self.sum_up,
            WinningSide::Down => self.sum_down,
            WinningSide::None => return Ok(0),
        } as u128;

        if pool_winning_side == 0 {
            return Ok(0);
        }

        // payout = stake * net_pool / pool_winning_side
        let payout = (stake as u128)
            .checked_mul(net_pool)
            .ok_or(error!(crate::errors::BettingError::Overflow))?
            .checked_div(pool_winning_side)
            .ok_or(error!(crate::errors::BettingError::Overflow))?;

        Ok(payout as u64)
    }
}

/// Represents a user's bet in a specific epoch
/// PDA: ["bet", user, asset_symbol, epoch_id (u64 in BE bytes)]
#[account]
pub struct UserBet {
    /// User who placed the bet
    pub user: Pubkey,
    /// Asset symbol
    pub asset_symbol: String,
    /// Epoch ID
    pub epoch_id: u64,
    /// Side of the bet (Up or Down)
    pub side: BetSide,
    /// Amount staked in USDC
    pub stake: u64,
    /// Whether the user has claimed their winnings
    pub claimed: bool,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl UserBet {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        4 + AssetConfig::MAX_SYMBOL_LEN + // asset_symbol
        8 + // epoch_id
        1 + 1 + // side (enum)
        8 + // stake
        1 + // claimed
        1; // bump
}

/// Helper function to convert epoch grid timestamp to epoch ID
pub fn ts_to_epoch_id(ts: i64, epoch_length_secs: u32) -> u64 {
    (ts / epoch_length_secs as i64) as u64
}

/// Helper function to convert epoch ID to start timestamp
pub fn epoch_id_to_start_ts(epoch_id: u64, epoch_length_secs: u32) -> i64 {
    (epoch_id as i64) * (epoch_length_secs as i64)
}
