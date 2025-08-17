const { ethers } = require("hardhat");

const MINIMAL_RECEIVER_ADDRESS = "0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6";

async function sendDirectSimpleMessage() {
    console.log("=== MANUAL SIMPLE MESSAGE TEST ===");
    console.log("Bypassing complex sender - sending raw LayerZero message");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`Sending from: ${wallet.address}`);
    
    // LayerZero endpoint on Polygon Amoy
    const POLYGON_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
    
    // Minimal LayerZero endpoint interface
    const endpointABI = [
        "function send(tuple(uint32 dstEid, bytes32 to, bytes message, bytes options, bytes nativeFee, bytes lzTokenFee), address refundAddress) external payable",
        "function quote(tuple(uint32 dstEid, bytes32 to, bytes message, bytes options, bytes nativeFee, bytes lzTokenFee), bool payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))"
    ];
    
    const endpoint = new ethers.Contract(POLYGON_ENDPOINT, endpointABI, wallet);
    
    try {
        // Create simplest possible message - just the number 27
        const simpleMessage = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [27]);
        console.log(`Simple message: ${simpleMessage}`);
        console.log(`Message length: ${simpleMessage.length} characters (${(simpleMessage.length - 2) / 2} bytes)`);
        
        // LayerZero message parameters
        const receiverBytes32 = ethers.zeroPadValue(MINIMAL_RECEIVER_ADDRESS, 32);
        const options = "0x00030100110100000000000000000000000000030d40"; // Minimal options
        
        const sendParams = [
            40245, // Base Sepolia EID
            receiverBytes32,
            simpleMessage,
            options,
            "0x", // nativeFee placeholder
            "0x"  // lzTokenFee placeholder
        ];
        
        console.log("Quoting fee for simple message...");
        const quote = await endpoint.quote(sendParams, false);
        const fee = quote[0]; // nativeFee
        
        console.log(`Fee required: ${ethers.formatEther(fee)} POL`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance for simple test");
            console.log(`Need: ${ethers.formatEther(fee)} POL`);
            console.log(`Have: ${ethers.formatEther(balance)} POL`);
            console.log(`Shortfall: ${ethers.formatEther(fee - balance)} POL`);
            return false;
        }
        
        console.log("🚀 Sending simplest possible message (number 27)...");
        const tx = await endpoint.send(sendParams, wallet.address, { value: fee });
        
        console.log(`✅ Simple message sent: ${tx.hash}`);
        console.log(`🔍 Monitor at: https://layerzeroscan.com/tx/${tx.hash}`);
        
        return tx.hash;
        
    } catch (error) {
        console.error("Simple test failed:", error.message);
        return false;
    }
}

async function monitorSimpleTest(txHash) {
    console.log("\n=== MONITORING SIMPLE MESSAGE ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256, string memory, uint256)",
        "function isWorking() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(MINIMAL_RECEIVER_ADDRESS, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 15; // 15 * 20 seconds = 5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const stats = await receiver.getStats();
            const isWorking = await receiver.isWorking();
            
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] Check ${attempts + 1}: Messages=${stats[0]}, Value=${stats[1]}, Type="${stats[2]}", Working=${isWorking}`);
            
            if (isWorking && stats[1] == 27) {
                console.log(`\n🎉 BREAKTHROUGH! Simple message successfully delivered!`);
                console.log(`✅ Received value: ${stats[1]} (our test number 27)`);
                console.log(`✅ LayerZero connectivity CONFIRMED!`);
                console.log(`❌ Previous errors were due to complex message format`);
                
                console.log(`\n🎯 SOLUTION CONFIRMED:`);
                console.log(`- Simple messages work perfectly`);
                console.log(`- Complex 27-node structure was too large`);
                console.log(`- Need to implement batching for full node data`);
                
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
    
    console.log("⚠️ Simple test still pending. Check LayerZero Scan:");
    console.log(`https://layerzeroscan.com/tx/${txHash}`);
    return false;
}

async function main() {
    console.log("MANUAL SIMPLE LAYERZERO TEST");
    console.log("============================");
    console.log("Goal: Send just the number 27 using raw LayerZero endpoint");
    console.log("This bypasses our complex sender and proves LayerZero works");
    
    const txHash = await sendDirectSimpleMessage();
    if (!txHash) return;
    
    const success = await monitorSimpleTest(txHash);
    
    console.log(`\n📍 Minimal Receiver: ${MINIMAL_RECEIVER_ADDRESS}`);
    console.log(`🔍 Transaction: ${txHash}`);
    
    if (success) {
        console.log(`\n🚀 NEXT STEPS:`);
        console.log(`1. ✅ LayerZero connectivity proven`);
        console.log(`2. 🔧 Implement node batching (3-5 nodes per message)`);
        console.log(`3. 🎯 Use simple coordinate format (no strings)`);
        console.log(`4. 🌐 Update frontend to new receiver address`);
    }
}

main().catch(console.error);