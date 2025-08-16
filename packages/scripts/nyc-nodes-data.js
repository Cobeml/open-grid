/**
 * NYC Energy Grid Network Data
 * 35 Key monitoring locations across NYC with intelligent edge connectivity
 */

// 35 Key NYC Energy Monitoring Locations
const NYC_NODES = [
  // Manhattan Business District (High Energy Core)
  { id: 0, name: "Times Square Hub", location: "lat:40.7580,lon:-73.9855", district: "Manhattan", type: "commercial", priority: 1 },
  { id: 1, name: "Wall Street Station", location: "lat:40.7074,lon:-74.0113", district: "Manhattan", type: "financial", priority: 1 },
  { id: 2, name: "Empire State Building", location: "lat:40.7484,lon:-73.9857", district: "Manhattan", type: "landmark", priority: 1 },
  { id: 3, name: "World Trade Center", location: "lat:40.7127,lon:-74.0134", district: "Manhattan", type: "commercial", priority: 1 },
  { id: 4, name: "Midtown East", location: "lat:40.7505,lon:-73.9732", district: "Manhattan", type: "commercial", priority: 1 },
  
  // Manhattan Residential & Mixed Use
  { id: 5, name: "Upper East Side", location: "lat:40.7736,lon:-73.9566", district: "Manhattan", type: "residential", priority: 2 },
  { id: 6, name: "Upper West Side", location: "lat:40.7831,lon:-73.9712", district: "Manhattan", type: "residential", priority: 2 },
  { id: 7, name: "Greenwich Village", location: "lat:40.7332,lon:-73.9973", district: "Manhattan", type: "mixed", priority: 2 },
  { id: 8, name: "SoHo District", location: "lat:40.7233,lon:-73.9970", district: "Manhattan", type: "mixed", priority: 2 },
  { id: 9, name: "Chinatown/LES", location: "lat:40.7159,lon:-73.9970", district: "Manhattan", type: "residential", priority: 3 },
  { id: 10, name: "Harlem Central", location: "lat:40.8116,lon:-73.9465", district: "Manhattan", type: "residential", priority: 3 },
  
  // Brooklyn Networks
  { id: 11, name: "Brooklyn Heights", location: "lat:40.6962,lon:-73.9936", district: "Brooklyn", type: "residential", priority: 2 },
  { id: 12, name: "Williamsburg Hub", location: "lat:40.7081,lon:-73.9571", district: "Brooklyn", type: "mixed", priority: 2 },
  { id: 13, name: "Park Slope", location: "lat:40.6782,lon:-73.9772", district: "Brooklyn", type: "residential", priority: 3 },
  { id: 14, name: "DUMBO", location: "lat:40.7033,lon:-73.9903", district: "Brooklyn", type: "mixed", priority: 2 },
  { id: 15, name: "Sunset Park", location: "lat:40.6561,lon:-74.0106", district: "Brooklyn", type: "industrial", priority: 3 },
  { id: 16, name: "Crown Heights", location: "lat:40.6707,lon:-73.9441", district: "Brooklyn", type: "residential", priority: 3 },
  { id: 17, name: "Bay Ridge", location: "lat:40.6350,lon:-74.0256", district: "Brooklyn", type: "residential", priority: 3 },
  
  // Queens Networks
  { id: 18, name: "Long Island City", location: "lat:40.7498,lon:-73.9401", district: "Queens", type: "mixed", priority: 2 },
  { id: 19, name: "Astoria", location: "lat:40.7720,lon:-73.9262", district: "Queens", type: "residential", priority: 3 },
  { id: 20, name: "Flushing", location: "lat:40.7676,lon:-73.8331", district: "Queens", type: "mixed", priority: 3 },
  { id: 21, name: "Jackson Heights", location: "lat:40.7557,lon:-73.8831", district: "Queens", type: "residential", priority: 3 },
  { id: 22, name: "Jamaica Center", location: "lat:40.7021,lon:-73.8053", district: "Queens", type: "mixed", priority: 3 },
  { id: 23, name: "Elmhurst", location: "lat:40.7362,lon:-73.8826", district: "Queens", type: "residential", priority: 3 },
  
  // Bronx Networks
  { id: 24, name: "Bronx Hub", location: "lat:40.8448,lon:-73.8648", district: "Bronx", type: "mixed", priority: 2 },
  { id: 25, name: "Yankee Stadium", location: "lat:40.8296,lon:-73.9262", district: "Bronx", type: "entertainment", priority: 2 },
  { id: 26, name: "Fordham", location: "lat:40.8618,lon:-73.8967", district: "Bronx", type: "mixed", priority: 3 },
  { id: 27, name: "South Bronx", location: "lat:40.8176,lon:-73.9052", district: "Bronx", type: "residential", priority: 3 },
  
  // Staten Island Networks
  { id: 28, name: "St. George Terminal", location: "lat:40.6436,lon:-74.0739", district: "Staten Island", type: "transport", priority: 2 },
  { id: 29, name: "Stapleton", location: "lat:40.6276,lon:-74.0754", district: "Staten Island", type: "residential", priority: 3 },
  { id: 30, name: "New Dorp", location: "lat:40.5730,lon:-74.1174", district: "Staten Island", type: "residential", priority: 3 },
  
  // Critical Infrastructure Nodes
  { id: 31, name: "JFK Airport Grid", location: "lat:40.6413,lon:-73.7781", district: "Queens", type: "infrastructure", priority: 1 },
  { id: 32, name: "LaGuardia Airport", location: "lat:40.7769,lon:-73.8740", district: "Queens", type: "infrastructure", priority: 1 },
  { id: 33, name: "Brooklyn Navy Yard", location: "lat:40.7038,lon:-73.9730", district: "Brooklyn", type: "industrial", priority: 2 },
  { id: 34, name: "Central Park Grid", location: "lat:40.7812,lon:-73.9665", district: "Manhattan", type: "public", priority: 2 }
];

