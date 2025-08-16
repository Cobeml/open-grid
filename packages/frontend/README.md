# Open Grid Frontend

A Next.js application providing real-time visualization of electrical monitoring data across multiple blockchain networks.

## Features

- **Multi-Chain Support**: Monitor energy data across 10+ EVM networks including Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain, Gnosis, Zircuit, Flare, and Hedera
- **Interactive Mapbox Visualization**: Real-time geospatial data with heatmaps, tooltips, and dynamic node markers
- **Comprehensive Dashboard**: Metrics, usage charts, and intelligent alerting systems
- **Wallet Integration**: Connect with popular Ethereum wallets via RainbowKit
- **Real-time Updates**: Live blockchain event listening and WebSocket integration
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Blockchain**: wagmi v2 + viem for multi-chain interaction
- **Visualization**: Mapbox GL JS + Deck.gl for 3D geospatial rendering
- **UI**: Tailwind CSS + Framer Motion for animations
- **State**: Zustand for client-side state management
- **Charts**: Recharts for data visualization
- **Deployment**: Vercel-optimized with automatic builds

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Mapbox account and access token
- WalletConnect project ID

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd packages/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
```bash
# Required
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Contract addresses for each supported chain
NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS=0x...
# ... (see .env.example for all chains)
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main application page
├── components/
│   ├── layout/            # Header, navigation components
│   ├── map/               # MapBox integration components
│   ├── dashboard/         # Analytics dashboard components
│   ├── wallet/            # Wallet connection components
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
│   ├── useEnergyData.ts   # Energy data fetching and events
│   ├── useMultiChainEvents.ts # Cross-chain event handling
│   └── useWebSocket.ts    # Real-time WebSocket connection
├── lib/                   # Utility libraries
│   ├── wagmi.ts          # Blockchain configuration
│   ├── constants.ts      # Application constants
│   └── utils.ts          # Helper functions
├── types/                # TypeScript type definitions
├── stores/               # Zustand state stores
└── styles/               # Global CSS and Tailwind config
```

## Key Components

### MapContainer
Advanced Mapbox integration with:
- Real-time energy node visualization
- Usage-based color coding and sizing
- Interactive heatmaps for density visualization
- Comprehensive tooltips with node details
- Dynamic map style switching (dark, light, satellite, terrain)
- Performance-optimized layer rendering

### Dashboard
Comprehensive analytics interface featuring:
- Real-time metric cards (active nodes, total usage, alerts)
- Interactive usage charts with time-series data
- Node status list with filtering and sorting
- Alert management system with severity levels
- Cross-chain comparison tools

### NetworkSelector
Multi-chain switching component supporting:
- All major EVM networks plus hackathon chains
- Real-time chain status indicators
- Contract address validation
- Network-specific styling and branding

## Blockchain Integration

### Supported Networks

| Network | Chain ID | Features |
|---------|----------|----------|
| Ethereum | 1 | Full Chainlink integration |
| Polygon | 137 | Optimized for high throughput |
| Arbitrum | 42161 | Layer 2 scaling |
| Optimism | 10 | Optimistic rollup |
| Base | 8453 | Coinbase L2 |
| Avalanche | 43114 | High-speed finality |
| BNB Chain | 56 | Low transaction costs |
| Gnosis | 100 | Decentralized governance |
| Zircuit | 48900 | Privacy-focused |
| Flare | 14 | Oracle integration |
| Hedera | 295 | Enterprise blockchain |

### Contract Integration

The app integrates with EnergyMonitor smart contracts deployed on each network:

```typescript
// Monitor real-time energy data updates
useContractEvent({
  address: contractAddress,
  abi: EnergyMonitorABI,
  eventName: 'DataUpdated',
  listener: (logs) => {
    // Handle energy data updates
  },
});

// Fetch current node status
const { data: nodes } = useContractRead({
  address: contractAddress,
  abi: EnergyMonitorABI,
  functionName: 'getActiveNodes',
});
```

## Deployment

### Vercel Deployment (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables for Production

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123...
NEXT_PUBLIC_API_BASE_URL=https://api.opengrid.energy
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.opengrid.energy
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Code Style

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Next.js recommended configuration
- **Prettier**: Automated code formatting
- **Tailwind CSS**: Utility-first styling approach

### Performance Optimizations

- **Dynamic imports**: Map components loaded only when needed
- **Image optimization**: Next.js automatic image optimization
- **Bundle splitting**: Automatic code splitting with Next.js
- **Caching**: Optimized API caching with React Query
- **Memoization**: React.memo and useMemo for expensive operations

## API Integration

### WebSocket Connection

Real-time updates via WebSocket:

```typescript
const { lastMessage } = useWebSocket(WEBSOCKET_URL);

useEffect(() => {
  if (lastMessage) {
    const data = JSON.parse(lastMessage.data);
    if (data.type === 'energy_update') {
      // Update node data in real-time
    }
  }
}, [lastMessage]);
```

### Contract Events

Blockchain event monitoring:

```typescript
// Listen for cross-chain energy updates
useContractEvent({
  address: contractAddress,
  abi: EnergyMonitorABI,
  eventName: 'DataUpdated',
  listener: handleEnergyUpdate,
});
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Join our Discord community
- Email: support@opengrid.energy