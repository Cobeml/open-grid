const { ethers } = require('ethers');
const { config } = require('dotenv');

config();

// NYC area coordinates (latitude, longitude) for energy monitoring nodes
const NYC_COORDINATES = [
  // Manhattan
  [40.7831, -73.9712], // Upper East Side
  [40.7614, -73.9776], // Midtown Manhattan
  [40.7505, -73.9934], // Times Square
  [40.7282, -74.0776], // Battery Park
  [40.7505, -73.9934], // Herald Square
  [40.7580, -73.9855], // Columbus Circle
  [40.7127, -74.0059], // Financial District
  [40.7282, -73.9942], // Greenwich Village
  [40.7265, -73.9815], // East Village
  [40.7505, -73.9934], // Chelsea
  [40.7831, -73.9712], // Upper West Side
  [40.8176, -73.9482], // Washington Heights
  [40.8446, -73.9416], // Inwood
  [40.7505, -73.9934], // Hell's Kitchen
  [40.7282, -73.9942], // SoHo
  [40.7181, -74.0060], // Tribeca
  [40.7047, -74.0142], // Lower East Side
  [40.7505, -73.9934], // Murray Hill
  [40.7831, -73.9712], // Carnegie Hill
  [40.7505, -73.9934], // Gramercy
  
  // Brooklyn
  [40.6892, -73.9442], // Williamsburg
  [40.6782, -73.9442], // Brooklyn Heights
  [40.6892, -73.9442], // DUMBO
  [40.6748, -73.9442], // Red Hook
  [40.6782, -73.9442], // Park Slope
  [40.6501, -73.9496], // Bay Ridge
  [40.6782, -73.9442], // Carroll Gardens
  [40.6892, -73.9442], // Greenpoint
  [40.6748, -73.9442], // Gowanus
  [40.6501, -73.9496], // Sunset Park
  [40.6365, -73.9531], // Bensonhurst
  [40.6149, -73.9597], // Coney Island
  [40.6501, -73.9496], // Borough Park
  [40.6748, -73.9442], // Prospect Heights
  [40.6892, -73.9442], // Fort Greene
  [40.6782, -73.9442], // Cobble Hill
  [40.6501, -73.9496], // Dyker Heights
  [40.6748, -73.9442], // Boerum Hill
  [40.6892, -73.9442], // Bed-Stuy
  [40.6782, -73.9442], // Crown Heights
  
  // Queens
  [40.7282, -73.7949], // Long Island City
  [40.7505, -73.8370], // Astoria
  [40.7831, -73.8370], // Elmhurst
  [40.7614, -73.8370], // Jackson Heights
  [40.7831, -73.8370], // Corona
  [40.7505, -73.8370], // Flushing
  [40.7282, -73.7949], // Sunnyside
  [40.7614, -73.8370], // Woodside
  [40.7831, -73.8370], // Forest Hills
  [40.7505, -73.8370], // Rego Park
  [40.7282, -73.7949], // Ridgewood
  [40.7614, -73.8370], // Middle Village
  [40.7831, -73.8370], // Bayside
  [40.7505, -73.8370], // Whitestone
  [40.7282, -73.7949], // College Point
  [40.7614, -73.8370], // Fresh Meadows
  [40.7831, -73.8370], // Jamaica
  [40.7505, -73.8370], // Hollis
  [40.7282, -73.7949], // St. Albans
  [40.7614, -73.8370], // Cambria Heights
  
  // Bronx
  [40.8448, -73.8648], // South Bronx
  [40.8501, -73.8662], // Mott Haven
  [40.8448, -73.8648], // Hunts Point
  [40.8501, -73.8662], // Morrisania
  [40.8448, -73.8648], // Tremont
  [40.8501, -73.8662], // Fordham
  [40.8448, -73.8648], // Belmont
  [40.8501, -73.8662], // University Heights
  [40.8448, -73.8648], // Morris Heights
  [40.8501, -73.8662], // Highbridge
  [40.8448, -73.8648], // Concourse
  [40.8501, -73.8662], // Yankee Stadium
  [40.8448, -73.8648], // Melrose
  [40.8501, -73.8662], // East Bronx
  [40.8448, -73.8648], // Soundview
  [40.8501, -73.8662], // Castle Hill
  [40.8448, -73.8648], // Parkchester
  [40.8501, -73.8662], // Westchester Square
  [40.8448, -73.8648], // Throgs Neck
  [40.8501, -73.8662], // City Island
  
  // Staten Island
  [40.5795, -74.1502], // St. George
  [40.5907, -74.1618], // Port Richmond
  [40.5795, -74.1502], // New Brighton
  [40.5907, -74.1618], // West Brighton
  [40.5795, -74.1502], // Stapleton
  [40.5907, -74.1618], // Clifton
  [40.5795, -74.1502], // Tompkinsville
  [40.5907, -74.1618], // Mariners Harbor
  [40.5795, -74.1502], // New Springville
  [40.5907, -74.1618], // Bulls Head
  [40.5795, -74.1502], // Willowbrook
  [40.5907, -74.1618], // New Dorp
  [40.5795, -74.1502], // Oakwood
  [40.5907, -74.1618], // Great Kills
  [40.5795, -74.1502], // Eltingville
  [40.5907, -74.1618], // Annadale
  [40.5795, -74.1502], // Prince's Bay
  [40.5907, -74.1618], // Tottenville
  [40.5795, -74.1502], // Charleston
  [40.5907, -74.1618], // Rossville
];

