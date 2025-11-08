import { Connection, PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from /env/.env
dotenv.config({ path: path.join(__dirname, "../env/.env") });

async function main() {
  const RPC_HTTP = process.env.RPC_HTTP || "https://fragrant-orbital-road.solana-devnet.quiknode.pro/ba431041d0ed9de5c4535123b41648fc39385a89/";
  const RPC_WS = process.env.RPC_WS || "wss://fragrant-orbital-road.solana-devnet.quiknode.pro/ba431041d0ed9de5c4535123b41648fc39385a89/";
  const PROGRAM_ID = process.env.PROGRAM_ID;

  if (!PROGRAM_ID) {
    console.error("❌ PROGRAM_ID environment variable is required");
    console.log("Please deploy your program first and set PROGRAM_ID in .env");
    process.exit(1);
  }

  console.log("Connecting to Solana...");
  console.log("HTTP:", RPC_HTTP);
  console.log("WS:", RPC_WS);
  console.log("Program ID:", PROGRAM_ID);

  const connection = new Connection(RPC_HTTP, {
    commitment: "confirmed",
    wsEndpoint: RPC_WS,
  });

  console.log("\n👂 Listening for program logs...\n");

  const programId = new PublicKey(PROGRAM_ID);

  connection.onLogs(
    programId,
    (logs) => {
      console.log("═══════════════════════════════════════");
      console.log("Signature:", logs.signature);
      console.log("Slot:", logs.context.slot);
      console.log("\nLogs:");
      logs.logs.forEach((log) => console.log("  ", log));
      console.log("═══════════════════════════════════════\n");
    },
    "confirmed"
  );

  console.log("Press Ctrl+C to stop...");

  // Keep process running
  process.on("SIGINT", () => {
    console.log("\n\n👋 Stopped listening");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
