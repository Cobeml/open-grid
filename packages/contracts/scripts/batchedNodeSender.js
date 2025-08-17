const { ethers } = require("hardhat");

// Contract addresses
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const MINIMAL_RECEIVER_ADDRESS = "0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6";

async function createBatchedNodeSender() {
    console.log("=== CREATING BATCHED NODE SENDER SOLUTION ===");
    console.log("This will send nodes in small batches to avoid the 0xa512e2ff error");
    
    const batchedSenderContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

contract BatchedNodeSender is OApp {
    using OptionsBuilder for bytes;
    
    uint32 public constant BASE_SEPOLIA_EID = 40245;
    address public destinationContract;
    uint256 public constant BATCH_SIZE = 3; // Send max 3 nodes per batch
    
    // Simple node structure (no large strings)
    struct SimpleNode {
        uint256 id;
        uint256 lat; // Latitude * 1000000
        uint256 lon; // Longitude * 1000000  
        bool active;
    }
    
    SimpleNode[] public nodes;
    uint256 public lastBatchSent = 0;
    uint256 public totalBatchesSent = 0;
    
    event BatchSent(uint256 batchIndex, uint256 nodeCount, uint256 fee);
    event NodesAdded(uint256 count);
    
    constructor(
        address _endpoint,
        address _owner,
        address _destination
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        destinationContract = _destination;
    }
    
    function addSimpleNodes() external onlyOwner {
        // Add NYC nodes with simple coordinates (lat/lon * 1000000)
        nodes.push(SimpleNode(0, 40758000, -73985500, true)); // Times Square
        nodes.push(SimpleNode(1, 40707400, -74011300, true)); // Wall Street
        nodes.push(SimpleNode(2, 40748400, -73985700, true)); // Empire State
        nodes.push(SimpleNode(3, 40712700, -74013400, true)); // One WTC
        nodes.push(SimpleNode(4, 40750500, -73973200, true)); // Grand Central
        
        emit NodesAdded(5);
    }
    
    function sendNextBatch() external payable onlyOwner {
        require(destinationContract != address(0), "No destination");
        require(lastBatchSent < nodes.length, "All batches sent");
        
        // Calculate batch
        uint256 startIdx = lastBatchSent;
        uint256 endIdx = startIdx + BATCH_SIZE;
        if (endIdx > nodes.length) {
            endIdx = nodes.length;
        }
        
        uint256 batchCount = endIdx - startIdx;
        SimpleNode[] memory batch = new SimpleNode[](batchCount);
        
        for (uint256 i = 0; i < batchCount; i++) {
            batch[i] = nodes[startIdx + i];
        }
        
        // Encode as simple message
        bytes memory payload = abi.encode(batch);
        
        // Send with minimal gas
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0); // Lower gas limit
        
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        _lzSend(
            BASE_SEPOLIA_EID,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
        
        lastBatchSent = endIdx;
        totalBatchesSent++;
        
        emit BatchSent(totalBatchesSent, batchCount, fee.nativeFee);
    }
    
    function quoteBatchFee() external view returns (uint256) {
        if (lastBatchSent >= nodes.length) return 0;
        
        uint256 startIdx = lastBatchSent;
        uint256 endIdx = startIdx + BATCH_SIZE;
        if (endIdx > nodes.length) endIdx = nodes.length;
        
        uint256 batchCount = endIdx - startIdx;
        SimpleNode[] memory batch = new SimpleNode[](batchCount);
        
        bytes memory payload = abi.encode(batch);
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0);
            
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        return fee.nativeFee;
    }
    
    function getBatchStatus() external view returns (
        uint256 totalNodes,
        uint256 lastBatch,
        uint256 totalBatches,
        uint256 remaining
    ) {
        return (
            nodes.length,
            lastBatchSent,
            totalBatchesSent,
            nodes.length > lastBatchSent ? nodes.length - lastBatchSent : 0
        );
    }
    
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {
        // Not used - this is a sender only
        revert("Sender only");
    }
}`;
    
    console.log("📄 Batched Node Sender contract created");
    console.log("Features:");
    console.log("- Sends max 3 nodes per batch");
    console.log("- Uses simple coordinates (no strings)");
    console.log("- Lower gas limits");
    console.log("- Avoids message size issues");
    
    return batchedSenderContract;
}

async function createSimpleReceiver() {
    console.log("\n=== CREATING SIMPLE BATCH RECEIVER ===");
    
    const simpleBatchReceiver = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

contract SimpleBatchReceiver is OApp {
    
    struct SimpleNode {
        uint256 id;
        uint256 lat;
        uint256 lon;
        bool active;
    }
    
    mapping(uint256 => SimpleNode) public nodes;
    uint256 public nodeCount;
    uint256 public batchesReceived;
    
    event BatchReceived(uint256 batchNumber, uint256 nodeCount);
    event NodeStored(uint256 id, uint256 lat, uint256 lon);
    
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) {}
    
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        // Simple decoding - should not fail
        SimpleNode[] memory batch = abi.decode(_message, (SimpleNode[]));
        
        for (uint256 i = 0; i < batch.length; i++) {
            nodes[batch[i].id] = batch[i];
            if (batch[i].id >= nodeCount) {
                nodeCount = batch[i].id + 1;
            }
            emit NodeStored(batch[i].id, batch[i].lat, batch[i].lon);
        }
        
        batchesReceived++;
        emit BatchReceived(batchesReceived, batch.length);
    }
    
    function getAllNodes() external view returns (SimpleNode[] memory) {
        SimpleNode[] memory allNodes = new SimpleNode[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];
        }
        return allNodes;
    }
    
    function getStats() external view returns (uint256, uint256) {
        return (nodeCount, batchesReceived);
    }
}`;
    
    console.log("📄 Simple Batch Receiver contract created");
    console.log("Features:");
    console.log("- Accepts SimpleNode batches");
    console.log("- No complex strings");
    console.log("- Minimal processing");
    console.log("- Frontend compatible");
    
    return simpleBatchReceiver;
}

async function createManualBatchSender() {
    console.log("\n=== CREATING MANUAL BATCH SENDER SCRIPT ===");
    
    const manualBatchScript = `
const { ethers } = require("hardhat");

async function sendManualBatch() {
    console.log("=== SENDING MANUAL SIMPLE BATCH ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create simple message manually
    const simpleNodes = [
        {
            id: 0,
            lat: 40758000, // Times Square * 1000000
            lon: -73985500,
            active: true
        },
        {
            id: 1, 
            lat: 40707400, // Wall Street * 1000000
            lon: -74011300,
            active: true
        }
    ];
    
    // Encode simple message
    const encodedMessage = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256 id, uint256 lat, uint256 lon, bool active)[]"],
        [simpleNodes]
    );
    
    console.log(\`Simple message size: \${encodedMessage.length} bytes\`);
    console.log("This should be small enough to avoid 0xa512e2ff error");
    
    // Send using existing sender contract with custom message
    const senderABI = ["function syncData() external payable"];
    const sender = new ethers.Contract("${SENDER_ADDRESS_POLYGON}", senderABI, wallet);
    
    // Note: This would require modifying the sender to accept custom messages
    // For now, this demonstrates the concept
}`;
    
    console.log("📄 Manual batch sender script concept created");
    
    return manualBatchScript;
}

async function implementImmediateFix() {
    console.log("\n=== IMMEDIATE FIX: SEND SIMPLE MESSAGE ===");
    
    console.log("🎯 FASTEST SOLUTION:");
    console.log("1. The error 0xa512e2ff is caused by complex 27-node message");
    console.log("2. LayerZero can't parse the large, complex ABI-encoded structure");
    console.log("3. Solution: Send a much simpler message format");
    
    console.log("\n💡 PROVEN APPROACH:");
    console.log("- Send just node COUNT first (single uint256)");
    console.log("- Use minimal receiver that accepts any format");
    console.log("- Prove LayerZero connectivity works");
    console.log("- Then iterate to more complex messages");
    
    // Let's create a simple test by modifying sender temporarily
    const simplestTest = `
// Simplest possible test: just send the number 27
// This should work if LayerZero connectivity is fine

const testMessage = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [27]);
// Message size: 32 bytes (vs 2819 bytes for full structure)
// This eliminates the parsing complexity issue
`;
    
    console.log("📋 NEXT STEPS:");
    console.log("1. Deploy new simple contracts OR");
    console.log("2. Modify existing sender to send just nodeCount");
    console.log("3. Test with minimal receiver");
    console.log("4. Once working, add complexity gradually");
    
    return simplestTest;
}

async function main() {
    console.log("BATCHED NODE SENDER SOLUTION");
    console.log("===========================");
    console.log("Problem: 0xa512e2ff error from complex 27-node message (2819 bytes)");
    console.log("Solution: Send small batches of simple nodes");
    
    await createBatchedNodeSender();
    await createSimpleReceiver();
    await createManualBatchSender();
    await implementImmediateFix();
    
    console.log("\n🎯 RECOMMENDATION:");
    console.log("The 0xa512e2ff error is a LayerZero protocol-level parsing issue.");
    console.log("Complex ABI structures with strings are too large/complex.");
    console.log("Deploy the batched solution or send ultra-simple messages first.");
    
    console.log("\n📍 Current Test Receiver: ${MINIMAL_RECEIVER_ADDRESS}");
    console.log("This receiver should work with simple messages.");
}

main().catch(console.error);