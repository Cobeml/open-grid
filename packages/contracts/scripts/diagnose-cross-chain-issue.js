const { ethers } = require("hardhat");

/**
 * Diagnose Cross-Chain Messaging Issues
 */

const CONTRACTS = {
  sender: "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29",
  receiver: "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e",
  energyMonitor: "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB"
};

async function main() {
  try {
    console.log(`🔍 Diagnosing Cross-Chain Issues`);
    console.log(`${"=".repeat(45)}`);
    
    // Check sender contract on Polygon Amoy
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      CONTRACTS.sender
    );
    
    console.log(`📤 Sender Contract Analysis:`);
    console.log(`   Address: ${CONTRACTS.sender}`);
    
    // Check configuration
    const isConfigured = await sender.isConfigured();
    const dataSummary = await sender.getDataSummary();
    const syncStats = await sender.getSyncStats();
    
    console.log(`\\n🔧 Configuration:`);
    console.log(`   Is Configured: ${isConfigured}`);
    console.log(`   Destination Set: ${await sender.destinationContract()}`);
    
    console.log(`\\n📊 Available Data:`);
    console.log(`   Nodes: ${dataSummary[0]}`);
    console.log(`   Edges: ${dataSummary[1]}`);
    console.log(`   Data Points: ${dataSummary[2]}`);
    console.log(`   New Data Available: ${dataSummary[3]}`);
    
    console.log(`\\n📈 Sync Statistics:`);
    console.log(`   Total Syncs Sent: ${syncStats[2]}`);
    console.log(`   Last Sync Time: ${new Date(Number(syncStats[1]) * 1000).toISOString()}`);
    console.log(`   Auto Sync Enabled: ${syncStats[3]}`);
    
    // Check energy monitor data
    console.log(`\\n🔍 Checking Energy Monitor Source:`);
    const energyMonitor = await ethers.getContractAt(
      "EnergyMonitor",
      CONTRACTS.energyMonitor
    );
    
    const nodeCount = await energyMonitor.nodeCount();
    const edgeCount = await energyMonitor.edgeCount();
    const dataCount = await energyMonitor.dataCount();
    
    console.log(`   Source Nodes: ${nodeCount}`);
    console.log(`   Source Edges: ${edgeCount}`);
    console.log(`   Source Data Points: ${dataCount}`);
    
    // Get a few sample nodes
    if (nodeCount > 0) {
      console.log(`\\n📍 Sample Source Nodes:`);
      const allNodes = await energyMonitor.getAllNodes();
      for (let i = 0; i < Math.min(3, allNodes.length); i++) {
        const node = allNodes[i];
        console.log(`   Node ${i}: ${node.location} (active: ${node.active})`);
      }
    }
    
    // Check current balance for cross-chain messaging
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`\\n💰 Current Balance: ${ethers.formatEther(balance)} POL`);
    
    // Quote current fee
    const fee = await sender.quoteSyncFee(false);
    console.log(`💸 Current Sync Fee: ${ethers.formatEther(fee)} POL`);
    
    const canAfford = balance > fee;
    console.log(`💳 Can Afford Sync: ${canAfford}`);
    
    if (!canAfford) {
      const shortage = fee - balance;
      console.log(`❌ Short by: ${ethers.formatEther(shortage)} POL`);
    }
    
    // Analyze the issue
    console.log(`\\n🔎 Issue Analysis:`);
    
    if (dataSummary[0] == 0) {
      console.log(`❌ ROOT CAUSE: No nodes available in source contract`);
      console.log(`💡 SOLUTION: The energy monitor contract has nodes but sender can't read them`);
      console.log(`🔧 This suggests an interface mismatch between sender and energy monitor`);
    } else if (syncStats[2] == 0) {
      console.log(`⚠️  No syncs have been sent yet`);
      console.log(`💡 SOLUTION: Need to send initial cross-chain message`);
    } else {
      console.log(`⚠️  Syncs sent but not delivered`);
      console.log(`💡 SOLUTION: LayerZero message delivery issue`);
    }
    
    console.log(`\\n📋 Recommended Actions:`);
    
    if (dataSummary[0] == 0) {
      console.log(`1. 🔧 Fix sender contract interface to read energy monitor data`);
      console.log(`2. 🔄 Update sender contract deployment`);
      console.log(`3. 🧪 Test data reading capability`);
    }
    
    if (canAfford && dataSummary[0] > 0) {
      console.log(`1. 🚀 Send cross-chain sync message`);
      console.log(`2. ⏳ Monitor delivery (1-10 minutes)`);
      console.log(`3. 🔍 Verify data appears on Base Sepolia`);
    }
    
    if (!canAfford) {
      console.log(`1. 💰 Fund account with ${ethers.formatEther(fee)} POL`);
      console.log(`2. 🚀 Then send cross-chain sync message`);
    }
    
  } catch (error) {
    console.error("\\n💥 Diagnosis failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });