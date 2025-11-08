import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const execAsync = promisify(exec);

// Load environment variables from /env/.env
const envPath = path.join(__dirname, "../env/.env");
dotenv.config({ path: envPath });

/**
 * Deploy script that:
 * 1. Builds the Anchor program
 * 2. Deploys to devnet using QuickNode RPC
 * 3. Extracts the PROGRAM_ID from deploy output
 * 4. Writes PROGRAM_ID to /env/.env
 */
async function main() {
  const RPC_HTTP = process.env.RPC_HTTP;

  if (!RPC_HTTP) {
    throw new Error("RPC_HTTP not found in environment variables");
  }

  console.log("📦 Building Anchor program...\n");

  try {
    // Change to contracts/betting directory
    const contractsDir = path.join(__dirname, "../contracts/betting");
    process.chdir(contractsDir);

    // Build the program
    const { stdout: buildOutput, stderr: buildError } = await execAsync("anchor build");
    console.log(buildOutput);
    if (buildError) console.error(buildError);

    console.log("\n✅ Build complete!\n");

    console.log("🚀 Deploying to devnet...\n");

    // Deploy the program
    const deployCommand = `anchor deploy --provider.cluster custom --provider.url ${RPC_HTTP}`;
    const { stdout: deployOutput, stderr: deployError } = await execAsync(deployCommand);

    console.log(deployOutput);
    if (deployError) console.error(deployError);

    // Extract program ID from deploy output
    // Look for line like: "Program Id: <program_id>"
    const programIdMatch = deployOutput.match(/Program Id[:\s]+([1-9A-HJ-NP-Za-km-z]{32,44})/);

    if (!programIdMatch || !programIdMatch[1]) {
      console.error("❌ Could not extract Program ID from deploy output");
      console.log("Please manually copy the Program ID to /env/.env");
      process.exit(1);
    }

    const programId = programIdMatch[1];
    console.log("\n✅ Deployment successful!");
    console.log("Program ID:", programId);

    // Update .env file with PROGRAM_ID
    console.log("\n📝 Updating /env/.env with PROGRAM_ID...");

    let envContent = fs.readFileSync(envPath, "utf-8");

    // Replace PROGRAM_ID lines
    envContent = envContent.replace(/^PROGRAM_ID=.*/m, `PROGRAM_ID=${programId}`);
    envContent = envContent.replace(
      /^NEXT_PUBLIC_PROGRAM_ID=.*/m,
      `NEXT_PUBLIC_PROGRAM_ID=${programId}`
    );

    fs.writeFileSync(envPath, envContent, "utf-8");

    console.log("✅ /env/.env updated with PROGRAM_ID");

    // Also copy to root .env
    const rootEnvPath = path.join(__dirname, "../.env");
    fs.writeFileSync(rootEnvPath, envContent, "utf-8");
    console.log("✅ /.env updated with PROGRAM_ID");

    // Copy IDL to frontend
    const idlSource = path.join(contractsDir, "target/idl/betting.json");
    const idlDest = path.join(__dirname, "../app/lib/idl/betting.json");

    if (fs.existsSync(idlSource)) {
      fs.mkdirSync(path.dirname(idlDest), { recursive: true });
      fs.copyFileSync(idlSource, idlDest);
      console.log("✅ IDL copied to frontend");
    }

    console.log("\n🎉 Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. cd scripts");
    console.log("2. npm run deploy       # Initialize protocol");
    console.log("3. npm run set-feeds    # Configure Pyth feeds");
    console.log("4. npm run create-epoch # Create first epochs");
    console.log("5. cd ../app && npm run dev # Start frontend");
  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
