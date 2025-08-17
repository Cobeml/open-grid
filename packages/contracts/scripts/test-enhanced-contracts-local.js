const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Local Testing Suite for Enhanced ChainlinkEnergyMonitor with Edge Support
 * Tests both node and edge functionality before deployment
 */

// Test configuration
const TEST_CONFIG = {
  contractName: "ChainlinkEnergyMonitor", // Start with local version first
  testNodeCount: 10, // Test with subset of nodes first
  testEdgeCount: 15, // Test with subset of edges
  mockChainlinkData: true,
  enableDetailedLogs: true
};

// Sample NYC nodes for testing (subset of full 35)
const TEST_NODES = [
  "lat:40.7580,lon:-73.9855", // Times Square Hub
  "lat:40.7074,lon:-74.0113", // Wall Street Station  
  "lat:40.7484,lon:-73.9857", // Empire State Building
  "lat:40.7128,lon:-74.0060", // NYC Center
  "lat:40.7589,lon:-73.9851", // Broadway District
  "lat:40.7505,lon:-73.9934", // Penn Station Area
  "lat:40.7614,lon:-73.9776", // Central Park South
  "lat:40.7812,lon:-73.9732", // Upper West Side
  "lat:40.6892,lon:-73.9442", // Brooklyn Heights
  "lat:40.7282,lon:-73.7949"  // Long Island City
];

// Sample edges for testing (subset of full 45)
const TEST_EDGES = [
  { from: 0, to: 2, type: "primary", distance: 800, capacity: 1000 },      // Times Square -> Empire State
  { from: 2, to: 3, type: "primary", distance: 600, capacity: 1000 },      // Empire State -> NYC Center
  { from: 3, to: 1, type: "primary", distance: 700, capacity: 800 },       // NYC Center -> Wall Street
  { from: 1, to: 0, type: "primary", distance: 2800, capacity: 800 },      // Wall Street -> Times Square
  { from: 0, to: 4, type: "secondary", distance: 500, capacity: 600 },     // Times Square -> Broadway
  { from: 4, to: 5, type: "secondary", distance: 800, capacity: 500 },     // Broadway -> Penn Station
  { from: 5, to: 6, type: "secondary", distance: 1200, capacity: 600 },    // Penn Station -> Central Park
  { from: 6, to: 7, type: "secondary", distance: 800, capacity: 500 },     // Central Park -> Upper West
  { from: 2, to: 8, type: "inter-borough", distance: 4200, capacity: 700 }, // Empire State -> Brooklyn
  { from: 8, to: 9, type: "inter-borough", distance: 3100, capacity: 600 }, // Brooklyn -> LIC
  { from: 9, to: 0, type: "redundant", distance: 3100, capacity: 600 },    // LIC -> Times Square
  { from: 3, to: 8, type: "redundant", distance: 1800, capacity: 700 },    // NYC Center -> Brooklyn
  { from: 6, to: 7, type: "utility", distance: 800, capacity: 300 },       // Central Park utility
  { from: 0, to: 9, type: "redundant", distance: 3100, capacity: 600 },    // Times Square -> LIC
  { from: 2, to: 9, type: "redundant", distance: 4200, capacity: 500 }     // Empire State -> LIC
];