/**
 * Smart Edge Connectivity Matrix
 * Defines which nodes are connected based on:
 * - Geographic proximity
 * - Infrastructure type
 * - Grid topology
 * - Redundancy requirements
 */
const EDGE_CONNECTIONS = [
  // Manhattan Core Ring (Times Square, Empire State, Midtown East, Wall Street, WTC)
  { from: 0, to: 2, type: "primary", distance: 0.8, capacity: 1000 },    // Times Square -> Empire State
  { from: 2, to: 4, type: "primary", distance: 0.6, capacity: 1000 },    // Empire State -> Midtown East
  { from: 4, to: 1, type: "primary", distance: 2.1, capacity: 800 },     // Midtown East -> Wall Street
  { from: 1, to: 3, type: "primary", distance: 0.7, capacity: 1000 },    // Wall Street -> WTC
  { from: 3, to: 0, type: "primary", distance: 2.8, capacity: 800 },     // WTC -> Times Square (closes ring)
  
  // Manhattan North-South Spine
  { from: 0, to: 5, type: "primary", distance: 1.8, capacity: 800 },     // Times Square -> Upper East Side
  { from: 0, to: 6, type: "primary", distance: 2.1, capacity: 800 },     // Times Square -> Upper West Side
  { from: 5, to: 6, type: "secondary", distance: 1.2, capacity: 600 },   // Upper East <-> Upper West
  { from: 5, to: 10, type: "secondary", distance: 2.3, capacity: 500 },  // Upper East -> Harlem
  { from: 6, to: 10, type: "secondary", distance: 1.8, capacity: 500 },  // Upper West -> Harlem
  { from: 2, to: 7, type: "secondary", distance: 1.5, capacity: 600 },   // Empire State -> Greenwich Village
  { from: 7, to: 8, type: "secondary", distance: 0.5, capacity: 400 },   // Greenwich Village -> SoHo
  { from: 8, to: 9, type: "secondary", distance: 0.8, capacity: 400 },   // SoHo -> Chinatown
  { from: 9, to: 3, type: "secondary", distance: 0.9, capacity: 500 },   // Chinatown -> WTC
  
  // Brooklyn Grid Network
  { from: 3, to: 11, type: "primary", distance: 1.2, capacity: 800 },    // WTC -> Brooklyn Heights (main feed)
  { from: 11, to: 14, type: "primary", distance: 0.8, capacity: 600 },   // Brooklyn Heights -> DUMBO
  { from: 14, to: 12, type: "primary", distance: 1.1, capacity: 700 },   // DUMBO -> Williamsburg
  { from: 12, to: 13, type: "secondary", distance: 2.2, capacity: 500 },  // Williamsburg -> Park Slope
  { from: 13, to: 15, type: "secondary", distance: 1.8, capacity: 400 },  // Park Slope -> Sunset Park
  { from: 13, to: 16, type: "secondary", distance: 2.1, capacity: 400 },  // Park Slope -> Crown Heights
  { from: 15, to: 17, type: "secondary", distance: 2.5, capacity: 300 },  // Sunset Park -> Bay Ridge
  { from: 11, to: 33, type: "industrial", distance: 0.7, capacity: 900 }, // Brooklyn Heights -> Navy Yard
  
  // Queens Grid Network
  { from: 4, to: 18, type: "primary", distance: 2.1, capacity: 800 },    // Midtown East -> Long Island City
  { from: 18, to: 19, type: "primary", distance: 1.8, capacity: 600 },   // LIC -> Astoria
  { from: 19, to: 32, type: "infrastructure", distance: 2.8, capacity: 1200 }, // Astoria -> LaGuardia
  { from: 18, to: 21, type: "secondary", distance: 3.2, capacity: 500 },  // LIC -> Jackson Heights
  { from: 21, to: 23, type: "secondary", distance: 1.2, capacity: 400 },  // Jackson Heights -> Elmhurst
  { from: 21, to: 20, type: "secondary", distance: 2.1, capacity: 500 },  // Jackson Heights -> Flushing
  { from: 23, to: 22, type: "secondary", distance: 2.8, capacity: 400 },  // Elmhurst -> Jamaica
  { from: 22, to: 31, type: "infrastructure", distance: 4.2, capacity: 1500 }, // Jamaica -> JFK
  
  // Bronx Network
  { from: 10, to: 25, type: "primary", distance: 2.1, capacity: 600 },   // Harlem -> Yankee Stadium
  { from: 25, to: 24, type: "primary", distance: 1.8, capacity: 600 },   // Yankee Stadium -> Bronx Hub
  { from: 25, to: 27, type: "secondary", distance: 1.2, capacity: 400 },  // Yankee Stadium -> South Bronx
  { from: 24, to: 26, type: "secondary", distance: 1.5, capacity: 400 },  // Bronx Hub -> Fordham
  { from: 19, to: 24, type: "inter-borough", distance: 4.1, capacity: 500 }, // Astoria -> Bronx Hub (backup)
  
  // Staten Island Network
  { from: 17, to: 28, type: "primary", distance: 5.2, capacity: 600 },   // Bay Ridge -> St. George (ferry connection)
  { from: 28, to: 29, type: "secondary", distance: 1.1, capacity: 400 },  // St. George -> Stapleton
  { from: 29, to: 30, type: "secondary", distance: 3.8, capacity: 300 },  // Stapleton -> New Dorp
  
  // Special Infrastructure Connections
  { from: 34, to: 5, type: "utility", distance: 0.8, capacity: 300 },    // Central Park -> Upper East Side
  { from: 34, to: 6, type: "utility", distance: 0.5, capacity: 300 },    // Central Park -> Upper West Side
  { from: 33, to: 12, type: "industrial", distance: 1.4, capacity: 800 }, // Navy Yard -> Williamsburg
  
  // Redundant Cross-Connections for Grid Stability
  { from: 0, to: 18, type: "redundant", distance: 3.1, capacity: 600 },  // Times Square -> LIC (backup)
  { from: 2, to: 12, type: "redundant", distance: 4.2, capacity: 500 },  // Empire State -> Williamsburg
  { from: 1, to: 11, type: "redundant", distance: 1.8, capacity: 700 },  // Wall Street -> Brooklyn Heights (backup)
  { from: 20, to: 24, type: "redundant", distance: 5.1, capacity: 400 },  // Flushing -> Bronx Hub
];

