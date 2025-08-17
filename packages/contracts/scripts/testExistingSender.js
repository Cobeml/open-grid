const { ethers } = require("hardhat");

const SENDER_ADDRESS = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const MINIMAL_RECEIVER_ADDRESS = "0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6";

async function checkSenderConfiguration() {
    console.log("=== CHECKING SENDER CONFIGURATION ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    const senderABI = [
        "function destinationContract() external view returns (address)",
        "function getDataSummary() external view returns (uint256, uint256, uint256, uint256)",
        "function quoteSyncFee(bool) external view returns (uint256)",
        "function syncData() external payable"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS, senderABI, provider);
    
    try {
        const destination = await sender.destinationContract();
        console.log(`Current destination: ${destination}`);
        console.log(`Target destination: ${MINIMAL_RECEIVER_ADDRESS}`);
        
        if (destination.toLowerCase() !== MINIMAL_RECEIVER_ADDRESS.toLowerCase()) {
            console.log("❌ Sender is not configured for minimal receiver");
            console.log("Need to update destination first");
            return false;
        }
        
        const summary = await sender.getDataSummary();
        console.log(`Data summary: ${summary[0]} nodes, ${summary[1]} edges, ${summary[2]} data points`);
        
        const fee = await sender.quoteSyncFee(false);
        console.log(`Sync fee: ${ethers.formatEther(fee)} POL`);
        
        return { fee, hasNodes: summary[0] > 0 };
        
    } catch (error) {
        console.error("Configuration check failed:", error.message);
        return false;
    }
}

async function updateSenderDestination() {
    console.log("\n=== UPDATING SENDER DESTINATION ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function configureDestination(address) external",
        "function owner() external view returns (address)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS, senderABI, wallet);
    
    try {
        const owner = await sender.owner();
        console.log(`Sender owner: ${owner}`);
        console.log(`Our address: ${wallet.address}`);
        
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            console.log("❌ Not the owner of sender contract");
            return false;
        }
        
        console.log(`Setting destination to: ${MINIMAL_RECEIVER_ADDRESS}`);
        const tx = await sender.configureDestination(MINIMAL_RECEIVER_ADDRESS);
        await tx.wait();
        
        console.log("✅ Destination updated");
        return true;
        
    } catch (error) {
        console.error("Destination update failed:", error.message);
        return false;
    }
}

async function sendTestMessage() {
    console.log("\n=== SENDING TEST MESSAGE ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool) external view returns (uint256)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS, senderABI, wallet);
    
    try {
        const fee = await sender.quoteSyncFee(false);
        console.log(`Test fee: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`Balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance");
            return false;
        }
        
        console.log("🚀 Sending test message with existing sender...");
        const tx = await sender.syncData({ value: fee });
        
        console.log(`✅ Message sent: ${tx.hash}`);
        console.log(`🔍 Monitor: https://layerzeroscan.com/tx/${tx.hash}`);
        
        return tx.hash;
        
    } catch (error) {
        console.error("Send failed:", error.message);
        return false;
    }
}

async function monitorTest(txHash) {
    console.log("\n=== MONITORING TEST ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256, string memory, uint256)",
        "function isWorking() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(MINIMAL_RECEIVER_ADDRESS, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        try {
            const stats = await receiver.getStats();
            const isWorking = await receiver.isWorking();
            
            console.log(`Check ${attempts + 1}: Messages=${stats[0]}, Value=${stats[1]}, Type="${stats[2]}", Working=${isWorking}`);
            
            if (isWorking) {
                console.log(`\n🎉 SUCCESS! Message received!`);
                console.log(`Messages: ${stats[0]}, Value: ${stats[1]}, Type: ${stats[2]}`);
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Monitor error:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Still pending");
    return false;
}

async function main() {
    console.log("TESTING EXISTING SENDER WITH MINIMAL RECEIVER");
    console.log("============================================");
    
    // Check current configuration
    const config = await checkSenderConfiguration();
    if (!config) {
        // Try to update destination
        const updated = await updateSenderDestination();
        if (!updated) {
            console.log("❌ Cannot configure sender");
            return;
        }
        
        // Recheck after update
        const newConfig = await checkSenderConfiguration();
        if (!newConfig) {
            console.log("❌ Configuration still wrong");
            return;
        }
    }
    
    console.log("✅ Sender configured correctly");
    
    // Send test message
    const txHash = await sendTestMessage();
    if (!txHash) return;
    
    // Monitor result
    const success = await monitorTest(txHash);
    
    console.log(`\n📍 Transaction: ${txHash}`);
    
    if (success) {
        console.log("🎯 This proves the issue is message complexity, not LayerZero itself");
    } else {
        console.log("⚠️ Check LayerZero Scan for status");
    }
}

main().catch(console.error);