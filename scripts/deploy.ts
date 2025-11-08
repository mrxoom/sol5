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
 * Deploy script
 *
 * This script:
 * 1. Builds and deploys the Anchor program
 * 2. Initializes the global config
 * 3. Copies the IDL to the frontend
 */
async function main() {
  // Load environment variables
  const RPC_HTTP = process.env.RPC_HTTP || "http://localhost:8899";
  const TREASURY_PUBKEY = process.env.TREASURY_PUBKEY;
  const SETTLE_TIP_LAMPORTS = parseInt(process.env.SETTLE_TIP_LAMPORTS || "10000");
  const EPOCH_LENGTH_SECS = parseInt(process.env.EPOCH_LENGTH_SECS || "300");
  const CUTOFF_SECS = parseInt(process.env.CUTOFF_SECS || "30");
  const FEE_BPS = 100; // 1%

  if (!TREASURY_PUBKEY) {
    throw new Error("TREASURY_PUBKEY environment variable is required");
  }

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

  console.log("Program ID:", programId.toString());
  console.log("Deployer:", wallet.publicKey.toString());
  console.log("Treasury:", TREASURY_PUBKEY);

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("\nConfig PDA:", configPda.toString());

  // Check if already initialized
  try {
    const config = await program.account.globalConfig.fetch(configPda);
    console.log("\n✅ Protocol already initialized!");
    console.log("Admin:", config.admin.toString());
    console.log("Treasury:", config.treasury.toString());
    console.log("Fee BPS:", config.feeBps);
  } catch (err) {
    // Not initialized, initialize now
    console.log("\n🚀 Initializing protocol...");

    const tx = await program.methods
      .initialize(
        wallet.publicKey,
        new PublicKey(TREASURY_PUBKEY),
        FEE_BPS,
        new anchor.BN(SETTLE_TIP_LAMPORTS),
        CUTOFF_SECS,
        EPOCH_LENGTH_SECS
      )
      .accounts({
        config: configPda,
        payer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Protocol initialized!");
    console.log("Transaction:", tx);
  }

  // Copy IDL to frontend
  const frontendIdlPath = path.join(__dirname, "../app/lib/idl/betting.json");
  fs.mkdirSync(path.dirname(frontendIdlPath), { recursive: true });
  fs.copyFileSync(idlPath, frontendIdlPath);
  console.log("\n✅ IDL copied to frontend");

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
