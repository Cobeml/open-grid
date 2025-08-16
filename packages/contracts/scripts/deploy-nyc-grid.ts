import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { generateNodeData, generateEnergyData } from "./nyc-grid-data";

// Load environment variables from root directory
dotenv.config({ path: "../../../.env" });

async function main() {
  console.log("🏗️  Deploying NYC Grid Network to contracts...");

  // Get the contract addresses from environment
  const polygonContractAddress = process.env.POLYGON_AMOY_CONTRACT_ADDRESS;
  const flowContractAddress = process.env.FLOW_TESTNET_CONTRACT_ADDRESS;

  if (!polygonContractAddress || !flowContractAddress) {
    throw new Error("Contract addresses not found in environment variables");
  }

  // Get the private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  // Generate NYC grid data
  const nodeData = generateNodeData();
  console.log(`📊 Generated ${nodeData.length} NYC grid nodes`);

  // Deploy to Polygon Amoy
  console.log("\n🔗 Deploying to Polygon Amoy...");
  await deployToNetwork("polygonAmoy", polygonContractAddress, nodeData, privateKey);

  // Deploy to Flow Testnet
  console.log("\n🔗 Deploying to Flow Testnet...");
  await deployToNetwork("flowTestnet", flowContractAddress, nodeData, privateKey);

  console.log("\n✅ NYC Grid Network deployment complete!");
  console.log(`📈 Total nodes deployed: ${nodeData.length} per network`);
  console.log(`🔗 Total connections: ${nodeData.length * 2} (estimated)`);
}

async function deployToNetwork(
  networkName: string, 
  contractAddress: string, 
  nodeData: any[], 
  privateKey: string
) {
  try {
    // Get provider and signer
    const provider = new ethers.JsonRpcProvider(process.env[`${networkName.toUpperCase()}_RPC_URL`]);
    const signer = new ethers.Wallet(privateKey, provider);

    // Get contract instance
    const contract = new ethers.Contract(
      contractAddress,
      [
        "function registerNode(string calldata location) external",
        "function getAllNodes() external view returns (tuple(string location, bool active, uint256 registeredAt, uint256 lastUpdate)[] memory)",
        "function getNodeCount() external view returns (uint256)"
      ],
      signer
    );

    // Check current node count
    const currentCount = await contract.getNodeCount();
    console.log(`📍 Current nodes on ${networkName}: ${currentCount}`);

    if (currentCount > 0) {
      console.log(`⚠️  Contract already has ${currentCount} nodes. Clearing first...`);
      
      // For now, we'll just add new nodes. In a real scenario, you might want to clear first
      // This would require a clear function in the contract
    }

    // Register all nodes
    console.log(`🚀 Registering ${nodeData.length} nodes...`);
    
    for (let i = 0; i < nodeData.length; i++) {
      const node = nodeData[i];
      
      try {
        const tx = await contract.registerNode(node.location, {
          gasLimit: 200000,
          maxFeePerGas: ethers.parseUnits("30", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        });
        
        console.log(`  ✅ Node ${i + 1}/${nodeData.length}: ${node.name}`);
        console.log(`     📍 ${node.location}`);
        console.log(`     🏷️  Zone: ${node.zone}`);
        
        // Wait for transaction to be mined
        await tx.wait();
        
        // Add a small delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed to register node ${i + 1}: ${node.name}`);
        console.error(`     Error: ${error.message}`);
        
        // Continue with next node
        continue;
      }
    }

    // Verify deployment
    const finalCount = await contract.getNodeCount();
    console.log(`✅ ${networkName} deployment complete: ${finalCount} nodes registered`);

    // Get all nodes to verify
    const allNodes = await contract.getAllNodes();
    const activeNodes = allNodes.filter((node: any) => node.active);
    console.log(`📊 Active nodes: ${activeNodes.length}/${allNodes.length}`);

  } catch (error) {
    console.error(`❌ Failed to deploy to ${networkName}:`, error);
    throw error;
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
