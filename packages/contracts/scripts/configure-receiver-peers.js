const { ethers } = require("hardhat");

/**
 * Configure LayerZero Receiver Peer Relationships on Base Sepolia
 */

const DEPLOYMENT_ADDRESSES = {
  polygonAmoy: {
    sender: "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29",
    eid: 40267
  },
  baseSepolia: {
    receiver: "0xb1C74a3EdFDCfae600e9d11a3389197366f4005e",
    eid: 40245
  }
};

async function main() {
  try {
    console.log(`🔵 Configuring Base Sepolia Receiver`);
    console.log(`${"=".repeat(45)}`);
    
    const [signer] = await ethers.getSigners();
    console.log(`👛 Account: ${signer.address}`);
    
    const receiver = await ethers.getContractAt(
      "EnergyDataReceiverBaseSepolia",
      DEPLOYMENT_ADDRESSES.baseSepolia.receiver
    );
    
    console.log(`📍 Receiver: ${DEPLOYMENT_ADDRESSES.baseSepolia.receiver}`);
    
    // Configure source contract
    console.log(`\\n🎯 Setting source contract address...`);
    const setSourceTx = await receiver.configureSourceContract(
      DEPLOYMENT_ADDRESSES.polygonAmoy.sender,
      { gasPrice: "1000000000" }
    );
    await setSourceTx.wait();
    console.log(`✅ Source configured: ${DEPLOYMENT_ADDRESSES.polygonAmoy.sender}`);
    
    // Set peer relationship
    console.log(`🌉 Setting peer relationship...`);
    const senderPeerBytes = "0x" + DEPLOYMENT_ADDRESSES.polygonAmoy.sender.slice(2).padStart(64, '0');
    console.log(`   Peer bytes: ${senderPeerBytes}`);
    
    const setPeerTx = await receiver.setPeer(
      DEPLOYMENT_ADDRESSES.polygonAmoy.eid,
      senderPeerBytes,
      { gasPrice: "2000000000", gasLimit: 200000 }
    );
    await setPeerTx.wait();
    console.log(`✅ Peer relationship set for Polygon Amoy (EID: ${DEPLOYMENT_ADDRESSES.polygonAmoy.eid})`);
    
    // Verify receiver configuration
    const stats = await receiver.getStats();
    console.log(`\\n📊 Receiver Status:`);
    console.log(`   Nodes: ${stats[0]}`);
    console.log(`   Edges: ${stats[1]}`);
    console.log(`   Data Points: ${stats[2]}`);
    console.log(`   Total Syncs: ${stats[4]}`);
    console.log(`   Source Contract: ${stats[6]}`);
    
    console.log(`\\n🎉 Base Sepolia receiver configuration complete!`);
    console.log(`\\n🌉 Cross-chain setup is now ready for testing!`);
    
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