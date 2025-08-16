import { execSync } from "child_process";
import { config as dotenvConfig } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenvConfig();

// Define supported networks for deployment
const SUPPORTED_NETWORKS = [
  // Primary Mainnets (with Chainlink Functions support)
  "ethereum",
  "polygon", 
  "arbitrum",
  "optimism",
  "base",
  "avalanche",
  "bnb",
  "gnosis",
  
  // Additional hackathon networks
  "zircuit",
  "flare", 
  "hedera",
  
  // Testnets (for development)
  "sepolia",
  "polygonMumbai",
  "arbitrumGoerli",
  "optimismGoerli", 
  "baseGoerli",
  "fuji",
  "bscTestnet",
];

// Deployment results tracking
interface DeploymentResult {
  network: string;
  success: boolean;
  address?: string;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
}

class MultiChainDeployer {
  private deploymentResults: DeploymentResult[] = [];
  private deploymentSummary: string = "";

  constructor(private targetNetworks: string[] = SUPPORTED_NETWORKS) {
    console.log("🚀 Multi-Chain EnergyMonitor Deployment");
    console.log("=" .repeat(50));
    console.log(`📋 Target networks: ${this.targetNetworks.join(", ")}`);
    console.log(`🕒 Started at: ${new Date().toISOString()}\n`);
  }

  async deployToNetwork(network: string): Promise<DeploymentResult> {
    console.log(`\n🔄 Deploying to ${network.toUpperCase()}...`);
    
    try {
      // Check if required environment variables exist
      const requiredEnvVars = this.getRequiredEnvVars(network);
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(", ")}`);
      }

      // Execute deployment using hardhat-deploy
      const deployCommand = `npx hardhat deploy --network ${network} --tags EnergyMonitor`;
      console.log(`📝 Executing: ${deployCommand}`);
      
      const output = execSync(deployCommand, { 
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe"
      });

      // Parse deployment output to extract address and transaction hash
      const addressMatch = output.match(/deployed to:\s*(0x[a-fA-F0-9]{40})/);
      const txHashMatch = output.match(/Transaction hash:\s*(0x[a-fA-F0-9]{64})/);
      const gasUsedMatch = output.match(/Gas used:\s*(\d+)/);

      const result: DeploymentResult = {
        network,
        success: true,
        address: addressMatch?.[1],
        transactionHash: txHashMatch?.[1],
        gasUsed: gasUsedMatch?.[1],
      };

      console.log(`✅ ${network.toUpperCase()} deployment successful!`);
      if (result.address) console.log(`   📍 Address: ${result.address}`);
      if (result.transactionHash) console.log(`   📝 TX Hash: ${result.transactionHash}`);
      if (result.gasUsed) console.log(`   ⛽ Gas Used: ${result.gasUsed}`);

      return result;

    } catch (error: any) {
      const result: DeploymentResult = {
        network,
        success: false,
        error: error.message,
      };

      console.log(`❌ ${network.toUpperCase()} deployment failed!`);
      console.log(`   🔴 Error: ${error.message}`);

      return result;
    }
  }

  private getRequiredEnvVars(network: string): string[] {
    const baseVars = ["PRIVATE_KEY"];
    const networkSpecificVars = [
      `${network.toUpperCase()}_RPC_URL`,
      `${network.toUpperCase()}_SUBSCRIPTION_ID`,
    ];
    
    return [...baseVars, ...networkSpecificVars];
  }

  async deployToAllNetworks(): Promise<DeploymentResult[]> {
    console.log(`\n🌐 Starting deployment to ${this.targetNetworks.length} networks...\n`);

    for (const network of this.targetNetworks) {
      const result = await this.deployToNetwork(network);
      this.deploymentResults.push(result);

      // Add delay between deployments to avoid rate limiting
      if (this.targetNetworks.indexOf(network) < this.targetNetworks.length - 1) {
        console.log(`⏱️  Waiting 3 seconds before next deployment...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    this.generateSummary();
    this.saveResults();
    
    return this.deploymentResults;
  }

