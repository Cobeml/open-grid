'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Map, Source, Layer, Marker, Popup } from 'react-map-gl';
import type { LayerProps } from 'react-map-gl';
import { useEnergyData } from '@/hooks/useEnergyData';
import { NetworkSelector } from './NetworkSelector';
import { StatsOverlay } from './StatsOverlay';
import { ContractInfo } from './ContractInfo';
import { GridNode, GridEdge, MapNode, MapEdge } from '@/types/grid';
import { Activity, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE, DEFAULT_MAP_STYLE } from '@/lib/constants';

// NYC Grid Network Data (imported from backend)
const NYC_GRID_EDGES = [
  // Downtown Core
  { id: 1, source: 1, target: 2, type: "high_voltage", capacity: 500, currentLoad: 0, status: "active", utilization: 0 },
  { id: 2, source: 1, target: 3, type: "high_voltage", capacity: 500, currentLoad: 0, status: "active", utilization: 0 },
  { id: 3, source: 2, target: 3, type: "medium_voltage", capacity: 300, currentLoad: 0, status: "active", utilization: 0 },
  { id: 4, source: 3, target: 4, type: "high_voltage", capacity: 500, currentLoad: 0, status: "active", utilization: 0 },
  { id: 5, source: 4, target: 5, type: "medium_voltage", capacity: 300, currentLoad: 0, status: "active", utilization: 0 },
  
  // Downtown to Midtown
  { id: 6, source: 5, target: 6, type: "high_voltage", capacity: 800, currentLoad: 0, status: "active", utilization: 0 },
  { id: 7, source: 5, target: 7, type: "high_voltage", capacity: 800, currentLoad: 0, status: "active", utilization: 0 },
  
  // Midtown Grid
  { id: 8, source: 6, target: 7, type: "high_voltage", capacity: 600, currentLoad: 0, status: "active", utilization: 0 },
  { id: 9, source: 6, target: 8, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  { id: 10, source: 7, target: 8, type: "high_voltage", capacity: 600, currentLoad: 0, status: "active", utilization: 0 },
  { id: 11, source: 6, target: 9, type: "medium_voltage", capacity: 300, currentLoad: 0, status: "active", utilization: 0 },
  { id: 12, source: 7, target: 10, type: "medium_voltage", capacity: 300, currentLoad: 0, status: "active", utilization: 0 },
  { id: 13, source: 8, target: 11, type: "medium_voltage", capacity: 300, currentLoad: 0, status: "active", utilization: 0 },
  { id: 14, source: 8, target: 12, type: "medium_voltage", capacity: 300, currentLoad: 0, status: "active", utilization: 0 },
  
  // Cross-Borough Connections
  { id: 15, source: 2, target: 19, type: "high_voltage", capacity: 800, currentLoad: 0, status: "active", utilization: 0 },
  { id: 16, source: 19, target: 20, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  { id: 17, source: 20, target: 21, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  { id: 18, source: 21, target: 22, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  { id: 19, source: 22, target: 23, type: "high_voltage", capacity: 500, currentLoad: 0, status: "active", utilization: 0 },
  { id: 20, source: 23, target: 24, type: "high_voltage", capacity: 600, currentLoad: 0, status: "active", utilization: 0 },
  
  // Queens Connections
  { id: 21, source: 21, target: 25, type: "high_voltage", capacity: 600, currentLoad: 0, status: "active", utilization: 0 },
  { id: 22, source: 25, target: 26, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  { id: 23, source: 26, target: 27, type: "high_voltage", capacity: 500, currentLoad: 0, status: "active", utilization: 0 },
  { id: 24, source: 27, target: 28, type: "high_voltage", capacity: 600, currentLoad: 0, status: "active", utilization: 0 },
  
  // Bronx Connections
  { id: 25, source: 18, target: 29, type: "high_voltage", capacity: 600, currentLoad: 0, status: "active", utilization: 0 },
  { id: 26, source: 29, target: 30, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  
  // Staten Island
  { id: 27, source: 2, target: 31, type: "high_voltage", capacity: 800, currentLoad: 0, status: "active", utilization: 0 },
  { id: 28, source: 31, target: 32, type: "medium_voltage", capacity: 400, currentLoad: 0, status: "active", utilization: 0 },
  
  // Airport Connections
  { id: 29, source: 28, target: 33, type: "high_voltage", capacity: 700, currentLoad: 0, status: "active", utilization: 0 },
  { id: 30, source: 33, target: 34, type: "high_voltage", capacity: 800, currentLoad: 0, status: "active", utilization: 0 },
  
  // Central Hub Connections
  { id: 31, source: 8, target: 35, type: "high_voltage", capacity: 1000, currentLoad: 0, status: "active", utilization: 0 },
  { id: 32, source: 35, target: 7, type: "high_voltage", capacity: 1000, currentLoad: 0, status: "active", utilization: 0 },
  { id: 33, source: 35, target: 6, type: "high_voltage", capacity: 1000, currentLoad: 0, status: "active", utilization: 0 },
];



interface GridMapContainerProps {
  selectedChain: number;
  onChainChange: (chainId: number) => void;
}

export function GridMapContainer({ selectedChain, onChainChange }: GridMapContainerProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showEdges, setShowEdges] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GridNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GridEdge | null>(null);
  const [mapStyle, setMapStyle] = useState<string>(DEFAULT_MAP_STYLE);

  const { nodes, isLoading, totalUsage, activeNodes, error } = useEnergyData(selectedChain);

  // Parse location helper
  const parseLocation = useCallback((location: string): [number, number] => {
    try {
      const match = location.match(/lat:([-\d.]+),lon:([-\d.]+)/);
      if (match) {
        return [parseFloat(match[2]), parseFloat(match[1])]; // [lon, lat]
      }
    } catch {
      return [0, 0];
    }
    return [0, 0];
  }, []);

  // Process nodes for map visualization
  const mapNodes = useMemo(() => {
    return nodes.map((node, index) => {
      const [lon, lat] = parseLocation(node.location);
      // Generate random usage since NodeData doesn't have currentUsage
      const usage = (1000 + Math.random() * 4000);
      
      let color = '#22c55e'; // Green for low usage
      if (usage > 3000) color = '#ef4444'; // Red for high usage
      else if (usage > 2000) color = '#f59e0b'; // Amber for medium usage
      
      if (!node.active) color = '#9ca3af'; // Gray for inactive
      
      return {
        ...node,
        id: index,
        name: `Node ${node.id}`,
        zone: 'Unknown',
        position: [lon, lat] as [number, number],
        size: Math.max(8, Math.min(20, Math.sqrt(usage) / 10)),
        color,
        currentUsage: usage,
        connections: []
      } as MapNode;
    });
  }, [nodes, parseLocation]);

  // Process edges for map visualization
  const mapEdges = useMemo(() => {
    if (!showEdges) return [];
    
    return NYC_GRID_EDGES.map(edge => {
      const sourceNode = mapNodes.find(n => n.id === edge.source - 1);
      const targetNode = mapNodes.find(n => n.id === edge.target - 1);
      
      if (!sourceNode || !targetNode) return null;
      
      const currentLoad = Math.random() * edge.capacity;
      const utilization = currentLoad / edge.capacity;
      let color = '#22c55e'; // Green for low utilization
      if (utilization > 0.8) color = '#ef4444'; // Red for high utilization
      else if (utilization > 0.6) color = '#f59e0b'; // Amber for medium utilization
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type as 'high_voltage' | 'medium_voltage' | 'low_voltage',
        capacity: edge.capacity,
        currentLoad,
        status: utilization > 0.9 ? 'overloaded' : 'active',
        utilization,
        sourcePosition: sourceNode.position,
        targetPosition: targetNode.position,
        width: edge.type === 'high_voltage' ? 3 : edge.type === 'medium_voltage' ? 2 : 1,
        color,
        animated: utilization > 0.7
      } as MapEdge;
    }).filter(Boolean) as MapEdge[];
  }, [mapNodes, showEdges]);

  const handleViewStateChange = useCallback(({ viewState: newViewState }: { viewState: any }) => {
    setViewState(newViewState);
  }, []);

  const handleNodeClick = useCallback((event: any) => {
    const nodeId = event.target.dataset.nodeId;
    if (nodeId) {
      const node = mapNodes.find(n => n.id.toString() === nodeId);
      if (node) {
        // Convert MapNode to GridNode for the popup
        const gridNode: GridNode = {
          id: node.id,
          name: node.name,
          location: node.location,
          zone: node.zone,
          active: node.active,
          registeredAt: node.registeredAt,
          lastUpdate: node.lastUpdate,
          currentUsage: node.currentUsage,
          status: node.status
        };
        setSelectedNode(selectedNode?.id === node.id ? null : gridNode);
        setSelectedEdge(null);
      }
    }
  }, [selectedNode, mapNodes]);

  const handleEdgeClick = useCallback((event: any) => {
    const feature = event.features[0];
    if (feature) {
      const edge = mapEdges.find(e => e.id === feature.properties.id);
      if (edge) {
        // Convert MapEdge to GridEdge for the popup
        const gridEdge: GridEdge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          capacity: edge.capacity,
          currentLoad: edge.currentLoad,
          status: edge.status,
          utilization: edge.utilization
        };
        setSelectedEdge(selectedEdge?.id === edge.id ? null : gridEdge);
        setSelectedNode(null);
      }
    }
  }, [selectedEdge, mapEdges]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Mapbox Access Token Required</h2>
          <p className="text-gray-400">Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables</p>
          <p className="text-sm text-gray-500 mt-2">Get your token at https://account.mapbox.com/</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load grid data</h2>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg p-2">
          {/* Map Style Selector */}
          <div className="mb-2">
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-energy-500"
            >
              <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
              <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite Streets</option>
              <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
              <option value="mapbox://styles/mapbox/light-v11">Light</option>
              <option value="mapbox://styles/mapbox/outdoors-v12">Terrain</option>
            </select>
          </div>
          
          {/* Edge Toggle */}
          <button
            onClick={() => setShowEdges(!showEdges)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 w-full ${
              showEdges 
                ? 'bg-energy-500 text-white shadow-md' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            {showEdges ? 'Hide' : 'Show'} Transmission Lines
          </button>
        </div>
        
        {/* Legend */}
        <div className="mt-2 bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-300 mb-2">Energy Usage</h3>
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

      {/* Network Selector */}
      <div className="absolute top-4 right-4 z-10">
        <NetworkSelector
          selectedChain={selectedChain}
          onChainChange={onChainChange}
        />
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-4 left-4 z-10">
        <StatsOverlay
          activeNodes={activeNodes}
          totalUsage={totalUsage}
          selectedChain={selectedChain}
        />
      </div>

      {/* Contract Info */}
      <div className="absolute bottom-4 right-4 z-10">
        <ContractInfo
          chainId={selectedChain}
          className="min-w-[280px]"
        />
      </div>

      {/* Map */}
      <Map
        {...viewState}
        onMove={handleViewStateChange}
        onClick={handleEdgeClick}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        reuseMaps
        interactiveLayerIds={showEdges ? ['grid-edges-lines'] : []}
      >
                {/* Grid Edges as Lines */}
        {showEdges && (
          <Source
            id="grid-edges"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: mapEdges
                .filter(edge => edge.sourcePosition && edge.targetPosition && 
                               edge.sourcePosition.length >= 2 && edge.targetPosition.length >= 2)
                .map(edge => ({
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [edge.sourcePosition, edge.targetPosition]
                  },
                  properties: {
                    id: edge.id,
                    type: edge.type,
                    capacity: edge.capacity,
                    currentLoad: edge.currentLoad,
                    status: edge.status,
                    utilization: edge.utilization,
                    color: edge.color,
                    width: edge.width,
                    animated: edge.animated
                  }
                }))
            }}
          >
            <Layer
              id="grid-edges-lines"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['get', 'width'],
                'line-opacity': 0.8
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
            />
          </Source>
        )}

        {/* Grid Nodes */}
        {mapNodes.map((node) => {
          // Skip nodes with invalid positions
          if (!node.position || node.position.length < 2) {
            return null;
          }
          
          return (
            <Marker
              key={node.id}
              longitude={node.position[0]}
              latitude={node.position[1]}
              anchor="center"
            >
            <div
              className="cursor-pointer transition-all duration-200 hover:scale-110"
              onClick={handleNodeClick}
              data-node-id={node.id}
              style={{
                width: `${node.size}px`,
                height: `${node.size}px`,
                backgroundColor: node.color,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}
            />
          </Marker>
          );
        })}

        {/* Node Popup */}
        {selectedNode && (
          <Popup
            longitude={parseLocation(selectedNode.location)[0]}
            latitude={parseLocation(selectedNode.location)[1]}
            anchor="bottom"
            onClose={() => setSelectedNode(null)}
            className="z-20"
          >
            <Card className="w-64 bg-gray-900 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {selectedNode.name || `Node ${selectedNode.id}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Status:</span>
                  <Badge variant={selectedNode.active ? "default" : "secondary"}>
                    {selectedNode.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Usage:</span>
                  <span className="text-white">
                    {selectedNode.currentUsage ? `${selectedNode.currentUsage.toFixed(0)} kWh` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Zone:</span>
                  <span className="text-white">{selectedNode.zone}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {selectedNode.location}
                </div>
              </CardContent>
            </Card>
          </Popup>
        )}

        {/* Edge Popup */}
        {selectedEdge && (() => {
          const mapEdge = mapEdges.find(e => e.id === selectedEdge.id);
          const longitude = mapEdge ? (mapEdge.sourcePosition[0] + mapEdge.targetPosition[0]) / 2 : -74.006;
          const latitude = mapEdge ? (mapEdge.sourcePosition[1] + mapEdge.targetPosition[1]) / 2 : 40.7128;
          
          return (
            <Popup
              longitude={longitude}
              latitude={latitude}
              anchor="center"
              onClose={() => setSelectedEdge(null)}
              className="z-20"
            >
              <Card className="w-56 bg-gray-900 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Transmission Line
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Type:</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedEdge.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Capacity:</span>
                    <span className="text-white">{selectedEdge.capacity} MW</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Load:</span>
                    <span className="text-white">{selectedEdge.currentLoad.toFixed(0)} MW</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Utilization:</span>
                    <span className="text-white">{(selectedEdge.utilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Status:</span>
                    <Badge variant={selectedEdge.status === 'active' ? "default" : "destructive"}>
                      {selectedEdge.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Popup>
          );
        })()}
      </Map>
    </div>
  );
}
