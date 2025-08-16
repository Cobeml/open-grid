const { ethers } = require("ethers");
const { config } = require("dotenv");
const nycData = require("./nyc-nodes-data.js");

config();

/**
 * Enhanced NYC Grid Deployment Script
 * Deploys 35 NYC nodes with intelligent edge connectivity to Polygon Amoy
 */

const DEPLOYMENT_CONFIG = {
  network: "Polygon Amoy",
  rpcUrl: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
  contractAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_CONTRACT_ADDRESS || "0x4E804FF9F6469232e164BE608fDCCb4e1C0f6191",
  gasLimit: 300000,
  gasPrice: "30000000000", // 30 gwei
  batchSize: 5, // Reduced batch size for gas optimization
  maxRetries: 3,
  retryDelay: 5000
};

// Enhanced ABI with new functions
const ENHANCED_ABI = [
  // Read functions
  "function nodeCount() external view returns (uint256)",
  "function edgeCount() external view returns (uint256)",
  "function nodes(uint256) external view returns (string memory location, bool active, uint256 registeredAt, uint256 lastUpdate, string memory name, string memory district, uint8 nodeType, uint8 priority)",
  "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate, string name, string district, uint8 nodeType, uint8 priority)[] memory)",
  "function getAllEdges() external view returns (tuple(uint256 fromNode, uint256 toNode, uint8 edgeType, uint256 capacity, uint256 distance, bool active)[] memory)",
  "function getGridTopology() external view returns (uint256 nodeCount, uint256 edgeCount, uint256 activeNodes, uint256 activeEdges)",
  "function getNodesByDistrict(string calldata district) external view returns (uint256[] memory)",
  "function getCriticalNodes() external view returns (uint256[] memory)",
  
  // Write functions
  "function registerNodesBatch(string[] calldata locations, string[] calldata names, string[] calldata districts, uint8[] calldata nodeTypes, uint8[] calldata priorities) external",
  "function addEdgesBatch(uint256[] calldata fromNodes, uint256[] calldata toNodes, uint8[] calldata edgeTypes, uint256[] calldata capacities, uint256[] calldata distances) external",
  "function requestDataUpdatesBatch(uint256[] calldata nodeIds) external",
  
  // Events
  "event NodeRegistered(uint256 indexed nodeId, string location, string name, string district)",
  "event EdgeAdded(uint256 indexed edgeId, uint256 indexed fromNode, uint256 indexed toNode, uint8 edgeType)"
];

// Enum mappings for the contract
const NODE_TYPE_MAP = {
  'commercial': 0,
  'residential': 1,
  'industrial': 2,
  'infrastructure': 3,
  'financial': 4,
  'mixed': 5,
  'public': 6,
  'transport': 7,
  'entertainment': 8,
  'landmark': 9
};

const EDGE_TYPE_MAP = {
  'primary': 0,
  'secondary': 1,
  'redundant': 2,
  'industrial': 3,
  'infrastructure': 4,
  'utility': 5,
  'inter-borough': 6
};

async function setupProvider() {
  const provider = new ethers.JsonRpcProvider(DEPLOYMENT_CONFIG.rpcUrl);
  
  // Verify connection
  const network = await provider.getNetwork();
  console.log(`🌐 Connected to ${network.name} (Chain ID: ${network.chainId})`);
  
  return provider;
}

