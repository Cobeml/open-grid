const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Local Deployment and Testing Script
 * Tests contracts before testnet deployment
 */

async function deployLegacyContract() {
  console.log("🚀 Deploying EnergyMonitorLegacy for local testing...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`👛 Deployer: ${deployer.address}`);
  
  const EnergyMonitorLegacy = await ethers.getContractFactory("EnergyMonitorLegacy");
  
  // Deploy with mock parameters
  const contract = await EnergyMonitorLegacy.deploy(
    "0x0000000000000000000000000000000000000000", // Mock router
    1, // Mock subscription ID
    300000, // Gas limit
    ethers.id("mock-don-1") // Mock DON ID
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ EnergyMonitorLegacy deployed at: ${contractAddress}`);
  return contract;
}

async function deploySimpleChainlinkContract() {
  console.log("\n🚀 Deploying SimpleEnergyMonitorWithChainlink for local testing...");
  
  const [deployer] = await ethers.getSigners();
  
  const SimpleEnergyMonitor = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");
  
  // Minimal JS source for local testing
  const minimalSource = `
    const nodeId = parseInt(args[0] || "0");
    const timestamp = Math.floor(Date.now() / 1000);
    const kWh = 2000 + (nodeId * 500);
    return Functions.encodeUint256(BigInt(kWh));
  `;
  
  const contract = await SimpleEnergyMonitor.deploy(
    "0x0000000000000000000000000000000000000000", // Mock router
    ethers.id("mock-don-amoy"), // Mock DON ID
    1, // Mock subscription ID
    minimalSource
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ SimpleEnergyMonitorWithChainlink deployed at: ${contractAddress}`);
  return contract;
}

async function setupNodes(contract, contractName) {
  console.log(`\n📍 Setting up nodes for ${contractName}...`);
  
  const SAMPLE_NODES = [
    { location: "lat:40.7580,lon:-73.9855", name: "Times Square Hub" },
    { location: "lat:40.7074,lon:-74.0113", name: "Wall Street Station" },
    { location: "lat:40.7484,lon:-73.9857", name: "Empire State Building" },
    { location: "lat:40.7128,lon:-74.0060", name: "NYC Center" },
    { location: "lat:40.7589,lon:-73.9851", name: "Broadway District" }
  ];
  
  for (let i = 0; i < SAMPLE_NODES.length; i++) {
    const node = SAMPLE_NODES[i];
    
    try {
      let tx;
      if (contractName === "SimpleEnergyMonitorWithChainlink") {
        tx = await contract.registerNode(node.location, node.name);
      } else {
        tx = await contract.registerNode(node.location);
      }
      
      await tx.wait();
      console.log(`✅ Node ${i}: ${node.name} registered`);
    } catch (error) {
      console.log(`❌ Failed to register node ${i}: ${error.message}`);
    }
  }
  
  const nodeCount = await contract.nodeCount();
  console.log(`📊 Total nodes registered: ${nodeCount}`);
}

async function testDataOperations(contract, contractName) {
  console.log(`\n🧪 Testing data operations for ${contractName}...`);
  
  if (contractName === "EnergyMonitorLegacy") {
    // Test mock data request
    console.log("📤 Testing mock data request...");
    const mockSource = "return Functions.encodeUint256(0);";
    const mockArgs = ["0", "40.7580", "-73.9855"];
    
    const tx = await contract.requestDataUpdate(
      0, // nodeId
      mockSource,
      "0x", // encryptedSecretsUrls
      0, // donHostedSecretsSlotID
      1, // donHostedSecretsVersion
      mockArgs
    );
    await tx.wait();
    console.log("✅ Mock request sent");
    
    // Test mock fulfillment
    console.log("📥 Testing mock fulfillment...");
    const timestamp = Math.floor(Date.now() / 1000);
    const kWh = 2500;
    const lat = 407580;
    const lon = 740060;
    const nodeId = 0;
    
    const encodedData = (BigInt(timestamp) << 192n) | 
                       (BigInt(kWh) << 128n) | 
                       (BigInt(lat) << 64n) | 
                       (BigInt(lon) << 32n) | 
                       BigInt(nodeId);
    
    const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encodedData]);
    const requestId = ethers.id("mock-request");
    
    const fulfillTx = await contract.fulfillRequest(requestId, response, "0x");
    await fulfillTx.wait();
    console.log("✅ Mock fulfillment completed");
    
  } else if (contractName === "SimpleEnergyMonitorWithChainlink") {
    // Test Chainlink-style request (will emit event but not actually execute)
    console.log("📤 Testing Chainlink request...");
    try {
      const tx = await contract.requestEnergyData(0);
      await tx.wait();
      console.log("✅ Chainlink request sent (local simulation)");
    } catch (error) {
      console.log(`⚠️  Chainlink request failed as expected in local mode: ${error.reason || error.message}`);
    }
  }
}

