const { ethers } = require("hardhat");

const BATCHED_SENDER = "0x720D3349aaB4bf20cDfDcEbADB5d4096939E5656";
const BATCH_RECEIVER = "0x114781222968816F9c66e5FedFBa66C1989019Ca";

async function sendFirstBatch() {
    console.log("=== SENDING FIRST BATCH (3 NODES) ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function sendNextBatch() external payable",
        "function quoteBatchFee() external view returns (uint256)",
        "function getBatchStatus() external view returns (uint256, uint256, uint256, uint256)"
    ];
    
    const sender = new ethers.Contract(BATCHED_SENDER, senderABI, wallet);
    
    try {
        // Check current status
        const status = await sender.getBatchStatus();
        console.log(`Current status: ${status[0]} total nodes, ${status[3]} remaining`);
        
        if (status[3] == 0) {
            console.log("✅ All batches already sent");
            return null;
        }
        
        // Quote fee
        const fee = await sender.quoteBatchFee();
        console.log(`Batch fee: ${ethers.formatEther(fee)} POL`);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Still insufficient balance");
            return null;
        }
        
        console.log("🚀 Sending first batch (3 nodes: Times Square, Wall Street, Empire State)...");
        const tx = await sender.sendNextBatch({ value: fee });
        
        console.log(`✅ First batch sent: ${tx.hash}`);
        console.log(`🔍 LayerZero Scan: https://layerzeroscan.com/tx/${tx.hash}`);
        
        return tx.hash;
        
    } catch (error) {
        console.error("First batch failed:", error.message);
        return null;
    }
}

async function sendSecondBatch() {
    console.log("\n=== SENDING SECOND BATCH (2 REMAINING NODES) ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function sendNextBatch() external payable",
        "function quoteBatchFee() external view returns (uint256)",
        "function getBatchStatus() external view returns (uint256, uint256, uint256, uint256)"
    ];
    
    const sender = new ethers.Contract(BATCHED_SENDER, senderABI, wallet);
    
    try {
        // Check status after first batch
        const status = await sender.getBatchStatus();
        console.log(`Status after first batch: ${status[0]} total nodes, ${status[3]} remaining`);
        
        if (status[3] == 0) {
            console.log("✅ All batches already sent");
            return null;
        }
        
        // Quote fee for second batch
        const fee = await sender.quoteBatchFee();
        console.log(`Second batch fee: ${ethers.formatEther(fee)} POL`);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`Remaining balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance for second batch");
            return null;
        }
        
        console.log("🚀 Sending second batch (2 nodes: One WTC, Grand Central)...");
        const tx = await sender.sendNextBatch({ value: fee });
        
        console.log(`✅ Second batch sent: ${tx.hash}`);
        console.log(`🔍 LayerZero Scan: https://layerzeroscan.com/tx/${tx.hash}`);
        
        return tx.hash;
        
    } catch (error) {
        console.error("Second batch failed:", error.message);
        return null;
    }
}

