'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Wifi, WifiOff } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';

interface AlertPanelProps {
  chainId: number;
}

interface AlertItem {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  chainId?: number;
}

export function AlertPanel({ chainId }: AlertPanelProps) {
  // Generate mock alerts based on current state
  const alerts = useMemo<AlertItem[]>(() => {
    const now = Math.floor(Date.now() / 1000);
    const mockAlerts: AlertItem[] = [];

    // Network connection alert
    if (chainId) {
      mockAlerts.push({
        id: 'network-connected',
        type: 'success',
        title: 'Network Connected',
        message: `Successfully connected to chain ${chainId}. Energy monitoring active.`,
        timestamp: now - 300, // 5 minutes ago
        chainId
      });
    } else {
      mockAlerts.push({
        id: 'network-disconnected',
        type: 'warning',
        title: 'Network Not Connected',
        message: 'Please connect your wallet to start monitoring energy data.',
        timestamp: now - 60,
      });
    }

    // Contract deployment alert
    if (chainId === 80002) { // Polygon Amoy
      mockAlerts.push({
        id: 'contract-deployed',
        type: 'success',
        title: 'Contract Deployed',
        message: 'EnergyMonitor contract deployed successfully on Polygon Amoy testnet.',
        timestamp: now - 600, // 10 minutes ago
        chainId
      });
    }

    // Mock data simulation alert
    mockAlerts.push({
      id: 'mock-data',
      type: 'info',
      title: 'Demo Mode Active',
      message: 'Using simulated energy data for demonstration. Connect to live nodes for real data.',
      timestamp: now - 1200, // 20 minutes ago
    });

    // Node health alerts
    if (chainId) {
      mockAlerts.push({
        id: 'node-health',
        type: 'info',
        title: 'Node Health Check',
        message: 'All monitoring nodes are reporting healthy status.',
        timestamp: now - 180, // 3 minutes ago
      });
    }

    return mockAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }, [chainId]);

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return AlertCircle;
      case 'success': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const getAlertColors = (type: AlertItem['type']) => {
    switch (type) {
      case 'error': return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-400'
      };
      case 'warning': return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        text: 'text-yellow-400',
        badge: 'bg-yellow-500/20 text-yellow-400'
      };
      case 'info': return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-400'
      };
      case 'success': return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-400',
        badge: 'bg-green-500/20 text-green-400'
      };
      default: return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20',
        text: 'text-gray-400',
        badge: 'bg-gray-500/20 text-gray-400'
      };
    }
  };

  const criticalAlerts = alerts.filter(alert => alert.type === 'error').length;
  const warningAlerts = alerts.filter(alert => alert.type === 'warning').length;

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-energy-400" />
            System Alerts
            {chainId ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalAlerts > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {criticalAlerts} Critical
              </Badge>
            )}
            {warningAlerts > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {warningAlerts} Warning
              </Badge>
            )}
            {criticalAlerts === 0 && warningAlerts === 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                All Good
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No alerts</p>
              <p className="text-sm">System is running smoothly</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.map((alert, index) => {
              const Icon = getAlertIcon(alert.type);
              const colors = getAlertColors(alert.type);
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Alert className={`${colors.bg} ${colors.border} border`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white text-sm">
                              {alert.title}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${colors.badge}`}
                            >
                              {alert.type.toUpperCase()}
                            </Badge>
                            {alert.chainId && (
                              <Badge 
                                variant="outline" 
                                className="text-xs border-gray-600 text-gray-400"
                              >
                                Chain {alert.chainId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-mono">
                              {formatTimestamp(alert.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total
            </span>
            <button className="text-energy-400 hover:text-energy-300 transition-colors">
              View All →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}