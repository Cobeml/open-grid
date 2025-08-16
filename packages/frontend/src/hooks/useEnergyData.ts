'use client';

import { useEffect, useState, useMemo } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { toast } from 'react-hot-toast';
import { EnergyNode, EnergyData, NodeData } from '@/types/energy';
import { SUPPORTED_CHAINS } from '@/lib/wagmi';
import { REFRESH_INTERVALS } from '@/lib/constants';

// Mock ABI for demonstration - replace with actual contract ABI
const ENERGY_MONITOR_ABI = [
  {
    "name": "DataUpdated",
    "type": "event",
    "inputs": [
      { "name": "dataId", "type": "uint256", "indexed": true },
      { "name": "nodeId", "type": "uint256", "indexed": true },
      { "name": "kWh", "type": "uint256", "indexed": false },
      { "name": "location", "type": "string", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "getActiveNodes",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256[]" }]
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

export function useEnergyData(chainId: number) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [latestData, setLatestData] = useState<EnergyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const chainConfig = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
  const contractAddress = chainConfig?.contractAddress as `0x${string}` | undefined;

  // Mock data for demonstration when no contract is deployed
  const mockNodes: NodeData[] = useMemo(() => [
    {
      id: 0,
      location: 'lat:40.7128,lon:-74.0060',
      active: true,
      registeredAt: Math.floor(Date.now() / 1000) - 86400,
      lastUpdate: Math.floor(Date.now() / 1000),
    },
    {
      id: 1,
      location: 'lat:34.0522,lon:-118.2437',
      active: true,
      registeredAt: Math.floor(Date.now() / 1000) - 172800,
      lastUpdate: Math.floor(Date.now() / 1000),
    },
    {
      id: 2,
      location: 'lat:41.8781,lon:-87.6298',
      active: true,
      registeredAt: Math.floor(Date.now() / 1000) - 259200,
      lastUpdate: Math.floor(Date.now() / 1000),
    },
    {
      id: 3,
      location: 'lat:29.7604,lon:-95.3698',
      active: false,
      registeredAt: Math.floor(Date.now() / 1000) - 345600,
      lastUpdate: Math.floor(Date.now() / 1000) - 3600,
    },
    {
      id: 4,
      location: 'lat:39.7392,lon:-104.9903',
      active: true,
      registeredAt: Math.floor(Date.now() / 1000) - 432000,
      lastUpdate: Math.floor(Date.now() / 1000),
    },
  ], [chainId]);

  // Contract reads (will fallback to mock data if no contract)
  const { data: contractData, isError, error: contractError } = useReadContract({
    address: contractAddress,
    abi: ENERGY_MONITOR_ABI,
    functionName: 'getActiveNodes',
    query: {
      enabled: !!contractAddress,
      refetchInterval: REFRESH_INTERVALS.ENERGY_DATA,
    },
  });

  // Listen for real-time events
  useWatchContractEvent({
    address: contractAddress,
    abi: ENERGY_MONITOR_ABI,
    eventName: 'DataUpdated',
    onLogs: (logs) => {
      logs.forEach((log) => {
        const { dataId, nodeId, kWh, location, timestamp } = log.args;

        const newData: EnergyData = {
          id: dataId?.toString() || '',
          nodeId: nodeId?.toString() || '',
          kWh: Number(kWh) || 0,
          location: location || '',
          timestamp: Number(timestamp) || 0,
          chainId,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
        };

        setLatestData(prev => [newData, ...prev.slice(0, 99)]);
        
        // Update node with latest usage
        setNodes(prev => prev.map(node =>
          node.id === Number(nodeId)
            ? { ...node, lastUpdate: Number(timestamp) }
            : node
        ));

        toast.success(`Node ${nodeId} updated: ${(Number(kWh) / 1000).toFixed(1)}k kWh`);
      });
    },
    enabled: !!contractAddress,
  });

  // Initialize data
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const initializeData = async () => {
      try {
        if (contractData && Array.isArray(contractData)) {
          // Process real contract data
          const nodeIds = contractData as bigint[];
          const nodePromises = nodeIds.map(async (nodeId) => {
            // In a real implementation, you'd fetch individual node data
            return {
              id: Number(nodeId),
              location: 'lat:0,lon:0', // Would come from contract
              active: true,
              registeredAt: Math.floor(Date.now() / 1000) - 86400,
              lastUpdate: Math.floor(Date.now() / 1000),
            };
          });
          
          const realNodes = await Promise.all(nodePromises);
          setNodes(realNodes);
        } else {
          // Use mock data
          setNodes(mockNodes);
        }
      } catch (err) {
        console.error('Failed to initialize energy data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load data'));
        // Fallback to mock data on error
        setNodes(mockNodes);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [chainId, contractData, mockNodes]);

  // Simulate real-time updates for mock data
  useEffect(() => {
    if (!contractAddress) {
      const interval = setInterval(() => {
        setNodes(prev => prev.map(node => ({
          ...node,
          lastUpdate: node.active ? Math.floor(Date.now() / 1000) : node.lastUpdate,
        })));
        
        // Generate mock energy data
        const mockData = mockNodes
          .filter(node => node.active)
          .map(node => ({
            id: Math.random().toString(),
            nodeId: node.id.toString(),
            kWh: Math.random() * 8000 + 1000,
            location: node.location,
            timestamp: Math.floor(Date.now() / 1000),
            chainId,
          }));
        
        setLatestData(prev => [...mockData, ...prev.slice(0, 50)]);
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [contractAddress, mockNodes, chainId]);

  // Calculate derived data
  const totalUsage = useMemo(() => {
    return latestData.reduce((sum, data) => sum + data.kWh, 0);
  }, [latestData]);

  const activeNodes = useMemo(() => {
    return nodes.filter(node => node.active).length;
  }, [nodes]);

  return {
    nodes,
    latestData,
    isLoading,
    error,
    totalUsage,
    activeNodes,
    refetch: () => {
      // Trigger refetch logic
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000);
    },
  };
}

function parseLocation(location: string): [number, number] {
  try {
    const [latStr, lonStr] = location.split(',');
    const lat = parseFloat(latStr.split(':')[1]);
    const lon = parseFloat(lonStr.split(':')[1]);
    return [lat, lon];
  } catch {
    return [0, 0];
  }
}