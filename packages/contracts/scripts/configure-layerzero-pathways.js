const { ethers } = require("hardhat");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

config();

/**
 * Configure LayerZero pathways between source and receiver contracts
 * Sets up trusted remotes and DVN configurations for secure messaging
 */

// Load deployment information
const SOURCE_DEPLOYMENT_PATH = path.join(__dirname, "../deployments/chainlink-oapp-polygon-amoy.json");
const RECEIVERS_SUMMARY_PATH = path.join(__dirname, "../deployments/layerzero-receivers-summary.json");

const LAYERZERO_CONFIGS = {
  polygonAmoy: {
    name: "Polygon Amoy",
    chainId: 80002,
    eid: 40267,
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    dvn: "0x55c175DD5b039331dB251424538169D8495C18d1", // LayerZero DVN
    rpcUrl: "https://rpc-amoy.polygon.technology"
  },
  
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    eid: 40231,
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    dvn: "0x2f55C492897526677C5B68fb199637fcfF648a1b",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc"
  },
  
  sepolia: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    eid: 40161,
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", 
    dvn: "0x8eebf8b423B73bFCa51a1Db4B7354AA0bFCA9193",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY"
  },
  
  optimismSepolia: {
    name: "Optimism Sepolia",
    chainId: 11155420,
    eid: 40232,
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    dvn: "0x55c175DD5b039331dB251424538169D8495C18d1",
    rpcUrl: "https://sepolia.optimism.io"
  },
  
  baseSepolia: {
    name: "Base Sepolia", 
    chainId: 84532,
    eid: 40245,
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    dvn: "0x55c175DD5b039331dB251424538169D8495C18d1",
    rpcUrl: "https://sepolia.base.org"
  }
};

async function loadDeploymentInfo() {
  console.log("📋 Loading deployment information...");
  
  // Load source contract deployment
  let sourceDeployment = null;
  if (fs.existsSync(SOURCE_DEPLOYMENT_PATH)) {
    sourceDeployment = require(SOURCE_DEPLOYMENT_PATH);
    console.log(`✅ Source: ${sourceDeployment.contractAddress} on ${sourceDeployment.network}`);
  } else {
    console.log(`⚠️  Source deployment not found: ${SOURCE_DEPLOYMENT_PATH}`);
  }
  
  // Load receiver deployments
  let receiverDeployments = [];
  if (fs.existsSync(RECEIVERS_SUMMARY_PATH)) {
    const summary = require(RECEIVERS_SUMMARY_PATH);
    receiverDeployments = summary.destinationChains || [];
    console.log(`✅ Receivers: ${receiverDeployments.length} contracts found`);
  } else {
    console.log(`⚠️  Receivers summary not found: ${RECEIVERS_SUMMARY_PATH}`);
    
    // Try to load individual receiver files
    const deploymentDir = path.join(__dirname, "../deployments");
    if (fs.existsSync(deploymentDir)) {
      const files = fs.readdirSync(deploymentDir);
      for (const file of files) {
        if (file.startsWith("receiver-") && file.endsWith(".json")) {
          try {
            const deployment = require(path.join(deploymentDir, file));
            receiverDeployments.push(deployment);
            console.log(`✅ Found receiver: ${file}`);
          } catch (error) {
            console.log(`⚠️  Error loading ${file}: ${error.message}`);
          }
        }
      }
    }
  }
  
  return { sourceDeployment, receiverDeployments };
}

async function getContractInstance(contractAddress, contractName, provider) {
  try {
    let abi;
    
    if (contractName === "ChainlinkEnergyMonitorOApp") {
      const artifact = require("../artifacts/contracts/ChainlinkEnergyMonitorOApp.sol/ChainlinkEnergyMonitorOApp.json");
      abi = artifact.abi;
    } else if (contractName === "EnergyDataReceiver") {
      const artifact = require("../artifacts/contracts/EnergyDataReceiver.sol/EnergyDataReceiver.json");
      abi = artifact.abi;
    } else {
      throw new Error(`Unknown contract type: ${contractName}`);
    }
    
    return new ethers.Contract(contractAddress, abi, provider);
  } catch (error) {
    console.log(`⚠️  Could not load contract ${contractName}: ${error.message}`);
    return null;
  }
}

