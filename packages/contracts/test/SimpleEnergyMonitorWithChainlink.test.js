const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper to build encoded response matching contract decoding logic:
// Bits: [ timestamp:>=144 | kWh:80..143 | lat:48..79 | lon:16..47 | quality:8..15 | nodeId:0..7 ]
function buildEncodedResponse({ timestamp, kWh, latFixed, lonFixed, nodeId, quality }) {
  const bn = (x) => BigInt(x);
  return (
    (bn(timestamp) << 144n) |
    (bn(kWh) << 80n) |
    (bn(latFixed) << 48n) |
    (bn(lonFixed) << 16n) |
    (bn(quality) << 8n) |
    bn(nodeId)
  );
}

describe("SimpleEnergyMonitorWithChainlink", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();

    const Router = await ethers.getContractFactory("MockFunctionsRouter");
    const router = await Router.deploy();

    const source = "// inline JS not used in unit tests";
    const donId = ethers.id("test-don");
    const subscriptionId = 1;

    const Contract = await ethers.getContractFactory("SimpleEnergyMonitorWithChainlink");
    const contract = await Contract.deploy(
      await router.getAddress(),
      donId,
      subscriptionId,
      source
    );

    return { owner, other, router, contract, donId, subscriptionId };
  }

  it("deploys and initializes", async function () {
    const { contract } = await deployFixture();
    expect(await contract.getAddress()).to.properAddress;
  });

  it("registers a node and emits event", async function () {
    const { contract, owner } = await deployFixture();
    const tx = await contract.connect(owner).registerNode("lat:40.7128,lon:-74.0060", "Times Sq");
    await expect(tx).to.emit(contract, "NodeRegistered").withArgs(0, "lat:40.7128,lon:-74.0060", "Times Sq");
    expect(await contract.nodeCount()).to.equal(1);
  });

  it("sends request via router and can be fulfilled", async function () {
    const { contract, router, owner } = await deployFixture();

    await contract.connect(owner).registerNode("lat:40.7128,lon:-74.0060", "Times Sq");

    const reqTx = await contract.connect(owner).requestEnergyData(0);
    const receipt = await reqTx.wait();
    const reqEvt = receipt.logs.find(
      (l) => l.fragment && l.fragment.name === "RequestSent" && l.fragment.inputs.length === 2
    );
    expect(reqEvt).to.not.be.undefined;
    const requestId = reqEvt.args[0];

    // Build a realistic response
    const now = Math.floor(Date.now() / 1000);
    const encoded = buildEncodedResponse({
      timestamp: now,
      kWh: 2500,
      latFixed: 40712800, // 40.712800 with 6 decimals
      lonFixed: 74006000, // 74.006000 with 6 decimals (contract adds '-' in string)
      nodeId: 0,
      quality: 97,
    });
    const response = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [encoded]);

    const fulfillTx = await router.fulfillRequestDirect(requestId, response, "0x");
    await expect(fulfillTx)
      .to.emit(contract, "DataUpdated")
      .withArgs(0, 0, 2500, "lat:40.712800,lon:-74.006000", now, 97);

    const stats = await contract.getChainlinkStats();
    expect(stats.successful).to.equal(1n);
    expect(stats.total).to.equal(1n);
  });

  it("emits failure on err payload", async function () {
    const { contract, router, owner } = await deployFixture();
    await contract.connect(owner).registerNode("lat:40.7128,lon:-74.0060", "Times Sq");

    const req = await contract.connect(owner).requestEnergyData(0);
    const rcp = await req.wait();
    const reqEvt = rcp.logs.find(
      (l) => l.fragment && l.fragment.name === "RequestSent" && l.fragment.inputs.length === 2
    );
    const requestId = reqEvt.args[0];

    const errBytes = ethers.toUtf8Bytes("rate limit");
    const tx = await router.fulfillRequestDirect(requestId, "0x", ethers.hexlify(errBytes));
    await expect(tx).to.emit(contract, "RequestFailed");

    const stats = await contract.getChainlinkStats();
    expect(stats.failed).to.equal(1n);
  });

  it("reverts on empty response", async function () {
    const { contract, router, owner } = await deployFixture();
    await contract.connect(owner).registerNode("lat:40.7128,lon:-74.0060", "Times Sq");

    const req = await contract.connect(owner).requestEnergyData(0);
    const rcp = await req.wait();
    const reqEvt = rcp.logs.find(
      (l) => l.fragment && l.fragment.name === "RequestSent" && l.fragment.inputs.length === 2
    );
    const requestId = reqEvt.args[0];

    await expect(router.fulfillRequestDirect(requestId, "0x", "0x")).to.be.revertedWithCustomError(
      contract,
      "EmptyResponse"
    );
  });
});


