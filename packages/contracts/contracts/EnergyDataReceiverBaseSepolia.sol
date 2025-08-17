// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title EnergyDataReceiverBaseSepolia
 * @notice LayerZero v2 OApp receiver for Base Sepolia
 * @dev Receives energy data from Polygon Amoy ChainlinkEnergyMonitor
 * @dev Maintains exact frontend compatibility with existing contract interface
 */
contract EnergyDataReceiverBaseSepolia is OApp {
    using OptionsBuilder for bytes;

    // ===================== DATA STRUCTURES (Frontend Compatible) =====================
    
    struct Node {
        string location;        // GPS coordinates
        bool active;           // Whether the node is currently active
        uint256 registeredAt;  // Timestamp when node was registered
        uint256 lastUpdate;    // Timestamp of last data update
    }

    struct Edge {
        uint256 from;         // Source node ID
        uint256 to;          // Destination node ID  
        string edgeType;     // Type of connection (primary, secondary, etc.)
        uint256 capacity;    // Connection capacity
        uint256 distance;    // Distance between nodes
        bool active;         // Whether the edge is currently active
        uint256 registeredAt; // Timestamp when edge was registered
    }

    struct EnergyData {
        uint256 timestamp;   // Unix timestamp when data was recorded
        uint256 kWh;        // Energy consumption in kWh (scaled by 1000)
        string location;    // GPS coordinates
        uint256 nodeId;     // Node identifier
    }

    // ===================== STATE VARIABLES =====================

    // Core storage (identical to source contract)
    mapping(uint256 => Node) public nodes;
    mapping(uint256 => EnergyData[]) public nodeData;
    EnergyData[] public dataPoints;
    
    uint256 public nodeCount;
    uint256 public dataCount;

    // Edge storage (identical to source contract)
    Edge[] public edges;
    mapping(uint256 => uint256[]) public nodeEdges; // nodeId => edgeIds
    uint256 public edgeCount;

    // LayerZero configuration
    uint32 public constant POLYGON_AMOY_EID = 40267;
    address public sourceContract;
    uint256 public lastSyncTime;
    uint256 public totalSyncsReceived;
    
    // Data freshness tracking
    uint256 public lastDataUpdate;
    bool public isDataStale;
    uint256 public constant STALE_DATA_THRESHOLD = 1 hours;

    // ===================== EVENTS (Frontend Compatible) =====================

    event NodeRegistered(uint256 indexed nodeId, string location);
    event EdgeRegistered(uint256 indexed edgeId, uint256 indexed from, uint256 indexed to, string edgeType);
    event EdgeDeactivated(uint256 indexed edgeId);
    event EdgeReactivated(uint256 indexed edgeId);
    event DataUpdated(
        uint256 indexed dataId,
        uint256 indexed nodeId,
        uint256 kWh,
        string location,
        uint256 timestamp
    );
    
    // LayerZero specific events
    event CrossChainDataReceived(uint32 indexed srcEid, address indexed srcContract, uint256 nodeCount, uint256 edgeCount, uint256 dataCount);
    event SourceContractConfigured(address indexed sourceContract);
    event DataStalenessChanged(bool indexed isStale);

    // ===================== ERRORS =====================

    error UnauthorizedSource(uint32 srcEid, address srcContract);
    error InvalidDataFormat();
    error NodeNotFound(uint256 nodeId);
    error EdgeNotFound(uint256 edgeId);

    // ===================== CONSTRUCTOR =====================

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        lastSyncTime = block.timestamp;
    }

    // ===================== CONFIGURATION =====================

    /**
     * @notice Configure the source contract address for validation
     * @param _sourceContract Address of the source contract on Polygon Amoy
     */
    function configureSourceContract(address _sourceContract) external onlyOwner {
        sourceContract = _sourceContract;
        emit SourceContractConfigured(_sourceContract);
    }

    // ===================== LAYERZERO MESSAGE HANDLING =====================

    /**
     * @notice LayerZero message handler - receives energy data from Polygon Amoy
     * @dev Decodes and stores nodes, edges, and energy data
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Validate message source
        if (_origin.srcEid != POLYGON_AMOY_EID) {
            revert UnauthorizedSource(_origin.srcEid, address(0));
        }
        
        if (sourceContract != address(0)) {
            address originSender = address(uint160(uint256(_origin.sender)));
            if (originSender != sourceContract) {
                revert UnauthorizedSource(_origin.srcEid, originSender);
            }
        }

        // Decode the cross-chain message
        try this._decodeAndProcessMessage(_message) {
            lastSyncTime = block.timestamp;
            totalSyncsReceived++;
            
            // Update data staleness
            _updateDataFreshness();
            
            emit CrossChainDataReceived(
                _origin.srcEid, 
                address(uint160(uint256(_origin.sender))),
                nodeCount,
                edgeCount, 
                dataCount
            );
        } catch {
            revert InvalidDataFormat();
        }
    }

    /**
     * @notice External function to decode message (for testing)
     * @dev Called internally from _lzReceive with try-catch
     */
    function _decodeAndProcessMessage(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal function only");
        
        (
            Node[] memory newNodes,
            Edge[] memory newEdges, 
            EnergyData[] memory newData
        ) = abi.decode(_message, (Node[], Edge[], EnergyData[]));
        
        _syncNodes(newNodes);
        _syncEdges(newEdges);
        _syncEnergyData(newData);
    }

    // ===================== DATA SYNCHRONIZATION =====================

    /**
     * @notice Synchronize nodes from cross-chain message
     * @param newNodes Array of nodes to sync
     */
    function _syncNodes(Node[] memory newNodes) internal {
        // Clear existing nodes and reset count
        for (uint256 i = 0; i < nodeCount; i++) {
            delete nodes[i];
        }
        nodeCount = 0;

        // Add new nodes
        for (uint256 i = 0; i < newNodes.length; i++) {
            nodes[i] = newNodes[i];
            emit NodeRegistered(i, newNodes[i].location);
        }
        nodeCount = newNodes.length;
    }

    /**
     * @notice Synchronize edges from cross-chain message
     * @param newEdges Array of edges to sync
     */
    function _syncEdges(Edge[] memory newEdges) internal {
        // Clear existing edges
        delete edges;
        for (uint256 i = 0; i < nodeCount; i++) {
            delete nodeEdges[i];
        }
        edgeCount = 0;

        // Add new edges
        for (uint256 i = 0; i < newEdges.length; i++) {
            edges.push(newEdges[i]);
            
            // Update node edge mappings
            nodeEdges[newEdges[i].from].push(i);
            nodeEdges[newEdges[i].to].push(i);
            
            emit EdgeRegistered(i, newEdges[i].from, newEdges[i].to, newEdges[i].edgeType);
        }
        edgeCount = newEdges.length;
    }

    /**
     * @notice Synchronize energy data from cross-chain message
     * @param newData Array of energy data to sync
     */
    function _syncEnergyData(EnergyData[] memory newData) internal {
        for (uint256 i = 0; i < newData.length; i++) {
            EnergyData memory energyData = newData[i];
            
            // Store in global data points
            dataPoints.push(energyData);
            
            // Store in node-specific data
            if (energyData.nodeId < nodeCount) {
                nodeData[energyData.nodeId].push(energyData);
                
                // Update node's last update time
                if (energyData.timestamp > nodes[energyData.nodeId].lastUpdate) {
                    nodes[energyData.nodeId].lastUpdate = energyData.timestamp;
                }
            }
            
            emit DataUpdated(
                dataCount,
                energyData.nodeId,
                energyData.kWh,
                energyData.location,
                energyData.timestamp
            );
            
            dataCount++;
        }
        
        lastDataUpdate = block.timestamp;
    }

    /**
     * @notice Update data freshness status
     */
    function _updateDataFreshness() internal {
        bool wasStale = isDataStale;
        isDataStale = (block.timestamp - lastSyncTime) > STALE_DATA_THRESHOLD;
        
        if (wasStale != isDataStale) {
            emit DataStalenessChanged(isDataStale);
        }
    }

    // ===================== VIEW FUNCTIONS (Frontend Compatible) =====================

    /**
     * @notice Get all registered nodes
     * @return Array of all nodes (identical to source contract)
     */
    function getAllNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];
        }
        return allNodes;
    }

    /**
     * @notice Get all registered edges
     * @return Array of all edges (identical to source contract)
     */
    function getAllEdges() external view returns (Edge[] memory) {
        return edges;
    }

    /**
     * @notice Get edges connected to a specific node
     * @param nodeId The node ID to query
     * @return Array of edges connected to the node
     */
    function getNodeEdges(uint256 nodeId) external view returns (Edge[] memory) {
        if (nodeId >= nodeCount) revert NodeNotFound(nodeId);
        
        uint256[] memory edgeIds = nodeEdges[nodeId];
        Edge[] memory nodeEdgeList = new Edge[](edgeIds.length);
        
        for (uint256 i = 0; i < edgeIds.length; i++) {
            nodeEdgeList[i] = edges[edgeIds[i]];
        }
        
        return nodeEdgeList;
    }

    /**
     * @notice Get specific edge by ID
     * @param edgeId The edge ID to query
     * @return The edge data
     */
    function getEdge(uint256 edgeId) external view returns (Edge memory) {
        if (edgeId >= edgeCount) revert EdgeNotFound(edgeId);
        return edges[edgeId];
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

        // Count matching entries
        for (uint256 i = 0; i < allData.length; i++) {
            if (allData[i].timestamp >= fromTime && allData[i].timestamp <= toTime) {
                count++;
            }
        }

        // Build result array
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

    // ===================== ADDITIONAL VIEW FUNCTIONS =====================

    /**
     * @notice Get recent data points (last N entries)
     * @param count Number of recent entries to return
     * @return Array of recent energy data
     */
    function getRecentData(uint256 count) external view returns (EnergyData[] memory) {
        if (count > dataCount) count = dataCount;
        if (count == 0) return new EnergyData[](0);
        
        EnergyData[] memory result = new EnergyData[](count);
        uint256 startIndex = dataCount - count;
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = dataPoints[startIndex + i];
        }
        
        return result;
    }

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 totalNodes,
        uint256 totalEdges,
        uint256 totalDataPoints,
        uint256 lastSync,
        uint256 totalSyncs,
        bool dataStale,
        address sourceAddr
    ) {
        return (
            nodeCount,
            edgeCount,
            dataCount,
            lastSyncTime,
            totalSyncsReceived,
            isDataStale,
            sourceContract
        );
    }

    /**
     * @notice Check if the contract has recent data
     * @return True if data is fresh (within threshold)
     */
    function hasRecentData() external view returns (bool) {
        return !isDataStale && lastDataUpdate > 0;
    }

    /**
     * @notice Get data count for specific node
     * @param nodeId The node ID to query
     * @return Number of data points for the node
     */
    function getNodeDataCount(uint256 nodeId) external view returns (uint256) {
        if (nodeId >= nodeCount) return 0;
        return nodeData[nodeId].length;
    }

    /**
     * @notice Check contract health
     * @return True if contract is healthy
     */
    function isHealthy() external view returns (bool) {
        return (
            nodeCount > 0 && 
            !isDataStale &&
            (block.timestamp - lastSyncTime) <= STALE_DATA_THRESHOLD
        );
    }

    // ===================== MANUAL SYNC TRIGGER (Owner Only) =====================

    /**
     * @notice Request data update from source contract (if implemented)
     * @dev This would trigger the source contract to send updated data
     */
    function requestDataSync() external onlyOwner {
        // This function could be enhanced to send a message back to the source
        // requesting a data update using LayerZero's compose functionality
        _updateDataFreshness();
    }

    /**
     * @notice Update data staleness manually (emergency function)
     */
    function refreshDataFreshness() external onlyOwner {
        _updateDataFreshness();
    }
}