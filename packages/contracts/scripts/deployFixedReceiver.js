const { ethers } = require("hardhat");

const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function deployFixedReceiver() {
    console.log("=== DEPLOYING FIXED RECEIVER CONTRACT ===");
    console.log("This will solve the CouldNotParseError 0xa512e2ff issue");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    console.log(`Deploying from: ${wallet.address}`);
    
    // Check balance
    const balance = await baseProvider.getBalance(wallet.address);
    console.log(`Base Sepolia ETH balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
        console.log("⚠️ Low ETH balance. You may need more Base Sepolia ETH");
        console.log("Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia");
    }

    try {
        // Get contract factory
        const EnergyDataReceiverFixed = await ethers.getContractFactory("EnergyDataReceiverFixed", wallet);
        
        console.log("Deploying EnergyDataReceiverFixed...");
        const receiver = await EnergyDataReceiverFixed.deploy(
            BASE_ENDPOINT,
            wallet.address
        );
        
        console.log(`✅ Deployment transaction sent: ${receiver.deploymentTransaction().hash}`);
        
        // Wait for deployment
        await receiver.waitForDeployment();
        const receiverAddress = await receiver.getAddress();
        
        console.log(`🎉 EnergyDataReceiverFixed deployed to: ${receiverAddress}`);
        
        return { receiver, receiverAddress };
        
    } catch (error) {
        console.error("Deployment failed:", error.message);
        return null;
    }
}

async function configureReceiver(receiver, receiverAddress) {
    console.log("\n=== CONFIGURING RECEIVER ===");
    
    try {
        // Configure source contract
        console.log("Setting source contract...");
        const setSourceTx = await receiver.configureSourceContract(SENDER_ADDRESS_POLYGON);
        await setSourceTx.wait();
        console.log("✅ Source contract configured");
        
        // Set peer relationship
        console.log("Setting peer relationship...");
        const senderBytes32 = ethers.zeroPadValue(SENDER_ADDRESS_POLYGON, 32);
        const setPeerTx = await receiver.setPeer(40267, senderBytes32); // Polygon Amoy EID
        await setPeerTx.wait();
        console.log("✅ Peer relationship configured");
        
        // Enable debug mode initially
        console.log("Enabling debug mode...");
        const setDebugTx = await receiver.setDebugMode(true);
        await setDebugTx.wait();
        console.log("✅ Debug mode enabled");
        
        return true;
        
    } catch (error) {
        console.error("Configuration failed:", error.message);
        return false;
    }
}

async function updateSenderContract(receiverAddress) {
    console.log("\n=== UPDATING SENDER CONTRACT ===");
    console.log("Configuring sender to point to new receiver...");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function configureDestination(address _destination) external",
        "function destinationContract() external view returns (address)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, wallet);
    
    try {
        console.log(`Setting destination to: ${receiverAddress}`);
        const setDestTx = await sender.configureDestination(receiverAddress);
        await setDestTx.wait();
        console.log("✅ Sender updated to use new receiver");
        
        // Verify the change
        const newDest = await sender.destinationContract();
        console.log(`Verified destination: ${newDest}`);
        
        return true;
        
    } catch (error) {
        console.error("Sender update failed:", error.message);
        return false;
    }
}

async function testNewReceiver(receiverAddress) {
    console.log("\n=== TESTING NEW RECEIVER ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256, string memory)",
        "function isHealthy() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(receiverAddress, receiverABI, baseProvider);
    
    try {
        const stats = await receiver.getStats();
        const isHealthy = await receiver.isHealthy();
        
        console.log(`Stats: Nodes=${stats[0]}, Edges=${stats[1]}, Data=${stats[2]}`);
        console.log(`Syncs: ${stats[4]}, Errors: ${stats[5]}, Last Error: "${stats[6]}"`);
        console.log(`Healthy: ${isHealthy}`);
        
        return true;
        
    } catch (error) {
        console.error("Testing failed:", error.message);
        return false;
    }
}

async function main() {
    console.log("FIXED RECEIVER DEPLOYMENT");
    console.log("========================");
    console.log("Solving: CouldNotParseError 0xa512e2ff");
    console.log("Features: Robust error handling, multiple decode strategies, debug mode");
    
    // Step 1: Deploy new receiver
    const deployment = await deployFixedReceiver();
    if (!deployment) {
        console.log("❌ Deployment failed");
        return;
    }
    
    const { receiver, receiverAddress } = deployment;
    
    // Step 2: Configure receiver
    const configured = await configureReceiver(receiver, receiverAddress);
    if (!configured) {
        console.log("❌ Configuration failed");
        return;
    }
    
    // Step 3: Update sender to use new receiver
    const senderUpdated = await updateSenderContract(receiverAddress);
    if (!senderUpdated) {
        console.log("❌ Sender update failed");
        return;
    }
    
    // Step 4: Test new receiver
    await testNewReceiver(receiverAddress);
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log(`📍 New Receiver Address: ${receiverAddress}`);
    console.log("🔧 Sender configured to use new receiver");
    console.log("🚀 Ready for cross-chain sync!");
    
    console.log("\n📋 NEXT STEPS:");
    console.log("1. Update your frontend to use the new receiver address");
    console.log("2. Run: npx hardhat run scripts/simpleSyncRetry.js");
    console.log("3. Monitor delivery with debug events");
    
    console.log(`\n📄 UPDATE FRONTEND CONTRACT ADDRESS TO: ${receiverAddress}`);
}

main().catch(console.error);