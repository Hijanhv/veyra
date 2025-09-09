/**
 * VaultService
 * ------------
 * Read-only queries for Veyra vaults and strategies on Sonic.
 * - Lists strategies in a vault
 * - Reads per-strategy totals/APY
 * - Introspects strategy components (lending/DEX/etc.) and fetches live metrics
 * Uses Multicall3 where helpful to reduce RPC round trips.
 */

import dotenv from 'dotenv';
import { ethers, Contract, Interface, type InterfaceAbi } from 'ethers';
import { createRequire } from 'module';
const requireJson = createRequire(import.meta.url);
const vaultAbiJson = requireJson('../abi/VeyraVault.json');
const yieldStrategyAbiJson = requireJson('../abi/IYieldStrategy.json');
const lendingAbiJson = requireJson('../abi/ILendingAdapter.json');
const eggsAbiJson = requireJson('../abi/IEggsAdapter.json');
const ringsAbiJson = requireJson('../abi/IRingsAdapter.json');
const beetsAbiJson = requireJson('../abi/IBeetsAdapter.json');
const stsAbiJson = requireJson('../abi/IStSAdapter.json');
const pendleAbiJson = requireJson('../abi/IPendleAdapter.json');
const stdIntrospectAbiJson = requireJson('../abi/IStrategyIntrospection.json');
const introspectInterfaceAbi = stdIntrospectAbiJson.abi as InterfaceAbi;
import type { Address, BasisPoints } from '../types/common.js';
import type { VaultMetrics, StrategyDetails, UnderlyingProtocol } from '../types/index.js';
import { buildCalls, tryAggregate as multicallTryAggregate, decodeResult } from '../utils/multicall3.js';

// Strategies describe themselves as a list of components.

// Components-based introspection
enum ComponentKind {
  Lending = 0,
  Eggs = 1,
  Rings = 2,
  StS = 3,
  Pendle = 4,
  Dex = 5,
  Custom = 6,
}

type V2Component = {
  kind: number;
  adapter: Address;
  token0: Address;
  token1: Address;
  pool: Address;
  gauge: Address;
  extra: string; // bytes as hex string
  name: string;  // component label from strategy
};

type V2Introspection = {
  asset: Address;
  schemaVersion: number;
  comps: V2Component[];
};

dotenv.config();

const VAULT_ABI = vaultAbiJson.abi as InterfaceAbi;
const IYIELDSTRATEGY_ABI = yieldStrategyAbiJson.abi as InterfaceAbi;
const LENDING_ABI = lendingAbiJson.abi as InterfaceAbi;
const EGGS_ABI = eggsAbiJson.abi as InterfaceAbi;
const RINGS_ABI = ringsAbiJson.abi as InterfaceAbi;
const BEETS_ABI = beetsAbiJson.abi as InterfaceAbi;
const STS_ABI = stsAbiJson.abi as InterfaceAbi;
const PENDLE_ABI = pendleAbiJson.abi as InterfaceAbi;

// Vault read interface
type VeyraVaultRead = {
  strategies(index: number | bigint): Promise<Address>; // Get strategy address at slot [index]
  totalAssets(): Promise<bigint>; // Get total value locked in the vault
  allocations(addr: Address): Promise<bigint>; // Get allocation % for a strategy (in basis points)
  asset(): Promise<Address>; // Get the base token address (e.g., wS, USDC)
};

// Strategy read interface
type YieldStrategyRead = {
  apy(): Promise<bigint>; // Current APY this strategy is earning (in basis points)
  totalAssets(): Promise<bigint>; // Total value deployed in this strategy
  name(): Promise<string>; // strategy name
};

type LendingAdapterRead = {
  getSupplyApy(token: Address): Promise<bigint>;
  getBorrowApy(token: Address): Promise<bigint>;
  healthFactor(user: Address): Promise<bigint>;
  collateralOf(user: Address, token: Address): Promise<bigint>;
  debtOf(user: Address, token: Address): Promise<bigint>;
};
type EggsAdapterRead = {
  getSupplyApy(): Promise<bigint>;
  getBorrowApy(): Promise<bigint>;
  healthFactor(user: Address): Promise<bigint>;
};
type DexAdapterRead = {
  getPoolApr(pool: Address): Promise<bigint>;
};
type RingsAdapterRead = {
  getApy(): Promise<bigint>;
};
type StSAdapterRead = {
  rate(): Promise<bigint>;
  sToken(): Promise<Address>;
  stSToken(): Promise<Address>;
};
type PendleAdapterRead = {
  stableToken(): Promise<Address>;
};

// Service for composing vault/strategy analytics from on-chain reads
export class VaultService {
  private provider: ethers.AbstractProvider;
  private readonly stdIntrospectInterface: Interface;
  private readonly vaultInterface: Interface;
  private readonly strategyInterface: Interface;
  private readonly multicallAddress: string;

