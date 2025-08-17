const { ethers } = require("hardhat");

// Contract addresses
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const CHAINLINK_MONITOR_ADDRESS = "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB";

// Chainlink Functions subscription ID for Polygon Amoy
const SUBSCRIPTION_ID = "477"; // User's actual subscription ID

async function triggerEnergyDataGeneration() {
    console.log("=== STEP 1: GENERATING ENERGY DATA ===");
    
    // Connect to Polygon Amoy
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    // You'll need to provide your private key for the wallet that owns the ChainlinkEnergyMonitor
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const monitorABI = [
        "function requestDataUpdate(uint64 subscriptionId) external",
        "function dataCount() external view returns (uint256)",
        "function owner() external view returns (address)"
    ];
    
    const monitor = new ethers.Contract(CHAINLINK_MONITOR_ADDRESS, monitorABI, wallet);
    
    try {
        // Check if wallet is the owner
        const owner = await monitor.owner();
        console.log(`Contract Owner: ${owner}`);
        console.log(`Wallet Address: ${wallet.address}`);
        
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error("Wallet is not the owner of the ChainlinkEnergyMonitor contract");
        }
        
        const beforeDataCount = await monitor.dataCount();
        console.log(`Data count before: ${beforeDataCount}`);
        
        console.log("Requesting Chainlink Functions data update...");
        const tx = await monitor.requestDataUpdate(SUBSCRIPTION_ID);
        console.log(`Transaction hash: ${tx.hash}`);
        
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
        
        // Wait a bit for Chainlink Functions to respond
        console.log("Waiting 30 seconds for Chainlink Functions response...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const afterDataCount = await monitor.dataCount();
        console.log(`Data count after: ${afterDataCount}`);
        
        if (afterDataCount > beforeDataCount) {
            console.log("✅ Energy data successfully generated!");
            return true;
        } else {
            console.log("⚠️ No new data generated yet. Chainlink Functions might still be processing...");
            return false;
        }
        
    } catch (error) {
        console.error("Error generating energy data:", error.message);
        return false;
    }
}

async function triggerCrossChainSync() {
    console.log("\n=== STEP 2: TRIGGERING CROSS-CHAIN SYNC ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)",
        "function getDataSummary() external view returns (uint256 nodeCount, uint256 edgeCount, uint256 dataCount, uint256 newDataAvailable)",
        "function owner() external view returns (address)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, wallet);
    
    try {
        // Check data availability
        const dataSummary = await sender.getDataSummary();
        console.log(`Available data - Nodes: ${dataSummary[0]}, Edges: ${dataSummary[1]}, Data: ${dataSummary[2]}, New: ${dataSummary[3]}`);
        
        if (dataSummary[0] === 0n) {
            console.log("❌ No nodes available to sync");
            return false;
        }
        
        // Quote the fee
        const fee = await sender.quoteSyncFee(false);
        console.log(`Sync fee required: ${ethers.formatEther(fee)} POL`);
        
        // Check wallet balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient POL balance for sync fee");
            return false;
        }
        
        console.log("Triggering cross-chain sync...");
        const tx = await sender.syncData({ value: fee });
        console.log(`Transaction hash: ${tx.hash}`);
        
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
        console.log("✅ Cross-chain sync initiated!");
        
        return true;
        
    } catch (error) {
        console.error("Error triggering cross-chain sync:", error.message);
        return false;
    }
}

async function checkReceiverUpdate() {
    console.log("\n=== STEP 3: CHECKING RECEIVER CONTRACT ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)",
        "function hasRecentData() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    try {
        console.log("Waiting 60 seconds for cross-chain message delivery...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        const nodeCount = await receiver.nodeCount();
        const totalSyncs = await receiver.totalSyncsReceived();
        const hasRecentData = await receiver.hasRecentData();
        
        console.log(`Receiver node count: ${nodeCount}`);
        console.log(`Total syncs received: ${totalSyncs}`);
        console.log(`Has recent data: ${hasRecentData}`);
        
        if (nodeCount > 0) {
            console.log("✅ Cross-chain data successfully received!");
            return true;
        } else {
            console.log("⚠️ Cross-chain message might still be in transit...");
            return false;
        }
        
    } catch (error) {
        console.error("Error checking receiver:", error.message);
        return false;
    }
}

async function main() {
    console.log("TRIGGERING COMPLETE CROSS-CHAIN DATA FLOW");
    console.log("==========================================");
    
    try {
        // Step 1: Generate energy data using Chainlink Functions
        const dataGenerated = await triggerEnergyDataGeneration();
        
        if (!dataGenerated) {
            console.log("❌ Energy data generation failed or still pending. Please wait and check manually.");
            return;
        }
        
        // Step 2: Trigger cross-chain sync
        const syncTriggered = await triggerCrossChainSync();
        
        if (!syncTriggered) {
            console.log("❌ Cross-chain sync failed");
            return;
        }
        
        // Step 3: Check if receiver got the data
        await checkReceiverUpdate();
        
        console.log("\n=== PROCESS COMPLETE ===");
        console.log("If data hasn't appeared yet, it may still be processing.");
        console.log("LayerZero cross-chain messages can take several minutes to deliver.");
        
    } catch (error) {
        console.error("Error in main process:", error.message);
    }
}

// Handle the case where this is run directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { triggerEnergyDataGeneration, triggerCrossChainSync, checkReceiverUpdate };