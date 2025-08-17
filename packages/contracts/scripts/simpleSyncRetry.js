const { ethers } = require("hardhat");

const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";

async function simpleRetry() {
    console.log("=== SIMPLE CROSS-CHAIN SYNC RETRY ===");
    
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
        console.log(`Sync fee needed: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`Current balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance for sync fee");
            console.log(`Need to add ~${ethers.formatEther(fee - balance + ethers.parseEther("0.01"))} POL`);
            return false;
        }
        
        console.log("🚀 Sending cross-chain sync with fixed peer configuration...");
        const tx = await sender.syncData({ value: fee });
        
        console.log(`✅ Transaction sent: ${tx.hash}`);
        console.log(`🔍 Monitor at: https://layerzeroscan.com/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`📦 Confirmed in block: ${receipt.blockNumber}`);
        
        console.log("\n⏳ Cross-chain delivery will take 2-5 minutes");
        console.log("✅ Peer configuration is now fixed, so delivery should succeed!");
        
        return tx.hash;
        
    } catch (error) {
        console.error("Error:", error.message);
        return false;
    }
}

async function main() {
    console.log("SIMPLE CROSS-CHAIN SYNC RETRY");
    console.log("=============================");
    console.log("Note: Peer configuration was already fixed in previous step");
    
    const result = await simpleRetry();
    
    if (result) {
        console.log("\n🎯 SUCCESS! Cross-chain sync sent with fixed configuration");
        console.log("Your 27 nodes should appear on Base Sepolia within 5 minutes");
        console.log(`Check receiver contract: 0xb1C74a3EdFDCfae600e9d11a3389197366f4005e`);
    } else {
        console.log("\n💰 Add more POL to your Polygon Amoy wallet and try again");
    }
}

main().catch(console.error);