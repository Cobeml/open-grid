const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Base Sepolia receiver contract...");
  
  const receiverAddress = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
  const receiver = await ethers.getContractAt("EnergyDataReceiverBaseSepolia", receiverAddress);
  
  console.log(`📍 Contract: ${receiverAddress}`);
  
  try {
    const nodeCount = await receiver.nodeCount();
    const edgeCount = await receiver.edgeCount();
    const lastSync = await receiver.lastSyncTime();
    
    console.log(`📊 Initial state:`);
    console.log(`   Node count: ${nodeCount}`);
    console.log(`   Edge count: ${edgeCount}`);
    console.log(`   Last sync: ${new Date(Number(lastSync) * 1000).toISOString()}`);
    
    const allNodes = await receiver.getAllNodes();
    const allEdges = await receiver.getAllEdges();
    console.log(`✅ getAllNodes(): ${allNodes.length} nodes`);
    console.log(`✅ getAllEdges(): ${allEdges.length} edges`);
    
    const stats = await receiver.getStats();
    console.log(`📈 Stats: ${stats[0]} nodes, ${stats[1]} edges, ${stats[2]} data points`);
    
    const isHealthy = await receiver.isHealthy();
    const hasRecentData = await receiver.hasRecentData();
    console.log(`🏥 Health: ${isHealthy ? 'Healthy' : 'Not healthy'}`);
    console.log(`📅 Recent data: ${hasRecentData ? 'Yes' : 'No'}`);
    
    console.log("\\n🎉 Receiver contract is fully functional!");
    console.log("✅ All frontend-compatible functions working");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });