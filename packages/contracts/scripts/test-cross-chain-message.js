const { ethers } = require("hardhat");

/**
 * Test Cross-Chain Message from Polygon Amoy to Base Sepolia
 */

const DEPLOYMENT_ADDRESSES = {
  sender: "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29",
  receiver: "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e"
};

async function main() {
  try {
    console.log(`🧪 Testing Cross-Chain Message`);
    console.log(`${"=".repeat(40)}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`👛 Sender: ${signer.address}`);
    
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      DEPLOYMENT_ADDRESSES.sender
    );
    
    console.log(`📤 Sender Contract: ${DEPLOYMENT_ADDRESSES.sender}`);
    console.log(`📥 Receiver Contract: ${DEPLOYMENT_ADDRESSES.receiver}`);
    
    // Check sender configuration
    const isConfigured = await sender.isConfigured();
    console.log(`\\n🔧 Sender Configured: ${isConfigured}`);
    
    if (!isConfigured) {
      console.log("❌ Sender not fully configured. Please run peer configuration first.");
      return;
    }
    
    // Get data summary
    const dataSummary = await sender.getDataSummary();
    console.log(`\\n📊 Available Data:`);
    console.log(`   Nodes: ${dataSummary[0]}`);
    console.log(`   Edges: ${dataSummary[1]}`);
    console.log(`   Data Points: ${dataSummary[2]}`);
    console.log(`   New Data: ${dataSummary[3]}`);
    
    if (dataSummary[0] == 0) {
      console.log("⚠️  No nodes available. The energy monitor may not have data yet.");
    }
    
    // Quote the fee for sending
    console.log(`\\n💰 Quoting cross-chain message fee...`);
    const fee = await sender.quoteSyncFee(false);
    console.log(`💸 Required fee: ${ethers.formatEther(fee)} POL`);
    
    // Check sender balance
    const balance = await signer.provider.getBalance(signer.address);
    console.log(`👛 Available balance: ${ethers.formatEther(balance)} POL`);
    
    if (balance < fee) {
      console.log("❌ Insufficient balance for cross-chain message");
      return;
    }
    
    // Send the cross-chain message with optimized gas
    console.log(`\\n🚀 Sending cross-chain sync message...`);
    const tx = await sender.syncData({ 
      value: fee,
      gasPrice: "25000000000",  // Reduced from 30 to 25 gwei
      gasLimit: 300000          // Reduced from 500k to 300k
    });
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check updated sync stats
    const syncStats = await sender.getSyncStats();
    console.log(`\\n📈 Updated Sync Stats:`);
    console.log(`   Total Syncs Sent: ${syncStats[2]}`);
    console.log(`   Last Sync Time: ${new Date(Number(syncStats[1]) * 1000).toISOString()}`);
    
    console.log(`\\n🎉 Cross-chain message sent successfully!`);
    console.log(`\\n⏳ LayerZero message delivery typically takes 1-5 minutes`);
    console.log(`\\n📋 Next Steps:`);
    console.log(`1. Wait for LayerZero message delivery`);
    console.log(`2. Check receiver contract on Base Sepolia:`);
    console.log(`   npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
    console.log(`3. Monitor transaction on LayerZero scan if available`);
    
  } catch (error) {
    console.error("\\n💥 Cross-chain test failed:", error.message);
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