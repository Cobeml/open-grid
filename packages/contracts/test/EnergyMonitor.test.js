const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyMonitor Contract", function () {
  let energyMonitor;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    
    // Deploy EnergyMonitor contract
    const EnergyMonitor = await ethers.getContractFactory("EnergyMonitor");
    energyMonitor = await EnergyMonitor.deploy(
      owner.address, // mock router address
      1, // subscriptionId
      300000, // gasLimit  
      ethers.id("test-don-id") // donId
    );
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await energyMonitor.getAddress()).to.properAddress;
      expect(await energyMonitor.owner()).to.equal(owner.address);
    });
    
    it("Should initialize with correct parameters", async function () {
      expect(await energyMonitor.subscriptionId()).to.equal(1);
      expect(await energyMonitor.gasLimit()).to.equal(300000);
      expect(await energyMonitor.nodeCount()).to.equal(0);
      expect(await energyMonitor.dataCount()).to.equal(0);
    });
  });

  describe("Node Management", function () {
    it("Should register a new node", async function () {
      const location = "lat:40.7128,lon:-74.0060";
      const tx = await energyMonitor.connect(owner).registerNode(location);
      
      await expect(tx)
        .to.emit(energyMonitor, "NodeRegistered")
        .withArgs(0, location);

      const node = await energyMonitor.nodes(0);
      expect(node.location).to.equal(location);
      expect(node.active).to.be.true;
      expect(node.registeredAt).to.be.greaterThan(0);
    });
    
    it("Should register multiple nodes", async function () {
      const locations = [
        "lat:40.7128,lon:-74.0060", // NYC
        "lat:34.0522,lon:-118.2437", // LA
        "lat:41.8781,lon:-87.6298", // Chicago
      ];
      
      for (let i = 0; i < locations.length; i++) {
        await energyMonitor.connect(owner).registerNode(locations[i]);
      }
      
      expect(await energyMonitor.nodeCount()).to.equal(locations.length);
      
      const allNodes = await energyMonitor.getAllNodes();
      expect(allNodes.length).to.equal(locations.length);
      expect(allNodes[0].location).to.equal(locations[0]);
    });
    
    it("Should deactivate and reactivate nodes", async function () {
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
      await expect(
        energyMonitor.connect(user1).registerNode("lat:40.7128,lon:-74.0060")
      ).to.be.revertedWithCustomError(energyMonitor, "OwnableUnauthorizedAccount");
      
      await expect(
        energyMonitor.connect(user1).deactivateNode(0)
      ).to.be.revertedWithCustomError(energyMonitor, "OwnableUnauthorizedAccount");
    });
  });

  describe("Data Management", function () {
    beforeEach(async function () {
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
    });
    
    it("Should handle data update requests", async function () {
      const tx = await energyMonitor.connect(owner).requestDataUpdate(
        0, // nodeId
        "mock source code",
        "0x", // encrypted secrets
        0, // donHostedSecretsSlotID
        0, // donHostedSecretsVersion
        ["arg1", "arg2"] // args
      );
      
      await expect(tx).to.emit(energyMonitor, "RequestSent");
    });
    
    it("Should process mock fulfillment", async function () {
      // Mock data encoding: timestamp(64) | kWh(64) | lat(64) | lon(32) | nodeId(32)
      const kWh = 2500;
      const timestamp = Math.floor(Date.now() / 1000);
      const latitude = 40.7128;
      const longitude = -74.0060;
      const nodeId = 0;
      
      // Encode using bit shifting (handle negative coordinates)
      const latFixed = Math.floor(Math.abs(latitude) * 10000);
      const lonFixed = Math.floor(Math.abs(longitude) * 10000);
      
      const encoded = (BigInt(timestamp) << 192n) | 
                     (BigInt(kWh) << 128n) | 
                     (BigInt(latFixed) << 64n) | 
                     (BigInt(lonFixed) << 32n) | 
                     BigInt(nodeId);
      
      const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);
      const requestId = ethers.id("test_request_1");
      
      // Simulate fulfillment
      const fulfillTx = await energyMonitor.fulfillRequest(
        requestId,
        response,
        "0x" // no error
      );
      
      await expect(fulfillTx)
        .to.emit(energyMonitor, "DataUpdated");
      
      expect(await energyMonitor.dataCount()).to.equal(1);
      
      const dataPoint = await energyMonitor.dataPoints(0);
      expect(dataPoint.kWh).to.equal(kWh);
      expect(dataPoint.nodeId).to.equal(nodeId);
      expect(dataPoint.timestamp).to.equal(timestamp);
    });
    
    it("Should handle empty responses", async function () {
      const requestId = ethers.id("empty_response_test");
      
      await expect(
        energyMonitor.fulfillRequest(requestId, "0x", "0x")
      ).to.be.revertedWithCustomError(energyMonitor, "EmptyResponse");
    });
    
    it("Should handle error responses", async function () {
      const errorMessage = "API rate limit exceeded";
      const errorBytes = ethers.toUtf8Bytes(errorMessage);
      const requestId = ethers.id("error_response_test");
      
      const tx = await energyMonitor.fulfillRequest(
        requestId,
        "0x",
        ethers.hexlify(errorBytes)
      );
      
      await expect(tx)
        .to.emit(energyMonitor, "RequestFailed")
        .withArgs(requestId, errorMessage);
    });
  });

  describe("Data Queries", function () {
    beforeEach(async function () {
      await energyMonitor.connect(owner).registerNode("lat:40.7128,lon:-74.0060");
      
      // Add some test data
      const testData = [
        { kWh: 1500, timestamp: 1700000000 },
        { kWh: 2000, timestamp: 1700003600 }, // +1 hour
        { kWh: 2500, timestamp: 1700007200 }, // +2 hours
      ];
      
      for (let i = 0; i < testData.length; i++) {
        const { kWh, timestamp } = testData[i];
        const encoded = (BigInt(timestamp) << 192n) | (BigInt(kWh) << 128n) | BigInt(0);
        const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);
        
        await energyMonitor.fulfillRequest(
          ethers.id(`test_${i}`),
          response,
          "0x"
        );
      }
    });
    
    it("Should get latest data for node", async function () {
      const latestData = await energyMonitor.getLatestDataForNode(0);
      expect(latestData.kWh).to.equal(2500); // Last added data
    });
    
    it("Should get data in time range", async function () {
      const fromTime = 1700000000;
      const toTime = 1700010000;
      
      const rangeData = await energyMonitor.getDataInTimeRange(0, fromTime, toTime);
      expect(rangeData.length).to.equal(3);
      
      // Verify chronological order
      for (let i = 1; i < rangeData.length; i++) {
        expect(rangeData[i].timestamp).to.be.greaterThan(rangeData[i-1].timestamp);
      }
    });
    
    it("Should handle non-existent nodes", async function () {
      await expect(
        energyMonitor.getLatestDataForNode(999)
      ).to.be.revertedWithCustomError(energyMonitor, "NodeNotFound");
    });
  });
});