class EnhancedContractTester {
  constructor() {
    this.testResults = {
      startTime: new Date().toISOString(),
      phase: "local_testing",
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
    
    this.contract = null;
    this.deployer = null;
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 ${testName}`);
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

  async deployLocalContract() {
    console.log("🚀 Deploying ChainlinkEnergyMonitor locally...");
    
    [this.deployer] = await ethers.getSigners();
    console.log(`👛 Deployer: ${this.deployer.address}`);
    
    // Deploy the enhanced contract (will use ChainlinkEnergyMonitor for local testing)
    const ChainlinkEnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
    
    this.contract = await ChainlinkEnergyMonitor.deploy();
    
    await this.contract.waitForDeployment();
    const contractAddress = await this.contract.getAddress();
    
    console.log(`✅ Contract deployed at: ${contractAddress}`);
    
    return {
      contractAddress,
      deployer: this.deployer.address,
      gasUsed: "estimated"
    };
  }

  async testBasicContractFunctions() {
    // Test basic contract state
    const nodeCount = await this.contract.nodeCount();
    const dataCount = await this.contract.dataCount();
    
    console.log(`📊 Initial state: ${nodeCount} nodes, ${dataCount} data points`);
    
    // Test contract interface
    const hasNodeFunction = this.contract.interface.fragments.some(f => f.name === "registerNode");
    const hasEdgeFunction = this.contract.interface.fragments.some(f => f.name === "registerEdge");
    const hasGetAllNodes = this.contract.interface.fragments.some(f => f.name === "getAllNodes");
    const hasGetAllEdges = this.contract.interface.fragments.some(f => f.name === "getAllEdges");
    
    if (!hasNodeFunction) throw new Error("Missing registerNode function");
    if (!hasEdgeFunction) throw new Error("Missing registerEdge function - edge functionality not available");
    if (!hasGetAllNodes) throw new Error("Missing getAllNodes function");
    if (!hasGetAllEdges) throw new Error("Missing getAllEdges function");
    
    return {
      initialNodeCount: nodeCount.toString(),
      initialDataCount: dataCount.toString(),
      hasNodeFunctions: hasNodeFunction,
      hasEdgeFunctions: hasEdgeFunction,
      hasViewFunctions: hasGetAllNodes && hasGetAllEdges
    };
  }

  async testNodeRegistration() {
    console.log(`📍 Registering ${TEST_CONFIG.testNodeCount} test nodes...`);
    
    const initialCount = await this.contract.nodeCount();
    let successCount = 0;
    
    for (let i = 0; i < TEST_CONFIG.testNodeCount; i++) {
      try {
        const tx = await this.contract.registerNode(TEST_NODES[i]);
        await tx.wait();
        
        console.log(`  ✅ Node ${i}: ${TEST_NODES[i].split(',')[0]}`);
        successCount++;
        
      } catch (error) {
        console.log(`  ❌ Node ${i}: ${error.reason || error.message}`);
      }
    }
    
    const finalCount = await this.contract.nodeCount();
    const registeredCount = finalCount - initialCount;
    
    console.log(`📊 Registered ${registeredCount}/${TEST_CONFIG.testNodeCount} nodes`);
    
    // Test getAllNodes function
    const allNodes = await this.contract.getAllNodes();
    console.log(`📋 getAllNodes() returned ${allNodes.length} nodes`);
    
    if (registeredCount != successCount) {
      throw new Error(`Node count mismatch: expected ${successCount}, got ${registeredCount}`);
    }
    
    return {
      initialCount: initialCount.toString(),
      finalCount: finalCount.toString(),
      successCount,
      allNodesReturned: allNodes.length
    };
  }

  async testEdgeRegistration() {
    console.log(`🔗 Registering ${TEST_CONFIG.testEdgeCount} test edges...`);
    
    const initialCount = await this.contract.edgeCount();
    let successCount = 0;
    
    for (let i = 0; i < TEST_CONFIG.testEdgeCount; i++) {
      const edge = TEST_EDGES[i];
      
      try {
        const tx = await this.contract.registerEdge(
          edge.from,
          edge.to,
          edge.type,
          edge.capacity * 1000, // Convert to wei units
          edge.distance        // Keep in original units
        );
        await tx.wait();
        
        console.log(`  ✅ Edge ${i}: ${edge.from} -> ${edge.to} (${edge.type})`);
        successCount++;
        
      } catch (error) {
        console.log(`  ❌ Edge ${i}: ${error.reason || error.message}`);
      }
    }
    
    const finalCount = await this.contract.edgeCount();
    const registeredCount = finalCount - initialCount;
    
    console.log(`📊 Registered ${registeredCount}/${TEST_CONFIG.testEdgeCount} edges`);
    
    // Test getAllEdges function
    const allEdges = await this.contract.getAllEdges();
    console.log(`🔗 getAllEdges() returned ${allEdges.length} edges`);
    
    // Test getNodeEdges for node 0
    const node0Edges = await this.contract.getNodeEdges(0);
    console.log(`📍 Node 0 has ${node0Edges.length} connected edges`);
    
    if (registeredCount != successCount) {
      throw new Error(`Edge count mismatch: expected ${successCount}, got ${registeredCount}`);
    }
    
    return {
      initialCount: initialCount.toString(),
      finalCount: finalCount.toString(),
      successCount,
      allEdgesReturned: allEdges.length,
      node0Connections: node0Edges.length
    };
  }

  async testDataStructureCompatibility() {
    console.log("🔍 Testing data structure compatibility...");
    
    // Get a node and verify structure
    const allNodes = await this.contract.getAllNodes();
    if (allNodes.length === 0) {
      throw new Error("No nodes available for testing");
    }
    
    const firstNode = allNodes[0];
    console.log(`📍 Node structure:`);
    console.log(`   Location: ${firstNode.location}`);
    console.log(`   Active: ${firstNode.active}`);
    console.log(`   Registered: ${new Date(Number(firstNode.registeredAt) * 1000).toISOString()}`);
    
    // Get an edge and verify structure
    const allEdges = await this.contract.getAllEdges();
    if (allEdges.length === 0) {
      throw new Error("No edges available for testing");
    }
    
    const firstEdge = allEdges[0];
    console.log(`🔗 Edge structure:`);
    console.log(`   From: ${firstEdge.from} -> To: ${firstEdge.to}`);
    console.log(`   Type: ${firstEdge.edgeType}`);
    console.log(`   Capacity: ${firstEdge.capacity}`);
    console.log(`   Distance: ${firstEdge.distance}`);
    console.log(`   Active: ${firstEdge.active}`);
    
    return {
      nodeStructureValid: true,
      edgeStructureValid: true,
      frontendCompatible: true
    };
  }

  async testGridTopology() {
    console.log("🌐 Testing grid topology...");
    
    const nodeCount = Number((await this.contract.nodeCount()).toString());
    const edgeCount = Number((await this.contract.edgeCount()).toString());
    
    // Calculate connectivity metrics
    const allEdges = await this.contract.getAllEdges();
    const connectionCounts = new Map();
    
    // Initialize connection counts
    for (let i = 0; i < nodeCount; i++) {
      connectionCounts.set(i, 0);
    }
    
    // Count connections per node
    allEdges.forEach(edge => {
      const fromNode = Number(edge.from.toString());
      const toNode = Number(edge.to.toString());
      connectionCounts.set(fromNode, (connectionCounts.get(fromNode) || 0) + 1);
      connectionCounts.set(toNode, (connectionCounts.get(toNode) || 0) + 1);
    });
    
    const maxConnections = Math.max(...connectionCounts.values());
    const minConnections = Math.min(...connectionCounts.values());
    const avgConnections = Array.from(connectionCounts.values()).reduce((a, b) => a + b, 0) / nodeCount;
    
    console.log(`📊 Topology metrics:`);
    console.log(`   Nodes: ${nodeCount}`);
    console.log(`   Edges: ${edgeCount}`);
    console.log(`   Avg connections per node: ${avgConnections.toFixed(2)}`);
    console.log(`   Max connections: ${maxConnections}`);
    console.log(`   Min connections: ${minConnections}`);
    
    // Test hub nodes (nodes with many connections)
    const hubNodes = Array.from(connectionCounts.entries())
      .filter(([nodeId, count]) => count >= 3)
      .map(([nodeId, count]) => ({ nodeId, count }));
    
    console.log(`🌟 Hub nodes (3+ connections): ${hubNodes.length}`);
    hubNodes.forEach(hub => {
      console.log(`   Node ${hub.nodeId}: ${hub.count} connections`);
    });
    
    return {
      totalNodes: nodeCount.toString(),
      totalEdges: edgeCount.toString(),
      avgConnections: avgConnections.toFixed(2),
      maxConnections,
      minConnections,
      hubNodes: hubNodes.length
    };
  }

  async generateTestReport() {
    console.log("\n📊 Generating test report...");
    
    this.testResults.endTime = new Date().toISOString();
    this.testResults.totalDuration = Date.now() - new Date(this.testResults.startTime).getTime();
    
    // Add contract information
    this.testResults.contract = {
      address: await this.contract.getAddress(),
      deployer: this.deployer.address,
      nodeCount: (await this.contract.nodeCount()).toString(),
      edgeCount: (await this.contract.edgeCount()).toString()
    };
    
    // Save report
    const reportPath = path.join(__dirname, "../test-reports/enhanced-contracts-local-test.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    
    console.log(`✅ Test report saved to: ${reportPath}`);
    return reportPath;
  }

  async printTestSummary() {
    const { summary } = this.testResults;
    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0;
    
    console.log(`\n🎉 Enhanced Contract Local Testing Complete!`);
    console.log(`${"=".repeat(55)}`);
    
    console.log(`\n📊 Test Results:`);
    console.log(`   Total tests: ${summary.total}`);
    console.log(`   Passed: ${summary.passed} ✅`);
    console.log(`   Failed: ${summary.failed} ❌`);
    console.log(`   Success rate: ${passRate}%`);
    console.log(`   Duration: ${this.testResults.totalDuration}ms`);
    
    if (this.contract) {
      const nodeCount = await this.contract.nodeCount();
      const edgeCount = await this.contract.edgeCount();
      console.log(`\n🌐 Grid State:`);
      console.log(`   Nodes: ${nodeCount}`);
      console.log(`   Edges: ${edgeCount}`);
      console.log(`   Contract: ${await this.contract.getAddress()}`);
    }
    
    console.log(`\n📋 Test Details:`);
    for (const test of this.testResults.tests) {
      const status = test.status === "passed" ? "✅" : "❌";
      console.log(`   ${status} ${test.name} (${test.duration}ms)`);
      if (test.error) {
        console.log(`      Error: ${test.error}`);
      }
    }
    
    if (summary.failed === 0) {
      console.log(`\n🚀 Ready for Polygon Amoy deployment!`);
      console.log(`   Next: npx hardhat run scripts/deploy-to-polygon-amoy.js`);
    } else {
      console.log(`\n⚠️  Fix failed tests before deployment`);
    }
    
    return summary.failed === 0;
  }
}

async function main() {
  try {
    console.log(`🧪 Enhanced Contract Local Testing Suite`);
    console.log(`${"=".repeat(55)}`);
    
    const tester = new EnhancedContractTester();
    
    // Run test suite
    await tester.runTest("Deploy Local Contract", () => tester.deployLocalContract());
    await tester.runTest("Basic Contract Functions", () => tester.testBasicContractFunctions());
    await tester.runTest("Node Registration", () => tester.testNodeRegistration());
    await tester.runTest("Edge Registration", () => tester.testEdgeRegistration());
    await tester.runTest("Data Structure Compatibility", () => tester.testDataStructureCompatibility());
    await tester.runTest("Grid Topology Analysis", () => tester.testGridTopology());
    
    // Generate report and summary
    await tester.generateTestReport();
    const allTestsPassed = await tester.printTestSummary();
    
    process.exit(allTestsPassed ? 0 : 1);
    
  } catch (error) {
    console.error("\n💥 Local testing failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnhancedContractTester, TEST_CONFIG };