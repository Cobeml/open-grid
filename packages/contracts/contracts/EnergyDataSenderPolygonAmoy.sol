// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// Interface for the existing ChainlinkEnergyMonitor contract
interface IChainlinkEnergyMonitor {
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

    function getAllNodes() external view returns (Node[] memory);
    function getAllEdges() external view returns (Edge[] memory);
    function nodeCount() external view returns (uint256);
    function edgeCount() external view returns (uint256);
    function dataCount() external view returns (uint256);
    function dataPoints(uint256 index) external view returns (EnergyData memory);
    function getLatestDataForNode(uint256 nodeId) external view returns (EnergyData memory);
}

/**
 * @title EnergyDataSenderPolygonAmoy
 * @notice LayerZero v2 OApp sender for Polygon Amoy
 * @dev Pulls data from existing ChainlinkEnergyMonitor and broadcasts to Base Sepolia
 * @dev Standalone contract that integrates with deployed ChainlinkEnergyMonitor
 */
contract EnergyDataSenderPolygonAmoy is OApp {
    using OptionsBuilder for bytes;

    // ===================== CONFIGURATION =====================
    
    uint32 public constant BASE_SEPOLIA_EID = 40245;
    
    address public energyMonitorContract;
    address public destinationContract;
    
    // Sync configuration
    uint256 public syncInterval = 1 hours;  // Default sync every hour
    uint256 public lastSyncTime;
    uint256 public totalSyncsSent;
    bool public autoSyncEnabled;
    
    // Data filtering
    uint256 public maxDataPointsPerSync = 100;  // Limit to prevent gas issues
    uint256 public lastSyncedDataIndex;
    
    // Gas configuration for cross-chain messages
    uint128 public gasLimit = 1_000_000;  // Gas for destination execution
    uint128 public gasValue = 0;          // No native value transfer needed

    // ===================== EVENTS =====================

    event EnergyMonitorConfigured(address indexed energyMonitor);
    event DestinationConfigured(address indexed destination);
    event DataBroadcast(uint32 indexed dstEid, uint256 nodeCount, uint256 edgeCount, uint256 dataCount);
    event SyncConfigurationUpdated(uint256 interval, bool autoSync);
    event ManualSyncTriggered(address indexed triggeredBy);
    event GasConfigurationUpdated(uint128 gasLimit, uint128 gasValue);

    // ===================== ERRORS =====================

    error EnergyMonitorNotConfigured();
    error DestinationNotConfigured();
    error SyncTooFrequent();
    error NoDataToSync();
    error InvalidConfiguration();

    // ===================== CONSTRUCTOR =====================

    constructor(
        address _endpoint,
        address _owner,
        address _energyMonitorContract
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        if (_energyMonitorContract != address(0)) {
            energyMonitorContract = _energyMonitorContract;
        }
        lastSyncTime = block.timestamp;
    }

    // ===================== CONFIGURATION FUNCTIONS =====================

    /**
     * @notice Configure the energy monitor contract address
     * @param _energyMonitor Address of the deployed ChainlinkEnergyMonitor
     */
    function configureEnergyMonitor(address _energyMonitor) external onlyOwner {
        energyMonitorContract = _energyMonitor;
        emit EnergyMonitorConfigured(_energyMonitor);
    }

    /**
     * @notice Configure the destination contract address
     * @param _destination Address of the receiver contract on Base Sepolia
     */
    function configureDestination(address _destination) external onlyOwner {
        destinationContract = _destination;
        emit DestinationConfigured(_destination);
    }

    /**
     * @notice Configure sync parameters
     * @param _interval Minimum time between syncs
     * @param _autoSync Whether to enable automatic syncing
     * @param _maxDataPoints Maximum data points per sync
     */
    function configureSyncParameters(
        uint256 _interval,
        bool _autoSync,
        uint256 _maxDataPoints
    ) external onlyOwner {
        if (_interval < 300) revert InvalidConfiguration(); // Minimum 5 minutes
        
        syncInterval = _interval;
        autoSyncEnabled = _autoSync;
        maxDataPointsPerSync = _maxDataPoints;
        
        emit SyncConfigurationUpdated(_interval, _autoSync);
    }

    /**
     * @notice Configure gas parameters for cross-chain messages
     * @param _gasLimit Gas limit for destination execution
     * @param _gasValue Native value to send (usually 0)
     */
    function configureGasParameters(uint128 _gasLimit, uint128 _gasValue) external onlyOwner {
        gasLimit = _gasLimit;
        gasValue = _gasValue;
        emit GasConfigurationUpdated(_gasLimit, _gasValue);
    }

    // ===================== SYNC FUNCTIONS =====================

    /**
     * @notice Manually trigger a data sync
     * @dev Can be called by owner or when auto-sync conditions are met
     */
    function syncData() external payable {
        if (msg.sender != owner()) {
            // Allow auto-sync if enabled and interval has passed
            if (!autoSyncEnabled || (block.timestamp - lastSyncTime) < syncInterval) {
                revert SyncTooFrequent();
            }
        }

        _performSync();
    }

    /**
     * @notice Force sync with custom data (owner only)
     * @param includeAllData Whether to include all historical data
     */
    function forceSyncData(bool includeAllData) external payable onlyOwner {
        if (includeAllData) {
            lastSyncedDataIndex = 0; // Reset to sync all data
        }
        _performSync();
    }

    /**
     * @notice Internal function to perform the actual sync
     */
    function _performSync() internal {
        if (energyMonitorContract == address(0)) revert EnergyMonitorNotConfigured();
        if (destinationContract == address(0)) revert DestinationNotConfigured();

        IChainlinkEnergyMonitor monitor = IChainlinkEnergyMonitor(energyMonitorContract);

        // Get current state
        IChainlinkEnergyMonitor.Node[] memory nodes = monitor.getAllNodes();
        IChainlinkEnergyMonitor.Edge[] memory edges = monitor.getAllEdges();
        
        // Get recent energy data
        uint256 totalDataCount = monitor.dataCount();
        if (totalDataCount == 0 && nodes.length == 0) revert NoDataToSync();

        // Prepare energy data (limit to recent data to avoid gas issues)
        IChainlinkEnergyMonitor.EnergyData[] memory energyData = _getRecentEnergyData(monitor, totalDataCount);

        // Encode the complete state
        bytes memory payload = abi.encode(nodes, edges, energyData);

        // Prepare LayerZero options
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(gasLimit, gasValue);

        // Calculate the fee
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);

        // Ensure sufficient payment
        if (msg.value < fee.nativeFee) {
            revert("Insufficient fee");
        }

        // Send the message
        _lzSend(
            BASE_SEPOLIA_EID,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        // Update sync tracking
        lastSyncTime = block.timestamp;
        totalSyncsSent++;
        lastSyncedDataIndex = totalDataCount;

        emit DataBroadcast(BASE_SEPOLIA_EID, nodes.length, edges.length, energyData.length);
        emit ManualSyncTriggered(msg.sender);
    }

    /**
     * @notice Get recent energy data with pagination
     * @param monitor The energy monitor contract interface
     * @param totalDataCount Total number of data points available
     * @return Array of recent energy data
     */
    function _getRecentEnergyData(
        IChainlinkEnergyMonitor monitor,
        uint256 totalDataCount
    ) internal view returns (IChainlinkEnergyMonitor.EnergyData[] memory) {
        if (totalDataCount == 0) {
            return new IChainlinkEnergyMonitor.EnergyData[](0);
        }

        // Determine how many data points to include
        uint256 startIndex = lastSyncedDataIndex;
        uint256 endIndex = totalDataCount;
        uint256 dataPointsToSync = endIndex - startIndex;

        // Limit the number of data points to prevent gas issues
        if (dataPointsToSync > maxDataPointsPerSync) {
            startIndex = endIndex - maxDataPointsPerSync;
            dataPointsToSync = maxDataPointsPerSync;
        }

        // Fetch the data points
        IChainlinkEnergyMonitor.EnergyData[] memory result = new IChainlinkEnergyMonitor.EnergyData[](dataPointsToSync);
        
        for (uint256 i = 0; i < dataPointsToSync; i++) {
            result[i] = monitor.dataPoints(startIndex + i);
        }

        return result;
    }

    // ===================== VIEW FUNCTIONS =====================

    /**
     * @notice Quote the fee for sending a sync message
     * @param includeAllData Whether to include all historical data
     * @return The messaging fee required
     */
    function quoteSyncFee(bool includeAllData) external view returns (uint256) {
        if (energyMonitorContract == address(0)) return 0;

        IChainlinkEnergyMonitor monitor = IChainlinkEnergyMonitor(energyMonitorContract);
        
        // Get current state for fee estimation
        IChainlinkEnergyMonitor.Node[] memory nodes = monitor.getAllNodes();
        IChainlinkEnergyMonitor.Edge[] memory edges = monitor.getAllEdges();
        
        // Estimate data size
        uint256 totalDataCount = monitor.dataCount();
        uint256 dataPointsToSync = includeAllData ? totalDataCount : 
            (totalDataCount > maxDataPointsPerSync ? maxDataPointsPerSync : totalDataCount);
        
        // Create mock energy data for size estimation
        IChainlinkEnergyMonitor.EnergyData[] memory mockData = new IChainlinkEnergyMonitor.EnergyData[](dataPointsToSync);
        
        bytes memory payload = abi.encode(nodes, edges, mockData);
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(gasLimit, gasValue);

        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        return fee.nativeFee;
    }

    /**
     * @notice Get sync statistics
     */
    function getSyncStats() external view returns (
        uint256 _syncInterval,
        uint256 _lastSyncTime,
        uint256 _totalSyncsSent,
        bool _autoSyncEnabled,
        uint256 _maxDataPointsPerSync,
        uint256 _lastSyncedDataIndex,
        bool _canSyncNow
    ) {
        return (
            syncInterval,
            lastSyncTime,
            totalSyncsSent,
            autoSyncEnabled,
            maxDataPointsPerSync,
            lastSyncedDataIndex,
            autoSyncEnabled && (block.timestamp - lastSyncTime) >= syncInterval
        );
    }

    /**
     * @notice Get configuration status
     * @return Whether both contracts are configured
     */
    function isConfigured() external view returns (bool) {
        return energyMonitorContract != address(0) && destinationContract != address(0);
    }

    /**
     * @notice Get data summary from the energy monitor
     */
    function getDataSummary() external view returns (
        uint256 nodeCount,
        uint256 edgeCount,
        uint256 dataCount,
        uint256 newDataAvailable
    ) {
        if (energyMonitorContract == address(0)) {
            return (0, 0, 0, 0);
        }

        IChainlinkEnergyMonitor monitor = IChainlinkEnergyMonitor(energyMonitorContract);
        
        nodeCount = monitor.nodeCount();
        edgeCount = monitor.edgeCount();
        dataCount = monitor.dataCount();
        newDataAvailable = dataCount > lastSyncedDataIndex ? dataCount - lastSyncedDataIndex : 0;
    }

    // ===================== EMERGENCY FUNCTIONS =====================

    /**
     * @notice Emergency function to reset sync tracking
     */
    function resetSyncTracking() external onlyOwner {
        lastSyncedDataIndex = 0;
        lastSyncTime = block.timestamp;
    }

    /**
     * @notice Withdraw any accidentally sent ETH
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ===================== LAYERZERO RECEIVE (Not Used) =====================

    /**
     * @notice LayerZero receive function (not used for sender)
     * @dev This contract only sends, doesn't receive
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata /*_message*/,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // This sender contract doesn't handle incoming messages
        revert("Sender only contract");
    }

    // ===================== FALLBACK =====================

    /**
     * @notice Allow contract to receive ETH for gas fees
     */
    receive() external payable {}
}