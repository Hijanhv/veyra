// Common, reusable types across the server

// Basic alias for EVM addresses for readability
export type Address = string;

export const asAddress = (addr: string): Address => addr;

// Basis points helper type
export type BasisPoints = number; // 10000 = 100%

// Convenience bigint alias from ethers v6 values
export type BigIntish = bigint | number | string;
