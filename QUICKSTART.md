# Quick Start Guide

Follow these commands in sequence to deploy and run your Solana betting protocol.

## 1. Environment Setup

```bash
# Copy environment template (already done)
# .env is already configured with QuickNode RPC

# Update TREASURY_PUBKEY in .env with your wallet address
# Get your wallet address:
solana address
```

## 2. Verify QuickNode Connection

```bash
cd scripts
npm install
node health-check.js
```

Expected output:
```
✅ RPC connection successful!
Current slot: <some number>
🎉 QuickNode RPC is working correctly!
```

## 3. Build and Deploy Anchor Program

```bash
cd ../contracts/betting
npm install
anchor build
```

Deploy to devnet using QuickNode:
```bash
anchor deploy --provider.cluster devnet
```

**IMPORTANT**: Copy the deployed program ID from the output!

## 4. Update Program ID

Edit these files with your deployed program ID:

1. `.env`:
```bash
PROGRAM_ID=<your-program-id>
NEXT_PUBLIC_PROGRAM_ID=<your-program-id>
```

2. `contracts/betting/programs/betting/src/lib.rs`:
```rust
declare_id!("<your-program-id>");
```

3. `contracts/betting/Anchor.toml`:
```toml
[programs.devnet]
betting = "<your-program-id>"
```

Then rebuild and redeploy:
```bash
anchor build
anchor deploy --provider.cluster devnet
```

## 5. Initialize Protocol

```bash
cd ../../scripts
npm run deploy
```

This initializes the global configuration and treasury settings.

## 6. Configure Asset Feeds

```bash
npm run set-feeds
```

This sets up Pyth price feeds for BTC/USD, ETH/USD, and SOL/USD.

## 7. Create First Epochs

```bash
npm run create-epoch
```

This creates the first 5-minute betting rounds for each asset.

## 8. Run Frontend

```bash
cd ../app
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## 9. Test the Application

1. **Connect Wallet**: Click "Select Wallet" and connect Phantom/Solflare
2. **Get Devnet SOL** (if needed):
   ```bash
   solana airdrop 2
   # Or use the script:
   cd ../scripts && npm run airdrop
   ```
3. **Get Devnet USDC**: You'll need devnet USDC to place bets
   - Use a devnet faucet or mint devnet USDC
4. **Place a Bet**:
   - Click on an asset (BTC, ETH, or SOL)
   - Enter amount (e.g., 10 USDC)
   - Click BET UP or BET DOWN
5. **Wait for Round to End**: Each round is 5 minutes
6. **Settle the Round**:
   ```bash
   cd ../scripts
   npm run settle BTCUSD <epoch-id>
   ```
7. **Claim Winnings**: If you won, click "Claim" in the UI

## Monitoring

To watch program logs in real-time:
```bash
cd scripts
npm run logs
```

## Complete Command Sequence (Copy-Paste)

```bash
# 1. Verify RPC
cd /Users/ethan/scripts
npm install
node health-check.js

# 2. Build program
cd /Users/ethan/contracts/betting
npm install
anchor build
anchor deploy --provider.cluster devnet

# 3. MANUALLY update program IDs in .env, lib.rs, and Anchor.toml
# Then rebuild:
anchor build
anchor deploy --provider.cluster devnet

# 4. Initialize protocol
cd /Users/ethan/scripts
npm run deploy

# 5. Configure feeds
npm run set-feeds

# 6. Create epochs
npm run create-epoch

# 7. Run frontend
cd /Users/ethan/app
npm install
npm run dev

# 8. (Optional) Monitor logs in another terminal
cd /Users/ethan/scripts
npm run logs
```

## Troubleshooting

### Error: "Program account not found"
- Make sure you deployed the program
- Check that PROGRAM_ID in .env matches the deployed program

### Error: "Insufficient funds"
- Get devnet SOL: `solana airdrop 2`
- Or use: `cd scripts && npm run airdrop`

### Error: "Account does not exist"
- Run deployment steps in order:
  1. deploy.ts (initialize)
  2. set-feeds.ts (configure assets)
  3. create-epoch.ts (create rounds)

### Frontend shows "Asset not found"
- Make sure assets are configured in .env
- Check that Pyth feed addresses are correct

## Next Steps

- Place test bets on devnet
- Wait for epochs to end
- Settle epochs and claim winnings
- Monitor with `npm run logs`
- Read the full README.md for detailed documentation

🎉 You're ready to bet!
