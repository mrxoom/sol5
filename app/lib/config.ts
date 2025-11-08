import { PublicKey } from "@solana/web3.js";

export interface AssetConfig {
  symbol: string;
  name: string;
  pythPriceAccount: string;
}

// RPC configuration
export const RPC_HTTP = process.env.NEXT_PUBLIC_RPC_HTTP || "http://localhost:8899";
export const RPC_WS = process.env.NEXT_PUBLIC_RPC_WS;

// Program ID (filled after deployment)
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111"
);

// USDC Mint (devnet or mainnet)
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || "11111111111111111111111111111111"
);

// Treasury wallet
export const TREASURY_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_PUBKEY || "11111111111111111111111111111111"
);

// Assets configuration
export const ASSETS: AssetConfig[] = [
  {
    symbol: "BTCUSD",
    name: "Bitcoin",
    pythPriceAccount: process.env.NEXT_PUBLIC_PYTH_BTC || "",
  },
  {
    symbol: "ETHUSD",
    name: "Ethereum",
    pythPriceAccount: process.env.NEXT_PUBLIC_PYTH_ETH || "",
  },
  {
    symbol: "SOLUSD",
    name: "Solana",
    pythPriceAccount: process.env.NEXT_PUBLIC_PYTH_SOL || "",
  },
];

// Epoch settings
export const EPOCH_LENGTH_SECS = 300; // 5 minutes
export const CUTOFF_SECS = 30; // 30 seconds before end
