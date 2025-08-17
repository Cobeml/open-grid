import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../../.env" });

// Import NYC nodes data
const { NYC_NODES } = require("../../../packages/scripts/nyc-nodes-data.js");

async function main() {
  console.log("🏙️  Populating Hedera contract with NYC Grid Data...");
  
  // Get contract address from environment or command line
  const contractAddress = process.env.HEDERA_CONTRACT_ADDRESS || process.argv[2];
  
  if (!contractAddress) {
    console.error("❌ Error: Contract address required!");
    console.log("Usage: npx hardhat run scripts/populate-hedera-nyc.ts --network hederaTestnet <contract_address>");
    console.log("Or set HEDERA_CONTRACT_ADDRESS in your .env file");
    process.exit(1);
  }
  
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`📊 NYC Nodes to Register: ${NYC_NODES.length}`);
  
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
  }
  
  // Register all NYC nodes
  console.log(`\n🏙️  Registering ${NYC_NODES.length} NYC energy monitoring nodes...`);
  
  const batchSize = 5; // Process in batches to avoid gas issues
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < NYC_NODES.length; i += batchSize) {
    const batch = NYC_NODES.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(NYC_NODES.length / batchSize)}`);
    
    for (const node of batch) {
      try {
        console.log(`   Registering: ${node.name} (${node.location})`);
        
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
    if (i + batchSize < NYC_NODES.length) {
      console.log("   ⏳ Waiting 3 seconds before next batch...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Verify registration
  console.log("\n🔍 Verifying node registration...");
  const finalNodeCount = await energyMonitor.nodeCount();
  console.log(`📊 Total nodes in contract: ${finalNodeCount}`);
  console.log(`📈 Nodes added: ${finalNodeCount - currentNodeCount}`);
  
  // Get sample nodes to verify
  console.log("\n📋 Sample registered nodes:");
  const startIndex = Math.max(0, Number(finalNodeCount) - 5);
  for (let i = startIndex; i < Number(finalNodeCount); i++) {
    const node = await energyMonitor.nodes(i);
    console.log(`   Node ${i}: ${node.location} (Active: ${node.active})`);
  }
  
  // Save population info
  const populationInfo = {
    network: "hedera-testnet",
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    nodesBefore: currentNodeCount,
    nodesAfter: finalNodeCount,
    nodesAdded: finalNodeCount - currentNodeCount,
    nodesRegistered: successCount,
    nodesFailed: errorCount,
    totalNYCNodes: NYC_NODES.length,
    populationTime: new Date().toISOString(),
    note: "NYC grid network population on Hedera Testnet"
  };
  
  console.log("\n📝 Population Summary:");
  console.log(JSON.stringify(populationInfo, null, 2));
  
  console.log("\n🎉 Population complete! You can now:");
  console.log("   1. View all NYC energy monitoring nodes on the frontend");
  console.log("   2. Monitor real-time energy data across the NYC grid");
  console.log("   3. Test the interactive map with 35+ monitoring locations");
  
  // Save population data to a file
  const fs = require('fs');
  const populationData = {
    contractAddress,
    network: "hedera-testnet",
    populationTime: new Date().toISOString(),
    nodesAdded: finalNodeCount - currentNodeCount,
    totalNodes: finalNodeCount
  };
  
  fs.writeFileSync(
    'hedera-population.json', 
    JSON.stringify(populationData, null, 2)
  );
  console.log("\n💾 Population data saved to hedera-population.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Population failed:", error);
    process.exit(1);
  });
