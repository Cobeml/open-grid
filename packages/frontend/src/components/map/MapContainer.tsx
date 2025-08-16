'use client';

import React, { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useChainId } from 'wagmi';
import { MapProvider } from 'react-map-gl';
import { Loader2, Settings, Layers, Zap } from 'lucide-react';
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

const DeckGL = dynamic(() => import('@deck.gl/react').then(mod => mod.default), {
  ssr: false,
});

export function MapContainer() {
  const chainId = useChainId();
  const [selectedChain, setSelectedChain] = useState(chainId || 137);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [selectedNode, setSelectedNode] = useState(null);

  const { nodes, isLoading, totalUsage, activeNodes, error } = useEnergyData(selectedChain);

  const handleViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
  }, []);

  const handleNodeClick = useCallback((info) => {
    if (info.object && showTooltips) {
      setSelectedNode(info.object);
    }
  }, [showTooltips]);

  const layers = useMemo(() => {
    if (!nodes.length) return [];

    const ScatterplotLayer = require('@deck.gl/layers').ScatterplotLayer;
    const HeatmapLayer = require('@deck.gl/layers').HeatmapLayer;
    
    const layers = [];

    // Heatmap layer
    if (showHeatmap && nodes.length > 5) {
      layers.push(
        new HeatmapLayer({
          id: 'energy-heatmap',
          data: nodes,
          getPosition: (d) => [d.longitude, d.latitude],
          getWeight: (d) => Math.log(Math.max(d.currentUsage, 1)),
          radiusPixels: 80,
          intensity: 2,
          threshold: 0.03,
          colorRange: [
            [0, 255, 136, 25],
            [0, 255, 136, 85],
            [255, 255, 0, 85],
            [255, 136, 0, 85],
            [255, 68, 0, 85],
            [255, 0, 0, 85],
          ],
        })
      );
    }

    // Scatterplot layer for individual nodes
    layers.push(
      new ScatterplotLayer({
        id: 'energy-nodes',
        data: nodes,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => {
          const baseRadius = Math.sqrt(Math.max(d.currentUsage, 100)) * 0.8;
          return Math.max(baseRadius, 500);
        },
        getFillColor: (d) => {
          if (!d.active) return [156, 163, 175, 180]; // Gray for inactive
          const usage = d.currentUsage || 0;
          if (usage > 5000) return [239, 68, 68, 200]; // High usage - red
          if (usage > 2000) return [245, 158, 11, 200]; // Medium usage - amber
          return [34, 197, 94, 200]; // Low usage - green
        },
        getLineColor: [255, 255, 255, 100],
        getLineWidth: 2,
        pickable: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 60,
        onClick: handleNodeClick,
        updateTriggers: {
          getFillColor: [nodes],
          getRadius: [nodes],
        },
      })
    );

    return layers;
  }, [nodes, showHeatmap, handleNodeClick]);

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
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          onViewStateChange={handleViewStateChange}
          getTooltip={({ object }) => {
            if (!object || !showTooltips) return null;
            return {
              html: `
                <div class="bg-gray-800 text-white p-3 rounded-lg border border-gray-600 shadow-lg">
                  <div class="font-semibold mb-1">Node ${object.id}</div>
                  <div class="text-sm text-gray-300">
                    Usage: ${(object.currentUsage / 1000).toFixed(1)}k kWh<br/>
                    Status: ${object.active ? 'Active' : 'Inactive'}<br/>
                    Location: ${object.latitude.toFixed(4)}, ${object.longitude.toFixed(4)}
                  </div>
                </div>
              `,
              style: {
                fontSize: '12px',
                pointerEvents: 'none',
              }
            };
          }}
        >
          <Map
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={mapStyle}
            reuseMaps
            preserveDrawingBuffer
            antialias
          />
        </DeckGL>

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