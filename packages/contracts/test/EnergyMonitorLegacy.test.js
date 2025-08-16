const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyMonitorLegacy", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();

    const EnergyMonitorLegacy = await ethers.getContractFactory("EnergyMonitorLegacy");
    const contract = await EnergyMonitorLegacy.deploy(
      "0x0000000000000000000000000000000000000000", // Mock router
      1, // Mock subscription ID
      300000, // Gas limit
      ethers.id("mock-don-1") // Mock DON ID
    );

    return { contract, owner, other };
  }

  describe("Deployment", function () {
    it("Should deploy successfully with mock Chainlink parameters", async function () {
      const { contract, owner } = await deployFixture();
      
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.nodeCount()).to.equal(0);
      expect(await contract.dataCount()).to.equal(0);
    });
  });

  describe("Node Registration", function () {
    it("Should register a node successfully", async function () {
      const { contract, owner } = await deployFixture();
      
      const location = "lat:40.7128,lon:-74.0060";
      
      await expect(contract.registerNode(location))
        .to.emit(contract, "NodeRegistered")
        .withArgs(0, location);
      
      expect(await contract.nodeCount()).to.equal(1);
      
      const node = await contract.nodes(0);
      expect(node.location).to.equal(location);
      expect(node.active).to.be.true;
    });
  });

  describe("Mock Data Request", function () {
    it("Should emit RequestSent event for mock data request", async function () {
      const { contract, owner } = await deployFixture();
      
      // Register a node first
      await contract.registerNode("lat:40.7128,lon:-74.0060");
      
      // Request data update (mock)
      const mockSource = "return Functions.encodeUint256(0);";
      const mockArgs = ["0", "40.7128", "-74.0060"];
      
      await expect(contract.requestDataUpdate(
        0, // nodeId
        mockSource,
        "0x", // encryptedSecretsUrls
        0, // donHostedSecretsSlotID
        1, // donHostedSecretsVersion
        mockArgs
      )).to.emit(contract, "RequestSent");
    });
  });

  describe("Mock Fulfillment", function () {
    it("Should process mock fulfillment data", async function () {
      const { contract, owner } = await deployFixture();
      
      // Register a node
      await contract.registerNode("lat:40.7128,lon:-74.0060");
      
      // Create mock encoded data: timestamp|kWh|lat|lon|nodeId
      const timestamp = Math.floor(Date.now() / 1000);
      const kWh = 2500; // 2.5 kWh
      const lat = 407128; // 40.7128 * 10000
      const lon = 740060; // 74.0060 * 10000 (positive for legacy contract)
      const nodeId = 0;
      
      const encodedData = (BigInt(timestamp) << 192n) | 
                         (BigInt(kWh) << 128n) | 
                         (BigInt(lat) << 64n) | 
                         (BigInt(lon) << 32n) | 
                         BigInt(nodeId);
      
      const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encodedData]);
      const requestId = ethers.id("mock-request");
      
      // Fulfill the request
      await expect(contract.fulfillRequest(requestId, response, "0x"))
        .to.emit(contract, "DataUpdated")
        .withArgs(0, 0, kWh, "lat:40.7128,lon:74.60", timestamp);
      
      expect(await contract.dataCount()).to.equal(1);
    });
  });

  describe("View Functions", function () {
    it("Should return all nodes", async function () {
      const { contract, owner } = await deployFixture();
      
      // Register multiple nodes
      await contract.registerNode("lat:40.7128,lon:-74.0060");
      await contract.registerNode("lat:40.7589,lon:-73.9851");
      
      const allNodes = await contract.getAllNodes();
      expect(allNodes.length).to.equal(2);
      expect(allNodes[0].location).to.equal("lat:40.7128,lon:-74.0060");
      expect(allNodes[1].location).to.equal("lat:40.7589,lon:-73.9851");
    });
  });
});
