const { ethers } = require("hardhat");

const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const CHAINLINK_MONITOR_ADDRESS = "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB";

async function monitorForData() {
    console.log("=== MONITORING FOR CHAINLINK FUNCTIONS RESPONSE ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    const monitorABI = [
        "function dataCount() external view returns (uint256)"
    ];
    
    const monitor = new ethers.Contract(CHAINLINK_MONITOR_ADDRESS, monitorABI, provider);
    
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts x 15 seconds = 5 minutes max
    
    while (attempts < maxAttempts) {
        try {
            const dataCount = await monitor.dataCount();
            console.log(`Attempt ${attempts + 1}: Data count = ${dataCount}`);
            
            if (dataCount > 0) {
                console.log(`✅ Energy data detected! ${dataCount} data points generated.`);
                return true;
            }
            
            console.log("Waiting 15 seconds before next check...");
            await new Promise(resolve => setTimeout(resolve, 15000));
            attempts++;
            
        } catch (error) {
            console.error("Error checking data count:", error.message);
            attempts++;
        }
    }
    
    console.log("❌ Timeout: No data received after 5 minutes");
    return false;
}

async function triggerCrossChainSync() {
    console.log("\n=== TRIGGERING CROSS-CHAIN SYNC ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)",
        "function getDataSummary() external view returns (uint256 nodeCount, uint256 edgeCount, uint256 dataCount, uint256 newDataAvailable)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, wallet);
    
    try {
        // Check data availability
        const dataSummary = await sender.getDataSummary();
        console.log(`Available data - Nodes: ${dataSummary[0]}, Edges: ${dataSummary[1]}, Data: ${dataSummary[2]}, New: ${dataSummary[3]}`);
        
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
        
        console.log("Initiating cross-chain sync...");
        const tx = await sender.syncData({ value: fee });
        console.log(`Transaction hash: ${tx.hash}`);
        
        console.log("Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`✅ Cross-chain sync transaction confirmed! Block: ${receipt.blockNumber}`);
        
        return true;
        
    } catch (error) {
        console.error("Error triggering cross-chain sync:", error.message);
        return false;
    }
}

async function monitorReceiverContract() {
    console.log("\n=== MONITORING RECEIVER CONTRACT FOR DATA ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)",
        "function hasRecentData() external view returns (bool)",
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts x 20 seconds = 10 minutes max
    
    console.log("Monitoring for cross-chain message delivery...");
    
    while (attempts < maxAttempts) {
        try {
            const nodeCount = await receiver.nodeCount();
            const totalSyncs = await receiver.totalSyncsReceived();
            const hasRecentData = await receiver.hasRecentData();
            
            console.log(`Attempt ${attempts + 1}: Nodes=${nodeCount}, Syncs=${totalSyncs}, HasData=${hasRecentData}`);
            
            if (nodeCount > 0) {
                console.log(`🎉 SUCCESS! Cross-chain data received!`);
                console.log(`✅ ${nodeCount} nodes successfully transferred to Base Sepolia`);
                
                // Show first few nodes as confirmation
                const nodes = await receiver.getAllNodes();
                console.log(`\nFirst 3 nodes received:`);
                for (let i = 0; i < Math.min(3, nodes.length); i++) {
                    console.log(`  Node ${i}: ${nodes[i].location}, Active: ${nodes[i].active}`);
                }
                
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                console.log("Waiting 20 seconds before next check...");
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Error checking receiver:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Cross-chain message may still be in transit. LayerZero can take up to 10+ minutes.");
    console.log("You can check manually later by running: npx hardhat run scripts/checkContractStates.js");
    return false;
}

async function main() {
    console.log("MONITORING AND SYNC PROCESS");
    console.log("===========================");
    
    try {
        // Step 1: Wait for Chainlink Functions data
        const dataReceived = await monitorForData();
        
        if (!dataReceived) {
            console.log("❌ No data received from Chainlink Functions. Please check:");
            console.log("1. Subscription has sufficient LINK balance");
            console.log("2. Consumer is properly added");
            console.log("3. Check Chainlink Functions dashboard for errors");
            return;
        }
        
        // Step 2: Trigger cross-chain sync
        const syncTriggered = await triggerCrossChainSync();
        
        if (!syncTriggered) {
            console.log("❌ Cross-chain sync failed");
            return;
        }
        
        // Step 3: Monitor receiver contract
        await monitorReceiverContract();
        
        console.log("\n=== PROCESS COMPLETE ===");
        console.log("🎯 Your Base Sepolia receiver contract should now have the node data!");
        console.log(`📍 Contract address: ${RECEIVER_ADDRESS_BASE}`);
        console.log("🌐 Frontend should now be able to display the energy monitoring data.");
        
    } catch (error) {
        console.error("Error in monitoring process:", error.message);
    }
}

main().catch(console.error);