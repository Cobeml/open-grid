'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { motion } from 'framer-motion';
import { Zap, Activity, Globe, AlertTriangle } from 'lucide-react';
import { getChainConfig } from '@/lib/wagmi';

export function Header() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfig = getChainConfig(chainId);

  return (
    <header className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <Zap className="w-8 h-8 text-energy-500" />
              <div className="absolute inset-0 bg-energy-500/20 rounded-full blur-md animate-pulse-energy" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-energy-400 to-energy-600 bg-clip-text text-transparent">
                Open Grid
              </h1>
              <p className="text-xs text-gray-400">Energy Monitoring</p>
            </div>
          </motion.div>

          {/* Status Indicators */}
          {isConnected && (
            <motion.div 
              className="hidden md:flex items-center space-x-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Current Chain */}
              <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">
                  {chainConfig?.name || 'Unknown Network'}
                </span>
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: chainConfig?.color || '#6b7280' }}
                />
              </div>

              {/* Status Indicator */}
              <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm">Live</span>
              </div>

              {/* Alerts */}
              <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">0 Alerts</span>
              </div>
            </motion.div>
          )}

          {/* Connect Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ConnectButton />
          </motion.div>
        </div>
      </div>
    </header>
  );
}