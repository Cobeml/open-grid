import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../../.env" });

async function main() {
  console.log("🚀 Deploying EnergyMonitor contract to Polygon Amoy testnet...");
  
  // Get deployment parameters from environment
  const functionsRouter = process.env.POLYGON_AMOY_FUNCTIONS_ROUTER || "0xC22a79eBA640940ABB6dF0f7982cc119578E11De";
  const subscriptionId = process.env.POLYGON_SUBSCRIPTIONS_ID || "1";
  const gasLimit = 300000;
  const donId = ethers.id("fun-polygon-amoy-1");
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Functions Router: ${functionsRouter}`);
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   Gas Limit: ${gasLimit}`);
  console.log(`   DON ID: ${donId}`);
  
  // Get the contract factory and deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deploying with account: ${deployer.address}`);
  
  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} MATIC`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. You may need more MATIC for deployment.");
  }
  
  // Deploy the contract with optimized gas settings
  const EnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
  
  console.log("\n⏳ Deploying contract...");
  const energyMonitor = await EnergyMonitor.deploy(
    functionsRouter,
    parseInt(subscriptionId),
    gasLimit,
    donId,
    {
      gasLimit: 3000000, // Set explicit gas limit
      gasPrice: ethers.parseUnits("30", "gwei") // Lower gas price
    }
  );
  
  // Wait for deployment
  console.log("⏳ Waiting for deployment confirmation...");
  await energyMonitor.waitForDeployment();
  
  const contractAddress = await energyMonitor.getAddress();
  console.log(`\n✅ EnergyMonitor deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Explorer: https://amoy.polygonscan.com/address/${contractAddress}`);
  
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
    network: "polygonAmoy",
    contractAddress: contractAddress,
    deployer: deployer.address,
    functionsRouter: functionsRouter,
    subscriptionId: subscriptionId,
    gasLimit: gasLimit,
    donId: donId,
    deploymentTime: new Date().toISOString(),
    explorerUrl: `https://amoy.polygonscan.com/address/${contractAddress}`
  };
  
  console.log("\n📝 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Deployment complete! You can now:");
  console.log("   1. Update your frontend .env.local with the contract address");
  console.log("   2. Test contract functionality using the frontend");
  console.log("   3. Monitor transactions on Polygon Amoy explorer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });