'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { EnergyNode, EnergyData, NodeData } from '@/types/energy';
import { SUPPORTED_CHAINS } from '@/lib/wagmi';
import { REFRESH_INTERVALS } from '@/lib/constants';
import { useContractData } from './useContractData';

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

  // Use custom hook to read contract data directly from target network
  const { data: contractData, isLoading: contractLoading, error: contractError } = useContractData(chainId);

  // Debug contract errors
  if (contractError) {
    console.error('Contract read error:', contractError);
  }



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

  // Fetch individual node data from contract
  const fetchNodeData = async (nodeId: number) => {
    if (!contractAddress) return null;
    
    try {
      const provider = window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null;
      if (!provider) return null;
      
      const contract = new ethers.Contract(contractAddress, [
        "function nodes(uint256) external view returns (string memory location, bool active, uint256 registeredAt, uint256 lastUpdate)",
        "function getNodeData(uint256 nodeId) external view returns (uint256 dataId, uint256 kWh, string memory location, uint256 timestamp)"
      ], provider);
      
      const [nodeInfo, nodeData] = await Promise.all([
        contract.nodes(nodeId),
        contract.getNodeData(nodeId).catch(() => [0, 0, '', 0]) // Handle case where no data exists yet
      ]);
      
      return {
        id: nodeId,
        location: nodeInfo.location || 'lat:40.7128,lon:-74.0060',
        active: nodeInfo.active,
        registeredAt: Number(nodeInfo.registeredAt),
        lastUpdate: Number(nodeInfo.lastUpdate),
        latestUsage: Number(nodeData[1]) / 1000 // Convert from scaled value to kWh
      };
    } catch (error) {
      console.error(`Failed to fetch data for node ${nodeId}:`, error);
      return null;
    }
  };

  // Initialize data from real contract
  useEffect(() => {
    setIsLoading(contractLoading);
    setError(null);

    const initializeData = async () => {
      try {
        console.log(`Loading data for chain ${chainId}, contract: ${contractAddress}`);
        
        if (!contractAddress) {
          console.log(`No contract deployed on chain ${chainId}, using mock data`);
          setNodes(mockNodes);
          setLatestData(mockNodes.filter(node => node.active).map(node => ({
            id: Math.random().toString(),
            nodeId: node.id.toString(),
            kWh: Math.random() * 8000 + 1000,
            location: node.location,
            timestamp: Math.floor(Date.now() / 1000),
            chainId,
          })));
          setIsLoading(false);
          return;
        }

        if (contractData && Array.isArray(contractData)) {
          console.log(`Found ${contractData.length} nodes on contract`);
          console.log('Contract data:', contractData);
          
          // Process the Node structs directly from getAllNodes()
          const validNodes = contractData
            .map((node: any, index: number) => ({
              id: index,
              location: node.location || 'lat:40.7128,lon:-74.0060',
              active: node.active,
              registeredAt: Number(node.registeredAt),
              lastUpdate: Number(node.lastUpdate),
              latestUsage: 0 // Will be fetched separately if needed
            }))
            .filter((node: any) => node.active);
          
          console.log(`Successfully loaded ${validNodes.length} nodes with data`);
          
          // Set the nodes first
          setNodes(validNodes);
          
          // Generate some initial energy data for visualization
          const mockEnergyData = validNodes.map(node => ({
            id: Math.random().toString(),
            nodeId: node.id.toString(),
            kWh: node.latestUsage || (Math.random() * 4000 + 1000),
            location: node.location,
            timestamp: Math.floor(Date.now() / 1000),
            chainId,
          }));
          
          setLatestData(mockEnergyData);
        } else {
          console.log('No active nodes found in contract');
          setNodes([]);
        }
      } catch (err) {
        console.error('Failed to initialize energy data:', err);
        console.log('Falling back to mock data due to error');
        setError(err instanceof Error ? err : new Error('Failed to load contract data'));
        // Fallback to mock data on error
        setNodes(mockNodes);
        setLatestData(mockNodes.filter(node => node.active).map(node => ({
          id: Math.random().toString(),
          nodeId: node.id.toString(),
          kWh: Math.random() * 8000 + 1000,
          location: node.location,
          timestamp: Math.floor(Date.now() / 1000),
          chainId,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [chainId, contractData, contractAddress, contractLoading]);

  // Simulate real-time updates for mock data (when no contract)
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
      }, 600000); // Update every 10 minutes

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