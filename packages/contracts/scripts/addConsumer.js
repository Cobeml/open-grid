const { ethers } = require("hardhat");

const CHAINLINK_MONITOR_ADDRESS = "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB";
const SUBSCRIPTION_ID = "477";
const ROUTER_ADDRESS = "0xC22a79eBA640940ABB6dF0f7982cc119578E11De";

async function addConsumerToSubscription() {
    console.log("=== ADDING CONSUMER TO CHAINLINK SUBSCRIPTION ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Router ABI for adding consumer
    const routerABI = [
        "function addConsumer(uint64 subscriptionId, address consumer) external"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    try {
        console.log(`Subscription ID: ${SUBSCRIPTION_ID}`);
        console.log(`Consumer to add: ${CHAINLINK_MONITOR_ADDRESS}`);
        console.log(`Wallet address: ${wallet.address}`);
        
        console.log("Adding consumer to subscription...");
        const tx = await router.addConsumer(SUBSCRIPTION_ID, CHAINLINK_MONITOR_ADDRESS);
        console.log(`Transaction hash: ${tx.hash}`);
        
        console.log("Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`✅ Consumer added successfully! Block: ${receipt.blockNumber}`);
        
        return true;
        
    } catch (error) {
        console.error("Error adding consumer:", error.message);
        
        if (error.message.includes("OnlySubscriptionOwner")) {
            console.log("❌ Only the subscription owner can add consumers.");
            console.log("Make sure you're using the wallet that created the subscription.");
        }
        
        if (error.message.includes("ConsumerAlreadyExists")) {
            console.log("✅ Consumer is already added to the subscription!");
            return true;
        }
        
        return false;
    }
}

async function main() {
    console.log("CHAINLINK FUNCTIONS CONSUMER SETUP");
    console.log("==================================");
    
    const success = await addConsumerToSubscription();
    
    if (success) {
        console.log("\n🚀 Ready to run the data flow script!");
        console.log("Run: npx hardhat run scripts/triggerDataFlow.js");
    } else {
        console.log("\n⚠️ Please add the consumer manually:");
        console.log("1. Go to https://functions.chain.link/polygon-amoy");
        console.log(`2. Select subscription ID ${SUBSCRIPTION_ID}`);
        console.log("3. Click 'Add consumer'");
        console.log(`4. Enter: ${CHAINLINK_MONITOR_ADDRESS}`);
        console.log("5. Confirm transaction");
    }
}

main().catch(console.error);