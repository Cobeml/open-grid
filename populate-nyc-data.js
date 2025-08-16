const { ethers } = require('ethers');
const { config } = require('dotenv');

config();

// Use the newly deployed contract address
const CONTRACT_ADDRESS = '0x4E804FF9F6469232e164BE608fDCCb4e1C0f6191';

// NYC area coordinates (latitude, longitude) for energy monitoring nodes
const NYC_COORDINATES = [
  // Manhattan
  "lat:40.783100,lon:-73.971200", // Upper East Side
  "lat:40.761400,lon:-73.977600", // Midtown Manhattan
  "lat:40.750500,lon:-73.993400", // Times Square
  "lat:40.728200,lon:-74.077600", // Battery Park
  "lat:40.750500,lon:-73.993400", // Herald Square
  "lat:40.758000,lon:-73.985500", // Columbus Circle
  "lat:40.712700,lon:-74.005900", // Financial District
  "lat:40.728200,lon:-73.994200", // Greenwich Village
  "lat:40.726500,lon:-73.981500", // East Village
  "lat:40.750500,lon:-73.993400", // Chelsea
  "lat:40.783100,lon:-73.971200", // Upper West Side
  "lat:40.817600,lon:-73.948200", // Washington Heights
  "lat:40.844600,lon:-73.941600", // Inwood
  "lat:40.750500,lon:-73.993400", // Hell's Kitchen
  "lat:40.728200,lon:-73.994200", // SoHo
  "lat:40.718100,lon:-74.006000", // Tribeca
  "lat:40.704700,lon:-74.014200", // Lower East Side
  "lat:40.750500,lon:-73.993400", // Murray Hill
  "lat:40.783100,lon:-73.971200", // Carnegie Hill
  "lat:40.750500,lon:-73.993400", // Gramercy
  
  // Brooklyn
  "lat:40.689200,lon:-73.944200", // Williamsburg
  "lat:40.678200,lon:-73.944200", // Brooklyn Heights
  "lat:40.689200,lon:-73.944200", // DUMBO
  "lat:40.674800,lon:-73.944200", // Red Hook
  "lat:40.678200,lon:-73.944200", // Park Slope
  "lat:40.650100,lon:-73.949600", // Bay Ridge
  "lat:40.678200,lon:-73.944200", // Carroll Gardens
  "lat:40.689200,lon:-73.944200", // Greenpoint
  "lat:40.674800,lon:-73.944200", // Gowanus
  "lat:40.650100,lon:-73.949600", // Sunset Park
  "lat:40.636500,lon:-73.953100", // Bensonhurst
  "lat:40.614900,lon:-73.959700", // Coney Island
  "lat:40.650100,lon:-73.949600", // Borough Park
  "lat:40.674800,lon:-73.944200", // Prospect Heights
  "lat:40.689200,lon:-73.944200", // Fort Greene
  "lat:40.678200,lon:-73.944200", // Cobble Hill
  "lat:40.650100,lon:-73.949600", // Dyker Heights
  "lat:40.674800,lon:-73.944200", // Boerum Hill
  "lat:40.689200,lon:-73.944200", // Bed-Stuy
  "lat:40.678200,lon:-73.944200", // Crown Heights
  
  // Queens
  "lat:40.728200,lon:-73.794900", // Long Island City
  "lat:40.750500,lon:-73.837000", // Astoria
  "lat:40.783100,lon:-73.837000", // Elmhurst
  "lat:40.761400,lon:-73.837000", // Jackson Heights
  "lat:40.783100,lon:-73.837000", // Corona
  "lat:40.750500,lon:-73.837000", // Flushing
  "lat:40.728200,lon:-73.794900", // Sunnyside
  "lat:40.761400,lon:-73.837000", // Woodside
  "lat:40.783100,lon:-73.837000", // Forest Hills
  "lat:40.750500,lon:-73.837000", // Rego Park
  "lat:40.728200,lon:-73.794900", // Ridgewood
  "lat:40.761400,lon:-73.837000", // Middle Village
  "lat:40.783100,lon:-73.837000", // Bayside
  "lat:40.750500,lon:-73.837000", // Whitestone
  "lat:40.728200,lon:-73.794900", // College Point
  "lat:40.761400,lon:-73.837000", // Fresh Meadows
  "lat:40.783100,lon:-73.837000", // Jamaica
  "lat:40.750500,lon:-73.837000", // Hollis
  "lat:40.728200,lon:-73.794900", // St. Albans
  "lat:40.761400,lon:-73.837000", // Cambria Heights
  
  // Bronx
  "lat:40.844800,lon:-73.864800", // South Bronx
  "lat:40.850100,lon:-73.866200", // Mott Haven
  "lat:40.844800,lon:-73.864800", // Hunts Point
  "lat:40.850100,lon:-73.866200", // Morrisania
  "lat:40.844800,lon:-73.864800", // Tremont
  "lat:40.850100,lon:-73.866200", // Fordham
  "lat:40.844800,lon:-73.864800", // Belmont
  "lat:40.850100,lon:-73.866200", // University Heights
  "lat:40.844800,lon:-73.864800", // Morris Heights
  "lat:40.850100,lon:-73.866200", // Highbridge
  "lat:40.844800,lon:-73.864800", // Concourse
  "lat:40.850100,lon:-73.866200", // Yankee Stadium
  "lat:40.844800,lon:-73.864800", // Melrose
  "lat:40.850100,lon:-73.866200", // East Bronx
  "lat:40.844800,lon:-73.864800", // Soundview
  "lat:40.850100,lon:-73.866200", // Castle Hill
  "lat:40.844800,lon:-73.864800", // Parkchester
  "lat:40.850100,lon:-73.866200", // Westchester Square
  "lat:40.844800,lon:-73.864800", // Throgs Neck
  "lat:40.850100,lon:-73.866200", // City Island
  
  // Staten Island
  "lat:40.579500,lon:-74.150200", // St. George
  "lat:40.590700,lon:-74.161800", // Port Richmond
  "lat:40.579500,lon:-74.150200", // New Brighton
  "lat:40.590700,lon:-74.161800", // West Brighton
  "lat:40.579500,lon:-74.150200", // Stapleton
  "lat:40.590700,lon:-74.161800", // Clifton
  "lat:40.579500,lon:-74.150200", // Tompkinsville
  "lat:40.590700,lon:-74.161800", // Mariners Harbor
  "lat:40.579500,lon:-74.150200", // New Springville
  "lat:40.590700,lon:-74.161800", // Bulls Head
  "lat:40.579500,lon:-74.150200", // Willowbrook
  "lat:40.590700,lon:-74.161800", // New Dorp
  "lat:40.579500,lon:-74.150200", // Oakwood
  "lat:40.590700,lon:-74.161800", // Great Kills
  "lat:40.579500,lon:-74.150200", // Eltingville
  "lat:40.590700,lon:-74.161800", // Annadale
  "lat:40.579500,lon:-74.150200", // Prince's Bay
  "lat:40.590700,lon:-74.161800", // Tottenville
  "lat:40.579500,lon:-74.150200", // Charleston
  "lat:40.590700,lon:-74.161800", // Rossville

  // Additional dense coverage for Manhattan and popular areas
  "lat:40.744000,lon:-73.990000", // Times Square area
  "lat:40.741000,lon:-73.989000", // Port Authority
  "lat:40.751000,lon:-73.987000", // Central Park South
  "lat:40.779000,lon:-73.963000", // Central Park North
  "lat:40.714000,lon:-74.006000", // World Trade Center
  "lat:40.715000,lon:-74.008000", // Battery Park City
  "lat:40.720000,lon:-74.003000", // Stone Street
  "lat:40.725000,lon:-73.997000", // City Hall
  "lat:40.730000,lon:-73.995000", // Nolita
  "lat:40.735000,lon:-73.992000", // Union Square
  "lat:40.740000,lon:-73.988000", // Madison Square
  "lat:40.745000,lon:-73.985000", // Flatiron
  "lat:40.755000,lon:-73.982000", // Rockefeller Center
  "lat:40.760000,lon:-73.979000", // Central Park East
  "lat:40.765000,lon:-73.976000", // Lincoln Center
  "lat:40.770000,lon:-73.973000", // Columbus Circle area
  "lat:40.775000,lon:-73.970000", // American Museum
  "lat:40.780000,lon:-73.967000", // Central Park West
  "lat:40.785000,lon:-73.964000", // Museum Mile
  "lat:40.790000,lon:-73.961000", // East Harlem
  "lat:40.795000,lon:-73.958000", // Marcus Garvey Park
  "lat:40.800000,lon:-73.955000", // Harlem
  "lat:40.805000,lon:-73.952000", // Columbia University
  "lat:40.810000,lon:-73.949000", // Morningside Heights
  "lat:40.815000,lon:-73.946000", // Hamilton Heights
  "lat:40.820000,lon:-73.943000", // Washington Heights
  "lat:40.825000,lon:-73.940000", // Fort Tryon Park
  "lat:40.830000,lon:-73.937000", // Inwood Hill Park

  // Brooklyn additional coverage
  "lat:40.675000,lon:-73.940000", // DUMBO waterfront
  "lat:40.680000,lon:-73.938000", // Brooklyn Bridge area
  "lat:40.685000,lon:-73.935000", // Fort Greene Park
  "lat:40.690000,lon:-73.932000", // Prospect Park
  "lat:40.695000,lon:-73.930000", // Grand Army Plaza
  "lat:40.700000,lon:-73.928000", // Park Slope
  "lat:40.672000,lon:-73.945000", // Brooklyn Heights Promenade
  "lat:40.677000,lon:-73.942000", // Cobble Hill
  "lat:40.682000,lon:-73.940000", // Boerum Hill
  "lat:40.687000,lon:-73.937000", // Fort Greene
  "lat:40.692000,lon:-73.935000", // Clinton Hill
  "lat:40.697000,lon:-73.932000", // Prospect Heights
  "lat:40.702000,lon:-73.930000", // Crown Heights
  "lat:40.707000,lon:-73.928000", // Bed-Stuy
  "lat:40.712000,lon:-73.925000" // Bushwick
];

