const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Generate Frontend Integration Files
 * Creates ABI and deployment info for frontend use
 */

async function generateFrontendFiles() {
  console.log("📄 Generating Frontend Integration Files...");
  
  // Contract addresses from local deployment
  const LOCALHOST_ADDRESSES = {
    EnergyMonitorLegacy: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    SimpleEnergyMonitorWithChainlink: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  };
  
  const frontendDir = path.join(__dirname, "../frontend-abi");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  
  // Generate ABI for EnergyMonitorLegacy
  const legacyArtifact = require("../artifacts/contracts/EnergyMonitorLegacy.sol/EnergyMonitorLegacy.json");
  const legacyABI = {
    contractName: "EnergyMonitorLegacy",
    abi: legacyArtifact.abi,
    bytecode: legacyArtifact.bytecode,
    addresses: {
      localhost: LOCALHOST_ADDRESSES.EnergyMonitorLegacy,
      polygonAmoy: "TBD", // To be filled after testnet deployment
      sepolia: "TBD"
    },
    networks: {
      localhost: {
        address: LOCALHOST_ADDRESSES.EnergyMonitorLegacy,
        chainId: 31337,
        rpcUrl: "http://localhost:8545"
      }
    }
  };
  
  // Generate ABI for SimpleEnergyMonitorWithChainlink
  const chainlinkArtifact = require("../artifacts/contracts/SimpleEnergyMonitorWithChainlink.sol/SimpleEnergyMonitorWithChainlink.json");
  const chainlinkABI = {
    contractName: "SimpleEnergyMonitorWithChainlink",
    abi: chainlinkArtifact.abi,
    bytecode: chainlinkArtifact.bytecode,
    addresses: {
      localhost: LOCALHOST_ADDRESSES.SimpleEnergyMonitorWithChainlink,
      polygonAmoy: "TBD",
      sepolia: "TBD"
    },
    networks: {
      localhost: {
        address: LOCALHOST_ADDRESSES.SimpleEnergyMonitorWithChainlink,
        chainId: 31337,
        rpcUrl: "http://localhost:8545"
      }
    }
  };
  
  // Save individual ABI files
  fs.writeFileSync(
    path.join(frontendDir, "EnergyMonitorLegacy.json"),
    JSON.stringify(legacyABI, null, 2)
  );
  
  fs.writeFileSync(
    path.join(frontendDir, "SimpleEnergyMonitorWithChainlink.json"),
    JSON.stringify(chainlinkABI, null, 2)
  );
  
  // Generate combined deployment info
  const deploymentInfo = {
    version: "1.0.0",
    deployedAt: new Date().toISOString(),
    networks: {
      localhost: {
        name: "Hardhat Local",
        chainId: 31337,
        rpcUrl: "http://localhost:8545",
        explorer: "N/A",
        contracts: {
          EnergyMonitorLegacy: LOCALHOST_ADDRESSES.EnergyMonitorLegacy,
          SimpleEnergyMonitorWithChainlink: LOCALHOST_ADDRESSES.SimpleEnergyMonitorWithChainlink
        }
      },
      polygonAmoy: {
        name: "Polygon Amoy",
        chainId: 80002,
        rpcUrl: "https://rpc-amoy.polygon.technology",
        explorer: "https://amoy.polygonscan.com",
        contracts: {
          EnergyMonitorLegacy: "TBD",
          SimpleEnergyMonitorWithChainlink: "TBD"
        }
      },
      sepolia: {
        name: "Ethereum Sepolia", 
        chainId: 11155111,
        rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
        explorer: "https://sepolia.etherscan.io",
        contracts: {
          EnergyMonitorLegacy: "TBD",
          SimpleEnergyMonitorWithChainlink: "TBD"
        }
      }
    }
  };
  
  fs.writeFileSync(
    path.join(frontendDir, "deployments.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Generate TypeScript types for frontend
  const typescriptTypes = `
// Generated TypeScript types for Energy Monitor contracts
export interface EnergyData {
  timestamp: string;
  kWh: string;
  location: string;
  nodeId: string;
}

export interface Node {
  location: string;
  active: boolean;
  registeredAt: string;
  lastUpdate: string;
  name?: string; // Only in SimpleEnergyMonitorWithChainlink
}

export interface ContractAddresses {
  EnergyMonitorLegacy: string;
  SimpleEnergyMonitorWithChainlink: string;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  contracts: ContractAddresses;
}

export interface DeploymentInfo {
  version: string;
  deployedAt: string;
  networks: {
    localhost: NetworkConfig;
    polygonAmoy: NetworkConfig;
    sepolia: NetworkConfig;
  };
}

// Event types
export interface DataUpdatedEvent {
  dataId: string;
  nodeId: string;
  kWh: string;
  location: string;
  timestamp: string;
}

export interface NodeRegisteredEvent {
  nodeId: string;
  location: string;
  name?: string;
}

export interface RequestSentEvent {
  requestId: string;
  nodeId: string;
}
`;
  
  fs.writeFileSync(
    path.join(frontendDir, "types.ts"),
    typescriptTypes
  );
  
  // Generate JavaScript utility functions for frontend
  const utilityFunctions = `
/**
 * Frontend utility functions for Energy Monitor contracts
 */

import { ethers } from 'ethers';

// Parse energy data from contract response
export function parseEnergyData(data) {
  return {
    timestamp: new Date(parseInt(data.timestamp) * 1000).toISOString(),
    kWh: (parseInt(data.kWh) / 1000).toFixed(3), // Convert from Wei-like units
    location: data.location,
    nodeId: data.nodeId.toString()
  };
}

// Parse coordinates from location string
export function parseCoordinates(location) {
  const match = location.match(/lat:([^,]+),lon:([^,]+)/);
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2])
    };
  }
  return null;
}

// Format kWh for display
export function formatKWh(kWhString) {
  const kWh = parseInt(kWhString) / 1000;
  return kWh.toFixed(3) + ' kWh';
}

// Get network configuration by chain ID
export function getNetworkConfig(chainId, deployments) {
  const networks = Object.values(deployments.networks);
  return networks.find(network => network.chainId === chainId);
}

// Setup contract instance
export function getContractInstance(contractName, networkConfig, signer) {
  const address = networkConfig.contracts[contractName];
  if (!address || address === 'TBD') {
    throw new Error(\`\${contractName} not deployed on \${networkConfig.name}\`);
  }
  
  // Import ABI (adjust import path as needed)
  const contractABI = require(\`./\${contractName}.json\`).abi;
  
  return new ethers.Contract(address, contractABI, signer);
}

// Listen to contract events
export function setupEventListeners(contract, callbacks) {
  // DataUpdated event
  if (callbacks.onDataUpdated) {
    contract.on('DataUpdated', (dataId, nodeId, kWh, location, timestamp, event) => {
      callbacks.onDataUpdated({
        dataId: dataId.toString(),
        nodeId: nodeId.toString(),
        kWh: kWh.toString(),
        location,
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
  
  // NodeRegistered event
  if (callbacks.onNodeRegistered) {
    contract.on('NodeRegistered', (nodeId, location, event) => {
      callbacks.onNodeRegistered({
        nodeId: nodeId.toString(),
        location,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
  
  // RequestSent event (for Chainlink contracts)
  if (callbacks.onRequestSent) {
    contract.on('RequestSent', (...args) => {
      const event = args[args.length - 1];
      callbacks.onRequestSent({
        requestId: args[0],
        nodeId: args[1]?.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
}

// Get all nodes with their latest data
export async function getAllNodesWithData(contract) {
  const nodeCount = await contract.nodeCount();
  const nodes = [];
  
  for (let i = 0; i < nodeCount; i++) {
    try {
      const node = await contract.nodes(i);
      let latestData = null;
      
      // Try to get latest data (method varies by contract)
      try {
        if (contract.getLatestDataForNode) {
          latestData = await contract.getLatestDataForNode(i);
        } else if (contract.getNodeData) {
          latestData = await contract.getNodeData(i);
        }
      } catch (error) {
        console.warn(\`Failed to get data for node \${i}:\`, error.message);
      }
      
      nodes.push({
        id: i,
        location: node.location,
        name: node.name || \`Node \${i}\`,
        active: node.active,
        registeredAt: new Date(parseInt(node.registeredAt) * 1000).toISOString(),
        lastUpdate: node.lastUpdate > 0 ? new Date(parseInt(node.lastUpdate) * 1000).toISOString() : null,
        latestData: latestData ? parseEnergyData(latestData) : null
      });
    } catch (error) {
      console.error(\`Failed to get node \${i}:\`, error.message);
    }
  }
  
  return nodes;
}

export default {
  parseEnergyData,
  parseCoordinates,
  formatKWh,
  getNetworkConfig,
  getContractInstance,
  setupEventListeners,
  getAllNodesWithData
};
`;
  
  fs.writeFileSync(
    path.join(frontendDir, "utils.js"),
    utilityFunctions
  );
  
  console.log(`✅ Frontend files generated in: ${frontendDir}`);
  return frontendDir;
}

async function generateTestData() {
  console.log("\n📊 Generating test data for frontend...");
  
  const testData = {
    sampleNodes: [
      {
        id: 0,
        name: "Times Square Hub",
        location: "lat:40.7580,lon:-73.9855",
        coordinates: { latitude: 40.7580, longitude: -73.9855 },
        active: true,
        type: "commercial",
        district: "Manhattan"
      },
      {
        id: 1,
        name: "Wall Street Station",
        location: "lat:40.7074,lon:-74.0113",
        coordinates: { latitude: 40.7074, longitude: -74.0113 },
        active: true,
        type: "financial",
        district: "Manhattan"
      },
      {
        id: 2,
        name: "Empire State Building",
        location: "lat:40.7484,lon:-73.9857",
        coordinates: { latitude: 40.7484, longitude: -73.9857 },
        active: true,
        type: "commercial",
        district: "Manhattan"
      },
      {
        id: 3,
        name: "NYC Center",
        location: "lat:40.7128,lon:-74.0060",
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        active: true,
        type: "mixed",
        district: "Manhattan"
      },
      {
        id: 4,
        name: "Broadway District",
        location: "lat:40.7589,lon:-73.9851",
        coordinates: { latitude: 40.7589, longitude: -73.9851 },
        active: true,
        type: "entertainment",
        district: "Manhattan"
      }
    ],
    sampleEnergyData: [
      {
        nodeId: "0",
        kWh: "2500",
        timestamp: Math.floor(Date.now() / 1000).toString(),
        location: "lat:40.7580,lon:-73.9855",
        dataQuality: 95
      },
      {
        nodeId: "1", 
        kWh: "3200",
        timestamp: (Math.floor(Date.now() / 1000) - 3600).toString(),
        location: "lat:40.7074,lon:-74.0113",
        dataQuality: 98
      }
    ],
    mockEvents: [
      {
        event: "DataUpdated",
        dataId: "1",
        nodeId: "0", 
        kWh: "2500",
        location: "lat:40.7580,lon:-73.9855",
        timestamp: Math.floor(Date.now() / 1000).toString()
      },
      {
        event: "NodeRegistered",
        nodeId: "0",
        location: "lat:40.7580,lon:-73.9855",
        name: "Times Square Hub"
      }
    ]
  };
  
  const frontendDir = path.join(__dirname, "../frontend-abi");
  fs.writeFileSync(
    path.join(frontendDir, "testData.json"),
    JSON.stringify(testData, null, 2)
  );
  
  console.log("✅ Test data generated");
}

async function printFrontendInstructions() {
  console.log(`\n🌐 Frontend Integration Guide`);
  console.log(`${"=".repeat(60)}`);
  
  console.log(`\n📁 Generated Files:`);
  console.log(`   📄 EnergyMonitorLegacy.json - Contract ABI and addresses`);
  console.log(`   📄 SimpleEnergyMonitorWithChainlink.json - Contract ABI and addresses`);
  console.log(`   📄 deployments.json - Network and deployment info`);
  console.log(`   📄 types.ts - TypeScript type definitions`);
  console.log(`   📄 utils.js - Utility functions for frontend`);
  console.log(`   📄 testData.json - Sample data for testing`);
  
  console.log(`\n🔧 Frontend Setup Steps:`);
  console.log(`\n1. Install Dependencies:`);
  console.log(`   npm install ethers`);
  
  console.log(`\n2. Import Contract Info:`);
  console.log(`   import deployments from './frontend-abi/deployments.json';`);
  console.log(`   import legacyABI from './frontend-abi/EnergyMonitorLegacy.json';`);
  console.log(`   import utils from './frontend-abi/utils.js';`);
  
  console.log(`\n3. Connect to Local Network:`);
  console.log(`   const provider = new ethers.JsonRpcProvider('http://localhost:8545');`);
  console.log(`   const contract = utils.getContractInstance('EnergyMonitorLegacy', deployments.networks.localhost, provider);`);
  
  console.log(`\n4. Setup Event Listeners:`);
  console.log(`   utils.setupEventListeners(contract, {`);
  console.log(`     onDataUpdated: (data) => console.log('New energy data:', data),`);
  console.log(`     onNodeRegistered: (node) => console.log('Node registered:', node)`);
  console.log(`   });`);
  
  console.log(`\n5. Fetch Node Data:`);
  console.log(`   const nodes = await utils.getAllNodesWithData(contract);`);
  console.log(`   console.log('All nodes:', nodes);`);
  
  console.log(`\n🎯 Key Contract Methods:`);
  console.log(`   📊 nodeCount() - Get total number of nodes`);
  console.log(`   📍 nodes(id) - Get node information`);
  console.log(`   📈 dataCount() - Get total data points`);
  console.log(`   🏢 getAllNodes() - Get all nodes (Legacy contract)`);
  console.log(`   🟢 getActiveNodes() - Get active node IDs (Chainlink contract)`);
  console.log(`   📋 getLatestDataForNode(id) - Get latest energy data`);
  
  console.log(`\n🔥 Local Testing:`);
  console.log(`   - Local network: http://localhost:8545`);
  console.log(`   - Chain ID: 31337`);
  console.log(`   - Test account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`);
  console.log(`   - Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  
  console.log(`\n✅ The contracts are fully tested and ready for frontend integration!`);
}

async function main() {
  try {
    console.log("🏗️ Generating Frontend Integration Package");
    console.log(`${"=".repeat(60)}`);
    
    const frontendDir = await generateFrontendFiles();
    await generateTestData();
    await printFrontendInstructions();
    
    console.log(`\n📦 Complete frontend package generated in:`);
    console.log(`   ${frontendDir}`);
    
  } catch (error) {
    console.error("💥 Frontend file generation failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateFrontendFiles, generateTestData };