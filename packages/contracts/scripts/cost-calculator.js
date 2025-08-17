const { ethers } = require("ethers");

/**
 * Cost Calculator for Energy Monitor Deployment
 * Provides detailed cost estimates for both networks
 */

const NETWORK_CONFIGS = {
  polygonAmoy: {
    name: "Polygon Amoy",
    gasPrice: 2, // gwei
    tokenPrice: 0.50, // USD per POL
    faucetAmount: 0.1, // POL per day
    chainlinkCostMultiplier: 1.0
  },
  sepolia: {
    name: "Ethereum Sepolia", 
    gasPrice: 10, // gwei
    tokenPrice: 3000, // USD per ETH
    faucetAmount: 0.1, // ETH per day
    chainlinkCostMultiplier: 2.0
  }
};

const GAS_ESTIMATES = {
  contractDeployment: 400000,
  nodeRegistration: 50000,
  chainlinkRequest: 150000,
  dataUpdate: 100000
};

function calculateDeploymentCosts(network, numNodes = 5) {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  
  const costs = {
    network: config.name,
    gasPrice: config.gasPrice,
    tokenPrice: config.tokenPrice
  };
  
  // Calculate gas costs
  const deploymentGas = GAS_ESTIMATES.contractDeployment;
  const nodeSetupGas = GAS_ESTIMATES.nodeRegistration * numNodes;
  const totalGas = deploymentGas + nodeSetupGas;
  
  // Convert to tokens
  const gasCostWei = BigInt(totalGas) * BigInt(config.gasPrice * 1e9);
  const gasCostTokens = parseFloat(ethers.formatEther(gasCostWei));
  const gasCostUSD = gasCostTokens * config.tokenPrice;
  
  costs.deployment = {
    totalGas,
    gasCostTokens: gasCostTokens.toFixed(6),
    gasCostUSD: gasCostUSD.toFixed(4),
    breakdown: {
      contractDeployment: deploymentGas,
      nodeSetup: nodeSetupGas
    }
  };
  
  return costs;
}

function calculateOperationalCosts(network, requestsPerDay = 24, daysPerMonth = 30) {
  const config = NETWORK_CONFIGS[network];
  
  // Chainlink Functions costs (estimated in LINK, converted to USD)
  const chainlinkCostPerRequest = 0.01 * config.chainlinkCostMultiplier; // LINK
  const linkPriceUSD = 15; // Approximate LINK price
  
  const dailyChainlinkCost = requestsPerDay * chainlinkCostPerRequest * linkPriceUSD;
  const monthlyChainlinkCost = dailyChainlinkCost * daysPerMonth;
  
  // Gas costs for on-chain operations
  const dailyGasCost = requestsPerDay * GAS_ESTIMATES.chainlinkRequest * config.gasPrice * 1e9;
  const dailyGasCostTokens = parseFloat(ethers.formatEther(BigInt(dailyGasCost)));
  const dailyGasCostUSD = dailyGasCostTokens * config.tokenPrice;
  const monthlyGasCostUSD = dailyGasCostUSD * daysPerMonth;
  
  return {
    network: config.name,
    daily: {
      chainlinkCostUSD: dailyChainlinkCost.toFixed(4),
      gasCostUSD: dailyGasCostUSD.toFixed(4),
      totalUSD: (dailyChainlinkCost + dailyGasCostUSD).toFixed(4)
    },
    monthly: {
      chainlinkCostUSD: monthlyChainlinkCost.toFixed(2),
      gasCostUSD: monthlyGasCostUSD.toFixed(2),
      totalUSD: (monthlyChainlinkCost + monthlyGasCostUSD).toFixed(2)
    },
    requestsPerDay,
    daysPerMonth
  };
}

function calculateFaucetRequirements(network, deploymentCosts, operationalDays = 7) {
  const config = NETWORK_CONFIGS[network];
  
  const totalTokensNeeded = parseFloat(deploymentCosts.deployment.gasCostTokens);
  const faucetRounds = Math.ceil(totalTokensNeeded / config.faucetAmount);
  const daysToAccumulate = faucetRounds; // Assuming 1 claim per day
  
  return {
    network: config.name,
    tokensNeeded: totalTokensNeeded.toFixed(6),
    faucetAmount: config.faucetAmount,
    faucetRounds,
    daysToAccumulate,
    recommendation: daysToAccumulate <= 3 ? "Easy" : daysToAccumulate <= 7 ? "Moderate" : "Difficult"
  };
}

