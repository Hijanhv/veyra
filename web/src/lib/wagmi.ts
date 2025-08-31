import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

const sonic = defineChain({
  id: 146,
  name: 'Sonic',
  network: 'sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sonic.fantom.network/'],
    },
    public: {
      http: ['https://rpc.sonic.fantom.network/'],
    },
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://sonicscan.io' },
  },
})

export const config = getDefaultConfig({
  appName: 'Veyra Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [sonic],
  ssr: true,
})