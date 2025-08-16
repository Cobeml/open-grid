// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EnergyMonitor
 * @notice A simplified smart contract for monitoring electrical energy data
 * @dev Hackathon version with mock Chainlink Functions integration
 */
contract EnergyMonitor is Ownable {
    
    // Data structures
    struct EnergyData {
        uint256 timestamp;      // Unix timestamp when data was recorded
        uint256 kWh;           // Energy consumption in kWh (scaled by 1000 for precision)
        string location;       // GPS coordinates or location identifier
        uint256 nodeId;        // Unique identifier for the energy monitoring node
    }

    struct Node {
        string location;       // GPS coordinates (e.g., "lat:40.7128,lon:-74.0060")
        bool active;          // Whether the node is currently active
        uint256 registeredAt; // Timestamp when node was registered
        uint256 lastUpdate;   // Timestamp of last data update
    }

    // State variables
    mapping(uint256 => Node) public nodes;
    mapping(uint256 => EnergyData[]) public nodeData;
    EnergyData[] public dataPoints;
    
    uint256 public nodeCount;
    uint256 public dataCount;
    
    // Mock Chainlink Functions variables
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donId;
    
    // Events
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
    event RequestSent(uint256 indexed nodeId, bytes32 indexed requestId);
    event RequestFailed(bytes32 indexed requestId, string error);

    // Custom errors
    error NodeNotFound(uint256 nodeId);
    error EmptyResponse();

    constructor(
        address router,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donId
    ) Ownable(msg.sender) {
        // Mock Chainlink initialization
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donId = _donId;
    }

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
     * @notice Register multiple nodes in a batch operation
     * @param locations Array of GPS coordinates
     */
    function registerNodesBatch(string[] calldata locations) external onlyOwner {
        for (uint256 i = 0; i < locations.length; i++) {
            uint256 nodeId = nodeCount;
            
            nodes[nodeId] = Node({
                location: locations[i],
                active: true,
                registeredAt: block.timestamp,
                lastUpdate: 0
            });
            
            nodeCount++;
            
            emit NodeRegistered(nodeId, locations[i]);
        }
    }

    /**
     * @notice Request data updates for multiple nodes in batch
     * @param nodeIds Array of node IDs to update
     */
    function requestDataUpdatesBatch(uint256[] calldata nodeIds) external onlyOwner {
        for (uint256 i = 0; i < nodeIds.length; i++) {
            uint256 nodeId = nodeIds[i];
            if (nodeId >= nodeCount || !nodes[nodeId].active) continue;
            
            // Create empty args - function will use stored location
            string[] memory emptyArgs = new string[](0);
            
            // Generate request
            bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, nodeId, msg.sender, i));
            emit RequestSent(nodeId, requestId);
            
            // Auto-fulfill with realistic data
            _generateRealisticDataResponse(requestId, nodeId, emptyArgs);
        }
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
     * @notice Enhanced function to simulate Chainlink Functions with realistic data patterns
     * @param nodeId The node to request data for
     * @param source JavaScript source code (not used in mock)
     * @param encryptedSecretsUrls Encrypted secrets (not used in mock)
     * @param donHostedSecretsSlotID DON hosted secrets slot ID
     * @param donHostedSecretsVersion DON hosted secrets version
     * @param args Arguments to pass to the source code (nodeId, lat, lon)
     */
    function requestDataUpdate(
        uint256 nodeId,
        string calldata source,
        bytes calldata encryptedSecretsUrls,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] calldata args
    ) external onlyOwner {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);
        
        // Generate mock request ID
        bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, nodeId, msg.sender));
        
        emit RequestSent(nodeId, requestId);
        
        // Auto-fulfill with realistic mock data using Chainlink Functions logic
        _generateRealisticDataResponse(requestId, nodeId, args);
    }

    /**
     * @notice Generate realistic energy data using NYC consumption patterns
     * @param requestId The request ID to fulfill
     * @param nodeId The node ID
     * @param args Arguments containing coordinates
     */
    function _generateRealisticDataResponse(
        bytes32 requestId,
        uint256 nodeId,
        string[] memory args
    ) internal {
        // Extract coordinates from args or use node's stored location
        string memory location = nodes[nodeId].location;
        uint256 latitude = 407128; // Default NYC lat * 10000
        uint256 longitude = 740060; // Default NYC lon * 10000
        
        if (args.length >= 3) {
            // Parse coordinates from arguments if provided
            latitude = _parseCoordinate(args[1]);
            longitude = _parseCoordinate(args[2]);
        } else {
            // Parse from stored location string
            (latitude, longitude) = _parseLocationCoordinates(location);
        }
        
        // Generate realistic NYC energy consumption patterns
        uint256 mockKwh = _generateNYCEnergyPattern(nodeId);
        uint256 timestamp = block.timestamp;
        
        // Encode response in Chainlink Functions format
        uint256 encodedResponse = _encodeChainlinkResponse(
            timestamp,
            mockKwh,
            latitude,
            longitude,
            nodeId
        );
        
        // Fulfill the request
        bytes memory response = abi.encode(encodedResponse);
        bytes memory err = "";
        
        // Call fulfillRequest to process the data
        this.fulfillRequest(requestId, response, err);
    }

    /**
     * @notice Generate realistic NYC energy consumption pattern
     * @param nodeId The node ID to generate data for
     * @return Energy consumption in Wh (scaled by 1000)
     */
    function _generateNYCEnergyPattern(uint256 nodeId) internal view returns (uint256) {
        // Base consumption varies by node type and location
        uint256 baseConsumption = 2000 + (nodeId * 50) + (nodeId % 7) * 300;
        
        // Time-based variation (daily pattern simulation)
        uint256 hourOfDay = (block.timestamp / 3600) % 24;
        uint256 timeVariation = 0;
        
        if (hourOfDay >= 6 && hourOfDay <= 9) {
            // Morning peak
            timeVariation = 800;
        } else if (hourOfDay >= 18 && hourOfDay <= 22) {
            // Evening peak
            timeVariation = 1200;
        } else if (hourOfDay >= 22 || hourOfDay <= 6) {
            // Night low
            timeVariation = 200;
        } else {
            // Daytime moderate
            timeVariation = 600;
        }
        
        // Pseudo-random variation based on block data
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            nodeId
        )));
        uint256 randomVariation = (randomSeed % 1000) - 500; // ±500 variation
        
        // Seasonal variation (summer AC load simulation)
        uint256 seasonalMultiplier = 100; // Base multiplier
        uint256 dayOfYear = (block.timestamp / 86400) % 365;
        if (dayOfYear >= 152 && dayOfYear <= 243) { // June-August
            seasonalMultiplier = 130; // 30% increase for AC
        }
        
        uint256 finalConsumption = (baseConsumption + timeVariation + randomVariation) * seasonalMultiplier / 100;
        
        // Ensure reasonable bounds (0.5 - 10 kWh)
        if (finalConsumption < 500) finalConsumption = 500;
        if (finalConsumption > 10000) finalConsumption = 10000;
        
        return finalConsumption;
    }

    /**
     * @notice Encode response in Chainlink Functions format
     */
    function _encodeChainlinkResponse(
        uint256 timestamp,
        uint256 kWh,
        uint256 latitude,
        uint256 longitude,
        uint256 nodeId
    ) internal pure returns (uint256) {
        return (timestamp << 192) | (kWh << 128) | (latitude << 64) | (longitude << 32) | nodeId;
    }

    /**
     * @notice Parse coordinate string to fixed-point integer
     */
    function _parseCoordinate(string memory coord) internal pure returns (uint256) {
        // Simplified parsing - in real implementation would handle decimals properly
        bytes memory coordBytes = bytes(coord);
        uint256 result = 0;
        bool foundDecimal = false;
        uint256 decimalPlaces = 0;
        
        for (uint256 i = 0; i < coordBytes.length && decimalPlaces < 6; i++) {
            bytes1 char = coordBytes[i];
            if (char >= 0x30 && char <= 0x39) { // 0-9
                result = result * 10 + uint256(uint8(char)) - 48;
                if (foundDecimal) decimalPlaces++;
            } else if (char == 0x2E && !foundDecimal) { // decimal point
                foundDecimal = true;
            }
        }
        
        // Ensure we have 6 decimal places
        while (decimalPlaces < 6) {
            result = result * 10;
            decimalPlaces++;
        }
        
        return result;
    }

    /**
     * @notice Parse location string to extract coordinates
     */
    function _parseLocationCoordinates(string memory location) 
        internal 
        pure 
        returns (uint256 lat, uint256 lon) 
    {
        // Default NYC coordinates if parsing fails
        lat = 407128; // 40.7128 * 10000
        lon = 740060; // 74.0060 * 10000
        
        bytes memory locationBytes = bytes(location);
        if (locationBytes.length < 10) return (lat, lon);
        
        // Simple parsing for "lat:XX.XXXX,lon:YY.YYYY" format
        // This is simplified - real implementation would be more robust
        
        return (lat, lon);
    }

    /**
     * @notice Mock fulfillment function (simulates Chainlink callback)
     * @param requestId The request ID being fulfilled
     * @param response Encoded response data
     * @param err Error message if any
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes calldata response,
        bytes calldata err
    ) external {
        // Mock fulfillment - in real implementation this would be called by Chainlink DON
        
        if (err.length > 0) {
            emit RequestFailed(requestId, string(err));
            return;
        }
        
        if (response.length == 0) {
            revert EmptyResponse();
        }
        
        // Decode the response (assuming it's a uint256 encoded value)
        uint256 encodedData = abi.decode(response, (uint256));
        
        // Extract data using bit shifting (timestamp|kWh|lat|lon|nodeId)
        uint256 nodeId = encodedData & 0xFFFFFFFF;
        uint256 longitude = (encodedData >> 32) & 0xFFFFFFFF;
        uint256 latitude = (encodedData >> 64) & 0xFFFFFFFFFFFFFFFF;
        uint256 kWh = (encodedData >> 128) & 0xFFFFFFFFFFFFFFFF;
        uint256 timestamp = encodedData >> 192;
        
        // Convert fixed-point coordinates back to strings
        string memory location = string(abi.encodePacked(
            "lat:", _uint2str(latitude / 10000), ".", _uint2str(latitude % 10000),
            ",lon:", _uint2str(longitude / 10000), ".", _uint2str(longitude % 10000)
        ));
        
        // Store the data
        EnergyData memory newData = EnergyData({
            timestamp: timestamp,
            kWh: kWh,
            location: location,
            nodeId: nodeId
        });
        
        dataPoints.push(newData);
        nodeData[nodeId].push(newData);
        nodes[nodeId].lastUpdate = timestamp;
        
        uint256 dataId = dataCount;
        dataCount++;
        
        emit DataUpdated(dataId, nodeId, kWh, location, timestamp);
    }

    /**
     * @notice Get all active node IDs
     * @return Array of active node IDs
     */
    function getActiveNodes() external view returns (uint256[] memory) {
        // Count active nodes first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < nodeCount; i++) {
            if (nodes[i].active) {
                activeCount++;
            }
        }
        
        // Build array of active node IDs
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

    // Helper function to convert uint to string
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