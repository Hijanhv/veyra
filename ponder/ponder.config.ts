import "dotenv/config";
import { createConfig } from "ponder";
import { VeyraVaultAbi } from "./src/abi/VeyraVaultAbi.js";

const parseAddresses = (v?: string): `0x${string}`[] | undefined =>
  v?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) as `0x${string}`[] | undefined;

const database = process.env.DATABASE_URL
  ? {
    kind: "postgres" as const,
    connectionString: process.env.DATABASE_URL,
    poolConfig: {
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
    }
  }
  : undefined;

export default createConfig({
  ...(database ? { database } : {}),
  chains: {
    sonic: {
      id: Number(process.env.CHAIN_ID ?? 146),
      rpc: process.env.SONIC_RPC_URL ?? "https://sonic-rpc.publicnode.com",
      pollingInterval: 1_000,
    },
  },
  contracts: {
    VeyraVault: {
      abi: VeyraVaultAbi,
      chain: "sonic",
      address:
        parseAddresses(process.env.VAULT_ADDRESSES) ||
        ((process.env.VEYRA_VAULT_ADDRESS as `0x${string}`) ??
          "0x0000000000000000000000000000000000000000"),
      startBlock: Number(
        process.env.INDEXER_START_BLOCK ??
        46156930
      ),
    },
  },
});