function generateCostReport() {
  console.log(`\n💰 Energy Monitor Deployment Cost Analysis`);
  console.log(`${"=".repeat(80)}`);
  
  const networks = ["polygonAmoy", "sepolia"];
  const numNodes = 5;
  const requestsPerDay = 24; // Hourly updates
  
  networks.forEach(network => {
    console.log(`\n🔸 ${NETWORK_CONFIGS[network].name}`);
    console.log(`${"─".repeat(50)}`);
    
    // Deployment costs
    const deploymentCosts = calculateDeploymentCosts(network, numNodes);
    console.log(`📦 Deployment Costs:`);
    console.log(`   Gas Required: ${deploymentCosts.deployment.totalGas.toLocaleString()} gas`);
    console.log(`   Token Cost: ${deploymentCosts.deployment.gasCostTokens} ${network === 'polygonAmoy' ? 'POL' : 'ETH'}`);
    console.log(`   USD Cost: $${deploymentCosts.deployment.gasCostUSD}`);
    
    // Operational costs
    const operationalCosts = calculateOperationalCosts(network, requestsPerDay);
    console.log(`\n🔄 Operational Costs (${requestsPerDay} requests/day):`);
    console.log(`   Daily: $${operationalCosts.daily.totalUSD} (Chainlink: $${operationalCosts.daily.chainlinkCostUSD}, Gas: $${operationalCosts.daily.gasCostUSD})`);
    console.log(`   Monthly: $${operationalCosts.monthly.totalUSD} (Chainlink: $${operationalCosts.monthly.chainlinkCostUSD}, Gas: $${operationalCosts.monthly.gasCostUSD})`);
    
    // Faucet requirements
    const faucetReqs = calculateFaucetRequirements(network, deploymentCosts);
    console.log(`\n🚰 Faucet Requirements:`);
    console.log(`   Tokens Needed: ${faucetReqs.tokensNeeded} ${network === 'polygonAmoy' ? 'POL' : 'ETH'}`);
    console.log(`   Faucet Claims: ${faucetReqs.faucetRounds} rounds`);
    console.log(`   Time to Accumulate: ${faucetReqs.daysToAccumulate} days`);
    console.log(`   Difficulty: ${faucetReqs.recommendation}`);
  });
  
  // Comparison summary
  console.log(`\n📊 Network Comparison Summary`);
  console.log(`${"=".repeat(80)}`);
  
  const polygonCosts = calculateDeploymentCosts("polygonAmoy", numNodes);
  const sepoliaCosts = calculateDeploymentCosts("sepolia", numNodes);
  const polygonOps = calculateOperationalCosts("polygonAmoy", requestsPerDay);
  const sepoliaOps = calculateOperationalCosts("sepolia", requestsPerDay);
  
  console.log(`\n🏁 Initial Setup:`);
  console.log(`   Polygon Amoy: $${polygonCosts.deployment.gasCostUSD} (${polygonCosts.deployment.gasCostTokens} POL)`);
  console.log(`   Ethereum Sepolia: $${sepoliaCosts.deployment.gasCostUSD} (${sepoliaCosts.deployment.gasCostTokens} ETH)`);
  console.log(`   💡 Polygon is ${(parseFloat(sepoliaCosts.deployment.gasCostUSD) / parseFloat(polygonCosts.deployment.gasCostUSD)).toFixed(1)}x cheaper for deployment`);
  
  console.log(`\n🔄 Monthly Operations:`);
  console.log(`   Polygon Amoy: $${polygonOps.monthly.totalUSD}/month`);
  console.log(`   Ethereum Sepolia: $${sepoliaOps.monthly.totalUSD}/month`);
  console.log(`   💡 Polygon is ${(parseFloat(sepoliaOps.monthly.totalUSD) / parseFloat(polygonOps.monthly.totalUSD)).toFixed(1)}x cheaper for operations`);
  
  console.log(`\n🎯 Recommendations:`);
  console.log(`   🟣 Choose Polygon Amoy if: Cost-sensitive, rapid testing, multiple deployments`);
  console.log(`   🔵 Choose Ethereum Sepolia if: Production-like testing, mainnet similarity important`);
  console.log(`   💡 For development: Start with Polygon Amoy, test on Sepolia before mainnet`);
}

function calculateScenarios() {
  console.log(`\n🎭 Deployment Scenarios`);
  console.log(`${"=".repeat(80)}`);
  
  const scenarios = [
    { name: "MVP Testing", nodes: 3, requestsPerDay: 12, description: "Basic functionality test" },
    { name: "NYC Demo", nodes: 35, requestsPerDay: 24, description: "Full NYC grid simulation" },
    { name: "Production Scale", nodes: 100, requestsPerDay: 48, description: "Large-scale deployment" }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`\n📈 ${scenario.name} (${scenario.description})`);
    console.log(`   Nodes: ${scenario.nodes}, Requests/Day: ${scenario.requestsPerDay}`);
    
    const polygonDeploy = calculateDeploymentCosts("polygonAmoy", scenario.nodes);
    const polygonOps = calculateOperationalCosts("polygonAmoy", scenario.requestsPerDay);
    const sepoliaDeploy = calculateDeploymentCosts("sepolia", scenario.nodes);
    const sepoliaOps = calculateOperationalCosts("sepolia", scenario.requestsPerDay);
    
    console.log(`   Polygon Amoy: $${polygonDeploy.deployment.gasCostUSD} setup + $${polygonOps.monthly.totalUSD}/month`);
    console.log(`   Ethereum Sepolia: $${sepoliaDeploy.deployment.gasCostUSD} setup + $${sepoliaOps.monthly.totalUSD}/month`);
  });
}

// Export functions for use in deployment scripts
module.exports = {
  calculateDeploymentCosts,
  calculateOperationalCosts,
  calculateFaucetRequirements,
  generateCostReport,
  calculateScenarios,
  NETWORK_CONFIGS,
  GAS_ESTIMATES
};

// Run cost analysis if called directly
if (require.main === module) {
  generateCostReport();
  calculateScenarios();
}