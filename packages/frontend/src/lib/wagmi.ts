import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  baseSepolia,
  avalanche,
  bsc,
  gnosis,
  sepolia,
  polygonMumbai,
  polygonAmoy,
} from 'wagmi/chains';
import { defineChain } from 'viem';

// Define custom chains for hackathon networks
export const zircuit = defineChain({
  id: 48900,
  name: 'Zircuit Mainnet',
  network: 'zircuit',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://zircuit1-mainnet.p2pify.com/'] },
    default: { http: ['https://zircuit1-mainnet.p2pify.com/'] },
  },
  blockExplorers: {
    default: { name: 'Zircuit Explorer', url: 'https://explorer.zircuit.com' },
  },
});

export const flare = defineChain({
  id: 14,
  name: 'Flare',
  network: 'flare',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    public: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] },
    default: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Flare Explorer', url: 'https://flare-explorer.flare.network' },
  },
});

export const hedera = defineChain({
  id: 295,
  name: 'Hedera Mainnet',
  network: 'hedera',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    public: { http: ['https://mainnet.hashio.io/api'] },
    default: { http: ['https://mainnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'HashScan', url: 'https://hashscan.io/mainnet' },
  },
});

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
  chains: [
    // Primary mainnets
    mainnet,
    polygon,
    arbitrum,
    optimism,
    base,
    avalanche,
    bsc,
    gnosis,
    // Hackathon chains
    zircuit,
    flare,
    hedera,
    hederaTestnet,
    flowTestnet,
    // Testnets
    sepolia,
    baseSepolia,
    polygonMumbai,
    polygonAmoy,
  ],
  ssr: true,
});

export const SUPPORTED_CHAINS = {
  [mainnet.id]: {
    name: 'Ethereum',
    shortName: 'ETH',
    contractAddress: process.env.NEXT_PUBLIC_ETHEREUM_CONTRACT_ADDRESS,
    color: '#627EEA',
  },
  [polygon.id]: {
    name: 'Polygon',
    shortName: 'MATIC',
    contractAddress: process.env.NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS,
    color: '#8247E5',
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    shortName: 'ARB',
    contractAddress: process.env.NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS,
    color: '#28A0F0',
  },
  [optimism.id]: {
    name: 'Optimism',
    shortName: 'OP',
    contractAddress: process.env.NEXT_PUBLIC_OPTIMISM_CONTRACT_ADDRESS,
    color: '#FF0420',
  },
  [base.id]: {
    name: 'Base',
    shortName: 'BASE',
    contractAddress: process.env.NEXT_PUBLIC_BASE_CONTRACT_ADDRESS,
    color: '#0052FF',
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    shortName: 'BASE',
    contractAddress: process.env.NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS,
    color: '#0052FF',
  },
  [avalanche.id]: {
    name: 'Avalanche',
    shortName: 'AVAX',
    contractAddress: process.env.NEXT_PUBLIC_AVALANCHE_CONTRACT_ADDRESS,
    color: '#E84142',
  },
  [bsc.id]: {
    name: 'BNB Chain',
    shortName: 'BNB',
    contractAddress: process.env.NEXT_PUBLIC_BNB_CONTRACT_ADDRESS,
    color: '#F3BA2F',
  },
  [gnosis.id]: {
    name: 'Gnosis',
    shortName: 'GNO',
    contractAddress: process.env.NEXT_PUBLIC_GNOSIS_CONTRACT_ADDRESS,
    color: '#04795B',
  },
  [zircuit.id]: {
    name: 'Zircuit',
    shortName: 'ZRC',
    contractAddress: process.env.NEXT_PUBLIC_ZIRCUIT_CONTRACT_ADDRESS,
    color: '#9333EA',
  },
  [flare.id]: {
    name: 'Flare',
    shortName: 'FLR',
    contractAddress: process.env.NEXT_PUBLIC_FLARE_CONTRACT_ADDRESS,
    color: '#F43F5E',
  },
  [hedera.id]: {
    name: 'Hedera',
    shortName: 'HBAR',
    contractAddress: process.env.NEXT_PUBLIC_HEDERA_CONTRACT_ADDRESS,
    color: '#000000',
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