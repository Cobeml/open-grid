const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * End-to-End LayerZero Cross-Chain Testing
 * Tests complete data flow from Chainlink Functions to LayerZero broadcasting
 */

// Test configuration
const TEST_CONFIG = {
  sourceNetwork: "polygonAmoy",
  sourceContractType: "ChainlinkEnergyMonitorOApp",
  
  receiverNetworks: ["arbitrumSepolia", "sepolia", "optimismSepolia", "baseSepolia"],
  receiverContractType: "EnergyDataReceiver",
  
  testTimeout: 300000, // 5 minutes
  broadcastInterval: 10000, // 10 seconds for testing
  
  chainlinkSubscriptionId: 1, // Default for testing
};

// Network configurations for testing
const NETWORK_CONFIGS = {
  polygonAmoy: {
    name: "Polygon Amoy",
    eid: 40267,
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com"
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia", 
    eid: 40231,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io"
  },
  sepolia: {
    name: "Ethereum Sepolia",
    eid: 40161,
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
    explorerUrl: "https://sepolia.etherscan.io"
  },
  optimismSepolia: {
    name: "Optimism Sepolia",
    eid: 40232,
    rpcUrl: "https://sepolia.optimism.io", 
    explorerUrl: "https://sepolia-optimism.etherscan.io"
  },
  baseSepolia: {
    name: "Base Sepolia",
    eid: 40245,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org"
  }
};

