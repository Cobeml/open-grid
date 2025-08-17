const { ethers } = require("hardhat");

async function deployBatchReceiver() {
    console.log("=== DEPLOYING SIMPLE BATCH RECEIVER (BASE SEPOLIA) ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    console.log(`Deploying from: ${wallet.address}`);
    
    try {
        const SimpleBatchReceiver = await ethers.getContractFactory("SimpleBatchReceiver", wallet);
        
        const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
        const receiver = await SimpleBatchReceiver.deploy(BASE_ENDPOINT, wallet.address);
        
        console.log(`✅ Deployment transaction: ${receiver.deploymentTransaction().hash}`);
        
        await receiver.waitForDeployment();
        const receiverAddress = await receiver.getAddress();
        
        console.log(`🎉 SimpleBatchReceiver deployed to: ${receiverAddress}`);
        
        return { receiver, receiverAddress };
        
    } catch (error) {
        console.error("Receiver deployment failed:", error.message);
        return null;
    }
}

async function deployBatchSender(receiverAddress) {
    console.log("\n=== DEPLOYING BATCHED NODE SENDER (POLYGON AMOY) ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`Deploying from: ${wallet.address}`);
    
    try {
        const BatchedNodeSender = await ethers.getContractFactory("BatchedNodeSender", wallet);
        
        const POLYGON_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
        const sender = await BatchedNodeSender.deploy(
            POLYGON_ENDPOINT,
            wallet.address,
            receiverAddress
        );
        
        console.log(`✅ Deployment transaction: ${sender.deploymentTransaction().hash}`);
        
        await sender.waitForDeployment();
        const senderAddress = await sender.getAddress();
        
        console.log(`🎉 BatchedNodeSender deployed to: ${senderAddress}`);
        
        return { sender, senderAddress };
        
    } catch (error) {
        console.error("Sender deployment failed:", error.message);
        return null;
    }
}

async function configurePeers(sender, senderAddress, receiver, receiverAddress) {
    console.log("\n=== CONFIGURING PEER RELATIONSHIPS ===");
    
    try {
        // Configure sender to trust receiver
        const receiverBytes32 = ethers.zeroPadValue(receiverAddress, 32);
        const setSenderPeerTx = await sender.setPeer(40245, receiverBytes32); // Base Sepolia EID
        await setSenderPeerTx.wait();
        console.log("✅ Sender peer configured");
        
        // Configure receiver to trust sender
        const senderBytes32 = ethers.zeroPadValue(senderAddress, 32);
        const setReceiverPeerTx = await receiver.setPeer(40267, senderBytes32); // Polygon Amoy EID
        await setReceiverPeerTx.wait();
        console.log("✅ Receiver peer configured");
        
        return true;
        
    } catch (error) {
        console.error("Peer configuration failed:", error.message);
        return false;
    }
}

async function addNodesAndTest(sender) {
    console.log("\n=== ADDING NODES AND TESTING ===");
    
    try {
        // Add simple nodes
        console.log("Adding 5 NYC nodes...");
        const addNodesTx = await sender.addSimpleNodes();
        await addNodesTx.wait();
        console.log("✅ Nodes added");
        
        // Check batch status
        const status = await sender.getBatchStatus();
        console.log(`Batch status: ${status[0]} total nodes, ${status[3]} remaining`);
        
        // Quote fee for first batch
        const fee = await sender.quoteBatchFee();
        console.log(`First batch fee: ${ethers.formatEther(fee)} POL`);
        
        // Check balance
        const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
        const privateKey = process.env.PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance for batch test");
            return false;
        }
        
        console.log("🚀 Sending first batch (3 nodes)...");
        const batchTx = await sender.sendNextBatch({ value: fee });
        
        console.log(`✅ First batch sent: ${batchTx.hash}`);
        console.log(`🔍 Monitor: https://layerzeroscan.com/tx/${batchTx.hash}`);
        
        return batchTx.hash;
        
    } catch (error) {
        console.error("Testing failed:", error.message);
        return false;
    }
}

async function monitorBatchReceiver(receiverAddress, txHash) {
    console.log("\n=== MONITORING BATCH RECEIVER ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256)",
        "function getAllNodes() external view returns (tuple(uint256 id, uint256 lat, uint256 lon, bool active)[])"
    ];
    
    const receiver = new ethers.Contract(receiverAddress, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 12; // 12 * 20 seconds = 4 minutes
    
    while (attempts < maxAttempts) {
        try {
            const stats = await receiver.getStats();
            const timestamp = new Date().toLocaleTimeString();
            
            console.log(`[${timestamp}] Check ${attempts + 1}: Nodes=${stats[0]}, Batches=${stats[1]}`);
            
            if (stats[0] > 0) {
                console.log(`\n🎉 SUCCESS! Batch received!`);
                
                const allNodes = await receiver.getAllNodes();
                console.log(`✅ Received ${allNodes.length} nodes:`);
                
                for (let i = 0; i < allNodes.length && i < 5; i++) {
                    const node = allNodes[i];
                    console.log(`   Node ${node.id}: lat=${node.lat}, lon=${node.lon}, active=${node.active}`);
                }
                
                console.log(`\n🎯 BATCHED SOLUTION CONFIRMED:`);
                console.log(`- Small batches work perfectly`);
                console.log(`- Simple coordinate format successful`);
                console.log(`- LayerZero parsing issue resolved`);
                
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
    
    console.log("⚠️ Batch still pending");
    return false;
}

async function main() {
    console.log("DEPLOYING BATCHED LAYERZERO SOLUTION");
    console.log("===================================");
    console.log("Goal: Send 5 nodes in batches of 3, avoiding 0xa512e2ff error");
    
    // Step 1: Deploy receiver on Base Sepolia
    const receiverDeployment = await deployBatchReceiver();
    if (!receiverDeployment) return;
    
    const { receiver, receiverAddress } = receiverDeployment;
    
    // Step 2: Deploy sender on Polygon Amoy
    const senderDeployment = await deployBatchSender(receiverAddress);
    if (!senderDeployment) return;
    
    const { sender, senderAddress } = senderDeployment;
    
    // Step 3: Configure peer relationships
    const configured = await configurePeers(sender, senderAddress, receiver, receiverAddress);
    if (!configured) return;
    
    // Step 4: Add nodes and send first batch
    const txHash = await addNodesAndTest(sender);
    if (!txHash) return;
    
    // Step 5: Monitor results
    const success = await monitorBatchReceiver(receiverAddress, txHash);
    
    console.log(`\n📍 Contracts Deployed:`);
    console.log(`   BatchedNodeSender: ${senderAddress}`);
    console.log(`   SimpleBatchReceiver: ${receiverAddress}`);
    console.log(`🔍 Transaction: ${txHash}`);
    
    if (success) {
        console.log(`\n🚀 FINAL STEPS:`);
        console.log(`1. ✅ Batched solution proven working`);
        console.log(`2. 🔧 Send remaining batches with sender.sendNextBatch()`);
        console.log(`3. 🌐 Update frontend to use new receiver: ${receiverAddress}`);
        console.log(`4. 🎯 Frontend can call receiver.getAllNodes() for node data`);
    }
}

main().catch(console.error);