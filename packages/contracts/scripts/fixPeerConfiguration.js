const { ethers } = require("hardhat");

const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";

async function fixReceiverPeerConfiguration() {
    console.log("=== FIXING RECEIVER PEER CONFIGURATION ===");
    
    // Connect to Base Sepolia
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    const oappABI = [
        "function setPeer(uint32 _eid, bytes32 _peer) external",
        "function peers(uint32 _eid) external view returns (bytes32)",
        "function owner() external view returns (address)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, oappABI, wallet);
    
    try {
        // Check current owner
        const owner = await receiver.owner();
        console.log(`Receiver contract owner: ${owner}`);
        console.log(`Wallet address: ${wallet.address}`);
        
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            console.log("❌ Wallet is not the owner of the receiver contract");
            console.log("You need to use the wallet that deployed the receiver contract");
            return false;
        }
        
        // Check current peer configuration
        const currentPeer = await receiver.peers(40267); // Polygon Amoy EID
        console.log(`Current peer for Polygon Amoy: ${currentPeer}`);
        
        // Convert sender address to bytes32
        const senderBytes32 = ethers.zeroPadValue(SENDER_ADDRESS_POLYGON, 32);
        console.log(`Setting peer to: ${senderBytes32}`);
        
        if (currentPeer === senderBytes32) {
            console.log("✅ Peer already configured correctly!");
            return true;
        }
        
        // Set the peer
        console.log("Setting receiver peer configuration...");
        const tx = await receiver.setPeer(40267, senderBytes32);
        console.log(`Transaction hash: ${tx.hash}`);
        
        console.log("Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`✅ Peer configuration updated! Block: ${receipt.blockNumber}`);
        
        // Verify the change
        const newPeer = await receiver.peers(40267);
        console.log(`New peer configuration: ${newPeer}`);
        
        if (newPeer === senderBytes32) {
            console.log("🎉 SUCCESS! Receiver peer correctly configured");
            return true;
        } else {
            console.log("❌ Peer configuration failed");
            return false;
        }
        
    } catch (error) {
        console.error("Error fixing peer configuration:", error.message);
        
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("❌ Only the contract owner can set peers");
        }
        
        return false;
    }
}

async function retryCrossChainSync() {
    console.log("\n=== RETRYING CROSS-CHAIN SYNC ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, wallet);
    
    try {
        const fee = await sender.quoteSyncFee(false);
        console.log(`Sync fee: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient POL balance");
            return false;
        }
        
        console.log("Sending new cross-chain sync...");
        const tx = await sender.syncData({ 
            value: fee,
            gasLimit: 1200000 // Higher gas limit
        });
        
        console.log(`New sync transaction: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ New sync sent! Block: ${receipt.blockNumber}`);
        
        return { success: true, txHash: tx.hash };
        
    } catch (error) {
        console.error("Error retrying sync:", error.message);
        return false;
    }
}

async function monitorNewSync(txHash) {
    if (!txHash) return;
    
    console.log("\n=== MONITORING NEW SYNC DELIVERY ===");
    console.log(`Monitoring transaction: ${txHash}`);
    console.log(`LayerZero Scan: https://layerzeroscan.com/tx/${txHash}`);
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 15; // 15 * 30 seconds = 7.5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const nodeCount = await receiver.nodeCount();
            const totalSyncs = await receiver.totalSyncsReceived();
            
            console.log(`Check ${attempts + 1}: Nodes=${nodeCount}, Syncs=${totalSyncs}`);
            
            if (nodeCount > 0) {
                console.log(`🎉 SUCCESS! ${nodeCount} nodes received on Base Sepolia!`);
                console.log(`📍 Contract: ${RECEIVER_ADDRESS_BASE}`);
                console.log(`🌐 Frontend should now work!`);
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                console.log("Waiting 30 seconds...");
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Error monitoring:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Still waiting... Check LayerZero Scan for status");
    return false;
}

async function main() {
    console.log("FIXING LAYERZERO PEER CONFIGURATION AND RETRYING");
    console.log("===============================================");
    
    // Step 1: Fix receiver peer configuration
    const peerFixed = await fixReceiverPeerConfiguration();
    
    if (!peerFixed) {
        console.log("❌ Could not fix peer configuration");
        console.log("Please ensure you're using the correct owner wallet");
        return;
    }
    
    // Step 2: Retry cross-chain sync
    const syncResult = await retryCrossChainSync();
    
    if (!syncResult || !syncResult.success) {
        console.log("❌ Could not retry sync");
        return;
    }
    
    // Step 3: Monitor for delivery
    await monitorNewSync(syncResult.txHash);
    
    console.log("\n=== PROCESS COMPLETE ===");
    console.log("The peer configuration has been fixed and a new sync sent.");
    console.log("Your frontend should receive the 27 nodes within 5-10 minutes.");
}

main().catch(console.error);