# Deployment Guide

## Environment Setup

Your environment has been pre-configured with:
- **QuickNode RPC**: https://fragrant-orbital-road.solana-devnet.quiknode.pro/ba431041d0ed9de5c4535123b41648fc39385a89/
- **Treasury**: Fknqi2gLwBtdcHqYWGR7NGewWyLWsquThnbPtXLSXrcJ
- **USDC Mint**: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (Devnet)
- **Pyth Feeds**: BTC/USD, ETH/USD, SOL/USD (Devnet)

All environment variables are configured in `/env/.env`

## Quick Deploy Commands

Run these commands in sequence:

### 1. Verify QuickNode Connection

```bash
cd /Users/ethan/scripts
npm install
node health-check.js
```

Expected output:
```
✅ RPC connection successful!
Current slot: <slot_number>
🎉 QuickNode RPC is working correctly!
```

### 2. Get Devnet SOL

```bash
solana airdrop 2
```

### 3. Build and Deploy Program

```bash
cd /Users/ethan/scripts
npm run deploy-program
```

This will:
- Build the Anchor program
- Deploy to devnet using your QuickNode RPC
- Automatically extract and save PROGRAM_ID to `/env/.env`
- Copy IDL to frontend

### 4. Initialize Protocol

```bash
cd /Users/ethan/scripts
npm run deploy
```

This initializes the global configuration with your treasury address.

### 5. Configure Pyth Feeds

```bash
npm run set-feeds
```

This sets up price feeds for BTC/USD, ETH/USD, and SOL/USD.

### 6. Create First Epochs

```bash
npm run create-epoch
```

This creates the first 5-minute betting rounds for each asset.

### 7. Run Frontend

```bash
cd /Users/ethan/app
npm install
npm run dev
```

Open http://localhost:3000

### 8. (Optional) Monitor Logs

In a separate terminal:
```bash
cd /Users/ethan/scripts
npm run logs
```

## Complete Command Sequence

Copy and paste this entire block:

```bash
# Step 1: Verify RPC
cd /Users/ethan/scripts
npm install
node health-check.js

# Step 2: Get devnet SOL
solana airdrop 2

# Step 3: Build and deploy (auto-updates PROGRAM_ID)
npm run deploy-program

# Step 4: Initialize protocol
npm run deploy

# Step 5: Configure Pyth feeds
npm run set-feeds

# Step 6: Create first epochs
npm run create-epoch

# Step 7: Start frontend
cd /Users/ethan/app
npm install
npm run dev
```

## Verification

After deployment, verify everything works:

1. **Check RPC connection**: `node scripts/health-check.js`
2. **Check Program ID**: `cat env/.env | grep PROGRAM_ID`
3. **Check frontend**: Open http://localhost:3000
4. **Check banner**: Should show your RPC and Treasury address
5. **Connect wallet**: Use Phantom or Solflare
6. **Place test bet**: Try betting 10 USDC on BTC Up/Down

## Environment File

Your `/env/.env` contains:

```bash
RPC_HTTP=https://fragrant-orbital-road.solana-devnet.quiknode.pro/ba431041d0ed9de5c4535123b41648fc39385a89/
RPC_WS=wss://fragrant-orbital-road.solana-devnet.quiknode.pro/ba431041d0ed9de5c4535123b41648fc39385a89/
CLUSTER=devnet
TREASURY_PUBKEY=Fknqi2gLwBtdcHqYWGR7NGewWyLWsquThnbPtXLSXrcJ
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
PROGRAM_ID=<filled by deploy-program script>
```

## Troubleshooting

### "PROGRAM_ID not found"
Run: `npm run deploy-program` to build and deploy

### "Insufficient funds"
Run: `solana airdrop 2`

### "RPC connection failed"
Check your QuickNode endpoint in `/env/.env`

### "Account does not exist"
Run deployment steps in order:
1. deploy-program
2. deploy
3. set-feeds
4. create-epoch

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run health-check` | Test QuickNode RPC connection |
| `npm run deploy-program` | Build + deploy + update PROGRAM_ID |
| `npm run deploy` | Initialize protocol config |
| `npm run set-feeds` | Configure Pyth price feeds |
| `npm run create-epoch` | Create new betting epochs |
| `npm run settle` | Settle a specific epoch |
| `npm run logs` | Monitor program logs |
| `npm run airdrop` | Get devnet SOL |

## Next Steps

After deployment:
1. Connect your wallet (Phantom, Solflare, or Backpack)
2. Get devnet USDC from a faucet
3. Place test bets on BTC, ETH, or SOL
4. Wait 5 minutes for round to end
5. Settle the round: `npm run settle BTCUSD <epoch_id>`
6. Claim winnings if you won

🎉 You're all set!