const CONTRACT_ADDRESS = '0x3C3D02Fa4d1636e7a1eaF7C6A32a6175E4B2E869';

const CONTRACT_ABI = [
  "function registerNode(string calldata location) external",
  "function updateEnergyData(uint256 nodeId, uint256 kWh, string calldata location) external",
  "function getActiveNodes() external view returns (uint256[] memory)",
  "function getNodeData(uint256 nodeId) external view returns (uint256 dataId, uint256 kWh, string memory location, uint256 timestamp)",
  "event NodeRegistered(uint256 indexed nodeId, string location)",
  "event DataUpdated(uint256 indexed dataId, uint256 indexed nodeId, uint256 kWh, string location, uint256 timestamp)"
];

async function main() {
  console.log('🗽 Starting NYC Energy Node Population Script');
  console.log('='.repeat(60));

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log(`📍 Deploying to: ${CONTRACT_ADDRESS}`);
  console.log(`🔗 Network: Polygon Amoy Testnet`);
  console.log(`👤 Deployer: ${wallet.address}`);
  console.log(`📊 Total nodes to register: ${NYC_COORDINATES.length}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC`);

  if (balance < ethers.parseEther('0.1')) {
    console.warn('⚠️  Warning: Low balance. You may need more MATIC for gas fees.');
  }

  console.log('\n🚀 Starting node registration...\n');

  const batchSize = 10; // Register nodes in batches to avoid RPC limits
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < NYC_COORDINATES.length; i += batchSize) {
    const batch = NYC_COORDINATES.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(NYC_COORDINATES.length / batchSize)}`);
    
    const batchPromises = batch.map(async ([lat, lon], batchIndex) => {
      const nodeIndex = i + batchIndex;
      const location = `lat:${lat.toFixed(6)},lon:${lon.toFixed(6)}`;
      
      try {
        console.log(`  📍 Registering node ${nodeIndex}: ${location}`);
        
        // Register the node
        const tx = await contract.registerNode(location, {
          gasLimit: 150000, // Conservative gas limit
        });
        
        console.log(`  ✅ Node ${nodeIndex} registered: ${tx.hash}`);
        await tx.wait();
        
        // Add initial energy data
        const initialKwh = Math.floor(Math.random() * 5000 + 1000); // 1-6 kWh
        const energyTx = await contract.updateEnergyData(nodeIndex, initialKwh, location, {
          gasLimit: 150000,
        });
        
        console.log(`  ⚡ Node ${nodeIndex} energy data set: ${(initialKwh / 1000).toFixed(1)}kWh (${energyTx.hash})`);
        await energyTx.wait();
        
        return { success: true, nodeIndex, location };
      } catch (error) {
        console.error(`  ❌ Failed to register node ${nodeIndex}: ${error.message}`);
        return { success: false, nodeIndex, location, error: error.message };
      }
    });

    // Wait for batch to complete
    const results = await Promise.all(batchPromises);
    
    // Count results
    results.forEach(result => {
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < NYC_COORDINATES.length) {
      console.log(`  ⏳ Waiting 3 seconds before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n📊 Registration Summary:');
  console.log('='.repeat(40));
  console.log(`✅ Successful registrations: ${successCount}`);
  console.log(`❌ Failed registrations: ${errorCount}`);
  console.log(`📈 Success rate: ${((successCount / NYC_COORDINATES.length) * 100).toFixed(1)}%`);

  // Verify final count
  try {
    console.log('\n🔍 Verifying deployment...');
    const activeNodes = await contract.getActiveNodes();
    console.log(`📊 Total active nodes on contract: ${activeNodes.length}`);
    
    if (activeNodes.length > 0) {
      console.log('\n📍 Sample node data:');
      for (let i = 0; i < Math.min(5, activeNodes.length); i++) {
        const nodeId = activeNodes[i];
        const nodeData = await contract.getNodeData(nodeId);
        console.log(`  Node ${nodeId}: ${(Number(nodeData.kWh) / 1000).toFixed(1)}kWh at ${nodeData.location}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to verify deployment:', error.message);
  }

  console.log('\n🎉 NYC Energy Node Population Complete!');
  console.log(`🗽 ${successCount} energy monitoring nodes now active across NYC area`);
  console.log('💡 The frontend should now display real on-chain data from these nodes');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });