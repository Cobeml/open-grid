import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../../.env" });

async function main() {
  console.log("🔍 Checking Hedera Contract Status...");
  
  // Get contract address from environment or command line
  const contractAddress = process.env.HEDERA_CONTRACT_ADDRESS || process.argv[2];
  
  if (!contractAddress) {
    console.error("❌ Error: Contract address required!");
    console.log("Usage: npx hardhat run scripts/check-hedera-contract.ts --network hederaTestnet <contract_address>");
    console.log("Or set HEDERA_CONTRACT_ADDRESS in your .env file");
    process.exit(1);
  }
  
  console.log(`📍 Contract Address: ${contractAddress}`);
  
  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Using account: ${deployer.address}`);
  
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
    
    const nodeCount = await energyMonitor.nodeCount();
    console.log(`📊 Total Nodes: ${nodeCount}`);
    
    const dataCount = await energyMonitor.dataCount();
    console.log(`📈 Total Data Points: ${dataCount}`);
    
    // Get all nodes
    console.log("\n🏙️  NYC Energy Monitoring Nodes:");
    console.log("=" .repeat(80));
    
    for (let i = 0; i < nodeCount; i++) {
      const node = await energyMonitor.nodes(i);
      const latestData = await energyMonitor.getLatestDataForNode(i);
      
      console.log(`Node ${i}:`);
      console.log(`  Location: ${node.location}`);
      console.log(`  Active: ${node.active}`);
      console.log(`  Registered: ${new Date(Number(node.registeredAt) * 1000).toLocaleString()}`);
      console.log(`  Last Update: ${node.lastUpdate > 0 ? new Date(Number(node.lastUpdate) * 1000).toLocaleString() : 'Never'}`);
      
      if (latestData.timestamp > 0) {
        console.log(`  Latest Data: ${Number(latestData.kWh)} kWh at ${new Date(Number(latestData.timestamp) * 1000).toLocaleString()}`);
      } else {
        console.log(`  Latest Data: No data available`);
      }
      console.log("");
    }
    
    // Contract configuration
    console.log("⚙️  Contract Configuration:");
    console.log("=" .repeat(80));
    
    const subscriptionId = await energyMonitor.subscriptionId();
    const gasLimit = await energyMonitor.gasLimit();
    const donId = await energyMonitor.donId();
    
    console.log(`Subscription ID: ${subscriptionId}`);
    console.log(`Gas Limit: ${gasLimit}`);
    console.log(`DON ID: ${donId}`);
    
    // Summary
    console.log("\n📋 Contract Summary:");
    console.log("=" .repeat(80));
    console.log(`✅ Contract is deployed and accessible`);
    console.log(`✅ Owner: ${owner}`);
    console.log(`✅ Nodes: ${nodeCount}/35 NYC locations`);
    console.log(`✅ Data Points: ${dataCount}`);
    console.log(`✅ Network: Hedera ${network.chainId === 296n ? 'Testnet' : 'Mainnet'}`);
    
    if (Number(nodeCount) === 35) {
      console.log(`🎉 All 35 NYC nodes are registered!`);
    } else if (Number(nodeCount) > 0) {
      console.log(`⚠️  ${35 - Number(nodeCount)} NYC nodes still need to be registered`);
    } else {
      console.log(`❌ No nodes registered. Run populate script to add NYC nodes.`);
    }
    
  } catch (error) {
    console.error("❌ Error checking contract:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });
