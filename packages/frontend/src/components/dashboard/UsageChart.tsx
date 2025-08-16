'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import { formatUsage, formatTimestamp } from '@/lib/utils';
import { EnergyData, NodeData } from '@/types/energy';

interface UsageChartProps {
  data: EnergyData[];
  nodes: NodeData[];
}

export function UsageChart({ data, nodes }: UsageChartProps) {
  const chartData = useMemo(() => {
    // Group data by node and get latest readings
    const nodeUsage = new Map<number, { node: NodeData; latestUsage: number; timestamp: number }>();
    
    data.forEach(reading => {
      const existing = nodeUsage.get(reading.nodeId);
      if (!existing || reading.timestamp > existing.timestamp) {
        const node = nodes.find(n => n.id === reading.nodeId);
        if (node) {
          nodeUsage.set(reading.nodeId, {
            node,
            latestUsage: reading.kWh,
            timestamp: reading.timestamp
          });
        }
      }
    });

    return Array.from(nodeUsage.values()).sort((a, b) => b.latestUsage - a.latestUsage);
  }, [data, nodes]);

  const maxUsage = Math.max(...chartData.map(d => d.latestUsage), 1);
  const totalUsage = chartData.reduce((sum, d) => sum + d.latestUsage, 0);

  if (chartData.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="w-5 h-5 text-energy-400" />
            Energy Usage by Node
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No energy data available</p>
              <p className="text-sm">Connect to a network to see usage data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart3 className="w-5 h-5 text-energy-400" />
          Energy Usage by Node
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Total: {formatUsage(totalUsage)}</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {chartData.length} active nodes
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const percentage = (item.latestUsage / maxUsage) * 100;
            const usageLevel = item.latestUsage > maxUsage * 0.7 ? 'high' : 
                              item.latestUsage > maxUsage * 0.4 ? 'medium' : 'low';
            
            const barColor = usageLevel === 'high' ? 'bg-red-400' :
                            usageLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400';
            
            return (
              <motion.div
                key={item.node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      Node {item.node.id}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {item.node.location.split(',')[0].replace('lat:', '')}°N
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">
                      {formatUsage(item.latestUsage)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`absolute top-0 left-0 h-full ${barColor} rounded-full`}
                  />
                  <div 
                    className="absolute top-0 right-0 h-full w-1 bg-white/20 rounded-full"
                    style={{ right: `${100 - percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{percentage.toFixed(1)}% of max</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    usageLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                    usageLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {usageLevel.toUpperCase()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Usage Scale</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span className="text-xs text-gray-400">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                <span className="text-xs text-gray-400">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-xs text-gray-400">High</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}