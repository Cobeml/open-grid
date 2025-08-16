const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");

config();

// NYC area coordinates for energy monitoring nodes
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
];

// Chainlink Functions configuration for Polygon Amoy testnet
const POLYGON_AMOY_CONFIG = {
  router: "0xC22a79eBA640940ABB6dF0f7982cc119578E11De", // Polygon Amoy Functions Router
  donId: "0x66756e2d706f6c79676f6e2d616d6f792d310000000000000000000000000000", // fun-polygon-amoy-1
  subscriptionId: process.env.POLYGON_AMOY_SUBSCRIPTION_ID || "123", // From env
  gasLimit: 300000
};

// JavaScript source code for Chainlink Functions
const FUNCTIONS_SOURCE = `
const nodeId = args[0] ? parseInt(args[0]) : 1;
const latitude = parseFloat(args[1]) || 40.7128;
const longitude = parseFloat(args[2]) || -74.0060;

// Since we don't have real utility API access, we'll generate realistic mock data
// based on NYC energy patterns for the hackathon demo
const baseConsumption = 2000 + (nodeId * 100); // Base consumption varies by node
const timeVariation = Math.sin((Date.now() / 1000 / 3600) * 2 * Math.PI / 24) * 500; // Daily pattern
const randomVariation = (Math.random() - 0.5) * 1000; // Random variation
const mockKwh = Math.max(500, baseConsumption + timeVariation + randomVariation);

const mockTimestamp = Math.floor(Date.now() / 1000);

// Encode coordinates with 6 decimal precision
const latitudeFixed = Math.floor(Math.abs(latitude) * 1000000);
const longitudeFixed = Math.floor(Math.abs(longitude) * 1000000);
const kwhFixed = Math.floor(mockKwh);

// Pack data into a single uint256
const encodedResponse = Functions.encodeUint256(
  BigInt(mockTimestamp) << 192n |
  BigInt(kwhFixed) << 128n |
  BigInt(latitudeFixed) << 64n |
  BigInt(longitudeFixed) << 32n |
  BigInt(nodeId)
);

return encodedResponse;
`;

async function main() {
  console.log("🗽 Deploying Chainlink Functions Energy Monitor for NYC");
  console.log("=".repeat(60));

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying from: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC`);

  if (balance < ethers.parseEther('0.1')) {
    console.warn('⚠️  Warning: Low balance. You may need more MATIC for deployment.');
  }

  // Deploy the contract
  console.log("\n🚀 Deploying EnergyMonitorWithChainlink...");
  
  const EnergyMonitorWithChainlink = await ethers.getContractFactory("EnergyMonitorWithChainlink");
  const contract = await EnergyMonitorWithChainlink.deploy(
    POLYGON_AMOY_CONFIG.router,
    POLYGON_AMOY_CONFIG.subscriptionId,
    POLYGON_AMOY_CONFIG.gasLimit,
    POLYGON_AMOY_CONFIG.donId
  );

  console.log(`⏳ Deployment transaction: ${contract.deploymentTransaction().hash}`);
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`✅ Contract deployed to: ${contractAddress}`);

  // Set the JavaScript source code
  console.log("\n📝 Setting Chainlink Functions source code...");
  const setSourceTx = await contract.setSource(FUNCTIONS_SOURCE);
  await setSourceTx.wait();
  console.log("✅ Source code set successfully");

  // Register all NYC nodes in batches
  console.log(`\n🗽 Registering ${NYC_COORDINATES.length} NYC energy monitoring nodes...`);
  
  const batchSize = 50; // Register in batches to avoid gas limits
  let totalRegistered = 0;

  for (let i = 0; i < NYC_COORDINATES.length; i += batchSize) {
    const batch = NYC_COORDINATES.slice(i, i + batchSize);
    
    console.log(`📦 Registering batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(NYC_COORDINATES.length / batchSize)} (${batch.length} nodes)`);
    
    const registerTx = await contract.registerNodesBatch(batch);
    await registerTx.wait();
    
    totalRegistered += batch.length;
    console.log(`✅ Batch registered. Total nodes: ${totalRegistered}`);
    
    // Small delay between batches
    if (i + batchSize < NYC_COORDINATES.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const nodeCount = await contract.nodeCount();
  const activeNodes = await contract.getActiveNodes();
  
  console.log(`📊 Total nodes registered: ${nodeCount}`);
  console.log(`🟢 Active nodes: ${activeNodes.length}`);

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: "polygon-amoy",
    chainId: 80002,
    router: POLYGON_AMOY_CONFIG.router,
    donId: POLYGON_AMOY_CONFIG.donId,
    subscriptionId: POLYGON_AMOY_CONFIG.subscriptionId,
    gasLimit: POLYGON_AMOY_CONFIG.gasLimit,
    nodeCount: nodeCount.toString(),
    activeNodes: activeNodes.length,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    transactionHash: contract.deploymentTransaction().hash
  };

  const deploymentFile = `chainlink-deployment-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📋 Deployment Summary:");
  console.log(`   📍 Contract Address: ${contractAddress}`);
  console.log(`   🌐 Network: Polygon Amoy Testnet`);
  console.log(`   🗽 NYC Nodes: ${nodeCount} registered`);
  console.log(`   🔗 Chainlink Router: ${POLYGON_AMOY_CONFIG.router}`);
  console.log(`   📋 Subscription ID: ${POLYGON_AMOY_CONFIG.subscriptionId}`);
  console.log(`   💾 Deployment info saved: ${deploymentFile}`);

  console.log("\n📝 Environment Variable:");
  console.log(`NEXT_PUBLIC_POLYGON_AMOY_CONTRACT_ADDRESS=${contractAddress}`);

  console.log("\n🎉 Deployment Complete!");
  console.log("💡 Next steps:");
  console.log("   1. Update frontend .env with the contract address above");
  console.log("   2. Fund the Chainlink subscription if not already done");
  console.log("   3. Add this contract as a consumer to the subscription");
  console.log("   4. Run the data population script to start feeding data");

  return contractAddress;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = { main };