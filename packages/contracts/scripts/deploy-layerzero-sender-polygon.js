const { ethers } = require("hardhat");
const { config } = require("dotenv");

config();

/**
 * Deploy LayerZero Sender Contract on Polygon Amoy
 * Integrates with existing ChainlinkEnergyMonitor deployment
 */

const POLYGON_AMOY_CONFIG = {
  name: "Polygon Amoy",
  chainId: 80002,
  layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero v2 endpoint
  existingEnergyMonitor: "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB", // Our deployed contract
  gasPrice: "30000000000", // 30 gwei
  explorerUrl: "https://amoy.polygonscan.com"
};

async function main() {
  try {
    console.log(`🟣 Deploying LayerZero Sender on Polygon Amoy`);
    console.log(`${"=".repeat(55)}`);
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    
    console.log(`👛 Deployer: ${deployer.address}`);
    console.log(`💰 POL Balance: ${ethers.formatEther(balance)} POL`);
    
    // Check minimum balance
    const requiredBalance = ethers.parseEther("0.01");
    if (balance < requiredBalance) {
      throw new Error("Insufficient balance. Need at least 0.01 POL for deployment.");
    }
    
    console.log(`\\n📋 Configuration:`);
    console.log(`   LayerZero Endpoint: ${POLYGON_AMOY_CONFIG.layerzeroEndpoint}`);
    console.log(`   Energy Monitor: ${POLYGON_AMOY_CONFIG.existingEnergyMonitor}`);
    console.log(`   Gas Price: ${parseInt(POLYGON_AMOY_CONFIG.gasPrice) / 1e9} gwei`);
    
    // Deploy the sender contract
    console.log(`\\n🚀 Deploying EnergyDataSenderPolygonAmoy...`);
    
    const EnergyDataSender = await ethers.getContractFactory("EnergyDataSenderPolygonAmoy");
    
    const senderContract = await EnergyDataSender.deploy(
      POLYGON_AMOY_CONFIG.layerzeroEndpoint,
      deployer.address, // owner
      POLYGON_AMOY_CONFIG.existingEnergyMonitor, // energy monitor
      {
        gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
        gasLimit: 3000000
      }
    );
    
    await senderContract.waitForDeployment();
    const senderAddress = await senderContract.getAddress();
    
    console.log(`✅ Sender deployed at: ${senderAddress}`);
    console.log(`🔗 Explorer: ${POLYGON_AMOY_CONFIG.explorerUrl}/address/${senderAddress}`);
    
    // Verify deployment
    console.log(`\\n🔍 Verifying deployment...`);
    
    const configuredMonitor = await senderContract.energyMonitorContract();
    const isConfigured = await senderContract.isConfigured();
    const dataSummary = await senderContract.getDataSummary();
    
    console.log(`📊 Verification Results:`);
    console.log(`   Energy Monitor: ${configuredMonitor}`);
    console.log(`   Is Configured: ${isConfigured} (destination still needed)`);
    console.log(`   Available Nodes: ${dataSummary[0]}`);
    console.log(`   Available Edges: ${dataSummary[1]}`);
    console.log(`   Available Data Points: ${dataSummary[2]}`);
    
    // Test connection to energy monitor
    console.log(`\\n🧪 Testing Energy Monitor connection...`);
    try {
      const energyMonitor = await ethers.getContractAt(
        "EnergyMonitor", 
        POLYGON_AMOY_CONFIG.existingEnergyMonitor
      );
      
      const nodeCount = await energyMonitor.nodeCount();
      const edgeCount = await energyMonitor.edgeCount();
      const dataCount = await energyMonitor.dataCount();
      
      console.log(`✅ Energy Monitor Connection Successful:`);
      console.log(`   Nodes: ${nodeCount}`);
      console.log(`   Edges: ${edgeCount}`);
      console.log(`   Data Points: ${dataCount}`);
      
    } catch (error) {
      console.log(`⚠️  Energy Monitor connection test failed: ${error.message}`);
    }
    
    // Save deployment info
    console.log(`\\n💾 Saving deployment information...`);
    
    const deploymentInfo = {
      contractName: "EnergyDataSenderPolygonAmoy",
      network: POLYGON_AMOY_CONFIG.name,
      chainId: POLYGON_AMOY_CONFIG.chainId,
      contractAddress: senderAddress,
      layerzeroEndpoint: POLYGON_AMOY_CONFIG.layerzeroEndpoint,
      energyMonitorContract: POLYGON_AMOY_CONFIG.existingEnergyMonitor,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      explorerUrl: `${POLYGON_AMOY_CONFIG.explorerUrl}/address/${senderAddress}`,
      
      configuration: {
        destinationChain: "Base Sepolia",
        destinationEID: 40245,
        sourceEID: 40267,
        autoSyncEnabled: false, // Will be configured later
        syncInterval: 3600, // 1 hour default
        maxDataPointsPerSync: 100
      },
      
      nextSteps: [
        "Deploy receiver contract on Base Sepolia",
        "Configure destination contract address",
        "Set up peer relationships",
        "Test cross-chain messaging",
        "Enable auto-sync if desired"
      ]
    };
    
    const fs = require("fs");
    const path = require("path");
    
    const deploymentPath = path.join(__dirname, "../deployments/layerzero-sender-polygon-amoy.json");
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`✅ Deployment info saved to: ${deploymentPath}`);
    
    // Print next steps
    console.log(`\\n📋 Next Steps:`);
    console.log(`\\n1. 🎯 Deploy Receiver Contract on Base Sepolia:`);
    console.log(`   npx hardhat run scripts/deploy-layerzero-receiver-base.js --network baseSepolia`);
    
    console.log(`\\n2. 🔗 Configure Destination (after Base deployment):`);
    console.log(`   await senderContract.configureDestination("RECEIVER_CONTRACT_ADDRESS")`);
    
    console.log(`\\n3. 🌉 Set up LayerZero Peers:`);
    console.log(`   Both contracts need to set each other as trusted peers`);
    
    console.log(`\\n4. 💸 Quote and Send Test Message:`);
    console.log(`   fee = await senderContract.quoteSyncFee(false)`);
    console.log(`   await senderContract.syncData({value: fee})`);
    
    console.log(`\\n5. ⚙️ Optional: Enable Auto-Sync:`);
    console.log(`   await senderContract.configureSyncParameters(3600, true, 100)`);
    
    console.log(`\\n🎉 LayerZero Sender deployment complete!`);
    console.log(`📍 Contract: ${senderAddress}`);
    console.log(`🔗 Explorer: ${POLYGON_AMOY_CONFIG.explorerUrl}/address/${senderAddress}`);
    
  } catch (error) {
    console.error("\\n💥 Deployment failed:", error.message);
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