/**
 * Calculate grid topology metrics
 */
function calculateGridMetrics() {
  const nodeConnections = new Map();
  
  // Initialize connection counts
  NYC_NODES.forEach(node => {
    nodeConnections.set(node.id, 0);
  });
  
  // Count connections per node
  EDGE_CONNECTIONS.forEach(edge => {
    nodeConnections.set(edge.from, (nodeConnections.get(edge.from) || 0) + 1);
    nodeConnections.set(edge.to, (nodeConnections.get(edge.to) || 0) + 1);
  });
  
  const metrics = {
    totalNodes: NYC_NODES.length,
    totalEdges: EDGE_CONNECTIONS.length,
    avgConnectionsPerNode: EDGE_CONNECTIONS.length * 2 / NYC_NODES.length,
    nodesByDistrict: {},
    nodesByType: {},
    edgesByType: {},
    maxConnections: Math.max(...nodeConnections.values()),
    minConnections: Math.min(...nodeConnections.values())
  };
  
  // Group by district and type
  NYC_NODES.forEach(node => {
    metrics.nodesByDistrict[node.district] = (metrics.nodesByDistrict[node.district] || 0) + 1;
    metrics.nodesByType[node.type] = (metrics.nodesByType[node.type] || 0) + 1;
  });
  
  // Group edges by type
  EDGE_CONNECTIONS.forEach(edge => {
    metrics.edgesByType[edge.type] = (metrics.edgesByType[edge.type] || 0) + 1;
  });
  
  return metrics;
}

