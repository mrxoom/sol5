import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betting } from "../contracts/betting/target/types/betting";
import { PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from /env/.env
dotenv.config({ path: path.join(__dirname, "../env/.env") });

/**
 * Settle (close) epochs that have reached their end time
 *
 * This is a permissionless operation - anyone can call it and earn a settle tip
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: ts-node settle.ts <ASSET_SYMBOL> <EPOCH_ID>");
    console.log("Example: ts-node settle.ts BTCUSD 12345");
    process.exit(1);
  }

  const assetSymbol = args[0];
  const epochId = parseInt(args[1]);

  // Load environment variables
  const RPC_HTTP = process.env.RPC_HTTP || "http://localhost:8899";
  const USDC_MINT = process.env.USDC_MINT;

  if (!USDC_MINT) {
    throw new Error("USDC_MINT environment variable is required");
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

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [assetConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), Buffer.from(assetSymbol)],
    program.programId
  );

  const [epochPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("epoch"),
      Buffer.from(assetSymbol),
      new anchor.BN(epochId).toArrayLike(Buffer, "be", 8),
    ],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      new PublicKey(USDC_MINT).toBuffer(),
      Buffer.from(assetSymbol),
    ],
    program.programId
  );

  // Get epoch info
  const epoch = await program.account.epoch.fetch(epochPda);
  const assetConfig = await program.account.assetConfig.fetch(assetConfigPda);
  const config = await program.account.globalConfig.fetch(configPda);

  console.log("Asset:", assetSymbol);
  console.log("Epoch ID:", epochId);
  console.log("Status:", epoch.status);
  console.log("End time:", new Date(epoch.endTs.toNumber() * 1000).toISOString());
  console.log("Sum Up:", epoch.sumUp.toString());
  console.log("Sum Down:", epoch.sumDown.toString());

  // Check if already settled
  if (epoch.status.settled || epoch.status.invalid) {
    console.log("\n⚠️  Epoch already settled!");
    process.exit(0);
  }

  // Check if end time reached
  const now = Math.floor(Date.now() / 1000);
  if (now < epoch.endTs.toNumber()) {
    console.log("\n⚠️  Epoch has not reached end time yet!");
    console.log("Wait", epoch.endTs.toNumber() - now, "more seconds");
    process.exit(0);
  }

  // Get treasury ATA (assume it exists, or use associated token account)
  const treasuryAta = anchor.utils.token.associatedAddress({
    mint: new PublicKey(USDC_MINT),
    owner: config.treasury,
  });

  console.log("\n🔧 Settling epoch...");

  try {
    const tx = await program.methods
      .closeEpoch(assetSymbol, new anchor.BN(epochId))
      .accounts({
        epoch: epochPda,
        assetConfig: assetConfigPda,
        config: configPda,
        vault: vaultPda,
        treasuryAta: treasuryAta,
        pythPriceAccount: assetConfig.pythPriceAccount,
        caller: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Epoch settled!");
    console.log("Transaction:", tx);

    // Fetch updated epoch
    const updatedEpoch = await program.account.epoch.fetch(epochPda);
    console.log("\nSettlement results:");
    console.log("Winning side:", updatedEpoch.winningSide);
    console.log("Settle price:", updatedEpoch.settlePrice.toString());
    console.log("Settle expo:", updatedEpoch.settleExpo);
  } catch (err) {
    console.error("❌ Failed to settle:", err);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