async function configurePeerConnections(sourceDeployment, receiverDeployments) {
  console.log("\n🔗 Configuring peer connections...");
  console.log(`${"─".repeat(50)}`);
  
  if (!sourceDeployment) {
    console.log("❌ Cannot configure peers: source deployment not found");
    return [];
  }
  
  const configurations = [];
  
  // Configure source contract to trust all receivers
  console.log(`\n📡 Configuring source contract (${sourceDeployment.network}):`);
  
  for (const receiver of receiverDeployments) {
    try {
      const sourceConfig = LAYERZERO_CONFIGS.polygonAmoy;
      const receiverConfig = LAYERZERO_CONFIGS[receiver.network];
      
      if (!receiverConfig) {
        console.log(`⚠️  No LayerZero config for ${receiver.network}`);
        continue;
      }
      
      console.log(`   Setting peer: ${receiverConfig.name} (EID: ${receiverConfig.eid})`);
      
      // For simulation, we'll just log what would happen
      const peerConfig = {
        sourceContract: sourceDeployment.contractAddress,
        sourceEid: sourceConfig.eid,
        receiverContract: receiver.contractAddress,
        receiverEid: receiverConfig.eid,
        receiverNetwork: receiver.network,
        
        // setPeer call details
        setPeerCall: {
          method: "setPeer",
          params: [
            receiverConfig.eid,
            ethers.zeroPadValue(receiver.contractAddress, 32)
          ]
        }
      };
      
      configurations.push(peerConfig);
      console.log(`   ✅ Peer configuration prepared for ${receiverConfig.name}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to configure peer for ${receiver.network}: ${error.message}`);
    }
  }
  
  // Configure each receiver to trust the source
  console.log(`\n📨 Configuring receiver contracts:`);
  
  for (const receiver of receiverDeployments) {
    try {
      const receiverConfig = LAYERZERO_CONFIGS[receiver.network];
      const sourceConfig = LAYERZERO_CONFIGS.polygonAmoy;
      
      if (!receiverConfig) continue;
      
      console.log(`   ${receiverConfig.name}: Setting source peer`);
      
      const reverseConfig = {
        receiverContract: receiver.contractAddress,
        receiverEid: receiverConfig.eid,
        sourceContract: sourceDeployment.contractAddress,
        sourceEid: sourceConfig.eid,
        network: receiver.network,
        
        // setPeer call for receiver
        setPeerCall: {
          method: "setPeer", 
          params: [
            sourceConfig.eid,
            ethers.zeroPadValue(sourceDeployment.contractAddress, 32)
          ]
        },
        
        // configureSource call for receiver
        configureSourceCall: {
          method: "configureSource",
          params: [
            sourceConfig.eid,
            sourceDeployment.contractAddress
          ]
        }
      };
      
      configurations.push(reverseConfig);
      console.log(`   ✅ Reverse peer configuration prepared`);
      
    } catch (error) {
      console.log(`   ❌ Failed to configure reverse peer for ${receiver.network}: ${error.message}`);
    }
  }
  
  return configurations;
}

