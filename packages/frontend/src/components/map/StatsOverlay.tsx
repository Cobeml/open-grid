'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Activity, Globe, TrendingUp } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/wagmi';
import { cn } from '@/lib/utils';

interface StatsOverlayProps {
  activeNodes: number;
  totalUsage: number;
  selectedChain: number;
  className?: string;
}

export function StatsOverlay({ activeNodes, totalUsage, selectedChain, className }: StatsOverlayProps) {
  const chainConfig = SUPPORTED_CHAINS[selectedChain as keyof typeof SUPPORTED_CHAINS];
  
  const formatUsage = (usage: number) => {
    if (usage >= 1000000) return `${(usage / 1000000).toFixed(1)}M`;
    if (usage >= 1000) return `${(usage / 1000).toFixed(1)}k`;
    return usage.toFixed(0);
  };

  const stats = [
    {
      icon: Activity,
      label: 'Active Nodes',
      value: activeNodes.toString(),
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      icon: Zap,
      label: 'Total Usage',
      value: `${formatUsage(totalUsage)} kWh`,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    {
      icon: Globe,
      label: 'Network',
      value: chainConfig?.shortName || 'Unknown',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: TrendingUp,
      label: 'Status',
      value: 'Live',
      color: 'text-energy-400',
      bgColor: 'bg-energy-400/10',
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg p-4', className)}
    >
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:scale-105',
              stat.bgColor
            )}
          >
            <div className={cn('p-2 rounded-lg bg-gray-700/50')}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
              <div className={cn('text-sm font-bold truncate', stat.color)}>
                {stat.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chain indicator */}
      {chainConfig && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700"
        >
          <div 
            className="w-2 h-2 rounded-full animate-pulse" 
            style={{ backgroundColor: chainConfig.color }}
          />
          <span className="text-xs text-gray-300">
            {chainConfig.name} Network
          </span>
          <div className="text-xs text-gray-400 ml-auto font-mono">
            ID: {selectedChain}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}