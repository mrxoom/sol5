const https = require('https');
const path = require('path');

// Load environment variables from /env/.env
require('dotenv').config({ path: path.join(__dirname, '../env/.env') });

async function main() {
  const RPC_HTTP = process.env.RPC_HTTP || "https://fragrant-orbital-road.solana-devnet.quiknode.pro/ba431041d0ed9de5c4535123b41648fc39385a89/";

  console.log("Testing RPC connection...");
  console.log("Endpoint:", RPC_HTTP);

  const data = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getSlot"
  });

  const url = new URL(RPC_HTTP);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.result !== undefined) {
            console.log("✅ RPC connection successful!");
            console.log("Current slot:", response.result);
            resolve(response.result);
          } else if (response.error) {
            console.error("❌ RPC error:", response.error);
            reject(new Error(response.error.message));
          } else {
            console.error("❌ Unexpected response:", body);
            reject(new Error("Unexpected response"));
          }
        } catch (err) {
          console.error("❌ Failed to parse response:", err);
          reject(err);
        }
      });
    });

    req.on('error', (error) => {
      console.error("❌ Connection failed:", error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

main()
  .then(() => {
    console.log("\n🎉 QuickNode RPC is working correctly!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Health check failed:", err.message);
    process.exit(1);
  });
