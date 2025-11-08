import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { RPC_HTTP, RPC_WS, PROGRAM_ID } from "./config";
import IDL from "./idl/betting.json";

export type BettingProgram = Program<any>;

/**
 * Get Anchor provider instance
 */
export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const opts: anchor.web3.ConfirmOptions = {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  };

  const connection = new Connection(RPC_HTTP, {
    commitment: "confirmed",
    wsEndpoint: RPC_WS,
  });

  return new AnchorProvider(connection, wallet, opts);
}

/**
 * Get the Betting program instance
 */
export function getProgram(provider: AnchorProvider): BettingProgram {
  return new Program(IDL as any, provider);
}

/**
 * Helper to calculate current epoch ID
 */
export function getCurrentEpochId(epochLengthSecs: number = 300): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / epochLengthSecs);
}

/**
 * Helper to calculate epoch timestamps
 */
export function getEpochTimestamps(
  epochId: number,
  epochLengthSecs: number = 300,
  cutoffSecs: number = 30
) {
  const startTs = epochId * epochLengthSecs;
  const endTs = startTs + epochLengthSecs;
  const cutoffTs = endTs - cutoffSecs;

  return {
    startTs,
    cutoffTs,
    endTs,
    startDate: new Date(startTs * 1000),
    cutoffDate: new Date(cutoffTs * 1000),
    endDate: new Date(endTs * 1000),
  };
}

/**
 * Derive config PDA
 */
export function getConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

/**
 * Derive asset config PDA
 */
export function getAssetConfigPda(
  assetSymbol: string,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), Buffer.from(assetSymbol)],
    programId
  );
}

/**
 * Derive epoch PDA
 */
export function getEpochPda(
  assetSymbol: string,
  epochId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const epochIdBe = Buffer.alloc(8);
  epochIdBe.writeBigUInt64BE(BigInt(epochId));

  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), Buffer.from(assetSymbol), epochIdBe],
    programId
  );
}

/**
 * Derive vault PDA
 */
export function getVaultPda(
  usdcMint: PublicKey,
  assetSymbol: string,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), usdcMint.toBuffer(), Buffer.from(assetSymbol)],
    programId
  );
}

/**
 * Derive user bet PDA
 */
export function getUserBetPda(
  user: PublicKey,
  assetSymbol: string,
  epochId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const epochIdBe = Buffer.alloc(8);
  epochIdBe.writeBigUInt64BE(BigInt(epochId));

  return PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), user.toBuffer(), Buffer.from(assetSymbol), epochIdBe],
    programId
  );
}

/**
 * Calculate implied ROI for a side
 */
export function calculateImpliedROI(
  sumUp: number,
  sumDown: number,
  side: "up" | "down",
  feeBps: number = 100
): number {
  const total = sumUp + sumDown;
  if (total === 0) return 0;

  const netPool = total * (1 - feeBps / 10000);
  const poolSide = side === "up" ? sumUp : sumDown;

  if (poolSide === 0) return 0;

  return (netPool / poolSide - 1) * 100; // Return as percentage
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(2);
}

/**
 * Parse USDC amount to smallest units
 */
export function parseUsdc(amount: number): number {
  return Math.floor(amount * 1_000_000);
}
