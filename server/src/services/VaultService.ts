import dotenv from 'dotenv';
import { ethers, Contract, JsonRpcProvider, type InterfaceAbi } from 'ethers';
import { createRequire } from 'module';
const requireJson = createRequire(import.meta.url);
// Load ABIs from local files
const vaultAbiJson = requireJson('../abi/VeyraVault.json');
const yieldStrategyAbiJson = requireJson('../abi/IYieldStrategy.json');
// Adapter ABIs
const lendingAbiJson = requireJson('../abi/ILendingAdapter.json');
const eggsAbiJson = requireJson('../abi/IEggsAdapter.json');
const ringsAbiJson = requireJson('../abi/IRingsAdapter.json');
const shadowAbiJson = requireJson('../abi/IShadowAdapter.json');
const beetsAbiJson = requireJson('../abi/IBeetsAdapter.json');
const swapxAbiJson = requireJson('../abi/ISwapXAdapter.json');
const stsAbiJson = requireJson('../abi/IStSAdapter.json');
const pendleAbiJson = requireJson('../abi/IPendleAdapter.json');
import type { Address, BasisPoints } from '../types/index.js';
import type { VaultMetrics, StrategyDetails, UnderlyingProtocol } from '../types/index.js';

// Load environment variables for blockchain connection
dotenv.config();

/**
 * Basic vault info we return from getVaultMetrics().
 */
// Narrow ABI arrays for ethers Contract
const VAULT_ABI = vaultAbiJson.abi as InterfaceAbi;
const IYIELDSTRATEGY_ABI = yieldStrategyAbiJson.abi as InterfaceAbi;
const LENDING_ABI = lendingAbiJson.abi as InterfaceAbi;
const EGGS_ABI = eggsAbiJson.abi as InterfaceAbi;
const RINGS_ABI = ringsAbiJson.abi as InterfaceAbi;
const SHADOW_ABI = shadowAbiJson.abi as InterfaceAbi;
const BEETS_ABI = beetsAbiJson.abi as InterfaceAbi;
const SWAPX_ABI = swapxAbiJson.abi as InterfaceAbi;
const STS_ABI = stsAbiJson.abi as InterfaceAbi;
const PENDLE_ABI = pendleAbiJson.abi as InterfaceAbi;

/**
 * Contract ABIs - only including the functions we actually need.
 * Can add more later if required.
 */
type VeyraVaultRead = {
  strategies(index: number | bigint): Promise<Address>;
  totalAssets(): Promise<bigint>;
  allocations(addr: Address): Promise<bigint>;
};

type YieldStrategyRead = {
  apy(): Promise<bigint>;
  totalAssets(): Promise<bigint>;
  // Optional adapter discovery methods (exist on some strategies)
  lending?: () => Promise<Address>;
  LENDING?: () => Promise<Address>;
  eggs?: () => Promise<Address>;
  EGGS?: () => Promise<Address>;
  rings?: () => Promise<Address>;
  RINGS?: () => Promise<Address>;
  shadow?: () => Promise<Address>;
  SHADOW?: () => Promise<Address>;
  beets?: () => Promise<Address>;
  BEETS?: () => Promise<Address>;
  swapx?: () => Promise<Address>;
  SWAPX?: () => Promise<Address>;
  sts?: () => Promise<Address>;
  STS?: () => Promise<Address>;
  pendle?: () => Promise<Address>;
  PENDLE?: () => Promise<Address>;
  asset?: () => Promise<Address>;
  ASSET?: () => Promise<Address>;
  USDC?: () => Promise<Address>;
  pool?: () => Promise<Address>;
  POOL?: () => Promise<Address>;
  vault?: () => Promise<Address>;
  VAULT?: () => Promise<Address>;
  SC_USD?: () => Promise<Address>;
};

// Minimal read interfaces for adapters we consume
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

/**
 * Handles all the blockchain communication with vaults and strategies.
 * Read-only - no transactions, just fetching data.
 */
