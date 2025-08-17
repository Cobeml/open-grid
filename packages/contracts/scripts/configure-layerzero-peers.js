const { ethers } = require("hardhat");

/**
 * Configure LayerZero Peer Relationships
 * Sets up cross-chain communication between deployed contracts
 */

const DEPLOYMENT_ADDRESSES = {
  polygonAmoy: {
    sender: "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29",
    energyMonitor: "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB",
    eid: 40267
  },
  baseSepolia: {
    receiver: "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e",
    eid: 40245
  }
};

async function main() {
  try {
    console.log(`🔗 Configuring LayerZero Cross-Chain Setup`);
    console.log(`${"=".repeat(50)}`);
    
    console.log(`\\n📍 Contract Addresses:`);
    console.log(`   Sender (Polygon Amoy): ${DEPLOYMENT_ADDRESSES.polygonAmoy.sender}`);
    console.log(`   Receiver (Base Sepolia): ${DEPLOYMENT_ADDRESSES.baseSepolia.receiver}`);
    
    // Get signers for both networks
    const [signer] = await ethers.getSigners();
    console.log(`\\n👛 Configuring with account: ${signer.address}`);
    
    // Step 1: Configure sender contract
    console.log(`\\n📤 Configuring sender contract on Polygon Amoy...`);
    
    const sender = await ethers.getContractAt(
      "EnergyDataSenderPolygonAmoy",
      DEPLOYMENT_ADDRESSES.polygonAmoy.sender
    );
    
    // Configure destination
    console.log(`🎯 Setting destination address...`);
    const setDestinationTx = await sender.configureDestination(
      DEPLOYMENT_ADDRESSES.baseSepolia.receiver,
      { gasPrice: "30000000000" }
    );
    await setDestinationTx.wait();
    console.log(`✅ Destination configured: ${DEPLOYMENT_ADDRESSES.baseSepolia.receiver}`);
    
    // Set peer relationship
    console.log(`🌉 Setting peer relationship...`);
    const receiverPeerBytes = "0x" + DEPLOYMENT_ADDRESSES.baseSepolia.receiver.slice(2).padStart(64, '0');
    console.log(`   Peer bytes: ${receiverPeerBytes}`);
    
    const setPeerTx = await sender.setPeer(
      DEPLOYMENT_ADDRESSES.baseSepolia.eid,
      receiverPeerBytes,
      { gasPrice: "30000000000" }
    );
    await setPeerTx.wait();
    console.log(`✅ Peer relationship set for Base Sepolia (EID: ${DEPLOYMENT_ADDRESSES.baseSepolia.eid})`);
    
    // Verify sender configuration
    const isConfigured = await sender.isConfigured();
    const dataSummary = await sender.getDataSummary();
    
    console.log(`\\n📊 Sender Configuration:`);
    console.log(`   Is Configured: ${isConfigured}`);
    console.log(`   Available Nodes: ${dataSummary[0]}`);
    console.log(`   Available Edges: ${dataSummary[1]}`);
    console.log(`   Available Data: ${dataSummary[2]}`);
    console.log(`   New Data Available: ${dataSummary[3]}`);
    
    // Step 2: Configure receiver contract (Base Sepolia)
    console.log(`\\n📥 Switching to Base Sepolia network for receiver configuration...`);
    console.log(`⚠️  Note: This requires manual network switching or separate script execution`);
    
    console.log(`\\n🎉 Polygon Amoy sender configuration complete!`);
    console.log(`\\n📋 Next Steps:`);
    console.log(`1. Configure receiver contract on Base Sepolia:`);
    console.log(`   npx hardhat run scripts/configure-receiver-peers.js --network baseSepolia`);
    console.log(`\\n2. Test cross-chain messaging:`);
    console.log(`   npx hardhat run scripts/test-cross-chain-message.js --network polygonAmoy`);
    
  } catch (error) {
    console.error("\\n💥 Configuration failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });