'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Header } from '@/components/layout/Header';
import { MapContainer } from '@/components/map/MapContainer';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Map, BarChart3 } from 'lucide-react';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<'map' | 'dashboard'>('map');

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-energy-500/20 animate-pulse-energy" />
              </div>
              <div className="relative flex items-center justify-center">
                <Zap className="w-16 h-16 text-energy-500 animate-bounce-slow" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-energy-400 to-energy-600 bg-clip-text text-transparent">
              Open Grid
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Real-time electrical grid monitoring across multiple blockchain networks.
              Visualize energy consumption, track usage patterns, and monitor grid health
              with our decentralized monitoring system.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <Activity className="w-8 h-8 text-energy-500 mb-3" />
                <h3 className="font-semibold mb-2">Multi-Chain Support</h3>
                <p className="text-sm text-gray-400">
                  Monitor across 10+ blockchain networks including Polygon, Arbitrum, and more
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <Map className="w-8 h-8 text-energy-500 mb-3" />
                <h3 className="font-semibold mb-2">Interactive Maps</h3>
                <p className="text-sm text-gray-400">
                  Real-time geospatial visualization with heatmaps and detailed node information
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <BarChart3 className="w-8 h-8 text-energy-500 mb-3" />
                <h3 className="font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-gray-400">
                  Comprehensive metrics, usage charts, and intelligent alerting systems
                </p>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="px-8 py-4 bg-gradient-to-r from-energy-500 to-energy-600 hover:from-energy-600 hover:to-energy-700 rounded-lg font-semibold text-white transition-all duration-300 shadow-energy transform hover:shadow-lg"
                  >
                    Connect Wallet to Get Started
                  </button>
                )}
              </ConnectButton.Custom>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* View Mode Selector */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-1 bg-gray-900/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'map'
                    ? 'bg-energy-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Map className="w-4 h-4" />
                Map View
              </button>
              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'dashboard'
                    ? 'bg-energy-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
            </div>
            
            <div className="text-sm text-gray-400">
              Connected: <span className="text-energy-400 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {viewMode === 'map' ? <MapContainer /> : <Dashboard />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}