  private readonly ERC20_ABI = [
    'function decimals() view returns (uint8)'
  ];

  // Cache token decimals to avoid repeat RPC calls
  private decimalsCache = new Map<string, number>();

  // Resolve token decimals (with cache)
  private async getTokenDecimals(addr: Address): Promise<number> {
    if (this.decimalsCache.has(addr)) return this.decimalsCache.get(addr)!;
    const erc20 = new Contract(addr, this.ERC20_ABI, this.provider) as unknown as { decimals: () => Promise<number> };
    const dec = await erc20.decimals();
    const n = Number(dec);
    this.decimalsCache.set(addr, n);
    return n;
  }

  constructor() {
    const rpcUrl = process.env.SONIC_RPC_URL;
    if (!rpcUrl) throw new Error('SONIC_RPC_URL is not defined in environment');

    const mc = process.env.MULTICALL3_ADDRESS;
    if (!mc) throw new Error('MULTICALL3_ADDRESS is required');

    // Choose provider based on URL scheme (http(s) vs ws(s))
    this.provider = rpcUrl.startsWith('ws')
      ? new ethers.WebSocketProvider(rpcUrl)
      : new ethers.JsonRpcProvider(rpcUrl);
    this.stdIntrospectInterface = new Interface(introspectInterfaceAbi);
    this.vaultInterface = new Interface(VAULT_ABI);
    this.strategyInterface = new Interface(IYIELDSTRATEGY_ABI);
    this.multicallAddress = mc;
  }

  // Typed vault contract instance
  private getVaultContract(vaultAddress: string): VeyraVaultRead {
    if (!ethers.isAddress(vaultAddress)) throw new Error(`Invalid vault address: ${vaultAddress}`);
    return new Contract(vaultAddress, VAULT_ABI, this.provider) as unknown as VeyraVaultRead;
  }

  // Typed strategy contract instance
  private getStrategyContract(strategyAddress: string): YieldStrategyRead {
    if (!ethers.isAddress(strategyAddress)) throw new Error(`Invalid strategy address: ${strategyAddress}`);
    return new Contract(strategyAddress, IYIELDSTRATEGY_ABI, this.provider) as unknown as YieldStrategyRead;
  }

  // Read component list from a strategy
  private async tryComponents(strategyAddress: string): Promise<V2Introspection | null> {
    if (!ethers.isAddress(strategyAddress)) return null;
    const c = new Contract(
      strategyAddress,
      this.stdIntrospectInterface,
      this.provider
    ) as unknown as { components: () => Promise<[Address, number, V2Component[]]> };
    const [asset, schemaVersion, comps] = await c.components();
    return { asset, schemaVersion, comps } as V2Introspection;
  }

  // True if valid and non-zero address
  private isNonZeroAddress(a: string | null | undefined): a is Address {
    return !!a && ethers.isAddress(a) && a !== '0x0000000000000000000000000000000000000000';
  }

  // Get strategy addresses from slots [0..9] using multicall; filter zeros
  private async fetchStrategies(vault: VeyraVaultRead): Promise<Address[]> {
    // Prepare 10 function calls to check all possible strategy slots in the vault
    // This is like asking: "What's in mailbox 0? What's in mailbox 1?" etc.
    const calls = buildCalls(
      this.vaultInterface,
      (vault as unknown as Contract).target as string,
      Array.from({ length: 10 }, (_, i) => ({ fragment: 'strategies(uint256)', args: [BigInt(i)], key: `strategies:${i}` }))
    );
    // Send all 10 calls to the blockchain in one batch and get the results
    // Each result tells us if the call worked and what the response was
    const res = await multicallTryAggregate(this.provider, this.multicallAddress, calls);
    const out: Address[] = [];
    for (const r of res) {
      if (!r.success) continue;
      try {
        // Convert the raw blockchain response back into a readable address
        // If it's not zero address, this slot contains a real strategy
        const [a] = decodeResult(this.vaultInterface, 'strategies(uint256)', r.returnData) as [string];
        if (a && ethers.isAddress(a) && a !== ethers.ZeroAddress) out.push(a as Address);
      } catch { /* ignore */ }
    }
    return out;
  }

