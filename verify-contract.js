const { ethers } = require('ethers');
const { config } = require('dotenv');

config();

const CONTRACT_ADDRESS = '0x4E804FF9F6469232e164BE608fDCCb4e1C0f6191';
const CONTRACT_ABI = [
  "function nodeCount() external view returns (uint256)",
  "function getActiveNodes() external view returns (uint256[] memory)",
  "function nodes(uint256) external view returns (string memory location, bool active, uint256 registeredAt, uint256 lastUpdate)",
  "function getNodeData(uint256 nodeId) external view returns (uint256 dataId, uint256 kWh, string memory location, uint256 timestamp)"
];

async function main() {
  console.log('🔍 Verifying Contract Status');
  console.log('='.repeat(40));
  
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-amoy.polygon.technology/';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  try {
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: Polygon Amoy (Chain ID: 80002)`);
    console.log(`🔗 RPC: ${rpcUrl}`);
    
    // Get node count
    const nodeCount = await contract.nodeCount();
    console.log(`\n📊 Total nodes: ${nodeCount}`);
    
    // Get active nodes
    const activeNodes = await contract.getActiveNodes();
    console.log(`🟢 Active nodes: ${activeNodes.length}`);
    console.log(`📋 Active node IDs: [${activeNodes.join(', ')}]`);
    
    // Show details for first few nodes
    console.log('\n📍 Node Details:');
    for (let i = 0; i < Math.min(3, activeNodes.length); i++) {
      const nodeId = activeNodes[i];
      try {
        const nodeInfo = await contract.nodes(nodeId);
        const nodeData = await contract.getNodeData(nodeId);
        
        console.log(`\n  Node ${nodeId}:`);
        console.log(`    Location: ${nodeInfo.location}`);
        console.log(`    Active: ${nodeInfo.active}`);
        console.log(`    Registered: ${new Date(Number(nodeInfo.registeredAt) * 1000).toLocaleString()}`);
        console.log(`    Last Update: ${new Date(Number(nodeInfo.lastUpdate) * 1000).toLocaleString()}`);
        console.log(`    Energy Data: ${Number(nodeData.kWh) / 1000}kWh`);
      } catch (error) {
        console.log(`    Error fetching data: ${error.message}`);
      }
    }
    
    console.log('\n✅ Contract verification complete!');
    console.log('💡 Frontend should now connect to this contract when Polygon Amoy is selected');
    
  } catch (error) {
    console.error('❌ Contract verification failed:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });