#!/usr/bin/env python3
"""
Open Grid Energy Data Generator

This script generates realistic synthetic energy data for testing and development.
It uses open datasets as base patterns and applies realistic variations to create
comprehensive datasets for the Open Grid multi-chain energy monitoring system.

Features:
- Pattern-based generation (residential, commercial, industrial, datacenter)
- Geographic clustering based on real metropolitan areas
- Seasonal and time-of-day variations
- Anomaly injection for testing edge cases
- CSV export compatible with UtilityAPI format
- Real-time API mock server for development

Usage:
    python mock_data.py --generate --pattern residential --nodes 100 --days 30
    python mock_data.py --server --port 3001
    python mock_data.py --kaggle-merge --input smart_meter_data.csv
"""

import argparse
import json
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import math
import csv
import os
import sys
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from flask import Flask, jsonify, request
import threading
import time
import requests
from faker import Faker

fake = Faker()

@dataclass
class EnergyNode:
    """Represents an energy monitoring node with location and characteristics"""
    node_id: str
    location: str
    latitude: float
    longitude: float
    pattern_type: str
    active: bool
    registered_at: int
    multiplier: float = 1.0
    density: str = "medium"

@dataclass
class EnergyDataPoint:
    """Individual energy measurement data point"""
    data_id: str
    node_id: str
    kwh: float
    location: str
    timestamp: int
    hour: int
    day_of_week: int
    month: int
    pattern_type: str
    anomaly: bool = False

@dataclass
class UsagePattern:
    """Energy usage pattern definition"""
    baseline_kwh: float
    peak_kwh: float
    peak_hours: List[int]
    weekday_multiplier: float
    weekend_multiplier: float
    seasonal_variation: float
    noise_level: float = 0.1

