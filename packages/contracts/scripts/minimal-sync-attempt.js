const { ethers } = require("hardhat");

/**
 * Minimal Cross-Chain Sync Attempt
 */

const SENDER_ADDRESS = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function main() {
  try {
    console.log(`🚀 Minimal Cross-Chain Sync Attempt`);
    console.log(`${"=".repeat(40)}`);
    
    const [signer] = await ethers.getSigners();
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      SENDER_ADDRESS
    );
    
    // Check current state
    const balance = await signer.provider.getBalance(signer.address);
    const fee = await sender.quoteSyncFee(false);
    
    console.log(`👛 Account: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} POL`);
    console.log(`💸 Fee Required: ${ethers.formatEther(fee)} POL`);
    
    // Estimate gas first
    console.log(`\n🧮 Estimating gas...`);
    const gasEstimate = await sender.syncData.estimateGas({
      value: fee
    });
    console.log(`⛽ Gas estimate: ${gasEstimate}`);
    
    // Calculate total cost with minimal gas price
    const gasPrice = 25000000000n; // 25 gwei
    const gasCost = gasEstimate * gasPrice;
    const totalCost = fee + gasCost;
    
    console.log(`💸 Gas cost: ${ethers.formatEther(gasCost)} POL`);
    console.log(`💰 Total cost: ${ethers.formatEther(totalCost)} POL`);
    console.log(`💳 Can afford: ${balance >= totalCost}`);
    
    if (balance < totalCost) {
      const shortage = totalCost - balance;
      console.log(`❌ Short by: ${ethers.formatEther(shortage)} POL`);
      console.log(`\n💡 Need to add more POL to account`);
      return;
    }
    
    // Send with estimated gas
    console.log(`\n🚀 Sending with estimated gas...`);
    
    const tx = await sender.syncData({
      value: fee,
      gasPrice: gasPrice,
      gasLimit: gasEstimate + 50000n // Add buffer
    });
    
    console.log(`📤 Transaction Hash: ${tx.hash}`);
    console.log(`🔗 Explorer: https://amoy.polygonscan.com/tx/${tx.hash}`);
    
    console.log(`\n⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Cross-chain sync sent successfully!`);
      console.log(`\n⏳ Monitor delivery with:`);
      console.log(`   npx hardhat run scripts/monitor-cross-chain-delivery.js --network baseSepolia`);
    } else {
      console.log(`❌ Transaction failed`);
    }
    
  } catch (error) {
    console.error("\n💥 Sync failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log(`💡 Need more POL for transaction`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });