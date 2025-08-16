const { ethers } = require('ethers');
const { config } = require('dotenv');

config();

// Use the newly deployed contract address
const CONTRACT_ADDRESS = '0x4E804FF9F6469232e164BE608fDCCb4e1C0f6191';

// Sample NYC coordinates for demonstration
const SAMPLE_NYC_COORDINATES = [
  "lat:40.758000,lon:-73.985500", // Times Square
  "lat:40.712700,lon:-74.005900", // Financial District
  "lat:40.689200,lon:-73.944200", // Williamsburg, Brooklyn
  "lat:40.750500,lon:-73.837000", // Queens
  "lat:40.844800,lon:-73.864800", // Bronx
  "lat:40.579500,lon:-74.150200", // Staten Island
  "lat:40.728200,lon:-73.994200", // Greenwich Village
  "lat:40.783100,lon:-73.971200", // Upper East Side
  "lat:40.678200,lon:-73.944200", // Brooklyn Heights
  "lat:40.761400,lon:-73.837000", // Astoria, Queens
];

const CONTRACT_ABI = [
  "function registerNode(string calldata location) external",
  "function requestDataUpdate(uint256 nodeId, string calldata source, bytes calldata encryptedSecretsUrls, uint8 donHostedSecretsSlotID, uint64 donHostedSecretsVersion, string[] calldata args) external",
  "function getActiveNodes() external view returns (uint256[] memory)",
  "function nodeCount() external view returns (uint256)",
  "function getNodeData(uint256 nodeId) external view returns (uint256 dataId, uint256 kWh, string memory location, uint256 timestamp)",
  "event NodeRegistered(uint256 indexed nodeId, string location)",
  "event DataUpdated(uint256 indexed dataId, uint256 indexed nodeId, uint256 kWh, string location, uint256 timestamp)"
];

async function main() {
  console.log('🗽 Populating Sample NYC Energy Nodes');
  console.log('='.repeat(50));

  // Setup provider and signer
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-amoy.polygon.technology/';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`👤 Wallet: ${wallet.address}`);
  console.log(`🗽 Sample nodes: ${SAMPLE_NYC_COORDINATES.length}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC`);

  // Check current node count
  let currentNodeCount = await contract.nodeCount();
  console.log(`📊 Current nodes: ${currentNodeCount}`);

  // Register nodes one by one
  console.log('\n🚀 Registering nodes...\n');
  
  let successCount = 0;
  let startNodeId = Number(currentNodeCount);

  for (let i = 0; i < SAMPLE_NYC_COORDINATES.length; i++) {
    const location = SAMPLE_NYC_COORDINATES[i];
    console.log(`📍 Registering node ${i + 1}/${SAMPLE_NYC_COORDINATES.length}: ${location}`);
    
    try {
      const tx = await contract.registerNode(location, {
        gasLimit: 200000,
        gasPrice: ethers.parseUnits("30", "gwei"),
      });
      
      console.log(`  ⏳ TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Block ${receipt.blockNumber}`);
      
      successCount++;
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }

  // Update node count
  currentNodeCount = await contract.nodeCount();
  console.log(`\n📊 Final node count: ${currentNodeCount}`);
  console.log(`✅ Successfully registered: ${successCount} nodes`);

  // Generate data for all active nodes
  console.log('\n⚡ Generating energy data...\n');
  
  try {
    const activeNodes = await contract.getActiveNodes();
    console.log(`🟢 Active nodes: ${activeNodes.length}`);
    
    let dataCount = 0;
    for (let i = 0; i < Math.min(activeNodes.length, 10); i++) { // Limit to 10 to avoid gas issues
      const nodeId = activeNodes[i];
      console.log(`⚡ Generating data for node ${nodeId}...`);
      
      try {
        const tx = await contract.requestDataUpdate(
          nodeId,
          "", // empty source
          "0x", // empty secrets
          0, // slot ID
          0, // version
          [], // empty args
          {
            gasLimit: 250000,
            gasPrice: ethers.parseUnits("30", "gwei"),
          }
        );
        
        console.log(`  ⏳ TX: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  ✅ Block ${receipt.blockNumber}`);
        
        dataCount++;
        
        // Check data events
        const dataEvents = receipt.logs.filter(log => {
          try {
            return contract.interface.parseLog(log).name === 'DataUpdated';
          } catch { return false; }
        });
        
        if (dataEvents.length > 0) {
          const event = contract.interface.parseLog(dataEvents[0]);
          const kWh = Number(event.args.kWh) / 1000;
          console.log(`  📊 Generated: ${kWh.toFixed(1)}kWh`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`  ❌ Data failed: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Data generation complete: ${dataCount} nodes updated`);
    
  } catch (error) {
    console.error(`❌ Data generation failed: ${error.message}`);
  }

  // Final verification
  console.log('\n🔍 Final State:');
  try {
    const finalNodeCount = await contract.nodeCount();
    const activeNodes = await contract.getActiveNodes();
    
    console.log(`   🗽 Total nodes: ${finalNodeCount}`);
    console.log(`   🟢 Active nodes: ${activeNodes.length}`);
    
    // Sample a few nodes
    console.log('\n📍 Sample Node Data:');
    for (let i = 0; i < Math.min(3, activeNodes.length); i++) {
      const nodeId = activeNodes[i];
      try {
        const nodeData = await contract.getNodeData(nodeId);
        const kWh = Number(nodeData.kWh) / 1000;
        console.log(`   Node ${nodeId}: ${kWh.toFixed(1)}kWh at ${nodeData.location}`);
      } catch (error) {
        console.log(`   Node ${nodeId}: No data yet`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  }

  console.log('\n🎉 NYC Sample Network Ready!');
  console.log('💡 Frontend can now display real on-chain data');
  console.log(`🔗 Contract: https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });