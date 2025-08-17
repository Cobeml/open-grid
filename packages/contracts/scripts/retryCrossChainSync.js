
const { ethers } = require("hardhat");

async function retryCrossChainSync() {
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)"
    ];
    
    const sender = new ethers.Contract("0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29", senderABI, wallet);
    
    try {
        const fee = await sender.quoteSyncFee(false);
        console.log(`Retry sync fee: ${ethers.formatEther(fee)} POL`);
        
        // Use 20% higher gas for better delivery chances
        const gasLimit = 1200000; // Increased from 1M
        
        const tx = await sender.syncData({ 
            value: fee,
            gasLimit: gasLimit
        });
        
        console.log(`Retry transaction: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Confirmed in block: ${receipt.blockNumber}`);
        
    } catch (error) {
        console.error("Retry failed:", error.message);
    }
}

retryCrossChainSync().catch(console.error);
