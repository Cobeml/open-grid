'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Zap, ExternalLink, Database } from 'lucide-react';
import { SUPPORTED_CHAINS, getAllChainIds } from '@/lib/wagmi';
import { cn } from '@/lib/utils';

interface NetworkSelectorProps {
  selectedChain: number;
  onChainChange: (chainId: number) => void;
  className?: string;
}

export function NetworkSelector({ selectedChain, onChainChange, className }: NetworkSelectorProps) {
  const supportedChainIds = getAllChainIds();
  const selectedChainConfig = SUPPORTED_CHAINS[selectedChain as keyof typeof SUPPORTED_CHAINS];

  const getExplorerUrl = (chainId: number, address: string) => {
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
      48900: 'https://explorer.zircuit.com',
      14: 'https://flare-explorer.flare.network',
      295: 'https://hashscan.io/mainnet',
    };
    
    const baseUrl = explorerMap[chainId];
    return baseUrl ? `${baseUrl}/address/${address}` : null;
  };

  return (
    <div className={cn('min-w-[200px]', className)}>
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg p-1">
        <div className="relative">
          <select
            value={selectedChain}
            onChange={(e) => onChainChange(Number(e.target.value))}
            className="w-full bg-transparent text-white border-none outline-none px-3 py-2 pr-8 text-sm font-medium appearance-none cursor-pointer"
          >
            {supportedChainIds.map(chainId => {
              const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
              if (!chain) return null;
              return (
                <option key={chainId} value={chainId} className="bg-gray-800 text-white">
                  {chain.name} ({chain.shortName})
                </option>
              );
            })}
          </select>
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        {/* Chain indicator */}
        {selectedChainConfig && (
          <motion.div 
            className="flex flex-col gap-1 px-3 py-2 mt-1 border-t border-gray-700"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: selectedChainConfig.color }}
              />
              <span className="text-xs text-gray-300">
                Chain ID: {selectedChain}
              </span>
              <Zap className="w-3 h-3 text-energy-400 ml-auto" />
            </div>
            
            {/* Contract deployment info */}
            {selectedChainConfig.contractAddress ? (
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Contract:</span>
                <a
                  href={getExplorerUrl(selectedChain, selectedChainConfig.contractAddress) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 truncate max-w-[100px] flex items-center gap-1"
                  title={selectedChainConfig.contractAddress}
                >
                  {selectedChainConfig.contractAddress.slice(0, 6)}...{selectedChainConfig.contractAddress.slice(-4)}
                  <ExternalLink className="w-2 h-2" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">No contract deployed</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}