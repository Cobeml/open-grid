'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Info, Copy, Check, Database } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/wagmi';
import { cn } from '@/lib/utils';

interface ContractInfoProps {
  chainId: number;
  nodeCount?: number;
  className?: string;
}

export function ContractInfo({ chainId, nodeCount, className }: ContractInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const chainConfig = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
  const contractAddress = chainConfig?.contractAddress;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getExplorerUrl = (address: string) => {
    // Map chain IDs to explorer URLs
    const explorerMap: Record<number, string> = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com', 
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      8453: 'https://basescan.org',
      43114: 'https://snowtrace.io',
      56: 'https://bscscan.com',
      100: 'https://gnosisscan.io',
      80002: 'https://amoy.polygonscan.com', // Polygon Amoy
    };
    
    const baseUrl = explorerMap[chainId];
    return baseUrl ? `${baseUrl}/address/${address}` : `https://etherscan.io/address/${address}`;
  };

  if (!contractAddress) {
    return (
      <div className={cn('bg-red-900/50 border border-red-600 rounded-lg p-3', className)}>
        <div className="flex items-center gap-2 text-red-300">
          <Database className="w-4 h-4" />
          <span className="text-sm font-medium">No Contract Deployed</span>
        </div>
        <p className="text-xs text-red-400 mt-1">
          Chain ID {chainId} ({chainConfig?.name || 'Unknown'})
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg overflow-hidden', className)}>
      <motion.button
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.8)' }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-energy-400" />
          <span className="text-sm font-medium text-white">Contract Info</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
          >
            ▼
          </motion.div>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: chainConfig.color }}
          />
          <span className="text-xs text-gray-300">
            {chainConfig.name} • {nodeCount || 0} nodes
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-700"
          >
            <div className="p-3 space-y-3">
              {/* Contract Address */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">
                  Contract Address
                </label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-300 flex-1 bg-gray-900/50 px-2 py-1 rounded">
                    {contractAddress}
                  </code>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipboard(contractAddress)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Chain Details */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">
                  Network Details
                </label>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Chain ID: {chainId}</div>
                  <div>Network: {chainConfig.name}</div>
                  <div>Symbol: {chainConfig.shortName}</div>
                </div>
              </div>

              {/* Node Stats */}
              {typeof nodeCount === 'number' && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">
                    Network Stats
                  </label>
                  <div className="text-xs text-gray-300">
                    <div>Total Nodes: {nodeCount}</div>
                    <div>Status: {nodeCount > 0 ? 'Active' : 'No Data'}</div>
                  </div>
                </div>
              )}

              {/* Explorer Link */}
              <motion.a
                href={getExplorerUrl(contractAddress)}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-3 py-2 bg-energy-500/20 hover:bg-energy-500/30 text-energy-400 rounded-md text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Explorer
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}