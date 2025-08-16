// Grid Network Types
export interface GridNode {
  id: number;
  name: string;
  location: string;
  zone: string;
  active: boolean;
  registeredAt: number;
  lastUpdate: number;
  baseUsage?: number;
  currentUsage?: number;
  status?: 'active' | 'maintenance' | 'offline';
}

export interface GridEdge {
  id: number;
  source: number;
  target: number;
  type: 'high_voltage' | 'medium_voltage' | 'low_voltage';
  capacity: number;
  currentLoad: number;
  status: 'active' | 'maintenance' | 'overloaded';
  utilization: number; // currentLoad / capacity
}

export interface GridNetwork {
  nodes: GridNode[];
  edges: GridEdge[];
  totalCapacity: number;
  totalLoad: number;
  utilization: number;
}

export interface ZoneData {
  name: string;
  nodes: GridNode[];
  totalUsage: number;
  avgUtilization: number;
}

// Energy flow types
export interface EnergyFlow {
  from: number;
  to: number;
  amount: number;
  timestamp: number;
}

// Grid status types
export interface GridStatus {
  overall: 'healthy' | 'warning' | 'critical';
  zones: Record<string, 'healthy' | 'warning' | 'critical'>;
  alerts: GridAlert[];
}

export interface GridAlert {
  id: string;
  type: 'overload' | 'maintenance' | 'outage' | 'efficiency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  nodeId?: number;
  edgeId?: number;
  timestamp: number;
  resolved: boolean;
}

// Map visualization types
export interface MapNode extends GridNode {
  position: [number, number]; // [lon, lat]
  size: number;
  color: string;
  connections: number[];
}

export interface MapEdge extends GridEdge {
  sourcePosition: [number, number];
  targetPosition: [number, number];
  width: number;
  color: string;
  animated: boolean;
}

// Real-time data types
export interface RealTimeData {
  timestamp: number;
  nodes: Record<number, {
    usage: number;
    status: string;
    lastUpdate: number;
  }>;
  edges: Record<number, {
    load: number;
    status: string;
    lastUpdate: number;
  }>;
}
