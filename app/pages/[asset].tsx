import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "../components/Wallet";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import {
  getProvider,
  getProgram,
  getCurrentEpochId,
  getEpochTimestamps,
  getEpochPda,
  getAssetConfigPda,
  getConfigPda,
  getVaultPda,
  getUserBetPda,
  calculateImpliedROI,
  formatUsdc,
  parseUsdc,
} from "../lib/anchor";
import { ASSETS, USDC_MINT } from "../lib/config";

export default function AssetPage() {
  const router = useRouter();
  const { asset: assetSymbol } = router.query;
  const { connection } = useConnection();
  const wallet = useWallet();

  const [loading, setLoading] = useState(true);
  const [epoch, setEpoch] = useState<any>(null);
  const [epochId, setEpochId] = useState<number>(0);
  const [timestamps, setTimestamps] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<string>("10");
  const [submitting, setSubmitting] = useState(false);

  const asset = ASSETS.find((a) => a.symbol === assetSymbol);

  // Calculate current epoch ID and timestamps
  useEffect(() => {
    if (!assetSymbol) return;

    const currentEpochId = getCurrentEpochId();
    setEpochId(currentEpochId);

    const ts = getEpochTimestamps(currentEpochId);
    setTimestamps(ts);
  }, [assetSymbol]);

  // Load epoch data
  useEffect(() => {
    if (!assetSymbol || !wallet.publicKey || !timestamps) return;

    const loadEpoch = async () => {
      try {
        const provider = getProvider(wallet as any);
        const program = getProgram(provider);

        const [epochPda] = getEpochPda(assetSymbol as string, epochId);

        // Check if program has account methods (will be undefined with placeholder IDL)
        if (program.account && (program.account as any).epoch) {
          const epochAccount = await (program.account as any).epoch.fetch(epochPda);
          setEpoch(epochAccount);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to load epoch:", err);
        setEpoch(null);
        setLoading(false);
      }
    };

    loadEpoch();
  }, [assetSymbol, wallet.publicKey, epochId, timestamps]);

  // Update countdown timer
  useEffect(() => {
    if (!timestamps) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = timestamps.endTs - now;
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamps]);

  // Place bet handler
  const placeBet = async (side: "up" | "down") => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    if (!assetSymbol) return;

    setSubmitting(true);

    try {
      const provider = getProvider(wallet as any);
      const program = getProgram(provider);

      const amount = parseUsdc(parseFloat(betAmount));

      const [epochPda] = getEpochPda(assetSymbol as string, epochId);
      const [assetConfigPda] = getAssetConfigPda(assetSymbol as string);
      const [configPda] = getConfigPda();
      const [vaultPda] = getVaultPda(USDC_MINT, assetSymbol as string);
      const [userBetPda] = getUserBetPda(
        wallet.publicKey,
        assetSymbol as string,
        epochId
      );

      const userAta = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );

      const betSide = side === "up" ? { up: {} } : { down: {} };

      const tx = await (program as any).methods
        .placeBet(
          assetSymbol,
          new anchor.BN(epochId),
          betSide,
          new anchor.BN(amount)
        )
        .accounts({
          userBet: userBetPda,
          epoch: epochPda,
          assetConfig: assetConfigPda,
          config: configPda,
          vault: vaultPda,
          userAta: userAta,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      alert(`Bet placed! Transaction: ${tx}`);

      // Reload epoch data
      if (program.account && (program.account as any).epoch) {
        const epochAccount = await (program.account as any).epoch.fetch(epochPda);
        setEpoch(epochAccount);
      }
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      alert(`Failed to place bet: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Asset not found</p>
      </div>
    );
  }

  const sumUp = epoch ? epoch.sumUp.toNumber() : 0;
  const sumDown = epoch ? epoch.sumDown.toNumber() : 0;
  const roiUp = calculateImpliedROI(sumUp, sumDown, "up");
  const roiDown = calculateImpliedROI(sumUp, sumDown, "down");

  const now = Math.floor(Date.now() / 1000);
  const isBettingClosed =
    timestamps && now >= timestamps.cutoffTs;
  const isRoundEnded = timestamps && now >= timestamps.endTs;

  return (
    <>
      <Head>
        <title>{asset.name} - Solana Betting</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400">
                🎲 Solana Betting
              </Link>
              <p className="text-sm text-gray-400">{asset.name}</p>
            </div>
            <WalletMultiButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Epoch Info */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {asset.name} ({asset.symbol})
                </h2>
                <p className="text-gray-400">Epoch #{epochId}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-400">
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-sm text-gray-400">Time Remaining</p>
              </div>
            </div>

            {timestamps && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Start</p>
                  <p className="text-white">
                    {timestamps.startDate.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Cutoff</p>
                  <p className="text-white">
                    {timestamps.cutoffDate.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">End</p>
                  <p className="text-white">
                    {timestamps.endDate.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                UP Pool
              </h3>
              <p className="text-3xl font-bold text-white mb-2">
                {formatUsdc(sumUp)} USDC
              </p>
              <p className="text-sm text-gray-400">
                Implied ROI: {roiUp.toFixed(2)}%
              </p>
            </div>

            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                DOWN Pool
              </h3>
              <p className="text-3xl font-bold text-white mb-2">
                {formatUsdc(sumDown)} USDC
              </p>
              <p className="text-sm text-gray-400">
                Implied ROI: {roiDown.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Betting Interface */}
          {!wallet.publicKey ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-4">
                Connect your wallet to place bets
              </p>
              <WalletMultiButton />
            </div>
          ) : isBettingClosed ? (
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-8 text-center">
              <p className="text-yellow-200">
                {isRoundEnded
                  ? "⏱️ Round ended - waiting for settlement"
                  : "🔒 Betting closed - waiting for round to end"}
              </p>
            </div>
          ) : (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Place Your Bet
              </h3>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white"
                  placeholder="10"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => placeBet("up")}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
                >
                  {submitting ? "Submitting..." : "📈 BET UP"}
                </button>

                <button
                  onClick={() => placeBet("down")}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
                >
                  {submitting ? "Submitting..." : "📉 BET DOWN"}
                </button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {epoch && epoch.status && epoch.status.settled && (
            <div className="mt-6 bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                Round Settled
              </h3>
              <p className="text-white">
                Winning side:{" "}
                {epoch.winningSide.up
                  ? "UP 📈"
                  : epoch.winningSide.down
                  ? "DOWN 📉"
                  : "NONE"}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Settlement price: {epoch.settlePrice.toString()} (exp:{" "}
                {epoch.settleExpo})
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
