const { ethers } = require("hardhat");
const { config } = require("dotenv");

config();

/**
 * Deploy LayerZero Receiver Contract on Base Sepolia
 * Receives data from Polygon Amoy ChainlinkEnergyMonitor
 */

const BASE_SEPOLIA_CONFIG = {
  name: "Base Sepolia",
  chainId: 84532,
  layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero v2 endpoint
  gasPrice: "1000000000", // 1 gwei (Base is cheaper)
  explorerUrl: "https://sepolia.basescan.org"
};

async function main() {
  try {
    console.log(`🔵 Deploying LayerZero Receiver on Base Sepolia`);
    console.log(`${"=".repeat(55)}`);
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    
    console.log(`👛 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Check minimum balance
    const requiredBalance = ethers.parseEther("0.005");
    if (balance < requiredBalance) {
      console.log(`❌ Insufficient balance. Need at least 0.005 ETH.`);
      console.log(`🚰 Get testnet ETH from:`);
      console.log(`   • https://faucets.chain.link/base-sepolia`);
      console.log(`   • https://www.alchemy.com/faucets/base-sepolia`);
      console.log(`   • https://docs.base.org/tools/network-faucets`);
      throw new Error("Insufficient balance for deployment");
    }
    
    console.log(`\\n📋 Configuration:`);
    console.log(`   LayerZero Endpoint: ${BASE_SEPOLIA_CONFIG.layerzeroEndpoint}`);
    console.log(`   Source Chain: Polygon Amoy (EID: 40267)`);
    console.log(`   Gas Price: ${parseInt(BASE_SEPOLIA_CONFIG.gasPrice) / 1e9} gwei`);
    
    // Deploy the receiver contract
    console.log(`\\n🚀 Deploying EnergyDataReceiverBaseSepolia...`);
    
    const EnergyDataReceiver = await ethers.getContractFactory("EnergyDataReceiverBaseSepolia");
    
    const receiverContract = await EnergyDataReceiver.deploy(
      BASE_SEPOLIA_CONFIG.layerzeroEndpoint,
      deployer.address, // owner
      {
        gasPrice: BASE_SEPOLIA_CONFIG.gasPrice,
        gasLimit: 3000000
      }
    );
    
    await receiverContract.waitForDeployment();
    const receiverAddress = await receiverContract.getAddress();
    
    console.log(`✅ Receiver deployed at: ${receiverAddress}`);
    console.log(`🔗 Explorer: ${BASE_SEPOLIA_CONFIG.explorerUrl}/address/${receiverAddress}`);
    
    // Verify deployment
    console.log(`\\n🔍 Verifying deployment...`);
    
    const nodeCount = await receiverContract.nodeCount();
    const edgeCount = await receiverContract.edgeCount();
    const dataCount = await receiverContract.dataCount();
    const lastSyncTime = await receiverContract.lastSyncTime();
    const isHealthy = await receiverContract.isHealthy();
    
    console.log(`📊 Verification Results:`);
    console.log(`   Initial Nodes: ${nodeCount}`);
    console.log(`   Initial Edges: ${edgeCount}`);
    console.log(`   Initial Data Points: ${dataCount}`);
    console.log(`   Last Sync: ${new Date(Number(lastSyncTime) * 1000).toISOString()}`);
    console.log(`   Is Healthy: ${isHealthy}`);
    
    // Test basic functions
    console.log(`\\n🧪 Testing contract functions...`);
    try {
      const allNodes = await receiverContract.getAllNodes();
      const allEdges = await receiverContract.getAllEdges();
      const stats = await receiverContract.getStats();
      
      console.log(`✅ Function Tests Successful:`);
      console.log(`   getAllNodes(): ${allNodes.length} nodes`);
      console.log(`   getAllEdges(): ${allEdges.length} edges`);
      console.log(`   getStats(): ${stats[0]} total nodes, ${stats[4]} total syncs`);
      
    } catch (error) {
      console.log(`⚠️  Function test failed: ${error.message}`);
    }
    
    // Save deployment info
    console.log(`\\n💾 Saving deployment information...`);
    
    const deploymentInfo = {
      contractName: "EnergyDataReceiverBaseSepolia",
      network: BASE_SEPOLIA_CONFIG.name,
      chainId: BASE_SEPOLIA_CONFIG.chainId,
      contractAddress: receiverAddress,
      layerzeroEndpoint: BASE_SEPOLIA_CONFIG.layerzeroEndpoint,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      explorerUrl: `${BASE_SEPOLIA_CONFIG.explorerUrl}/address/${receiverAddress}`,
      
      configuration: {
        sourceChain: "Polygon Amoy",
        sourceEID: 40267,
        destinationEID: 40245,
        sourceContract: null, // Will be configured later
        staleDataThreshold: 3600, // 1 hour
        autoDataFreshness: true
      },
      
      frontendCompatibility: {
        getAllNodes: true,
        getAllEdges: true,
        getNodeEdges: true,
        getEdge: true,
        getLatestDataForNode: true,
        getDataInTimeRange: true,
        contractInterface: "Identical to ChainlinkEnergyMonitor",
        additionalFeatures: ["getStats", "hasRecentData", "isHealthy"]
      },
      
      nextSteps: [
        "Configure source contract address",
        "Set up peer relationship with sender",
        "Test cross-chain message receiving",
        "Update frontend to use this contract",
        "Monitor data synchronization"
      ]
    };
    
    const fs = require("fs");
    const path = require("path");
    
    const deploymentPath = path.join(__dirname, "../deployments/layerzero-receiver-base-sepolia.json");
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`✅ Deployment info saved to: ${deploymentPath}`);
    
    // Update frontend deployments configuration
    console.log(`\\n🖥️  Updating frontend configuration...`);
    try {
      const frontendDeployments = path.join(__dirname, "../../frontend/contracts/abi/deployments.json");
      
      let deployments = {};
      if (fs.existsSync(frontendDeployments)) {
        deployments = JSON.parse(fs.readFileSync(frontendDeployments, 'utf8'));
      }
      
      // Initialize structure if needed
      if (!deployments.networks) deployments.networks = {};
      
      // Add Base Sepolia configuration
      deployments.networks.baseSepolia = {
        name: BASE_SEPOLIA_CONFIG.name,
        chainId: BASE_SEPOLIA_CONFIG.chainId,
        rpcUrl: "https://sepolia.base.org",
        explorer: BASE_SEPOLIA_CONFIG.explorerUrl,
        contracts: {
          EnergyDataReceiver: receiverAddress,
          EnergyMonitor: receiverAddress // Alias for frontend compatibility
        },
        layerzero: {
          endpoint: BASE_SEPOLIA_CONFIG.layerzeroEndpoint,
          eid: 40245
        }
      };
      
      deployments.crossChain = {
        enabled: true,
        source: {
          chain: "Polygon Amoy",
          eid: 40267,
          contract: "ChainlinkEnergyMonitor"
        },
        destination: {
          chain: "Base Sepolia", 
          eid: 40245,
          contract: receiverAddress
        }
      };
      
      fs.writeFileSync(frontendDeployments, JSON.stringify(deployments, null, 2));
      console.log(`✅ Updated frontend deployments.json`);
      
    } catch (error) {
      console.log(`⚠️  Could not update frontend config: ${error.message}`);
    }
    
    // Print next steps
    console.log(`\\n📋 Next Steps:`);
    
    console.log(`\\n1. 🔗 Configure Source Contract:`);
    console.log(`   await receiverContract.configureSourceContract("SENDER_CONTRACT_ADDRESS")`);
    
    console.log(`\\n2. 🌉 Set up LayerZero Peers (on both contracts):`);
    console.log(`   Sender: await sender.setPeer(40245, "0x${receiverAddress.slice(2).padStart(64, '0')}")`);
    console.log(`   Receiver: await receiver.setPeer(40267, "0x${senderAddress.slice(2).padStart(64, '0')}")`);
    
    console.log(`\\n3. 🧪 Test Cross-Chain Message:`);
    console.log(`   On Polygon Amoy: await senderContract.syncData({value: fee})`);
    console.log(`   Monitor Base Sepolia: await receiverContract.getStats()`);
    
    console.log(`\\n4. 🖥️  Update Frontend:`);
    console.log(`   Network: Base Sepolia (Chain ID: 84532)`);
    console.log(`   Contract: ${receiverAddress}`);
    console.log(`   RPC: https://sepolia.base.org`);
    
    console.log(`\\n5. 📊 Monitor Data Sync:`);
    console.log(`   await receiverContract.hasRecentData()`);
    console.log(`   await receiverContract.isHealthy()`);
    console.log(`   await receiverContract.getStats()`);
    
    console.log(`\\n🎉 LayerZero Receiver deployment complete!`);
    console.log(`📍 Contract: ${receiverAddress}`);
    console.log(`🔗 Explorer: ${BASE_SEPOLIA_CONFIG.explorerUrl}/address/${receiverAddress}`);
    console.log(`🌐 Ready for cross-chain data from Polygon Amoy!`);
    
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

module.exports = { main, BASE_SEPOLIA_CONFIG };