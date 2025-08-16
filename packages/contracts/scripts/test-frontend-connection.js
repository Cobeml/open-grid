const { ethers } = require("ethers");

async function main() {
  console.log("🧪 Testing frontend contract connections...");

  const contracts = [
    {
      name: "Polygon Amoy",
      chainId: 80002,
      rpcUrl: "https://rpc-amoy.polygon.technology",
      contractAddress: "0x0CFDdd3EC6c6633A09ADB0a93eeEf8E626335aae"
    },
    {
      name: "Flow Testnet",
      chainId: 545,
      rpcUrl: "https://access-testnet.onflow.org",
      contractAddress: "0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2"
    }
  ];

  const abi = [
    {
      "name": "getAllNodes",
      "type": "function",
      "stateMutability": "view",
      "inputs": [],
      "outputs": [{ 
        "name": "", 
        "type": "tuple[]",
        "components": [
          { "name": "location", "type": "string" },
          { "name": "active", "type": "bool" },
          { "name": "registeredAt", "type": "uint256" },
          { "name": "lastUpdate", "type": "uint256" }
        ]
      }]
    }
  ];

  for (const contract of contracts) {
    try {
      console.log(`\n🔍 Testing ${contract.name}...`);
      console.log(`📍 RPC: ${contract.rpcUrl}`);
      console.log(`📄 Contract: ${contract.contractAddress}`);

      // Create provider
      const provider = new ethers.JsonRpcProvider(contract.rpcUrl);
      
      // Test connection
      const network = await provider.getNetwork();
      console.log(`✅ Connected to ${network.name} (Chain ID: ${network.chainId})`);

      // Create contract instance
      const contractInstance = new ethers.Contract(contract.contractAddress, abi, provider);
      
      // Read nodes
      const nodes = await contractInstance.getAllNodes();
      console.log(`✅ Found ${nodes.length} nodes`);
      
      if (nodes.length > 0) {
        const activeNodes = nodes.filter(node => node.active);
        console.log(`✅ Active nodes: ${activeNodes.length}`);
        console.log(`📊 First node: ${JSON.stringify(nodes[0], null, 2)}`);
      }

    } catch (error) {
      console.error(`❌ Error testing ${contract.name}:`, error.message);
    }
  }

  console.log("\n🎉 Frontend connection test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
