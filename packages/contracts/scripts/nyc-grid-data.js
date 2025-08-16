const { ethers } = require("ethers");

// NYC Grid Network Data
const NYC_GRID_NODES = [
  // Manhattan - Downtown
  { id: 1, name: "Financial District Substation", location: "lat:40.7075,lon:-74.0109", zone: "downtown" },
  { id: 2, name: "Battery Park Terminal", location: "lat:40.7033,lon:-74.0170", zone: "downtown" },
  { id: 3, name: "World Trade Center Hub", location: "lat:40.7128,lon:-74.0130", zone: "downtown" },
  { id: 4, name: "Fulton Street Station", location: "lat:40.7102,lon:-74.0085", zone: "downtown" },
  { id: 5, name: "City Hall Grid", location: "lat:40.7128,lon:-74.0060", zone: "downtown" },
  
  // Manhattan - Midtown
  { id: 6, name: "Times Square Hub", location: "lat:40.7580,lon:-73.9855", zone: "midtown" },
  { id: 7, name: "Grand Central Terminal", location: "lat:40.7527,lon:-73.9772", zone: "midtown" },
  { id: 8, name: "Penn Station Grid", location: "lat:40.7505,lon:-73.9934", zone: "midtown" },
  { id: 9, name: "Empire State Building", location: "lat:40.7484,lon:-73.9857", zone: "midtown" },
  { id: 10, name: "Rockefeller Center", location: "lat:40.7587,lon:-73.9787", zone: "midtown" },
  { id: 11, name: "Bryant Park Station", location: "lat:40.7539,lon:-73.9850", zone: "midtown" },
  { id: 12, name: "Herald Square", location: "lat:40.7505,lon:-73.9885", zone: "midtown" },
  
  // Manhattan - Upper
  { id: 13, name: "Central Park South", location: "lat:40.7648,lon:-73.9808", zone: "upper" },
  { id: 14, name: "Columbus Circle", location: "lat:40.7683,lon:-73.9816", zone: "upper" },
  { id: 15, name: "Lincoln Center", location: "lat:40.7725,lon:-73.9831", zone: "upper" },
  { id: 16, name: "Upper West Side Hub", location: "lat:40.7855,lon:-73.9747", zone: "upper" },
  { id: 17, name: "Upper East Side Grid", location: "lat:40.7736,lon:-73.9715", zone: "upper" },
  { id: 18, name: "Harlem Terminal", location: "lat:40.8116,lon:-73.9465", zone: "upper" },
  
  // Brooklyn
  { id: 19, name: "Brooklyn Bridge Park", location: "lat:40.7021,lon:-73.9969", zone: "brooklyn" },
  { id: 20, name: "DUMBO Substation", location: "lat:40.7033,lon:-73.9870", zone: "brooklyn" },
  { id: 21, name: "Williamsburg Bridge", location: "lat:40.7081,lon:-73.9571", zone: "brooklyn" },
  { id: 22, name: "Bushwick Terminal", location: "lat:40.6944,lon:-73.9211", zone: "brooklyn" },
  { id: 23, name: "Prospect Park Hub", location: "lat:40.6602,lon:-73.9690", zone: "brooklyn" },
  { id: 24, name: "Coney Island Grid", location: "lat:40.5755,lon:-73.9707", zone: "brooklyn" },
  
  // Queens
  { id: 25, name: "Long Island City", location: "lat:40.7447,lon:-73.9485", zone: "queens" },
  { id: 26, name: "Astoria Terminal", location: "lat:40.7644,lon:-73.9235", zone: "queens" },
  { id: 27, name: "Flushing Meadows", location: "lat:40.7505,lon:-73.8454", zone: "queens" },
  { id: 28, name: "JFK Airport Hub", location: "lat:40.6413,lon:-73.7781", zone: "queens" },
  
  // Bronx
  { id: 29, name: "Yankee Stadium Grid", location: "lat:40.8296,lon:-73.9262", zone: "bronx" },
  { id: 30, name: "Bronx Terminal Market", location: "lat:40.8270,lon:-73.9230", zone: "bronx" },
  
  // Staten Island
  { id: 31, name: "Staten Island Ferry", location: "lat:40.6437,lon:-74.0756", zone: "staten" },
  { id: 32, name: "St. George Terminal", location: "lat:40.6437,lon:-74.0756", zone: "staten" },
  
  // Major Infrastructure
  { id: 33, name: "LaGuardia Airport", location: "lat:40.7769,lon:-73.8740", zone: "airports" },
  { id: 34, name: "Newark Liberty Hub", location: "lat:40.6895,lon:-74.1745", zone: "airports" },
  { id: 35, name: "Metropolitan Hub", location: "lat:40.7505,lon:-73.9934", zone: "central" }
];

