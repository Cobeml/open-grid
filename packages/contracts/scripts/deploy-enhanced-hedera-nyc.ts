import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../../.env" });

// Import enhanced NYC grid data
const { NYC_GRID_NODES, GRID_CONNECTIONS } = require("./nyc-grid-data.js");

async function main() {
  console.log("🏙️  Deploying Enhanced NYC Grid to Hedera Testnet...");
  
  // Get contract address from environment or command line
  const contractAddress = process.env.HEDERA_CONTRACT_ADDRESS || process.argv[2];
  
  if (!contractAddress) {
    console.error("❌ Error: Contract address required!");
    console.log("Usage: npx hardhat run scripts/deploy-enhanced-hedera-nyc.ts --network hederaTestnet <contract_address>");
    console.log("Or set HEDERA_CONTRACT_ADDRESS in your .env file");
    process.exit(1);
  }
  
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`📊 Enhanced NYC Nodes: ${NYC_GRID_NODES.length}`);
  console.log(`🔗 Grid Connections: ${GRID_CONNECTIONS.length}`);
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Using account: ${deployer.address}`);
  
  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network Chain ID: ${network.chainId}`);
  
  // Connect to existing contract
  const EnergyMonitorLegacy = await ethers.getContractFactory("EnergyMonitorLegacy");
  const energyMonitor = EnergyMonitorLegacy.attach(contractAddress);
  
  // Verify contract connection
  try {
    const owner = await energyMonitor.owner();
    console.log(`👑 Contract Owner: ${owner}`);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.warn("⚠️  Warning: You are not the contract owner. Node registration may fail.");
    }
  } catch (error) {
    console.error("❌ Error connecting to contract:", error.message);
    process.exit(1);
  }
  
  // Check current node count
  const currentNodeCount = await energyMonitor.nodeCount();
  console.log(`📊 Current nodes in contract: ${currentNodeCount}`);
  
  if (currentNodeCount > 0) {
    console.log("⚠️  Contract already has nodes. This will add to existing nodes.");
    console.log("💡 Consider deploying a fresh contract for clean enhanced data.");
  }
  
  // Register enhanced NYC nodes
  console.log(`\n🏙️  Registering ${NYC_GRID_NODES.length} Enhanced NYC Grid Nodes...`);
  
  const batchSize = 5; // Process in batches to avoid gas issues
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < NYC_GRID_NODES.length; i += batchSize) {
    const batch = NYC_GRID_NODES.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(NYC_GRID_NODES.length / batchSize)}`);
    
    for (const node of batch) {
      try {
        console.log(`   Registering: ${node.name} (${node.zone}) - ${node.location}`);
        
        const registerTx = await energyMonitor.registerNode(node.location, {
          gasLimit: 300000,
          gasPrice: network.chainId === 296n || network.chainId === 295n 
            ? ethers.parseUnits("400", "gwei")
            : undefined,
          maxFeePerGas: network.chainId !== 296n && network.chainId !== 295n 
            ? ethers.parseUnits("30", "gwei")
            : undefined,
          maxPriorityFeePerGas: network.chainId !== 296n && network.chainId !== 295n 
            ? ethers.parseUnits("25", "gwei")
            : undefined,
        });
        
        await registerTx.wait();
        successCount++;
        console.log(`   ✅ Success: ${node.name}`);
        
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error registering ${node.name}:`, error.message);
      }
    }
    
    // Delay between batches
    if (i + batchSize < NYC_GRID_NODES.length) {
      console.log("   ⏳ Waiting 3 seconds before next batch...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Verify registration
  console.log("\n🔍 Verifying enhanced node registration...");
  const finalNodeCount = await energyMonitor.nodeCount();
  console.log(`📊 Total nodes in contract: ${finalNodeCount}`);
  console.log(`📈 Nodes added: ${finalNodeCount - currentNodeCount}`);
  
  // Get sample nodes to verify
  console.log("\n📋 Sample Enhanced NYC Grid Nodes:");
  const startIndex = Math.max(0, Number(finalNodeCount) - 5);
  for (let i = startIndex; i < Number(finalNodeCount); i++) {
    const node = await energyMonitor.nodes(i);
    console.log(`   Node ${i}: ${node.location} (Active: ${node.active})`);
  }
  
  // Print enhanced grid summary
  console.log("\n🏗️  Enhanced NYC Grid Summary:");
  console.log("=" .repeat(60));
  
  // Group nodes by zone
  const nodesByZone = NYC_GRID_NODES.reduce((acc, node) => {
    acc[node.zone] = (acc[node.zone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("📊 Nodes by Zone:");
  for (const [zone, count] of Object.entries(nodesByZone)) {
    console.log(`   ${zone}: ${count} nodes`);
  }
  
  // Group connections by type
  const connectionsByType = GRID_CONNECTIONS.reduce((acc, conn) => {
    acc[conn.type] = (acc[conn.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("\n🔗 Grid Connections by Type:");
  for (const [type, count] of Object.entries(connectionsByType)) {
    console.log(`   ${type}: ${count} connections`);
  }
  
  // Calculate total capacity
  const totalCapacity = GRID_CONNECTIONS.reduce((sum, conn) => sum + conn.capacity, 0);
  console.log(`\n⚡ Total Grid Capacity: ${totalCapacity} kW`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "hedera-testnet",
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    nodesBefore: currentNodeCount,
    nodesAfter: finalNodeCount,
    nodesAdded: finalNodeCount - currentNodeCount,
    nodesRegistered: successCount,
    nodesFailed: errorCount,
    totalEnhancedNodes: NYC_GRID_NODES.length,
    totalConnections: GRID_CONNECTIONS.length,
    nodesByZone,
    connectionsByType,
    totalGridCapacity: totalCapacity,
    deploymentTime: new Date().toISOString(),
    note: "Enhanced NYC Grid deployment on Hedera Testnet with zones and connections"
  };
  
  console.log("\n📝 Enhanced Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Enhanced NYC Grid deployment complete! You can now:");
  console.log("   1. View all 35 enhanced NYC grid nodes on the frontend");
  console.log("   2. Monitor energy data across organized zones (downtown, midtown, etc.)");
  console.log("   3. See the complete NYC energy grid network");
  console.log("   4. Track grid connections and capacity");
  
  // Save deployment data to a file
  const fs = require('fs');
  const deploymentData = {
    contractAddress,
    network: "hedera-testnet",
    deploymentTime: new Date().toISOString(),
    nodesAdded: finalNodeCount - currentNodeCount,
    totalNodes: finalNodeCount,
    enhancedFeatures: {
      zones: Object.keys(nodesByZone),
      connections: Object.keys(connectionsByType),
      totalCapacity
    }
  };
  
  fs.writeFileSync(
    'enhanced-hedera-deployment.json', 
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\n💾 Enhanced deployment data saved to enhanced-hedera-deployment.json");
  
  // Note about grid connections
  console.log("\n💡 Note: Grid connections are defined in the data but not stored in the contract.");
  console.log("   The frontend can use this connection data for visualization and routing.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Enhanced deployment failed:", error);
    process.exit(1);
  });