class EnergyDataGenerator:
    """Main class for generating synthetic energy data"""
    
    def __init__(self):
        self.patterns = self._initialize_patterns()
        self.metropolitan_areas = self._initialize_locations()
        self.node_counter = 0
        self.data_counter = 0
        
    def _initialize_patterns(self) -> Dict[str, UsagePattern]:
        """Initialize realistic energy usage patterns"""
        return {
            'residential': UsagePattern(
                baseline_kwh=0.5,
                peak_kwh=3.5,
                peak_hours=[18, 19, 20, 21],  # 6-9 PM
                weekday_multiplier=1.0,
                weekend_multiplier=1.2,
                seasonal_variation=0.3,
                noise_level=0.15
            ),
            'commercial': UsagePattern(
                baseline_kwh=2.0,
                peak_kwh=15.0,
                peak_hours=[9, 10, 11, 14, 15, 16],  # Business hours
                weekday_multiplier=1.0,
                weekend_multiplier=0.3,
                seasonal_variation=0.4,
                noise_level=0.12
            ),
            'industrial': UsagePattern(
                baseline_kwh=25.0,
                peak_kwh=45.0,
                peak_hours=[8, 9, 10, 13, 14, 15],  # Shift changes
                weekday_multiplier=1.0,
                weekend_multiplier=0.8,
                seasonal_variation=0.2,
                noise_level=0.08
            ),
            'datacenter': UsagePattern(
                baseline_kwh=50.0,
                peak_kwh=65.0,
                peak_hours=[14, 15, 16],  # Slight afternoon peak
                weekday_multiplier=1.0,
                weekend_multiplier=0.98,
                seasonal_variation=0.1,
                noise_level=0.05
            ),
            'mixed': UsagePattern(
                baseline_kwh=5.0,
                peak_kwh=20.0,
                peak_hours=[9, 10, 11, 18, 19, 20],  # Mixed residential/commercial
                weekday_multiplier=1.0,
                weekend_multiplier=0.7,
                seasonal_variation=0.25,
                noise_level=0.2
            )
        }
    
    def _initialize_locations(self) -> Dict[str, Dict]:
        """Initialize realistic metropolitan area coordinates"""
        return {
            'urban': [
                {
                    'name': 'New York',
                    'center': {'lat': 40.7128, 'lon': -74.0060},
                    'bounds': {'lat': [40.4774, 40.9176], 'lon': [-74.2591, -73.7004]},
                    'population_density': 'very_high'
                },
                {
                    'name': 'Los Angeles',
                    'center': {'lat': 34.0522, 'lon': -118.2437},
                    'bounds': {'lat': [33.7037, 34.3373], 'lon': [-118.6681, -118.1553]},
                    'population_density': 'high'
                },
                {
                    'name': 'Chicago',
                    'center': {'lat': 41.8781, 'lon': -87.6298},
                    'bounds': {'lat': [41.6444, 42.0230], 'lon': [-87.9401, -87.5240]},
                    'population_density': 'high'
                },
                {
                    'name': 'Houston',
                    'center': {'lat': 29.7604, 'lon': -95.3698},
                    'bounds': {'lat': [29.5200, 30.1100], 'lon': [-95.8230, -95.0140]},
                    'population_density': 'medium'
                },
                {
                    'name': 'Phoenix',
                    'center': {'lat': 33.4484, 'lon': -112.0740},
                    'bounds': {'lat': [33.2000, 33.7000], 'lon': [-112.3500, -111.8000]},
                    'population_density': 'medium'
                }
            ],
            'suburban': [
                {
                    'name': 'San Jose',
                    'center': {'lat': 37.3382, 'lon': -121.8863},
                    'bounds': {'lat': [37.1000, 37.5000], 'lon': [-122.1000, -121.6000]},
                    'population_density': 'medium'
                },
                {
                    'name': 'Austin',
                    'center': {'lat': 30.2672, 'lon': -97.7431},
                    'bounds': {'lat': [30.0000, 30.5000], 'lon': [-98.0000, -97.5000]},
                    'population_density': 'medium'
                }
            ],
            'rural': [
                {
                    'name': 'Montana Rural',
                    'center': {'lat': 47.0527, 'lon': -109.6333},
                    'bounds': {'lat': [45.0000, 49.0000], 'lon': [-116.0000, -104.0000]},
                    'population_density': 'low'
                },
                {
                    'name': 'Kansas Rural',
                    'center': {'lat': 38.5266, 'lon': -96.7265},
                    'bounds': {'lat': [37.0000, 40.0000], 'lon': [-102.0000, -94.5000]},
                    'population_density': 'low'
                }
            ]
        }
    
    def generate_nodes(self, count: int, location_pattern: str = 'urban', 
                      pattern_distribution: Optional[Dict[str, float]] = None) -> List[EnergyNode]:
        """Generate realistic energy monitoring nodes"""
        
        if pattern_distribution is None:
            pattern_distribution = {
                'residential': 0.60,
                'commercial': 0.25, 
                'industrial': 0.10,
                'datacenter': 0.05
            }
        
        nodes = []
        areas = self.metropolitan_areas.get(location_pattern, self.metropolitan_areas['urban'])
        
        for i in range(count):
            # Select pattern type based on distribution
            pattern_type = np.random.choice(
                list(pattern_distribution.keys()),
                p=list(pattern_distribution.values())
            )
            
            # Select geographic area
            area = random.choice(areas)
            
            # Generate coordinates within area bounds
            lat = np.random.uniform(area['bounds']['lat'][0], area['bounds']['lat'][1])
            lon = np.random.uniform(area['bounds']['lon'][0], area['bounds']['lon'][1])
            
            # Add clustering effect for realistic distribution
            if pattern_type == 'commercial':
                # Commercial areas cluster near city centers
                center_lat = area['center']['lat']
                center_lon = area['center']['lon']
                lat = lat * 0.7 + center_lat * 0.3
                lon = lon * 0.7 + center_lon * 0.3
            
            # Generate node
            node = EnergyNode(
                node_id=f"node_{self.node_counter:06d}",
                location=f"lat:{lat:.4f},lon:{lon:.4f}",
                latitude=lat,
                longitude=lon,
                pattern_type=pattern_type,
                active=random.random() > 0.05,  # 5% chance of inactive
                registered_at=int(time.time()) - random.randint(0, 86400 * 30),  # Within last 30 days
                multiplier=np.random.uniform(0.8, 1.3),  # Individual variation
                density=area['population_density']
            )
            
            nodes.append(node)
            self.node_counter += 1
            
        return nodes
    
    def generate_time_series(self, nodes: List[EnergyNode], start_date: datetime, 
                           duration_hours: int, anomaly_probability: float = 0.02) -> List[EnergyDataPoint]:
        """Generate time series energy data for nodes"""
        
        data_points = []
        
        for node in nodes:
            if not node.active:
                continue
                
            pattern = self.patterns[node.pattern_type]
            node_data = self._generate_node_time_series(
                node, pattern, start_date, duration_hours, anomaly_probability
            )
            data_points.extend(node_data)
        
        return data_points
    
    def _generate_node_time_series(self, node: EnergyNode, pattern: UsagePattern,
                                 start_date: datetime, duration_hours: int,
                                 anomaly_probability: float) -> List[EnergyDataPoint]:
        """Generate time series for a single node"""
        
        data_points = []
        
        for hour in range(duration_hours):
            current_time = start_date + timedelta(hours=hour)
            hour_of_day = current_time.hour
            day_of_week = current_time.weekday()
            month = current_time.month
            is_weekend = day_of_week >= 5
            
            # Base calculation
            if hour_of_day in pattern.peak_hours:
                kwh = pattern.peak_kwh
            else:
                kwh = pattern.baseline_kwh
            
            # Weekend adjustment
            if is_weekend:
                kwh *= pattern.weekend_multiplier
            
            # Seasonal variation (summer peak for cooling, winter for heating)
            seasonal_factor = 1 + pattern.seasonal_variation * math.sin((month - 2) * math.pi / 6)
            kwh *= seasonal_factor
            
            # Node-specific multiplier
            kwh *= node.multiplier
            
            # Add realistic noise
            noise = np.random.normal(0, pattern.noise_level)
            kwh *= (1 + noise)
            
            # Anomaly injection
            is_anomaly = random.random() < anomaly_probability
            if is_anomaly:
                anomaly_factor = random.choice([
                    np.random.uniform(0.1, 0.3),  # Low usage anomaly
                    np.random.uniform(2.0, 5.0)   # High usage anomaly
                ])
                kwh *= anomaly_factor
            
            # Ensure positive values
            kwh = max(0.1, kwh)
            
            # Create data point
            data_point = EnergyDataPoint(
                data_id=f"data_{self.data_counter:08d}",
                node_id=node.node_id,
                kwh=round(kwh, 3),
                location=node.location,
                timestamp=int(current_time.timestamp()),
                hour=hour_of_day,
                day_of_week=day_of_week,
                month=month,
                pattern_type=node.pattern_type,
                anomaly=is_anomaly
            )
            
            data_points.append(data_point)
            self.data_counter += 1
        
        return data_points
    
    def merge_with_kaggle_data(self, kaggle_csv_path: str, sample_size: int = 1000) -> List[EnergyDataPoint]:
        """Merge real Kaggle smart meter data with synthetic patterns"""
        
        try:
            # Read Kaggle dataset
            df = pd.read_csv(kaggle_csv_path)
            
            # Common column name mappings for smart meter datasets
            column_mappings = {
                'energy': ['energy', 'kwh', 'consumption', 'usage', 'power'],
                'timestamp': ['timestamp', 'datetime', 'date_time', 'time', 'date'],
                'meter_id': ['meter_id', 'id', 'meter', 'device_id', 'user_id']
            }
            
            # Auto-detect columns
            detected_columns = {}
            for target, candidates in column_mappings.items():
                for col in df.columns:
                    if any(candidate.lower() in col.lower() for candidate in candidates):
                        detected_columns[target] = col
                        break
            
            print(f"Detected columns: {detected_columns}")
            
            # Sample the dataset
            sample_df = df.sample(n=min(sample_size, len(df)))
            
            data_points = []
            
            for idx, row in sample_df.iterrows():
                # Extract values with fallbacks
                kwh = self._safe_extract_numeric(row, detected_columns.get('energy', df.columns[0]))
                timestamp = self._safe_extract_timestamp(row, detected_columns.get('timestamp', df.columns[1]))
                meter_id = self._safe_extract_string(row, detected_columns.get('meter_id', 'synthetic'))
                
                if kwh is None or timestamp is None:
                    continue
                
                # Generate realistic location
                location_data = self._generate_realistic_location()
                
                # Add synthetic variations
                kwh_varied = kwh * np.random.uniform(0.8, 1.2)
                
                # Determine pattern type based on usage level
                if kwh_varied < 5:
                    pattern_type = 'residential'
                elif kwh_varied < 20:
                    pattern_type = 'commercial'
                elif kwh_varied < 50:
                    pattern_type = 'industrial'
                else:
                    pattern_type = 'datacenter'
                
                dt = datetime.fromtimestamp(timestamp)
                
                data_point = EnergyDataPoint(
                    data_id=f"kaggle_{self.data_counter:08d}",
                    node_id=f"kaggle_{meter_id}",
                    kwh=round(kwh_varied, 3),
                    location=location_data['location'],
                    timestamp=timestamp,
                    hour=dt.hour,
                    day_of_week=dt.weekday(),
                    month=dt.month,
                    pattern_type=pattern_type,
                    anomaly=False
                )
                
                data_points.append(data_point)
                self.data_counter += 1
            
            print(f"Successfully merged {len(data_points)} data points from Kaggle dataset")
            return data_points
            
        except Exception as e:
            print(f"Error merging Kaggle data: {e}")
            return []
    
    def _safe_extract_numeric(self, row: pd.Series, column: str) -> Optional[float]:
        """Safely extract numeric value from DataFrame row"""
        try:
            if column in row:
                value = row[column]
                if pd.isna(value):
                    return None
                return float(value)
        except (ValueError, TypeError):
            pass
        return None
    
    def _safe_extract_timestamp(self, row: pd.Series, column: str) -> Optional[int]:
        """Safely extract timestamp from DataFrame row"""
        try:
            if column in row:
                value = row[column]
                if pd.isna(value):
                    return None
                
                # Try different timestamp formats
                if isinstance(value, (int, float)):
                    # Unix timestamp
                    if value > 1e9:  # Reasonable timestamp range
                        return int(value)
                    else:
                        return int(value * 1000)  # Convert to milliseconds
                
                # String timestamp
                dt = pd.to_datetime(value)
                return int(dt.timestamp())
        except (ValueError, TypeError):
            pass
        
        # Fallback to current time with random offset
        return int(time.time()) - random.randint(0, 86400 * 365)
    
    def _safe_extract_string(self, row: pd.Series, column: str) -> str:
        """Safely extract string value from DataFrame row"""
        try:
            if column in row:
                value = row[column]
                if not pd.isna(value):
                    return str(value)
        except (ValueError, TypeError):
            pass
        return fake.uuid4()
    
    def _generate_realistic_location(self) -> Dict[str, Any]:
        """Generate a realistic location"""
        area = random.choice(self.metropolitan_areas['urban'])
        lat = np.random.uniform(area['bounds']['lat'][0], area['bounds']['lat'][1])
        lon = np.random.uniform(area['bounds']['lon'][0], area['bounds']['lon'][1])
        return {
            'location': f"lat:{lat:.4f},lon:{lon:.4f}",
            'latitude': lat,
            'longitude': lon
        }
    
    def export_to_csv(self, data_points: List[EnergyDataPoint], filename: str):
        """Export data points to CSV format compatible with UtilityAPI"""
        
        with open(filename, 'w', newline='') as csvfile:
            fieldnames = [
                'data_id', 'node_id', 'kwh', 'location', 'timestamp', 
                'hour', 'day_of_week', 'month', 'pattern_type', 'anomaly'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for point in data_points:
                writer.writerow(asdict(point))
        
        print(f"Exported {len(data_points)} data points to {filename}")
    
    def export_utility_api_format(self, data_points: List[EnergyDataPoint], filename: str):
        """Export in UtilityAPI-compatible format"""
        
        utility_data = []
        for point in data_points:
            dt = datetime.fromtimestamp(point.timestamp)
            utility_data.append({
                'meter': point.node_id,
                'start': dt.isoformat(),
                'end': (dt + timedelta(hours=1)).isoformat(),
                'kWh': point.kwh,
                'kW': point.kwh,  # Assuming 1-hour intervals
                'lat': point.latitude if hasattr(point, 'latitude') else 0,
                'lon': point.longitude if hasattr(point, 'longitude') else 0
            })
        
        with open(filename, 'w', newline='') as csvfile:
            fieldnames = ['meter', 'start', 'end', 'kWh', 'kW', 'lat', 'lon']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for record in utility_data:
                writer.writerow(record)
        
        print(f"Exported {len(utility_data)} records in UtilityAPI format to {filename}")

class MockAPIServer:
    """Mock API server for development and testing"""
    
    def __init__(self, port: int = 3001):
        self.port = port
        self.app = Flask(__name__)
        self.data_generator = EnergyDataGenerator()
        self.cached_data = {}
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup Flask routes for mock API"""
        
        @self.app.route('/api/v2/intervals', methods=['GET'])
        def get_intervals():
            """Mock UtilityAPI intervals endpoint"""
            
            meter_id = request.args.get('meters', 'default_meter')
            limit = int(request.args.get('limit', 1))
            order = request.args.get('order', 'desc')
            
            # Generate or retrieve cached data
            if meter_id not in self.cached_data:
                self._generate_mock_data(meter_id)
            
            data = self.cached_data[meter_id]
            
            if order == 'desc':
                data = sorted(data, key=lambda x: x['start'], reverse=True)
            else:
                data = sorted(data, key=lambda x: x['start'])
            
            return jsonify({
                'intervals': data[:limit],
                'next': None,
                'previous': None
            })
        
        @self.app.route('/api/nodes/<int:node_id>/latest', methods=['GET'])
        def get_latest_data(node_id):
            """Get latest data for a specific node"""
            
            meter_id = f"node_{node_id:06d}"
            if meter_id not in self.cached_data:
                self._generate_mock_data(meter_id)
            
            latest = self.cached_data[meter_id][0]
            
            return jsonify({
                'nodeId': node_id,
                'kWh': latest['kWh'],
                'timestamp': latest['start'],
                'location': latest.get('location', 'lat:40.7128,lon:-74.0060'),
                'active': True
            })
        
        @self.app.route('/api/bulk-data', methods=['POST'])
        def generate_bulk_data():
            """Generate bulk synthetic data"""
            
            request_data = request.get_json()
            pattern_type = request_data.get('pattern', 'residential')
            node_count = request_data.get('nodes', 10)
            duration_hours = request_data.get('hours', 24)
            
            # Generate nodes and data
            nodes = self.data_generator.generate_nodes(node_count, 'urban')
            start_date = datetime.now() - timedelta(hours=duration_hours)
            data_points = self.data_generator.generate_time_series(
                nodes, start_date, duration_hours
            )
            
            # Convert to API format
            api_data = []
            for point in data_points:
                api_data.append({
                    'dataId': point.data_id,
                    'nodeId': point.node_id,
                    'kWh': point.kwh,
                    'location': point.location,
                    'timestamp': point.timestamp,
                    'patternType': point.pattern_type
                })
            
            return jsonify({
                'data': api_data,
                'metadata': {
                    'totalPoints': len(api_data),
                    'nodes': len(nodes),
                    'durationHours': duration_hours,
                    'generatedAt': datetime.now().isoformat()
                }
            })
        
        @self.app.route('/health', methods=['GET'])
        def health_check():
            """Health check endpoint"""
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'version': '1.0.0'
            })
    
    def _generate_mock_data(self, meter_id: str, hours: int = 168):  # 1 week
        """Generate mock data for a meter"""
        
        pattern_type = random.choice(['residential', 'commercial', 'industrial'])
        nodes = self.data_generator.generate_nodes(1, 'urban', {pattern_type: 1.0})
        nodes[0].node_id = meter_id
        
        start_date = datetime.now() - timedelta(hours=hours)
        data_points = self.data_generator.generate_time_series(
            nodes, start_date, hours, anomaly_probability=0.01
        )
        
        # Convert to UtilityAPI format
        api_data = []
        for point in data_points:
            dt = datetime.fromtimestamp(point.timestamp)
            api_data.append({
                'start': dt.isoformat(),
                'end': (dt + timedelta(hours=1)).isoformat(),
                'kWh': point.kwh,
                'kW': point.kwh,
                'location': point.location
            })
        
        self.cached_data[meter_id] = api_data
    
    def run(self, debug: bool = False):
        """Run the mock API server"""
        print(f"🚀 Starting Mock API Server on port {self.port}")
        print(f"📊 Endpoints available:")
        print(f"   GET  /api/v2/intervals?meters=<id>&limit=<n>")
        print(f"   GET  /api/nodes/<id>/latest")
        print(f"   POST /api/bulk-data")
        print(f"   GET  /health")
        
        self.app.run(host='0.0.0.0', port=self.port, debug=debug, threaded=True)

def main():
    """Main CLI interface"""
    
    parser = argparse.ArgumentParser(description='Open Grid Energy Data Generator')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Generate command
    gen_parser = subparsers.add_parser('generate', help='Generate synthetic data')
    gen_parser.add_argument('--pattern', choices=['residential', 'commercial', 'industrial', 'datacenter', 'mixed'], 
                           default='residential', help='Energy usage pattern')
    gen_parser.add_argument('--nodes', type=int, default=100, help='Number of nodes to generate')
    gen_parser.add_argument('--days', type=int, default=7, help='Duration in days')
    gen_parser.add_argument('--location', choices=['urban', 'suburban', 'rural'], default='urban', 
                           help='Location pattern')
    gen_parser.add_argument('--output', default='energy_data.csv', help='Output CSV file')
    gen_parser.add_argument('--format', choices=['standard', 'utility-api'], default='standard', 
                           help='Output format')
    gen_parser.add_argument('--anomalies', type=float, default=0.02, help='Anomaly probability')
    
    # Server command
    server_parser = subparsers.add_parser('server', help='Run mock API server')
    server_parser.add_argument('--port', type=int, default=3001, help='Server port')
    server_parser.add_argument('--debug', action='store_true', help='Debug mode')
    
    # Kaggle merge command
    kaggle_parser = subparsers.add_parser('kaggle-merge', help='Merge with Kaggle dataset')
    kaggle_parser.add_argument('--input', required=True, help='Input Kaggle CSV file')
    kaggle_parser.add_argument('--output', default='merged_data.csv', help='Output CSV file')
    kaggle_parser.add_argument('--sample', type=int, default=1000, help='Sample size from Kaggle data')
    
    # Batch command
    batch_parser = subparsers.add_parser('batch', help='Generate multiple datasets')
    batch_parser.add_argument('--config', required=True, help='JSON configuration file')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    generator = EnergyDataGenerator()
    
    if args.command == 'generate':
        print(f"🔄 Generating {args.nodes} {args.pattern} nodes for {args.days} days...")
        
        # Generate nodes
        nodes = generator.generate_nodes(
            args.nodes, 
            args.location, 
            {args.pattern: 1.0}
        )
        
        # Generate time series data
        start_date = datetime.now() - timedelta(days=args.days)
        duration_hours = args.days * 24
        
        data_points = generator.generate_time_series(
            nodes, start_date, duration_hours, args.anomalies
        )
        
        # Export data
        if args.format == 'utility-api':
            generator.export_utility_api_format(data_points, args.output)
        else:
            generator.export_to_csv(data_points, args.output)
        
        print(f"✅ Generated {len(data_points)} data points")
        
        # Print statistics
        total_kwh = sum(point.kwh for point in data_points)
        avg_kwh = total_kwh / len(data_points)
        anomaly_count = sum(1 for point in data_points if point.anomaly)
        
        print(f"📊 Statistics:")
        print(f"   Total kWh: {total_kwh:,.1f}")
        print(f"   Average kWh: {avg_kwh:.2f}")
        print(f"   Anomalies: {anomaly_count} ({anomaly_count/len(data_points)*100:.1f}%)")
    
    elif args.command == 'server':
        server = MockAPIServer(args.port)
        server.run(args.debug)
    
    elif args.command == 'kaggle-merge':
        print(f"🔄 Merging Kaggle dataset: {args.input}")
        
        data_points = generator.merge_with_kaggle_data(args.input, args.sample)
        
        if data_points:
            generator.export_to_csv(data_points, args.output)
            print(f"✅ Merged and exported {len(data_points)} data points")
        else:
            print("❌ Failed to merge Kaggle data")
    
    elif args.command == 'batch':
        print(f"🔄 Running batch generation from config: {args.config}")
        
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
            
            for spec in config.get('datasets', []):
                print(f"   Generating {spec['name']}...")
                
                nodes = generator.generate_nodes(
                    spec['nodes'], 
                    spec.get('location', 'urban'),
                    spec.get('pattern_distribution')
                )
                
                start_date = datetime.fromisoformat(spec['start_date'])
                data_points = generator.generate_time_series(
                    nodes, start_date, spec['hours'], 
                    spec.get('anomaly_probability', 0.02)
                )
                
                output_file = spec['output']
                if spec.get('format') == 'utility-api':
                    generator.export_utility_api_format(data_points, output_file)
                else:
                    generator.export_to_csv(data_points, output_file)
                
                print(f"   ✅ {spec['name']}: {len(data_points)} data points")
            
        except Exception as e:
            print(f"❌ Batch generation failed: {e}")

if __name__ == '__main__':
    main()