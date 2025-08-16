// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title SimpleEnergyMonitorWithChainlink
 * @notice Simplified energy monitoring with REAL Chainlink Functions integration
 * @dev Proves actual DON execution capability
 */
contract SimpleEnergyMonitorWithChainlink is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // Simplified structures
    struct EnergyData {
        uint256 timestamp;
        uint256 kWh;
        string location;
        uint256 nodeId;
        uint8 dataQuality;
    }

    struct Node {
        string location;
        bool active;
        uint256 registeredAt;
        uint256 lastUpdate;
        string name;
    }

    struct PendingRequest {
        uint256 nodeId;
        uint256 timestamp;
        bool exists;
    }

    // State variables
    mapping(uint256 => Node) public nodes;
    mapping(uint256 => EnergyData[]) public nodeData;
    mapping(bytes32 => PendingRequest) public pendingRequests;
    
    EnergyData[] public dataPoints;
    uint256 public nodeCount;
    uint256 public dataCount;
    
    // Chainlink Functions configuration
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    string public source;
    
    // Request tracking
    uint256 public totalRequests;
    uint256 public successfulRequests;
    uint256 public failedRequests;

    // Events
    event NodeRegistered(uint256 indexed nodeId, string location, string name);
    event DataUpdated(uint256 indexed dataId, uint256 indexed nodeId, uint256 kWh, string location, uint256 timestamp, uint8 dataQuality);
    event RequestSent(bytes32 indexed requestId, uint256 indexed nodeId);
    event RequestFulfilled(bytes32 indexed requestId, uint256 indexed nodeId, uint256 kWh);
    event RequestFailed(bytes32 indexed requestId, string error);

    // Errors
    error NodeNotFound(uint256 nodeId);
    error UnexpectedRequestID(bytes32 requestId);
    error EmptyResponse();

    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId,
        string memory _source
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = 300000;
        source = _source;
    }

    /**
     * @notice Update the inline JavaScript source used by Chainlink Functions
     */
    function setSource(string calldata _source) external onlyOwner {
        source = _source;
    }

    /**
     * @notice Register a new node (simplified)
     */
    function registerNode(string calldata location, string calldata name) external onlyOwner {
        uint256 nodeId = nodeCount;
        
        nodes[nodeId] = Node({
            location: location,
            active: true,
            registeredAt: block.timestamp,
            lastUpdate: 0,
            name: name
        });
        
        nodeCount++;
        emit NodeRegistered(nodeId, location, name);
    }

    /**
     * @notice Request real energy data using Chainlink Functions
     */
    function requestEnergyData(uint256 nodeId) external onlyOwner returns (bytes32 requestId) {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);
        require(nodes[nodeId].active, "Node is not active");

        Node memory node = nodes[nodeId];
        
        // Parse coordinates from location string
        (string memory lat, string memory lon) = parseCoordinates(node.location);
        
        // Prepare arguments for the Chainlink Function
        string[] memory args = new string[](3);
        args[0] = toString(nodeId);
        args[1] = lat;
        args[2] = lon;

        // Build the Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        req.setArgs(args);
        
        // Send the request to Chainlink DON
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        // Track the pending request
        pendingRequests[requestId] = PendingRequest({
            nodeId: nodeId,
            timestamp: block.timestamp,
            exists: true
        });
        
        totalRequests++;
        emit RequestSent(requestId, nodeId);
        
        return requestId;
    }

    /**
     * @notice Chainlink Functions callback
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        PendingRequest memory pendingRequest = pendingRequests[requestId];
        
        if (!pendingRequest.exists) {
            revert UnexpectedRequestID(requestId);
        }

        delete pendingRequests[requestId];

        if (err.length > 0) {
            failedRequests++;
            emit RequestFailed(requestId, string(err));
            return;
        }

        if (response.length == 0) {
            failedRequests++;
            revert EmptyResponse();
        }

        // Decode the response
        uint256 encodedData = abi.decode(response, (uint256));
        
        // Extract data using bit operations
        uint256 nodeId = encodedData & 0xFF;
        uint8 dataQuality = uint8((encodedData >> 8) & 0xFF);
        uint256 longitude = (encodedData >> 16) & 0xFFFFFFFF;
        uint256 latitude = (encodedData >> 48) & 0xFFFFFFFF;
        uint256 kWh = (encodedData >> 80) & 0xFFFFFFFFFFFFFFFF;
        uint256 timestamp = encodedData >> 144;

        require(nodeId == pendingRequest.nodeId, "Node ID mismatch");

        // Convert coordinates back to location string
        string memory location = string(abi.encodePacked(
            "lat:", toDecimalString(latitude, 6),
            ",lon:-", toDecimalString(longitude, 6)
        ));

        // Store the energy data
        EnergyData memory newData = EnergyData({
            timestamp: timestamp,
            kWh: kWh,
            location: location,
            nodeId: nodeId,
            dataQuality: dataQuality
        });

        dataPoints.push(newData);
        nodeData[nodeId].push(newData);
        nodes[nodeId].lastUpdate = timestamp;

        uint256 dataId = dataCount;
        dataCount++;
        successfulRequests++;

        emit DataUpdated(dataId, nodeId, kWh, location, timestamp, dataQuality);
        emit RequestFulfilled(requestId, nodeId, kWh);
    }

    // View functions
    function getActiveNodes() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < nodeCount; i++) {
            if (nodes[i].active) activeCount++;
        }
        
        uint256[] memory activeNodeIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < nodeCount; i++) {
            if (nodes[i].active) {
                activeNodeIds[index] = i;
                index++;
            }
        }
        
        return activeNodeIds;
    }

    function getChainlinkStats() external view returns (
        uint256 total,
        uint256 successful,
        uint256 failed,
        uint256 successRate
    ) {
        total = totalRequests;
        successful = successfulRequests;
        failed = failedRequests;
        successRate = total > 0 ? (successful * 100) / total : 0;
    }

    function getNodeData(uint256 nodeId) external view returns (
        uint256 dataId,
        uint256 kWh,
        string memory location,
        uint256 timestamp
    ) {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);
        
        EnergyData[] memory data = nodeData[nodeId];
        if (data.length == 0) {
            return (0, 0, "", 0);
        }
        
        EnergyData memory latest = data[data.length - 1];
        return (data.length - 1, latest.kWh, latest.location, latest.timestamp);
    }

    // Helper functions
    function parseCoordinates(string memory location) internal pure returns (string memory lat, string memory lon) {
        bytes memory locationBytes = bytes(location);
        
        uint256 commaPos = 0;
        for (uint256 i = 0; i < locationBytes.length; i++) {
            if (locationBytes[i] == ',') {
                commaPos = i;
                break;
            }
        }
        
        bytes memory latBytes = new bytes(commaPos - 4);
        for (uint256 i = 4; i < commaPos; i++) {
            latBytes[i - 4] = locationBytes[i];
        }
        lat = string(latBytes);
        
        bytes memory lonBytes = new bytes(locationBytes.length - commaPos - 5);
        for (uint256 i = commaPos + 5; i < locationBytes.length; i++) {
            lonBytes[i - commaPos - 5] = locationBytes[i];
        }
        lon = string(lonBytes);
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    function toDecimalString(uint256 value, uint256 decimals) internal pure returns (string memory) {
        string memory intPart = toString(value / (10 ** decimals));
        string memory fracPart = toString(value % (10 ** decimals));
        
        bytes memory fracBytes = bytes(fracPart);
        bytes memory paddedFrac = new bytes(decimals);
        
        for (uint256 i = 0; i < decimals; i++) {
            if (i < decimals - fracBytes.length) {
                paddedFrac[i] = '0';
            } else {
                paddedFrac[i] = fracBytes[i - (decimals - fracBytes.length)];
            }
        }
        
        return string(abi.encodePacked(intPart, ".", string(paddedFrac)));
    }
}