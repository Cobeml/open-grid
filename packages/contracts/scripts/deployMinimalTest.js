const { ethers } = require("hardhat");

const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function deployMinimalReceiver() {
    console.log("=== DEPLOYING MINIMAL TEST RECEIVER ===");
    console.log("This will test if LayerZero connectivity works with simple messages");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    console.log(`Deploying from: ${wallet.address}`);
    
    try {
        const MinimalTestReceiver = await ethers.getContractFactory("MinimalTestReceiver", wallet);
        
        console.log("Deploying MinimalTestReceiver...");
        const receiver = await MinimalTestReceiver.deploy(BASE_ENDPOINT, wallet.address);
        
        console.log(`✅ Deployment transaction: ${receiver.deploymentTransaction().hash}`);
        
        await receiver.waitForDeployment();
        const receiverAddress = await receiver.getAddress();
        
        console.log(`🎉 MinimalTestReceiver deployed to: ${receiverAddress}`);
        
        return { receiver, receiverAddress };
        
    } catch (error) {
        console.error("Deployment failed:", error.message);
        return null;
    }
}

async function configureMinimalReceiver(receiver, receiverAddress) {
    console.log("\n=== CONFIGURING MINIMAL RECEIVER ===");
    
    try {
        // Set peer relationship for Polygon Amoy
        const senderBytes32 = ethers.zeroPadValue(SENDER_ADDRESS_POLYGON, 32);
        const setPeerTx = await receiver.setPeer(40267, senderBytes32);
        await setPeerTx.wait();
        console.log("✅ Peer relationship configured");
        
        return true;
        
    } catch (error) {
        console.error("Configuration failed:", error.message);
        return false;
    }
}

async function updateSenderForMinimalTest(receiverAddress) {
    console.log("\n=== UPDATING SENDER FOR MINIMAL TEST ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function configureDestination(address _destination) external",
        "function destinationContract() external view returns (address)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, wallet);
    
    try {
        console.log(`Updating sender destination to: ${receiverAddress}`);
        const setDestTx = await sender.configureDestination(receiverAddress);
        await setDestTx.wait();
        console.log("✅ Sender updated for minimal test");
        
        return true;
        
    } catch (error) {
        console.error("Sender update failed:", error.message);
        return false;
    }
}

async function sendMinimalTestMessage() {
    console.log("\n=== SENDING MINIMAL TEST MESSAGE ===");
    
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
        console.log(`Test sync fee: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance");
            return false;
        }
        
        console.log("🚀 Sending minimal test message...");
        const tx = await sender.syncData({ value: fee });
        console.log(`✅ Test message sent: ${tx.hash}`);
        console.log(`🔍 Monitor at: https://layerzeroscan.com/tx/${tx.hash}`);
        
        return tx.hash;
        
    } catch (error) {
        console.error("Test message failed:", error.message);
        return false;
    }
}

async function monitorMinimalTest(receiverAddress, txHash) {
    console.log("\n=== MONITORING MINIMAL TEST ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256, string memory, uint256)",
        "function isWorking() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(receiverAddress, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 15; // 15 * 20 seconds = 5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const stats = await receiver.getStats();
            const isWorking = await receiver.isWorking();
            
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] Check ${attempts + 1}: Messages=${stats[0]}, LastValue=${stats[1]}, Type="${stats[2]}", Bytes=${stats[3]}, Working=${isWorking}`);
            
            if (isWorking) {
                console.log(`\n🎉 SUCCESS! Minimal test receiver got LayerZero message!`);
                console.log(`📊 Final stats:`);
                console.log(`   - Messages received: ${stats[0]}`);
                console.log(`   - Last value: ${stats[1]}`);
                console.log(`   - Message type: ${stats[2]}`);
                console.log(`   - Total bytes: ${stats[3]}`);
                console.log(`\n✅ LayerZero connectivity CONFIRMED!`);
                console.log(`❌ Issue is with complex message parsing, not LayerZero itself`);
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
    
    console.log("⚠️ Minimal test still pending. Check LayerZero Scan:");
    console.log(`https://layerzeroscan.com/tx/${txHash}`);
    return false;
}

async function main() {
    console.log("MINIMAL LAYERZERO CONNECTIVITY TEST");
    console.log("===================================");
    console.log("Purpose: Prove LayerZero works with simple messages");
    console.log("Issue: Complex 27-node message causes 0xa512e2ff error");
    
    // Step 1: Deploy minimal receiver
    const deployment = await deployMinimalReceiver();
    if (!deployment) return;
    
    const { receiver, receiverAddress } = deployment;
    
    // Step 2: Configure receiver
    const configured = await configureMinimalReceiver(receiver, receiverAddress);
    if (!configured) return;
    
    // Step 3: Update sender
    const senderUpdated = await updateSenderForMinimalTest(receiverAddress);
    if (!senderUpdated) return;
    
    // Step 4: Send test message
    const txHash = await sendMinimalTestMessage();
    if (!txHash) return;
    
    // Step 5: Monitor results
    const success = await monitorMinimalTest(receiverAddress, txHash);
    
    console.log("\n🎯 CONCLUSION:");
    if (success) {
        console.log("✅ LayerZero connectivity works!");
        console.log("❌ Problem is with complex message format/size");
        console.log("🛠️ Solution: Implement message batching or simpler format");
    } else {
        console.log("⚠️ Test still pending - check LayerZero Scan");
    }
    
    console.log(`\n📍 Minimal Test Receiver: ${receiverAddress}`);
    console.log(`🔍 Transaction: ${txHash}`);
}

main().catch(console.error);