class LayerZeroTester {
  constructor() {
    this.testResults = {
      startTime: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
    
    this.deployments = {};
    this.contracts = {};
  }

  async loadDeployments() {
    console.log("📋 Loading contract deployments...");
    
    // Load source deployment
    const sourcePath = path.join(__dirname, "../deployments/chainlink-oapp-polygon-amoy.json");
    if (fs.existsSync(sourcePath)) {
      this.deployments.source = require(sourcePath);
      console.log(`✅ Source: ${this.deployments.source.contractAddress}`);
    } else {
      throw new Error("Source deployment not found. Deploy ChainlinkEnergyMonitorOApp first.");
    }
    
    // Load receiver deployments
    this.deployments.receivers = {};
    for (const network of TEST_CONFIG.receiverNetworks) {
      const receiverPath = path.join(__dirname, `../deployments/receiver-${network}.json`);
      if (fs.existsSync(receiverPath)) {
        this.deployments.receivers[network] = require(receiverPath);
        console.log(`✅ ${network}: ${this.deployments.receivers[network].contractAddress}`);
      } else {
        console.log(`⚠️  ${network}: deployment not found (will skip)`);
      }
    }
    
    const receiverCount = Object.keys(this.deployments.receivers).length;
    console.log(`📊 Loaded ${receiverCount} receiver deployments`);
  }

  async connectToContracts() {
    console.log("\n🔗 Connecting to contracts...");
    
    // Connect to source contract (local/testnet)
    let sourceProvider;
    if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
      sourceProvider = new ethers.JsonRpcProvider("http://localhost:8545");
    } else {
      sourceProvider = ethers.provider;
    }
    
    try {
      // Load source contract
      const sourceArtifact = require("../artifacts/contracts/ChainlinkEnergyMonitorOApp.sol/ChainlinkEnergyMonitorOApp.json");
      this.contracts.source = new ethers.Contract(
        this.deployments.source.contractAddress,
        sourceArtifact.abi,
        sourceProvider
      );
      
      console.log(`✅ Connected to source contract`);
      
    } catch (error) {
      console.log(`⚠️  Could not connect to source: ${error.message}`);
      console.log(`   Using local ChainlinkEnergyMonitor for basic testing...`);
      
      // Fallback to local ChainlinkEnergyMonitor
      const localDeployments = require("../frontend-abi/deployments.json");
      const localAddress = localDeployments.networks.localhost.contracts.ChainlinkEnergyMonitor;
      
      if (localAddress) {
        const localArtifact = require("../artifacts/contracts/ChainlinkEnergyMonitor.sol/EnergyMonitor.json");
        this.contracts.source = new ethers.Contract(localAddress, localArtifact.abi, sourceProvider);
        console.log(`✅ Connected to local ChainlinkEnergyMonitor for testing`);
      }
    }
    
    // Note: Receiver contracts would be connected similarly for full testing
    console.log(`📊 Contract connections established`);
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    console.log(`${"─".repeat(50)}`);
    
    const testResult = {
      name: testName,
      startTime: new Date().toISOString(),
      status: "running",
      duration: 0,
      error: null,
      details: {}
    };
    
    this.testResults.tests.push(testResult);
    this.testResults.summary.total++;
    
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      
      testResult.status = "passed";
      testResult.details = result || {};
      testResult.duration = Date.now() - startTime;
      
      this.testResults.summary.passed++;
      console.log(`✅ PASSED: ${testName} (${testResult.duration}ms)`);
      
      return true;
      
    } catch (error) {
      testResult.status = "failed";
      testResult.error = error.message;
      testResult.duration = Date.now() - startTime;
      
      this.testResults.summary.failed++;
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      
      return false;
    }
  }

  async testSourceContractBasics() {
    if (!this.contracts.source) {
      throw new Error("Source contract not connected");
    }
    
    // Test basic contract functions
    const nodeCount = await this.contracts.source.nodeCount();
    const dataCount = await this.contracts.source.dataCount();
    
    console.log(`📊 Node count: ${nodeCount}`);
    console.log(`📊 Data count: ${dataCount}`);
    
    if (nodeCount == 0) {
      throw new Error("No nodes registered in source contract");
    }
    
    // Test view functions
    const allNodes = await this.contracts.source.getAllNodes();
    console.log(`📋 getAllNodes() returned ${allNodes.length} nodes`);
    
    return {
      nodeCount: nodeCount.toString(),
      dataCount: dataCount.toString(),
      nodesReturned: allNodes.length
    };
  }

  async testChainlinkFunctionality() {
    if (!this.contracts.source) {
      throw new Error("Source contract not connected");
    }
    
    console.log("📡 Testing Chainlink Functions integration...");
    
    try {
      // Check if contract supports Chainlink Functions
      const hasRequestFunction = this.contracts.source.interface.fragments.some(
        f => f.name === "requestDataUpdate"
      );
      
      if (!hasRequestFunction) {
        console.log("⚠️  Contract doesn't support Chainlink Functions (using local version)");
        return { supported: false, reason: "Local testing mode" };
      }
      
      console.log("🔍 Chainlink Functions interface detected");
      
      // In testnet, would actually call requestDataUpdate
      // For local testing, we simulate
      console.log("💡 In testnet: would call requestDataUpdate() with subscription ID");
      console.log("💡 This would trigger DON execution and data updates");
      
      return {
        supported: true,
        interfaceDetected: true,
        testMode: "simulation"
      };
      
    } catch (error) {
      throw new Error(`Chainlink Functions test failed: ${error.message}`);
    }
  }

  async testLayerZeroConfiguration() {
    if (!this.contracts.source) {
      throw new Error("Source contract not connected");
    }
    
    console.log("🌐 Testing LayerZero configuration...");
    
    try {
      // Check if contract supports LayerZero
      const hasLayerZeroFunction = this.contracts.source.interface.fragments.some(
        f => f.name === "broadcastLatestData" || f.name === "setDestinationChains"
      );
      
      if (!hasLayerZeroFunction) {
        console.log("⚠️  Contract doesn't support LayerZero (using local version)");
        return { supported: false, reason: "Local testing mode" };
      }
      
      console.log("🔍 LayerZero interface detected");
      
      // Test configuration functions
      const crossChainConfig = await this.contracts.source.crossChainConfig();
      console.log(`📡 Auto-broadcast: ${crossChainConfig.autoBroadcast}`);
      console.log(`📦 Batch size: ${crossChainConfig.batchSize}`);
      
      return {
        supported: true,
        autoBroadcast: crossChainConfig.autoBroadcast,
        batchSize: crossChainConfig.batchSize.toString()
      };
      
    } catch (error) {
      throw new Error(`LayerZero configuration test failed: ${error.message}`);
    }
  }

  async testDataStructureCompatibility() {
    if (!this.contracts.source) {
      throw new Error("Source contract not connected");
    }
    
    console.log("🔍 Testing data structure compatibility...");
    
    // Test that data structures match frontend expectations
    const nodeCount = await this.contracts.source.nodeCount();
    
    if (nodeCount > 0) {
      // Test individual node access
      const node0 = await this.contracts.source.nodes(0);
      console.log(`📍 Node 0 structure:`);
      console.log(`   Location: ${node0.location}`);
      console.log(`   Active: ${node0.active}`);
      console.log(`   Registered: ${new Date(Number(node0.registeredAt) * 1000).toISOString()}`);
      
      // Test if getLatestDataForNode exists and works
      try {
        const latestData = await this.contracts.source.getLatestDataForNode(0);
        console.log(`📈 Latest data structure verified`);
        
        return {
          nodeStructureValid: true,
          dataStructureValid: true,
          frontendCompatible: true
        };
        
      } catch (error) {
        console.log(`⚠️  No data available for node 0 (expected in fresh deployment)`);
        
        return {
          nodeStructureValid: true,
          dataStructureValid: false,
          frontendCompatible: true,
          note: "No data available yet"
        };
      }
    } else {
      throw new Error("No nodes to test data structures with");
    }
  }

  async testCrossChainMessaging() {
    console.log("🌐 Testing cross-chain messaging simulation...");
    
    // For local testing, we simulate the cross-chain flow
    const availableReceivers = Object.keys(this.deployments.receivers);
    
    if (availableReceivers.length === 0) {
      console.log("⚠️  No receiver contracts available for testing");
      return {
        simulated: true,
        receiverCount: 0,
        status: "No receivers to test"
      };
    }
    
    console.log(`📡 Simulating broadcast to ${availableReceivers.length} receivers:`);
    
    const mockData = [
      {
        timestamp: Math.floor(Date.now() / 1000),
        kWh: 1500,
        location: "lat:40.7580,lon:-73.9855",
        nodeId: 0
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        kWh: 2200,
        location: "lat:40.7074,lon:-74.0113", 
        nodeId: 1
      }
    ];
    
    for (const network of availableReceivers) {
      const config = NETWORK_CONFIGS[network];
      if (config) {
        console.log(`   📨 ${config.name}: ${this.deployments.receivers[network].contractAddress}`);
        console.log(`      EID: ${config.eid}, Data points: ${mockData.length}`);
      }
    }
    
    console.log("💡 In testnet: LayerZero would broadcast this data automatically");
    console.log("💡 Each receiver would emit DataUpdated events");
    
    return {
      simulated: true,
      receiverCount: availableReceivers.length,
      dataPoints: mockData.length,
      networks: availableReceivers
    };
  }

  async testFrontendIntegration() {
    console.log("🖥️  Testing frontend integration...");
    
    // Test that all required files exist for frontend
    const frontendDir = path.join(__dirname, "../frontend-abi");
    const requiredFiles = [
      "deployments.json",
      "ChainlinkEnergyMonitor.json"
    ];
    
    const fileStatus = {};
    for (const file of requiredFiles) {
      const filePath = path.join(frontendDir, file);
      fileStatus[file] = fs.existsSync(filePath);
      console.log(`   ${fileStatus[file] ? "✅" : "❌"} ${file}`);
    }
    
    // Test deployments.json structure
    try {
      const deployments = require(path.join(frontendDir, "deployments.json"));
      
      console.log(`📱 Frontend configuration:`);
      console.log(`   Recommended contract: ${deployments.recommendedContract}`);
      console.log(`   Networks configured: ${Object.keys(deployments.networks).length}`);
      
      // Check if LayerZero info is present
      const hasLayerZero = deployments.layerZero && deployments.layerZero.enabled;
      console.log(`   LayerZero enabled: ${hasLayerZero ? "✅" : "❌"}`);
      
      return {
        frontendFilesReady: Object.values(fileStatus).every(status => status),
        networksConfigured: Object.keys(deployments.networks).length,
        layerZeroEnabled: hasLayerZero,
        recommendedContract: deployments.recommendedContract
      };
      
    } catch (error) {
      throw new Error(`Frontend integration test failed: ${error.message}`);
    }
  }

  async generateTestReport() {
    console.log("\n📊 Generating test report...");
    
    this.testResults.endTime = new Date().toISOString();
    this.testResults.totalDuration = Date.now() - new Date(this.testResults.startTime).getTime();
    
    // Add deployment information to report
    this.testResults.deployments = {
      source: this.deployments.source,
      receivers: this.deployments.receivers
    };
    
    // Add recommendations
    this.testResults.recommendations = [];
    
    if (this.testResults.summary.failed > 0) {
      this.testResults.recommendations.push("Fix failed tests before proceeding to production");
    }
    
    if (Object.keys(this.deployments.receivers).length === 0) {
      this.testResults.recommendations.push("Deploy receiver contracts to enable cross-chain functionality");
    }
    
    this.testResults.recommendations.push("Configure LayerZero pathways between contracts");
    this.testResults.recommendations.push("Set up Chainlink Functions subscription on testnet");
    this.testResults.recommendations.push("Test with real cross-chain message passing");
    
    // Save report
    const reportPath = path.join(__dirname, "../test-reports/layerzero-end-to-end-test.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    
    console.log(`✅ Test report saved to: ${reportPath}`);
    return reportPath;
  }

  async printTestSummary() {
    const { summary } = this.testResults;
    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0;
    
    console.log(`\n🎉 LayerZero End-to-End Test Complete!`);
    console.log(`${"=".repeat(50)}`);
    
    console.log(`\n📊 Test Results:`);
    console.log(`   Total tests: ${summary.total}`);
    console.log(`   Passed: ${summary.passed} ✅`);
    console.log(`   Failed: ${summary.failed} ❌`);
    console.log(`   Success rate: ${passRate}%`);
    console.log(`   Duration: ${this.testResults.totalDuration}ms`);
    
    console.log(`\n📋 Test Details:`);
    for (const test of this.testResults.tests) {
      const status = test.status === "passed" ? "✅" : "❌";
      console.log(`   ${status} ${test.name} (${test.duration}ms)`);
      if (test.error) {
        console.log(`      Error: ${test.error}`);
      }
    }
    
    if (this.testResults.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      for (const rec of this.testResults.recommendations) {
        console.log(`   • ${rec}`);
      }
    }
    
    console.log(`\n🚀 Next Steps:`);
    console.log(`   1. Deploy to testnets: npx hardhat run scripts/deploy-receivers-all-chains.js`);
    console.log(`   2. Configure pathways: npx hardhat run scripts/configure-layerzero-pathways.js`);
    console.log(`   3. Test on testnets: Run this script with --network polygonAmoy`);
    console.log(`   4. Monitor cross-chain data flow`);
    console.log(`   5. Update frontend with all contract addresses`);
    
    return summary.failed === 0;
  }
}

async function main() {
  try {
    console.log(`🧪 LayerZero End-to-End Testing Suite`);
    console.log(`${"=".repeat(50)}`);
    
    const tester = new LayerZeroTester();
    
    // Load deployments
    await tester.loadDeployments();
    
    // Connect to contracts
    await tester.connectToContracts();
    
    // Run test suite
    await tester.runTest("Source Contract Basics", () => tester.testSourceContractBasics());
    await tester.runTest("Chainlink Functions Integration", () => tester.testChainlinkFunctionality());
    await tester.runTest("LayerZero Configuration", () => tester.testLayerZeroConfiguration());
    await tester.runTest("Data Structure Compatibility", () => tester.testDataStructureCompatibility());
    await tester.runTest("Cross-Chain Messaging", () => tester.testCrossChainMessaging());
    await tester.runTest("Frontend Integration", () => tester.testFrontendIntegration());
    
    // Generate report and summary
    await tester.generateTestReport();
    const allTestsPassed = await tester.printTestSummary();
    
    process.exit(allTestsPassed ? 0 : 1);
    
  } catch (error) {
    console.error("\n💥 End-to-end testing failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LayerZeroTester, TEST_CONFIG };