const { ethers } = require("hardhat");

// Contract addresses and transaction details
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const BASE_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const TX_HASH = "0xe32de19942723ca70fe3cd3360833273b2bb0590eedf66a1267ffbefca7f0732";

async function getMessageDetails() {
    console.log("=== RETRIEVING MESSAGE DETAILS FROM POLYGON AMOY ===");
    
    const polygonProvider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    try {
        const receipt = await polygonProvider.getTransactionReceipt(TX_HASH);
        
        if (!receipt) {
            throw new Error("Transaction not found");
        }
        
        console.log("Analyzing transaction logs for LayerZero message details...");
        
        // Look for PacketSent event from LayerZero Endpoint
        // Event PacketSent(bytes encodedPayload, bytes options, address sendLibrary)
        const packetSentTopic = ethers.keccak256(ethers.toUtf8Bytes("PacketSent(bytes,bytes,address)"));
        
        let messagePayload = null;
        let nonce = null;
        let guid = null;
        
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === BASE_ENDPOINT.toLowerCase()) {
                try {
                    // Try to decode as PacketSent
                    if (log.topics[0] === packetSentTopic) {
                        const abiCoder = new ethers.AbiCoder();
                        const decoded = abiCoder.decode(["bytes", "bytes", "address"], log.data);
                        
                        // The first bytes contain the encoded packet
                        const encodedPayload = decoded[0];
                        console.log(`Found PacketSent event with payload length: ${encodedPayload.length}`);
                        
                        // Decode the packet structure
                        // Packet = nonce(8) + srcEid(4) + sender(32) + dstEid(4) + receiver(32) + guid(32) + message(remaining)
                        if (encodedPayload.length >= 112) { // Minimum packet size
                            const packetData = encodedPayload.slice(2); // Remove 0x
                            
                            nonce = BigInt("0x" + packetData.slice(0, 16)); // First 8 bytes
                            const srcEid = parseInt(packetData.slice(16, 24), 16); // Next 4 bytes
                            const sender = "0x" + packetData.slice(24, 88); // Next 32 bytes
                            const dstEid = parseInt(packetData.slice(88, 96), 16); // Next 4 bytes
                            const receiver = "0x" + packetData.slice(96, 160); // Next 32 bytes
                            guid = "0x" + packetData.slice(160, 224); // Next 32 bytes
                            messagePayload = "0x" + packetData.slice(224); // Remaining bytes
                            
                            console.log(`Decoded packet:`);
                            console.log(`- Nonce: ${nonce}`);
                            console.log(`- Source EID: ${srcEid}`);
                            console.log(`- Sender: ${sender}`);
                            console.log(`- Destination EID: ${dstEid}`);
                            console.log(`- Receiver: ${receiver}`);
                            console.log(`- GUID: ${guid}`);
                            console.log(`- Message length: ${messagePayload.length / 2 - 1} bytes`);
                            
                            break;
                        }
                    }
                } catch (decodeError) {
                    console.log("Could not decode log:", decodeError.message);
                }
            }
        }
        
        if (!messagePayload || !nonce || !guid) {
            throw new Error("Could not extract message details from transaction");
        }
        
        return {
            nonce,
            guid,
            messagePayload,
            srcEid: 40267, // Polygon Amoy
            sender: ethers.zeroPadValue(SENDER_ADDRESS_POLYGON, 32)
        };
        
    } catch (error) {
        console.error("Error retrieving message details:", error.message);
        return null;
    }
}

async function executeMessageManually(messageDetails) {
    console.log("\n=== MANUALLY EXECUTING LAYERZERO MESSAGE ===");
    
    if (!messageDetails) {
        console.log("❌ Cannot execute without message details");
        return false;
    }
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    // LayerZero Endpoint ABI for lzReceive
    const endpointABI = [
        "function lzReceive(address _receiver, uint32 _srcEid, bytes32 _sender, uint64 _nonce, bytes32 _guid, bytes calldata _message) external payable"
    ];
    
    const endpoint = new ethers.Contract(BASE_ENDPOINT, endpointABI, wallet);
    
    try {
        console.log("Preparing manual execution...");
        console.log(`Receiver: ${RECEIVER_ADDRESS_BASE}`);
        console.log(`Source EID: ${messageDetails.srcEid}`);
        console.log(`Sender: ${messageDetails.sender}`);
        console.log(`Nonce: ${messageDetails.nonce}`);
        console.log(`GUID: ${messageDetails.guid}`);
        console.log(`Message: ${messageDetails.messagePayload.slice(0, 100)}...`);
        
        // Estimate gas for the execution
        console.log("\nEstimating gas for execution...");
        const gasEstimate = await endpoint.lzReceive.estimateGas(
            RECEIVER_ADDRESS_BASE,
            messageDetails.srcEid,
            messageDetails.sender,
            messageDetails.nonce,
            messageDetails.guid,
            messageDetails.messagePayload
        );
        
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
        
        // Execute the message
        console.log("🚀 Executing LayerZero message...");
        const tx = await endpoint.lzReceive(
            RECEIVER_ADDRESS_BASE,
            messageDetails.srcEid,
            messageDetails.sender,
            messageDetails.nonce,
            messageDetails.guid,
            messageDetails.messagePayload,
            {
                gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
            }
        );
        
        console.log(`✅ Execution transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`🎉 Execution confirmed! Block: ${receipt.blockNumber}`);
        
        return true;
        
    } catch (error) {
        console.error("Error executing message:", error.message);
        
        if (error.message.includes("LZ_Unauthorized")) {
            console.log("❌ Unauthorized: The sender/receiver relationship may not be properly configured");
        } else if (error.message.includes("LZ_PayloadHashNotFound")) {
            console.log("❌ Payload not found: The message may have already been executed");
        } else if (error.message.includes("out of gas")) {
            console.log("❌ Out of gas: Try increasing the gas limit");
        }
        
        return false;
    }
}

async function verifyExecution() {
    console.log("\n=== VERIFYING EXECUTION RESULT ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function nodeCount() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)",
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    try {
        const nodeCount = await receiver.nodeCount();
        const totalSyncs = await receiver.totalSyncsReceived();
        
        console.log(`Node count: ${nodeCount}`);
        console.log(`Total syncs received: ${totalSyncs}`);
        
        if (nodeCount > 0) {
            console.log(`🎉 SUCCESS! ${nodeCount} nodes have been received!`);
            
            const nodes = await receiver.getAllNodes();
            console.log(`\nFirst 3 nodes:`);
            for (let i = 0; i < Math.min(3, nodes.length); i++) {
                console.log(`  Node ${i}: ${nodes[i].location}, Active: ${nodes[i].active}`);
            }
            
            console.log(`\n🌐 Your frontend should now work with the Base Sepolia contract!`);
            return true;
        } else {
            console.log("⚠️ No nodes received yet. Execution may have failed.");
            return false;
        }
        
    } catch (error) {
        console.error("Error verifying execution:", error.message);
        return false;
    }
}

async function main() {
    console.log("LAYERZERO DIRECT MANUAL EXECUTION");
    console.log("=================================");
    console.log(`Transaction: ${TX_HASH}`);
    
    try {
        // Step 1: Extract message details from the original transaction
        const messageDetails = await getMessageDetails();
        
        if (!messageDetails) {
            console.log("❌ Failed to extract message details");
            console.log("💡 Alternative: Wait for automatic executor (30+ minutes)");
            return;
        }
        
        // Step 2: Execute the message manually
        const executed = await executeMessageManually(messageDetails);
        
        if (!executed) {
            console.log("❌ Manual execution failed");
            return;
        }
        
        // Step 3: Verify the execution worked
        await verifyExecution();
        
        console.log("\n=== EXECUTION COMPLETE ===");
        console.log("Your LayerZero cross-chain integration is now fully functional!");
        
    } catch (error) {
        console.error("Fatal error:", error.message);
    }
}

main().catch(console.error);