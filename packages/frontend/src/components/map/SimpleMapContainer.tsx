'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useChainId } from 'wagmi';
import { MapProvider } from 'react-map-gl';
import { Loader2, Zap } from 'lucide-react';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE } from '@/lib/constants';
import { useEnergyData } from '@/hooks/useEnergyData';
import { NetworkSelector } from './NetworkSelector';
import { MapControls } from './MapControls';
import { StatsOverlay } from './StatsOverlay';

// Dynamic import for MapBox to avoid SSR issues
const Map = dynamic(() => import('react-map-gl').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="flex items-center gap-3 text-white">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading map...</span>
      </div>
    </div>
  ),
});

const Marker = dynamic(() => import('react-map-gl').then(mod => mod.Marker), {
  ssr: false,
});

// Helper function to parse location string
function parseLocation(location: string): [number, number] {
  try {
    const parts = location.split(',');
    const lat = parseFloat(parts[0].replace('lat:', ''));
    const lon = parseFloat(parts[1].replace('lon:', ''));
    return [lat, lon];
  } catch {
    return [0, 0];
  }
}

export function SimpleMapContainer() {
  const chainId = useChainId();
  const [selectedChain, setSelectedChain] = useState(chainId || 137);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const { nodes, isLoading, totalUsage, activeNodes, error } = useEnergyData(selectedChain);

  const handleViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (showTooltips) {
      setSelectedNode(selectedNode?.id === node.id ? null : node);
    }
  }, [showTooltips, selectedNode]);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Zap className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load energy data</h2>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <MapProvider>
        {/* Controls */}
        <NetworkSelector 
          selectedChain={selectedChain} 
          onChainChange={setSelectedChain}
          className="absolute top-4 left-4 z-10"
        />
        
        <MapControls
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          showTooltips={showTooltips}
          onToggleTooltips={() => setShowTooltips(!showTooltips)}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
          className="absolute top-4 right-4 z-10"
        />

        {/* Stats overlay */}
        <StatsOverlay
          activeNodes={activeNodes}
          totalUsage={totalUsage}
          selectedChain={selectedChain}
          className="absolute bottom-4 left-4 z-10"
        />

        {/* Map */}
        <Map
          {...viewState}
          onMove={handleViewStateChange}
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          reuseMaps
        >
          {/* Energy monitoring nodes as markers */}
          {nodes.map((node) => {
            const [lat, lon] = parseLocation(node.location);
            const usage = 1000 + Math.random() * 4000; // Mock usage
            
            let color = '#22c55e'; // Green for low usage
            if (usage > 3000) color = '#ef4444'; // Red for high usage
            else if (usage > 2000) color = '#f59e0b'; // Amber for medium usage
            
            if (!node.active) color = '#9ca3af'; // Gray for inactive
            
            return (
              <Marker
                key={node.id}
                longitude={lon}
                latitude={lat}
                anchor="center"
              >
                <button
                  className={`relative group transition-all duration-200 hover:scale-110 ${
                    selectedNode?.id === node.id ? 'scale-125' : ''
                  }`}
                  onClick={() => handleNodeClick(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNodeClick(node);
                    }
                  }}
                >
                  {/* Node circle */}
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer"
                    style={{ backgroundColor: color }}
                  />
                  
                  {/* Pulse animation for active nodes */}
                  {node.active && (
                    <div
                      className="absolute inset-0 w-6 h-6 rounded-full animate-ping opacity-20"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  
                  {/* Tooltip */}
                  {showTooltips && selectedNode?.id === node.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-3 rounded-lg border border-gray-600 shadow-lg min-w-48 pointer-events-none"
                    >
                      <div className="font-semibold mb-1">Node {node.id}</div>
                      <div className="text-sm text-gray-300">
                        <div>Usage: {(usage / 1000).toFixed(1)}k kWh</div>
                        <div>Status: {node.active ? 'Active' : 'Inactive'}</div>
                        <div>Location: {lat.toFixed(4)}, {lon.toFixed(4)}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Last Update: {new Date(node.lastUpdate * 1000).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {/* Arrow pointing to marker */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                    </motion.div>
                  )}
                </button>
              </Marker>
            );
          })}
        </Map>

        {/* Loading overlay */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
          >
            <div className="flex items-center gap-3 text-white bg-gray-800 px-6 py-4 rounded-lg border border-gray-600">
              <Loader2 className="w-6 h-6 animate-spin text-energy-400" />
              <span>Loading energy data...</span>
            </div>
          </motion.div>
        )}
      </MapProvider>
    </div>
  );
}