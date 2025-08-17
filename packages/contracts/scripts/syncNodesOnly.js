const { ethers } = require("hardhat");

const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";

async function syncNodes() {
    console.log("=== SYNCING 27 NODES TO BASE SEPOLIA ===");
    
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
        const dataSummary = await sender.getDataSummary();
        console.log(`Ready to sync:`);
        console.log(`- Nodes: ${dataSummary[0]}`);
        console.log(`- Edges: ${dataSummary[1]}`);
        console.log(`- Data points: ${dataSummary[2]}`);
        
        const fee = await sender.quoteSyncFee(false);
        console.log(`\nSync fee: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient POL balance");
            return false;
        }
        
        console.log("\n🚀 Initiating cross-chain sync...");
        const tx = await sender.syncData({ value: fee });
        console.log(`Transaction hash: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Sync transaction confirmed! Block: ${receipt.blockNumber}`);
        
        console.log("\n⏳ Cross-chain message sent via LayerZero...");
        console.log("This will take 2-5 minutes to reach Base Sepolia");
        
        return true;
        
    } catch (error) {
        console.error("Error syncing nodes:", error.message);
        return false;
    }
}

async function monitorReceiver() {
    console.log("\n=== MONITORING BASE SEPOLIA RECEIVER ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 20; // 20 * 20 seconds = ~7 minutes
    
    while (attempts < maxAttempts) {
        try {
            const nodeCount = await receiver.nodeCount();
            const totalSyncs = await receiver.totalSyncsReceived();
            
            console.log(`Check ${attempts + 1}: Nodes=${nodeCount}, TotalSyncs=${totalSyncs}`);
            
            if (nodeCount > 0) {
                console.log(`\n🎉 SUCCESS! ${nodeCount} nodes received on Base Sepolia!`);
                console.log(`📍 Contract: ${RECEIVER_ADDRESS_BASE}`);
                console.log(`🌐 Your frontend can now display the node data!`);
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                console.log("Waiting 20 seconds...");
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Error checking receiver:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Message may still be in transit. Check manually later.");
    return false;
}

async function main() {
    console.log("CROSS-CHAIN NODE SYNC");
    console.log("====================");
    
    const syncSuccess = await syncNodes();
    
    if (syncSuccess) {
        await monitorReceiver();
    }
    
    console.log("\n=== NEXT STEPS ===");
    console.log("1. ✅ Nodes should now be available on Base Sepolia");
    console.log("2. 🔧 Fix Chainlink Functions code for energy data");
    console.log("3. 🔄 Later: Generate energy data and sync again");
}

main().catch(console.error);