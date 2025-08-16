'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Activity, Zap, Globe, TrendingUp } from 'lucide-react';
import { formatUsage } from '@/lib/utils';
import { EnergyData, NodeData } from '@/types/energy';

interface MetricCardsProps {
  nodes: NodeData[];
  totalUsage: number;
  activeNodes: number;
  latestData: EnergyData[];
}

export function MetricCards({ nodes, totalUsage, activeNodes, latestData }: MetricCardsProps) {
  const avgUsage = latestData.length > 0 
    ? latestData.reduce((sum, data) => sum + data.kWh, 0) / latestData.length 
    : 0;

  const totalDataPoints = latestData.length;

  const metrics = [
    {
      title: 'Total Energy Usage',
      value: formatUsage(totalUsage),
      icon: Zap,
      description: 'Across all monitoring nodes',
      color: 'text-energy-400',
      bgColor: 'bg-energy-500/10',
      trend: '+12%'
    },
    {
      title: 'Active Nodes',
      value: `${activeNodes}/${nodes.length}`,
      icon: Activity,
      description: 'Currently monitoring',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      trend: activeNodes === nodes.length ? '100%' : `${Math.round((activeNodes/nodes.length) * 100)}%`
    },
    {
      title: 'Network Coverage',
      value: `${nodes.length} Locations`,
      icon: Globe,
      description: 'Global monitoring points',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      trend: `${nodes.length} active`
    },
    {
      title: 'Average Usage',
      value: formatUsage(avgUsage),
      icon: TrendingUp,
      description: 'Per monitoring node',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      trend: totalDataPoints > 0 ? `${totalDataPoints} readings` : 'No data'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">
                  {metric.value}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {metric.description}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className="bg-gray-800 text-gray-300 text-xs"
                  >
                    {metric.trend}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}