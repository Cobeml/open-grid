import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '@/lib/wagmi';

// ABI for the Legacy contract
const ENERGY_MONITOR_ABI = [
  {
    "name": "getAllNodes",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ 
      "name": "", 
      "type": "tuple[]",
      "components": [
        { "name": "location", "type": "string" },
        { "name": "active", "type": "bool" },
        { "name": "registeredAt", "type": "uint256" },
        { "name": "lastUpdate", "type": "uint256" }
      ]
    }]
  },
  {
    "name": "getNodeData",
    "type": "function", 
    "stateMutability": "view",
    "inputs": [{ "name": "nodeId", "type": "uint256" }],
    "outputs": [
      { "name": "dataId", "type": "uint256" },
      { "name": "kWh", "type": "uint256" },
      { "name": "location", "type": "string" },
      { "name": "timestamp", "type": "uint256" }
    ]
  }
] as const;

// RPC URLs for each network
const NETWORK_RPC_URLS = {
  80002: 'https://rpc-amoy.polygon.technology', // Polygon Amoy
  545: 'https://access-testnet.onflow.org', // Flow Testnet
  11155111: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Sepolia
  84532: 'https://sepolia.base.org', // Base Sepolia
  296: 'https://testnet.hashio.io/api', // Hedera Testnet
} as const;

export function useContractData(chainId: number) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const chainConfig = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
  const contractAddress = chainConfig?.contractAddress as `0x${string}` | undefined;
  const rpcUrl = NETWORK_RPC_URLS[chainId as keyof typeof NETWORK_RPC_URLS];

  useEffect(() => {
    if (!contractAddress || !rpcUrl) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`🔍 Fetching contract data for chain ${chainId} from ${rpcUrl}`);
        console.log(`📍 Contract: ${contractAddress}`);

        // Create provider for the target network
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Create contract instance
        const contract = new ethers.Contract(contractAddress, ENERGY_MONITOR_ABI, provider);
        
        // Read all nodes
        const nodes = await contract.getAllNodes();
        
        console.log(`✅ Found ${nodes.length} nodes on contract`);
        
        // Convert BigInt values to numbers for frontend compatibility
        const processedNodes = nodes.map((node: any) => ({
          location: node.location,
          active: node.active,
          registeredAt: Number(node.registeredAt),
          lastUpdate: Number(node.lastUpdate)
        }));
        
        console.log('📊 Processed node data:', processedNodes);
        
        setData(processedNodes);
      } catch (err) {
        console.error(`❌ Error fetching contract data for chain ${chainId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to fetch contract data'));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up interval for refreshing data
    const interval = setInterval(fetchData, 600000); // Refresh every 10 minutes

    return () => clearInterval(interval);
  }, [chainId, contractAddress, rpcUrl]);

  return { data, isLoading, error };
}
