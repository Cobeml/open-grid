const { ethers } = require("hardhat");

const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";

async function waitForAutomaticExecution() {
    console.log("=== WAITING FOR AUTOMATIC LAYERZERO EXECUTION ===");
    console.log("Sometimes LayerZero testnets take 30+ minutes for automatic execution");
    console.log("This is normal behavior on testnets due to lower executor frequency");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 60; // 60 * 30 seconds = 30 minutes
    
    console.log("Monitoring for automatic execution...");
    console.log("Checking every 30 seconds for up to 30 minutes");
    
    while (attempts < maxAttempts) {
        try {
            const nodeCount = await receiver.nodeCount();
            const totalSyncs = await receiver.totalSyncsReceived();
            
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] Check ${attempts + 1}/${maxAttempts}: Nodes=${nodeCount}, Syncs=${totalSyncs}`);
            
            if (nodeCount > 0) {
                console.log(`\n🎉 SUCCESS! ${nodeCount} nodes have been automatically executed!`);
                console.log(`📍 Contract: ${RECEIVER_ADDRESS_BASE}`);
                console.log(`🌐 Your frontend is now ready!`);
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                console.log("⏳ Waiting 30 seconds...");
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            attempts++;
            
        } catch (error) {
            console.error(`Error on attempt ${attempts + 1}:`, error.message);
            attempts++;
            
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
    }
    
    console.log("\n⚠️ Automatic execution hasn't completed yet");
    console.log("💡 This can happen on testnets - LayerZero executors run less frequently");
    console.log("🔄 You can run this script again to continue monitoring");
    
    return false;
}

async function quickStatus() {
    console.log("=== CURRENT STATUS ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = ["function nodeCount() external view returns (uint256)"];
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    try {
        const nodeCount = await receiver.nodeCount();
        console.log(`Current node count: ${nodeCount}`);
        
        if (nodeCount > 0) {
            console.log("✅ Execution completed!");
            return true;
        } else {
            console.log("⏳ Still waiting for execution");
            return false;
        }
    } catch (error) {
        console.error("Error checking status:", error.message);
        return false;
    }
}

async function main() {
    console.log("LAYERZERO AUTOMATIC EXECUTION MONITOR");
    console.log("====================================");
    console.log("Transaction: 0xe32de19942723ca70fe3cd3360833273b2bb0590eedf66a1267ffbefca7f0732");
    console.log("Status: Verified and waiting for executor");
    
    // Quick check first
    const alreadyExecuted = await quickStatus();
    
    if (alreadyExecuted) {
        console.log("🎉 Already executed! No need to wait.");
        return;
    }
    
    console.log("\n💡 RECOMMENDED APPROACH:");
    console.log("LayerZero testnets can be slow. The message is verified and will execute automatically.");
    console.log("Typical wait time: 5-60 minutes on testnets");
    console.log("Mainnet is much faster (2-5 minutes)");
    
    console.log("\n🔍 MONITOR OPTIONS:");
    console.log("1. Run this script to monitor automatically");
    console.log("2. Check periodically: npx hardhat run scripts/quickCheck.js");
    console.log("3. View on LayerZero Scan: https://layerzeroscan.com");
    
    const shouldMonitor = true; // Set to true to start monitoring
    
    if (shouldMonitor) {
        await waitForAutomaticExecution();
    }
}

main().catch(console.error);