const CONTRACT_ABI = [
  "function registerNodesBatch(string[] calldata locations) external",
  "function requestDataUpdatesBatch(uint256[] calldata nodeIds) external",
  "function getActiveNodes() external view returns (uint256[] memory)",
  "function nodeCount() external view returns (uint256)",
  "function nodes(uint256) external view returns (string memory location, bool active, uint256 registeredAt, uint256 lastUpdate)",
  "function getNodeData(uint256 nodeId) external view returns (uint256 dataId, uint256 kWh, string memory location, uint256 timestamp)",
  "event NodeRegistered(uint256 indexed nodeId, string location)",
  "event DataUpdated(uint256 indexed dataId, uint256 indexed nodeId, uint256 kWh, string location, uint256 timestamp)"
];

async function main() {
  console.log('🗽 Populating NYC Energy Monitoring Network');
  console.log('='.repeat(60));

  // Setup provider and signer
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-amoy.polygon.technology/';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🔗 Network: Polygon Amoy Testnet`);
  console.log(`🌐 RPC URL: ${rpcUrl}`);
  console.log(`👤 Wallet: ${wallet.address}`);
  console.log(`🗽 NYC Nodes to register: ${NYC_COORDINATES.length}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC`);

  if (balance < ethers.parseEther('0.1')) {
    console.warn('⚠️  Warning: Low balance. You may need more MATIC for gas fees.');
  }

  // Check current node count
  let currentNodeCount = await contract.nodeCount();
  console.log(`📊 Current nodes in contract: ${currentNodeCount}`);

  // Register nodes in batches to avoid gas limits
  console.log('\n🚀 Starting node registration...\n');
  
  const batchSize = 5; // Much smaller batches to avoid gas limits
  let successCount = 0;
  let errorCount = 0;
  let startNodeId = Number(currentNodeCount);

  for (let i = 0; i < NYC_COORDINATES.length; i += batchSize) {
    const batch = NYC_COORDINATES.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(NYC_COORDINATES.length / batchSize);
    
    console.log(`📦 Batch ${batchNumber}/${totalBatches}: Registering ${batch.length} nodes`);
    
    try {
      const tx = await contract.registerNodesBatch(batch, {
        gasLimit: 200000 * batch.length, // Much lower gas estimate
        gasPrice: ethers.parseUnits("20", "gwei"), // Lower gas price
      });
      
      console.log(`  ⏳ Transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Batch ${batchNumber} registered in block ${receipt.blockNumber}`);
      
      successCount += batch.length;
      
      // Small delay between batches
      if (i + batchSize < NYC_COORDINATES.length) {
        console.log(`  ⏳ Waiting 3 seconds before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`  ❌ Batch ${batchNumber} failed: ${error.message}`);
      errorCount += batch.length;
    }
  }

  // Update node count after registration
  currentNodeCount = await contract.nodeCount();
  console.log(`\n📊 Registration Summary:`);
  console.log(`   ✅ Successfully registered: ${successCount} nodes`);
  console.log(`   ❌ Failed to register: ${errorCount} nodes`);
  console.log(`   📈 Total nodes in contract: ${currentNodeCount}`);

  // Generate initial data for all nodes
  console.log('\n⚡ Generating initial energy data for all nodes...\n');
  
  try {
    const activeNodes = await contract.getActiveNodes();
    console.log(`🟢 Active nodes found: ${activeNodes.length}`);
    
    if (activeNodes.length > 0) {
      // Create batches of node IDs for data updates
      const dataBatchSize = 3; // Very small batches for data updates
      let dataSuccessCount = 0;
      let dataErrorCount = 0;
      
      for (let i = 0; i < activeNodes.length; i += dataBatchSize) {
        const nodeBatch = activeNodes.slice(i, i + dataBatchSize);
        const batchNumber = Math.floor(i / dataBatchSize) + 1;
        const totalDataBatches = Math.ceil(activeNodes.length / dataBatchSize);
        
        console.log(`⚡ Data Batch ${batchNumber}/${totalDataBatches}: Updating ${nodeBatch.length} nodes`);
        
        try {
          const tx = await contract.requestDataUpdatesBatch(nodeBatch, {
            gasLimit: 150000 * nodeBatch.length,
            gasPrice: ethers.parseUnits("20", "gwei"),
          });
          
          console.log(`  ⏳ Transaction: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`  ✅ Data batch ${batchNumber} processed in block ${receipt.blockNumber}`);
          
          dataSuccessCount += nodeBatch.length;
          
          // Show sample data from events
          const dataEvents = receipt.logs.filter(log => {
            try {
              return contract.interface.parseLog(log).name === 'DataUpdated';
            } catch { return false; }
          });
          
          if (dataEvents.length > 0) {
            const sampleEvent = contract.interface.parseLog(dataEvents[0]);
            const kWh = Number(sampleEvent.args.kWh) / 1000;
            console.log(`  📊 Sample: Node ${sampleEvent.args.nodeId} = ${kWh.toFixed(1)}kWh`);
          }
          
          // Delay between data batches
          if (i + dataBatchSize < activeNodes.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.error(`  ❌ Data batch ${batchNumber} failed: ${error.message}`);
          dataErrorCount += nodeBatch.length;
        }
      }
      
      console.log(`\n📊 Data Generation Summary:`);
      console.log(`   ✅ Successfully updated: ${dataSuccessCount} nodes`);
      console.log(`   ❌ Failed to update: ${dataErrorCount} nodes`);
    }
    
  } catch (error) {
    console.error(`❌ Data generation failed: ${error.message}`);
  }

  // Verify final state
  console.log('\n🔍 Final Verification...');
  try {
    const finalNodeCount = await contract.nodeCount();
    const activeNodes = await contract.getActiveNodes();
    
    console.log(`📊 Final Statistics:`);
    console.log(`   🗽 Total nodes: ${finalNodeCount}`);
    console.log(`   🟢 Active nodes: ${activeNodes.length}`);
    
    if (activeNodes.length > 0) {
      // Sample a few nodes to show their data
      console.log('\n📍 Sample Node Data:');
      for (let i = 0; i < Math.min(5, activeNodes.length); i++) {
        const nodeId = activeNodes[i];
        try {
          const nodeData = await contract.getNodeData(nodeId);
          const nodeInfo = await contract.nodes(nodeId);
          const kWh = Number(nodeData.kWh) / 1000;
          console.log(`   Node ${nodeId}: ${kWh.toFixed(1)}kWh at ${nodeInfo.location}`);
        } catch (error) {
          console.log(`   Node ${nodeId}: No data yet`);
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  }

  console.log('\n🎉 NYC Energy Network Population Complete!');
  console.log(`🗽 ${successCount} energy monitoring nodes active across NYC`);
  console.log('💡 The frontend can now display real on-chain energy data');
  console.log(`🔗 Contract: https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });