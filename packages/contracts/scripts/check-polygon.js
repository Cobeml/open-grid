const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Polygon Amoy contract...");
  
  const contractAddress = "0x0CFDdd3EC6c6633A09ADB0a93eeEf8E626335aae";
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

      // Try to get all nodes
      try {
        const allNodes = await contract.getAllNodes();
        console.log(`\n📋 All Nodes: ${allNodes.length}`);
        console.log(`   Active nodes: ${allNodes.filter(n => n.active).length}`);
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