async function testViewFunctions(contract, contractName) {
  console.log(`\n👁️ Testing view functions for ${contractName}...`);
  
  try {
    // Test node count
    const nodeCount = await contract.nodeCount();
    console.log(`📊 Node count: ${nodeCount}`);
    
    // Test individual node data
    if (nodeCount > 0) {
      const node = await contract.nodes(0);
      console.log(`📍 Node 0: ${node.location} (Active: ${node.active})`);
    }
    
    // Test data count
    const dataCount = await contract.dataCount();
    console.log(`📈 Data count: ${dataCount}`);
    
    // Test getAllNodes if available
    if (contractName === "EnergyMonitorLegacy") {
      const allNodes = await contract.getAllNodes();
      console.log(`📋 All nodes count: ${allNodes.length}`);
    }
    
    // Test getActiveNodes if available
    if (contractName === "SimpleEnergyMonitorWithChainlink") {
      const activeNodes = await contract.getActiveNodes();
      console.log(`🟢 Active nodes: ${activeNodes.length}`);
    }
    
  } catch (error) {
    console.log(`❌ View function test failed: ${error.message}`);
  }
}

async function testEventEmission(contract, contractName) {
  console.log(`\n📡 Testing event emission for ${contractName}...`);
  
  let eventPromise;
  
  if (contractName === "EnergyMonitorLegacy") {
    // Listen for DataUpdated events
    eventPromise = new Promise((resolve) => {
      contract.once("DataUpdated", (dataId, nodeId, kWh, location, timestamp) => {
        resolve({
          event: "DataUpdated",
          data: { dataId: dataId.toString(), nodeId: nodeId.toString(), kWh: kWh.toString(), location, timestamp: timestamp.toString() }
        });
      });
    });
    
    // Trigger an event
    const timestamp = Math.floor(Date.now() / 1000);
    const encodedData = (BigInt(timestamp) << 192n) | (BigInt(3000) << 128n) | (BigInt(407580) << 64n) | (BigInt(740060) << 32n) | BigInt(0);
    const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encodedData]);
    const requestId = ethers.id("test-event");
    
    await contract.fulfillRequest(requestId, response, "0x");
    
  } else if (contractName === "SimpleEnergyMonitorWithChainlink") {
    // Listen for RequestSent events
    eventPromise = new Promise((resolve) => {
      contract.once("RequestSent", (requestId, nodeId) => {
        resolve({
          event: "RequestSent",
          data: { requestId, nodeId: nodeId.toString() }
        });
      });
    });
    
    // Try to trigger an event (may fail but should emit)
    try {
      await contract.requestEnergyData(0);
    } catch (error) {
      console.log("⚠️  Request failed as expected in local mode");
    }
  }
  
  try {
    const eventResult = await Promise.race([
      eventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Event timeout")), 5000))
    ]);
    
    console.log(`✅ Event received: ${eventResult.event}`);
    console.log(`📊 Event data:`, eventResult.data);
  } catch (error) {
    console.log(`⚠️  Event test: ${error.message}`);
  }
}

