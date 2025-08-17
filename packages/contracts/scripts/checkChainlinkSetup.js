const { ethers } = require("hardhat");

const CHAINLINK_MONITOR_ADDRESS = "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB";
const SUBSCRIPTION_ID = "477";

// Chainlink Functions Router on Polygon Amoy
const ROUTER_ADDRESS = "0xC22a79eBA640940ABB6dF0f7982cc119578E11De";

async function checkSubscriptionSetup() {
    console.log("=== CHECKING CHAINLINK FUNCTIONS SETUP ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    // Router ABI for checking subscription
    const routerABI = [
        "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, address owner, address[] memory consumers)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, provider);
    
    try {
        console.log(`Checking subscription ID: ${SUBSCRIPTION_ID}`);
        console.log(`ChainlinkEnergyMonitor address: ${CHAINLINK_MONITOR_ADDRESS}`);
        
        const subscription = await router.getSubscription(SUBSCRIPTION_ID);
        const [balance, owner, consumers] = subscription;
        
        console.log(`\nSubscription Details:`);
        console.log(`- Balance: ${ethers.formatEther(balance)} LINK`);
        console.log(`- Owner: ${owner}`);
        console.log(`- Number of consumers: ${consumers.length}`);
        
        if (consumers.length > 0) {
            console.log(`\nConsumers:`);
            consumers.forEach((consumer, index) => {
                console.log(`  ${index + 1}. ${consumer}`);
                if (consumer.toLowerCase() === CHAINLINK_MONITOR_ADDRESS.toLowerCase()) {
                    console.log(`     ✅ ChainlinkEnergyMonitor is registered as consumer!`);
                }
            });
        }
        
        const isConsumerRegistered = consumers.some(
            consumer => consumer.toLowerCase() === CHAINLINK_MONITOR_ADDRESS.toLowerCase()
        );
        
        if (!isConsumerRegistered) {
            console.log(`\n❌ ChainlinkEnergyMonitor (${CHAINLINK_MONITOR_ADDRESS}) is NOT registered as a consumer!`);
            console.log(`\nTo add it as a consumer:`);
            console.log(`1. Go to https://functions.chain.link/polygon-amoy`);
            console.log(`2. Connect your wallet and select subscription ID ${SUBSCRIPTION_ID}`);
            console.log(`3. Click "Add consumer"`);
            console.log(`4. Enter contract address: ${CHAINLINK_MONITOR_ADDRESS}`);
            console.log(`5. Confirm the transaction`);
            return false;
        } else {
            console.log(`\n✅ Setup looks good! ChainlinkEnergyMonitor is properly registered.`);
            
            if (balance < ethers.parseEther("0.1")) {
                console.log(`⚠️ Warning: Low LINK balance (${ethers.formatEther(balance)} LINK)`);
                console.log(`Consider adding more LINK to the subscription.`);
            }
            
            return true;
        }
        
    } catch (error) {
        console.error("Error checking subscription:", error.message);
        
        if (error.message.includes("InvalidSubscription")) {
            console.log(`❌ Subscription ID ${SUBSCRIPTION_ID} does not exist or is invalid.`);
            console.log(`Please verify your subscription ID at https://functions.chain.link/polygon-amoy`);
        }
        
        return false;
    }
}

async function testContractReadiness() {
    console.log("\n=== TESTING CONTRACT READINESS ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    const monitorABI = [
        "function nodeCount() external view returns (uint256)",
        "function dataCount() external view returns (uint256)",
        "function owner() external view returns (address)"
    ];
    
    const monitor = new ethers.Contract(CHAINLINK_MONITOR_ADDRESS, monitorABI, provider);
    
    try {
        const nodeCount = await monitor.nodeCount();
        const dataCount = await monitor.dataCount();
        const owner = await monitor.owner();
        
        console.log(`Contract owner: ${owner}`);
        console.log(`Node count: ${nodeCount}`);
        console.log(`Data count: ${dataCount}`);
        
        if (nodeCount > 0) {
            console.log(`✅ Contract has ${nodeCount} nodes ready for data generation`);
        } else {
            console.log(`❌ No nodes registered in the contract`);
        }
        
        return nodeCount > 0;
        
    } catch (error) {
        console.error("Error testing contract:", error.message);
        return false;
    }
}

async function main() {
    console.log("CHAINLINK FUNCTIONS SETUP VERIFICATION");
    console.log("======================================");
    
    const subscriptionOk = await checkSubscriptionSetup();
    const contractOk = await testContractReadiness();
    
    console.log("\n=== READINESS SUMMARY ===");
    console.log(`Subscription setup: ${subscriptionOk ? '✅' : '❌'}`);
    console.log(`Contract readiness: ${contractOk ? '✅' : '❌'}`);
    
    if (subscriptionOk && contractOk) {
        console.log(`\n🚀 Ready to run triggerDataFlow.js!`);
        console.log(`Run: npx hardhat run scripts/triggerDataFlow.js`);
    } else {
        console.log(`\n⚠️ Please fix the issues above before running triggerDataFlow.js`);
    }
}

main().catch(console.error);