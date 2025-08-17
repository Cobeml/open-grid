const { ethers } = require("hardhat");

const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";

async function monitorDelivery() {
    console.log("=== MONITORING CROSS-CHAIN DELIVERY ===");
    console.log("Watching for 27 nodes to arrive on Base Sepolia...");
    console.log(`Contract: ${RECEIVER_ADDRESS_BASE}`);
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)",
        "function hasRecentData() external view returns (bool)",
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 20; // 20 * 15 seconds = 5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const nodeCount = await receiver.nodeCount();
            const totalSyncs = await receiver.totalSyncsReceived();
            const hasRecentData = await receiver.hasRecentData();
            
            console.log(`Check ${attempts + 1}: Nodes=${nodeCount}, Syncs=${totalSyncs}, HasData=${hasRecentData}`);
            
            if (nodeCount > 0) {
                console.log(`\n🎉 SUCCESS! ${nodeCount} nodes received on Base Sepolia!`);
                
                // Show the first few nodes as confirmation
                const nodes = await receiver.getAllNodes();
                console.log(`\n📍 First 5 nodes received:`);
                for (let i = 0; i < Math.min(5, nodes.length); i++) {
                    console.log(`  Node ${i}: ${nodes[i].location}, Active: ${nodes[i].active}`);
                }
                
                console.log(`\n✅ LayerZero Integration Complete!`);
                console.log(`📍 Base Sepolia Contract: ${RECEIVER_ADDRESS_BASE}`);
                console.log(`🌐 Your frontend is now ready to display the energy grid!`);
                console.log(`🔗 Total nodes available: ${nodeCount}`);
                
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                console.log("⏳ Waiting 15 seconds for LayerZero delivery...");
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
            attempts++;
            
        } catch (error) {
            console.error(`Error on attempt ${attempts + 1}:`, error.message);
            attempts++;
            
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        }
    }
    
    console.log("\n⚠️ Delivery taking longer than expected...");
    console.log("🔍 Check LayerZero Scan: https://layerzeroscan.com/tx/0xe32de19942723ca70fe3cd3360833273b2bb0590eedf66a1267ffbefca7f0732");
    console.log("💡 LayerZero can sometimes take 5-10 minutes");
    console.log("🔄 Run this script again in a few minutes if needed");
    
    return false;
}

async function main() {
    console.log("LAYERZERO CROSS-CHAIN DELIVERY MONITOR");
    console.log("=====================================");
    console.log("Transaction: 0xe32de19942723ca70fe3cd3360833273b2bb0590eedf66a1267ffbefca7f0732");
    console.log("Expected: 27 nodes from Polygon Amoy → Base Sepolia");
    
    await monitorDelivery();
}

main().catch(console.error);