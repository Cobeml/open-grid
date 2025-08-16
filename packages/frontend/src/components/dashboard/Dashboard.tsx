'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEnergyData } from '@/hooks/useEnergyData';
import { NetworkSelector } from '@/components/map/NetworkSelector';
import { MetricCards } from './MetricCards';
import { UsageChart } from './UsageChart';
import { NodeList } from './NodeList';
import { AlertPanel } from './AlertPanel';
import { Loader2 } from 'lucide-react';

interface DashboardProps {
  selectedChain?: number;
  onChainChange?: (chainId: number) => void;
}

export function Dashboard({ selectedChain, onChainChange }: DashboardProps) {
  const { nodes, latestData, isLoading, totalUsage, activeNodes } = useEnergyData(selectedChain || 137);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-energy-500" />
          <span className="text-lg">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Network Selector */}
      {onChainChange && (
        <div className="flex justify-end">
          <NetworkSelector 
            selectedChain={selectedChain || 137} 
            onChainChange={onChainChange}
          />
        </div>
      )}

      {/* Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <MetricCards 
          nodes={nodes} 
          totalUsage={totalUsage}
          activeNodes={activeNodes}
          latestData={latestData} 
        />
      </motion.div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <UsageChart data={latestData} nodes={nodes} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AlertPanel chainId={selectedChain || 137} />
        </motion.div>
      </div>

      {/* Node List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <NodeList nodes={nodes} />
      </motion.div>
    </div>
  );
}