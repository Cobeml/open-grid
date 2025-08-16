const { ethers } = require("ethers");
require('dotenv').config({ path: '../../../.env' });

// NYC Grid Network Data
const NYC_GRID_NODES = [
  // Manhattan - Downtown
  { id: 1, name: "Financial District Substation", location: "lat:40.7075,lon:-74.0109", zone: "downtown" },
  { id: 2, name: "Battery Park Terminal", location: "lat:40.7033,lon:-74.0170", zone: "downtown" },
  { id: 3, name: "World Trade Center Hub", location: "lat:40.7128,lon:-74.0130", zone: "downtown" },
  { id: 4, name: "Fulton Street Station", location: "lat:40.7102,lon:-74.0085", zone: "downtown" },
  { id: 5, name: "City Hall Grid", location: "lat:40.7128,lon:-74.0060", zone: "downtown" },
  
  // Manhattan - Midtown
  { id: 6, name: "Times Square Hub", location: "lat:40.7580,lon:-73.9855", zone: "midtown" },
  { id: 7, name: "Grand Central Terminal", location: "lat:40.7527,lon:-73.9772", zone: "midtown" },
  { id: 8, name: "Penn Station Grid", location: "lat:40.7505,lon:-73.9934", zone: "midtown" },
  { id: 9, name: "Empire State Building", location: "lat:40.7484,lon:-73.9857", zone: "midtown" },
  { id: 10, name: "Rockefeller Center", location: "lat:40.7587,lon:-73.9787", zone: "midtown" },
  { id: 11, name: "Bryant Park Station", location: "lat:40.7539,lon:-73.9850", zone: "midtown" },
  { id: 12, name: "Herald Square", location: "lat:40.7505,lon:-73.9885", zone: "midtown" },
  
  // Manhattan - Upper
  { id: 13, name: "Central Park South", location: "lat:40.7648,lon:-73.9808", zone: "upper" },
  { id: 14, name: "Columbus Circle", location: "lat:40.7683,lon:-73.9816", zone: "upper" },
  { id: 15, name: "Lincoln Center", location: "lat:40.7725,lon:-73.9831", zone: "upper" },
  { id: 16, name: "Upper West Side Hub", location: "lat:40.7855,lon:-73.9747", zone: "upper" },
  { id: 17, name: "Upper East Side Grid", location: "lat:40.7736,lon:-73.9715", zone: "upper" },
  { id: 18, name: "Harlem Terminal", location: "lat:40.8116,lon:-73.9465", zone: "upper" },
  
  // Brooklyn
  { id: 19, name: "Brooklyn Bridge Park", location: "lat:40.7021,lon:-73.9969", zone: "brooklyn" },
  { id: 20, name: "DUMBO Substation", location: "lat:40.7033,lon:-73.9870", zone: "brooklyn" },
  { id: 21, name: "Williamsburg Bridge", location: "lat:40.7081,lon:-73.9571", zone: "brooklyn" },
  { id: 22, name: "Bushwick Terminal", location: "lat:40.6944,lon:-73.9211", zone: "brooklyn" },
  { id: 23, name: "Prospect Park Hub", location: "lat:40.6602,lon:-73.9690", zone: "brooklyn" },
  { id: 24, name: "Coney Island Grid", location: "lat:40.5755,lon:-73.9707", zone: "brooklyn" },
  
  // Queens
  { id: 25, name: "Long Island City", location: "lat:40.7447,lon:-73.9485", zone: "queens" },
  { id: 26, name: "Astoria Terminal", location: "lat:40.7644,lon:-73.9235", zone: "queens" },
  { id: 27, name: "Flushing Meadows", location: "lat:40.7505,lon:-73.8454", zone: "queens" },
  { id: 28, name: "JFK Airport Hub", location: "lat:40.6413,lon:-73.7781", zone: "queens" },
  
  // Bronx
  { id: 29, name: "Yankee Stadium Grid", location: "lat:40.8296,lon:-73.9262", zone: "bronx" },
  { id: 30, name: "Bronx Terminal Market", location: "lat:40.8270,lon:-73.9230", zone: "bronx" },
  
  // Staten Island
  { id: 31, name: "Staten Island Ferry", location: "lat:40.6437,lon:-74.0756", zone: "staten" },
  { id: 32, name: "St. George Terminal", location: "lat:40.6437,lon:-74.0756", zone: "staten" },
  
  // Major Infrastructure
  { id: 33, name: "LaGuardia Airport", location: "lat:40.7769,lon:-73.8740", zone: "airports" },
  { id: 34, name: "Newark Liberty Hub", location: "lat:40.6895,lon:-74.1745", zone: "airports" },
  { id: 35, name: "Metropolitan Hub", location: "lat:40.7505,lon:-73.9934", zone: "central" }
];

async function main() {
  console.log("🏗️  Deploying NYC Grid Network to Flow Testnet...");

  // Get environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const flowRpcUrl = process.env.FLOW_TESTNET_RPC_URL || "https://access-testnet.onflow.org";
  const flowContractAddress = process.env.FLOW_TESTNET_CONTRACT_ADDRESS || "0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2";

  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  console.log(`📍 Flow RPC URL: ${flowRpcUrl}`);
  console.log(`📄 Contract Address: ${flowContractAddress}`);
  console.log(`📊 Total nodes to deploy: ${NYC_GRID_NODES.length}`);

  try {
    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(flowRpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Get contract instance
    const contract = new ethers.Contract(
      flowContractAddress,
      [
        "function registerNode(string calldata location) external",
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)",
        "function nodeCount() external view returns (uint256)"
      ],
      signer
    );

    // Check current node count
    const currentCount = await contract.nodeCount();
    console.log(`📍 Current nodes on Flow Testnet: ${currentCount}`);

    if (currentCount > 0) {
      console.log(`⚠️  Contract already has ${currentCount} nodes. Adding new nodes...`);
    }

    // Register all nodes
    console.log(`🚀 Registering ${NYC_GRID_NODES.length} NYC grid nodes...`);
    
    for (let i = 0; i < NYC_GRID_NODES.length; i++) {
      const node = NYC_GRID_NODES[i];
      
      try {
        const tx = await contract.registerNode(node.location, {
          gasLimit: 200000,
          maxFeePerGas: ethers.parseUnits("30", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        });
        
        console.log(`  ✅ Node ${i + 1}/${NYC_GRID_NODES.length}: ${node.name}`);
        console.log(`     📍 ${node.location}`);
        console.log(`     🏷️  Zone: ${node.zone}`);
        
        // Wait for transaction to be mined
        await tx.wait();
        
        // Add a small delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed to register node ${i + 1}: ${node.name}`);
        console.error(`     Error: ${error.message}`);
        
        // Continue with next node
        continue;
      }
    }

    // Verify deployment
    const finalCount = await contract.nodeCount();
    console.log(`✅ Flow Testnet deployment complete: ${finalCount} nodes registered`);

    // Get all nodes to verify
    const allNodes = await contract.getAllNodes();
    const activeNodes = allNodes.filter((node) => node.active);
    console.log(`📊 Active nodes: ${activeNodes.length}/${allNodes.length}`);

    console.log("\n🎉 NYC Grid Network successfully deployed to Flow Testnet!");
    console.log(`📈 Total nodes: ${finalCount}`);
    console.log(`🔗 Contract: ${flowContractAddress}`);

  } catch (error) {
    console.error(`❌ Failed to deploy to Flow Testnet:`, error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
