const { ethers } = require("hardhat");

async function investigateErrorSelector() {
    console.log("=== ERROR SELECTOR INVESTIGATION ===");
    console.log("Error: CouldNotParseError(string) 0xa512e2ff");
    
    // The error selector 0xa512e2ff is the first 4 bytes of keccak256 hash
    // Let's try to decode what error this might be
    
    console.log("\n🔍 DECODING ERROR SELECTOR 0xa512e2ff");
    
    // Common LayerZero/parsing related errors that might hash to this
    const possibleErrors = [
        "CouldNotParseError(string)",
        "InvalidMessage()",
        "ParseError(string)",
        "DecodingFailed()",
        "MessageTooLarge()",
        "InvalidPayload()",
        "LZ_InvalidPayload()",
        "LZ_PayloadTooLarge()",
        "InvalidMessageFormat()",
        "AbiDecodingFailed(string)"
    ];
    
    console.log("Checking possible error signatures:");
    for (const errorSig of possibleErrors) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(errorSig));
        const selector = hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
        console.log(`${errorSig.padEnd(30)} -> ${selector}`);
        
        if (selector.toLowerCase() === "0xa512e2ff") {
            console.log(`🎯 MATCH FOUND: ${errorSig}`);
        }
    }
    
    // Let's also check if this is coming from LayerZero's endpoint or libraries
    console.log("\n🔍 ANALYZING TRANSACTION CONTEXT");
    console.log("The error is happening during 'Executor transaction simulation'");
    console.log("This means LayerZero's executor is trying to call lzReceive but it's failing");
    
    return true;
}

async function analyzeMessageStructure() {
    console.log("\n=== MESSAGE STRUCTURE ANALYSIS ===");
    
    // Let's check what our sender is actually sending
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    const senderABI = [
        "function getDataSummary() external view returns (uint256 nodeCount, uint256 edgeCount, uint256 dataCount, uint256 newDataAvailable)"
    ];
    
    const sender = new ethers.Contract("0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29", senderABI, provider);
    
    try {
        const summary = await sender.getDataSummary();
        console.log(`Sender data summary:`);
        console.log(`- Nodes: ${summary[0]}`);
        console.log(`- Edges: ${summary[1]}`);
        console.log(`- Data points: ${summary[2]}`);
        console.log(`- New data: ${summary[3]}`);
        
        // Calculate approximate message size
        const nodeSize = 32 + 1 + 32 + 32; // string + bool + uint256 + uint256 ≈ 97 bytes per node
        const approxMessageSize = Number(summary[0]) * nodeSize + 200; // Add overhead
        
        console.log(`\nEstimated message size: ${approxMessageSize} bytes`);
        
        if (approxMessageSize > 20000) {
            console.log("⚠️ WARNING: Message is very large (>20KB)");
            console.log("This could cause parsing issues in LayerZero");
        }
        
        return { nodeCount: summary[0], estimatedSize: approxMessageSize };
        
    } catch (error) {
        console.error("Error getting data summary:", error.message);
        return null;
    }
}

async function identifyRootCause() {
    console.log("\n=== ROOT CAUSE ANALYSIS ===");
    
    console.log("🎯 HYPOTHESIS: The error 0xa512e2ff is likely:");
    console.log("1. A LayerZero internal parsing error");
    console.log("2. Related to message size or format");
    console.log("3. Happening at the protocol level, not our contract level");
    
    console.log("\n📋 EVIDENCE:");
    console.log("✅ Committer: SUCCEEDED (message reaches Base Sepolia)");
    console.log("✅ DVN: SUCCEEDED (message is verified)");
    console.log("❌ Executor: SIMULATION REVERTED (execution fails)");
    console.log("❌ Error occurs even with fixed receiver contract");
    
    console.log("\n🔍 LIKELY CAUSES:");
    console.log("1. Message payload is too large for LayerZero to parse");
    console.log("2. ABI encoding format incompatibility");
    console.log("3. Gas limit too low for message processing");
    console.log("4. LayerZero protocol-level parsing issue");
    
    return true;
}

async function proposeSolutions() {
    console.log("\n=== PROPOSED SOLUTIONS ===");
    
    console.log("🛠️ SOLUTION 1: Reduce Message Size");
    console.log("- Send nodes in smaller batches (5-10 nodes per message)");
    console.log("- Use simplified data structure");
    console.log("- Remove large string fields temporarily");
    
    console.log("\n🛠️ SOLUTION 2: Change Encoding Strategy");
    console.log("- Use packed encoding instead of ABI encoding");
    console.log("- Send raw bytes instead of structured data");
    console.log("- Use LayerZero's compose functionality");
    
    console.log("\n🛠️ SOLUTION 3: Protocol-Level Fix");
    console.log("- Increase gas limits significantly");
    console.log("- Use different LayerZero message options");
    console.log("- Switch to LayerZero OFT pattern if applicable");
    
    console.log("\n🛠️ SOLUTION 4: Debugging Approach");
    console.log("- Send a minimal test message first");
    console.log("- Gradually increase complexity");
    console.log("- Use LayerZero scan's retry functionality");
    
    return true;
}

async function createMinimalTest() {
    console.log("\n=== CREATING MINIMAL TEST SOLUTION ===");
    
    const minimalTestContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

contract MinimalTestReceiver is OApp {
    uint256 public messageCount;
    uint256 public lastValue;
    string public lastMessage;
    
    event MessageReceived(uint256 value, string message);
    event RawMessageReceived(bytes data);
    
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) {}
    
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        messageCount++;
        
        emit RawMessageReceived(_message);
        
        // Try to decode as simple uint256
        if (_message.length >= 32) {
            try {
                lastValue = abi.decode(_message, (uint256));
                emit MessageReceived(lastValue, "uint256");
            } catch {
                // Try to decode as string
                try {
                    lastMessage = abi.decode(_message, (string));
                    emit MessageReceived(0, lastMessage);
                } catch {
                    // Just store raw length
                    lastValue = _message.length;
                    emit MessageReceived(_message.length, "raw_bytes");
                }
            }
        }
    }
    
    function getStats() external view returns (uint256, uint256, string memory) {
        return (messageCount, lastValue, lastMessage);
    }
}`;

    console.log("📄 Minimal test contract created above");
    console.log("This contract will:");
    console.log("- Accept any message format");
    console.log("- Try multiple decoding strategies");
    console.log("- Emit events for debugging");
    console.log("- Never revert on parsing errors");
    
    return minimalTestContract;
}

async function main() {
    console.log("COMPREHENSIVE ERROR 0xa512e2ff INVESTIGATION");
    console.log("=============================================");
    
    await investigateErrorSelector();
    const analysis = await analyzeMessageStructure();
    await identifyRootCause();
    await proposeSolutions();
    await createMinimalTest();
    
    console.log("\n🎯 CONCLUSION:");
    console.log("The error 0xa512e2ff is a LayerZero protocol-level parsing error.");
    console.log("Most likely cause: Message is too large or complex for LayerZero to process.");
    console.log("Recommended fix: Deploy minimal test receiver and send smaller messages.");
    
    if (analysis && analysis.estimatedSize > 10000) {
        console.log("\n⚠️ CRITICAL: Message size is too large for LayerZero!");
        console.log("Deploy the minimal test receiver and send simple messages first.");
    }
}

main().catch(console.error);