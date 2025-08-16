/**
 * Chainlink Functions JavaScript Source Code
 * Fetches NYC energy data using multiple data sources and APIs
 * 
 * This code runs on Chainlink DON nodes in a secure environment
 * and can access real energy APIs in production.
 */

// For development/demo, we'll simulate real data sources
// In production, replace with actual NYC energy APIs:
// - NY ISO (New York Independent System Operator)
// - ConEd API
// - NYC Open Data Portal
// - Real IoT sensor networks

const nodeId = args[0] || "0";
const latitude = parseFloat(args[1]) || 40.7128;
const longitude = parseFloat(args[2]) || -74.0060;
const nodeType = args[3] || "commercial";
const priority = parseInt(args[4]) || 2;

console.log(`Fetching energy data for Node ${nodeId} at ${latitude},${longitude}`);

// Simulate multiple data source aggregation
async function fetchEnergyData() {
  try {
    // In production, these would be real API calls:
    
    // 1. NY ISO Real-Time Energy Pricing
    // const nyisoResponse = await Functions.makeHttpRequest({
    //   url: `https://api.nyiso.com/v1.1/realtime/fuel_mix`,
    //   headers: { 'Authorization': `Bearer ${secrets.nyisoApiKey}` }
    // });

    // 2. ConEd Grid Load Data  
    // const conEdResponse = await Functions.makeHttpRequest({
    //   url: `https://api.coned.com/grid-load/${latitude}/${longitude}`,
    //   headers: { 'X-API-Key': secrets.conEdApiKey }
    // });

    // 3. NYC Open Data - Energy Consumption
    // const nycDataResponse = await Functions.makeHttpRequest({
    //   url: `https://data.cityofnewyork.us/api/energy/consumption?lat=${latitude}&lon=${longitude}`,
    //   headers: { 'App-Token': secrets.nycDataApiKey }
    // });

    // For demo purposes, generate realistic data based on actual NYC patterns
    const energyData = generateRealisticNYCData(nodeId, latitude, longitude, nodeType, priority);
    
    return energyData;
    
  } catch (error) {
    console.error("Error fetching energy data:", error);
    throw error;
  }
}

function generateRealisticNYCData(nodeId, lat, lon, type, priority) {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const season = getSeason(now);
  
  // Base consumption by node type (kWh)
  const baseConsumption = {
    'commercial': 3500,
    'residential': 1200,
    'industrial': 8500,
    'infrastructure': 12000,
    'financial': 5500,
    'mixed': 2100,
    'public': 900,
    'transport': 6500,
    'entertainment': 4200,
    'landmark': 3800
  };
  
  let consumption = baseConsumption[type] || 2000;
  
  // Time-of-day multipliers
  const timeMultipliers = {
    commercial: getCommercialMultiplier(hour, isWeekend),
    residential: getResidentialMultiplier(hour, isWeekend),
    industrial: getIndustrialMultiplier(hour, isWeekend),
    infrastructure: 1.0, // Always steady
    financial: getFinancialMultiplier(hour, isWeekend),
    mixed: getMixedMultiplier(hour, isWeekend),
    public: getPublicMultiplier(hour, isWeekend),
    transport: getTransportMultiplier(hour, isWeekend),
    entertainment: getEntertainmentMultiplier(hour, isWeekend),
    landmark: getLandmarkMultiplier(hour, isWeekend)
  };
  
  consumption *= timeMultipliers[type] || 1.0;
  
  // Seasonal adjustments
  const seasonalMultipliers = {
    'winter': 1.3, // Heating load
    'spring': 0.9,
    'summer': 1.4, // AC load 
    'fall': 0.8
  };
  
  consumption *= seasonalMultipliers[season];
  
  // Priority adjustments (critical infrastructure gets priority)
  if (priority === 1) {
    consumption *= 1.2; // Critical nodes use more power
  }
  
  // Geographic variations within NYC
  const geographicMultiplier = getGeographicMultiplier(lat, lon);
  consumption *= geographicMultiplier;
  
  // Add realistic noise (±5%)
  const noise = (Math.random() - 0.5) * 0.1;
  consumption *= (1 + noise);
  
  // Ensure reasonable bounds
  consumption = Math.max(100, Math.min(20000, consumption));
  
  return {
    nodeId: parseInt(nodeId),
    timestamp: Math.floor(now.getTime() / 1000),
    kWh: Math.floor(consumption * 1000), // Scale for precision
    latitude: Math.floor(lat * 1000000), // 6 decimal places
    longitude: Math.floor(Math.abs(lon) * 1000000),
    dataQuality: 95 + Math.floor(Math.random() * 5), // 95-99% quality
    sourceCount: 3, // Number of data sources aggregated
    season: season,
    hour: hour,
    nodeType: type
  };
}

