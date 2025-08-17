export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const INITIAL_VIEW_STATE = {
  longitude: -74.0060, // NYC longitude
  latitude: 40.7128,   // NYC latitude
  zoom: 10,            // Closer zoom for city view
  pitch: 45,
  bearing: 0,
  maxZoom: 16,
  minZoom: 2,
};

export const MAP_STYLES = {
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  TERRAIN: 'mapbox://styles/mapbox/outdoors-v12',
} as const;

export const DEFAULT_MAP_STYLE = MAP_STYLES.SATELLITE;

export const ENERGY_THRESHOLDS = {
  HIGH_USAGE: 5000, // kWh
  MEDIUM_USAGE: 2000, // kWh
  LOW_USAGE: 500, // kWh
  CRITICAL_USAGE: 10000, // kWh
} as const;

export const COLORS = {
  ENERGY: {
    HIGH: [239, 68, 68, 200], // Red
    MEDIUM: [245, 158, 11, 200], // Amber
    LOW: [34, 197, 94, 200], // Green
    CRITICAL: [147, 51, 234, 200], // Purple
    INACTIVE: [156, 163, 175, 120], // Gray
  },
  HEATMAP: [
    [0, 255, 136, 25],
    [0, 255, 136, 85],
    [255, 255, 0, 85],
    [255, 136, 0, 85],
    [255, 68, 0, 85],
    [255, 0, 0, 85],
  ],
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const API_ENDPOINTS = {
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
} as const;

export const REFRESH_INTERVALS = {
  ENERGY_DATA: 30000, // 30 seconds
  ALERTS: 60000, // 1 minute
  STATUS: 300000, // 5 minutes
} as const;