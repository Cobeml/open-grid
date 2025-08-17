const { ethers } = require("hardhat");

const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function diagnoseAndFixIssue() {
    console.log("=== DIAGNOSING SIMULATION REVERT ISSUE ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    // Check gas prices first
    const feeData = await baseProvider.getFeeData();
    console.log(`Base Sepolia Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
    
    // Check if message is still pending
    const endpointABI = [
        "function inboundNonce(address _receiver, uint32 _srcEid, bytes32 _sender) external view returns (uint64)",
        "function executable(address _receiver, uint32 _srcEid, bytes32 _sender, uint64 _nonce) external view returns (bool)",
        "function payloadHash(address _receiver, uint32 _srcEid, bytes32 _sender, uint64 _nonce) external view returns (bytes32)"
    ];
    
    const endpoint = new ethers.Contract(BASE_ENDPOINT, endpointABI, baseProvider);
    
    const srcEid = 40267; // Polygon Amoy
    const senderBytes32 = ethers.zeroPadValue(SENDER_ADDRESS_POLYGON, 32);
    
    try {
        const currentNonce = await endpoint.inboundNonce(RECEIVER_ADDRESS_BASE, srcEid, senderBytes32);
        const nextNonce = currentNonce + 1n;
        
        console.log(`Current nonce: ${currentNonce}`);
        console.log(`Checking nonce: ${nextNonce}`);
        
        const isExecutable = await endpoint.executable(RECEIVER_ADDRESS_BASE, srcEid, senderBytes32, nextNonce);
        const payloadHash = await endpoint.payloadHash(RECEIVER_ADDRESS_BASE, srcEid, senderBytes32, nextNonce);
        
        console.log(`Is executable: ${isExecutable}`);
        console.log(`Payload exists: ${payloadHash !== ethers.ZeroHash}`);
        
        if (!isExecutable || payloadHash === ethers.ZeroHash) {
            console.log("❌ Message not found or already executed");
            return false;
        }
        
        console.log("✅ Message is ready for execution");
        return true;
        
    } catch (error) {
        console.error("Error checking message status:", error.message);
        return false;
    }
}

async function tryAlternativeApproach() {
    console.log("\n=== ALTERNATIVE APPROACH: CLEAR AND RESEND ===");
    console.log("Since executor simulation is failing, let's try a different strategy:");
    
    console.log("\n💡 OPTION 1: Wait for Automatic Retry");
    console.log("- LayerZero automatically retries failed executions");
    console.log("- Can take several hours on testnets");
    console.log("- Most reliable approach");
    
    console.log("\n💡 OPTION 2: Send Fresh Message");
    console.log("- Clear any stuck state and send a new cross-chain message");
    console.log("- Bypasses the simulation issue");
    console.log("- Costs additional gas fees");
    
    console.log("\n💡 OPTION 3: Use LayerZero Scan Interface");
    console.log("- Visit: https://layerzeroscan.com");
    console.log("- Look for manual execution options in the UI");
    console.log("- Sometimes provides better error details");
    
    return true;
}

async function sendFreshMessage() {
    console.log("\n=== SENDING FRESH CROSS-CHAIN MESSAGE ===");
    console.log("This will bypass the stuck message and send a new sync");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)",
        "function resetSyncTracking() external",
        "function owner() external view returns (address)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, wallet);
    
    try {
        // Check if we're the owner
        const owner = await sender.owner();
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            console.log("❌ Not the contract owner, cannot reset sync tracking");
            return false;
        }
        
        console.log("Resetting sync tracking to clear any stuck state...");
        const resetTx = await sender.resetSyncTracking();
        await resetTx.wait();
        console.log("✅ Sync tracking reset");
        
        // Wait a bit to avoid nonce conflicts
        console.log("Waiting 10 seconds to avoid nonce conflicts...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Send fresh message
        const fee = await sender.quoteSyncFee(false);
        console.log(`Fresh sync fee: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        if (balance < fee) {
            console.log("❌ Insufficient balance for fresh sync");
            return false;
        }
        
        console.log("🚀 Sending fresh cross-chain message...");
        const tx = await sender.syncData({ 
            value: fee,
            gasLimit: 1000000 // Use conservative gas limit
        });
        
        console.log(`✅ Fresh message sent: ${tx.hash}`);
        console.log(`🔍 Monitor at: https://layerzeroscan.com/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`📦 Confirmed in block: ${receipt.blockNumber}`);
        
        return { success: true, txHash: tx.hash };
        
    } catch (error) {
        console.error("Error sending fresh message:", error.message);
        return false;
    }
}

async function monitorFreshMessage(txHash) {
    if (!txHash) return;
    
    console.log("\n=== MONITORING FRESH MESSAGE ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = ["function nodeCount() external view returns (uint256)"];
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 20; // 20 * 30 seconds = 10 minutes
    
    while (attempts < maxAttempts) {
        try {
            const nodeCount = await receiver.nodeCount();
            const timestamp = new Date().toLocaleTimeString();
            
            console.log(`[${timestamp}] Check ${attempts + 1}: Nodes=${nodeCount}`);
            
            if (nodeCount > 0) {
                console.log(`\n🎉 SUCCESS! Fresh message delivered ${nodeCount} nodes!`);
                console.log(`📍 Your frontend is now functional!`);
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Monitoring error:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Fresh message still in transit. Continue monitoring manually.");
    return false;
}

async function main() {
    console.log("LAYERZERO SIMULATION REVERT TROUBLESHOOTER");
    console.log("==========================================");
    console.log("Error: Executor transaction simulation reverted");
    
    // Step 1: Diagnose the issue
    const canProceed = await diagnoseAndFixIssue();
    
    // Step 2: Show alternative approaches
    await tryAlternativeApproach();
    
    // Step 3: Offer to send fresh message
    console.log("\n🤔 RECOMMENDATION:");
    console.log("Since simulation is failing, the fastest solution is to send a fresh message.");
    console.log("This bypasses the stuck executor and creates a new clean transaction.");
    
    const shouldSendFresh = true; // Set to true to send fresh message
    
    if (shouldSendFresh) {
        const result = await sendFreshMessage();
        
        if (result && result.success) {
            await monitorFreshMessage(result.txHash);
        }
    } else {
        console.log("\n⏳ Alternative: Wait for automatic retry (can take hours on testnet)");
        console.log("🔄 Monitor with: npx hardhat run scripts/quickCheck.js");
    }
}

main().catch(console.error);