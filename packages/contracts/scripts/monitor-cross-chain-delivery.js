const { ethers } = require("hardhat");

/**
 * Monitor Cross-Chain Message Delivery
 * Polls the receiver contract for incoming data
 */

const RECEIVER_ADDRESS = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const TX_HASH = "0x704c669344d531df918d4a3edc9f66b59a867476f46b6764238595d6ca88bc96";

async function main() {
  try {
    console.log(`🔍 Monitoring Cross-Chain Message Delivery`);
    console.log(`${"=".repeat(50)}`);
    console.log(`📤 Polygon Amoy TX: ${TX_HASH}`);
    console.log(`📥 Base Sepolia Receiver: ${RECEIVER_ADDRESS}`);
    
    const receiver = await ethers.getContractAt(
      "EnergyDataReceiverBaseSepolia",
      RECEIVER_ADDRESS
    );
    
    // Get initial state
    let initialStats = await receiver.getStats();
    console.log(`\\n📊 Initial State:`);
    console.log(`   Nodes: ${initialStats[0]}`);
    console.log(`   Edges: ${initialStats[1]}`);
    console.log(`   Data Points: ${initialStats[2]}`);
    console.log(`   Total Syncs: ${initialStats[4]}`);
    
    console.log(`\\n⏳ Monitoring for LayerZero message delivery...`);
    console.log(`   (Messages typically arrive in 1-5 minutes)`);
    
    // Monitor for changes
    let attempts = 0;
    const maxAttempts = 20; // Monitor for ~10 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      attempts++;
      
      try {
        const currentStats = await receiver.getStats();
        const syncCount = Number(currentStats[4]);
        const nodeCount = Number(currentStats[0]);
        
        console.log(`\\n🔄 Check ${attempts}/20 (${attempts * 0.5} minutes):`);
        console.log(`   Syncs: ${syncCount}, Nodes: ${nodeCount}`);
        
        // Check if we received data
        if (syncCount > Number(initialStats[4])) {
          console.log(`\\n🎉 SUCCESS! Cross-chain message delivered!`);
          console.log(`\\n📊 Updated State:`);
          console.log(`   Nodes: ${currentStats[0]}`);
          console.log(`   Edges: ${currentStats[1]}`);
          console.log(`   Data Points: ${currentStats[2]}`);
          console.log(`   Total Syncs: ${currentStats[4]}`);
          console.log(`   Last Sync: ${new Date(Number(currentStats[3]) * 1000).toISOString()}`);
          
          // Test frontend functions with new data
          if (nodeCount > 0) {
            console.log(`\\n🧪 Testing with received data:`);
            const allNodes = await receiver.getAllNodes();
            const allEdges = await receiver.getAllEdges();
            
            console.log(`   getAllNodes(): ${allNodes.length} nodes`);
            console.log(`   getAllEdges(): ${allEdges.length} edges`);
            
            if (allNodes.length > 0) {
              const firstNode = allNodes[0];
              console.log(`   Sample node: ${firstNode.location} (active: ${firstNode.active})`);
            }
            
            const isHealthy = await receiver.isHealthy();
            const hasRecentData = await receiver.hasRecentData();
            console.log(`   Is Healthy: ${isHealthy}`);
            console.log(`   Has Recent Data: ${hasRecentData}`);
          }
          
          console.log(`\\n🌟 LayerZero cross-chain integration COMPLETE!`);
          console.log(`✅ Data successfully synced from Polygon Amoy to Base Sepolia`);
          return;
        }
        
      } catch (error) {
        console.log(`   ⚠️  Error checking status: ${error.message}`);
      }
    }
    
    console.log(`\\n⏰ Monitoring timeout reached (10 minutes)`);
    console.log(`\\n💡 This could mean:`);
    console.log(`   1. LayerZero message still in transit (can take longer sometimes)`);
    console.log(`   2. Transaction failed on Polygon Amoy`);
    console.log(`   3. Message delivery delayed due to network congestion`);
    
    console.log(`\\n🔍 Check transaction status:`);
    console.log(`   Polygon Amoy: https://amoy.polygonscan.com/tx/${TX_HASH}`);
    console.log(`   LayerZero Scan: https://layerzeroscan.com/tx/${TX_HASH}`);
    
    console.log(`\\n📋 Manual verification:`);
    console.log(`   npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
    
  } catch (error) {
    console.error("\\n💥 Monitoring failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });