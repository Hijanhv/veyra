# Veyra Protocol Frontend

The official frontend for Veyra Protocol - an AI-driven yield optimization platform built on Sonic. This Next.js application provides an intuitive interface for users to interact with Veyra's DeFi strategies, monitor their investments, and maximize their yield farming returns.

## Features

- **Strategy Dashboard**: View and interact with all available yield strategies
- **Portfolio Management**: Track your investments across multiple strategies
- **Real-time Analytics**: Monitor APY, TVL, and performance metrics
- **Web3 Integration**: Connect wallet using RainbowKit + wagmi
- **Responsive Design**: Built with Tailwind CSS for mobile and desktop
- **Interactive Charts**: Visualize strategy performance with Recharts

## Tech Stack

- **Framework**: Next.js 15 with Turbopack
- **Styling**: Tailwind CSS 4.0
- **Web3**: 
  - RainbowKit 2.2.8 (wallet connection UI)
  - wagmi 2.16.9 (React hooks for Ethereum)
  - viem 2.36.0 (TypeScript interface for Ethereum)
- **State Management**: TanStack React Query
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start development server
npm run dev
# or 
bun dev

# Using other package managers
yarn dev
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm run start
```

## Web3 Integration

### RainbowKit Configuration

RainbowKit provides the wallet connection interface with support for popular wallets. The configuration includes:

- Sonic network support
- Dark/light theme switching  
- Multiple wallet options (MetaMask, WalletConnect, etc.)
- Custom wallet connection flows

### wagmi Integration

wagmi provides React hooks for:
- Wallet connection/disconnection
- Contract interactions with Veyra strategies
- Transaction handling and status
- Network switching and validation
- Balance and allowance management

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── layout.tsx      # Root layout with providers
│   └── page.tsx        # Homepage
├── components/         # Reusable UI components
├── lib/               # Utility functions and configurations
│   └── wagmi.ts       # Web3 configuration
└── styles/            # Global styles
```

## Smart Contract Integration

The frontend interacts with Veyra Protocol smart contracts:

- **Strategy Contracts**: Deposit, withdraw, harvest operations
- **Vault Management**: Asset allocation and rebalancing
- **Analytics**: Real-time strategy performance data
- **Risk Management**: Health factor monitoring and alerts

## Deployment

### Vercel (Recommended)

Deploy directly to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/veyra)

### Manual Deployment

1. Build the application: `npm run build`
2. Deploy the `.next` folder to your hosting provider
3. Set environment variables for production

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_id
NEXT_PUBLIC_SONIC_RPC_URL=your_sonic_rpc_url
NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_contract_address
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Make your changes and test thoroughly
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## Scripts

- `dev` - Start development server with Turbopack
- `build` - Build for production with Turbopack  
- `start` - Start production server
- `lint` - Run ESLint for code quality

## Learn More

- [Veyra Protocol Documentation](https://docs.veyra.fi) - Learn about our strategies
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features
- [RainbowKit Docs](https://rainbowkit.com) - Learn about wallet integration
- [wagmi Documentation](https://wagmi.sh) - Learn about Ethereum React hooks

## License

MIT License - see LICENSE file for details

---

Built with ❤️ by the Veyra team for the Sonic ecosystem