  private generateSummary(): void {
    const successful = this.deploymentResults.filter(r => r.success);
    const failed = this.deploymentResults.filter(r => !r.success);

    this.deploymentSummary = `
🎯 MULTI-CHAIN DEPLOYMENT SUMMARY
${"=".repeat(50)}

📊 Results:
   ✅ Successful: ${successful.length}/${this.deploymentResults.length}
   ❌ Failed: ${failed.length}/${this.deploymentResults.length}
   📈 Success Rate: ${((successful.length / this.deploymentResults.length) * 100).toFixed(1)}%

✅ SUCCESSFUL DEPLOYMENTS:
${successful.length === 0 ? "   None" : ""}
${successful.map(r => 
  `   🌐 ${r.network.toUpperCase()}: ${r.address || "N/A"}\n      TX: ${r.transactionHash || "N/A"}\n      Gas: ${r.gasUsed || "N/A"}`
).join("\n")}

${failed.length > 0 ? `❌ FAILED DEPLOYMENTS:
${failed.map(r => 
  `   🔴 ${r.network.toUpperCase()}: ${r.error || "Unknown error"}`
).join("\n")}` : ""}

🕒 Completed at: ${new Date().toISOString()}
    `;

    console.log(this.deploymentSummary);
  }

  private saveResults(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsDir = path.join(process.cwd(), "deployments", "results");
    
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save detailed results as JSON
    const detailedResults = {
      timestamp: new Date().toISOString(),
      totalNetworks: this.targetNetworks.length,
      successfulDeployments: this.deploymentResults.filter(r => r.success).length,
      failedDeployments: this.deploymentResults.filter(r => !r.success).length,
      results: this.deploymentResults,
    };

    const jsonFile = path.join(resultsDir, `deployment-${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(detailedResults, null, 2));

    // Save summary as text
    const txtFile = path.join(resultsDir, `summary-${timestamp}.txt`);
    fs.writeFileSync(txtFile, this.deploymentSummary);

    console.log(`\n💾 Results saved:`);
    console.log(`   📄 Details: ${jsonFile}`);
    console.log(`   📋 Summary: ${txtFile}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  let targetNetworks = SUPPORTED_NETWORKS;

  // Parse command line arguments
  if (args.length > 0) {
    if (args[0] === "--help" || args[0] === "-h") {
      console.log(`
🚀 Multi-Chain EnergyMonitor Deployment Script

Usage:
  npm run deploy:multi               # Deploy to all supported networks
  npm run deploy:multi [networks]    # Deploy to specific networks
  npm run deploy:multi --help        # Show this help

Examples:
  npm run deploy:multi polygon arbitrum optimism
  npm run deploy:multi sepolia polygonMumbai  # Testnets only

Supported Networks:
  Mainnets: ${SUPPORTED_NETWORKS.filter(n => !n.includes("Goerli") && !n.includes("Mumbai") && !n.includes("Testnet") && !n.includes("sepolia") && !n.includes("fuji")).join(", ")}
  Testnets: ${SUPPORTED_NETWORKS.filter(n => n.includes("Goerli") || n.includes("Mumbai") || n.includes("Testnet") || n.includes("sepolia") || n.includes("fuji")).join(", ")}

Environment Variables Required:
  - PRIVATE_KEY
  - {NETWORK}_RPC_URL for each network
  - {NETWORK}_SUBSCRIPTION_ID for each network
      `);
      process.exit(0);
    }

    // Filter networks based on command line arguments
    const requestedNetworks = args;
    const invalidNetworks = requestedNetworks.filter(n => !SUPPORTED_NETWORKS.includes(n));
    
    if (invalidNetworks.length > 0) {
      console.error(`❌ Invalid networks: ${invalidNetworks.join(", ")}`);
      console.error(`✅ Supported networks: ${SUPPORTED_NETWORKS.join(", ")}`);
      process.exit(1);
    }

    targetNetworks = requestedNetworks;
  }

  // Validate environment setup
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  try {
    const deployer = new MultiChainDeployer(targetNetworks);
    const results = await deployer.deployToAllNetworks();
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      console.log("\n🎉 All deployments completed successfully!");
      process.exit(0);
    } else if (successCount > 0) {
      console.log(`\n⚠️  Partial success: ${successCount}/${totalCount} deployments completed`);
      process.exit(1);
    } else {
      console.log("\n💥 All deployments failed!");
      process.exit(1);
    }

  } catch (error: any) {
    console.error(`\n💥 Deployment script failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}