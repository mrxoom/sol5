import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betting } from "../contracts/betting/target/types/betting";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from /env/.env
dotenv.config({ path: path.join(__dirname, "../env/.env") });

/**
 * Set Pyth price feeds for assets
 *
 * This script configures the Pyth price feed addresses for each trading asset.
 */
async function main() {
  // Load environment variables
  const RPC_HTTP = process.env.RPC_HTTP || "http://localhost:8899";
  const USDC_MINT = process.env.USDC_MINT;
  const PYTH_FEEDS_JSON = process.env.PYTH_FEEDS_JSON;

  if (!USDC_MINT) {
    throw new Error("USDC_MINT environment variable is required");
  }

  if (!PYTH_FEEDS_JSON) {
    throw new Error("PYTH_FEEDS_JSON environment variable is required");
  }

  // Parse Pyth feeds
  const pythFeeds = JSON.parse(PYTH_FEEDS_JSON);
  console.log("Pyth feeds to configure:", pythFeeds);

  // Setup provider
  const connection = new anchor.web3.Connection(RPC_HTTP, "confirmed");
  const walletPath = path.join(process.env.HOME || "", ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  anchor.setProvider(provider);

  // Load program
  const idlPath = path.join(__dirname, "../contracts/betting/target/idl/betting.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address || idl.metadata.address);

  const program = new Program(idl, programId, provider) as Program<Betting>;

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Configure each feed
  for (const feed of pythFeeds) {
    const { symbol, price } = feed;
    console.log(`\n🔧 Configuring ${symbol}...`);

    const [assetConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("asset"), Buffer.from(symbol)],
      program.programId
    );

    try {
      const tx = await program.methods
        .setAssetFeed(
          symbol,
          new PublicKey(price),
          new PublicKey(USDC_MINT)
        )
        .accounts({
          assetConfig: assetConfigPda,
          config: configPda,
          admin: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ ${symbol} configured`);
      console.log("Asset Config PDA:", assetConfigPda.toString());
      console.log("Transaction:", tx);
    } catch (err) {
      console.error(`❌ Failed to configure ${symbol}:`, err);
    }
  }

  console.log("\n🎉 All feeds configured!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
