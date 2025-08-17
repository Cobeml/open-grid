import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, polygonAmoy } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define custom chains

export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    public: { http: ['https://testnet.hashio.io/api'] },
    default: { http: ['https://testnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'HashScan Testnet', url: 'https://hashscan.io/testnet' },
  },
});

export const flowTestnet = defineChain({
  id: 545,
  name: 'Flow Testnet',
  network: 'flow-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'FLOW',
    symbol: 'FLOW',
  },
  rpcUrls: {
    public: { http: ['https://access-testnet.onflow.org'] },
    default: { http: ['https://access-testnet.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'Flow Testnet Explorer', url: 'https://testnet.flowscan.org' },
  },
});

export const config = getDefaultConfig({
  appName: 'Open Grid Energy Monitor',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [polygonAmoy, flowTestnet, hederaTestnet, baseSepolia],
  ssr: true,
});

export const SUPPORTED_CHAINS = {
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    shortName: 'BASE',
    contractAddress: process.env.NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS,
    color: '#0052FF',
  },
  [hederaTestnet.id]: {
    name: 'Hedera Testnet',
    shortName: 'HBAR',
    contractAddress: process.env.NEXT_PUBLIC_HEDERA_TESTNET_CONTRACT_ADDRESS,
    color: '#666666',
  },
  [flowTestnet.id]: {
    name: 'Flow Testnet',
    shortName: 'FLOW',
    contractAddress: process.env.NEXT_PUBLIC_FLOW_TESTNET_CONTRACT_ADDRESS,
    color: '#00EF8B',
  },
  [polygonAmoy.id]: {
    name: 'Polygon Amoy',
    shortName: 'MATIC',
    contractAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_CONTRACT_ADDRESS,
    color: '#8247E5',
  },
} as const;

export const getChainConfig = (chainId: number) => {
  return SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
};

export const getAllChainIds = () => {
  return Object.keys(SUPPORTED_CHAINS).map(Number);
};