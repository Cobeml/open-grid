const { ethers } = require("hardhat");

/**
 * Check Base Sepolia Receiver Status
 */

const RECEIVER_ADDRESS = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";

async function main() {
  try {
    console.log(`📥 Checking Base Sepolia Receiver Status`);
    console.log(`${"=".repeat(45)}`);
    
    const receiver = await ethers.getContractAt(
      "EnergyDataReceiverBaseSepolia",
      RECEIVER_ADDRESS
    );
    
    console.log(`📍 Contract: ${RECEIVER_ADDRESS}`);
    
    // Get comprehensive stats
    const stats = await receiver.getStats();
    console.log(`\\n📊 Current State:`);
    console.log(`   Nodes: ${stats[0]}`);
    console.log(`   Edges: ${stats[1]}`);
    console.log(`   Data Points: ${stats[2]}`);
    console.log(`   Last Sync: ${new Date(Number(stats[3]) * 1000).toISOString()}`);
    console.log(`   Total Syncs: ${stats[4]}`);
    console.log(`   Source Contract: ${stats[6]}`);
    
    // Health checks
    const isHealthy = await receiver.isHealthy();
    const hasRecentData = await receiver.hasRecentData();
    console.log(`\\n🏥 Health Status:`);
    console.log(`   Is Healthy: ${isHealthy}`);
    console.log(`   Has Recent Data: ${hasRecentData}`);
    
    // Test frontend functions
    console.log(`\\n🧪 Testing Frontend Functions:`);
    const allNodes = await receiver.getAllNodes();
    const allEdges = await receiver.getAllEdges();
    console.log(`   getAllNodes(): ${allNodes.length} nodes`);
    console.log(`   getAllEdges(): ${allEdges.length} edges`);
    
    if (allNodes.length > 0) {
      console.log(`\\n📍 Sample Node Data:`);
      const firstNode = allNodes[0];
      console.log(`   Location: ${firstNode.location}`);
      console.log(`   Active: ${firstNode.active}`);
      console.log(`   Registered: ${new Date(Number(firstNode.registeredAt) * 1000).toISOString()}`);
    }
    
    if (allEdges.length > 0) {
      console.log(`\\n🔗 Sample Edge Data:`);
      const firstEdge = allEdges[0];
      console.log(`   From: ${firstEdge.from} -> To: ${firstEdge.to}`);
      console.log(`   Type: ${firstEdge.edgeType}`);
      console.log(`   Active: ${firstEdge.active}`);
    }
    
    console.log(`\\n✅ Receiver contract is functional and ready!`);
    
    if (stats[4] > 0) {
      console.log(`🎉 Cross-chain sync successful! Data received.`);
    } else {
      console.log(`⏳ Awaiting cross-chain data sync...`);
    }
    
  } catch (error) {
    console.error("\\n💥 Status check failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });