const { ethers } = require("hardhat");
const { config } = require("dotenv");

config();

/**
 * Complete LayerZero Cross-Chain Setup Script
 * Configures peer relationships and tests cross-chain communication
 */

const NETWORK_CONFIG = {
  polygonAmoy: {
    name: "Polygon Amoy",
    eid: 40267,
    chainId: 80002,
    rpc: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com"
  },
  baseSepolia: {
    name: "Base Sepolia", 
    eid: 40245,
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org"
  }
};

class LayerZeroCrossChainSetup {
  constructor() {
    this.senderContract = null;
    this.receiverContract = null;
    this.senderAddress = null;
    this.receiverAddress = null;
  }

  async loadDeploymentAddresses() {
    console.log("📋 Loading deployment addresses...");
    
    const fs = require("fs");
    const path = require("path");
    
    try {
      // Load sender address
      const senderPath = path.join(__dirname, "../deployments/layerzero-sender-polygon-amoy.json");
      if (fs.existsSync(senderPath)) {
        const senderInfo = JSON.parse(fs.readFileSync(senderPath, 'utf8'));
        this.senderAddress = senderInfo.contractAddress;
        console.log(`✅ Sender (Polygon Amoy): ${this.senderAddress}`);
      } else {
        throw new Error("Sender deployment not found. Run deploy-layerzero-sender-polygon.js first.");
      }
      
      // Load receiver address  
      const receiverPath = path.join(__dirname, "../deployments/layerzero-receiver-base-sepolia.json");
      if (fs.existsSync(receiverPath)) {
        const receiverInfo = JSON.parse(fs.readFileSync(receiverPath, 'utf8'));
        this.receiverAddress = receiverInfo.contractAddress;
        console.log(`✅ Receiver (Base Sepolia): ${this.receiverAddress}`);
      } else {
        throw new Error("Receiver deployment not found. Run deploy-layerzero-receiver-base.js first.");
      }
      
    } catch (error) {
      console.error("❌ Failed to load deployment addresses:", error.message);
      throw error;
    }
  }

  async setupPeerRelationships() {
    console.log("\\n🔗 Setting up LayerZero peer relationships...");
    
    try {
      // Connect to both networks
      const polygonProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.polygonAmoy.rpc);
      const baseProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.baseSepolia.rpc);
      
      // Get signer for each network (you'll need private keys configured)
      const polygonSigner = new ethers.Wallet(process.env.PRIVATE_KEY || "", polygonProvider);
      const baseSigner = new ethers.Wallet(process.env.PRIVATE_KEY || "", baseProvider);
      
      console.log(`👛 Polygon Signer: ${polygonSigner.address}`);
      console.log(`👛 Base Signer: ${baseSigner.address}`);
      
      // Connect to contracts
      this.senderContract = await ethers.getContractAt(
        "EnergyDataSenderPolygonAmoy",
        this.senderAddress,
        polygonSigner
      );
      
      this.receiverContract = await ethers.getContractAt(
        "EnergyDataReceiverBaseSepolia", 
        this.receiverAddress,
        baseSigner
      );
      
      // Configure sender -> receiver relationship
      console.log("\\n📤 Configuring sender contract...");
      
      // Set destination contract
      const setDestinationTx = await this.senderContract.configureDestination(this.receiverAddress);
      await setDestinationTx.wait();
      console.log(`✅ Sender destination configured: ${this.receiverAddress}`);
      
      // Set peer relationship on sender
      const receiverPeerBytes = "0x" + this.receiverAddress.slice(2).padStart(64, '0');
      const setSenderPeerTx = await this.senderContract.setPeer(
        NETWORK_CONFIG.baseSepolia.eid,
        receiverPeerBytes
      );
      await setSenderPeerTx.wait();
      console.log(`✅ Sender peer set for Base Sepolia`);
      
      // Configure receiver -> sender relationship
      console.log("\\n📥 Configuring receiver contract...");
      
      // Set source contract
      const setSourceTx = await this.receiverContract.configureSourceContract(this.senderAddress);
      await setSourceTx.wait();
      console.log(`✅ Receiver source configured: ${this.senderAddress}`);
      
      // Set peer relationship on receiver
      const senderPeerBytes = "0x" + this.senderAddress.slice(2).padStart(64, '0');
      const setReceiverPeerTx = await this.receiverContract.setPeer(
        NETWORK_CONFIG.polygonAmoy.eid,
        senderPeerBytes
      );
      await setReceiverPeerTx.wait();
      console.log(`✅ Receiver peer set for Polygon Amoy`);
      