async function generateExecutionScript(configurations) {
  console.log("\n📝 Generating execution script...");
  
  let scriptContent = `
#!/bin/bash
# LayerZero Pathway Configuration Script
# Generated on ${new Date().toISOString()}

echo "🔗 Configuring LayerZero pathways..."
echo "=================================="

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Function to run hardhat command with error handling
run_command() {
    local description="$1"
    local command="$2"
    
    echo -e "\\n\${YELLOW}$description\${NC}"
    echo "Command: $command"
    
    if eval "$command"; then
        echo -e "\${GREEN}✅ Success: $description\${NC}"
    else
        echo -e "\${RED}❌ Failed: $description\${NC}"
        echo "Continuing with next command..."
    fi
}

`;

  // Add source contract configurations
  scriptContent += `
# Configure source contract (Polygon Amoy)
echo -e "\\n📡 Configuring source contract on Polygon Amoy..."
`;

  const sourceConfigs = configurations.filter(c => c.sourceContract && c.receiverContract);
  for (const config of sourceConfigs) {
    if (config.receiverNetwork) {
      scriptContent += `
run_command "Set peer for ${LAYERZERO_CONFIGS[config.receiverNetwork]?.name || config.receiverNetwork}" \\
  "npx hardhat run --network polygonAmoy scripts/set-peer.js --peer-eid ${config.receiverEid} --peer-address ${config.receiverContract}"
`;
    }
  }

  // Add receiver contract configurations  
  scriptContent += `
# Configure receiver contracts
echo -e "\\n📨 Configuring receiver contracts..."
`;

  const receiverConfigs = configurations.filter(c => c.network && c.configureSourceCall);
  for (const config of receiverConfigs) {
    const networkName = config.network;
    const chainConfig = LAYERZERO_CONFIGS[networkName];
    
    if (chainConfig) {
      scriptContent += `
run_command "Configure ${chainConfig.name} receiver" \\
  "npx hardhat run --network ${networkName} scripts/configure-receiver.js --source-eid ${config.sourceEid} --source-address ${config.sourceContract}"

run_command "Set peer on ${chainConfig.name}" \\
  "npx hardhat run --network ${networkName} scripts/set-peer.js --peer-eid ${config.sourceEid} --peer-address ${config.sourceContract}"
`;
    }
  }

  // Add verification steps
  scriptContent += `
# Verification
echo -e "\\n🧪 Verification steps..."

run_command "Verify source contract peers" \\
  "npx hardhat run --network polygonAmoy scripts/verify-peers.js"

`;

  for (const receiverConfig of receiverConfigs) {
    if (receiverConfig.network) {
      scriptContent += `run_command "Verify ${LAYERZERO_CONFIGS[receiverConfig.network]?.name} receiver" \\
  "npx hardhat run --network ${receiverConfig.network} scripts/verify-receiver.js"

`;
    }
  }

  scriptContent += `
echo -e "\\n🎉 LayerZero pathway configuration complete!"
echo "Next steps:"
echo "1. Test message sending with: npx hardhat run scripts/test-cross-chain-messaging.js"
echo "2. Monitor cross-chain broadcasts"
echo "3. Update frontend with all contract addresses"
`;

  // Save the script
  const scriptPath = path.join(__dirname, "../configure-layerzero.sh");
  fs.writeFileSync(scriptPath, scriptContent);
  
  // Make executable
  try {
    fs.chmodSync(scriptPath, 0o755);
  } catch (error) {
    console.log("⚠️  Could not make script executable:", error.message);
  }
  
  console.log(`✅ Execution script saved to: ${scriptPath}`);
  return scriptPath;
}