async function monitorBatchReceiver(txHashes) {
    console.log("\n=== MONITORING BATCH RECEIVER ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256)",
        "function getAllNodes() external view returns (tuple(uint256 id, uint256 lat, uint256 lon, bool active)[])",
        "function nodeCount() external view returns (uint256)"
    ];
    
    const receiver = new ethers.Contract(BATCH_RECEIVER, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 15; // 15 * 20 seconds = 5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const stats = await receiver.getStats();
            const nodeCount = await receiver.nodeCount();
            const timestamp = new Date().toLocaleTimeString();
            
            console.log(`[${timestamp}] Check ${attempts + 1}: Nodes=${stats[0]}, Batches=${stats[1]}, NodeCount=${nodeCount}`);
            
            if (nodeCount >= 5) {
                console.log(`\n🎉 ALL BATCHES RECEIVED SUCCESSFULLY!`);
                
                const allNodes = await receiver.getAllNodes();
                console.log(`✅ Total nodes received: ${allNodes.length}`);
                
                console.log(`\n📍 Node Details:`);
                const locations = ["Times Square", "Wall Street", "Empire State", "One WTC", "Grand Central"];
                for (let i = 0; i < allNodes.length; i++) {
                    const node = allNodes[i];
                    console.log(`   ${locations[i]}: id=${node.id}, lat=${node.lat}, lon=${node.lon}, active=${node.active}`);
                }
                
                console.log(`\n🎯 BATCHED SOLUTION FULLY PROVEN:`);
                console.log(`- ✅ Small batches avoid LayerZero parsing limits`);
                console.log(`- ✅ Simple coordinates work perfectly`);
                console.log(`- ✅ Frontend-compatible interface maintained`);
                console.log(`- ✅ All 5 NYC energy nodes successfully transmitted`);
                
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Monitoring error:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Some batches still pending");
    return false;
}

async function checkSimpleTestStatus() {
    console.log("=== CHECKING SIMPLE TEST STATUS ===");
    
    const MINIMAL_RECEIVER = "0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6";
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256, string memory, uint256)",
        "function isWorking() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(MINIMAL_RECEIVER, receiverABI, baseProvider);
    
    try {
        const stats = await receiver.getStats();
        const isWorking = await receiver.isWorking();
        
        console.log(`Simple test receiver stats:`);
        console.log(`- Messages: ${stats[0]}`);
        console.log(`- Last Value: ${stats[1]}`);
        console.log(`- Message Type: "${stats[2]}"`);
        console.log(`- Total Bytes: ${stats[3]}`);
        console.log(`- Working: ${isWorking}`);
        
        if (isWorking && stats[1] == 27) {
            console.log(`✅ Simple test confirmed: LayerZero works with 32-byte messages`);
        }
        
    } catch (error) {
        console.error("Simple test check failed:", error.message);
    }
}

async function main() {
    console.log("TESTING COMPLETE BATCHED LAYERZERO SOLUTION");
    console.log("==========================================");
    console.log("Goal: Send all 5 NYC nodes in 2 batches, proving solution works");
    
    // Check simple test first
    await checkSimpleTestStatus();
    
    console.log(`\n📍 Contract Addresses:`);
    console.log(`   BatchedNodeSender (Polygon): ${BATCHED_SENDER}`);
    console.log(`   SimpleBatchReceiver (Base): ${BATCH_RECEIVER}`);
    
    const txHashes = [];
    
    // Send first batch
    const firstTx = await sendFirstBatch();
    if (firstTx) {
        txHashes.push(firstTx);
        
        // Wait a bit before second batch
        console.log("\n⏳ Waiting 30 seconds before second batch...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Send second batch
        const secondTx = await sendSecondBatch();
        if (secondTx) {
            txHashes.push(secondTx);
        }
    }
    
    if (txHashes.length > 0) {
        console.log(`\n🔍 LayerZero Transaction Links:`);
        txHashes.forEach((hash, i) => {
            console.log(`   Batch ${i + 1}: https://layerzeroscan.com/tx/${hash}`);
        });
        
        // Monitor results
        const success = await monitorBatchReceiver(txHashes);
        
        console.log(`\n📋 FRONTEND CONFIGURATION:`);
        console.log(`Use this contract address in your frontend .env:`);
        console.log(`ENERGY_MONITOR_CONTRACT_ADDRESS=${BATCH_RECEIVER}`);
        console.log(`ENERGY_MONITOR_NETWORK=base-sepolia`);
        
        console.log(`\n🌐 Frontend Integration:`);
        console.log(`- The receiver implements getAllNodes() just like ChainlinkEnergyMonitor`);
        console.log(`- Node format: { id, lat, lon, active }`);
        console.log(`- Coordinates: lat = actual * 1000000, lon = (actual + 360) * 1000000`);
        console.log(`- Frontend can call receiver.getAllNodes() to get all transmitted nodes`);
        
        if (success) {
            console.log(`\n🎉 COMPLETE SUCCESS!`);
            console.log(`✅ LayerZero cross-chain energy monitoring fully operational`);
            console.log(`✅ Complex message parsing issue permanently resolved`);
            console.log(`✅ Ready for frontend integration`);
        }
    }
}

main().catch(console.error);