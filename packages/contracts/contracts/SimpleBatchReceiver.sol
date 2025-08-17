// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

/**
 * @title SimpleBatchReceiver
 * @notice Receives batched energy nodes from Polygon Amoy
 * @dev Compatible with frontend expecting getAllNodes() interface
 */
contract SimpleBatchReceiver is OApp {
    
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}
    
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
}