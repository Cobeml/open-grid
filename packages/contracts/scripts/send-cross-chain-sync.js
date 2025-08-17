const { ethers } = require("hardhat");

/**
 * Send Cross-Chain Sync Message (Simplified)
 */

const SENDER_ADDRESS = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function main() {
  try {
    console.log(`🚀 Sending Cross-Chain Sync Message`);
    console.log(`${"=".repeat(45)}`);
    
    const [signer] = await ethers.getSigners();
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      SENDER_ADDRESS
    );
    
    // Check current state
    const balance = await signer.provider.getBalance(signer.address);
    const fee = await sender.quoteSyncFee(false);
    const isConfigured = await sender.isConfigured();
    
    console.log(`👛 Account: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} POL`);
    console.log(`💸 Fee Required: ${ethers.formatEther(fee)} POL`);
    console.log(`🔧 Configured: ${isConfigured}`);
    
    if (!isConfigured) {
      console.log(`❌ Sender not configured properly`);
      return;
    }
    
    if (balance < fee) {
      console.log(`❌ Insufficient balance`);
      return;
    }
    
    // Get data summary
    const dataSummary = await sender.getDataSummary();
    console.log(`\\n📊 Data to Sync:`);
    console.log(`   Nodes: ${dataSummary[0]}`);
    console.log(`   Edges: ${dataSummary[1]}`);
    console.log(`   Data Points: ${dataSummary[2]}`);
    
    // Send the message with conservative gas settings
    console.log(`\\n🚀 Sending cross-chain message...`);
    
    const tx = await sender.syncData({
      value: fee,
      gasPrice: "25000000000", // 25 gwei (minimum required)
      gasLimit: 200000         // Minimal gas limit
    });
    
    console.log(`📤 Transaction Hash: ${tx.hash}`);
    console.log(`🔗 Explorer: https://amoy.polygonscan.com/tx/${tx.hash}`);
    
    console.log(`\\n⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed}`);
    console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    
    if (receipt.status === 1) {
      // Check updated sync stats
      const newSyncStats = await sender.getSyncStats();
      console.log(`\\n📈 Updated Stats:`);
      console.log(`   Total Syncs: ${newSyncStats[2]}`);
      console.log(`   Last Sync: ${new Date(Number(newSyncStats[1]) * 1000).toISOString()}`);
      
      console.log(`\\n🎉 Cross-chain message sent successfully!`);
      console.log(`\\n⏳ LayerZero delivery typically takes 1-5 minutes`);
      console.log(`\\n📋 Monitor delivery:`);
      console.log(`   npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
      console.log(`\\n🔍 Track on LayerZero:`);
      console.log(`   https://layerzeroscan.com/tx/${tx.hash}`);
      
    } else {
      console.log(`❌ Transaction failed`);
      console.log(`🔍 Check details: https://amoy.polygonscan.com/tx/${tx.hash}`);
    }
    
  } catch (error) {
    console.error("\\n💥 Sync failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log(`💡 Need more POL for gas fees`);
    } else if (error.message.includes("execution reverted")) {
      console.log(`💡 Contract execution failed - check configuration`);
    } else {
      console.log(`💡 Unexpected error - check network and contract status`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });