const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Deploy Enhanced ChainlinkEnergyMonitor with Edge Support to Polygon Amoy
 * Complete deployment with 35 NYC nodes + 45 edge connections
 */

const POLYGON_AMOY_CONFIG = {
  name: "Polygon Amoy",
  chainId: 80002,
  gasPrice: "30000000000", // 30 gwei (above minimum requirement)
  gasLimit: 200000, // Per transaction
  explorerUrl: "https://amoy.polygonscan.com",
  rpcUrl: "https://rpc-amoy.polygon.technology"
};

async function checkPrerequisites() {
  console.log("🔍 Checking deployment prerequisites...");
  
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);
  
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 POL Balance: ${ethers.formatEther(balance)} POL`);
  
  const requiredBalance = ethers.parseEther("0.05"); // Need at least 0.05 POL
  if (balance < requiredBalance) {
    console.log(`❌ Insufficient balance. Need at least 0.05 POL.`);
    console.log(`🚰 Get testnet POL from:`);
    console.log(`   • https://faucets.chain.link/polygon-amoy`);
    console.log(`   • https://faucet.quicknode.com/polygon/amoy`);
    console.log(`   • https://www.alchemy.com/faucets/polygon-amoy`);
    throw new Error("Insufficient balance for deployment");
  }
  
  console.log(`✅ Prerequisites met`);
  return { deployer, balance };
}

async function estimateDeploymentCosts() {
  console.log("\n📊 Estimating deployment costs...");
  
  const [deployer] = await ethers.getSigners();
  
  // Estimate contract deployment
  const ChainlinkEnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
  const deployTx = await ChainlinkEnergyMonitor.getDeployTransaction();
  const deployGas = await deployer.estimateGas(deployTx);
  
  // Estimate node registration (35 nodes)
  const nodeGasPerTx = BigInt(120000);
  const totalNodeGas = nodeGasPerTx * BigInt(35);
  
  // Estimate edge registration (45 edges) 
  const edgeGasPerTx = BigInt(180000);
  const totalEdgeGas = edgeGasPerTx * BigInt(45);
  
  const gasPrice = BigInt(POLYGON_AMOY_CONFIG.gasPrice);
  
  const deploymentCost = deployGas * gasPrice;
  const nodesCost = totalNodeGas * gasPrice;
  const edgesCost = totalEdgeGas * gasPrice;
  const totalCost = deploymentCost + nodesCost + edgesCost;
  
  console.log(`📊 Cost Breakdown:`);
  console.log(`   Contract deployment: ${ethers.formatEther(deploymentCost)} POL`);
  console.log(`   35 nodes registration: ${ethers.formatEther(nodesCost)} POL`);
  console.log(`   45 edges registration: ${ethers.formatEther(edgesCost)} POL`);
  console.log(`   Total estimated: ${ethers.formatEther(totalCost)} POL (~$${(parseFloat(ethers.formatEther(totalCost)) * 0.5).toFixed(4)})`);
  
  return {
    deployGas,
    totalCost,
    deploymentCost,
    nodesCost,
    edgesCost
  };
}

async function deployContract() {
  console.log("\n🚀 Deploying ChainlinkEnergyMonitor to Polygon Amoy...");
  
  const ChainlinkEnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
  
  console.log("📤 Deploying enhanced contract with edge support...");
  const contract = await ChainlinkEnergyMonitor.deploy({
    gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
    gasLimit: 5000000 // Higher limit for contract deployment
  });
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Contract deployed at: ${contractAddress}`);
  console.log(`🔗 Explorer: ${POLYGON_AMOY_CONFIG.explorerUrl}/address/${contractAddress}`);
  
  // Verify deployment
  const nodeCount = await contract.nodeCount();
  const edgeCount = await contract.edgeCount();
  console.log(`📊 Initial state: ${nodeCount} nodes, ${edgeCount} edges`);
  
  return contract;
}

async function setupNYCNodes(contract) {
  console.log("\n📍 Setting up 35 NYC energy monitoring nodes...");
  
  // Load all 35 NYC nodes from data file
  const { getFormattedLocations } = require("../../scripts/nyc-nodes-data.js");
  const locations = getFormattedLocations();
  
  console.log(`📋 Registering ${locations.length} strategic NYC locations...`);
  
  let successCount = 0;
  const batchSize = 3; // Small batches to avoid gas issues
  
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    console.log(`📍 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(locations.length/batchSize)} (${batch.length} nodes):`);
    
    for (const location of batch) {
      try {
        const tx = await contract.registerNode(location, {
          gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
          gasLimit: POLYGON_AMOY_CONFIG.gasLimit
        });
        
        await tx.wait();
        console.log(`   ✅ Node ${successCount}: ${location.split(',')[0]}`);
        successCount++;
        
        // Delay between transactions to avoid mempool issues
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`   ❌ Node ${successCount}: ${error.reason || error.message}`);
      }
    }
  }
  
  const nodeCount = await contract.nodeCount();
  console.log(`📊 Successfully registered: ${nodeCount}/${locations.length} nodes`);
  
  return { nodeCount, successCount };
}

async function setupNYCEdges(contract) {
  console.log("\n🔗 Setting up 45 NYC grid edge connections...");
  
  // Load all 45 edge connections from data file
  const { EDGE_CONNECTIONS } = require("../../scripts/nyc-nodes-data.js");
  
  console.log(`📋 Registering ${EDGE_CONNECTIONS.length} grid connections...`);
  
  let successCount = 0;
  const batchSize = 2; // Very small batches for edge registration (more complex)
  
  for (let i = 0; i < EDGE_CONNECTIONS.length; i += batchSize) {
    const batch = EDGE_CONNECTIONS.slice(i, i + batchSize);
    
    console.log(`🔗 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(EDGE_CONNECTIONS.length/batchSize)} (${batch.length} edges):`);
    
    for (const edge of batch) {
      try {
        // Convert capacity and distance to appropriate blockchain units
        const capacityScaled = edge.capacity * 1000; // Scale capacity
        const distanceScaled = Math.floor(edge.distance * 1000); // Scale distance
        
        const tx = await contract.registerEdge(
          edge.from,
          edge.to,
          edge.type,
          capacityScaled,
          distanceScaled,
          {
            gasPrice: POLYGON_AMOY_CONFIG.gasPrice,
            gasLimit: 250000 // Higher gas limit for edge registration
          }
        );
        
        await tx.wait();
        console.log(`   ✅ Edge ${successCount}: ${edge.from} -> ${edge.to} (${edge.type})`);
        successCount++;
        
        // Longer delay for edge transactions
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   ❌ Edge ${successCount}: ${error.reason || error.message}`);
      }
    }
  }
  
  const edgeCount = await contract.edgeCount();
  console.log(`📊 Successfully registered: ${edgeCount}/${EDGE_CONNECTIONS.length} edges`);
  
  return { edgeCount, successCount };
}

