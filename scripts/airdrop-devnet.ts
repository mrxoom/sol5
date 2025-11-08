import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from /env/.env
dotenv.config({ path: path.join(__dirname, "../env/.env") });

/**
 * Airdrop SOL to wallet on devnet for testing
 */
async function main() {
  const RPC_HTTP = process.env.RPC_HTTP || "https://api.devnet.solana.com";
  const connection = new Connection(RPC_HTTP, "confirmed");

  // Load wallet
  const walletPath = path.join(process.env.HOME || "", ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("Wallet:", walletKeypair.publicKey.toString());
  console.log("Requesting airdrop...");

  try {
    const signature = await connection.requestAirdrop(
      walletKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(signature, "confirmed");

    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("✅ Airdrop successful!");
    console.log("New balance:", balance / LAMPORTS_PER_SOL, "SOL");
  } catch (err) {
    console.error("❌ Airdrop failed:", err);

    // Show current balance anyway
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("Current balance:", balance / LAMPORTS_PER_SOL, "SOL");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
