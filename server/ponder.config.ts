import { createConfig } from "ponder";
import { VeyraVaultAbi } from "./src/abis/VeyraVault.js";

// Helper to parse a comma-separated env var into an array of addresses
const parseAddresses = (v?: string): `0x${string}`[] | undefined =>
  v?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) as `0x${string}`[] | undefined;

export default createConfig({
  chains: {
    sonic: {
      id: Number(process.env.CHAIN_ID ?? 146),
      rpc: process.env.SONIC_RPC_URL ?? "wss://sonic-rpc.publicnode.com",
      pollingInterval: 1_000,
    },
  },
  contracts: {
    VeyraVault: {
      abi: VeyraVaultAbi,
      chain: "sonic",
      // Support multiple vaults via VAULT_ADDRESSES, or fall back to a single VEYRA_VAULT_ADDRESS
      address:
        parseAddresses(process.env.VAULT_ADDRESSES) ||
        ((process.env.VEYRA_VAULT_ADDRESS as `0x${string}`) ??
          "0x0000000000000000000000000000000000000000"),
      startBlock: Number(
        process.env.INDEXER_START_BLOCK ?? process.env.VEYRA_VAULT_START_BLOCK ?? 0
      ),
    },
  },
});
