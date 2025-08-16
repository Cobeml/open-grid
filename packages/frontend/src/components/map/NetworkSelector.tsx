'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Zap } from 'lucide-react';
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
            className="flex items-center gap-2 px-3 py-1 mt-1 border-t border-gray-700"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: selectedChainConfig.color }}
            />
            <span className="text-xs text-gray-300">
              Chain ID: {selectedChain}
            </span>
            <Zap className="w-3 h-3 text-energy-400 ml-auto" />
          </motion.div>
        )}
      </div>
    </div>
  );
}