import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../../.env" });

async function main() {
  console.log("🚀 Deploying EnergyMonitorLegacy contract...");
  
  // Get deployment parameters from environment
  const functionsRouter = process.env.FUNCTIONS_ROUTER || "0x0000000000000000000000000000000000000000"; // Mock address
  const subscriptionId = process.env.SUBSCRIPTION_ID || "1";
  const gasLimit = 300000;
  const donId = ethers.keccak256(ethers.toUtf8Bytes("mock-don-1"));
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Functions Router: ${functionsRouter} (mock)`);
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   Gas Limit: ${gasLimit}`);
  console.log(`   DON ID: ${donId}`);
  
  // Get the contract factory and deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deploying with account: ${deployer.address}`);
  
  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH/MATIC/etc`);
  
  if (balance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Warning: Low balance. You may need more tokens for deployment.");
  }
  
  // Deploy the contract with optimized gas settings
  const EnergyMonitorLegacy = await ethers.getContractFactory("EnergyMonitorLegacy");
  
  console.log("\n⏳ Deploying contract...");
  const energyMonitor = await EnergyMonitorLegacy.deploy(
    functionsRouter,
    parseInt(subscriptionId),
    gasLimit,
    donId,
    {
      gasLimit: 1500000, // Even lower gas limit
      maxFeePerGas: ethers.parseUnits("30", "gwei"), // Meet minimum requirements
      maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"), // Meet minimum tip requirement
    }
  );
  
  // Wait for deployment
  console.log("⏳ Waiting for deployment confirmation...");
  await energyMonitor.waitForDeployment();
  
  const contractAddress = await energyMonitor.getAddress();
  console.log(`\n✅ EnergyMonitorLegacy deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  
  // Verify contract ownership
  const owner = await energyMonitor.owner();
  console.log(`👑 Contract Owner: ${owner}`);
  
  // Register a sample node for testing
  console.log("\n🔧 Registering sample monitoring node...");
  const registerTx = await energyMonitor.registerNode("lat:40.7128,lon:-74.0060");
  await registerTx.wait();
  console.log("✅ Sample node registered (NYC coordinates)");
  
  const nodeCount = await energyMonitor.nodeCount();
  console.log(`📊 Total nodes registered: ${nodeCount}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "legacy-compatible",
    contractAddress: contractAddress,
    deployer: deployer.address,
    functionsRouter: functionsRouter,
    subscriptionId: subscriptionId,
    gasLimit: gasLimit,
    donId: donId,
    deploymentTime: new Date().toISOString(),
    note: "Legacy version - deployable on ANY EVM chain"
  };
  
  console.log("\n📝 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Deployment complete! You can now:");
  console.log("   1. Update your frontend .env.local with the contract address");
  console.log("   2. Test contract functionality using the frontend");
  console.log("   3. This version works on ANY EVM chain (no Chainlink required)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });