const { ethers } = require("hardhat");

const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const SYNC_TX_HASH = "0x167ea3b1cd513dc1226ce62c0f95be7fd75a9fe9489af0011f1901b952b00080";

// LayerZero Endpoint addresses
const POLYGON_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";

async function analyzeSyncTransaction() {
    console.log("=== ANALYZING CROSS-CHAIN SYNC TRANSACTION ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    try {
        const receipt = await provider.getTransactionReceipt(SYNC_TX_HASH);
        
        if (!receipt) {
            console.log("❌ Transaction not found");
            return null;
        }
        
        console.log(`Transaction Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        console.log(`Block: ${receipt.blockNumber}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`Total Logs: ${receipt.logs.length}`);
        
        // Look for LayerZero PacketSent event
        const packetSentTopic = ethers.keccak256(ethers.toUtf8Bytes("PacketSent(bytes,uint32,address)"));
        
        const lzEvents = receipt.logs.filter(log => {
            return log.topics[0] === packetSentTopic;
        });
        
        if (lzEvents.length > 0) {
            console.log(`✅ Found ${lzEvents.length} LayerZero PacketSent event(s)`);
            
            const event = lzEvents[0];
            console.log(`Event Address: ${event.address}`);
            console.log(`Event Topics: ${event.topics.length}`);
            
            // Try to decode the event
            try {
                const abiCoder = new ethers.AbiCoder();
                const decoded = abiCoder.decode(
                    ["bytes", "uint32", "address"],
                    event.data
                );
                
                console.log(`Encoded Bytes Length: ${decoded[0].length}`);
                console.log(`Destination EID: ${decoded[1]}`);
                console.log(`Receiver Address: ${decoded[2]}`);
                
                return {
                    packetSent: true,
                    destEid: decoded[1],
                    receiver: decoded[2],
                    payloadLength: decoded[0].length
                };
                
            } catch (decodeError) {
                console.log("Could not decode PacketSent event data");
            }
        } else {
            console.log("❌ No LayerZero PacketSent events found");
            console.log("Checking all event topics...");
            
            receipt.logs.forEach((log, i) => {
                console.log(`Log ${i}: Address=${log.address}, Topics=${log.topics.length}`);
                if (log.topics.length > 0) {
                    console.log(`  Topic[0]: ${log.topics[0]}`);
                }
            });
        }
        
        return null;
        
    } catch (error) {
        console.error("Error analyzing transaction:", error.message);
        return null;
    }
}

async function checkLayerZeroEndpoints() {
    console.log("\n=== CHECKING LAYERZERO ENDPOINTS ===");
    
    const polygonProvider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const endpointABI = [
        "function eid() external view returns (uint32)",
        "function delegates(address _oapp) external view returns (address)",
        "function isComposeMsgSender(address _from, address _to, bytes32 _guid) external view returns (bool)"
    ];
    
    try {
        console.log("Checking Polygon Amoy Endpoint...");
        const polygonEndpoint = new ethers.Contract(POLYGON_ENDPOINT, endpointABI, polygonProvider);
        const polygonEid = await polygonEndpoint.eid();
        console.log(`Polygon Amoy EID: ${polygonEid} (expected: 40267)`);
        
        console.log("Checking Base Sepolia Endpoint...");
        const baseEndpoint = new ethers.Contract(BASE_ENDPOINT, endpointABI, baseProvider);
        const baseEid = await baseEndpoint.eid();
        console.log(`Base Sepolia EID: ${baseEid} (expected: 40245)`);
        
        if (polygonEid !== 40267n || baseEid !== 40245n) {
            console.log("❌ Endpoint ID mismatch detected!");
            return false;
        } else {
            console.log("✅ Endpoint IDs match expected values");
            return true;
        }
        
    } catch (error) {
        console.error("Error checking endpoints:", error.message);
        return false;
    }
}

