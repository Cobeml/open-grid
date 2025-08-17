const { ethers } = require("hardhat");

/**
 * Check Transaction Status on Polygon Amoy
 */

const TX_HASH = "0x704c669344d531df918d4a3edc9f66b59a867476f46b6764238595d6ca88bc96";

async function main() {
  try {
    console.log(`🔍 Checking Transaction Status`);
    console.log(`${"=".repeat(40)}`);
    console.log(`📤 TX Hash: ${TX_HASH}`);
    
    const provider = ethers.provider;
    
    // Get transaction receipt
    console.log(`\\n⏳ Fetching transaction receipt...`);
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    if (!receipt) {
      console.log(`❌ Transaction not found or still pending`);
      console.log(`🔗 Check manually: https://amoy.polygonscan.com/tx/${TX_HASH}`);
      return;
    }
    
    console.log(`\\n📋 Transaction Details:`);
    console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas Price: ${ethers.formatUnits(receipt.gasPrice || 0, 'gwei')} gwei`);
    
    if (receipt.status === 0) {
      console.log(`\\n❌ Transaction failed!`);
      console.log(`💡 This explains why no data arrived on Base Sepolia`);
      
      // Try to get the transaction
      const tx = await provider.getTransaction(TX_HASH);
      if (tx) {
        console.log(`\\n📄 Transaction Info:`);
        console.log(`   To: ${tx.to}`);
        console.log(`   Value: ${ethers.formatEther(tx.value || 0)} POL`);
        console.log(`   Gas Limit: ${tx.gasLimit?.toString()}`);
      }
      
      console.log(`\\n🔍 Check failure reason:`);
      console.log(`   https://amoy.polygonscan.com/tx/${TX_HASH}`);
      return;
    }
    
    console.log(`\\n✅ Transaction succeeded on Polygon Amoy!`);
    
    // Parse events to see what happened
    console.log(`\\n📊 Events emitted:`);
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`   Log ${i}: ${log.address}`);
      
      // Try to decode if it's from our sender contract
      if (log.address.toLowerCase() === "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29".toLowerCase()) {
        console.log(`     🎯 Event from our sender contract`);
      }
    }
    
    console.log(`\\n🌉 LayerZero Message Status:`);
    console.log(`   ✅ Sent from Polygon Amoy successfully`);
    console.log(`   ⏳ Message may still be in transit to Base Sepolia`);
    console.log(`   📊 LayerZero delivery can occasionally take 10-30 minutes`);
    
    console.log(`\\n🔍 Track message delivery:`);
    console.log(`   LayerZero Scan: https://layerzeroscan.com/tx/${TX_HASH}`);
    console.log(`   Polygon Explorer: https://amoy.polygonscan.com/tx/${TX_HASH}`);
    
    console.log(`\\n📋 Continue monitoring:`);
    console.log(`   npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
    
  } catch (error) {
    console.error("\\n💥 Error checking transaction:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });