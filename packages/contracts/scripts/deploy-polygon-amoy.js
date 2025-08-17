const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Polygon Amoy Deployment Script
 * Optimized for low-cost testnet deployment
 */

const POLYGON_AMOY_CONFIG = {
  name: "Polygon Amoy",
  chainId: 80002,
  router: "0xC22a79eBA640940ABB6dF0f7982cc119578E11De",
  donId: "0x66756e2d706f6c79676f6e2d616d6f792d310000000000000000000000000000",
  gasPrice: "2000000000", // 2 gwei
  gasLimit: 500000,
  explorerUrl: "https://amoy.polygonscan.com"
};

const MINIMAL_JS_SOURCE = `
// Minimal Chainlink Functions source for deployment
const nodeId = parseInt(args[0]);
const timestamp = Math.floor(Date.now() / 1000);
const kWh = 2000 + (nodeId * 500) + Math.floor(Math.random() * 1000);
const lat = 407580; // 40.7580 NYC
const lon = 739855; // 73.9855

const encoded = (BigInt(timestamp) << 192n) |
                (BigInt(kWh) << 128n) |
                (BigInt(lat) << 96n) |
                (BigInt(lon) << 64n) |
                (BigInt(95) << 56n) | // data quality
                BigInt(nodeId);

return Functions.encodeUint256(encoded);
`;

async function estimateDeploymentCosts() {
  console.log("🔍 Estimating deployment costs for Polygon Amoy...");
  
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
  const EnergyMonitor = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");
  const deployTx = await EnergyMonitor.getDeployTransaction(
    POLYGON_AMOY_CONFIG.router,
    POLYGON_AMOY_CONFIG.donId,
    1, // subscription ID (placeholder)
    MINIMAL_JS_SOURCE
  );
  
  const estimatedGas = await deployer.estimateGas(deployTx);
  const gasPrice = BigInt(POLYGON_AMOY_CONFIG.gasPrice);
  const estimatedCost = estimatedGas * gasPrice;
  
  console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
  console.log(`💵 Estimated cost: ${ethers.formatEther(estimatedCost)} POL`);
  console.log(`💵 USD equivalent: ~$${(parseFloat(ethers.formatEther(estimatedCost)) * 0.5).toFixed(4)}`);
  
  return { estimatedGas, estimatedCost };
}

async function deployContract() {
  console.log(`\n🚀 Deploying to ${POLYGON_AMOY_CONFIG.name}...`);
  
  const EnergyMonitor = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");
  
  console.log("📤 Deploying contract...");
  const contract = await EnergyMonitor.deploy(
    POLYGON_AMOY_CONFIG.router,
    POLYGON_AMOY_CONFIG.donId,
    1, // Will be updated after subscription creation
    MINIMAL_JS_SOURCE,
    {
      gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
      gasLimit: POLYGON_AMOY_CONFIG.gasLimit
    }
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Contract deployed at: ${contractAddress}`);
  console.log(`🔗 View on explorer: ${POLYGON_AMOY_CONFIG.explorerUrl}/address/${contractAddress}`);
  
  return contract;
}

async function setupNodes(contract) {
  console.log("\n🏗️ Setting up NYC energy nodes...");
  
  const SAMPLE_NODES = [
    { location: "lat:40.7580,lon:-73.9855", name: "Times Square Hub" },
    { location: "lat:40.7074,lon:-74.0113", name: "Wall Street Station" },
    { location: "lat:40.7484,lon:-73.9857", name: "Empire State Building" },
    { location: "lat:40.7128,lon:-74.0060", name: "NYC Center" },
    { location: "lat:40.7589,lon:-73.9851", name: "Broadway District" }
  ];
  
  for (let i = 0; i < SAMPLE_NODES.length; i++) {
    const node = SAMPLE_NODES[i];
    console.log(`📍 Registering: ${node.name}`);
    
    const tx = await contract.registerNode(node.location, node.name, {
      gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
      gasLimit: 100000
    });
    
    await tx.wait();
    console.log(`✅ Node ${i} registered`);
  }
}

async function saveDeployment(contract, costs) {
  const deploymentInfo = {
    network: POLYGON_AMOY_CONFIG.name,
    chainId: POLYGON_AMOY_CONFIG.chainId,
    contractAddress: await contract.getAddress(),
    router: POLYGON_AMOY_CONFIG.router,
    donId: POLYGON_AMOY_CONFIG.donId,
    explorerUrl: POLYGON_AMOY_CONFIG.explorerUrl,
    deployedAt: new Date().toISOString(),
    deployer: (await ethers.getSigners())[0].address,
    costs: {
      estimatedGas: costs.estimatedGas.toString(),
      estimatedCostPOL: ethers.formatEther(costs.estimatedCost),
      estimatedCostUSD: (parseFloat(ethers.formatEther(costs.estimatedCost)) * 0.5).toFixed(4)
    }
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/polygon-amoy.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
  return deploymentInfo;
}

async function printNextSteps(deploymentInfo) {
  console.log(`\n🎉 Deployment Complete!`);
  console.log(`${"=".repeat(60)}`);
  console.log(`📋 Next Steps:`);
  console.log(`\n1. 🔗 Create Chainlink Functions Subscription:`);
  console.log(`   Visit: https://functions.chain.link/polygon-amoy`);
  console.log(`   - Create new subscription`);
  console.log(`   - Fund with 2-5 LINK tokens`);
  console.log(`   - Add consumer: ${deploymentInfo.contractAddress}`);
  
  console.log(`\n2. 🪙 Get LINK tokens:`);
  console.log(`   Visit: https://faucets.chain.link/polygon-amoy`);
  console.log(`   Claim LINK tokens for Chainlink Functions`);
  
  console.log(`\n3. 🧪 Test the deployment:`);
  console.log(`   npx hardhat run scripts/test-polygon-amoy.js --network polygonAmoy`);
  
  console.log(`\n4. 📊 Monitor events:`);
  console.log(`   cd ../scripts && node listener.js polygon`);
  
  console.log(`\n📝 Contract Details:`);
  console.log(`   Address: ${deploymentInfo.contractAddress}`);
  console.log(`   Explorer: ${deploymentInfo.explorerUrl}/address/${deploymentInfo.contractAddress}`);
  console.log(`   Network: ${deploymentInfo.network} (Chain ID: ${deploymentInfo.chainId})`);
}

async function main() {
  try {
    console.log(`🟣 Polygon Amoy Deployment Starting...`);
    console.log(`${"=".repeat(60)}`);
    
    // 1. Estimate costs
    const costs = await estimateDeploymentCosts();
    
    // 2. Deploy contract
    const contract = await deployContract();
    
    // 3. Setup nodes
    await setupNodes(contract);
    
    // 4. Save deployment info
    const deploymentInfo = await saveDeployment(contract, costs);
    
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