async function checkPeerConfiguration() {
    console.log("\n=== CHECKING PEER CONFIGURATION ===");
    
    const polygonProvider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const oappABI = [
        "function peers(uint32 _eid) external view returns (bytes32)",
        "function isPeer(uint32 _eid, bytes32 _peer) external view returns (bool)"
    ];
    
    try {
        // Check sender's peer configuration
        console.log("Checking sender peer configuration...");
        const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, oappABI, polygonProvider);
        const senderPeer = await sender.peers(40245); // Base Sepolia EID
        console.log(`Sender peer for Base Sepolia: ${senderPeer}`);
        
        const expectedReceiverBytes32 = ethers.zeroPadValue(RECEIVER_ADDRESS_BASE, 32);
        console.log(`Expected receiver bytes32: ${expectedReceiverBytes32}`);
        
        if (senderPeer === expectedReceiverBytes32) {
            console.log("✅ Sender peer correctly configured");
        } else {
            console.log("❌ Sender peer misconfigured");
        }
        
        // Check receiver's peer configuration
        console.log("\nChecking receiver peer configuration...");
        const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, oappABI, baseProvider);
        const receiverPeer = await receiver.peers(40267); // Polygon Amoy EID
        console.log(`Receiver peer for Polygon Amoy: ${receiverPeer}`);
        
        const expectedSenderBytes32 = ethers.zeroPadValue(SENDER_ADDRESS_POLYGON, 32);
        console.log(`Expected sender bytes32: ${expectedSenderBytes32}`);
        
        if (receiverPeer === expectedSenderBytes32) {
            console.log("✅ Receiver peer correctly configured");
        } else {
            console.log("❌ Receiver peer misconfigured");
        }
        
    } catch (error) {
        console.error("Error checking peer configuration:", error.message);
    }
}

async function checkLayerZeroScan() {
    console.log("\n=== LAYERZERO SCAN GUIDANCE ===");
    console.log(`Transaction hash: ${SYNC_TX_HASH}`);
    console.log(`Check status at: https://layerzeroscan.com/tx/${SYNC_TX_HASH}`);
    console.log("This will show if the message was:");
    console.log("- Sent successfully from Polygon Amoy");
    console.log("- Verified by DVNs");
    console.log("- Delivered to Base Sepolia");
    console.log("- Any execution errors on destination");
}

async function proposeFixActions() {
    console.log("\n=== PROPOSED FIX ACTIONS ===");
    
    console.log("1. 🔍 IMMEDIATE: Check LayerZero Scan");
    console.log("   - Visit: https://layerzeroscan.com");
    console.log(`   - Search for tx: ${SYNC_TX_HASH}`);
    console.log("   - Look for 'Failed' or 'Stuck' status");
    
    console.log("\n2. ⚡ RETRY: Send new sync message");
    console.log("   - LayerZero messages can sometimes fail silently");
    console.log("   - Try sending a fresh sync transaction");
    console.log("   - Use higher gas limit for execution");
    
    console.log("\n3. 🔧 MANUAL EXECUTION: If message is stuck");
    console.log("   - Some messages require manual execution on destination");
    console.log("   - Check if message is verified but not executed");
    
    console.log("\n4. 🚨 EMERGENCY: Deploy new receiver if needed");
    console.log("   - If peer configuration is wrong, may need new deployment");
    console.log("   - Update frontend with new contract address");
}

async function createRetryScript() {
    console.log("\n=== CREATING RETRY SYNC SCRIPT ===");
    
    const retryScript = `
const { ethers } = require("hardhat");

async function retryCrossChainSync() {
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function syncData() external payable",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)"
    ];
    
    const sender = new ethers.Contract("${SENDER_ADDRESS_POLYGON}", senderABI, wallet);
    
    try {
        const fee = await sender.quoteSyncFee(false);
        console.log(\`Retry sync fee: \${ethers.formatEther(fee)} POL\`);
        
        // Use 20% higher gas for better delivery chances
        const gasLimit = 1200000; // Increased from 1M
        
        const tx = await sender.syncData({ 
            value: fee,
            gasLimit: gasLimit
        });
        
        console.log(\`Retry transaction: \${tx.hash}\`);
        const receipt = await tx.wait();
        console.log(\`Confirmed in block: \${receipt.blockNumber}\`);
        
    } catch (error) {
        console.error("Retry failed:", error.message);
    }
}

retryCrossChainSync().catch(console.error);
`;
    
    require('fs').writeFileSync('/Users/cobeliu/Developing/network-misfits/packages/contracts/scripts/retryCrossChainSync.js', retryScript);
    console.log("✅ Created retryCrossChainSync.js script");
}

async function main() {
    console.log("LAYERZERO CROSS-CHAIN MESSAGE DEBUGGING");
    console.log("======================================");
    
    const txData = await analyzeSyncTransaction();
    await checkLayerZeroEndpoints();
    await checkPeerConfiguration();
    await checkLayerZeroScan();
    await proposeFixActions();
    await createRetryScript();
    
    console.log("\n=== SUMMARY ===");
    if (txData && txData.packetSent) {
        console.log("✅ LayerZero message was sent successfully");
        console.log("🔍 Check LayerZero Scan for delivery status");
        console.log("⚡ Consider retrying if message failed/stuck");
    } else {
        console.log("❌ LayerZero message may not have been sent properly");
        console.log("🔧 Check contract configuration and retry");
    }
}

main().catch(console.error);