async function setupWallet(provider) {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  
  console.log(`👛 Wallet: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Low balance - you may need more MATIC for gas fees");
  }
  
  return wallet;
}

async function setupContract(wallet) {
  const contract = new ethers.Contract(
    DEPLOYMENT_CONFIG.contractAddress,
    ENHANCED_ABI,
    wallet
  );
  
  // Verify contract exists
  try {
    const currentNodeCount = await contract.nodeCount();
    console.log(`📋 Current nodes in contract: ${currentNodeCount}`);
    return contract;
  } catch (error) {
    throw new Error(`Contract not found or not accessible: ${error.message}`);
  }
}

async function deployNodesInBatches(contract, nodes) {
  console.log(`\n🏗️  Deploying ${nodes.length} NYC nodes in batches of ${DEPLOYMENT_CONFIG.batchSize}...`);
  
  const startingNodeCount = await contract.nodeCount();
  let deployedCount = 0;
  
  for (let i = 0; i < nodes.length; i += DEPLOYMENT_CONFIG.batchSize) {
    const batch = nodes.slice(i, i + DEPLOYMENT_CONFIG.batchSize);
    const batchNumber = Math.floor(i / DEPLOYMENT_CONFIG.batchSize) + 1;
    const totalBatches = Math.ceil(nodes.length / DEPLOYMENT_CONFIG.batchSize);
    
    console.log(`\n📦 Batch ${batchNumber}/${totalBatches}: Deploying ${batch.length} nodes...`);
    
    // Prepare batch data
    const locations = batch.map(node => node.location);
    const names = batch.map(node => node.name);
    const districts = batch.map(node => node.district);
    const nodeTypes = batch.map(node => NODE_TYPE_MAP[node.type]);
    const priorities = batch.map(node => node.priority);
    
    // Log batch details
    batch.forEach((node, idx) => {
      console.log(`   ${i + idx}: ${node.name} (${node.district}, ${node.type}, priority:${node.priority})`);
    });
    
    let success = false;
    let retries = 0;
    
    while (!success && retries < DEPLOYMENT_CONFIG.maxRetries) {
      try {
        const tx = await contract.registerNodesBatch(
          locations,
          names,
          districts,
          nodeTypes,
          priorities,
          {
            gasLimit: DEPLOYMENT_CONFIG.gasLimit * batch.length,
            gasPrice: DEPLOYMENT_CONFIG.gasPrice
          }
        );
        
        console.log(`   📤 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`   ✅ Batch ${batchNumber} deployed successfully`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
          
          deployedCount += batch.length;
          success = true;
          
          // Brief delay between batches
          if (i + DEPLOYMENT_CONFIG.batchSize < nodes.length) {
            console.log(`   ⏳ Waiting 3 seconds before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else {
          throw new Error("Transaction failed");
        }
        
      } catch (error) {
        retries++;
        console.error(`   ❌ Batch ${batchNumber} failed (attempt ${retries}): ${error.message}`);
        
        if (retries < DEPLOYMENT_CONFIG.maxRetries) {
          console.log(`   🔄 Retrying in ${DEPLOYMENT_CONFIG.retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, DEPLOYMENT_CONFIG.retryDelay));
        } else {
          console.error(`   💥 Batch ${batchNumber} failed after ${DEPLOYMENT_CONFIG.maxRetries} attempts`);
          throw error;
        }
      }
    }
  }
  
  const finalNodeCount = await contract.nodeCount();
  const actuallyDeployed = finalNodeCount - startingNodeCount;
  
  console.log(`\n✅ Node deployment complete!`);
  console.log(`   📊 Nodes deployed: ${actuallyDeployed}/${nodes.length}`);
  console.log(`   📈 Total nodes in contract: ${finalNodeCount}`);
  
  return actuallyDeployed;
}

async function deployEdgesInBatches(contract, edges) {
  console.log(`\n🔗 Deploying ${edges.length} grid edges in batches of ${DEPLOYMENT_CONFIG.batchSize}...`);
  
  const startingEdgeCount = await contract.edgeCount();
  let deployedCount = 0;
  
  for (let i = 0; i < edges.length; i += DEPLOYMENT_CONFIG.batchSize) {
    const batch = edges.slice(i, i + DEPLOYMENT_CONFIG.batchSize);
    const batchNumber = Math.floor(i / DEPLOYMENT_CONFIG.batchSize) + 1;
    const totalBatches = Math.ceil(edges.length / DEPLOYMENT_CONFIG.batchSize);
    
    console.log(`\n🔌 Batch ${batchNumber}/${totalBatches}: Deploying ${batch.length} edges...`);
    
    // Prepare batch data
    const fromNodes = batch.map(edge => edge.from);
    const toNodes = batch.map(edge => edge.to);
    const edgeTypes = batch.map(edge => EDGE_TYPE_MAP[edge.type]);
    const capacities = batch.map(edge => edge.capacity);
    const distances = batch.map(edge => Math.floor(edge.distance * 1000)); // Convert km to meters
    
    // Log batch details
    batch.forEach((edge, idx) => {
      const nodeFromName = nycData.NYC_NODES[edge.from]?.name || `Node ${edge.from}`;
      const nodeToName = nycData.NYC_NODES[edge.to]?.name || `Node ${edge.to}`;
      console.log(`   ${i + idx}: ${nodeFromName} ↔ ${nodeToName} (${edge.type}, ${edge.capacity}kW, ${edge.distance}km)`);
    });
    
    let success = false;
    let retries = 0;
    
    while (!success && retries < DEPLOYMENT_CONFIG.maxRetries) {
      try {
        const tx = await contract.addEdgesBatch(
          fromNodes,
          toNodes,
          edgeTypes,
          capacities,
          distances,
          {
            gasLimit: DEPLOYMENT_CONFIG.gasLimit * batch.length,
            gasPrice: DEPLOYMENT_CONFIG.gasPrice
          }
        );
        
        console.log(`   📤 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`   ✅ Batch ${batchNumber} deployed successfully`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
          
          deployedCount += batch.length;
          success = true;
          
          // Brief delay between batches
          if (i + DEPLOYMENT_CONFIG.batchSize < edges.length) {
            console.log(`   ⏳ Waiting 3 seconds before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else {
          throw new Error("Transaction failed");
        }
        
      } catch (error) {
        retries++;
        console.error(`   ❌ Batch ${batchNumber} failed (attempt ${retries}): ${error.message}`);
        
        if (retries < DEPLOYMENT_CONFIG.maxRetries) {
          console.log(`   🔄 Retrying in ${DEPLOYMENT_CONFIG.retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, DEPLOYMENT_CONFIG.retryDelay));
        } else {
          console.error(`   💥 Batch ${batchNumber} failed after ${DEPLOYMENT_CONFIG.maxRetries} attempts`);
          throw error;
        }
      }
    }
  }
  
  const finalEdgeCount = await contract.edgeCount();
  const actuallyDeployed = finalEdgeCount - startingEdgeCount;
  
  console.log(`\n✅ Edge deployment complete!`);
  console.log(`   📊 Edges deployed: ${actuallyDeployed}/${edges.length}`);
  console.log(`   📈 Total edges in contract: ${finalEdgeCount}`);
  
  return actuallyDeployed;
}

async function generateInitialData(contract) {
  console.log(`\n⚡ Generating initial energy data for all nodes...`);
  
  const nodeCount = await contract.nodeCount();
  const nodeIds = Array.from({ length: Number(nodeCount) }, (_, i) => i);
  
  // Generate data in batches
  for (let i = 0; i < nodeIds.length; i += DEPLOYMENT_CONFIG.batchSize) {
    const batch = nodeIds.slice(i, i + DEPLOYMENT_CONFIG.batchSize);
    const batchNumber = Math.floor(i / DEPLOYMENT_CONFIG.batchSize) + 1;
    const totalBatches = Math.ceil(nodeIds.length / DEPLOYMENT_CONFIG.batchSize);
    
    console.log(`📊 Generating data batch ${batchNumber}/${totalBatches}...`);
    
    try {
      const tx = await contract.requestDataUpdatesBatch(batch, {
        gasLimit: DEPLOYMENT_CONFIG.gasLimit * batch.length,
        gasPrice: DEPLOYMENT_CONFIG.gasPrice
      });
      
      const receipt = await tx.wait();
      console.log(`   ✅ Data generated for ${batch.length} nodes (Gas: ${receipt.gasUsed})`);
      
      // Brief delay between batches
      if (i + DEPLOYMENT_CONFIG.batchSize < nodeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to generate data for batch ${batchNumber}: ${error.message}`);
    }
  }
}

async function printNetworkSummary(contract) {
  console.log(`\n📋 NYC Grid Network Summary`);
  console.log(`${"=".repeat(50)}`);
  
  try {
    const topology = await contract.getGridTopology();
    const metrics = nycData.calculateGridMetrics();
    
    console.log(`📍 Total Nodes: ${topology.nodeCount} (${topology.activeNodes} active)`);
    console.log(`🔗 Total Edges: ${topology.edgeCount} (${topology.activeEdges} active)`);
    console.log(`🏙️  Coverage: ${Object.keys(metrics.nodesByDistrict).length} districts`);
    console.log(`📊 Avg Connections per Node: ${metrics.avgConnectionsPerNode.toFixed(2)}`);
    
    console.log(`\n🏢 Nodes by District:`);
    for (const [district, count] of Object.entries(metrics.nodesByDistrict)) {
      console.log(`   ${district}: ${count} nodes`);
    }
    
    console.log(`\n🏗️  Nodes by Type:`);
    for (const [type, count] of Object.entries(metrics.nodesByType)) {
      console.log(`   ${type}: ${count} nodes`);
    }
    
    console.log(`\n🔌 Edges by Type:`);
    for (const [type, count] of Object.entries(metrics.edgesByType)) {
      console.log(`   ${type}: ${count} connections`);
    }
    
    // Get critical nodes
    const criticalNodes = await contract.getCriticalNodes();
    console.log(`\n🚨 Critical Infrastructure: ${criticalNodes.length} priority-1 nodes`);
    
  } catch (error) {
    console.error(`❌ Failed to fetch network summary: ${error.message}`);
  }
}

async function main() {
  console.log(`\n🌟 Enhanced NYC Grid Deployment`);
  console.log(`${"=".repeat(60)}`);
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🌐 Network: ${DEPLOYMENT_CONFIG.network}`);
  console.log(`📍 Contract: ${DEPLOYMENT_CONFIG.contractAddress}`);
  console.log(`📊 Deploying: ${nycData.NYC_NODES.length} nodes, ${nycData.EDGE_CONNECTIONS.length} edges`);
  
  try {
    // Setup
    const provider = await setupProvider();
    const wallet = await setupWallet(provider);
    const contract = await setupContract(wallet);
    
    // Check if nodes already exist
    const currentNodeCount = await contract.nodeCount();
    if (currentNodeCount > 0) {
      console.log(`\n⚠️  Contract already has ${currentNodeCount} nodes.`);
      console.log(`This script will add ${nycData.NYC_NODES.length} more nodes.`);
      console.log(`Continue? (Ctrl+C to abort)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Deploy nodes
    const deployedNodes = await deployNodesInBatches(contract, nycData.NYC_NODES);
    
    // Deploy edges (only if we successfully deployed nodes)
    if (deployedNodes > 0) {
      const deployedEdges = await deployEdgesInBatches(contract, nycData.EDGE_CONNECTIONS);
      
      // Generate initial data
      if (deployedEdges > 0) {
        await generateInitialData(contract);
      }
    }
    
    // Print summary
    await printNetworkSummary(contract);
    
    console.log(`\n🎉 Enhanced NYC Grid deployment complete!`);
    console.log(`🌐 View on explorer: https://amoy.polygonscan.com/address/${DEPLOYMENT_CONFIG.contractAddress}`);
    console.log(`📅 Completed: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error(`\n💥 Deployment failed:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  deployNodesInBatches,
  deployEdgesInBatches,
  generateInitialData,
  DEPLOYMENT_CONFIG,
  NODE_TYPE_MAP,
  EDGE_TYPE_MAP
};