// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title EnergyMonitor
 * @notice A smart contract for monitoring electrical energy data across multiple IoT nodes
 * @dev Integrates with Chainlink Functions to securely ingest off-chain electricity data
 * from sources like UtilityAPI or smart meters, supporting multi-chain deployment
 */
contract EnergyMonitor is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // Data structures
    struct EnergyData {
        uint256 timestamp;      // Unix timestamp when data was recorded
        uint256 kWh;           // Energy consumption in kWh (scaled by 1000 for precision)
        string location;       // GPS coordinates as "lat:40.7128,lon:-74.0060"
        uint256 nodeId;        // Unique identifier for the energy monitoring node
        address reporter;      // Address that reported this data point
    }

    struct Node {
        uint256 id;            // Unique node identifier
        string location;       // GPS coordinates of the node
        bool active;           // Whether the node is currently active
        uint256 lastUpdate;    // Timestamp of last data update
    }

    // State variables
    mapping(uint256 => EnergyData) public dataPoints;
    mapping(uint256 => Node) public nodes;
    mapping(bytes32 => uint256) private requestToNodeId;
    
    uint256 public dataCount;
    uint256 public nodeCount;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donId;

    // Chainlink Functions state
    bytes32 public lastRequestId;
    bytes public lastResponse;
    bytes public lastError;

    // Events
    event DataUpdated(
        uint256 indexed dataId,
        uint256 indexed nodeId,
        uint256 kWh,
        string location,
        uint256 timestamp
    );
    
    event NodeRegistered(uint256 indexed nodeId, string location);
    event NodeDeactivated(uint256 indexed nodeId);
    event RequestSent(bytes32 indexed requestId, uint256 indexed nodeId);

    // Custom errors
    error UnexpectedRequestID(bytes32 requestId);
    error EmptyResponse();
    error NodeNotFound(uint256 nodeId);
    error InvalidLocation();
    error NodeAlreadyExists(uint256 nodeId);

    /**
     * @notice Deploy the EnergyMonitor contract
     * @param router Chainlink Functions router address for the target network
     * @param _subscriptionId Chainlink Functions subscription ID
     * @param _gasLimit Gas limit for Chainlink Functions requests
     * @param _donId DON ID for the Chainlink Functions network
     */
    constructor(
        address router,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donId
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donId = _donId;
    }

    /**
     * @notice Register a new energy monitoring node
     * @param location GPS coordinates in format "lat:40.7128,lon:-74.0060"
     * @return nodeId The unique identifier assigned to the new node
     */
    function registerNode(string calldata location) external onlyOwner returns (uint256) {
        if (bytes(location).length == 0) revert InvalidLocation();
        
        uint256 nodeId = nodeCount++;
        nodes[nodeId] = Node({
            id: nodeId,
            location: location,
            active: true,
            lastUpdate: block.timestamp
        });

        emit NodeRegistered(nodeId, location);
        return nodeId;
    }

    /**
     * @notice Request energy data update for a specific node via Chainlink Functions
     * @param nodeId The ID of the node to update
     * @param source JavaScript source code to execute in Chainlink Functions DON
     * @param encryptedSecretsUrls Encrypted URLs for secrets (if using remote secrets)
     * @param donHostedSecretsSlotID Slot ID for DON-hosted secrets
     * @param donHostedSecretsVersion Version of DON-hosted secrets
     * @param args Arguments to pass to the JavaScript function
     * @return requestId The Chainlink Functions request ID
     */
    function requestDataUpdate(
        uint256 nodeId,
        string calldata source,
        bytes calldata encryptedSecretsUrls,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] calldata args
    ) external onlyOwner returns (bytes32) {
        if (!nodes[nodeId].active) revert NodeNotFound(nodeId);

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);

        // Add secrets if provided
        if (encryptedSecretsUrls.length > 0) {
            req.addSecretsReference(encryptedSecretsUrls);
        } else if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(donHostedSecretsSlotID, donHostedSecretsVersion);
        }

        // Add arguments if provided
        if (args.length > 0) req.setArgs(args);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        requestToNodeId[requestId] = nodeId;
        lastRequestId = requestId;

        emit RequestSent(requestId, nodeId);
        return requestId;
    }

    /**
     * @notice Chainlink Functions callback to handle the response
     * @param requestId The request ID that was returned from requestDataUpdate
     * @param response The response data from the executed JavaScript function
     * @param err Any error that occurred during the function execution
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        lastResponse = response;
        lastError = err;

        if (response.length == 0) {
            revert EmptyResponse();
        }

        uint256 nodeId = requestToNodeId[requestId];
        uint256 kWh = abi.decode(response, (uint256));

        // Store the energy data
        dataPoints[dataCount] = EnergyData({
            timestamp: block.timestamp,
            kWh: kWh,
            location: nodes[nodeId].location,
            nodeId: nodeId,
            reporter: msg.sender
        });

        // Update node's last update timestamp
        nodes[nodeId].lastUpdate = block.timestamp;

        emit DataUpdated(
            dataCount,
            nodeId,
            kWh,
            nodes[nodeId].location,
            block.timestamp
        );

        dataCount++;
        delete requestToNodeId[requestId];
    }

    /**
     * @notice Get the latest energy data for a specific node
     * @param nodeId The ID of the node to query
     * @return The most recent EnergyData struct for the node
     */
    function getLatestDataForNode(uint256 nodeId) external view returns (EnergyData memory) {
        if (!nodes[nodeId].active) revert NodeNotFound(nodeId);

        for (uint256 i = dataCount; i > 0; i--) {
            if (dataPoints[i - 1].nodeId == nodeId) {
                return dataPoints[i - 1];
            }
        }

        revert("No data found for node");
    }

    /**
     * @notice Get all registered nodes
     * @return Array of all Node structs
     */
    function getAllNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];
        }
        return allNodes;
    }

    /**
     * @notice Get energy data for a specific data point ID
     * @param dataId The ID of the data point to retrieve
     * @return The EnergyData struct for the specified ID
     */
    function getDataPoint(uint256 dataId) external view returns (EnergyData memory) {
        require(dataId < dataCount, "Data point does not exist");
        return dataPoints[dataId];
    }

    /**
     * @notice Get multiple data points within a range
     * @param startId The starting data point ID (inclusive)
     * @param endId The ending data point ID (inclusive)
     * @return Array of EnergyData structs within the specified range
     */
    function getDataRange(uint256 startId, uint256 endId) external view returns (EnergyData[] memory) {
        require(startId <= endId, "Invalid range");
        require(endId < dataCount, "End ID out of bounds");
        
        uint256 length = endId - startId + 1;
        EnergyData[] memory result = new EnergyData[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = dataPoints[startId + i];
        }
        
        return result;
    }

    /**
     * @notice Deactivate a node (stops accepting data updates)
     * @param nodeId The ID of the node to deactivate
     */
    function deactivateNode(uint256 nodeId) external onlyOwner {
        if (!nodes[nodeId].active) revert NodeNotFound(nodeId);
        nodes[nodeId].active = false;
        emit NodeDeactivated(nodeId);
    }

    /**
     * @notice Reactivate a previously deactivated node
     * @param nodeId The ID of the node to reactivate
     */
    function reactivateNode(uint256 nodeId) external onlyOwner {
        require(nodeId < nodeCount, "Node does not exist");
        nodes[nodeId].active = true;
        emit NodeRegistered(nodeId, nodes[nodeId].location);
    }

    /**
     * @notice Update the Chainlink Functions subscription ID
     * @param _subscriptionId New subscription ID
     */
    function updateSubscription(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Update the gas limit for Chainlink Functions requests
     * @param _gasLimit New gas limit
     */
    function updateGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }

    /**
     * @notice Update the DON ID for Chainlink Functions
     * @param _donId New DON ID
     */
    function updateDonId(bytes32 _donId) external onlyOwner {
        donId = _donId;
    }

    /**
     * @notice Emergency function to withdraw any ETH sent to the contract
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}