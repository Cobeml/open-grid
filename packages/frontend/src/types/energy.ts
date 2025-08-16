export interface EnergyNode {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  active: boolean;
  lastUpdate: number;
  currentUsage: number;
  chainId: number;
  peakUsage?: number;
  averageUsage?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
}

export interface EnergyData {
  id: string;
  nodeId: string;
  kWh: number;
  location: string;
  timestamp: number;
  chainId: number;
  transactionHash?: string;
  blockNumber?: number;
}

export interface Alert {
  id: string;
  type: 'HIGH_USAGE' | 'LOW_USAGE' | 'USAGE_SPIKE' | 'NODE_OFFLINE' | 'SYSTEM_ERROR';
  message: string;
  nodeId?: string;
  chainId: number;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  data?: Record<string, any>;
}

export interface ChainMetrics {
  chainId: number;
  totalNodes: number;
  activeNodes: number;
  totalUsage: number;
  averageUsage: number;
  lastUpdate: number;
  alerts: Alert[];
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TooltipInfo {
  object: EnergyNode;
  x: number;
  y: number;
  coordinate: [number, number];
}

export interface LayerProps {
  data: EnergyNode[];
  visible: boolean;
  pickable: boolean;
  onClick?: (info: any) => void;
  onHover?: (info: any) => void;
}

export interface FilterOptions {
  minUsage: number;
  maxUsage: number;
  activeOnly: boolean;
  chains: number[];
  timeRange: '1h' | '24h' | '7d' | '30d';
}