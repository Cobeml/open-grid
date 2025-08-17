'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Activity, MapPin, Clock, Zap, Wallet } from 'lucide-react';
import { formatUsage, formatTimestamp, getStatusColor } from '@/lib/utils';
import { NodeData } from '@/types/energy';
import { useAccount, useChainId } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { SUPPORTED_CHAINS } from '@/lib/wagmi';

interface NodeListProps {
  nodes: NodeData[];
}

export function NodeList({ nodes }: NodeListProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const chainConfig = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
  const fundingAddress = (process.env.NEXT_PUBLIC_HEDERA_TESTNET_FUNDING_ADDRESS && chainId === 296)
    ? process.env.NEXT_PUBLIC_HEDERA_TESTNET_FUNDING_ADDRESS
    : (process.env.NEXT_PUBLIC_FLOW_TESTNET_FUNDING_ADDRESS && chainId === 545)
      ? process.env.NEXT_PUBLIC_FLOW_TESTNET_FUNDING_ADDRESS
      : undefined;

  const [pendingNodeId, setPendingNodeId] = useState<number | null>(null);
  const [amountByNode, setAmountByNode] = useState<Record<number, string>>({});
  if (nodes.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-energy-400" />
            Monitoring Nodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No monitoring nodes found</p>
              <p className="text-sm">Deploy contract or connect to network</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="w-5 h-5 text-energy-400" />
          Monitoring Nodes
        </CardTitle>
        <div className="text-sm text-gray-400">
          {nodes.filter(n => n.active).length} of {nodes.length} nodes active
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {nodes.map((node, index) => {
            // Parse location coordinates
            const locationParts = node.location.split(',');
            const lat = locationParts[0]?.replace('lat:', '') || 'Unknown';
            const lon = locationParts[1]?.replace('lon:', '') || 'Unknown';
            const amount = amountByNode[node.id] || '';
            
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 rounded-lg border transition-colors ${
                  node.active 
                    ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' 
                    : 'bg-gray-800/30 border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      node.active ? 'bg-green-500/20' : 'bg-gray-500/20'
                    }`}>
                      <Activity className={`w-4 h-4 ${
                        node.active ? 'text-green-400' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        Node {node.id}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span>{lat}°N, {lon}°W</span>
                      </div>
                    </div>
                  </div>
                  
                  <Badge
                    variant={node.active ? "default" : "secondary"}
                    className={`${
                      node.active 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}
                  >
                    {node.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Registered</span>
                    </div>
                    <div className="text-white font-mono text-xs">
                      {formatTimestamp(node.registeredAt)}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Activity className="w-3 h-3" />
                      <span>Last Update</span>
                    </div>
                    <div className="text-white font-mono text-xs">
                      {node.lastUpdate > 0 
                        ? formatTimestamp(node.lastUpdate)
                        : 'Never'
                      }
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Zap className="w-3 h-3" />
                      <span>Status</span>
                    </div>
                    <div className={`text-xs font-medium ${getStatusColor(node.active ? 'active' : 'inactive')}`}>
                      {node.active ? 'Monitoring' : 'Offline'}
                    </div>
                  </div>
                </div>
                
                {node.active && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Node Health</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium">Online</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <input
                        className="w-full sm:w-40 bg-gray-900/50 border border-gray-700 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-energy-500"
                        placeholder="Amount (e.g. 0.01)"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmountByNode(prev => ({ ...prev, [node.id]: e.target.value }))}
                      />
                      <button
                        disabled={!isConnected || !fundingAddress || pendingNodeId === node.id || !amount}
                        onClick={async () => {
                          try {
                            setPendingNodeId(node.id);
                            const to = fundingAddress as `0x${string}`;
                            const value = parseEther(amount);
                            // Prepare calldata for fundNode(uint256)
                            const data = encodeFunctionData({
                              abi: [
                                { name: 'fundNode', type: 'function', stateMutability: 'payable', inputs: [{ name: 'nodeId', type: 'uint256' }], outputs: [] }
                              ] as const,
                              functionName: 'fundNode',
                              args: [BigInt(node.id)],
                            });
                            await (window as any).ethereum?.request?.({
                              method: 'eth_sendTransaction',
                              params: [{ from: address, to, value: `0x${value.toString(16)}`, data }]
                            });
                          } catch (err) {
                            console.error('Funding failed', err);
                          } finally {
                            setPendingNodeId(null);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          !isConnected || !fundingAddress || !amount
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-energy-600 hover:bg-energy-500 text-white'
                        }`}
                      >
                        <Wallet className="w-3 h-3" />
                        {pendingNodeId === node.id ? 'Funding…' : 'Fund Node'}
                      </button>
                      <button
                        disabled={!isConnected || !fundingAddress || pendingNodeId === node.id || !amount}
                        onClick={async () => {
                          try {
                            setPendingNodeId(node.id);
                            const to = fundingAddress as `0x${string}`;
                            const value = parseEther(amount);
                            // Prepare calldata for purchaseNode(uint256)
                            const data = encodeFunctionData({
                              abi: [
                                { name: 'purchaseNode', type: 'function', stateMutability: 'payable', inputs: [{ name: 'nodeId', type: 'uint256' }], outputs: [] }
                              ] as const,
                              functionName: 'purchaseNode',
                              args: [BigInt(node.id)],
                            });
                            await (window as any).ethereum?.request?.({
                              method: 'eth_sendTransaction',
                              params: [{ from: address, to, value: `0x${value.toString(16)}`, data }]
                            });
                          } catch (err) {
                            console.error('Purchase failed', err);
                          } finally {
                            setPendingNodeId(null);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          !isConnected || !fundingAddress || !amount
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-energy-600 hover:bg-energy-500 text-white'
                        }`}
                      >
                        <Wallet className="w-3 h-3" />
                        {pendingNodeId === node.id ? 'Purchasing…' : 'Purchase'}
                      </button>
                      {!fundingAddress && (
                        <span className="text-[10px] text-yellow-400">No funding contract configured for {chainConfig?.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {nodes.length > 5 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              View all {nodes.length} nodes →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}