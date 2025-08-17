// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title EnergyMonitor
 * @notice Smart contract for monitoring electrical energy data with Chainlink Functions
 * @dev Updated version using real Chainlink Functions for mock data generation
 * @dev Deployable on Polygon Amoy testnet
 * @dev Broadcasts mock time-series data via Chainlink Functions
 */
contract EnergyMonitor is Ownable, FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    // Data structures (same as legacy)
    struct EnergyData {
        uint256 timestamp; // Unix timestamp when data was recorded
        uint256 kWh; // Energy consumption in kWh (scaled by 1000 for precision)
        string location; // GPS coordinates or location identifier
        uint256 nodeId; // Unique identifier for the energy monitoring node
    }

    struct Node {
        string location; // GPS coordinates (e.g., "lat:40.7128,lon:-74.0060")
        bool active; // Whether the node is currently active
        uint256 registeredAt; // Timestamp when node was registered
        uint256 lastUpdate; // Timestamp of last data update
    }

    // State variables (same as legacy)
    mapping(uint256 => Node) public nodes;
    mapping(uint256 => EnergyData[]) public nodeData;
    EnergyData[] public dataPoints;

    uint256 public nodeCount;
    uint256 public dataCount;

    // Chainlink Functions variables
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // Polygon Amoy specific constants
    address private constant ROUTER = 0xC22a79eBA640940ABB6dF0f7982cc119578E11De;
    bytes32 private constant DON_ID = 0x66756e2d706f6c79676f6e2d616d6f792d310000000000000000000000000000;
    uint32 private constant CALLBACK_GAS_LIMIT = 300_000;

    // JavaScript source for mock data generation (time-series with cycling values)
    string private constant SOURCE = 
        "const mockValues = [1000, 2000, 3000];"  // Cycle through these kWh values (scaled by 1000)
        "const numValues = 3;"  // Number of time-series points per node per request
        "const currentTime = Math.floor(Date.now() / 1000);"
        "let results = [];"
        "for (let nodeId = 0; nodeId < args[0]; nodeId++) {"  // args[0] = nodeCount
        "  for (let i = 0; i < numValues; i++) {"
        "    const timestamp = currentTime - (i * 3600);"  // Hourly intervals backward
        "    const kWh = mockValues[(nodeId + i) % mockValues.length];"  // Cycle based on nodeId + offset
        "    results.push({nodeId, timestamp, kWh});"
        "  }"
        "}"
        "const encoded = Buffer.alloc(results.length * 96);"
        "let offset = 0;"
        "for (const res of results) {"
        "  encoded.writeBigUInt64BE(BigInt(res.nodeId), offset); offset += 8;"
        "  encoded.writeBigUInt64BE(BigInt(res.timestamp), offset); offset += 8;"
        "  encoded.writeBigUInt64BE(BigInt(res.kWh), offset); offset += 8;"
        "}"
        "return encoded;";

    // Events (same as legacy + Chainlink specific)
    event NodeRegistered(uint256 indexed nodeId, string location);
    event NodeDeactivated(uint256 indexed nodeId);
    event NodeReactivated(uint256 indexed nodeId);
    event DataUpdated(
        uint256 indexed dataId,
        uint256 indexed nodeId,
        uint256 kWh,
        string location,
        uint256 timestamp
    );
    event RequestSent(bytes32 indexed requestId);
    event ResponseReceived(bytes32 indexed requestId, bytes response, bytes err);

    constructor() FunctionsClient(ROUTER) Ownable(msg.sender) {}

    /**
     * @notice Register a new energy monitoring node
     * @param location GPS coordinates in format "lat:XX.XXXX,lon:YY.YYYY"
     */
    function registerNode(string calldata location) external onlyOwner {
        uint256 nodeId = nodeCount;

        nodes[nodeId] = Node({
            location: location,
            active: true,
            registeredAt: block.timestamp,
            lastUpdate: 0
        });

        nodeCount++;

        emit NodeRegistered(nodeId, location);
    }

    /**
     * @notice Deactivate a monitoring node
     * @param nodeId The ID of the node to deactivate
     */
    function deactivateNode(uint256 nodeId) external onlyOwner {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);

        nodes[nodeId].active = false;
        emit NodeDeactivated(nodeId);
    }

    /**
     * @notice Reactivate a monitoring node
     * @param nodeId The ID of the node to reactivate
     */
    function reactivateNode(uint256 nodeId) external onlyOwner {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);

        nodes[nodeId].active = true;
        emit NodeReactivated(nodeId);
    }

    /**
     * @notice Send Chainlink Functions request to generate mock time-series data
     * @param subscriptionId The Chainlink Functions subscription ID
     * @dev Uses inline JS source to generate cycling mock data for all nodes
     */
    function requestDataUpdate(uint64 subscriptionId) external onlyOwner {
        FunctionsRequest.Request memory req;
        req.initializeRequest(FunctionsRequest.Location.Inline, FunctionsRequest.CodeLanguage.JavaScript, SOURCE);

        string[] memory args = new string[](1);
        args[0] = _uint2str(nodeCount);  // Pass nodeCount to JS

        req.setArgs(args);

        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            CALLBACK_GAS_LIMIT,
            DON_ID
        );

        emit RequestSent(s_lastRequestId);
    }

    /**
     * @notice Chainlink Functions fulfillment callback
     * @param requestId The request ID
     * @param response The response bytes (encoded array of {nodeId, timestamp, kWh})
     * @param err Error bytes if any
     * @dev Decodes and stores time-series data, maintaining compatibility
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        s_lastResponse = response;
        s_lastError = err;

        emit ResponseReceived(requestId, response, err);

        if (err.length > 0) {
            return;
        }

        // Decode response: array of packed (nodeId uint64, timestamp uint64, kWh uint64)
        uint256 entryCount = response.length / 24;  // 8+8+8=24 bytes per entry
        for (uint256 i = 0; i < entryCount; i++) {
            uint256 offset = i * 24;
            uint256 nodeId = uint256(bytes8(response[offset:offset+8]));
            uint256 timestamp = uint256(bytes8(response[offset+8:offset+16]));
            uint256 kWh = uint256(bytes8(response[offset+16:offset+24]));

            if (nodeId >= nodeCount) continue;

            string memory location = nodes[nodeId].location;

            EnergyData memory newData = EnergyData({
                timestamp: timestamp,
                kWh: kWh,
                location: location,
                nodeId: nodeId
            });

            dataPoints.push(newData);
            nodeData[nodeId].push(newData);

            if (timestamp > nodes[nodeId].lastUpdate) {
                nodes[nodeId].lastUpdate = timestamp;
            }

            uint256 dataId = dataCount;
            dataCount++;

            emit DataUpdated(dataId, nodeId, kWh, location, timestamp);
        }
    }

    /**
     * @notice Get all registered nodes
     * @return Array of all nodes
     */
    function getAllNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];
        }
        return allNodes;
    }

    /**
     * @notice Get latest data for a specific node
     * @param nodeId The node ID to query
     * @return Latest energy data for the node
     */
    function getLatestDataForNode(uint256 nodeId) external view returns (EnergyData memory) {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);

        EnergyData[] memory data = nodeData[nodeId];
        if (data.length == 0) {
            return EnergyData(0, 0, "", nodeId);
        }

        return data[data.length - 1];
    }

    /**
     * @notice Get data in a time range for a specific node
     * @param nodeId The node ID to query
     * @param fromTime Start timestamp
     * @param toTime End timestamp
     * @return Array of energy data within the time range
     */
    function getDataInTimeRange(
        uint256 nodeId,
        uint256 fromTime,
        uint256 toTime
    ) external view returns (EnergyData[] memory) {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);

        EnergyData[] memory allData = nodeData[nodeId];
        uint256 count = 0;

        // First pass: count matching entries
        for (uint256 i = 0; i < allData.length; i++) {
            if (allData[i].timestamp >= fromTime && allData[i].timestamp <= toTime) {
                count++;
            }
        }

        // Second pass: populate result array
        EnergyData[] memory result = new EnergyData[](count);
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < allData.length; i++) {
            if (allData[i].timestamp >= fromTime && allData[i].timestamp <= toTime) {
                result[resultIndex] = allData[i];
                resultIndex++;
            }
        }

        return result;
    }

    // Custom errors (same as legacy)
    error NodeNotFound(uint256 nodeId);
    error EmptyResponse();

    // Helper function to convert uint to string (same as legacy)
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}