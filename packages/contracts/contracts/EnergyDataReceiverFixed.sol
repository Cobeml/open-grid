// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

/**
 * @title EnergyDataReceiverFixed
 * @notice Fixed LayerZero v2 OApp receiver for Base Sepolia
 * @dev Robust error handling and message parsing
 */
contract EnergyDataReceiverFixed is OApp {
    
    // ===================== DATA STRUCTURES =====================
    
    struct Node {
        string location;
        bool active;
        uint256 registeredAt;
        uint256 lastUpdate;
    }

    struct Edge {
        uint256 from;
        uint256 to;
        string edgeType;
        uint256 capacity;
        uint256 distance;
        bool active;
        uint256 registeredAt;
    }

    struct EnergyData {
        uint256 timestamp;
        uint256 kWh;
        string location;
        uint256 nodeId;
    }

    // ===================== STATE VARIABLES =====================

    mapping(uint256 => Node) public nodes;
    mapping(uint256 => EnergyData[]) public nodeData;
    EnergyData[] public dataPoints;
    
    uint256 public nodeCount;
    uint256 public dataCount;
    Edge[] public edges;
    uint256 public edgeCount;

    // LayerZero tracking
    uint32 public constant POLYGON_AMOY_EID = 40267;
    address public sourceContract;
    uint256 public lastSyncTime;
    uint256 public totalSyncsReceived;
    
    // Error tracking
    string public lastError;
    uint256 public errorCount;
    bool public debugMode = true;

    // ===================== EVENTS =====================

    event NodeRegistered(uint256 indexed nodeId, string location);
    event DataUpdated(uint256 indexed dataId, uint256 indexed nodeId, uint256 kWh, string location, uint256 timestamp);
    event CrossChainDataReceived(uint32 indexed srcEid, address indexed srcContract, uint256 nodeCount, uint256 edgeCount, uint256 dataCount);
    event MessageFailed(string error, bytes message);
    event DebugInfo(string info, uint256 value);

    // ===================== CONSTRUCTOR =====================

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        lastSyncTime = block.timestamp;
    }

    // ===================== CONFIGURATION =====================

    function configureSourceContract(address _sourceContract) external onlyOwner {
        sourceContract = _sourceContract;
    }

    function setDebugMode(bool _enabled) external onlyOwner {
        debugMode = _enabled;
    }

    // ===================== LAYERZERO MESSAGE HANDLING =====================

    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        if (debugMode) {
            emit DebugInfo("Message received", _message.length);
        }
        
        // Validate source
        if (_origin.srcEid != POLYGON_AMOY_EID) {
            lastError = "Invalid source EID";
            errorCount++;
            emit MessageFailed(lastError, _message);
            return;
        }
        
        if (sourceContract != address(0)) {
            address originSender = address(uint160(uint256(_origin.sender)));
            if (originSender != sourceContract) {
                lastError = "Unauthorized sender";
                errorCount++;
                emit MessageFailed(lastError, _message);
                return;
            }
        }

        // Process message with comprehensive error handling
        try this.safeProcessMessage(_message) {
            lastSyncTime = block.timestamp;
            totalSyncsReceived++;
            
            emit CrossChainDataReceived(
                _origin.srcEid,
                address(uint160(uint256(_origin.sender))),
                nodeCount,
                edgeCount,
                dataCount
            );
            
            if (debugMode) {
                emit DebugInfo("Processing successful", nodeCount);
            }
            
        } catch Error(string memory reason) {
            lastError = reason;
            errorCount++;
            emit MessageFailed(reason, _message);
            
        } catch (bytes memory /*lowLevelData*/) {
            lastError = "Low level error";
            errorCount++;
            emit MessageFailed(lastError, _message);
        }
    }

    // ===================== MESSAGE PROCESSING =====================

    function safeProcessMessage(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal function only");
        
        if (debugMode) {
            emit DebugInfo("Starting decode", _message.length);
        }
        
        // Try multiple decoding strategies
        bool success = false;
        
        // Strategy 1: Full structure decode
        if (!success) {
            success = _tryFullDecode(_message);
        }
        
        // Strategy 2: Simple node array only
        if (!success) {
            success = _tryNodesOnlyDecode(_message);
        }
        
        // Strategy 3: Raw data parsing
        if (!success) {
            success = _tryRawDecode(_message);
        }
        
        if (!success) {
            revert("All decoding strategies failed");
        }
    }
    
    function _tryFullDecode(bytes calldata _message) internal returns (bool) {
        try this._decodeFullMessage(_message) {
            if (debugMode) {
                emit DebugInfo("Full decode success", nodeCount);
            }
            return true;
        } catch {
            if (debugMode) {
                emit DebugInfo("Full decode failed", 0);
            }
            return false;
        }
    }
    
    function _tryNodesOnlyDecode(bytes calldata _message) internal returns (bool) {
        try this._decodeNodesOnly(_message) {
            if (debugMode) {
                emit DebugInfo("Nodes only decode success", nodeCount);
            }
            return true;
        } catch {
            if (debugMode) {
                emit DebugInfo("Nodes only decode failed", 0);
            }
            return false;
        }
    }
    
    function _tryRawDecode(bytes calldata _message) internal returns (bool) {
        try this._decodeRaw(_message) {
            if (debugMode) {
                emit DebugInfo("Raw decode success", nodeCount);
            }
            return true;
        } catch {
            if (debugMode) {
                emit DebugInfo("Raw decode failed", 0);
            }
            return false;
        }
    }

    // ===================== DECODING STRATEGIES =====================

    function _decodeFullMessage(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal only");
        
        (
            Node[] memory newNodes,
            Edge[] memory newEdges,
            EnergyData[] memory newData
        ) = abi.decode(_message, (Node[], Edge[], EnergyData[]));
        
        _processNodes(newNodes);
        _processEdges(newEdges);
        _processEnergyData(newData);
    }
    
    function _decodeNodesOnly(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal only");
        
        // Try to decode just the nodes array
        Node[] memory newNodes = abi.decode(_message, (Node[]));
        _processNodes(newNodes);
        
        // Set edges and data to empty
        delete edges;
        edgeCount = 0;
        dataCount = 0;
    }
    
    function _decodeRaw(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal only");
        
        // Minimal processing - just set a basic node count
        if (_message.length >= 32) {
            // Try to extract first uint256 as node count
            uint256 extractedCount = abi.decode(_message[:32], (uint256));
            
            if (extractedCount > 0 && extractedCount <= 1000) { // Sanity check
                // Create placeholder nodes
                for (uint256 i = 0; i < extractedCount && i < nodeCount; i++) {
                    delete nodes[i];
                }
                
                nodeCount = extractedCount;
                
                // Create minimal placeholder nodes
                for (uint256 i = 0; i < nodeCount && i < 50; i++) { // Limit to 50 for gas
                    nodes[i] = Node({
                        location: "pending",
                        active: true,
                        registeredAt: block.timestamp,
                        lastUpdate: 0
                    });
                    
                    emit NodeRegistered(i, "pending");
                }
            }
        }
    }

    // ===================== DATA PROCESSING =====================

    function _processNodes(Node[] memory newNodes) internal {
        // Clear existing nodes
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

    function _processEdges(Edge[] memory newEdges) internal {
        delete edges;
        edgeCount = 0;

        for (uint256 i = 0; i < newEdges.length; i++) {
            edges.push(newEdges[i]);
        }
        edgeCount = newEdges.length;
    }

    function _processEnergyData(EnergyData[] memory newData) internal {
        for (uint256 i = 0; i < newData.length; i++) {
            EnergyData memory energyData = newData[i];
            
            dataPoints.push(energyData);
            
            if (energyData.nodeId < nodeCount) {
                nodeData[energyData.nodeId].push(energyData);
                
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
    }

    // ===================== VIEW FUNCTIONS (Frontend Compatible) =====================

    function getAllNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];
        }
        return allNodes;
    }

    function getAllEdges() external view returns (Edge[] memory) {
        return edges;
    }

    function getLatestDataForNode(uint256 nodeId) external view returns (EnergyData memory) {
        if (nodeId >= nodeCount) {
            return EnergyData(0, 0, "", nodeId);
        }

        EnergyData[] memory data = nodeData[nodeId];
        if (data.length == 0) {
            return EnergyData(0, 0, "", nodeId);
        }

        return data[data.length - 1];
    }

    function getStats() external view returns (
        uint256 totalNodes,
        uint256 totalEdges,
        uint256 totalDataPoints,
        uint256 lastSync,
        uint256 totalSyncs,
        uint256 errors,
        string memory lastErr
    ) {
        return (
            nodeCount,
            edgeCount,
            dataCount,
            lastSyncTime,
            totalSyncsReceived,
            errorCount,
            lastError
        );
    }

    function isHealthy() external view returns (bool) {
        return nodeCount > 0 && errorCount == 0;
    }
}