const { ethers } = require("hardhat");

const LATEST_TX = "0xe32de19942723ca70fe3cd3360833273b2bb0590eedf66a1267ffbefca7f0732";

async function verifyLatestTransaction() {
    console.log("=== VERIFYING LATEST TRANSACTION ===");
    console.log(`Transaction: ${LATEST_TX}`);
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    try {
        const receipt = await provider.getTransactionReceipt(LATEST_TX);
        
        if (!receipt) {
            console.log("❌ Transaction not found");
            return false;
        }
        
        console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        console.log(`Block: ${receipt.blockNumber}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`Total Logs: ${receipt.logs.length}`);
        
        // Look for LayerZero events
        let foundLzEvent = false;
        
        console.log("\nChecking for LayerZero events...");
        receipt.logs.forEach((log, i) => {
            console.log(`Log ${i}: Address=${log.address}`);
            
            // LayerZero Endpoint address
            if (log.address.toLowerCase() === "0x6EDCE65403992e310A62460808c4b910D972f10f".toLowerCase()) {
                console.log(`  ✅ LayerZero Endpoint event found!`);
                console.log(`  Topics: ${log.topics.length}`);
                foundLzEvent = true;
            }
        });
        
        if (foundLzEvent) {
            console.log("\n✅ LayerZero message was properly sent!");
            console.log("⏳ Message is in transit to Base Sepolia");
            console.log("🔍 Check: https://layerzeroscan.com");
            return true;
        } else {
            console.log("\n❌ No LayerZero events found - message may not have been sent");
            return false;
        }
        
    } catch (error) {
        console.error("Error verifying transaction:", error.message);
        return false;
    }
}

async function main() {
    const isValid = await verifyLatestTransaction();
    
    if (isValid) {
        console.log("\n🎯 TRANSACTION IS VALID");
        console.log("LayerZero delivery can take 5-15 minutes");
        console.log("Continue monitoring with: npx hardhat run scripts/quickCheck.js");
    } else {
        console.log("\n⚠️ TRANSACTION ISSUE DETECTED");
        console.log("May need to retry the sync");
    }
}

main().catch(console.error);