// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

/**
 * @title MinimalTestReceiver
 * @notice Ultra-simple LayerZero receiver to test basic connectivity
 * @dev This contract will never revert and accepts any message format
 */
contract MinimalTestReceiver is OApp {
    
    // Simple state
    uint256 public messageCount;
    uint256 public lastValue;
    string public lastMessage;
    uint256 public totalBytesReceived;
    
    // Events for debugging
    event MessageReceived(uint256 indexed count, uint256 value, string message);
    event RawMessageReceived(uint256 indexed count, uint256 length, bytes32 firstBytes);
    event CrossChainSuccess(uint32 indexed srcEid, address indexed sender);
    
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}
    
    /**
     * @notice LayerZero message handler - accepts ANY message format
     * @dev This function will never revert to test LayerZero connectivity
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        messageCount++;
        totalBytesReceived += _message.length;
        
        // Extract first 32 bytes for debugging
        bytes32 firstBytes;
        if (_message.length >= 32) {
            assembly {
                firstBytes := calldataload(add(_message.offset, 0))
            }
        }
        
        emit RawMessageReceived(messageCount, _message.length, firstBytes);
        emit CrossChainSuccess(_origin.srcEid, address(uint160(uint256(_origin.sender))));
        
        // Try simple decoding (never revert)
        if (_message.length >= 32) {
            // Try to decode as uint256
            try this._tryDecodeUint256(_message) returns (uint256 value) {
                lastValue = value;
                lastMessage = "decoded_uint256";
                emit MessageReceived(messageCount, value, "uint256_success");
            } catch {
                // Try to decode as string
                try this._tryDecodeString(_message) returns (string memory str) {
                    lastMessage = str;
                    lastValue = _message.length;
                    emit MessageReceived(messageCount, _message.length, "string_success");
                } catch {
                    // Store raw length as value
                    lastValue = _message.length;
                    lastMessage = "raw_bytes";
                    emit MessageReceived(messageCount, _message.length, "raw_success");
                }
            }
        } else {
            // Very small message
            lastValue = _message.length;
            lastMessage = "tiny_message";
            emit MessageReceived(messageCount, _message.length, "tiny_success");
        }
    }
    
    // External functions for try-catch (these can revert safely)
    function _tryDecodeUint256(bytes calldata _message) external pure returns (uint256) {
        return abi.decode(_message, (uint256));
    }
    
    function _tryDecodeString(bytes calldata _message) external pure returns (string memory) {
        return abi.decode(_message, (string));
    }
    
    // View functions for testing
    function getStats() external view returns (
        uint256 count,
        uint256 value,
        string memory message,
        uint256 totalBytes
    ) {
        return (messageCount, lastValue, lastMessage, totalBytesReceived);
    }
    
    function isWorking() external view returns (bool) {
        return messageCount > 0;
    }
    
    // Simple interface compatibility for frontend
    function nodeCount() external view returns (uint256) {
        return lastValue; // Return last decoded value as "node count"
    }
    
    function getAllNodes() external view returns (uint256[] memory) {
        uint256[] memory mockNodes = new uint256[](1);
        mockNodes[0] = lastValue;
        return mockNodes;
    }
}