export class VaultService {
  private provider: JsonRpcProvider;
  // Try a list of optional address-returning getters and return the first valid value
  private async tryCallFirstAddress(getters: Array<(() => Promise<Address>) | undefined>): Promise<Address | null> {
    for (const fn of getters) {
      if (!fn) continue;
      try {
        const val = await fn();
        if (val && ethers.isAddress(val)) return val as Address;
      } catch {
        // ignore and try next
      }
    }
    return null;
  }

  constructor() {
    const rpcUrl = process.env.SONIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SONIC_RPC_URL is not defined in environment');
    }
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  /**
   * Creates vault contract instance. Throws if address is invalid.
   */
  private getVaultContract(vaultAddress: string): VeyraVaultRead {
    if (!ethers.isAddress(vaultAddress)) {
      throw new Error(`Invalid vault address: ${vaultAddress}`);
    }
    return new Contract(vaultAddress, VAULT_ABI, this.provider) as unknown as VeyraVaultRead;
  }

  /**
   * Creates strategy contract instance. Throws if address is invalid.
   */
  private getStrategyContract(strategyAddress: string): YieldStrategyRead {
    if (!ethers.isAddress(strategyAddress)) {
      throw new Error(`Invalid strategy address: ${strategyAddress}`);
    }
    // Extend the ABI with optional discovery getters (both lower- and upper-case)
    const OPTIONAL_GETTERS = [
      'function lending() view returns (address)',
      'function LENDING() view returns (address)',
      'function eggs() view returns (address)',
      'function EGGS() view returns (address)',
      'function rings() view returns (address)',
      'function RINGS() view returns (address)',
      'function shadow() view returns (address)',
      'function SHADOW() view returns (address)',
      'function beets() view returns (address)',
      'function BEETS() view returns (address)',
      'function swapx() view returns (address)',
      'function SWAPX() view returns (address)',
      'function sts() view returns (address)',
      'function STS() view returns (address)',
      'function pendle() view returns (address)',
      'function PENDLE() view returns (address)',
      'function pool() view returns (address)',
      'function POOL() view returns (address)',
      'function asset() view returns (address)',
      'function ASSET() view returns (address)',
      'function vault() view returns (address)',
      'function VAULT() view returns (address)',
      'function USDC() view returns (address)',
      'function SC_USD() view returns (address)'
    ];
    const STRATEGY_ABI = [...IYIELDSTRATEGY_ABI, ...OPTIONAL_GETTERS];
    return new Contract(strategyAddress, STRATEGY_ABI, this.provider) as unknown as YieldStrategyRead;
  }

  /**
   * Finds all strategies in a vault. First tries strategiesLength() if it exists,
   * otherwise iterates indices until we get a revert.
   */
  private async fetchStrategies(vault: VeyraVaultRead): Promise<Address[]> {
    const strategies: Address[] = [];
    // Try strategiesLength() first if vault implements it.
    // Not standard but some vaults have this helper.
    try {
      const length = await (vault as unknown as { strategiesLength: () => Promise<bigint> }).strategiesLength();
      const lenNum = Number(length);
      for (let i = 0; i < lenNum; i++) {
        const addr: string = await vault.strategies(i);
        if (addr && ethers.isAddress(addr)) {
          strategies.push(addr as Address);
        }
      }
      return strategies;
    } catch {
      // Fallback method: just keep asking for strategies by index until we get an error.
      // Cap it at 50 to avoid infinite loops - most vaults won't have nearly that many.
      for (let i = 0; i < 50; i++) {
        try {
          const addr = await vault.strategies(i);
          if (addr && ethers.isAddress(addr)) {
            strategies.push(addr as Address);
          }
        } catch {
          break;
        }
      }
      return strategies;
    }
  }

  /**
   * Gets vault stats - total assets, weighted APY, and per-strategy allocations.
   * Converts APY from basis points to percentages.
   */
  async getVaultMetrics(vaultId: string): Promise<VaultMetrics> {
    const vault = this.getVaultContract(vaultId);
    const totalAssetsBn = await vault.totalAssets();
    const totalAssets = Number(ethers.formatUnits(totalAssetsBn, 18));

    // Get the list of strategies and how much is allocated to each
    const strategyAddresses = await this.fetchStrategies(vault);
    const allocationMap: Record<Address, BasisPoints> = {};
    let weightedApy = 0;

    for (const stratAddr of strategyAddresses) {
      // Allocation comes back as basis points (10000 = 100%).
      // If the call fails, assume zero allocation.
      let allocBp: BasisPoints = 0;
      try {
        const allocBn = await vault.allocations(stratAddr);
        allocBp = Number(allocBn);
      } catch {
        allocBp = 0;
      }
      allocationMap[stratAddr] = allocBp;
      // Get the strategy's yield and convert to percentage
      let stratApyPercent = 0;
      try {
        const strategy = this.getStrategyContract(stratAddr);
        const apyBn = await strategy.apy();
        const apyBasis = Number(apyBn);
        stratApyPercent = apyBasis / 100;
      } catch {
        stratApyPercent = 0;
      }
      weightedApy += (stratApyPercent * allocBp) / 10000;
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
   * Returns map of strategy address -> APY in basis points.
   * Used by InvestmentAgent for allocation decisions.
   */
  async getStrategyApys(vaultId: string): Promise<Record<Address, number>> {
    const vault = this.getVaultContract(vaultId);
    const strategies = await this.fetchStrategies(vault);
    const result: Record<Address, number> = {};
    for (const addr of strategies) {
      try {
        const strategy = this.getStrategyContract(addr);
        const apyBn = await strategy.apy();
        result[addr] = Number(apyBn);
      } catch {
        result[addr] = 0;
      }
    }
    return result;
  }

  /**
   * Deep dive into each strategy to extract protocol-level data.
   * Checks for lending, DEX liquidity, yield farming adapters etc.
   * Returns APYs, health factors, and other risk metrics.
   */
  async getStrategyDetails(vaultId: string): Promise<StrategyDetails[]> {
    const vault = this.getVaultContract(vaultId);
    const strategyAddresses = await this.fetchStrategies(vault);
    const details: StrategyDetails[] = [];
    for (const stratAddr of strategyAddresses) {
      const strat: StrategyDetails = { strategyAddress: stratAddr, totalAssets: 0, apy: 0, underlying: [] };
      try {
        const strategy = this.getStrategyContract(stratAddr);
        // Convert the big number from the contract to a regular decimal
        try {
          const ta = await strategy.totalAssets();
          strat.totalAssets = Number(ethers.formatUnits(ta, 18));
        } catch {
          strat.totalAssets = 0;
        }
        // Get the strategy's APY (comes back in basis points)
        try {
          const apyBn = await strategy.apy();
          strat.apy = Number(apyBn);
        } catch {
          strat.apy = 0;
        }
        // Now dig into what protocols this strategy is actually using.
        // We'll try to call various adapter functions and see what responds.

        // Check if this strategy uses a lending protocol like Aave
        try {
          const lendingAddr = await this.tryCallFirstAddress([strategy.lending, strategy.LENDING]);
          if (lendingAddr && ethers.isAddress(lendingAddr)) {
            const lending = new ethers.Contract(lendingAddr, LENDING_ABI, this.provider) as unknown as LendingAdapterRead;
            // Try to figure out what token this strategy is working with.
            // Some strategies tell us directly via public variables.
            let baseToken: string | null = null;
            baseToken = await this.tryCallFirstAddress([strategy.asset, strategy.ASSET]);
            // Some strategies also expose USDC addresses
            let usdcToken: string | null = null;
            usdcToken = await this.tryCallFirstAddress([strategy.USDC]);
            // Get the lending and borrowing rates
            let supplyApy = 0;
            let borrowApy = 0;
            // Try getting rates for the base token first
            if (baseToken && ethers.isAddress(baseToken)) {
              try {
                const apyBn = await lending.getSupplyApy(baseToken);
                supplyApy = Number(apyBn);
              } catch { }
              try {
                const apyBn = await lending.getBorrowApy(baseToken);
                borrowApy = Number(apyBn);
              } catch { }
            }
            // If that didn't work, try with USDC
            if (supplyApy === 0 && usdcToken && ethers.isAddress(usdcToken)) {
              try {
                const apyBn = await lending.getSupplyApy(usdcToken);
                supplyApy = Number(apyBn);
              } catch { }
            }
            if (borrowApy === 0 && usdcToken && ethers.isAddress(usdcToken)) {
              try {
                const apyBn = await lending.getBorrowApy(usdcToken);
                borrowApy = Number(apyBn);
              } catch { }
            }
            // Check how close this strategy is to liquidation
            let hf = null;
            try {
              const hfBn = await lending.healthFactor(stratAddr);
              hf = Number(hfBn) / 1e18;
            } catch { }
            strat.underlying.push({
              name: 'Lending',
              adapter: lendingAddr,
              supplyApy,
              borrowApy,
              healthFactor: hf,
            } as UnderlyingProtocol);
          }
        } catch {
          // no lending adapter
        }
        // Check if this strategy uses Eggs Finance for leveraged yield
        try {
          const eggsAddr = await this.tryCallFirstAddress([strategy.eggs, strategy.EGGS]);
          if (eggsAddr && ethers.isAddress(eggsAddr)) {
            const eggs = new ethers.Contract(eggsAddr, EGGS_ABI, this.provider) as unknown as EggsAdapterRead;
            let supplyApy = 0;
            let borrowApy = 0;
            try {
              const apyBn = await eggs.getSupplyApy();
              supplyApy = Number(apyBn);
            } catch { }
            try {
              const apyBn = await eggs.getBorrowApy();
              borrowApy = Number(apyBn);
            } catch { }
            let hf = null;
            try {
              const hfBn = await eggs.healthFactor(stratAddr);
              hf = Number(hfBn) / 1e18;
            } catch { }
            strat.underlying.push({
              name: 'Eggs',
              adapter: eggsAddr,
              supplyApy,
              borrowApy,
              healthFactor: hf,
            } as UnderlyingProtocol);
          }
        } catch {
          // no eggs adapter
        }
        // Check if this strategy farms yield on Rings
        try {
          const ringsAddr = await this.tryCallFirstAddress([strategy.rings, strategy.RINGS]);
          if (ringsAddr && ethers.isAddress(ringsAddr)) {
            let apy = 0;
            try {
              const apyBn = await (new ethers.Contract(ringsAddr, RINGS_ABI, this.provider) as unknown as RingsAdapterRead).getApy();
              apy = Number(apyBn);
            } catch { }
            strat.underlying.push({
              name: 'Rings',
              adapter: ringsAddr,
              apr: apy,
            } as UnderlyingProtocol);
          }
        } catch { }
        // Shadow DEX liquidity
        try {
          const shadowAddr = await this.tryCallFirstAddress([strategy.shadow, strategy.SHADOW]);
          if (shadowAddr && ethers.isAddress(shadowAddr)) {
            const shadow = new ethers.Contract(shadowAddr, SHADOW_ABI, this.provider) as unknown as DexAdapterRead;
            // Try to find out which pool this strategy is using
            const pool = await this.tryCallFirstAddress([strategy.pool, strategy.POOL]);
            let aprBp = 0;
            if (pool && ethers.isAddress(pool)) {
              try {
                const aprBn = await shadow.getPoolApr(pool);
                // Convert the big number to basis points
                aprBp = Number(aprBn) / 1e14;
              } catch { }
            }
            strat.underlying.push({
              name: 'Shadow',
              adapter: shadowAddr,
              pool: pool,
              apr: aprBp,
            } as UnderlyingProtocol);
          }
        } catch { }
        // Beets DEX liquidity
        try {
          const beetsAddr = await this.tryCallFirstAddress([strategy.beets, strategy.BEETS]);
          if (beetsAddr && ethers.isAddress(beetsAddr)) {
            const beets = new ethers.Contract(beetsAddr, BEETS_ABI, this.provider) as unknown as DexAdapterRead;
            const pool = await this.tryCallFirstAddress([strategy.pool, strategy.POOL]);
            let aprBp = 0;
            if (pool && ethers.isAddress(pool)) {
              try {
                const aprBn = await beets.getPoolApr(pool);
                aprBp = Number(aprBn) / 1e14;
              } catch { }
            }
            strat.underlying.push({
              name: 'Beets',
              adapter: beetsAddr,
              pool: pool,
              apr: aprBp,
            } as UnderlyingProtocol);
          }
        } catch { }
        // SwapX liquidity
        try {
          const swapxAddr = await this.tryCallFirstAddress([strategy.swapx, strategy.SWAPX]);
          if (swapxAddr && ethers.isAddress(swapxAddr)) {
            const swapx = new ethers.Contract(swapxAddr, SWAPX_ABI, this.provider) as unknown as DexAdapterRead;
            const pool = await this.tryCallFirstAddress([strategy.pool, strategy.POOL]);
            let aprBp = 0;
            if (pool && ethers.isAddress(pool)) {
              try {
                const aprBn = await swapx.getPoolApr(pool);
                aprBp = Number(aprBn) / 1e14;
              } catch { }
            }
            strat.underlying.push({
              name: 'SwapX',
              adapter: swapxAddr,
              pool: pool,
              apr: aprBp,
            } as UnderlyingProtocol);
          }
        } catch { }
        // Check if this strategy does stS token conversions
        try {
          const stsAddr = await this.tryCallFirstAddress([strategy.sts, strategy.STS]);
          if (stsAddr && ethers.isAddress(stsAddr)) {
            const sts = new ethers.Contract(stsAddr, STS_ABI, this.provider) as unknown as StSAdapterRead;
            let rate = 0;
            try {
              const rateBn = await sts.rate();
              // Convert the exchange rate to basis points
              rate = Number(rateBn) / 1e14;
            } catch { }
            strat.underlying.push({
              name: 'StS',
              adapter: stsAddr,
              rate,
            } as UnderlyingProtocol);
          }
        } catch { }
        // Check if this strategy uses Pendle for yield tokenization
        try {
          const pendleAddr = await this.tryCallFirstAddress([strategy.pendle, strategy.PENDLE]);
          if (pendleAddr && ethers.isAddress(pendleAddr)) {
            const pendle = new ethers.Contract(pendleAddr, PENDLE_ABI, this.provider) as unknown as PendleAdapterRead;
            let stable: string | null = null;
            try {
              stable = await pendle.stableToken();
            } catch {
              stable = null;
            }
            // Note: if this strategy also does lending, we can reuse those APY calculations
            strat.underlying.push({
              name: 'Pendle',
              adapter: pendleAddr,
              stableToken: stable,
            } as UnderlyingProtocol);
          }
        } catch { }
      } catch (err) {
        // Something went wrong while analyzing this strategy
        console.error('Error processing strategy', stratAddr, err);
      }
      details.push(strat);
    }
    return details;
  }

  /**
   * Returns current allocation percentages for each strategy (in basis points).
   */
  async getStrategyAllocations(vaultId: string): Promise<Record<Address, BasisPoints>> {
    const vault = this.getVaultContract(vaultId);
    const strategies = await this.fetchStrategies(vault);
    const allocs: Record<Address, BasisPoints> = {};
    for (const addr of strategies) {
      try {
        const allocBn = await vault.allocations(addr);
        allocs[addr] = Number(allocBn);
      } catch {
        allocs[addr] = 0;
      }
    }
    return allocs;
  }
}
