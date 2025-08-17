const { ethers } = require("ethers");
const deployments = require("../frontend-abi/deployments.json");
const legacyContract = require("../frontend-abi/EnergyMonitorLegacy.json");

/**
 * Simple Frontend Connection Test
 */

async function main() {
  console.log("🧪 Testing Frontend Connection");
  console.log(`${"=".repeat(50)}`);
  
  try {
    // Connect to local network
    console.log("🔌 Connecting to local network...");
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const network = await provider.getNetwork();
    console.log(`✅ Connected to Chain ID: ${network.chainId}`);
    
    // Get contract
    const contractAddress = deployments.networks.localhost.contracts.EnergyMonitorLegacy;
    const contract = new ethers.Contract(contractAddress, legacyContract.abi, provider);
    console.log(`✅ Contract connected: ${contractAddress}`);
    
    // Test contract calls
    const nodeCount = await contract.nodeCount();
    const dataCount = await contract.dataCount();
    console.log(`📊 Nodes: ${nodeCount}, Data: ${dataCount}`);
    
    // Get node data
    if (nodeCount > 0) {
      const allNodes = await contract.getAllNodes();
      console.log(`📍 First node: ${allNodes[0].location}`);
    }
    
    console.log("\n✅ Frontend connection test PASSED!");
    console.log("📋 Ready for frontend integration");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}