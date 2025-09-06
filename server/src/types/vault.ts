import type { Address, BasisPoints } from './common.js';

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
      adapter: Address;
      supplyApy: number; // bp
      borrowApy: number; // bp
      healthFactor: number | null; // scaled
    }
  | {
      name: 'Eggs';
      adapter: Address;
      supplyApy: number; // bp
      borrowApy: number; // bp
      healthFactor: number | null; // scaled
    }
  | {
      name: 'Rings';
      adapter: Address;
      apr: number; // bp
    }
  | {
      name: 'Shadow';
      adapter: Address;
      pool: Address | null;
      apr: number; // bp
    }
  | {
    name: 'Beets';
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'SwapX';
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'Dex';
    adapter: Address;
    pool: Address | null;
    apr: number; // bp
  }
  | {
    name: 'StS';
    adapter: Address;
    rate: number; // scaled to bp-like
  }
  | {
    name: 'Pendle';
    adapter: Address;
    stableToken: Address | null;
  };

export interface StrategyDetails {
  strategyAddress: Address;
  totalAssets: number; // formatted
  apy: number;         // basis points
  underlying: UnderlyingProtocol[];
}
