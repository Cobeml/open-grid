const { ethers } = require("hardhat");

/**
 * Ultra Minimal Sync with Absolute Minimum Gas
 */

const SENDER_ADDRESS = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function main() {
  try {
    console.log(`⚡ Ultra Minimal Cross-Chain Sync`);
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
    
    // Use absolute minimum gas price (25 gwei is minimum)
    // And minimal gas limit
    const gasPrice = "25000000000"; // 25 gwei
    const gasLimit = 150000; // Very minimal
    
    const gasCost = BigInt(gasLimit) * BigInt(gasPrice);
    const totalCost = fee + gasCost;
    
    console.log(`⛽ Gas: ${gasLimit} @ 25 gwei = ${ethers.formatEther(gasCost)} POL`);
    console.log(`💰 Total: ${ethers.formatEther(totalCost)} POL`);
    console.log(`💳 Can afford: ${balance >= totalCost}`);
    
    if (balance < totalCost) {
      const shortage = totalCost - balance;
      console.log(`\n❌ Short by: ${ethers.formatEther(shortage)} POL`);
      console.log(`💡 Account needs more POL funding`);
      
      // Show exactly how much more is needed
      const currentPOL = parseFloat(ethers.formatEther(balance));
      const neededPOL = parseFloat(ethers.formatEther(totalCost));
      const additionalPOL = neededPOL - currentPOL;
      
      console.log(`\n📊 Funding Summary:`);
      console.log(`   Current POL: ${currentPOL.toFixed(6)}`);
      console.log(`   Required POL: ${neededPOL.toFixed(6)}`);
      console.log(`   Additional needed: ${additionalPOL.toFixed(6)} POL`);
      
      return;
    }
    
    console.log(`\n🚀 Attempting ultra-minimal sync...`);
    
    // Try with minimal settings
    const tx = await sender.syncData({
      value: fee,
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    
    console.log(`✅ Transaction submitted!`);
    console.log(`📤 Hash: ${tx.hash}`);
    console.log(`🔗 Track: https://amoy.polygonscan.com/tx/${tx.hash}`);
    
    console.log(`\n⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    console.log(`\n📊 Result:`);
    console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed}`);
    
    if (receipt.status === 1) {
      console.log(`\n🎉 Cross-chain sync sent successfully!`);
      console.log(`\n⏳ LayerZero delivery usually takes 1-5 minutes`);
      console.log(`📊 Monitor with: npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
      console.log(`🔍 Track delivery: https://layerzeroscan.com/tx/${tx.hash}`);
    } else {
      console.log(`\n❌ Transaction failed on Polygon Amoy`);
    }
    
  } catch (error) {
    console.error(`\n💥 Sync failed: ${error.message}`);
    
    if (error.message.includes("insufficient funds")) {
      console.log(`\n💡 Solution: Add more POL to the account`);
      console.log(`   Account: 0xeab37f66842BeAF8591935BaBbEDfaF1301b7a61`);
      console.log(`   Network: Polygon Amoy`);
    } else if (error.message.includes("out of gas")) {
      console.log(`\n💡 Solution: Transaction needs more gas`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });