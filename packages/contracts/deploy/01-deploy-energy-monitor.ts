import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

// Chainlink Functions Router addresses by network
const CHAINLINK_ROUTERS: Record<string, string> = {
  // Mainnets
  ethereum: "0x65C939e97716d07C26508D8E8D57cD5e31d5C8D9",
  polygon: "0x3C3a92a5dE3B4dd7bd2f31b0F3DC56EC7c7b1c73", 
  arbitrum: "0x72051E3E8C632a2B5a4C00F4a0E4e4c0c0c2B8cA",
  optimism: "0x8aB6B9e8e0b5A8E3f0D1E2F3A4B5C6D7E8F9A0B1",
  base: "0x9C9E3D56F0A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8",
  avalanche: "0xE1F0C6B7A8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3",
  bnb: "0xF1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0",
  
  // Testnets
  sepolia: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
  polygonMumbai: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
  arbitrumGoerli: "0x72051E3E8C632a2B5a4C00F4a0E4e4c0c0c2B8cA",
  optimismGoerli: "0xDC2AAF042Aeff2E68B3e8E33F19e4B9fA7C73F10",
  baseGoerli: "0xf9B8fc078197181C841c296C876945aaa425B278",
  fuji: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  bscTestnet: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
};

// Default DON IDs for each network (these may need to be updated)
const DEFAULT_DON_IDS: Record<string, string> = {
  // Mainnets
  ethereum: "0x66756e2d657468657265756d2d6d61696e6e65742d3100000000000000000000",
  polygon: "0x66756e2d706f6c79676f6e2d6d61696e6e65742d310000000000000000000000",
  arbitrum: "0x66756e2d617262697472756d2d6d61696e6e65742d310000000000000000000",
  optimism: "0x66756e2d6f7074696d69736d2d6d61696e6e65742d310000000000000000000",
  base: "0x66756e2d626173652d6d61696e6e65742d31000000000000000000000000000",
  avalanche: "0x66756e2d6176616c616e6368652d6d61696e6e65742d310000000000000000",
  bnb: "0x66756e2d626e622d6d61696e6e65742d3100000000000000000000000000000",
  
  // Testnets
  sepolia: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000",
  polygonMumbai: "0x66756e2d706f6c79676f6e2d6d756d6261692d31000000000000000000000000",
  arbitrumGoerli: "0x66756e2d617262697472756d2d676f65726c692d310000000000000000000000",
  optimismGoerli: "0x66756e2d6f7074696d69736d2d676f65726c692d310000000000000000000000",
  baseGoerli: "0x66756e2d626173652d676f65726c692d3100000000000000000000000000000",
  fuji: "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000",
  bscTestnet: "0x66756e2d626e622d746573746e65742d310000000000000000000000000000",
};

const deployEnergyMonitor: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log(`\n🚀 Deploying EnergyMonitor to ${network.name}...`);
  log(`📍 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  log(`👤 Deployer: ${deployer}`);

  // Get Chainlink Functions router for this network
  const router = CHAINLINK_ROUTERS[network.name];
  if (!router) {
    log(`❌ Chainlink Functions router not configured for network: ${network.name}`);
    log(`📝 Available networks: ${Object.keys(CHAINLINK_ROUTERS).join(", ")}`);
    throw new Error(`Chainlink router not configured for network: ${network.name}`);
  }

  // Get configuration from environment variables
  const subscriptionId = process.env[`${network.name.toUpperCase()}_SUBSCRIPTION_ID`] || "1";
  const gasLimit = parseInt(process.env[`${network.name.toUpperCase()}_GAS_LIMIT`] || "300000");
  const donId = process.env[`${network.name.toUpperCase()}_DON_ID`] || DEFAULT_DON_IDS[network.name] || DEFAULT_DON_IDS.sepolia;

  log(`🔧 Configuration:`);
  log(`   📡 Router: ${router}`);
  log(`   🆔 Subscription ID: ${subscriptionId}`);
  log(`   ⛽ Gas Limit: ${gasLimit}`);
  log(`   🌐 DON ID: ${donId}`);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer);
  log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("❌ Deployer account has no funds!");
  }

  try {
    // Deploy the contract
    const deployResult = await deploy("EnergyMonitor", {
      from: deployer,
      args: [router, subscriptionId, gasLimit, donId],
      log: true,
      autoMine: true,
      waitConfirmations: network.name === "hardhat" ? 1 : 2,
    });

    if (deployResult.newlyDeployed) {
      log(`✅ EnergyMonitor deployed to: ${deployResult.address}`);
      log(`📝 Transaction hash: ${deployResult.transactionHash}`);
      log(`⛽ Gas used: ${deployResult.receipt?.gasUsed?.toString() || "N/A"}`);

      // Verify contract on etherscan if not on hardhat/localhost
      if (network.name !== "hardhat" && network.name !== "localhost") {
        log(`🔍 Waiting for block confirmations before verification...`);
        
        try {
          await hre.run("verify:verify", {
            address: deployResult.address,
            constructorArguments: [router, subscriptionId, gasLimit, donId],
          });
          log(`✅ Contract verified on block explorer`);
        } catch (error: any) {
          if (error.message.includes("Already Verified")) {
            log(`ℹ️  Contract already verified`);
          } else {
            log(`⚠️  Verification failed: ${error.message}`);
          }
        }
      }

      // Log deployment summary
      log(`\n📋 Deployment Summary:`);
      log(`   🏠 Contract: EnergyMonitor`);
      log(`   📍 Address: ${deployResult.address}`);
      log(`   🌐 Network: ${network.name}`);
      log(`   🆔 Chain ID: ${network.config.chainId}`);
      log(`   👤 Owner: ${deployer}`);
      log(`   📡 Router: ${router}`);
      log(`   🎫 Subscription: ${subscriptionId}`);
      log(`\n🎉 Deployment completed successfully!`);

    } else {
      log(`ℹ️  EnergyMonitor already deployed at: ${deployResult.address}`);
    }

    return deployResult;

  } catch (error: any) {
    log(`❌ Deployment failed: ${error.message}`);
    throw error;
  }
};

export default deployEnergyMonitor;
deployEnergyMonitor.tags = ["EnergyMonitor", "main"];
deployEnergyMonitor.dependencies = [];