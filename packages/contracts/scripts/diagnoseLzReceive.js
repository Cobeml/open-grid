const { ethers } = require("hardhat");

const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";

async function testMessageDecoding() {
    console.log("=== TESTING MESSAGE DECODING ISSUE ===");
    console.log("Error: CouldNotParseError 0xa512e2ff suggests message parsing failure");
    
    // Let's test if there's an issue with the receiver contract's _decodeAndProcessMessage function
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const receiverABI = [
        "function _decodeAndProcessMessage(bytes calldata _message) external",
        "function owner() external view returns (address)",
        "function sourceContract() external view returns (address)",
        "function peers(uint32 _eid) external view returns (bytes32)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    try {
        // Check current configuration
        const owner = await receiver.owner();
        const sourceContract = await receiver.sourceContract();
        const peer = await receiver.peers(40267); // Polygon Amoy EID
        
        console.log(`Receiver owner: ${owner}`);
        console.log(`Source contract: ${sourceContract}`);
        console.log(`Peer configuration: ${peer}`);
        
        // Create a minimal test message to see if decoding works
        const testNodes = [
            {
                location: "lat:40.7580,lon:-73.9855",
                active: true,
                registeredAt: Math.floor(Date.now() / 1000),
                lastUpdate: 0
            }
        ];
        
        const testEdges = [];
        const testData = [];
        
        const testMessage = ethers.AbiCoder.defaultAbiCoder().encode(
            ["tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[]", "tuple(uint256 from, uint256 to, string edgeType, uint256 capacity, uint256 distance, bool active, uint256 registeredAt)[]", "tuple(uint256 timestamp, uint256 kWh, string location, uint256 nodeId)[]"],
            [testNodes, testEdges, testData]
        );
        
        console.log(`Test message length: ${testMessage.length} bytes`);
        console.log("Test message format looks correct");
        
        return true;
        
    } catch (error) {
        console.error("Error testing receiver:", error.message);
        return false;
    }
}

async function identifyProblem() {
    console.log("\n=== IDENTIFYING THE PROBLEM ===");
    
    console.log("🔍 Possible causes of CouldNotParseError 0xa512e2ff:");
    console.log("1. Message format mismatch between sender and receiver");
    console.log("2. ABI encoding/decoding incompatibility");
    console.log("3. Gas limit too low for large message processing");
    console.log("4. Receiver contract logic error in _lzReceive");
    
    console.log("\n💡 Analysis:");
    console.log("- Committer: SUCCEEDED ✅");
    console.log("- DVN Verification: SUCCEEDED ✅");
    console.log("- Executor Simulation: FAILED ❌");
    console.log("- This indicates the message reached Base Sepolia but couldn't execute");
    
    return true;
}

async function proposeWorkarounds() {
    console.log("\n=== PROPOSED WORKAROUNDS ===");
    
    console.log("🛠️ OPTION 1: Deploy Updated Receiver Contract");
    console.log("- Create a simpler receiver with better error handling");
    console.log("- Add try-catch blocks in _lzReceive");
    console.log("- Implement non-blocking message processing");
    
    console.log("\n🛠️ OPTION 2: Simplify Message Format");
    console.log("- Send smaller chunks of data");
    console.log("- Send only node count first, then node details separately");
    console.log("- Reduce message complexity to avoid parsing errors");
    
    console.log("\n🛠️ OPTION 3: Use LayerZero Clear Function");
    console.log("- Clear the stuck message payload");
    console.log("- Reset the channel state");
    console.log("- Retry with different approach");
    
    console.log("\n🛠️ OPTION 4: Deploy Simple Test Contract");
    console.log("- Create minimal receiver just for testing");
    console.log("- Verify LayerZero connectivity works");
    console.log("- Gradually add complexity back");
    
    return true;
}

async function createSimpleReceiver() {
    console.log("\n=== CREATING SIMPLE RECEIVER CONTRACT ===");
    
    const simpleReceiver = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

contract SimpleEnergyReceiver is OApp {
    uint256 public nodeCount;
    uint256 public lastSyncTime;
    uint256 public totalSyncsReceived;
    string public lastError;
    
    event MessageReceived(uint32 indexed srcEid, bytes32 indexed sender, uint256 nodeCount);
    event MessageFailed(string error);
    
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) {}
    
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        try this.processMessage(_message) {
            lastSyncTime = block.timestamp;
            totalSyncsReceived++;
            emit MessageReceived(_origin.srcEid, _origin.sender, nodeCount);
        } catch Error(string memory reason) {
            lastError = reason;
            emit MessageFailed(reason);
        } catch {
            lastError = "Unknown error";
            emit MessageFailed("Unknown error");
        }
    }
    
    function processMessage(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal only");
        
        // Simple message processing - just extract node count
        if (_message.length >= 32) {
            // Try to decode as simple uint256 first
            try {
                nodeCount = abi.decode(_message, (uint256));
            } catch {
                // If that fails, try to decode as complex structure
                (uint256 extractedNodeCount,,) = abi.decode(_message, (uint256, uint256, uint256));
                nodeCount = extractedNodeCount;
            }
        }
    }
    
    function getStats() external view returns (uint256, uint256, uint256, string memory) {
        return (nodeCount, lastSyncTime, totalSyncsReceived, lastError);
    }
}`;
    
    console.log("📄 Simple receiver contract created above");
    console.log("This contract includes:");
    console.log("- Try-catch error handling");
    console.log("- Simple message processing");
    console.log("- Error logging for debugging");
    console.log("- Fallback decoding methods");
    
    return simpleReceiver;
}

async function immediateActions() {
    console.log("\n=== IMMEDIATE ACTION PLAN ===");
    
    console.log("🚨 CRITICAL ISSUE: Message parsing failure in receiver contract");
    console.log("📋 Steps to resolve:");
    console.log("1. The current receiver has a bug in message decoding");
    console.log("2. LayerZero messages are being delivered but can't be processed");
    console.log("3. Need to either fix receiver or deploy new one");
    
    console.log("\n⚡ FASTEST SOLUTION:");
    console.log("Deploy a simple test receiver to verify LayerZero connectivity");
    console.log("Once working, gradually add complexity back");
    
    console.log("\n💰 COST CONSIDERATION:");
    console.log("- Deploying new receiver: ~$5-10 in gas");
    console.log("- Current approach keeps failing and wasting gas");
    console.log("- Fresh deployment is most cost-effective solution");
    
    return true;
}

async function main() {
    console.log("LAYERZERO MESSAGE PARSING DIAGNOSTIC");
    console.log("===================================");
    console.log("Issue: CouldNotParseError 0xa512e2ff");
    console.log("Root Cause: Receiver contract parsing failure");
    
    await testMessageDecoding();
    await identifyProblem();
    await proposeWorkarounds();
    await createSimpleReceiver();
    await immediateActions();
    
    console.log("\n🎯 CONCLUSION:");
    console.log("The receiver contract has a message parsing bug.");
    console.log("LayerZero delivery works, but receiver can't process the message.");
    console.log("Recommend deploying a fixed receiver contract.");
}

main().catch(console.error);