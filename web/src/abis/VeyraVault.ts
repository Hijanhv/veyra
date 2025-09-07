// Copied from server/src/abis/VeyraVault.ts to make the ABI
// Keep in sync with the server version.
export const VeyraVaultAbi = [
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }] },
  { type: 'function', name: 'asset', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address', internalType: 'address' }] },
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256', internalType: 'uint256' }, { name: 'receiver', type: 'address', internalType: 'address' }], outputs: [{ name: 'shares', type: 'uint256', internalType: 'uint256' }] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256', internalType: 'uint256' }, { name: 'receiver', type: 'address', internalType: 'address' }, { name: 'owner', type: 'address', internalType: 'address' }], outputs: [{ name: 'shares', type: 'uint256', internalType: 'uint256' }] },
] as const;

export default VeyraVaultAbi;

