const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Flow contract...");
  
  const contractAddress = process.argv[2] || "0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2";
  console.log(`📍 Contract: ${contractAddress}`);

  // Get the contract
  const EnergyMonitorLegacy = await ethers.getContractFactory("EnergyMonitorLegacy");
  const contract = EnergyMonitorLegacy.attach(contractAddress);

  try {
    // Check basic info
    const nodeCount = await contract.nodeCount();
    const dataCount = await contract.dataCount();
    const owner = await contract.owner();

    console.log(`\n📊 Contract Status:`);
    console.log(`   👑 Owner: ${owner}`);
    console.log(`   📍 Nodes: ${nodeCount}`);
    console.log(`   📈 Data Points: ${dataCount}`);

    // Check if there are any nodes
    if (nodeCount > 0) {
      console.log(`\n🏢 Registered Nodes:`);
      for (let i = 0; i < Math.min(Number(nodeCount), 5); i++) {
        const node = await contract.nodes(i);
        console.log(`   Node ${i}: ${node.location} (Active: ${node.active})`);
      }

      // Try to get active nodes
      try {
        const activeNodes = await contract.getActiveNodes();
        console.log(`\n✅ Active Nodes: ${activeNodes.length}`);
        console.log(`   IDs: [${activeNodes.join(", ")}]`);
      } catch (error) {
        console.log(`\n❌ Error getting active nodes: ${error.message}`);
      }

      // Try to get all nodes
      try {
        const allNodes = await contract.getAllNodes();
        console.log(`\n📋 All Nodes: ${allNodes.length}`);
      } catch (error) {
        console.log(`\n❌ Error getting all nodes: ${error.message}`);
      }
    } else {
      console.log(`\n❌ No nodes registered yet`);
    }

  } catch (error) {
    console.error(`❌ Error checking contract: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
