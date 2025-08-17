const { ethers } = require("hardhat");

// Contract addresses
const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const RECEIVER_ADDRESS_BASE = "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e";
const CHAINLINK_MONITOR_ADDRESS = "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB";

async function checkBaseSepolia() {
    console.log("=== CHECKING BASE SEPOLIA RECEIVER CONTRACT ===");
    
    // Base Sepolia RPC
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    const receiverABI = [
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)",
        "function getAllEdges() external view returns (tuple(uint256 from, uint256 to, string edgeType, uint256 capacity, uint256 distance, bool active, uint256 registeredAt)[] memory)", 
        "function nodeCount() external view returns (uint256)",
        "function edgeCount() external view returns (uint256)",
        "function dataCount() external view returns (uint256)",
        "function getStats() external view returns (uint256 totalNodes, uint256 totalEdges, uint256 totalDataPoints, uint256 lastSync, uint256 totalSyncs, bool dataStale, address sourceAddr)",
        "function hasRecentData() external view returns (bool)",
        "function isHealthy() external view returns (bool)",
        "function sourceContract() external view returns (address)",
        "function lastSyncTime() external view returns (uint256)",
        "function totalSyncsReceived() external view returns (uint256)"
    ];
    
    const receiver = new ethers.Contract(RECEIVER_ADDRESS_BASE, receiverABI, baseProvider);
    
    try {
        const nodeCount = await receiver.nodeCount();
        const edgeCount = await receiver.edgeCount();
        const dataCount = await receiver.dataCount();
        const sourceContract = await receiver.sourceContract();
        const lastSyncTime = await receiver.lastSyncTime();
        const totalSyncsReceived = await receiver.totalSyncsReceived();
        const hasRecentData = await receiver.hasRecentData();
        const isHealthy = await receiver.isHealthy();
        
        console.log(`Node Count: ${nodeCount}`);
        console.log(`Edge Count: ${edgeCount}`);
        console.log(`Data Count: ${dataCount}`);
        console.log(`Source Contract: ${sourceContract}`);
        console.log(`Last Sync Time: ${lastSyncTime} (${new Date(Number(lastSyncTime) * 1000)})`);
        console.log(`Total Syncs Received: ${totalSyncsReceived}`);
        console.log(`Has Recent Data: ${hasRecentData}`);
        console.log(`Is Healthy: ${isHealthy}`);
        
        const stats = await receiver.getStats();
        console.log(`\nDetailed Stats:`);
        console.log(`- Total Nodes: ${stats[0]}`);
        console.log(`- Total Edges: ${stats[1]}`);
        console.log(`- Total Data Points: ${stats[2]}`);
        console.log(`- Last Sync: ${stats[3]}`);
        console.log(`- Total Syncs: ${stats[4]}`);
        console.log(`- Data Stale: ${stats[5]}`);
        console.log(`- Source Address: ${stats[6]}`);
        
        if (nodeCount > 0) {
            console.log("\n=== NODES DATA ===");
            const nodes = await receiver.getAllNodes();
            nodes.forEach((node, i) => {
                console.log(`Node ${i}: ${node.location}, Active: ${node.active}, Last Update: ${new Date(Number(node.lastUpdate) * 1000)}`);
            });
        }
        
    } catch (error) {
        console.error("Error checking Base Sepolia receiver:", error.message);
    }
}

async function checkPolygonAmoy() {
    console.log("\n=== CHECKING POLYGON AMOY CONTRACTS ===");
    
    // Polygon Amoy RPC
    const polygonProvider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    const senderABI = [
        "function energyMonitorContract() external view returns (address)",
        "function destinationContract() external view returns (address)",
        "function isConfigured() external view returns (bool)",
        "function getSyncStats() external view returns (uint256 _syncInterval, uint256 _lastSyncTime, uint256 _totalSyncsSent, bool _autoSyncEnabled, uint256 _maxDataPointsPerSync, uint256 _lastSyncedDataIndex, bool _canSyncNow)",
        "function getDataSummary() external view returns (uint256 nodeCount, uint256 edgeCount, uint256 dataCount, uint256 newDataAvailable)",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)"
    ];
    
    const monitorABI = [
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)",
        "function nodeCount() external view returns (uint256)",
        "function edgeCount() external view returns (uint256)", 
        "function dataCount() external view returns (uint256)"
    ];
    
    const sender = new ethers.Contract(SENDER_ADDRESS_POLYGON, senderABI, polygonProvider);
    const monitor = new ethers.Contract(CHAINLINK_MONITOR_ADDRESS, monitorABI, polygonProvider);
    
    try {
        console.log("=== SENDER CONTRACT STATE ===");
        const energyMonitorContract = await sender.energyMonitorContract();
        const destinationContract = await sender.destinationContract();
        const isConfigured = await sender.isConfigured();
        
        console.log(`Energy Monitor Contract: ${energyMonitorContract}`);
        console.log(`Destination Contract: ${destinationContract}`);
        console.log(`Is Configured: ${isConfigured}`);
        
        const syncStats = await sender.getSyncStats();
        console.log(`\nSync Stats:`);
        console.log(`- Sync Interval: ${syncStats[0]} seconds`);
        console.log(`- Last Sync Time: ${syncStats[1]} (${new Date(Number(syncStats[1]) * 1000)})`);
        console.log(`- Total Syncs Sent: ${syncStats[2]}`);
        console.log(`- Auto Sync Enabled: ${syncStats[3]}`);
        console.log(`- Max Data Points Per Sync: ${syncStats[4]}`);
        console.log(`- Last Synced Data Index: ${syncStats[5]}`);
        console.log(`- Can Sync Now: ${syncStats[6]}`);
        
        const dataSummary = await sender.getDataSummary();
        console.log(`\nData Summary:`);
        console.log(`- Node Count: ${dataSummary[0]}`);
        console.log(`- Edge Count: ${dataSummary[1]}`);
        console.log(`- Data Count: ${dataSummary[2]}`);
        console.log(`- New Data Available: ${dataSummary[3]}`);
        
        const quoteFee = await sender.quoteSyncFee(false);
        console.log(`\nSync Fee Quote: ${ethers.formatEther(quoteFee)} POL`);
        
        console.log("\n=== CHAINLINK ENERGY MONITOR STATE ===");
        const nodeCount = await monitor.nodeCount();
        const edgeCount = await monitor.edgeCount();
        const dataCount = await monitor.dataCount();
        
        console.log(`Node Count: ${nodeCount}`);
        console.log(`Edge Count: ${edgeCount}`);
        console.log(`Data Count: ${dataCount}`);
        
        if (nodeCount > 0) {
            console.log("\n=== SOURCE NODES DATA ===");
            const nodes = await monitor.getAllNodes();
            nodes.forEach((node, i) => {
                console.log(`Node ${i}: ${node.location}, Active: ${node.active}, Last Update: ${new Date(Number(node.lastUpdate) * 1000)}`);
            });
        }
        
    } catch (error) {
        console.error("Error checking Polygon Amoy contracts:", error.message);
    }
}

async function main() {
    console.log("CROSS-CHAIN CONTRACT STATE ANALYSIS");
    console.log("===================================");
    
    await checkBaseSepolia();
    await checkPolygonAmoy();
    
    console.log("\n=== ANALYSIS COMPLETE ===");
}

main().catch(console.error);