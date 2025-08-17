const { ethers } = require("hardhat");

async function quickCheck() {
    console.log("=== QUICK STATUS CHECK ===");
    
    // Check Base Sepolia receiver
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = ["function nodeCount() external view returns (uint256)"];
    const receiver = new ethers.Contract("0xb1C74a3EdFDCfae600e9d11a3389197366f4005e", receiverABI, baseProvider);
    
    try {
        const nodeCount = await receiver.nodeCount();
        console.log(`Base Sepolia receiver nodes: ${nodeCount}`);
        
        if (nodeCount > 0) {
            console.log("🎉 SUCCESS! Nodes have arrived!");
            return true;
        } else {
            console.log("⏳ Still waiting for delivery...");
            return false;
        }
    } catch (error) {
        console.error("Error checking receiver:", error.message);
        return false;
    }
}

quickCheck().catch(console.error);