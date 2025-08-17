# Energy Monitor Frontend Integration

This package contains all the necessary files to integrate with the Energy Monitor smart contracts.

## 📁 Files Overview

- `EnergyMonitorLegacy.json` - ABI and deployment info for the legacy contract (recommended for frontend)
- `SimpleEnergyMonitorWithChainlink.json` - ABI and deployment info for the Chainlink Functions contract
- `deployments.json` - Network configurations and contract addresses
- `types.ts` - TypeScript type definitions
- `utils.js` - Utility functions for contract interaction
- `testData.json` - Sample data and test results

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install ethers
```

### 2. Import Contract Data

```javascript
import deployments from './frontend-abi/deployments.json';
import legacyContract from './frontend-abi/EnergyMonitorLegacy.json';
import { ethers } from 'ethers';
```

### 3. Connect to Contract

```javascript
// Connect to local network
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

// Get contract instance
const contract = new ethers.Contract(
  deployments.networks.localhost.contracts.EnergyMonitorLegacy,
  legacyContract.abi,
  provider
);
```

### 4. Read Node Data

```javascript
// Get all nodes
const nodeCount = await contract.nodeCount();
console.log(`Total nodes: ${nodeCount}`);

// Get specific node
const node = await contract.nodes(0);
console.log(`Node 0: ${node.location}`);

// Get all nodes at once
const allNodes = await contract.getAllNodes();
console.log(`All nodes:`, allNodes);
```

### 5. Listen to Events

```javascript
// Listen for new energy data
contract.on('DataUpdated', (dataId, nodeId, kWh, location, timestamp) => {
  console.log(`New energy data for node ${nodeId}: ${kWh/1000} kWh`);
});

// Listen for new nodes
contract.on('NodeRegistered', (nodeId, location) => {
  console.log(`New node registered: ${nodeId} at ${location}`);
});
```

## 🔧 Network Configuration

### Local Development
- **RPC URL**: http://localhost:8545
- **Chain ID**: 31337
- **Contract**: 0x5FbDB2315678afecb367f032d93F642f64180aa3

### Testnet Deployment
Update `deployments.json` with actual testnet addresses after deployment.

## 📊 Test Results

The contracts have been successfully tested locally:

✅ **EnergyMonitorLegacy**: Fully functional
- 5 nodes registered
- Data updates working
- Events emitting correctly
- All view functions operational

⚠️ **SimpleEnergyMonitorWithChainlink**: Partially functional
- 5 nodes registered
- Local Chainlink simulation has limitations
- Ready for testnet deployment

## 🎯 Recommended Usage

Use **EnergyMonitorLegacy** for frontend development and testing. It provides:
- Full local functionality
- Mock Chainlink Functions simulation
- Complete event emission
- Stable ABI interface

Switch to **SimpleEnergyMonitorWithChainlink** for testnet/mainnet deployments with real Chainlink Functions.

## 🔍 Event Data Formats

### DataUpdated Event
```javascript
{
  dataId: "1",
  nodeId: "0", 
  kWh: "3000",        // Raw value (divide by 1000 for actual kWh)
  location: "lat:40.7580,lon:74.60",
  timestamp: "1755389348"
}
```

### NodeRegistered Event
```javascript
{
  nodeId: "0",
  location: "lat:40.7580,lon:-73.9855"
}
```

## 🏗️ Next Steps

1. **Local Testing**: Use the local network for development
2. **Testnet Integration**: Deploy to Polygon Amoy or Sepolia
3. **Event Monitoring**: Set up real-time event listeners
4. **Data Visualization**: Build dashboards using the node and energy data
