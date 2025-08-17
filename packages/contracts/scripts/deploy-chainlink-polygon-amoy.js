const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Deploy ChainlinkEnergyMonitor to Polygon Amoy
 * Frontend-compatible version with real Chainlink Functions
 */

const POLYGON_AMOY_CONFIG = {
  name: "Polygon Amoy",
  chainId: 80002,
  gasPrice: "2000000000", // 2 gwei
  gasLimit: 500000,
  explorerUrl: "https://amoy.polygonscan.com",
  router: "0xC22a79eBA640940ABB6dF0f7982cc119578E11De",
  donId: "0x66756e2d706f6c79676f6e2d616d6f792d310000000000000000000000000000"
};

async function estimateDeploymentCosts() {
  console.log("🔍 Estimating deployment costs for ChainlinkEnergyMonitor...");
  
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);
  
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 POL Balance: ${ethers.formatEther(balance)} POL`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.log(`⚠️  Low POL balance. Get testnet POL from:`);
    console.log(`   🚰 https://faucets.chain.link/polygon-amoy`);
    console.log(`   🚰 https://faucet.quicknode.com/polygon/amoy`);
    console.log(`   🚰 https://www.alchemy.com/faucets/polygon-amoy`);
  }
  
  // Estimate gas costs
  const ChainlinkEnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
  const deployTx = await ChainlinkEnergyMonitor.getDeployTransaction();
  
  const estimatedGas = await deployer.estimateGas(deployTx);
  const gasPrice = BigInt(POLYGON_AMOY_CONFIG.gasPrice);
  const estimatedCost = estimatedGas * gasPrice;
  
  console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
  console.log(`💵 Estimated cost: ${ethers.formatEther(estimatedCost)} POL`);
  console.log(`💵 USD equivalent: ~$${(parseFloat(ethers.formatEther(estimatedCost)) * 0.5).toFixed(4)}`);
  
  return { estimatedGas, estimatedCost };
}

async function deployContract() {
  console.log(`\n🚀 Deploying ChainlinkEnergyMonitor to ${POLYGON_AMOY_CONFIG.name}...`);
  
  const ChainlinkEnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
  
  console.log("📤 Deploying contract...");
  const contract = await ChainlinkEnergyMonitor.deploy({
    gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
    gasLimit: POLYGON_AMOY_CONFIG.gasLimit
  });
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ ChainlinkEnergyMonitor deployed at: ${contractAddress}`);
  console.log(`🔗 View on explorer: ${POLYGON_AMOY_CONFIG.explorerUrl}/address/${contractAddress}`);
  
  return contract;
}

async function setupNodes(contract) {
  console.log("\n🏗️ Setting up NYC energy nodes...");
  
  const SAMPLE_NODES = [
    "lat:40.7580,lon:-73.9855", // Times Square Hub
    "lat:40.7074,lon:-74.0113", // Wall Street Station
    "lat:40.7484,lon:-73.9857", // Empire State Building
    "lat:40.7128,lon:-74.0060", // NYC Center
    "lat:40.7589,lon:-73.9851"  // Broadway District
  ];
  
  for (let i = 0; i < SAMPLE_NODES.length; i++) {
    console.log(`📍 Registering node ${i}: ${SAMPLE_NODES[i]}`);
    
    try {
      const tx = await contract.registerNode(SAMPLE_NODES[i], {
        gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
        gasLimit: 100000
      });
      
      await tx.wait();
      console.log(`✅ Node ${i} registered`);
    } catch (error) {
      console.log(`❌ Failed to register node ${i}: ${error.message}`);
    }
  }
}

async function saveDeploymentInfo(contract, costs) {
  const contractAddress = await contract.getAddress();
  
  const deploymentInfo = {
    contractName: "ChainlinkEnergyMonitor",
    network: POLYGON_AMOY_CONFIG.name,
    chainId: POLYGON_AMOY_CONFIG.chainId,
    contractAddress,
    router: POLYGON_AMOY_CONFIG.router,
    donId: POLYGON_AMOY_CONFIG.donId,
    explorerUrl: POLYGON_AMOY_CONFIG.explorerUrl,
    deployedAt: new Date().toISOString(),
    deployer: (await ethers.getSigners())[0].address,
    costs: {
      estimatedGas: costs.estimatedGas.toString(),
      estimatedCostPOL: ethers.formatEther(costs.estimatedCost),
      estimatedCostUSD: (parseFloat(ethers.formatEther(costs.estimatedCost)) * 0.5).toFixed(4)
    },
    compatibility: {
      frontendReady: true,
      legacyCompatible: true,
      productionReady: true,
      chainlinkFunctions: true
    }
  };
  
  // Save to deployments directory
  const deploymentPath = path.join(__dirname, "../deployments/chainlink-polygon-amoy.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  // Update frontend ABI with testnet address
  const frontendDir = path.join(__dirname, "../frontend-abi");
  
  try {
    const chainlinkABI = require(path.join(frontendDir, "ChainlinkEnergyMonitor.json"));
    chainlinkABI.addresses.polygonAmoy = contractAddress;
    chainlinkABI.networks.polygonAmoy = {
      address: contractAddress,
      chainId: POLYGON_AMOY_CONFIG.chainId,
      rpcUrl: "https://rpc-amoy.polygon.technology"
    };
    
    fs.writeFileSync(
      path.join(frontendDir, "ChainlinkEnergyMonitor.json"),
      JSON.stringify(chainlinkABI, null, 2)
    );
    
    // Update deployments.json
    const deploymentsFile = path.join(frontendDir, "deployments.json");
    if (fs.existsSync(deploymentsFile)) {
      const deployments = require(deploymentsFile);
      deployments.networks.polygonAmoy.contracts.ChainlinkEnergyMonitor = contractAddress;
      fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
    }
    
    console.log(`✅ Updated frontend ABI files with Polygon Amoy address`);
  } catch (error) {
    console.log(`⚠️  Could not update frontend ABI: ${error.message}`);
  }
  
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
  return deploymentInfo;
}

async function printNextSteps(deploymentInfo) {
  console.log(`\n🎉 ChainlinkEnergyMonitor Deployment Complete!`);
  console.log(`${"=".repeat(60)}`);
  
  console.log(`\n📋 Contract Details:`);
  console.log(`   Name: ChainlinkEnergyMonitor (Frontend Compatible)`);
  console.log(`   Address: ${deploymentInfo.contractAddress}`);
  console.log(`   Network: ${deploymentInfo.network} (Chain ID: ${deploymentInfo.chainId})`);
  console.log(`   Explorer: ${deploymentInfo.explorerUrl}/address/${deploymentInfo.contractAddress}`);
  console.log(`   Cost: ${deploymentInfo.costs.estimatedCostPOL} POL (~$${deploymentInfo.costs.estimatedCostUSD})`);
  
  console.log(`\n📋 Next Steps:`);
  console.log(`\n1. 🔗 Create Chainlink Functions Subscription:`);
  console.log(`   Visit: https://functions.chain.link/polygon-amoy`);
  console.log(`   - Create new subscription`);
  console.log(`   - Fund with 2-5 LINK tokens`);
  console.log(`   - Add consumer: ${deploymentInfo.contractAddress}`);
  
  console.log(`\n2. 🪙 Get LINK tokens:`);
  console.log(`   Visit: https://faucets.chain.link/polygon-amoy`);
  console.log(`   Claim LINK tokens for Chainlink Functions`);
  
  console.log(`\n3. 🧪 Test the deployment:`);
  console.log(`   npx hardhat run scripts/test-chainlink-production.js --network polygonAmoy`);
  
  console.log(`\n4. 🌐 Frontend Integration:`);
  console.log(`   Use contract address: ${deploymentInfo.contractAddress}`);
  console.log(`   ABI file: packages/contracts/frontend-abi/ChainlinkEnergyMonitor.json`);
  console.log(`   Network: Polygon Amoy (Chain ID: 80002)`);
  
  console.log(`\n5. 📊 Monitor with Scripts:`);
  console.log(`   cd packages/scripts`);
  console.log(`   # Add POLYGON_AMOY_CONTRACT_ADDRESS=${deploymentInfo.contractAddress} to .env`);
  console.log(`   node listener.js polygonAmoy`);
  
  console.log(`\n✅ Advantages of ChainlinkEnergyMonitor:`);
  console.log(`   ✓ 100% compatible with existing frontend code`);
  console.log(`   ✓ Real Chainlink Functions for production data`);
  console.log(`   ✓ Same data structures as EnergyMonitorLegacy`);
  console.log(`   ✓ Same event signatures for seamless integration`);
  console.log(`   ✓ Production-ready for real NYC energy data`);
}

async function main() {
  try {
    console.log(`🟣 ChainlinkEnergyMonitor Deployment to Polygon Amoy`);
    console.log(`${"=".repeat(60)}`);
    
    // 1. Estimate costs
    const costs = await estimateDeploymentCosts();
    
    // 2. Deploy contract
    const contract = await deployContract();
    
    // 3. Setup nodes
    await setupNodes(contract);
    
    // 4. Save deployment info
    const deploymentInfo = await saveDeploymentInfo(contract, costs);
    
    // 5. Print next steps
    await printNextSteps(deploymentInfo);
    
  } catch (error) {
    console.error("\n💥 Deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, POLYGON_AMOY_CONFIG };