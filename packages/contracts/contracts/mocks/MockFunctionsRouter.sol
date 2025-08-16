// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/interfaces/IFunctionsClient.sol";

/**
 * @title MockFunctionsRouter
 * @notice Minimal router to test FunctionsClient-based contracts.
 * - Stores requestId -> client mapping on sendRequest
 * - Exposes fulfill(requestId, response, err) to call client's handleOracleFulfillment
 */
contract MockFunctionsRouter {
    // requestId => client (FunctionsClient contract)
    mapping(bytes32 => address) public requestIdToClient;
    // simple nonce to diversify requestIds
    uint256 private _nonce;

    event MockRequestStored(bytes32 indexed requestId, address indexed client);

    function sendRequest(
        uint64 /* subscriptionId */, 
        bytes calldata /* data */, 
        uint16 /* dataVersion */, 
        uint32 /* callbackGasLimit */, 
        bytes32 /* donId */
    ) external returns (bytes32) {
        // Derive a pseudo-unique requestId for testing
        bytes32 requestId = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, _nonce++)
        );
        requestIdToClient[requestId] = msg.sender; // msg.sender is the client contract
        emit MockRequestStored(requestId, msg.sender);
        return requestId;
    }

    /**
     * @notice Test helper to simulate DON fulfillment. Looks up the client by requestId
     *         and invokes handleOracleFulfillment on it with provided payloads.
     */
    function fulfillRequestDirect(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        address client = requestIdToClient[requestId];
        require(client != address(0), "Unknown requestId");
        IFunctionsClient(client).handleOracleFulfillment(requestId, response, err);
    }
}