async function generateHardhatTasks(configurations) {
  console.log("\n📝 Generating Hardhat task scripts...");
  
  // Create helper scripts directory
  const helpersDir = path.join(__dirname, "helpers");
  fs.mkdirSync(helpersDir, { recursive: true });
  
  // Generate set-peer.js
  const setPeerScript = `
const { ethers } = require("hardhat");

async function main() {
  const peerEid = process.env.PEER_EID || process.argv[2];
  const peerAddress = process.env.PEER_ADDRESS || process.argv[3];
  
  if (!peerEid || !peerAddress) {
    console.error("Usage: npx hardhat run set-peer.js --peer-eid <eid> --peer-address <address>");
    process.exit(1);
  }
  
  const [signer] = await ethers.getSigners();
  console.log(\`Setting peer from: \${signer.address}\`);
  
  // Get contract address from deployments
  const network = hre.network.name;
  let contractAddress;
  
  if (network === "polygonAmoy") {
    const deployment = require("../deployments/chainlink-oapp-polygon-amoy.json");
    contractAddress = deployment.contractAddress;
  } else {
    const deployment = require(\`../deployments/receiver-\${network}.json\`);
    contractAddress = deployment.contractAddress;
  }
  
  console.log(\`Contract: \${contractAddress}\`);
  console.log(\`Setting peer EID \${peerEid} to \${peerAddress}\`);
  
  // Load appropriate ABI
  let abi;
  if (network === "polygonAmoy") {
    const artifact = require("../artifacts/contracts/ChainlinkEnergyMonitorOApp.sol/ChainlinkEnergyMonitorOApp.json");
    abi = artifact.abi;
  } else {
    const artifact = require("../artifacts/contracts/EnergyDataReceiver.sol/EnergyDataReceiver.json");
    abi = artifact.abi;
  }
  
  const contract = new ethers.Contract(contractAddress, abi, signer);
  
  try {
    const peerBytes32 = ethers.zeroPadValue(peerAddress, 32);
    const tx = await contract.setPeer(peerEid, peerBytes32);
    
    console.log(\`Transaction: \${tx.hash}\`);
    await tx.wait();
    console.log("✅ Peer set successfully");
    
  } catch (error) {
    console.error("❌ Failed to set peer:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
`;

  fs.writeFileSync(path.join(helpersDir, "set-peer.js"), setPeerScript);

  // Generate configure-receiver.js
  const configureReceiverScript = `
const { ethers } = require("hardhat");

async function main() {
  const sourceEid = process.env.SOURCE_EID || process.argv[2];
  const sourceAddress = process.env.SOURCE_ADDRESS || process.argv[3];
  
  if (!sourceEid || !sourceAddress) {
    console.error("Usage: npx hardhat run configure-receiver.js --source-eid <eid> --source-address <address>");
    process.exit(1);
  }
  
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;
  
  // Load receiver deployment
  const deployment = require(\`../deployments/receiver-\${network}.json\`);
  const contractAddress = deployment.contractAddress;
  
  console.log(\`Configuring receiver: \${contractAddress}\`);
  console.log(\`Source EID: \${sourceEid}, Source Address: \${sourceAddress}\`);
  
  const artifact = require("../artifacts/contracts/EnergyDataReceiver.sol/EnergyDataReceiver.json");
  const contract = new ethers.Contract(contractAddress, artifact.abi, signer);
  
  try {
    const tx = await contract.configureSource(sourceEid, sourceAddress);
    
    console.log(\`Transaction: \${tx.hash}\`);
    await tx.wait();
    console.log("✅ Source configured successfully");
    
  } catch (error) {
    console.error("❌ Failed to configure source:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
`;

  fs.writeFileSync(path.join(helpersDir, "configure-receiver.js"), configureReceiverScript);
  
  console.log(`✅ Helper scripts saved to: ${helpersDir}/`);
}

async function saveConfigurationPlan(configurations) {
  console.log("\n💾 Saving configuration plan...");
  
  const configPlan = {
    title: "LayerZero Pathway Configuration Plan",
    generatedAt: new Date().toISOString(),
    
    summary: {
      totalConfigurations: configurations.length,
      sourceContract: configurations.find(c => c.sourceContract)?.sourceContract || "TBD",
      receiverContracts: configurations.filter(c => c.receiverContract).length,
      networks: [...new Set(configurations.map(c => c.network || "polygonAmoy"))]
    },
    
    configurations,
    
    executionSteps: [
      "1. Ensure all contracts are deployed on their respective networks",
      "2. Get testnet tokens for transaction fees on all networks", 
      "3. Run the generated configuration script: ./configure-layerzero.sh",
      "4. Verify all peer connections are established",
      "5. Test cross-chain messaging end-to-end",
      "6. Monitor and validate data flow"
    ],
    
    requiredPermissions: [
      "Owner access to source contract on Polygon Amoy",
      "Owner access to receiver contracts on all destination chains",
      "Sufficient native tokens for transaction fees"
    ]
  };
  
  const planPath = path.join(__dirname, "../deployments/layerzero-configuration-plan.json");
  fs.writeFileSync(planPath, JSON.stringify(configPlan, null, 2));
  
  console.log(`✅ Configuration plan saved to: ${planPath}`);
  return configPlan;
}