/**
 * Get node neighbors for routing algorithms
 */
function getNodeNeighbors(nodeId) {
  const neighbors = [];
  
  EDGE_CONNECTIONS.forEach(edge => {
    if (edge.from === nodeId) {
      neighbors.push({
        id: edge.to,
        distance: edge.distance,
        capacity: edge.capacity,
        type: edge.type
      });
    } else if (edge.to === nodeId) {
      neighbors.push({
        id: edge.from,
        distance: edge.distance,
        capacity: edge.capacity,
        type: edge.type
      });
    }
  });
  
  return neighbors;
}

/**
 * Generate formatted location strings for smart contract
 */
function getFormattedLocations() {
  return NYC_NODES.map(node => node.location);
}

/**
 * Find shortest path between two nodes (for load balancing)
 */
function findShortestPath(startId, endId) {
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();
  
  // Initialize
  NYC_NODES.forEach(node => {
    distances.set(node.id, node.id === startId ? 0 : Infinity);
    unvisited.add(node.id);
  });
  
  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let current = null;
    let minDistance = Infinity;
    
    for (const nodeId of unvisited) {
      if (distances.get(nodeId) < minDistance) {
        minDistance = distances.get(nodeId);
        current = nodeId;
      }
    }
    
    if (current === null || current === endId) break;
    
    unvisited.delete(current);
    
    // Check neighbors
    const neighbors = getNodeNeighbors(current);
    neighbors.forEach(neighbor => {
      if (unvisited.has(neighbor.id)) {
        const alt = distances.get(current) + neighbor.distance;
        if (alt < distances.get(neighbor.id)) {
          distances.set(neighbor.id, alt);
          previous.set(neighbor.id, current);
        }
      }
    });
  }
  
  // Reconstruct path
  const path = [];
  let current = endId;
  
  while (current !== undefined) {
    path.unshift(current);
    current = previous.get(current);
  }
  
  return path.length > 1 ? path : null;
}

module.exports = {
  NYC_NODES,
  EDGE_CONNECTIONS,
  calculateGridMetrics,
  getNodeNeighbors,
  getFormattedLocations,
  findShortestPath
};