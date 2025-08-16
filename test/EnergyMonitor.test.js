const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("EnergyMonitor Contract", function () {
  // Multi-chain configuration for testing
  const CHAIN_CONFIGS = {
    polygon: {
      chainId: 137,
      name: "Polygon",
      router: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
      donId: "0x66756e2d706f6c79676f6e2d6d61696e6e65742d310000000000000000000000"
    },
    arbitrum: {
      chainId: 42161,
      name: "Arbitrum",
      router: "0x97083E831F8F0638855e2A515c90EdCF158DF238",
      donId: "0x66756e2d617262697472756d2d6d61696e6e65742d3100000000000000000000"
    },
    optimism: {
      chainId: 10,
      name: "Optimism", 
      router: "0xC17094E3A1348E5C7544D4fF8A36c28f2C6AAE28",
      donId: "0x66756e2d6f7074696d69736d2d6d61696e6e65742d31000000000000000000"
    },
    base: {
      chainId: 8453,
      name: "Base",
      router: "0xf9B8fc078197181C841c296C876945aaa425B278",
      donId: "0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000"
    },
    avalanche: {
      chainId: 43114,
      name: "Avalanche",
      router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
      donId: "0x66756e2d6176616c616e6368652d6d61696e6e65742d31000000000000000000"
    },
    // Hackathon chains with mock configurations
    zircuit: {
      chainId: 48900,
      name: "Zircuit",
      router: "0x0000000000000000000000000000000000000001", // Mock
      donId: "0x7a69726375697400000000000000000000000000000000000000000000000000"
    },
    flare: {
      chainId: 14,
      name: "Flare",
      router: "0x0000000000000000000000000000000000000002", // Mock
      donId: "0x666c617265000000000000000000000000000000000000000000000000000000"
    },
    hedera: {
      chainId: 295,
      name: "Hedera",
      router: "0x0000000000000000000000000000000000000003", // Mock
      donId: "0x6865646572610000000000000000000000000000000000000000000000000000"
    },
    bnb: {
      chainId: 56,
      name: "BNB Chain",
      router: "0x0000000000000000000000000000000000000004", // Mock
      donId: "0x626e6200000000000000000000000000000000000000000000000000000000000"
    },
    gnosis: {
      chainId: 100,
      name: "Gnosis",
      router: "0x0000000000000000000000000000000000000005", // Mock
      donId: "0x676e6f7369730000000000000000000000000000000000000000000000000000"
    }
  };

  // Mock Chainlink Functions source code
  const CHAINLINK_SOURCE = `
    const nodeId = args[0] ? parseInt(args[0]) : 1;
    const latitude = parseFloat(args[1]) || 40.7128;
    const longitude = parseFloat(args[2]) || -74.0060;
    
    const response = await Functions.makeHttpRequest({
      url: 'https://utilityapi.com/api/v2/intervals',
      headers: { 'Authorization': \`Bearer \${secrets.utilityApiKey}\` },
      params: { meters: secrets[\`meter\${nodeId}\`], limit: 1 }
    });
    
    let kWh, timestamp;
    
    if (response.error) {
      // Fallback to mock data
      kWh = Math.floor(Math.random() * 5000) + 1000;
      timestamp = Math.floor(Date.now() / 1000);
    } else {
      const data = response.data.intervals[0];
      kWh = Math.floor(data.kWh * 1000);
      timestamp = Math.floor(new Date(data.start).getTime() / 1000);
    }
    
    // Encode using bit shifting: timestamp(64) | kWh(64) | lat(64) | lon(32) | nodeId(32)
    const latFixed = Math.floor(latitude * 10000);
    const lonFixed = Math.floor(longitude * 10000);
    
    const encoded = (BigInt(timestamp) << 192n) | 
                   (BigInt(kWh) << 128n) | 
                   (BigInt(latFixed) << 64n) | 
                   (BigInt(lonFixed) << 32n) | 
                   BigInt(nodeId);
    
    return Functions.encodeUint256(encoded);
  `;

  async function deployEnergyMonitorFixture() {
    const [owner, user1, user2, validator] = await ethers.getSigners();
    
    // Deploy mock Chainlink Functions Router
    const MockRouter = await ethers.getContractFactory("MockFunctionsRouter");
    const mockRouter = await MockRouter.deploy();
    
    // Deploy EnergyMonitor contract
    const EnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
    const energyMonitor = await EnergyMonitor.deploy(
      await mockRouter.getAddress(),
      1, // subscriptionId
      300000, // gasLimit  
      CHAIN_CONFIGS.polygon.donId
    );
    
    return { energyMonitor, mockRouter, owner, user1, user2, validator };
  }

  describe("Deployment", function () {
    it("Should deploy on all supported chains", async function () {
      for (const [chainName, config] of Object.entries(CHAIN_CONFIGS)) {
        const MockRouter = await ethers.getContractFactory("MockFunctionsRouter");
        const mockRouter = await MockRouter.deploy();
        
        const EnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
        const energyMonitor = await EnergyMonitor.deploy(
          await mockRouter.getAddress(),
          1,
          300000,
          config.donId
        );
        
        expect(await energyMonitor.getAddress()).to.properAddress;
        expect(await energyMonitor.owner()).to.not.equal(ethers.ZeroAddress);
        
        console.log(`    ✅ ${config.name} (${config.chainId}): ${await energyMonitor.getAddress()}`);
      }
    });
    
    it("Should initialize with correct parameters", async function () {
      const { energyMonitor, mockRouter } = await loadFixture(deployEnergyMonitorFixture);
      
      expect(await energyMonitor.s_router()).to.equal(await mockRouter.getAddress());
      expect(await energyMonitor.s_subscriptionId()).to.equal(1);
      expect(await energyMonitor.s_gasLimit()).to.equal(300000);
      expect(await energyMonitor.nodeCount()).to.equal(0);
      expect(await energyMonitor.dataCount()).to.equal(0);
    });
  });

  describe("Node Management", function () {
    it("Should register multiple nodes with realistic locations", async function () {
      const { energyMonitor, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      const locations = [
        "lat:40.7128,lon:-74.0060", // NYC
        "lat:34.0522,lon:-118.2437", // LA
        "lat:41.8781,lon:-87.6298", // Chicago
        "lat:29.7604,lon:-95.3698", // Houston
        "lat:39.7392,lon:-104.9903", // Denver
        "lat:47.6062,lon:-122.3321", // Seattle
      ];
      
      for (let i = 0; i < locations.length; i++) {
        const tx = await energyMonitor.connect(owner).registerNode(locations[i]);
        
        await expect(tx)
          .to.emit(energyMonitor, "NodeRegistered")
          .withArgs(i, locations[i]);
        
        const node = await energyMonitor.nodes(i);
        expect(node.location).to.equal(locations[i]);
        expect(node.active).to.be.true;
        expect(node.registeredAt).to.be.greaterThan(0);
      }
      
      expect(await energyMonitor.nodeCount()).to.equal(locations.length);
      
      const allNodes = await energyMonitor.getAllNodes();
      expect(allNodes.length).to.equal(locations.length);
    });
    
    it("Should handle node activation/deactivation", async function () {
      const { energyMonitor, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      // Deactivate node
      const deactivateTx = await energyMonitor.connect(owner).deactivateNode(0);
      await expect(deactivateTx)
        .to.emit(energyMonitor, "NodeDeactivated")
        .withArgs(0);
      
      let node = await energyMonitor.nodes(0);
      expect(node.active).to.be.false;
      
      // Reactivate node
      const reactivateTx = await energyMonitor.connect(owner).reactivateNode(0);
      await expect(reactivateTx)
        .to.emit(energyMonitor, "NodeReactivated")
        .withArgs(0);
      
      node = await energyMonitor.nodes(0);
      expect(node.active).to.be.true;
    });
    
    it("Should reject unauthorized node operations", async function () {
      const { energyMonitor, user1 } = await loadFixture(deployEnergyMonitorFixture);
      
      await expect(
        energyMonitor.connect(user1).registerNode("lat:40.7128,lon:-74.0060")
      ).to.be.revertedWithCustomError(energyMonitor, "OwnableUnauthorizedAccount");
      
      await expect(
        energyMonitor.connect(user1).deactivateNode(0)
      ).to.be.revertedWithCustomError(energyMonitor, "OwnableUnauthorizedAccount");
    });
  });

  describe("Chainlink Functions Integration", function () {
    it("Should handle data update requests", async function () {
      const { energyMonitor, mockRouter, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      const secrets = "0x" + Buffer.from(JSON.stringify({
        utilityApiKey: "test_key_123",
        meter1: "meter_abc_123"
      })).toString('hex');
      
      const args = ["1", "40.7128", "-74.0060"];
      
      const tx = await energyMonitor.connect(owner).requestDataUpdate(
        0, // nodeId
        CHAINLINK_SOURCE,
        secrets,
        0, // donHostedSecretsSlotID
        0, // donHostedSecretsVersion
        args
      );
      
      const receipt = await tx.wait();
      const requestSentEvent = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "RequestSent"
      );
      
      expect(requestSentEvent).to.not.be.undefined;
      expect(requestSentEvent.args.nodeId).to.equal(0);
    });
    
    it("Should process mock Chainlink fulfillment", async function () {
      const { energyMonitor, mockRouter, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      // Mock Chainlink Functions response
      const kWh = 2500;
      const timestamp = Math.floor(Date.now() / 1000);
      const latitude = 40.7128;
      const longitude = -74.0060;
      const nodeId = 1;
      
      // Encode response using the same bit shifting as the source
      const latFixed = Math.floor(latitude * 10000);
      const lonFixed = Math.floor(longitude * 10000);
      
      const encoded = (BigInt(timestamp) << 192n) | 
                     (BigInt(kWh) << 128n) | 
                     (BigInt(latFixed) << 64n) | 
                     (BigInt(lonFixed) << 32n) | 
                     BigInt(nodeId);
      
      const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);
      const requestId = ethers.id("test_request_1");
      
      // Simulate Chainlink fulfillment
      const fulfillTx = await mockRouter.fulfillRequest(
        await energyMonitor.getAddress(),
        requestId,
        response,
        "0x" // no error
      );
      
      await expect(fulfillTx)
        .to.emit(energyMonitor, "DataUpdated")
        .withArgs(0, 0, kWh, `lat:${latitude},lon:${longitude}`, timestamp);
      
      expect(await energyMonitor.dataCount()).to.equal(1);
      
      const dataPoint = await energyMonitor.dataPoints(0);
      expect(dataPoint.kWh).to.equal(kWh);
      expect(dataPoint.nodeId).to.equal(0);
      expect(dataPoint.timestamp).to.equal(timestamp);
    });
    
    it("Should handle multiple rapid updates efficiently", async function () {
      const { energyMonitor, mockRouter, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      const updates = [
        { kWh: 1500, timestamp: 1700000000 },
        { kWh: 2000, timestamp: 1700003600 },
        { kWh: 2500, timestamp: 1700007200 },
        { kWh: 3000, timestamp: 1700010800 },
        { kWh: 1800, timestamp: 1700014400 }
      ];
      
      for (let i = 0; i < updates.length; i++) {
        const { kWh, timestamp } = updates[i];
        const encoded = (BigInt(timestamp) << 192n) | 
                       (BigInt(kWh) << 128n) | 
                       (BigInt(407128) << 64n) | // lat * 10000
                       (BigInt(-740060) << 32n) | // lon * 10000
                       BigInt(1);
        
        const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);
        const requestId = ethers.id(`test_request_${i}`);
        
        await mockRouter.fulfillRequest(
          await energyMonitor.getAddress(),
          requestId,
          response,
          "0x"
        );
      }
      
      expect(await energyMonitor.dataCount()).to.equal(updates.length);
      
      // Check latest data for node
      const latestData = await energyMonitor.getLatestDataForNode(0);
      expect(latestData.kWh).to.equal(updates[updates.length - 1].kWh);
      
      // Verify data ordering by timestamp
      for (let i = 0; i < updates.length; i++) {
        const dataPoint = await energyMonitor.dataPoints(i);
        expect(dataPoint.timestamp).to.equal(updates[i].timestamp);
      }
    });
  });

  describe("Multi-Chain Compatibility", function () {
    it("Should deploy with chain-specific configurations", async function () {
      const contractsByChain = {};
      
      for (const [chainName, config] of Object.entries(CHAIN_CONFIGS)) {
        const MockRouter = await ethers.getContractFactory("MockFunctionsRouter");
        const mockRouter = await MockRouter.deploy();
        
        const EnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
        const energyMonitor = await EnergyMonitor.deploy(
          await mockRouter.getAddress(),
          1,
          300000,
          config.donId
        );
        
        contractsByChain[chainName] = {
          contract: energyMonitor,
          router: mockRouter,
          config
        };
        
        // Verify chain-specific DON ID
        expect(await energyMonitor.s_donId()).to.equal(config.donId);
      }
      
      // Test cross-chain data consistency
      const testLocation = "lat:40.7128,lon:-74.0060";
      const testKwh = 2500;
      
      for (const [chainName, { contract, router }] of Object.entries(contractsByChain)) {
        const [owner] = await ethers.getSigners();
        
        await contract.connect(owner).registerNode(testLocation);
        
        // Simulate same data on all chains
        const encoded = (BigInt(1700000000) << 192n) | 
                       (BigInt(testKwh) << 128n) | 
                       (BigInt(407128) << 64n) | 
                       (BigInt(-740060) << 32n) | 
                       BigInt(1);
        
        const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);
        const requestId = ethers.id(`cross_chain_test_${chainName}`);
        
        await router.fulfillRequest(
          await contract.getAddress(),
          requestId,
          response,
          "0x"
        );
        
        // Verify data consistency
        const dataPoint = await contract.dataPoints(0);
        expect(dataPoint.kWh).to.equal(testKwh);
        expect(dataPoint.location).to.equal(testLocation);
      }
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle invalid node IDs gracefully", async function () {
      const { energyMonitor } = await loadFixture(deployEnergyMonitorFixture);
      
      await expect(
        energyMonitor.getLatestDataForNode(999)
      ).to.be.revertedWithCustomError(energyMonitor, "NodeNotFound");
      
      await expect(
        energyMonitor.deactivateNode(999)
      ).to.be.revertedWithCustomError(energyMonitor, "NodeNotFound");
    });
    
    it("Should handle empty Chainlink responses", async function () {
      const { energyMonitor, mockRouter, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      const requestId = ethers.id("empty_response_test");
      
      await expect(
        mockRouter.fulfillRequest(
          await energyMonitor.getAddress(),
          requestId,
          "0x",
          "0x"
        )
      ).to.be.revertedWithCustomError(energyMonitor, "EmptyResponse");
    });
    
    it("Should handle Chainlink error responses", async function () {
      const { energyMonitor, mockRouter, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      const errorMessage = "API rate limit exceeded";
      const errorBytes = ethers.toUtf8Bytes(errorMessage);
      const requestId = ethers.id("error_response_test");
      
      const tx = await mockRouter.fulfillRequest(
        await energyMonitor.getAddress(),
        requestId,
        "0x",
        ethers.hexlify(errorBytes)
      );
      
      await expect(tx)
        .to.emit(energyMonitor, "RequestFailed")
        .withArgs(requestId, errorMessage);
    });
  });

  describe("Gas Optimization and Performance", function () {
    it("Should use reasonable gas for operations", async function () {
      const { energyMonitor, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      // Node registration
      const registerTx = await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      const registerReceipt = await registerTx.wait();
      expect(registerReceipt.gasUsed).to.be.below(100000);
      
      // Data request
      const requestTx = await energyMonitor.connect(owner).requestDataUpdate(
        0,
        CHAINLINK_SOURCE,
        "0x",
        0,
        0,
        ["1"]
      );
      const requestReceipt = await requestTx.wait();
      expect(requestReceipt.gasUsed).to.be.below(200000);
    });
    
    it("Should handle batch operations efficiently", async function () {
      const { energyMonitor, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      const locations = Array.from({ length: 10 }, (_, i) => 
        `lat:${40 + i * 0.1},lon:${-74 + i * 0.1}`
      );
      
      const gasUsed = [];
      for (const location of locations) {
        const tx = await energyMonitor.connect(owner).registerNode(location);
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      // Gas usage should remain consistent
      const avgGas = gasUsed.reduce((sum, gas) => sum + gas, 0n) / BigInt(gasUsed.length);
      const maxDeviation = gasUsed.reduce((max, gas) => {
        const deviation = gas > avgGas ? gas - avgGas : avgGas - gas;
        return deviation > max ? deviation : max;
      }, 0n);
      
      expect(maxDeviation).to.be.below(avgGas / 10n); // Less than 10% deviation
    });
  });

  describe("Time-based Operations", function () {
    it("Should handle historical data queries", async function () {
      const { energyMonitor, mockRouter, owner } = await loadFixture(deployEnergyMonitorFixture);
      
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      // Add historical data points
      const historicalData = [
        { kWh: 1500, timestamp: 1700000000 },
        { kWh: 2000, timestamp: 1700086400 }, // +24 hours
        { kWh: 2500, timestamp: 1700172800 }, // +48 hours
      ];
      
      for (let i = 0; i < historicalData.length; i++) {
        const { kWh, timestamp } = historicalData[i];
        const encoded = (BigInt(timestamp) << 192n) | (BigInt(kWh) << 128n);
        const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);
        
        await mockRouter.fulfillRequest(
          await energyMonitor.getAddress(),
          ethers.id(`historical_${i}`),
          response,
          "0x"
        );
      }
      
      // Query data by time range
      const fromTime = 1700000000;
      const toTime = 1700200000;
      
      const rangeData = await energyMonitor.getDataInTimeRange(0, fromTime, toTime);
      expect(rangeData.length).to.equal(3);
      
      // Verify chronological order
      for (let i = 1; i < rangeData.length; i++) {
        expect(rangeData[i].timestamp).to.be.greaterThan(rangeData[i-1].timestamp);
      }
    });
  });
});