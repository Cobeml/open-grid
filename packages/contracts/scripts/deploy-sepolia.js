const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Ethereum Sepolia Deployment Script
 * Higher cost but closer to mainnet conditions
 */

const SEPOLIA_CONFIG = {
  name: "Ethereum Sepolia",
  chainId: 11155111,
  router: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
  donId: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000",
  gasPrice: "10000000000", // 10 gwei
  gasLimit: 500000,
  explorerUrl: "https://sepolia.etherscan.io"
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
  console.log("🔍 Estimating deployment costs for Ethereum Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);
  
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.05")) {
    console.log(`⚠️  Low ETH balance. Get testnet ETH from:`);
    console.log(`   🚰 https://faucets.chain.link/sepolia`);
    console.log(`   🚰 https://www.alchemy.com/faucets/ethereum-sepolia`);
    console.log(`   🚰 https://chainstack.com/sepolia-faucet/`);
    console.log(`   ⚠️  Requirement: Must hold 0.001 ETH on mainnet for some faucets`);
  }
  
  // Get current gas price from network
  const provider = deployer.provider;
  const feeData = await provider.getFeeData();
  const currentGasPrice = feeData.gasPrice;
  
  console.log(`⛽ Current network gas price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`);
  
  // Use higher of network gas price or our minimum
  const gasPrice = currentGasPrice > BigInt(SEPOLIA_CONFIG.gasPrice) 
    ? currentGasPrice 
    : BigInt(SEPOLIA_CONFIG.gasPrice);
  
  // Estimate gas costs
  const EnergyMonitor = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");
  const deployTx = await EnergyMonitor.getDeployTransaction(
    SEPOLIA_CONFIG.router,
    SEPOLIA_CONFIG.donId,
    1, // subscription ID (placeholder)
    MINIMAL_JS_SOURCE
  );
  
  const estimatedGas = await deployer.estimateGas(deployTx);
  const estimatedCost = estimatedGas * gasPrice;
  
  console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
  console.log(`💰 Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`💵 Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
  console.log(`💵 USD equivalent: ~$${(parseFloat(ethers.formatEther(estimatedCost)) * 3000).toFixed(2)}`);
  
  return { estimatedGas, estimatedCost, gasPrice };
}

async function deployContract(gasPrice) {
  console.log(`\n🚀 Deploying to ${SEPOLIA_CONFIG.name}...`);
  
  const EnergyMonitor = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");
  
  console.log("📤 Deploying contract...");
  console.log("⚠️  Note: Sepolia deployment may take 1-5 minutes due to network congestion");
  
  const contract = await EnergyMonitor.deploy(
    SEPOLIA_CONFIG.router,
    SEPOLIA_CONFIG.donId,
    1, // Will be updated after subscription creation
    MINIMAL_JS_SOURCE,
    {
      gasPrice: gasPrice,
      gasLimit: SEPOLIA_CONFIG.gasLimit
    }
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Contract deployed at: ${contractAddress}`);
  console.log(`🔗 View on explorer: ${SEPOLIA_CONFIG.explorerUrl}/address/${contractAddress}`);
  
  return contract;
}

async function setupNodes(contract, gasPrice) {
  console.log("\n🏗️ Setting up NYC energy nodes...");
  console.log("⏱️  Note: Each transaction may take 1-2 minutes on Sepolia");
  
  const SAMPLE_NODES = [
    { location: "lat:40.7580,lon:-73.9855", name: "Times Square Hub" },
    { location: "lat:40.7074,lon:-74.0113", name: "Wall Street Station" },
    { location: "lat:40.7484,lon:-73.9857", name: "Empire State Building" },
    { location: "lat:40.7128,lon:-74.0060", name: "NYC Center" },
    { location: "lat:40.7589,lon:-73.9851", name: "Broadway District" }
  ];
  
  for (let i = 0; i < SAMPLE_NODES.length; i++) {
    const node = SAMPLE_NODES[i];
    console.log(`📍 Registering: ${node.name} (${i + 1}/${SAMPLE_NODES.length})`);
    
    try {
      const tx = await contract.registerNode(node.location, node.name, {
        gasPrice: gasPrice,
        gasLimit: 150000, // Higher gas limit for Sepolia
      });
      
      console.log(`   ⏳ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Node ${i} registered (Gas used: ${receipt.gasUsed})`);
      
    } catch (error) {
      console.log(`   ❌ Failed to register node ${i}: ${error.message}`);
      if (error.message.includes("insufficient funds")) {
        console.log("   💡 Try getting more ETH from faucets before continuing");
        break;
      }
    }
    
    // Small delay between transactions
    if (i < SAMPLE_NODES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function saveDeployment(contract, costs) {
  const deploymentInfo = {
    network: SEPOLIA_CONFIG.name,
    chainId: SEPOLIA_CONFIG.chainId,
    contractAddress: await contract.getAddress(),
    router: SEPOLIA_CONFIG.router,
    donId: SEPOLIA_CONFIG.donId,
    explorerUrl: SEPOLIA_CONFIG.explorerUrl,
    deployedAt: new Date().toISOString(),
    deployer: (await ethers.getSigners())[0].address,
    costs: {
      estimatedGas: costs.estimatedGas.toString(),
      gasPriceGwei: ethers.formatUnits(costs.gasPrice, "gwei"),
      estimatedCostETH: ethers.formatEther(costs.estimatedCost),
      estimatedCostUSD: (parseFloat(ethers.formatEther(costs.estimatedCost)) * 3000).toFixed(2)
    }
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
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
  console.log(`   Visit: https://functions.chain.link/sepolia`);
  console.log(`   - Create new subscription`);
  console.log(`   - Fund with 5-10 LINK tokens`);
  console.log(`   - Add consumer: ${deploymentInfo.contractAddress}`);
  
  console.log(`\n2. 🪙 Get LINK tokens:`);
  console.log(`   Visit: https://faucets.chain.link/sepolia`);
  console.log(`   Claim LINK tokens for Chainlink Functions`);
  console.log(`   Note: LINK requests are more expensive on Sepolia`);
  
  console.log(`\n3. 🧪 Test the deployment:`);
  console.log(`   npx hardhat run scripts/test-sepolia.js --network sepolia`);
  
  console.log(`\n4. 📊 Monitor events:`);
  console.log(`   cd ../scripts && node listener.js ethereum`);
  
  console.log(`\n⚠️  Sepolia Considerations:`);
  console.log(`   - Higher gas costs than Polygon Amoy`);
  console.log(`   - Slower block times (12-15 seconds)`);
  console.log(`   - Limited faucet availability`);
  console.log(`   - More similar to Ethereum mainnet conditions`);
  
  console.log(`\n📝 Contract Details:`);
  console.log(`   Address: ${deploymentInfo.contractAddress}`);
  console.log(`   Explorer: ${deploymentInfo.explorerUrl}/address/${deploymentInfo.contractAddress}`);
  console.log(`   Network: ${deploymentInfo.network} (Chain ID: ${deploymentInfo.chainId})`);
  console.log(`   Deployment Cost: ${deploymentInfo.costs.estimatedCostETH} ETH (~$${deploymentInfo.costs.estimatedCostUSD})`);
}

async function main() {
  try {
    console.log(`🔵 Ethereum Sepolia Deployment Starting...`);
    console.log(`${"=".repeat(60)}`);
    
    // 1. Estimate costs
    const costs = await estimateDeploymentCosts();
    
    // Confirm before proceeding with high costs
    if (parseFloat(ethers.formatEther(costs.estimatedCost)) > 0.01) {
      console.log(`\n⚠️  High deployment cost detected: ${ethers.formatEther(costs.estimatedCost)} ETH`);
      console.log(`💡 Consider using Polygon Amoy for cheaper testing`);
      console.log(`🔄 Proceeding in 10 seconds... (Ctrl+C to cancel)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // 2. Deploy contract
    const contract = await deployContract(costs.gasPrice);
    
    // 3. Setup nodes
    await setupNodes(contract, costs.gasPrice);
    
    // 4. Save deployment info
    const deploymentInfo = await saveDeployment(contract, costs);
    
    // 5. Print next steps
    await printNextSteps(deploymentInfo);
    
  } catch (error) {
    console.error("\n💥 Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.error("\n💡 Get more testnet ETH from:");
      console.error("   🚰 https://faucets.chain.link/sepolia");
      console.error("   🚰 https://www.alchemy.com/faucets/ethereum-sepolia");
    }
    
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

module.exports = { main, SEPOLIA_CONFIG };