  // Vault-level metrics: total assets, strategy allocations, weighted APY
  async getVaultMetrics(vaultId: string): Promise<VaultMetrics> {
    const vault = this.getVaultContract(vaultId);
    const totalAssetsBn = await vault.totalAssets();
    const assetAddr = await vault.asset();
    const dec = await this.getTokenDecimals(assetAddr as Address);
    const totalAssets = Number(ethers.formatUnits(totalAssetsBn, dec));

    const strategyAddresses = await this.fetchStrategies(vault);
    const allocationMap: Record<Address, BasisPoints> = {};
    let weightedApy = 0;

    // Prepare a big batch of calls: for each strategy, we want both:
    // 1. How much allocation it has from the vault
    // 2. What APY it's currently earning
    const vaultAddr = (vault as unknown as Contract).target as string;
    const calls = [
      ...strategyAddresses.map((s) => ({ fragment: 'allocations(address)', args: [s], key: `alloc:${s}`, iface: this.vaultInterface, target: vaultAddr })),
      ...strategyAddresses.map((s) => ({ fragment: 'apy()', args: [], key: `apy:${s}`, iface: this.strategyInterface, target: s })),
    ];
    // Convert our function calls into the format that Multicall3 understands
    // We keep our friendly names so we can identify which result is which
    const mcalls = calls.map((c) => ({ ...buildCalls(c.iface, c.target, [{ fragment: c.fragment, args: c.args, key: c.key }])[0]! }));
    // Send all the calls to the blockchain in one efficient batch
    const res = await multicallTryAggregate(this.provider, this.multicallAddress, mcalls);
    const apyMap: Record<Address, number> = {};
    for (let i = 0; i < res.length; i++) {
      const r = res[i]!;
      const key = mcalls[i]!.name;
      if (!r.success || !key) continue;
      try {
        // Check if this result is an allocation or APY based on our naming scheme
        if (key.startsWith('alloc:')) {
          // Decode the allocation percentage (in basis points: 5000 = 50%)
          const [bn] = decodeResult(this.vaultInterface, 'allocations(address)', r.returnData) as [bigint];
          const addr = key.slice('alloc:'.length) as Address;
          allocationMap[addr] = Number(bn);
        } else if (key.startsWith('apy:')) {
          // Decode the APY percentage (in basis points: 1200 = 12%)
          const [bn] = decodeResult(this.strategyInterface, 'apy()', r.returnData) as [bigint];
          const addr = key.slice('apy:'.length) as Address;
          apyMap[addr] = Number(bn);
        }
      } catch { /* ignore */ }
    }
    // Calculate the vault's overall APY by weighing each strategy's APY by its allocation
    // Formula: Overall APY = ∑(Strategy APY × Strategy Allocation Weight)
    for (const s of strategyAddresses) {
      const allocBp = allocationMap[s] ?? 0;
      const apyBp = apyMap[s] ?? 0;
      weightedApy += (apyBp / 100) * (allocBp / 10000);
    }

    return {
      vaultId: vaultId as Address,
      totalAssets,
      currentApy: weightedApy,
      strategyAllocation: allocationMap,
      performance: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
    };
  }

  /**
   * Gets the individual APY of each strategy in a vault.
   * 
   * This is useful when you want to see how each strategy is performing individually,
   * rather than the vault's overall weighted average.
   * 
   * Example result:
   * {
   *   "0xStrategy1Address": 1200, // 12.00% APY
   *   "0xStrategy2Address": 850,  // 8.50% APY
   *   "0xStrategy3Address": 1500  // 15.00% APY
   * }
   * 
   * Uses multicall to get all APYs in one efficient batch call.
   */
  async getStrategyApys(vaultId: string): Promise<Record<Address, number>> {
    const vault = this.getVaultContract(vaultId);
    const strategies = await this.fetchStrategies(vault);
    const result: Record<Address, number> = {};
    if (strategies.length === 0) return result;
    // Prepare calls to get APY from each strategy, labeling them for easy identification
    const calls = strategies.flatMap((s) => buildCalls(this.strategyInterface, s, [{ fragment: 'apy()', key: `apy:${s}` }]));
    const res = await multicallTryAggregate(this.provider, this.multicallAddress, calls);
    for (let i = 0; i < res.length; i++) {
      const r = res[i]!;
      const key = calls[i]!.name;
      if (!key?.startsWith('apy:')) continue;
      const addr = key.slice('apy:'.length) as Address;
      if (!r.success) { result[addr] = 0; continue; }
      try {
        // Convert the raw response back to a readable APY number (in basis points)
        const [bn] = decodeResult(this.strategyInterface, 'apy()', r.returnData) as [bigint];
        result[addr] = Number(bn);
      } catch { result[addr] = 0; }
    }
    return result;
  }

  // Strategy details: totals, APY, and per-component metrics via components()
  async getStrategyDetails(vaultId: string): Promise<StrategyDetails[]> {
    const vault = this.getVaultContract(vaultId);
    const strategyAddresses = await this.fetchStrategies(vault);
    const details: StrategyDetails[] = [];
    for (const stratAddr of strategyAddresses) {
      const strat: StrategyDetails = { strategyAddress: stratAddr, strategyName: undefined, totalAssets: 0, apy: 0, underlying: [] };
      try {
        const strategy = this.getStrategyContract(stratAddr);
        const v2 = await this.tryComponents(stratAddr);
        if (!v2) continue;
        const assetDecimals = await this.getTokenDecimals(v2.asset);

        const ta = await strategy.totalAssets();
        strat.totalAssets = Number(ethers.formatUnits(ta, assetDecimals));
        const apyBn = await strategy.apy();
        strat.apy = Number(apyBn);
        try {
          const sName = await strategy.name();
          if (sName && typeof sName === 'string') strat.strategyName = sName;
        } catch (err) {
          console.warn(`Failed to get strategy name for ${stratAddr}:`, err);
        }
        // For each component, read live metrics and append to report
        for (const c of v2.comps) {
          try {
            switch (c.kind) {
              case ComponentKind.Lending: {
                const lending = new ethers.Contract(c.adapter, LENDING_ABI, this.provider) as unknown as LendingAdapterRead;
                const supplyApy = this.isNonZeroAddress(c.token0) ? Number(await lending.getSupplyApy(c.token0)) : 0;
                const borrowApy = this.isNonZeroAddress(c.token1) ? Number(await lending.getBorrowApy(c.token1)) : 0;
                const hf = Number(await lending.healthFactor(stratAddr)) / 1e18;
                strat.underlying.push({ name: 'Lending', label: c.name, adapter: c.adapter, supplyApy, borrowApy, healthFactor: hf } as UnderlyingProtocol);
                break;
              }
              case ComponentKind.Eggs: {
                const eggs = new ethers.Contract(c.adapter, EGGS_ABI, this.provider) as unknown as EggsAdapterRead;
                const supplyApy = Number(await eggs.getSupplyApy());
                const borrowApy = Number(await eggs.getBorrowApy());
                const hf = Number(await eggs.healthFactor(stratAddr)) / 1e18;
                strat.underlying.push({ name: 'Eggs', label: c.name, adapter: c.adapter, supplyApy, borrowApy, healthFactor: hf } as UnderlyingProtocol);
                break;
              }
              case ComponentKind.Rings: {
                const rings = new ethers.Contract(c.adapter, RINGS_ABI, this.provider) as unknown as RingsAdapterRead;
                const apr = Number(await rings.getApy());
                strat.underlying.push({ name: 'Rings', label: c.name, adapter: c.adapter, apr } as UnderlyingProtocol);
                break;
              }
              case ComponentKind.StS: {
                const sts = new ethers.Contract(c.adapter, STS_ABI, this.provider) as unknown as StSAdapterRead;
                const rateRaw = await sts.rate();
                const rate = Number(rateRaw) / 1e14;
                strat.underlying.push({ name: 'StS', label: c.name, adapter: c.adapter, rate } as UnderlyingProtocol);
                break;
              }
              case ComponentKind.Dex: {
                if (this.isNonZeroAddress(c.adapter) && this.isNonZeroAddress(c.pool)) {
                  // All DEX adapters share getPoolApr signature
                  const dexGeneric = new ethers.Contract(c.adapter, BEETS_ABI, this.provider) as unknown as DexAdapterRead;
                  const aprRaw = await dexGeneric.getPoolApr(c.pool);
                  const apr = Number(aprRaw) / 1e14;
                  // trust on-chain component label from introspection
                  strat.underlying.push({ name: 'Dex', label: c.name, adapter: c.adapter, pool: c.pool ?? null, apr } as UnderlyingProtocol);
                }
                break;
              }
              case ComponentKind.Pendle: {
                const pendle = new ethers.Contract(c.adapter, PENDLE_ABI, this.provider) as unknown as PendleAdapterRead;
                const stable = await pendle.stableToken();
                strat.underlying.push({ name: 'Pendle', label: c.name, adapter: c.adapter, stableToken: (stable && ethers.isAddress(stable)) ? (stable as Address) : null } as UnderlyingProtocol);
                break;
              }
              default:
                // Ignore Custom for now (no common reads)
                break;
            }
          } catch { /* ignore component-level errors */ }
        }

        details.push(strat);
        continue;
      } catch (err) {
        // Skip this strategy on error
        continue;
      }
    }
    return details;
  }

  // Current target allocation (bps) per strategy address
  async getStrategyAllocations(vaultId: string): Promise<Record<Address, BasisPoints>> {
    const vault = this.getVaultContract(vaultId);
    const strategies = await this.fetchStrategies(vault);
    const allocs: Record<Address, BasisPoints> = {};
    for (const addr of strategies) {
      const allocBn = await vault.allocations(addr);
      allocs[addr] = Number(allocBn);
    }
    return allocs;
  }
}
