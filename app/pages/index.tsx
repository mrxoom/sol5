import Head from "next/head";
import Link from "next/link";
import { WalletMultiButton } from "../components/Wallet";
import { ASSETS, RPC_HTTP, TREASURY_PUBKEY } from "../lib/config";

export default function Home() {
  return (
    <>
      <Head>
        <title>Solana Betting - Up or Down in 5 Minutes</title>
        <meta
          name="description"
          content="Fully on-chain pari-mutuel betting on crypto assets"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🎲 Solana Betting
              </h1>
              <p className="text-sm text-gray-400">
                Fully on-chain pari-mutuel betting
              </p>
            </div>
            <WalletMultiButton />
          </div>
        </header>

        {/* Network Info Banner */}
        <div className="bg-blue-600/20 border-b border-blue-500/30 px-4 py-3">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-blue-200">
              <div>
                <span className="font-semibold">Network:</span>{" "}
                <span className="text-blue-100">Solana Devnet</span>
              </div>
              <div className="truncate">
                <span className="font-semibold">RPC:</span>{" "}
                <span className="text-blue-100">{RPC_HTTP}</span>
              </div>
              <div className="truncate">
                <span className="font-semibold">Treasury:</span>{" "}
                <span className="text-blue-100 font-mono text-xs">
                  {TREASURY_PUBKEY.toString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Up or Down in 5 Minutes?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Bet on whether crypto asset prices will go up or down in the next
              5-minute window. Fully permissionless, on-chain settlement via
              Pyth oracle.
            </p>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {ASSETS.map((asset) => (
              <Link
                key={asset.symbol}
                href={`/${asset.symbol}`}
                className="block"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-blue-500 hover:bg-gray-800/70 transition-all cursor-pointer">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {asset.name}
                  </h3>
                  <p className="text-gray-400 mb-4">{asset.symbol}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">5 min rounds</span>
                    <span className="text-blue-400 font-semibold">
                      Bet Now →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* How It Works */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
                <div className="text-3xl mb-3">📊</div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Pari-Mutuel Pools
                </h4>
                <p className="text-gray-400">
                  All bets pool together. Winners split the losers' stake,
                  minus a 1% protocol fee.
                </p>
              </div>

              <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
                <div className="text-3xl mb-3">⏱️</div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  5-Minute Rounds
                </h4>
                <p className="text-gray-400">
                  Each epoch lasts exactly 5 minutes. Betting closes 30 seconds
                  before the round ends.
                </p>
              </div>

              <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
                <div className="text-3xl mb-3">🔮</div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Pyth Oracle
                </h4>
                <p className="text-gray-400">
                  Settlement uses real-time Pyth price feeds. Fully
                  transparent, on-chain verification.
                </p>
              </div>

              <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
                <div className="text-3xl mb-3">🤖</div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Permissionless
                </h4>
                <p className="text-gray-400">
                  Anyone can settle rounds and earn a tip. No centralized
                  servers or keepers required.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-12 max-w-2xl mx-auto bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <p className="text-sm text-yellow-200 text-center">
              ⚠️ This is experimental software on devnet. Use at your own risk.
              This service may not be available in your region.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p>
              Built with Anchor, Solana, and Pyth | Fully open source and
              permissionless
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
