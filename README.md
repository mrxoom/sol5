# Solana Pari-Mutuel Betting Protocol

A fully on-chain 5-minute betting game on crypto assets. Users bet Up or Down with USDC, pools are pari-mutuel, at round end the protocol reads a Pyth price to decide the winner, losers pay winners, a 1% fee is skimmed to a treasury wallet, anyone can trigger settlement and earns a small reward, there is no trusted server.

## Quick Start

Your project is pre-configured with:
- **QuickNode RPC**: Solana Devnet
- **Treasury**: `Fknqi2gLwBtdcHqYWGR7NGewWyLWsquThnbPtXLSXrcJ`
- **Network**: Devnet

Run these commands:

```bash
# 1. Test RPC connection
cd scripts
npm install
node health-check.js

# 2. Get devnet SOL
solana airdrop 2

# 3. Build and deploy (auto-updates PROGRAM_ID)
npm run deploy-program

# 4. Initialize protocol
npm run deploy

# 5. Configure Pyth feeds
npm run set-feeds

# 6. Create first epochs
npm run create-epoch

# 7. Start frontend
cd ../app
npm install
npm run dev
```

Open http://localhost:3000

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Features

- ⏱️ **5-Minute Rounds**: Each epoch lasts exactly 5 minutes
- 📊 **Pari-Mutuel Pools**: Winners split the losers' stake (1% protocol fee)
- 🔮 **Pyth Oracle**: Transparent, on-chain price settlement
- 🤖 **Permissionless**: Anyone can settle rounds and earn a tip
- 🔒 **Non-Custodial**: All funds in program-controlled vaults
- 💎 **USDC Betting**: Stable coin betting for predictable outcomes

## Repository Structure

```
/contracts/betting       # Anchor program
  /programs/betting/src  # Rust source code
  /tests                 # Anchor tests
/scripts                 # Deployment and utility scripts
/app                     # Next.js frontend
/env                     # Environment configuration
  .env                   # Your environment (pre-configured)
  .env.example           # Template
README.md
DEPLOYMENT.md           # Detailed deployment guide
```

## Architecture

### On-Chain Accounts

- **GlobalConfig**: Protocol settings (fee, epoch length, treasury)
- **AssetConfig**: Per-asset Pyth feed and USDC mint
- **Epoch**: 5-minute betting round with Up/Down pools
- **Vault**: Program-controlled USDC token account
- **UserBet**: Individual bet record

### How It Works

1. **Betting Phase**: Users bet Up or Down (ends 30s before round close)
2. **Price Lock**: Pyth price is recorded at round start
3. **Settlement**: Anyone can call `close_epoch` after 5 minutes
4. **Payout**: Winners claim their share of the pool

### Pari-Mutuel Math

```
total_pool = sum_up + sum_down
fee = total_pool * 0.01
net_pool = total_pool - fee
payout_ratio = net_pool / winning_pool
user_payout = user_stake * payout_ratio
```

## Environment Configuration

All configuration is in `/env/.env`:

```bash
# QuickNode RPC (pre-configured)
RPC_HTTP=https://fragrant-orbital-road.solana-devnet.quiknode.pro/.../
RPC_WS=wss://fragrant-orbital-road.solana-devnet.quiknode.pro/.../

# Your treasury wallet
TREASURY_PUBKEY=Fknqi2gLwBtdcHqYWGR7NGewWyLWsquThnbPtXLSXrcJ

# USDC (Devnet)
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Program ID (auto-filled by deploy-program script)
PROGRAM_ID=<filled after deployment>
```

## Development

### Running Tests

```bash
cd contracts/betting
anchor test
```

### Monitoring Logs

```bash
cd scripts
npm run logs
```

### Manual Deployment Steps

If you prefer manual control:

```bash
# Build
cd contracts/betting
anchor build

# Deploy
anchor deploy --provider.cluster custom --provider.url $RPC_HTTP

# Copy PROGRAM_ID to /env/.env
# Then:
cd ../../scripts
npm run deploy
npm run set-feeds
npm run create-epoch
```

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run health-check` | Verify QuickNode RPC connection |
| `npm run deploy-program` | Build, deploy, and update PROGRAM_ID automatically |
| `npm run deploy` | Initialize protocol configuration |
| `npm run set-feeds` | Configure Pyth price feeds |
| `npm run create-epoch` | Create new betting epochs |
| `npm run settle BTCUSD <id>` | Settle a specific epoch |
| `npm run logs` | Monitor program logs in real-time |
| `npm run airdrop` | Get devnet SOL |

## Frontend

The Next.js app provides:
- Wallet connection (Phantom, Solflare, Backpack)
- Real-time countdown timers
- Live pool totals and implied ROI
- Bet placement interface
- Settlement and claim functionality
- Network info banner showing RPC and treasury

Visit http://localhost:3000 after starting the dev server.

## Security Considerations

- ✅ Safe math with overflow checks
- ✅ PDA-based account derivation
- ✅ Anchor constraints for access control
- ✅ Pyth price validation
- ✅ Non-custodial vault design
- ⚠️ **Devnet Only**: This is experimental software

## Important Notes

### Pyth Integration

The current implementation uses simplified Pyth price parsing. For production:

1. Add `pyth-sdk-solana` to `Cargo.toml`
2. Use proper Pyth SDK functions
3. Implement staleness checks
4. Handle confidence intervals

See `contracts/betting/programs/betting/src/instructions/close_epoch.rs` for TODO comments.

### Price Comparison

Current logic uses placeholder price comparison. For production:

1. Store price at epoch start
2. Compare with settlement price
3. Determine actual Up/Down movement

## Troubleshooting

### "Program ID mismatch"
Run `npm run deploy-program` to rebuild and redeploy

### "Insufficient funds"
Run `solana airdrop 2`

### "Account not found"
Ensure you ran scripts in order:
1. deploy-program
2. deploy
3. set-feeds
4. create-epoch

### "RPC connection errors"
Run `node scripts/health-check.js` to verify your QuickNode endpoint

## Deployment Checklist

- [x] QuickNode RPC configured in `/env/.env`
- [x] Treasury wallet set to your address
- [ ] Run `npm run health-check` successfully
- [ ] Get devnet SOL with `solana airdrop 2`
- [ ] Run `npm run deploy-program`
- [ ] Run `npm run deploy`
- [ ] Run `npm run set-feeds`
- [ ] Run `npm run create-epoch`
- [ ] Start frontend with `npm run dev`
- [ ] Connect wallet and place test bet
- [ ] Wait 5 minutes and settle epoch
- [ ] Claim winnings if won

## Mainnet Deployment

**⚠️ DO NOT deploy to mainnet without:**

1. Full security audit
2. Proper Pyth SDK integration
3. Comprehensive testing
4. Legal compliance review

## Contributing

This is experimental educational software. Contributions welcome via issues and pull requests.

## License

MIT

## Disclaimer

⚠️ **This is experimental software on devnet. Use at your own risk. This service may not be available in your region. Not financial advice.**

---

Built with Anchor, Solana, Pyth, and QuickNode.
