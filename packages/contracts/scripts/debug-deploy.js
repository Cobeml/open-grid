const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debug deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👛 Deployer:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "POL");
  
  // Try to get the contract factory
  console.log("📦 Getting contract factory...");
  const EnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
  console.log("✅ Contract factory created");
  
  // Try deployment with different gas settings
  console.log("🚀 Attempting deployment...");
  try {
    const contract = await EnergyMonitor.deploy({
      gasLimit: 5000000,  // Higher gas limit
      gasPrice: "30000000000"  // 30 gwei
    });
    
    console.log("📤 Deploy transaction hash:", contract.deploymentTransaction().hash);
    
    // Wait for deployment
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log("✅ Contract deployed at:", address);
    
    // Test basic function
    const nodeCount = await contract.nodeCount();
    console.log("📊 Initial node count:", nodeCount.toString());
    
  } catch (error) {
    console.log("❌ Deployment failed:");
    console.log("Error message:", error.message);
    
    if (error.transaction) {
      console.log("Transaction details:", {
        to: error.transaction.to,
        gasLimit: error.transaction.gasLimit,
        gasPrice: error.transaction.gasPrice
      });
    }
    
    if (error.receipt) {
      console.log("Receipt status:", error.receipt.status);
      console.log("Gas used:", error.receipt.gasUsed.toString());
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });