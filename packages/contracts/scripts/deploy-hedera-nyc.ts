import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../../.env" });

// Import NYC nodes data
const { NYC_NODES } = require("../../../packages/scripts/nyc-nodes-data.js");

async function main() {
  console.log("🚀 Deploying EnergyMonitorLegacy to Hedera Testnet with NYC Grid Data...");
  
  // Get deployment parameters from environment
  const functionsRouter = process.env.FUNCTIONS_ROUTER || "0x0000000000000000000000000000000000000000"; // Mock address
  const subscriptionId = process.env.SUBSCRIPTION_ID || "1";
  const gasLimit = 300000;
  const donId = ethers.keccak256(ethers.toUtf8Bytes("mock-don-1"));
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Functions Router: ${functionsRouter} (mock)`);
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   Gas Limit: ${gasLimit}`);
  console.log(`   DON ID: ${donId}`);
  console.log(`   NYC Nodes to Register: ${NYC_NODES.length}`);
  
  // Get the contract factory and deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deploying with account: ${deployer.address}`);
  
  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HBAR`);
  
  if (balance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Warning: Low balance. You may need more HBAR for deployment.");
  }
  
  // Get network info to determine gas settings
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network Chain ID: ${network.chainId}`);
  
  // Hedera-specific gas settings
  let gasSettings = {};
  if (network.chainId === 296n) { // Hedera Testnet
    console.log("🎯 Using Hedera Testnet gas settings");
    gasSettings = {
      gasLimit: 2000000, // Higher gas limit for deployment + node registration
      gasPrice: ethers.parseUnits("400", "gwei"), // Above minimum 350 gwei
    };
  } else if (network.chainId === 295n) { // Hedera Mainnet
    console.log("🎯 Using Hedera Mainnet gas settings");
    gasSettings = {
      gasLimit: 2000000,
      gasPrice: ethers.parseUnits("400", "gwei"),
    };
  } else {
    // Default EIP-1559 settings for other networks
    console.log("🎯 Using default EIP-1559 gas settings");
    gasSettings = {
      gasLimit: 2000000,
      maxFeePerGas: ethers.parseUnits("30", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"),
    };
  }
  
  // Deploy the contract
  const EnergyMonitorLegacy = await ethers.getContractFactory("EnergyMonitorLegacy");
  
  console.log("\n⏳ Deploying contract...");
  const energyMonitor = await EnergyMonitorLegacy.deploy(
    functionsRouter,
    parseInt(subscriptionId),
    gasLimit,
    donId,
    gasSettings
  );
  
  // Wait for deployment
  console.log("⏳ Waiting for deployment confirmation...");
  await energyMonitor.waitForDeployment();
  
  const contractAddress = await energyMonitor.getAddress();
  console.log(`\n✅ EnergyMonitorLegacy deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  
  // Verify contract ownership
  const owner = await energyMonitor.owner();
  console.log(`👑 Contract Owner: ${owner}`);
  
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
  const nodeCount = await energyMonitor.nodeCount();
  console.log(`📊 Total nodes registered: ${nodeCount}`);
  
  // Get sample nodes to verify
  console.log("\n📋 Sample registered nodes:");
  for (let i = 0; i < Math.min(5, nodeCount); i++) {
    const node = await energyMonitor.nodes(i);
    console.log(`   Node ${i}: ${node.location} (Active: ${node.active})`);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: "hedera-testnet",
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    functionsRouter: functionsRouter,
    subscriptionId: subscriptionId,
    gasLimit: gasLimit,
    donId: donId,
    nodesRegistered: successCount,
    nodesFailed: errorCount,
    totalNYCNodes: NYC_NODES.length,
    deploymentTime: new Date().toISOString(),
    note: "Hedera Testnet deployment with full NYC grid network"
  };
  
  console.log("\n📝 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Deployment and population complete! You can now:");
  console.log("   1. Update your frontend .env.local with the contract address");
  console.log("   2. Test contract functionality using the frontend");
  console.log("   3. View all 35 NYC energy monitoring nodes on the map");
  console.log("   4. Monitor real-time energy data across the NYC grid");
  
  // Save contract address to a file for easy reference
  const fs = require('fs');
  const deploymentData = {
    contractAddress,
    network: "hedera-testnet",
    deploymentTime: new Date().toISOString(),
    nodesRegistered: successCount
  };
  
  fs.writeFileSync(
    'hedera-deployment.json', 
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\n💾 Contract address saved to hedera-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
