const { ethers } = require("hardhat");

/**
 * High Gas Cross-Chain Sync for Fast Processing
 */

const SENDER_ADDRESS = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function main() {
  try {
    console.log(`🚀 High Gas Cross-Chain Sync`);
    console.log(`${"=".repeat(35)}`);
    
    const [signer] = await ethers.getSigners();
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      SENDER_ADDRESS
    );
    
    // Get current state
    const balance = await signer.provider.getBalance(signer.address);
    const fee = await sender.quoteSyncFee(false);
    
    console.log(`👛 Balance: ${ethers.formatEther(balance)} POL`);
    console.log(`💸 LZ Fee: ${ethers.formatEther(fee)} POL`);
    
    // Check current network gas price
    const network = await signer.provider.getNetwork();
    const feeData = await signer.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice;
    
    console.log(`\n⛽ Network Gas Info:`);
    console.log(`   Current Gas Price: ${ethers.formatUnits(currentGasPrice, 'gwei')} gwei`);
    
    // Use higher gas price for faster processing
    const highGasPrice = currentGasPrice * 150n / 100n; // 50% above current
    const gasLimit = 300000; // Higher gas limit
    
    const gasCost = BigInt(gasLimit) * highGasPrice;
    const totalCost = fee + gasCost;
    
    console.log(`   High Gas Price: ${ethers.formatUnits(highGasPrice, 'gwei')} gwei`);
    console.log(`   Gas Cost: ${ethers.formatEther(gasCost)} POL`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost)} POL`);
    console.log(`   Can Afford: ${balance >= totalCost}`);
    
    if (balance < totalCost) {
      const shortage = totalCost - balance;
      console.log(`\n❌ Short by: ${ethers.formatEther(shortage)} POL`);
      return;
    }
    
    console.log(`\n🚀 Sending with high gas for fast processing...`);
    console.log(`⚡ This should be mined within 1-2 blocks`);
    
    const tx = await sender.syncData({
      value: fee,
      gasPrice: highGasPrice,
      gasLimit: gasLimit
    });
    
    console.log(`✅ High-gas transaction submitted!`);
    console.log(`📤 Hash: ${tx.hash}`);
    console.log(`🔗 Track: https://amoy.polygonscan.com/tx/${tx.hash}`);
    console.log(`⛽ Gas Price: ${ethers.formatUnits(highGasPrice, 'gwei')} gwei`);
    
    console.log(`\n⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    console.log(`\n📊 Result:`);
    console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed}`);
    console.log(`   Effective Gas Price: ${ethers.formatUnits(receipt.gasPrice, 'gwei')} gwei`);
    
    if (receipt.status === 1) {
      console.log(`\n🎉 Cross-chain sync sent successfully with high gas!`);
      console.log(`\n⏳ LayerZero delivery typically takes 1-5 minutes`);
      console.log(`📊 Monitor delivery:`);
      console.log(`   npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
      console.log(`🔍 Track on LayerZero:`);
      console.log(`   https://layerzeroscan.com/tx/${tx.hash}`);
      
      // Update sync stats
      const newSyncStats = await sender.getSyncStats();
      console.log(`\n📈 Updated Stats:`);
      console.log(`   Total Syncs: ${newSyncStats[2]}`);
      console.log(`   Last Sync: ${new Date(Number(newSyncStats[1]) * 1000).toISOString()}`);
      
    } else {
      console.log(`\n❌ Transaction failed even with high gas`);
    }
    
  } catch (error) {
    console.error(`\n💥 High-gas sync failed: ${error.message}`);
    
    if (error.message.includes("insufficient funds")) {
      console.log(`💡 Need more POL for high-gas transaction`);
    } else if (error.message.includes("replacement transaction underpriced")) {
      console.log(`💡 Previous transaction still pending - try canceling it first`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });