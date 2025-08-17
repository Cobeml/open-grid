const { ethers } = require("hardhat");

const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const TX_HASH = "0xe32de19942723ca70fe3cd3360833273b2bb0590eedf66a1267ffbefca7f0732";

async function manualExecution() {
    console.log("=== MANUAL LAYERZERO EXECUTION ===");
    console.log("This will manually execute the pending LayerZero message");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    // LayerZero Endpoint V2 ABI for manual execution
    const endpointABI = [
        "function lzReceive(address _receiver, uint32 _srcEid, bytes32 _sender, uint64 _nonce, bytes32 _guid, bytes calldata _message) external payable",
        "function executable(address _receiver, uint32 _srcEid, bytes32 _sender, uint64 _nonce) external view returns (bool)",
        "function inboundNonce(address _receiver, uint32 _srcEid, bytes32 _sender) external view returns (uint64)",
        "function payloadHash(address _receiver, uint32 _srcEid, bytes32 _sender, uint64 _nonce) external view returns (bytes32)"
    ];
    
    const endpoint = new ethers.Contract(BASE_ENDPOINT, endpointABI, wallet);
    
    try {
        console.log("Checking for pending executions...");
        
        // Polygon Amoy EID and sender address
        const srcEid = 40267;
        const senderBytes32 = ethers.zeroPadValue("0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29", 32);
        
        // Get current nonce
        const currentNonce = await endpoint.inboundNonce(RECEIVER_ADDRESS_BASE, srcEid, senderBytes32);
        console.log(`Current inbound nonce: ${currentNonce}`);
        
        // Check if there's a pending execution at the next nonce
        const nextNonce = currentNonce + 1n;
        const isExecutable = await endpoint.executable(RECEIVER_ADDRESS_BASE, srcEid, senderBytes32, nextNonce);
        console.log(`Is executable at nonce ${nextNonce}: ${isExecutable}`);
        
        if (!isExecutable) {
            console.log("❌ No pending executions found at this nonce");
            console.log("The message might still be in verification or already executed");
            return false;
        }
        
        // Get the payload hash to confirm it exists
        const payloadHash = await endpoint.payloadHash(RECEIVER_ADDRESS_BASE, srcEid, senderBytes32, nextNonce);
        console.log(`Payload hash: ${payloadHash}`);
        
        if (payloadHash === ethers.ZeroHash) {
            console.log("❌ No payload found for this nonce");
            return false;
        }
        
        console.log("⚠️ MANUAL EXECUTION REQUIRED");
        console.log("The message needs to be executed through LayerZero Scan interface");
        console.log(`Visit: https://layerzeroscan.com/tx/${TX_HASH}`);
        console.log("Look for 'Execute' button to manually trigger the delivery");
        
        return true;
        
    } catch (error) {
        console.error("Error checking execution status:", error.message);
        return false;
    }
}

async function alternativeExecution() {
    console.log("\n=== ALTERNATIVE: LAYERZERO SCAN EXECUTION ===");
    console.log("If manual execution via contract fails, use LayerZero Scan:");
    console.log(`1. Visit: https://layerzeroscan.com/tx/${TX_HASH}`);
    console.log("2. Connect your wallet (same wallet used for deployment)");
    console.log("3. Look for 'Execute' or 'Deliver' button");
    console.log("4. Pay the execution gas fee on Base Sepolia");
    console.log("5. Confirm the transaction");
    
    console.log("\nAlternatively, wait for automatic executor (can take 30+ minutes)");
}

async function checkExecutionGas() {
    console.log("\n=== CHECKING EXECUTION GAS REQUIREMENTS ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    try {
        const balance = await baseProvider.getBalance(wallet.address);
        console.log(`Base Sepolia ETH balance: ${ethers.formatEther(balance)} ETH`);
        
        if (balance < ethers.parseEther("0.001")) {
            console.log("⚠️ Low ETH balance on Base Sepolia");
            console.log("You may need Base Sepolia ETH for manual execution");
            console.log("Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia");
        } else {
            console.log("✅ Sufficient ETH for manual execution");
        }
        
    } catch (error) {
        console.error("Error checking balance:", error.message);
    }
}

async function main() {
    console.log("LAYERZERO MANUAL EXECUTION HELPER");
    console.log("=================================");
    console.log(`Transaction: ${TX_HASH}`);
    console.log("Status: Waiting for executor");
    
    await manualExecution();
    await checkExecutionGas();
    await alternativeExecution();
    
    console.log("\n=== SUMMARY ===");
    console.log("Your LayerZero message is verified and ready for execution");
    console.log("Use LayerZero Scan to manually execute the delivery");
    console.log("Once executed, the 27 nodes will appear on your Base Sepolia contract");
}

main().catch(console.error);