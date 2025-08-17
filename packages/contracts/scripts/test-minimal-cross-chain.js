const { ethers } = require("hardhat");

/**
 * Test Minimal Cross-Chain Message (Cost-Optimized)
 * Sends only a few nodes to reduce LayerZero message size and cost
 */

const DEPLOYMENT_ADDRESSES = {
  sender: "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29",
  receiver: "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e"
};

async function main() {
  try {
    console.log(`🧪 Testing Minimal Cross-Chain Message (Cost-Optimized)`);
    console.log(`${"=".repeat(60)}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`👛 Sender: ${signer.address}`);
    
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      DEPLOYMENT_ADDRESSES.sender
    );
    
    // Check current configuration
    const isConfigured = await sender.isConfigured();
    console.log(`🔧 Sender Configured: ${isConfigured}`);
    
    if (!isConfigured) {
      console.log("❌ Sender not configured. Run peer configuration first.");
      return;
    }
    
    // Get current balance
    const balance = await signer.provider.getBalance(signer.address);
    console.log(`👛 Current balance: ${ethers.formatEther(balance)} POL`);
    
    // Try different optimization strategies
    console.log(`\\n💡 Trying cost optimization strategies...`);
    
    // Strategy 1: Configure smaller batch size
    console.log(`📋 Strategy 1: Reduce batch size to minimize message size`);
    try {
      const configTx = await sender.configureSyncParameters(
        3600,  // 1 hour interval
        false, // auto sync disabled
        5      // maxDataPointsPerSync: reduced from 100 to 5
      );
      await configTx.wait();
      console.log(`✅ Configured smaller batch size (5 data points max)`);
    } catch (error) {
      console.log(`⚠️  Could not configure batch size: ${error.message}`);
    }
    
    // Quote fee with optimized settings
    const fee = await sender.quoteSyncFee(false);
    console.log(`💸 Optimized fee: ${ethers.formatEther(fee)} POL`);
    
    // Calculate total cost
    const gasPrice = ethers.parseUnits("25", "gwei"); // Minimum required gas price
    const gasLimit = 200000; // Reduced gas limit
    const gasCost = gasPrice * BigInt(gasLimit);
    const totalCost = fee + gasCost;
    
    console.log(`💰 Cost breakdown:`);
    console.log(`   LayerZero fee: ${ethers.formatEther(fee)} POL`);
    console.log(`   Gas cost: ${ethers.formatEther(gasCost)} POL`);
    console.log(`   Total needed: ${ethers.formatEther(totalCost)} POL`);
    console.log(`   Available: ${ethers.formatEther(balance)} POL`);
    
    if (balance < totalCost) {
      const shortage = totalCost - balance;
      console.log(`\\n❌ Still need ${ethers.formatEther(shortage)} more POL`);
      console.log(`\\n🚰 Get Polygon Amoy POL from these faucets:`);
      console.log(`   1. Official Polygon Faucet: https://faucet.polygon.technology/`);
      console.log(`   2. Chainlink Faucet: https://faucets.chain.link/polygon-amoy`);
      console.log(`   3. QuickNode Faucet: https://faucet.quicknode.com/polygon/amoy`);
      console.log(`   4. Alchemy Faucet: https://www.alchemy.com/faucets/polygon-amoy`);
      console.log(`   5. thirdweb Faucet: https://thirdweb.com/polygon-amoy-testnet`);
      console.log(`\\n💡 Tip: Try multiple faucets, some allow multiple claims`);
      return;
    }
    
    // Send optimized cross-chain message
    console.log(`\\n🚀 Sending optimized cross-chain message...`);
    const tx = await sender.syncData({ 
      value: fee,
      gasPrice: "25000000000", // 25 gwei (minimum required)
      gasLimit: 200000         // 200k gas limit
    });
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`💰 Actual gas used: ${receipt.gasUsed}`);
    console.log(`💸 Total cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice + fee)} POL`);
    
    console.log(`\\n🎉 Optimized cross-chain message sent successfully!`);
    console.log(`\\n⏳ Message delivery typically takes 1-5 minutes`);
    console.log(`\\n📋 Check results:`);
    console.log(`   npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
    
  } catch (error) {
    console.error("\\n💥 Test failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log(`\\n💡 Quick fixes to try:`);
      console.log(`1. Use lower gas price (15-20 gwei instead of 25-30)`);
      console.log(`2. Reduce gas limit (200k instead of 300k+)`);
      console.log(`3. Get more POL from faucets listed above`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });