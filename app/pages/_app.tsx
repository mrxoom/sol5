import "../styles/globals.css";
import type { AppProps } from "next/app";
import { WalletContextProvider } from "../components/Wallet";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletContextProvider>
      <Component {...pageProps} />
    </WalletContextProvider>
  );
}
