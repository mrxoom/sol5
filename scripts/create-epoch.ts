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
 * Create new epochs for all configured assets
 */
async function main() {
  // Load environment variables
  const RPC_HTTP = process.env.RPC_HTTP || "http://localhost:8899";
  const PYTH_FEEDS_JSON = process.env.PYTH_FEEDS_JSON;

  if (!PYTH_FEEDS_JSON) {
    throw new Error("PYTH_FEEDS_JSON environment variable is required");
  }

  // Parse Pyth feeds to get asset symbols
  const pythFeeds = JSON.parse(PYTH_FEEDS_JSON);

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

  // Get config to read epoch length
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const config = await program.account.globalConfig.fetch(configPda);
  const epochLengthSecs = config.epochLengthSecs;

  console.log("Epoch length:", epochLengthSecs, "seconds");

  // Create epoch for each asset
  for (const feed of pythFeeds) {
    const symbol = feed.symbol;
    console.log(`\n🔧 Creating epoch for ${symbol}...`);

    const [assetConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("asset"), Buffer.from(symbol)],
      program.programId
    );

    // Calculate current epoch ID
    const now = Math.floor(Date.now() / 1000);
    const epochId = Math.floor(now / epochLengthSecs);

    const [epochPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("epoch"),
        Buffer.from(symbol),
        new anchor.BN(epochId).toArrayLike(Buffer, "be", 8),
      ],
      program.programId
    );

    try {
      const tx = await program.methods
        .createEpoch(symbol)
        .accounts({
          epoch: epochPda,
          assetConfig: assetConfigPda,
          config: configPda,
          payer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const epoch = await program.account.epoch.fetch(epochPda);

      console.log(`✅ Epoch created for ${symbol}`);
      console.log("Epoch ID:", epochId);
      console.log("Epoch PDA:", epochPda.toString());
      console.log("Start:", new Date(epoch.startTs.toNumber() * 1000).toISOString());
      console.log("Cutoff:", new Date(epoch.cutoffTs.toNumber() * 1000).toISOString());
      console.log("End:", new Date(epoch.endTs.toNumber() * 1000).toISOString());
      console.log("Transaction:", tx);
    } catch (err) {
      console.error(`❌ Failed to create epoch for ${symbol}:`, err.message);
    }
  }

  console.log("\n🎉 All epochs created!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
