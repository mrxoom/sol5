import React, { FC, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { RPC_HTTP, RPC_WS } from "../lib/config";

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css");

interface WalletContextProviderProps {
  children: React.ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({
  children,
}) => {
  // Configure wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider
      endpoint={RPC_HTTP}
      config={{
        commitment: "confirmed",
        wsEndpoint: RPC_WS,
      }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export { WalletMultiButton };