async function verifyDeployment(contract) {
  console.log("\n🔍 Verifying deployment...");
  
  const nodeCount = await contract.nodeCount();
  const edgeCount = await contract.edgeCount();
  
  console.log(`📊 Final state:`);
  console.log(`   Nodes: ${nodeCount}`);
  console.log(`   Edges: ${edgeCount}`);
  
  // Test basic functionality
  if (nodeCount > 0) {
    const allNodes = await contract.getAllNodes();
    console.log(`   getAllNodes(): ${allNodes.length} nodes returned`);
    
    const firstNode = allNodes[0];
    console.log(`   Sample node: ${firstNode.location} (active: ${firstNode.active})`);
  }
  
  if (edgeCount > 0) {
    const allEdges = await contract.getAllEdges();
    console.log(`   getAllEdges(): ${allEdges.length} edges returned`);
    
    const firstEdge = allEdges[0];
    console.log(`   Sample edge: ${firstEdge.from} -> ${firstEdge.to} (${firstEdge.edgeType})`);
  }
  
  return { nodeCount, edgeCount };
}

async function saveDeploymentInfo(contract, costs, nodeResults, edgeResults) {
  console.log("\n💾 Saving deployment information...");
  
  const contractAddress = await contract.getAddress();
  const [deployer] = await ethers.getSigners();
  
  const deploymentInfo = {
    contractName: "ChainlinkEnergyMonitor",
    contractType: "Enhanced with Edge Support",
    network: POLYGON_AMOY_CONFIG.name,
    chainId: POLYGON_AMOY_CONFIG.chainId,
    contractAddress,
    explorerUrl: POLYGON_AMOY_CONFIG.explorerUrl,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    
    costs: {
      totalEstimated: ethers.formatEther(costs.totalCost),
      deployment: ethers.formatEther(costs.deploymentCost),
      nodes: ethers.formatEther(costs.nodesCost),
      edges: ethers.formatEther(costs.edgesCost),
      totalUSD: (parseFloat(ethers.formatEther(costs.totalCost)) * 0.5).toFixed(4)
    },
    
    topology: {
      nodesRegistered: nodeResults.nodeCount.toString(),
      edgesRegistered: edgeResults.edgeCount.toString(),
      nodeSuccess: nodeResults.successCount,
      edgeSuccess: edgeResults.successCount,
      nycCoverage: "35 strategic locations across NYC",
      gridConnections: "45 intelligent edge connections"
    },
    
    capabilities: {
      chainlinkFunctions: true,
      edgeConnectivity: true,
      gridTopology: true,
      frontendCompatible: true,
      productionReady: true
    },
    
    features: [
      "Real Chainlink Functions integration",
      "Complete NYC energy grid topology",
      "Node-to-node edge connectivity",
      "Frontend-compatible data structures",
      "Production-ready for real energy data"
    ]
  };
  
  // Save to deployments directory
  const deploymentPath = path.join(__dirname, "../deployments/polygon-amoy-enhanced.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  // Update frontend deployments
  const frontendDeployments = path.join(__dirname, "../frontend-abi/deployments.json");
  if (fs.existsSync(frontendDeployments)) {
    try {
      const deployments = require(frontendDeployments);
      
      // Update Polygon Amoy entry
      deployments.networks.polygonAmoy = {
        name: POLYGON_AMOY_CONFIG.name,
        chainId: POLYGON_AMOY_CONFIG.chainId,
        rpcUrl: POLYGON_AMOY_CONFIG.rpcUrl,
        explorer: POLYGON_AMOY_CONFIG.explorerUrl,
        contracts: {
          ChainlinkEnergyMonitor: contractAddress,
          EnhancedEnergyMonitor: contractAddress // Alias for enhanced version
        }
      };
      
      deployments.recommendedContract = "ChainlinkEnergyMonitor";
      deployments.productionReady = true;
      deployments.features = {
        nodes: nodeResults.nodeCount.toString(),
        edges: edgeResults.edgeCount.toString(),
        gridTopology: true,
        chainlinkIntegration: true
      };
      
      fs.writeFileSync(frontendDeployments, JSON.stringify(deployments, null, 2));
      console.log(`✅ Updated frontend deployments.json`);
      
    } catch (error) {
      console.log(`⚠️  Could not update frontend deployments: ${error.message}`);
    }
  }
  
  console.log(`✅ Deployment info saved to: ${deploymentPath}`);
  return deploymentInfo;
}

async function printNextSteps(deploymentInfo) {
  console.log(`\n🎉 Enhanced ChainlinkEnergyMonitor Deployment Complete!`);
  console.log(`${"=".repeat(65)}`);
  
  console.log(`\n📋 Deployment Summary:`);
  console.log(`   Contract: ${deploymentInfo.contractAddress}`);
  console.log(`   Network: ${deploymentInfo.network}`);
  console.log(`   Explorer: ${deploymentInfo.explorerUrl}/address/${deploymentInfo.contractAddress}`);
  console.log(`   Cost: ${deploymentInfo.costs.totalEstimated} POL (~$${deploymentInfo.costs.totalUSD})`);
  
  console.log(`\n🌐 Grid Topology:`);
  console.log(`   Nodes: ${deploymentInfo.topology.nodesRegistered}/35 NYC locations`);
  console.log(`   Edges: ${deploymentInfo.topology.edgesRegistered}/45 grid connections`);
  console.log(`   Coverage: ${deploymentInfo.topology.nycCoverage}`);
  
  console.log(`\n✅ Enhanced Features:`);
  deploymentInfo.features.forEach(feature => {
    console.log(`   • ${feature}`);
  });
  
  console.log(`\n📋 Next Steps:`);
  
  console.log(`\n1. 🔗 Setup Chainlink Functions:`);
  console.log(`   Visit: https://functions.chain.link/polygon-amoy`);
  console.log(`   - Create subscription and fund with LINK`);
  console.log(`   - Add contract as consumer: ${deploymentInfo.contractAddress}`);
  console.log(`   - Test with: contract.requestDataUpdate(subscriptionId)`);
  
  console.log(`\n2. 🧪 Test the deployment:`);
  console.log(`   npx hardhat run scripts/test-polygon-amoy-deployment.js --network polygonAmoy`);
  
  console.log(`\n3. 🖥️  Frontend integration:`);
  console.log(`   Contract address: ${deploymentInfo.contractAddress}`);
  console.log(`   New features: getAllEdges(), getNodeEdges(), getEdge()`);
  console.log(`   Same interface as before + edge functionality`);
  
  console.log(`\n4. 📊 Production usage:`);
  console.log(`   • Real energy data via Chainlink Functions`);
  console.log(`   • Complete NYC grid topology visualization`);
  console.log(`   • Node-to-node connectivity mapping`);
  console.log(`   • Ready for real-time energy monitoring`);
  
  console.log(`\n🌟 Success! Your enhanced energy grid is live on Polygon Amoy! 🎉`);
}

async function main() {
  try {
    console.log(`🟣 Enhanced ChainlinkEnergyMonitor Deployment to Polygon Amoy`);
    console.log(`${"=".repeat(65)}`);
    
    // Phase 1: Prerequisites and estimation
    const { deployer, balance } = await checkPrerequisites();
    const costs = await estimateDeploymentCosts();
    
    // Confirm deployment
    console.log(`\n❓ Proceed with deployment? Estimated cost: ${ethers.formatEther(costs.totalCost)} POL`);
    console.log(`   (This is an automated script - proceeding automatically)`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Phase 2: Contract deployment
    const contract = await deployContract();
    
    // Phase 3: Setup topology
    const nodeResults = await setupNYCNodes(contract);
    const edgeResults = await setupNYCEdges(contract);
    
    // Phase 4: Verification
    await verifyDeployment(contract);
    
    // Phase 5: Documentation
    const deploymentInfo = await saveDeploymentInfo(contract, costs, nodeResults, edgeResults);
    await printNextSteps(deploymentInfo);
    
  } catch (error) {
    console.error("\n💥 Deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, POLYGON_AMOY_CONFIG };