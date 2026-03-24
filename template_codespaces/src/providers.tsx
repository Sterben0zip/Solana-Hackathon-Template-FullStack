import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren } from "react";
import { autoDiscover, createClient } from "@solana/client";

const RPC_ENDPOINT =
  import.meta.env.DEV && typeof window !== "undefined"
    ? "/solana" // development proxy to localnet (POST only)
    : "https://api.devnet.solana.com";

const client = createClient({
  endpoint: RPC_ENDPOINT,
  walletConnectors: autoDiscover(),
});

export function Providers({ children }: PropsWithChildren) {
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