function getCommercialMultiplier(hour, isWeekend) {
  if (isWeekend) return 0.3; // Much lower on weekends
  if (hour >= 9 && hour <= 17) return 1.5; // Business hours
  if (hour >= 7 && hour <= 9) return 1.2; // Morning ramp-up
  if (hour >= 17 && hour <= 19) return 1.1; // Evening wind-down
  return 0.4; // Night/early morning
}

function getResidentialMultiplier(hour, isWeekend) {
  if (hour >= 6 && hour <= 9) return 1.3; // Morning peak
  if (hour >= 18 && hour <= 22) return 1.4; // Evening peak
  if (hour >= 22 || hour <= 6) return 0.7; // Night low
  return isWeekend ? 1.1 : 0.9; // Daytime varies by weekend
}

function getIndustrialMultiplier(hour, isWeekend) {
  if (isWeekend) return 0.6; // Reduced weekend operations
  if (hour >= 6 && hour <= 22) return 1.2; // Shift operations
  return 0.8; // Night operations
}

function getFinancialMultiplier(hour, isWeekend) {
  if (isWeekend) return 0.2; // Markets closed
  if (hour >= 4 && hour <= 8) return 1.6; // Pre-market trading
  if (hour >= 9 && hour <= 16) return 1.8; // Market hours
  if (hour >= 16 && hour <= 20) return 1.3; // After-hours trading
  return 0.3; // Night
}

function getMixedMultiplier(hour, isWeekend) {
  // Average of commercial and residential
  const comm = getCommercialMultiplier(hour, isWeekend);
  const res = getResidentialMultiplier(hour, isWeekend);
  return (comm + res) / 2;
}

function getPublicMultiplier(hour, isWeekend) {
  if (hour >= 6 && hour <= 22) return 1.2; // Daylight hours
  return 0.4; // Night lighting only
}

function getTransportMultiplier(hour, isWeekend) {
  if (hour >= 6 && hour <= 10) return 1.5; // Morning rush
  if (hour >= 16 && hour <= 20) return 1.6; // Evening rush
  if (hour >= 22 || hour <= 6) return 0.6; // Night service
  return isWeekend ? 0.8 : 1.0; // Regular service
}

function getEntertainmentMultiplier(hour, isWeekend) {
  if (isWeekend && hour >= 19 && hour <= 2) return 2.0; // Weekend nights
  if (hour >= 19 && hour <= 23) return 1.5; // Weeknight events
  if (hour >= 10 && hour <= 18) return 0.8; // Daytime prep
  return 0.3; // Closed/minimal
}

function getLandmarkMultiplier(hour, isWeekend) {
  if (hour >= 8 && hour <= 20) return 1.3; // Tourist hours
  if (hour >= 20 && hour <= 24) return 1.1; // Evening lighting
  return 0.7; // Night security lighting
}

function getSeason(date) {
  const month = date.getMonth() + 1; // 1-12
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'fall';
}

function getGeographicMultiplier(lat, lon) {
  // Manhattan (high density)
  if (lat >= 40.700 && lat <= 40.800 && lon <= -73.900 && lon >= -74.020) {
    return 1.3;
  }
  // Brooklyn (mixed density)
  if (lat >= 40.570 && lat <= 40.730 && lon <= -73.850 && lon >= -74.050) {
    return 1.1;
  }
  // Queens (sprawling, includes airports)
  if (lat >= 40.540 && lat <= 40.800 && lon <= -73.700 && lon >= -73.960) {
    return 1.0;
  }
  // Bronx (residential/mixed)
  if (lat >= 40.790 && lat <= 40.920 && lon <= -73.750 && lon >= -73.930) {
    return 0.9;
  }
  // Staten Island (suburban)
  if (lat >= 40.470 && lat <= 40.650 && lon <= -74.050 && lon >= -74.260) {
    return 0.8;
  }
  return 1.0; // Default
}

// Execute the main function
const result = await fetchEnergyData();

// Encode the result for the smart contract
// Pack: timestamp(64) | kWh(64) | lat(32) | lon(32) | quality(8) | nodeId(8)
const encoded = (BigInt(result.timestamp) << 192n) |
                (BigInt(result.kWh) << 128n) |
                (BigInt(result.latitude) << 96n) |
                (BigInt(result.longitude) << 64n) |
                (BigInt(result.dataQuality) << 56n) |
                BigInt(result.nodeId);

// Return the encoded result
return Functions.encodeUint256(encoded);