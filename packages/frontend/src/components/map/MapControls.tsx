'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Settings, 
  Layers, 
  Info, 
  Sun, 
  Moon, 
  Satellite,
  Mountain,
  ChevronDown,
  Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAP_STYLES } from '@/lib/constants';

interface MapControlsProps {
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showTooltips: boolean;
  onToggleTooltips: () => void;
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
  className?: string;
}

const mapStyles = [
  {
    id: MAP_STYLES.SATELLITE,
    name: 'Satellite',
    icon: Satellite,
  },
  {
    id: MAP_STYLES.SATELLITE_STREETS,
    name: 'Satellite Streets',
    icon: Map,
  },
  {
    id: MAP_STYLES.DARK,
    name: 'Dark',
    icon: Moon,
  },
  {
    id: MAP_STYLES.LIGHT, 
    name: 'Light',
    icon: Sun,
  },
  {
    id: MAP_STYLES.TERRAIN,
    name: 'Terrain',
    icon: Mountain,
  },
];

export function MapControls({ 
  showHeatmap, 
  onToggleHeatmap, 
  showTooltips, 
  onToggleTooltips,
  mapStyle,
  onMapStyleChange,
  className 
}: MapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStyle = mapStyles.find(style => style.id === mapStyle) || mapStyles[0];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Main controls */}
      <div className="flex flex-col gap-2 bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg p-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleHeatmap}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            showHeatmap 
              ? 'bg-energy-500 text-white shadow-md' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          )}
        >
          <Activity className="w-4 h-4" />
          Heatmap
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleTooltips}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            showTooltips 
              ? 'bg-energy-500 text-white shadow-md' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          )}
        >
          <Info className="w-4 h-4" />
          Tooltips
        </motion.button>

        {/* Map Style Selector */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-200 w-full"
          >
            <currentStyle.icon className="w-4 h-4" />
            {currentStyle.name}
            <ChevronDown className={cn(
              'w-4 h-4 ml-auto transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} />
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-1 bg-gray-700/95 backdrop-blur-md border border-gray-600 rounded-lg p-1 z-50"
              >
                {mapStyles.map((style) => (
                  <motion.button
                    key={style.id}
                    whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.8)' }}
                    onClick={() => {
                      onMapStyleChange(style.id);
                      setIsExpanded(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium w-full text-left transition-colors',
                      mapStyle === style.id 
                        ? 'text-energy-400 bg-gray-600/50' 
                        : 'text-gray-300 hover:text-white'
                    )}
                  >
                    <style.icon className="w-4 h-4" />
                    {style.name}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Energy Usage
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-300">Low (&lt; 2k kWh)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-300">Medium (2k-5k kWh)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-300">High (&gt; 5k kWh)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-gray-300">Inactive</span>
          </div>
        </div>
      </div>
    </div>
  );
}