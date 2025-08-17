const { ethers } = require("hardhat");

/**
 * Test Minimal Cross-Chain Message with Few Nodes
 */

const SENDER_ADDRESS = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function main() {
  try {
    console.log(`🧪 Testing Minimal Cross-Chain Message`);
    console.log(`${"=".repeat(42)}`);
    
    const [signer] = await ethers.getSigners();
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      SENDER_ADDRESS
    );
    
    // Check current balance
    const balance = await signer.provider.getBalance(signer.address);
    console.log(`👛 Balance: ${ethers.formatEther(balance)} POL`);
    
    // Try to call the test sync function if it exists
    try {
      const testFee = await sender.quoteSyncFee(true); // Quote with minimal data
      console.log(`💸 Minimal sync fee: ${ethers.formatEther(testFee)} POL`);
      
      if (balance > testFee) {
        console.log(`✅ Can afford minimal sync`);
        
        // Estimate gas for minimal sync
        const gasEstimate = await sender.syncData.estimateGas({
          value: testFee
        });
        
        const gasPrice = 25000000000n;
        const gasCost = gasEstimate * gasPrice;
        const totalCost = testFee + gasCost;
        
        console.log(`⛽ Gas estimate: ${gasEstimate}`);
        console.log(`💰 Total cost: ${ethers.formatEther(totalCost)} POL`);
        
        if (balance >= totalCost) {
          console.log(`🚀 Attempting minimal sync...`);
          
          const tx = await sender.syncData({
            value: testFee,
            gasPrice: gasPrice,
            gasLimit: gasEstimate + 20000n
          });
          
          console.log(`📤 TX Hash: ${tx.hash}`);
          console.log(`⏳ Waiting for confirmation...`);
          
          const receipt = await tx.wait();
          
          if (receipt.status === 1) {
            console.log(`✅ Minimal sync successful!`);
            console.log(`📊 Monitor: npx hardhat run scripts/check-receiver-status.js --network baseSepolia`);
          } else {
            console.log(`❌ Transaction failed`);
          }
          
        } else {
          console.log(`❌ Still need ${ethers.formatEther(totalCost - balance)} more POL`);
        }
        
      } else {
        console.log(`❌ Need ${ethers.formatEther(testFee - balance)} more POL`);
      }
      
    } catch (error) {
      // Try the regular sync
      console.log(`\n📊 Checking regular sync fee...`);
      const regularFee = await sender.quoteSyncFee(false);
      console.log(`💸 Regular sync fee: ${ethers.formatEther(regularFee)} POL`);
      
      const shortage = regularFee - balance;
      if (shortage > 0) {
        console.log(`❌ Need ${ethers.formatEther(shortage)} more POL`);
        console.log(`\n💡 Account needs more funding to proceed with cross-chain sync`);
        console.log(`🔗 Current balance: ${ethers.formatEther(balance)} POL`);
        console.log(`🔗 Required amount: ${ethers.formatEther(regularFee)} POL`);
      }
    }
    
  } catch (error) {
    console.error("\n💥 Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });