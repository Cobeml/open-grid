// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title BatchedNodeSender
 * @notice Sends energy nodes in small batches to avoid LayerZero parsing limits
 * @dev Uses simple coordinate format (no strings) and small batch sizes
 */
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
        // Convert negative longitude to uint256 representation
        nodes.push(SimpleNode(0, 40758000, 286014500, true)); // Times Square (360 + -73.9855)
        nodes.push(SimpleNode(1, 40707400, 285988700, true)); // Wall Street (360 + -74.0113) 
        nodes.push(SimpleNode(2, 40748400, 286014300, true)); // Empire State (360 + -73.9857)
        nodes.push(SimpleNode(3, 40712700, 285986600, true)); // One WTC (360 + -74.0134)
        nodes.push(SimpleNode(4, 40750500, 286026800, true)); // Grand Central (360 + -73.9732)
        
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
}