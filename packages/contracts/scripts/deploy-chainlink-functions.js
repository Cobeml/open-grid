const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Hardhat deployment script for EnergyMonitorWithChainlink
 * Properly compiles and deploys the contract with real Chainlink Functions
 */

const CHAINLINK_CONFIG = {
  // Polygon Amoy Testnet Configuration
  router: "0xC22a79eBA640940ABB6dF0f7982cc119578E11De",
  donId: "0x66756e2d706f6c79676f6e2d616d6f792d310000000000000000000000000000",
  subscriptionId: 1, // Update with your actual subscription ID
  gasLimit: 300000
};

async function main() {
  console.log("🚀 Deploying EnergyMonitorWithChainlink with real Chainlink Functions...");
  
  // Load minimal JavaScript source to reduce deployment bytecode size
  // We can update to full source post-deploy via setSource()
  const source = "return Functions.encodeUint256(0);";
  
  console.log("📄 Using minimal JS source:", source.length, "characters");
  
  // Get the contract factory
  const EnergyMonitor = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");

  // Use network defaults - let Hardhat estimate optimal gas
  console.log("⛽ Using network gas estimation...");
  
  // Deploy the contract
  console.log("🏗️  Deploying contract...");
  const contract = await EnergyMonitor.deploy(
    CHAINLINK_CONFIG.router,
    CHAINLINK_CONFIG.donId,
    CHAINLINK_CONFIG.subscriptionId,
    source
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("🔗 Router:", CHAINLINK_CONFIG.router);
  console.log("🆔 DON ID:", CHAINLINK_CONFIG.donId);
  console.log("💳 Subscription:", CHAINLINK_CONFIG.subscriptionId);
  
  // Verify deployment
  const nodeCount = await contract.nodeCount();
  console.log("📊 Initial node count:", nodeCount.toString());
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    router: CHAINLINK_CONFIG.router,
    donId: CHAINLINK_CONFIG.donId,
    subscriptionId: CHAINLINK_CONFIG.subscriptionId,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    deployer: (await ethers.getSigners())[0].address
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/chainlink-functions.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentPath);
  
  console.log("\n🎉 Deployment complete!");
  console.log("📋 Next steps:");
  console.log("1. Add this contract as a consumer to your Chainlink subscription");
  console.log("2. Register nodes using registerNodesBatch()");
  console.log("3. Test energy data requests with requestEnergyData()");
  console.log("4. Monitor events for real-time updates");
  
  return contract;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };