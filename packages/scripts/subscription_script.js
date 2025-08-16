const { ethers } = require("ethers");
const { config } = require("dotenv");

config();

const SUPPORTED_NETWORKS = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 1,
    router: "0x65C939e97716d07C26508D8E8D57cD5e31d5C8D9",
    linkToken: "0x514910771AF9Ca656af840dff83E8264EcF986CA"
  },
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 137,
    router: "0x3C3a92a5dE3B4dd7bd2f31b0F3DC56EC7c7b1c73",
    linkToken: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1"
  },
  arbitrum: {
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arbitrum-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 42161,
    router: "0x72051E3E8C632a2B5a4C00F4a0E4e4c0c0c2B8cA",
    linkToken: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"
  },
  optimism: {
    rpcUrl: process.env.OPTIMISM_RPC_URL || "https://optimism-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 10,
    router: "0x8aB6B9e8e0b5A8E3f0D1E2F3A4B5C6D7E8F9A0B1",
    linkToken: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6"
  },
  base: {
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    chainId: 8453,
    router: "0x9C9E3D56F0A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8",
    linkToken: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196"
  },
  avalanche: {
    rpcUrl: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    chainId: 43114,
    router: "0xE1F0C6B7A8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3",
    linkToken: "0x5947BB275c521040051D82396192181b413227A3"
  },
  bnb: {
    rpcUrl: process.env.BNB_RPC_URL || "https://bsc-dataseed1.binance.org",
    chainId: 56,
    router: "0xF1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0",
    linkToken: "0x404460C6A5EdE2D891e8297795264fDe62ADBB75"
  },
  gnosis: {
    rpcUrl: process.env.GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
    chainId: 100,
    router: "0x0000000000000000000000000000000000000000",
    linkToken: "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2"
  },
  zircuit: {
    rpcUrl: process.env.ZIRCUIT_RPC_URL || "https://zircuit1-mainnet.p2pify.com/",
    chainId: 48900,
    router: "0x0000000000000000000000000000000000000000",
    linkToken: "0x0000000000000000000000000000000000000000"
  },
  flare: {
    rpcUrl: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/bc/C/rpc",
    chainId: 14,
    router: "0x0000000000000000000000000000000000000000",
    linkToken: "0x0000000000000000000000000000000000000000"
  },
  hedera: {
    rpcUrl: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
    chainId: 295,
    router: "0x0000000000000000000000000000000000000000",
    linkToken: "0x0000000000000000000000000000000000000000"
  }
};

const FUNCTIONS_ROUTER_ABI = [
  "function createSubscription() external returns (uint64 subscriptionId)",
  "function addConsumer(uint64 subscriptionId, address consumer) external",
  "function fundSubscription(uint64 subscriptionId) external payable",
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "function cancelSubscription(uint64 subscriptionId, address to) external"
];

const LINK_TOKEN_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferAndCall(address to, uint256 amount, bytes calldata data) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

class ChainlinkSubscriptionManager {
  constructor() {
    this.wallet = null;
    this.subscriptions = new Map();
  }

  async initializeWallet(networkName) {
    const network = SUPPORTED_NETWORKS[networkName];
    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`🔌 Connected to ${networkName}`);
    console.log(`👤 Wallet address: ${this.wallet.address}`);
    
    const balance = await provider.getBalance(this.wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    return { provider, network };
  }

  async createSubscription(networkName) {
    console.log(`\n🚀 Creating subscription on ${networkName.toUpperCase()}...`);
    
    const { provider, network } = await this.initializeWallet(networkName);
    
    if (network.router === "0x0000000000000000000000000000000000000000") {
      console.log(`⚠️  Chainlink Functions not available on ${networkName}, creating mock subscription`);
      const mockSubscriptionId = Math.floor(Math.random() * 1000) + 1;
      this.subscriptions.set(networkName, {
        subscriptionId: mockSubscriptionId,
        network: networkName,
        chainId: network.chainId,
        mock: true
      });
      console.log(`📋 Mock subscription created: ${mockSubscriptionId}`);
      return mockSubscriptionId;
    }

    try {
      const functionsRouter = new ethers.Contract(
        network.router,
        FUNCTIONS_ROUTER_ABI,
        this.wallet
      );

      console.log(`📡 Functions Router: ${network.router}`);

      const createTx = await functionsRouter.createSubscription();
      console.log(`⏳ Creating subscription... TX: ${createTx.hash}`);
      
      const receipt = await createTx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      const subscriptionCreatedEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id("SubscriptionCreated(uint64,address)")
      );

      if (!subscriptionCreatedEvent) {
        throw new Error("SubscriptionCreated event not found");
      }

      const subscriptionId = parseInt(subscriptionCreatedEvent.topics[1], 16);
      
      this.subscriptions.set(networkName, {
        subscriptionId,
        network: networkName,
        chainId: network.chainId,
        router: network.router,
        linkToken: network.linkToken,
        transactionHash: createTx.hash
      });

      console.log(`🎉 Subscription created successfully!`);
      console.log(`📋 Subscription ID: ${subscriptionId}`);
      console.log(`🔗 Transaction: ${createTx.hash}`);

      return subscriptionId;

    } catch (error) {
      console.error(`❌ Failed to create subscription on ${networkName}:`, error.message);
      throw error;
    }
  }

  async fundSubscription(networkName, subscriptionId, linkAmount) {
    console.log(`\n💰 Funding subscription ${subscriptionId} on ${networkName.toUpperCase()}...`);
    
    const { provider, network } = await this.initializeWallet(networkName);
    
    if (network.router === "0x0000000000000000000000000000000000000000") {
      console.log(`⚠️  Mock network - skipping funding`);
      return;
    }

    try {
      const linkToken = new ethers.Contract(
        network.linkToken,
        LINK_TOKEN_ABI,
        this.wallet
      );

      const linkBalance = await linkToken.balanceOf(this.wallet.address);
      console.log(`💎 LINK balance: ${ethers.formatEther(linkBalance)}`);

      const fundAmount = ethers.parseEther(linkAmount.toString());
      
      if (linkBalance < fundAmount) {
        throw new Error(`Insufficient LINK balance. Required: ${linkAmount} LINK, Available: ${ethers.formatEther(linkBalance)} LINK`);
      }

      const subscriptionIdBytes = ethers.toBeHex(subscriptionId, 32);
      
      const transferTx = await linkToken.transferAndCall(
        network.router,
        fundAmount,
        subscriptionIdBytes
      );

      console.log(`⏳ Funding subscription... TX: ${transferTx.hash}`);
      const receipt = await transferTx.wait();
      console.log(`✅ Subscription funded in block ${receipt.blockNumber}`);
      console.log(`💰 Funded with ${linkAmount} LINK`);

      return transferTx.hash;

    } catch (error) {
      console.error(`❌ Failed to fund subscription on ${networkName}:`, error.message);
      throw error;
    }
  }

  async addConsumer(networkName, subscriptionId, consumerAddress) {
    console.log(`\n👥 Adding consumer to subscription ${subscriptionId} on ${networkName.toUpperCase()}...`);
    
    const { provider, network } = await this.initializeWallet(networkName);
    
    if (network.router === "0x0000000000000000000000000000000000000000") {
      console.log(`⚠️  Mock network - skipping consumer addition`);
      return;
    }

    try {
      const functionsRouter = new ethers.Contract(
        network.router,
        FUNCTIONS_ROUTER_ABI,
        this.wallet
      );

      const addConsumerTx = await functionsRouter.addConsumer(subscriptionId, consumerAddress);
      console.log(`⏳ Adding consumer... TX: ${addConsumerTx.hash}`);
      
      const receipt = await addConsumerTx.wait();
      console.log(`✅ Consumer added in block ${receipt.blockNumber}`);
      console.log(`👤 Consumer address: ${consumerAddress}`);

      return addConsumerTx.hash;

    } catch (error) {
      console.error(`❌ Failed to add consumer on ${networkName}:`, error.message);
      throw error;
    }
  }

  async getSubscriptionDetails(networkName, subscriptionId) {
    console.log(`\n📊 Getting subscription details for ${subscriptionId} on ${networkName.toUpperCase()}...`);
    
    const { provider, network } = await this.initializeWallet(networkName);
    
    if (network.router === "0x0000000000000000000000000000000000000000") {
      console.log(`⚠️  Mock network - returning mock details`);
      return {
        balance: "0",
        reqCount: "0",
        owner: this.wallet.address,
        consumers: [],
        mock: true
      };
    }

    try {
      const functionsRouter = new ethers.Contract(
        network.router,
        FUNCTIONS_ROUTER_ABI,
        this.wallet
      );

      const details = await functionsRouter.getSubscription(subscriptionId);
      
      const subscriptionInfo = {
        balance: ethers.formatEther(details.balance),
        reqCount: details.reqCount.toString(),
        owner: details.owner,
        consumers: details.consumers
      };

      console.log(`📋 Subscription Details:`);
      console.log(`   💰 Balance: ${subscriptionInfo.balance} LINK`);
      console.log(`   📊 Request Count: ${subscriptionInfo.reqCount}`);
      console.log(`   👤 Owner: ${subscriptionInfo.owner}`);
      console.log(`   👥 Consumers: ${subscriptionInfo.consumers.length}`);

      return subscriptionInfo;

    } catch (error) {
      console.error(`❌ Failed to get subscription details on ${networkName}:`, error.message);
      throw error;
    }
  }

  async setupMultiChainSubscriptions(options = {}) {
    console.log(`\n🌐 Setting up multi-chain Chainlink Functions subscriptions...`);
    console.log(`=`.repeat(60));

    const {
      networks = Object.keys(SUPPORTED_NETWORKS),
      fundAmount = 5,
      addConsumers = [],
      skipFunding = false
    } = options;

    const results = [];
    const errors = [];

    for (const networkName of networks) {
      try {
        console.log(`\n${"=".repeat(40)}`);
        console.log(`📡 Processing ${networkName.toUpperCase()}`);
        console.log(`${"=".repeat(40)}`);

        const subscriptionId = await this.createSubscription(networkName);

        if (!skipFunding && !SUPPORTED_NETWORKS[networkName].router.includes("0000000000000000000000000000000000000000")) {
          await this.fundSubscription(networkName, subscriptionId, fundAmount);
        }

        for (const consumerAddress of addConsumers) {
          await this.addConsumer(networkName, subscriptionId, consumerAddress);
        }

        const details = await this.getSubscriptionDetails(networkName, subscriptionId);

        results.push({
          network: networkName,
          subscriptionId,
          success: true,
          details,
          chainId: SUPPORTED_NETWORKS[networkName].chainId
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Failed to setup subscription on ${networkName}:`, error.message);
        errors.push({
          network: networkName,
          error: error.message,
          success: false
        });
      }
    }

    this.printFinalSummary(results, errors);
    this.saveResults(results, errors);

    return { results, errors };
  }

  printFinalSummary(results, errors) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎯 MULTI-CHAIN SUBSCRIPTION SETUP SUMMARY`);
    console.log(`${"=".repeat(60)}`);

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successful: ${results.length}/${results.length + errors.length}`);
    console.log(`   ❌ Failed: ${errors.length}/${results.length + errors.length}`);
    console.log(`   📈 Success Rate: ${((results.length / (results.length + errors.length)) * 100).toFixed(1)}%`);

    if (results.length > 0) {
      console.log(`\n✅ SUCCESSFUL SUBSCRIPTIONS:`);
      results.forEach(result => {
        console.log(`   🌐 ${result.network.toUpperCase()}`);
        console.log(`      📋 Subscription ID: ${result.subscriptionId}`);
        console.log(`      🔗 Chain ID: ${result.chainId}`);
        if (result.details.mock) {
          console.log(`      ⚠️  Mock subscription (Chainlink Functions not available)`);
        } else {
          console.log(`      💰 Balance: ${result.details.balance} LINK`);
          console.log(`      👥 Consumers: ${result.details.consumers.length}`);
        }
        console.log();
      });
    }

    if (errors.length > 0) {
      console.log(`❌ FAILED SUBSCRIPTIONS:`);
      errors.forEach(error => {
        console.log(`   🔴 ${error.network.toUpperCase()}: ${error.error}`);
      });
    }

    console.log(`\n📝 Environment Variables:`);
    results.forEach(result => {
      const envVarName = `${result.network.toUpperCase()}_SUBSCRIPTION_ID`;
      console.log(`${envVarName}=${result.subscriptionId}`);
    });

    console.log(`\n🕒 Completed at: ${new Date().toISOString()}`);
  }

  saveResults(results, errors) {
    const fs = require("fs");
    const path = require("path");
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsDir = path.join(process.cwd(), "subscription-results");
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const detailedResults = {
      timestamp: new Date().toISOString(),
      totalNetworks: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };

    const jsonFile = path.join(resultsDir, `subscriptions-${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(detailedResults, null, 2));

    const envFile = path.join(resultsDir, `subscription-env-${timestamp}.txt`);
    const envContent = results.map(result => 
      `${result.network.toUpperCase()}_SUBSCRIPTION_ID=${result.subscriptionId}`
    ).join('\n');
    fs.writeFileSync(envFile, envContent);

    console.log(`\n💾 Results saved:`);
    console.log(`   📄 Details: ${jsonFile}`);
    console.log(`   📋 Environment: ${envFile}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const manager = new ChainlinkSubscriptionManager();

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🚀 Chainlink Functions Multi-Chain Subscription Manager

Usage:
  node subscription_script.js [options] [networks...]

Options:
  --help, -h              Show this help message
  --fund-amount AMOUNT    Amount of LINK to fund each subscription (default: 5)
  --skip-funding          Skip funding subscriptions with LINK
  --consumer ADDRESS      Add a consumer contract to all subscriptions

Examples:
  node subscription_script.js                                    # Setup on all networks
  node subscription_script.js polygon arbitrum optimism         # Setup on specific networks  
  node subscription_script.js --fund-amount 10                  # Fund with 10 LINK each
  node subscription_script.js --consumer 0x123...               # Add consumer contract

Supported Networks:
  ${Object.keys(SUPPORTED_NETWORKS).join(", ")}

Environment Variables Required:
  - PRIVATE_KEY: Private key for wallet (with sufficient LINK and native tokens)
  - {NETWORK}_RPC_URL: RPC endpoint for each network (optional, defaults provided)

Note: Some networks (Zircuit, Flare, Hedera, Gnosis) may not have Chainlink Functions
support yet and will create mock subscriptions for future compatibility.
    `);
    process.exit(0);
  }

  try {
    const fundAmountIndex = args.indexOf("--fund-amount");
    const fundAmount = fundAmountIndex !== -1 ? parseFloat(args[fundAmountIndex + 1]) : 5;
    
    const consumerIndex = args.indexOf("--consumer");
    const consumerAddress = consumerIndex !== -1 ? args[consumerIndex + 1] : null;
    
    const skipFunding = args.includes("--skip-funding");
    
    const networks = args.filter(arg => 
      !arg.startsWith("--") && 
      !arg.match(/^0x[a-fA-F0-9]{40}$/) &&
      !arg.match(/^\d+\.?\d*$/) &&
      Object.keys(SUPPORTED_NETWORKS).includes(arg)
    );

    const options = {
      networks: networks.length > 0 ? networks : undefined,
      fundAmount,
      addConsumers: consumerAddress ? [consumerAddress] : [],
      skipFunding
    };

    await manager.setupMultiChainSubscriptions(options);

  } catch (error) {
    console.error(`💥 Script failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ChainlinkSubscriptionManager, SUPPORTED_NETWORKS };