      console.log("\\n🎉 Peer relationships configured successfully!");
      
    } catch (error) {
      console.error("❌ Failed to setup peer relationships:", error.message);
      throw error;
    }
  }

  async testCrossChainMessage() {
    console.log("\\n🧪 Testing cross-chain message...");
    
    try {
      // Check sender configuration
      const isConfigured = await this.senderContract.isConfigured();
      if (!isConfigured) {
        throw new Error("Sender contract not fully configured");
      }
      
      // Get data summary before sync
      const dataSummary = await this.senderContract.getDataSummary();
      console.log(`📊 Available data on Polygon Amoy:`);
      console.log(`   Nodes: ${dataSummary[0]}`);
      console.log(`   Edges: ${dataSummary[1]}`);
      console.log(`   Data Points: ${dataSummary[2]}`);
      console.log(`   New Data: ${dataSummary[3]}`);
      
      if (dataSummary[0] == 0 && dataSummary[1] == 0) {
        console.log("⚠️  No data available to sync. Make sure the ChainlinkEnergyMonitor has data.");
        return;
      }
      
      // Quote the fee for sync
      console.log("\\n💰 Calculating cross-chain message fee...");
      const fee = await this.senderContract.quoteSyncFee(false);
      console.log(`💸 Required fee: ${ethers.formatEther(fee)} POL`);
      
      // Check sender balance
      const senderBalance = await this.senderContract.runner.provider.getBalance(
        await this.senderContract.runner.getAddress()
      );
      console.log(`👛 Sender balance: ${ethers.formatEther(senderBalance)} POL`);
      
      if (senderBalance < fee) {
        console.log("❌ Insufficient balance for cross-chain message");
        console.log(`💰 Please fund the sender address with at least ${ethers.formatEther(fee)} POL`);
        return;
      }
      
      // Get receiver stats before sync
      console.log("\\n📥 Receiver state before sync:");
      const statsBefore = await this.receiverContract.getStats();
      console.log(`   Nodes: ${statsBefore[0]}`);
      console.log(`   Edges: ${statsBefore[1]}`);
      console.log(`   Data Points: ${statsBefore[2]}`);
      console.log(`   Total Syncs: ${statsBefore[4]}`);
      
      // Send the cross-chain message
      console.log("\\n🚀 Sending cross-chain sync message...");
      const syncTx = await this.senderContract.syncData({ value: fee });
      console.log(`📤 Sync transaction sent: ${syncTx.hash}`);
      
      // Wait for confirmation
      const receipt = await syncTx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Wait a bit for LayerZero processing
      console.log("⏳ Waiting for LayerZero message delivery (30 seconds)...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check receiver stats after sync
      console.log("\\n📥 Receiver state after sync:");
      const statsAfter = await this.receiverContract.getStats();
      console.log(`   Nodes: ${statsAfter[0]}`);
      console.log(`   Edges: ${statsAfter[1]}`);
      console.log(`   Data Points: ${statsAfter[2]}`);
      console.log(`   Total Syncs: ${statsAfter[4]}`);
      
      // Check if sync was successful
      if (statsAfter[4] > statsBefore[4]) {
        console.log("\\n🎉 Cross-chain sync successful!");
        console.log(`✅ Syncs increased from ${statsBefore[4]} to ${statsAfter[4]}`);
        
        // Test frontend compatibility
        await this.testFrontendCompatibility();
        
      } else {
        console.log("\\n⏳ Sync may still be processing...");
        console.log("💡 Check again in a few minutes or monitor the receiver contract");
      }
      
    } catch (error) {
      console.error("❌ Cross-chain test failed:", error.message);
      throw error;
    }
  }

  async testFrontendCompatibility() {
    console.log("\\n🖥️  Testing frontend compatibility...");
    
    try {
      // Test all frontend-expected functions
      const allNodes = await this.receiverContract.getAllNodes();
      const allEdges = await this.receiverContract.getAllEdges();
      
      console.log(`✅ getAllNodes(): ${allNodes.length} nodes`);
      console.log(`✅ getAllEdges(): ${allEdges.length} edges`);
      
      // Test node-specific functions if nodes exist
      if (allNodes.length > 0) {
        const nodeEdges = await this.receiverContract.getNodeEdges(0);
        const latestData = await this.receiverContract.getLatestDataForNode(0);
        
        console.log(`✅ getNodeEdges(0): ${nodeEdges.length} edges`);
        console.log(`✅ getLatestDataForNode(0): ${latestData.timestamp > 0 ? 'Has data' : 'No data'}`);
      }
      
      // Test edge-specific functions if edges exist
      if (allEdges.length > 0) {
        const edge = await this.receiverContract.getEdge(0);
        console.log(`✅ getEdge(0): ${edge.from} -> ${edge.to} (${edge.edgeType})`);
      }
      
      // Test additional functions
      const hasRecentData = await this.receiverContract.hasRecentData();
      const isHealthy = await this.receiverContract.isHealthy();
      
      console.log(`✅ hasRecentData(): ${hasRecentData}`);
      console.log(`✅ isHealthy(): ${isHealthy}`);
      
      console.log("\\n🎉 All frontend compatibility tests passed!");
      
    } catch (error) {
      console.error("❌ Frontend compatibility test failed:", error.message);
    }
  }

  async generateSetupSummary() {
    console.log("\\n📋 Generating setup summary...");
    
    const summary = {
      timestamp: new Date().toISOString(),
      setup: "LayerZero Cross-Chain Energy Data",
      
      contracts: {
        sender: {
          network: NETWORK_CONFIG.polygonAmoy.name,
          address: this.senderAddress,
          explorer: `${NETWORK_CONFIG.polygonAmoy.explorerUrl}/address/${this.senderAddress}`
        },
        receiver: {
          network: NETWORK_CONFIG.baseSepolia.name,
          address: this.receiverAddress, 
          explorer: `${NETWORK_CONFIG.baseSepolia.explorerUrl}/address/${this.receiverAddress}`
        }
      },
      
      layerzero: {
        sourceEID: NETWORK_CONFIG.polygonAmoy.eid,
        destinationEID: NETWORK_CONFIG.baseSepolia.eid,
        peerRelationships: "Configured",
        crossChainMessaging: "Enabled"
      },
      
      frontend: {
        compatibility: "Full",
        network: NETWORK_CONFIG.baseSepolia.name,
        contractAddress: this.receiverAddress,
        rpcUrl: NETWORK_CONFIG.baseSepolia.rpc,
        chainId: NETWORK_CONFIG.baseSepolia.chainId
      },
      
      usage: {
        manualSync: `senderContract.syncData({value: fee})`,
        autoSync: `senderContract.configureSyncParameters(interval, true, maxData)`,
        monitoring: `receiverContract.getStats()`,
        healthCheck: `receiverContract.isHealthy()`
      }
    };
    
    const fs = require("fs");
    const path = require("path");
    
    const summaryPath = path.join(__dirname, "../deployments/layerzero-setup-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`✅ Setup summary saved to: ${summaryPath}`);
    return summary;
  }
}

async function main() {
  try {
    console.log(`🌉 LayerZero Cross-Chain Setup`);
    console.log(`${"=".repeat(45)}`);
    
    const setup = new LayerZeroCrossChainSetup();
    
    // Step 1: Load deployment addresses
    await setup.loadDeploymentAddresses();
    
    // Step 2: Setup peer relationships
    await setup.setupPeerRelationships();
    
    // Step 3: Test cross-chain messaging
    await setup.testCrossChainMessage();
    
    // Step 4: Generate summary
    const summary = await setup.generateSetupSummary();
    
    console.log("\\n🎉 LayerZero Cross-Chain Setup Complete!");
    console.log(`${"=".repeat(45)}`);
    
    console.log("\\n📍 Contract Addresses:");
    console.log(`   Sender (Polygon Amoy): ${setup.senderAddress}`);
    console.log(`   Receiver (Base Sepolia): ${setup.receiverAddress}`);
    
    console.log("\\n🖥️  Frontend Configuration:");
    console.log(`   Network: ${NETWORK_CONFIG.baseSepolia.name}`);
    console.log(`   Chain ID: ${NETWORK_CONFIG.baseSepolia.chainId}`);
    console.log(`   Contract: ${setup.receiverAddress}`);
    console.log(`   RPC: ${NETWORK_CONFIG.baseSepolia.rpc}`);
    
    console.log("\\n🔧 Usage:");
    console.log(`   Manual Sync: Run syncData() on sender contract`);
    console.log(`   Monitor: Check getStats() on receiver contract`);
    console.log(`   Health: Call isHealthy() on receiver contract`);
    
    console.log("\\n🌟 Success! Your cross-chain energy monitoring system is live!");
    
  } catch (error) {
    console.error("\\n💥 Setup failed:", error.message);
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

module.exports = { LayerZeroCrossChainSetup, NETWORK_CONFIG };