// Grid Connections (Edges) - Major transmission lines
const GRID_CONNECTIONS = [
  // Downtown Core
  { from: 1, to: 2, type: "high_voltage", capacity: 500 },
  { from: 1, to: 3, type: "high_voltage", capacity: 500 },
  { from: 2, to: 3, type: "medium_voltage", capacity: 300 },
  { from: 3, to: 4, type: "high_voltage", capacity: 500 },
  { from: 4, to: 5, type: "medium_voltage", capacity: 300 },
  
  // Downtown to Midtown
  { from: 5, to: 6, type: "high_voltage", capacity: 800 },
  { from: 5, to: 7, type: "high_voltage", capacity: 800 },
  
  // Midtown Grid
  { from: 6, to: 7, type: "high_voltage", capacity: 600 },
  { from: 6, to: 8, type: "medium_voltage", capacity: 400 },
  { from: 7, to: 8, type: "high_voltage", capacity: 600 },
  { from: 6, to: 9, type: "medium_voltage", capacity: 300 },
  { from: 7, to: 10, type: "medium_voltage", capacity: 300 },
  { from: 8, to: 11, type: "medium_voltage", capacity: 300 },
  { from: 8, to: 12, type: "medium_voltage", capacity: 300 },
  
  // Midtown to Upper
  { from: 10, to: 13, type: "high_voltage", capacity: 600 },
  { from: 11, to: 14, type: "medium_voltage", capacity: 400 },
  { from: 13, to: 14, type: "medium_voltage", capacity: 300 },
  { from: 14, to: 15, type: "medium_voltage", capacity: 300 },
  { from: 15, to: 16, type: "medium_voltage", capacity: 300 },
  { from: 13, to: 17, type: "medium_voltage", capacity: 300 },
  { from: 16, to: 18, type: "high_voltage", capacity: 500 },
  
  // Cross-Borough Connections
  { from: 2, to: 19, type: "high_voltage", capacity: 800 }, // Manhattan to Brooklyn
  { from: 19, to: 20, type: "medium_voltage", capacity: 400 },
  { from: 20, to: 21, type: "medium_voltage", capacity: 400 },
  { from: 21, to: 22, type: "medium_voltage", capacity: 400 },
  { from: 22, to: 23, type: "high_voltage", capacity: 500 },
  { from: 23, to: 24, type: "high_voltage", capacity: 600 },
  
  // Queens Connections
  { from: 21, to: 25, type: "high_voltage", capacity: 600 }, // Brooklyn to Queens
  { from: 25, to: 26, type: "medium_voltage", capacity: 400 },
  { from: 26, to: 27, type: "high_voltage", capacity: 500 },
  { from: 27, to: 28, type: "high_voltage", capacity: 600 },
  
  // Bronx Connections
  { from: 18, to: 29, type: "high_voltage", capacity: 600 }, // Harlem to Bronx
  { from: 29, to: 30, type: "medium_voltage", capacity: 400 },
  
  // Staten Island
  { from: 2, to: 31, type: "high_voltage", capacity: 800 }, // Battery Park to Staten Island
  { from: 31, to: 32, type: "medium_voltage", capacity: 400 },
  
  // Airport Connections
  { from: 28, to: 33, type: "high_voltage", capacity: 700 }, // JFK to LaGuardia
  { from: 33, to: 34, type: "high_voltage", capacity: 800 }, // LaGuardia to Newark
  
  // Central Hub Connections
  { from: 8, to: 35, type: "high_voltage", capacity: 1000 }, // Penn Station to Metro Hub
  { from: 35, to: 7, type: "high_voltage", capacity: 1000 }, // Metro Hub to Grand Central
  { from: 35, to: 6, type: "high_voltage", capacity: 1000 }, // Metro Hub to Times Square
];

// Generate realistic energy usage data
function generateEnergyData(nodeId, baseUsage = 1000) {
  const timeOfDay = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // Base usage varies by time of day
  let multiplier = 1;
  if (timeOfDay >= 7 && timeOfDay <= 9) multiplier = 1.8; // Morning peak
  else if (timeOfDay >= 17 && timeOfDay <= 19) multiplier = 2.2; // Evening peak
  else if (timeOfDay >= 22 || timeOfDay <= 6) multiplier = 0.6; // Night low
  
  // Weekend vs weekday
  if (dayOfWeek === 0 || dayOfWeek === 6) multiplier *= 0.8; // Weekend reduction
  
  // Add some randomness
  const randomFactor = 0.8 + Math.random() * 0.4; // ±20% variation
  
  return Math.floor(baseUsage * multiplier * randomFactor);
}

// Generate node data for contract deployment
function generateNodeData() {
  return NYC_GRID_NODES.map(node => ({
    location: node.location,
    name: node.name,
    zone: node.zone,
    baseUsage: Math.floor(800 + Math.random() * 1200), // 800-2000 kWh base
    nodeId: node.id
  }));
}

// Generate edge data for visualization
function generateEdgeData() {
  return GRID_CONNECTIONS.map((connection, index) => ({
    id: index,
    source: connection.from,
    target: connection.to,
    type: connection.type,
    capacity: connection.capacity,
    currentLoad: Math.floor(connection.capacity * (0.3 + Math.random() * 0.5)), // 30-80% load
    status: Math.random() > 0.95 ? 'maintenance' : 'active' // 5% chance of maintenance
  }));
}

// Export functions for use in deployment scripts
module.exports = {
  NYC_GRID_NODES,
  GRID_CONNECTIONS,
  generateEnergyData,
  generateNodeData,
  generateEdgeData,
  
  // Helper function to get node by ID
  getNodeById: (id) => NYC_GRID_NODES.find(node => node.id === id),
  
  // Helper function to get connections for a node
  getNodeConnections: (nodeId) => {
    return GRID_CONNECTIONS.filter(conn => conn.from === nodeId || conn.to === nodeId);
  },
  
  // Helper function to parse location string
  parseLocation: (location) => {
    const match = location.match(/lat:([-\d.]+),lon:([-\d.]+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    return { lat: 0, lon: 0 };
  }
};