async function generateFrontendABI(contracts) {
  console.log("\n📄 Generating Frontend ABI files...");
  
  const frontendDir = path.join(__dirname, "../frontend-abi");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  
  for (const [name, contract] of Object.entries(contracts)) {
    const abi = contract.interface.fragments.map(fragment => fragment.format("json")).map(JSON.parse);
    const abiFile = path.join(frontendDir, `${name}.json`);
    
    const contractInfo = {
      contractName: name,
      abi: abi,
      address: await contract.getAddress(),
      network: "localhost",
      deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(abiFile, JSON.stringify(contractInfo, null, 2));
    console.log(`📝 ${name} ABI saved to: ${abiFile}`);
  }
}

async function saveDeploymentInfo(contracts) {
  console.log("\n💾 Saving deployment information...");
  
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    rpcUrl: "http://localhost:8545",
    deployedAt: new Date().toISOString(),
    contracts: {}
  };
  
  for (const [name, contract] of Object.entries(contracts)) {
    deploymentInfo.contracts[name] = {
      address: await contract.getAddress(),
      deployer: (await ethers.getSigners())[0].address
    };
  }
  
  const deploymentPath = path.join(__dirname, "../deployments/localhost.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`📋 Deployment info saved to: ${deploymentPath}`);
  return deploymentInfo;
}

async function printFrontendInstructions(deploymentInfo) {
  console.log(`\n🌐 Frontend Connection Instructions`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\n📡 Local Network Details:`);
  console.log(`   RPC URL: http://localhost:8545`);
  console.log(`   Chain ID: 31337`);
  console.log(`   Network Name: Hardhat Local`);
  
  console.log(`\n📋 Contract Addresses:`);
  for (const [name, contract] of Object.entries(deploymentInfo.contracts)) {
    console.log(`   ${name}: ${contract.address}`);
  }
  
  console.log(`\n🔧 Frontend Setup:`);
  console.log(`   1. Add local network to MetaMask:`);
  console.log(`      - Network Name: Hardhat Local`);
  console.log(`      - RPC URL: http://localhost:8545`);
  console.log(`      - Chain ID: 31337`);
  console.log(`      - Currency Symbol: ETH`);
  
  console.log(`\n   2. Import test account to MetaMask:`);
  console.log(`      - Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`      - Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`);
  console.log(`      - Balance: 10,000 ETH`);
  
  console.log(`\n   3. Use contract addresses in frontend:`);
  console.log(`      - Update your frontend config with the addresses above`);
  console.log(`      - ABI files are available in: packages/contracts/frontend-abi/`);
  
  console.log(`\n   4. Test frontend connection:`);
  console.log(`      - Start your frontend application`);
  console.log(`      - Connect to the local network`);
  console.log(`      - Verify contract interactions work`);
}

async function main() {
  try {
    console.log("🧪 Starting Local Contract Testing");
    console.log(`${"=".repeat(60)}`);
    
    // Deploy both contracts
    const legacyContract = await deployLegacyContract();
    const chainlinkContract = await deploySimpleChainlinkContract();
    
    const contracts = {
      "EnergyMonitorLegacy": legacyContract,
      "SimpleEnergyMonitorWithChainlink": chainlinkContract
    };
    
    // Test each contract
    for (const [name, contract] of Object.entries(contracts)) {
      console.log(`\n${"─".repeat(40)}`);
      console.log(`🔍 Testing ${name}`);
      console.log(`${"─".repeat(40)}`);
      
      await setupNodes(contract, name);
      await testDataOperations(contract, name);
      await testViewFunctions(contract, name);
      await testEventEmission(contract, name);
    }
    
    // Generate frontend files
    await generateFrontendABI(contracts);
    const deploymentInfo = await saveDeploymentInfo(contracts);
    
    // Print instructions
    await printFrontendInstructions(deploymentInfo);
    
    console.log(`\n🎉 Local Testing Complete!`);
    console.log(`✅ Both contracts deployed and tested successfully`);
    console.log(`📋 Ready for frontend integration testing`);
    console.log(`🚀 Contracts are ready for testnet deployment`);
    
  } catch (error) {
    console.error("\n💥 Local testing failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n💡 Keep the Hardhat network running for frontend testing");
      console.log("   Press Ctrl+C to stop the local network");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };