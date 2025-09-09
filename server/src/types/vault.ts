import type { Address, BasisPoints } from '../types/common.js';

export interface VaultMetrics {
  vaultId: Address;
  totalAssets: number; // formatted decimal (uses vault asset decimals)
  currentApy: number;  // percentage, e.g. 12.34
  strategyAllocation: Record<Address, BasisPoints>; // bps per strategy
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export type UnderlyingProtocol =
  | {
    name: 'Lending';
    label?: string; // Component name from introspection
    adapter: Address;
    supplyApy: number; // bp
    borrowApy: number; // bp
    healthFactor: number | null; // scaled
  }
  | {
    name: 'Eggs';
    label?: string;
    adapter: Address;
    supplyApy: number; // bp
    borrowApy: number; // bp
    healthFactor: number | null; // scaled
  }
  | {
    name: 'Rings';
    label?: string;
    adapter: Address;
    apr: number; // bp
  }
  | {
    name: 'Shadow';
    label?: string;
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'Beets';
    label?: string;
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'SwapX';
    label?: string;
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'Dex';
    label?: string;
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'StS';
    label?: string;
    adapter: Address;
    rate: number; // scaled to bp-like
  }
  | {
    name: 'Pendle';
    label?: string;
    adapter: Address;
    stableToken: Address | null;
  };

export interface StrategyDetails {
  strategyAddress: Address;
  strategyName?: string; // from IYieldStrategy.name()
  totalAssets: number; // formatted
  apy: number;         // basis points
  underlying: UnderlyingProtocol[];
}
