import "@/styles/globals.css";
import type { AppProps } from "next/app";
import "@biconomy/web3-auth/dist/src/style.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main>
      <Component {...pageProps} />
    </main>
  );
}