async function printConfigurationSummary(plan, scriptPath) {
  console.log(`\n🎉 LayerZero Configuration Plan Generated!`);
  console.log(`${"=".repeat(55)}`);
  
  console.log(`\n📊 Configuration Summary:`);
  console.log(`   Total configurations: ${plan.summary.totalConfigurations}`);
  console.log(`   Source contract: ${plan.summary.sourceContract}`);
  console.log(`   Receiver contracts: ${plan.summary.receiverContracts}`);
  console.log(`   Networks: ${plan.summary.networks.join(", ")}`);
  
  console.log(`\n🔗 Generated Files:`);
  console.log(`   📜 Execution script: ${scriptPath}`);
  console.log(`   📋 Configuration plan: packages/contracts/deployments/layerzero-configuration-plan.json`);
  console.log(`   🛠️  Helper scripts: packages/contracts/scripts/helpers/`);
  
  console.log(`\n📋 Execution Instructions:`);
  console.log(`\n1. 🪙 Ensure testnet tokens on all networks:`);
  for (const network of plan.summary.networks) {
    const config = LAYERZERO_CONFIGS[network];
    if (config) {
      console.log(`   ${config.name}: Native tokens for gas fees`);
    }
  }
  
  console.log(`\n2. 🔧 Configure Hardhat networks:`);
  console.log(`   Add private keys to hardhat.config.js for all target networks`);
  
  console.log(`\n3. 🚀 Run configuration:`);
  console.log(`   chmod +x ${scriptPath}`);
  console.log(`   ${scriptPath}`);
  
  console.log(`\n4. 🧪 Test the setup:`);
  console.log(`   npx hardhat run scripts/test-layerzero-end-to-end.js`);
  
  console.log(`\n⚠️  Prerequisites:`);
  console.log(`   ✓ All contracts deployed on respective networks`);
  console.log(`   ✓ Owner access to all contracts`);
  console.log(`   ✓ Sufficient gas tokens on all networks`);
  console.log(`   ✓ Hardhat networks configured with private keys`);
  
  console.log(`\n🌟 After configuration:`);
  console.log(`   📡 Source can broadcast to all receivers`);
  console.log(`   📨 Receivers trust source for data`);
  console.log(`   🔄 Auto-broadcasting every hour`);
  console.log(`   💰 Estimated cost: ~$0.50 per broadcast cycle`);
}

async function main() {
  try {
    console.log(`🔗 LayerZero Pathway Configuration`);
    console.log(`${"=".repeat(45)}`);
    
    // 1. Load deployment information
    const { sourceDeployment, receiverDeployments } = await loadDeploymentInfo();
    
    if (!sourceDeployment && receiverDeployments.length === 0) {
      console.log("❌ No deployment information found. Deploy contracts first.");
      process.exit(1);
    }
    
    // 2. Configure peer connections
    const configurations = await configurePeerConnections(sourceDeployment, receiverDeployments);
    
    // 3. Generate execution script
    const scriptPath = await generateExecutionScript(configurations);
    
    // 4. Generate helper scripts
    await generateHardhatTasks(configurations);
    
    // 5. Save configuration plan
    const plan = await saveConfigurationPlan(configurations);
    
    // 6. Print summary
    await printConfigurationSummary(plan, scriptPath);
    
  } catch (error) {
    console.error("\n💥 Configuration generation failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, configurePeerConnections, LAYERZERO_CONFIGS };