const { ethers } = require("ethers");
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

config();

const SUPPORTED_NETWORKS = {
  polygon: {
    name: "polygon",
    rpcUrl: process.env.POLYGON_RPC_URL || "wss://polygon-mainnet.infura.io/ws/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    httpUrl: process.env.POLYGON_RPC_URL?.replace('wss://', 'https://').replace('/ws/', '/') || "https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 137,
    contractAddress: process.env.POLYGON_CONTRACT_ADDRESS,
    explorerUrl: "https://polygonscan.com"
  },
  arbitrum: {
    name: "arbitrum",
    rpcUrl: process.env.ARBITRUM_RPC_URL || "wss://arbitrum-mainnet.infura.io/ws/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    httpUrl: process.env.ARBITRUM_RPC_URL?.replace('wss://', 'https://').replace('/ws/', '/') || "https://arbitrum-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 42161,
    contractAddress: process.env.ARBITRUM_CONTRACT_ADDRESS,
    explorerUrl: "https://arbiscan.io"
  },
  optimism: {
    name: "optimism",
    rpcUrl: process.env.OPTIMISM_RPC_URL || "wss://optimism-mainnet.infura.io/ws/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    httpUrl: process.env.OPTIMISM_RPC_URL?.replace('wss://', 'https://').replace('/ws/', '/') || "https://optimism-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 10,
    contractAddress: process.env.OPTIMISM_CONTRACT_ADDRESS,
    explorerUrl: "https://optimistic.etherscan.io"
  },
  base: {
    name: "base",
    rpcUrl: process.env.BASE_RPC_URL || "wss://base-mainnet.infura.io/ws/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    httpUrl: process.env.BASE_RPC_URL?.replace('wss://', 'https://').replace('/ws/', '/') || "https://mainnet.base.org",
    chainId: 8453,
    contractAddress: process.env.BASE_CONTRACT_ADDRESS,
    explorerUrl: "https://basescan.org"
  },
  avalanche: {
    name: "avalanche",
    rpcUrl: process.env.AVALANCHE_RPC_URL || "wss://api.avax.network/ext/bc/C/ws",
    httpUrl: process.env.AVALANCHE_RPC_URL?.replace('wss://', 'https://').replace('/ws', '/rpc') || "https://api.avax.network/ext/bc/C/rpc",
    chainId: 43114,
    contractAddress: process.env.AVALANCHE_CONTRACT_ADDRESS,
    explorerUrl: "https://snowtrace.io"
  },
  bnb: {
    name: "bnb",
    rpcUrl: process.env.BNB_RPC_URL || "wss://bsc-ws-node.nariox.org:443",
    httpUrl: process.env.BNB_RPC_URL?.replace('wss://', 'https://').replace(':443', '') || "https://bsc-dataseed1.binance.org",
    chainId: 56,
    contractAddress: process.env.BNB_CONTRACT_ADDRESS,
    explorerUrl: "https://bscscan.com"
  },
  gnosis: {
    name: "gnosis",
    rpcUrl: process.env.GNOSIS_RPC_URL || "wss://rpc.gnosischain.com/wss",
    httpUrl: process.env.GNOSIS_RPC_URL?.replace('wss://', 'https://').replace('/wss', '') || "https://rpc.gnosischain.com",
    chainId: 100,
    contractAddress: process.env.GNOSIS_CONTRACT_ADDRESS,
    explorerUrl: "https://gnosisscan.io"
  },
  zircuit: {
    name: "zircuit",
    rpcUrl: process.env.ZIRCUIT_RPC_URL || "https://zircuit1-mainnet.p2pify.com/",
    httpUrl: process.env.ZIRCUIT_RPC_URL || "https://zircuit1-mainnet.p2pify.com/",
    chainId: 48900,
    contractAddress: process.env.ZIRCUIT_CONTRACT_ADDRESS,
    explorerUrl: "https://explorer.zircuit.com"
  },
  flare: {
    name: "flare",
    rpcUrl: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/bc/C/rpc",
    httpUrl: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/bc/C/rpc",
    chainId: 14,
    contractAddress: process.env.FLARE_CONTRACT_ADDRESS,
    explorerUrl: "https://flare-explorer.flare.network"
  },
  hedera: {
    name: "hedera",
    rpcUrl: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
    httpUrl: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
    chainId: 295,
    contractAddress: process.env.HEDERA_CONTRACT_ADDRESS,
    explorerUrl: "https://hashscan.io/mainnet"
  }
};

const ENERGY_MONITOR_ABI = [
  "event DataUpdated(uint256 indexed dataId, uint256 indexed nodeId, uint256 kWh, string location, uint256 timestamp)",
  "event NodeRegistered(uint256 indexed nodeId, string location)",
  "event NodeDeactivated(uint256 indexed nodeId)",
  "event RequestSent(bytes32 indexed requestId)",
  "event RequestFulfilled(bytes32 indexed requestId, bytes response, bytes err)",
  "function getNodeData(uint256 nodeId) external view returns (uint256 dataId, uint256 kWh, string memory location, uint256 timestamp)",
  "function getActiveNodes() external view returns (uint256[] memory)",
  "function isNodeActive(uint256 nodeId) external view returns (bool)"
];

class MultiChainEnergyListener {
  constructor(options = {}) {
    this.providers = new Map();
    this.contracts = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.webhookUrl = process.env.WEBHOOK_URL;
    this.slackWebhook = process.env.SLACK_WEBHOOK;
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.dataDir = path.join(process.cwd(), 'listener-data');
    this.alertThresholds = {
      highUsage: parseInt(process.env.HIGH_USAGE_THRESHOLD) || 5000000, // 5000 kWh * 1000
      lowUsage: parseInt(process.env.LOW_USAGE_THRESHOLD) || 100000,     // 100 kWh * 1000
      usageSpike: parseFloat(process.env.USAGE_SPIKE_THRESHOLD) || 2.0   // 2x increase
    };
    this.lastUsage = new Map();
    this.eventCounts = new Map();
    this.startTime = new Date();

    this.ensureDataDirectory();
    this.setupGracefulShutdown();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      await this.stopListening();
      this.printFinalStats();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  log(level, message, data = null) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.logLevel] || 2;
    const messageLevel = levels[level] || 2;

    if (messageLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = data 
        ? `[${timestamp}] ${level.toUpperCase()}: ${message} ${JSON.stringify(data)}`
        : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      
      console.log(logMessage);

      // Also write to file
      const logFile = path.join(this.dataDir, 'listener.log');
      fs.appendFileSync(logFile, logMessage + '\n');
    }
  }

  async initializeProvider(network) {
    const config = SUPPORTED_NETWORKS[network];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    if (!config.contractAddress) {
      this.log('warn', `No contract address configured for ${network}, skipping...`);
      return null;
    }

    try {
      // Try WebSocket first, fallback to HTTP
      let provider;
      if (config.rpcUrl.startsWith('wss://')) {
        try {
          provider = new ethers.WebSocketProvider(config.rpcUrl);
          await provider.getNetwork(); // Test connection
          this.log('info', `🔌 Connected to ${network} via WebSocket`);
        } catch (wsError) {
          this.log('warn', `WebSocket failed for ${network}, falling back to HTTP:`, wsError.message);
          provider = new ethers.JsonRpcProvider(config.httpUrl);
        }
      } else {
        provider = new ethers.JsonRpcProvider(config.rpcUrl);
      }

      // Test the connection
      const blockNumber = await provider.getBlockNumber();
      this.log('info', `📊 ${network} connected, latest block: ${blockNumber}`);

      const contract = new ethers.Contract(
        config.contractAddress,
        ENERGY_MONITOR_ABI,
        provider
      );

      // Test contract connection
      try {
        await contract.getActiveNodes();
        this.log('info', `✅ Contract interface verified for ${network}`);
      } catch (contractError) {
        this.log('warn', `Contract test failed for ${network}:`, contractError.message);
      }

      this.providers.set(network, provider);
      this.contracts.set(network, contract);
      this.reconnectAttempts.set(network, 0);
      this.eventCounts.set(network, { DataUpdated: 0, NodeRegistered: 0, NodeDeactivated: 0 });

      return { provider, contract };

    } catch (error) {
      this.log('error', `Failed to initialize ${network}:`, error.message);
      throw error;
    }
  }

  async setupProviderReconnection(network, provider) {
    provider.on('error', async (error) => {
      this.log('error', `Provider error for ${network}:`, error.message);
      await this.handleReconnection(network);
    });

    if (provider.websocket) {
      provider.websocket.on('close', async () => {
        this.log('warn', `WebSocket closed for ${network}, attempting reconnection...`);
        await this.handleReconnection(network);
      });
    }
  }

  async handleReconnection(network) {
    const attempts = this.reconnectAttempts.get(network) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      this.log('error', `Max reconnection attempts reached for ${network}, giving up`);
      return;
    }

    this.reconnectAttempts.set(network, attempts + 1);
    
    this.log('info', `🔄 Reconnecting to ${network} (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
    
    // Clean up existing connections
    const oldProvider = this.providers.get(network);
    if (oldProvider) {
      oldProvider.removeAllListeners();
      if (oldProvider.websocket) {
        oldProvider.websocket.close();
      }
    }

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      const result = await this.initializeProvider(network);
      if (result) {
        await this.startNetworkListener(network);
        this.log('info', `✅ Successfully reconnected to ${network}`);
      }
    } catch (error) {
      this.log('error', `Reconnection failed for ${network}:`, error.message);
      // Try again after delay
      setTimeout(() => this.handleReconnection(network), this.reconnectDelay * 2);
    }
  }

  async startNetworkListener(network) {
    const contract = this.contracts.get(network);
    const provider = this.providers.get(network);
    
    if (!contract || !provider) {
      this.log('error', `Contract or provider not available for ${network}`);
      return;
    }

    // Setup provider reconnection handling
    await this.setupProviderReconnection(network, provider);

    // Listen for DataUpdated events
    contract.on("DataUpdated", async (dataId, nodeId, kWh, location, timestamp, event) => {
      const eventData = {
        network,
        event: "DataUpdated",
        dataId: dataId.toString(),
        nodeId: nodeId.toString(),
        kWh: kWh.toString(),
        location,
        timestamp: timestamp.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        explorerUrl: `${SUPPORTED_NETWORKS[network].explorerUrl}/tx/${event.transactionHash}`,
        processedAt: new Date().toISOString()
      };

      this.log('info', `[${network.toUpperCase()}] DataUpdated event - Node ${nodeId}, kWh: ${(parseInt(kWh.toString()) / 1000).toFixed(3)}`);
      
      // Update event counts
      const counts = this.eventCounts.get(network);
      counts.DataUpdated++;
      this.eventCounts.set(network, counts);

      try {
        await this.processDataUpdatedEvent(eventData);
        await this.checkAlertThresholds(eventData);
      } catch (error) {
        this.log('error', `Error processing DataUpdated event on ${network}:`, error.message);
      }
    });

    // Listen for NodeRegistered events
    contract.on("NodeRegistered", async (nodeId, location, event) => {
      const eventData = {
        network,
        event: "NodeRegistered",
        nodeId: nodeId.toString(),
        location,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        explorerUrl: `${SUPPORTED_NETWORKS[network].explorerUrl}/tx/${event.transactionHash}`,
        processedAt: new Date().toISOString()
      };

      this.log('info', `[${network.toUpperCase()}] NodeRegistered event - Node ${nodeId} at ${location}`);
      
      // Update event counts
      const counts = this.eventCounts.get(network);
      counts.NodeRegistered++;
      this.eventCounts.set(network, counts);

      try {
        await this.processNodeEvent(eventData);
      } catch (error) {
        this.log('error', `Error processing NodeRegistered event on ${network}:`, error.message);
      }
    });

    // Listen for NodeDeactivated events
    contract.on("NodeDeactivated", async (nodeId, event) => {
      const eventData = {
        network,
        event: "NodeDeactivated",
        nodeId: nodeId.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        explorerUrl: `${SUPPORTED_NETWORKS[network].explorerUrl}/tx/${event.transactionHash}`,
        processedAt: new Date().toISOString()
      };

      this.log('warn', `[${network.toUpperCase()}] NodeDeactivated event - Node ${nodeId}`);
      
      // Update event counts
      const counts = this.eventCounts.get(network);
      counts.NodeDeactivated++;
      this.eventCounts.set(network, counts);

      try {
        await this.processNodeEvent(eventData);
        await this.sendAlert("NODE_DEACTIVATED", eventData, `Node ${nodeId} on ${network} has been deactivated`);
      } catch (error) {
        this.log('error', `Error processing NodeDeactivated event on ${network}:`, error.message);
      }
    });

    this.log('info', `🎧 Event listeners started for ${network}`);
  }

  async processDataUpdatedEvent(eventData) {
    // Store event data to file
    const eventFile = path.join(this.dataDir, `${eventData.network}-events.jsonl`);
    fs.appendFileSync(eventFile, JSON.stringify(eventData) + '\n');

    // Send to webhook if configured
    if (this.webhookUrl) {
      try {
        await axios.post(this.webhookUrl, {
          type: "energy_update",
          data: eventData
        }, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });
        this.log('debug', `Webhook notification sent for ${eventData.network}`);
      } catch (error) {
        this.log('warn', `Webhook notification failed for ${eventData.network}:`, error.message);
      }
    }

    // Store aggregated data
    const summaryFile = path.join(this.dataDir, 'daily-summary.json');
    this.updateDailySummary(summaryFile, eventData);
  }

  async processNodeEvent(eventData) {
    // Store node event
    const nodeFile = path.join(this.dataDir, `${eventData.network}-nodes.jsonl`);
    fs.appendFileSync(nodeFile, JSON.stringify(eventData) + '\n');

    // Send to webhook if configured
    if (this.webhookUrl) {
      try {
        await axios.post(this.webhookUrl, {
          type: "node_event",
          data: eventData
        }, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        this.log('warn', `Node event webhook failed for ${eventData.network}:`, error.message);
      }
    }
  }

  updateDailySummary(summaryFile, eventData) {
    let summary = {};
    if (fs.existsSync(summaryFile)) {
      try {
        summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      } catch (error) {
        this.log('warn', 'Failed to read daily summary, creating new one');
      }
    }

    const today = new Date().toISOString().split('T')[0];
    if (!summary[today]) {
      summary[today] = {};
    }
    
    if (!summary[today][eventData.network]) {
      summary[today][eventData.network] = {
        totalEvents: 0,
        totalKwh: 0,
        nodes: new Set()
      };
    }

    const dailyData = summary[today][eventData.network];
    dailyData.totalEvents++;
    if (eventData.kWh) {
      dailyData.totalKwh += parseInt(eventData.kWh);
    }
    if (eventData.nodeId) {
      dailyData.nodes.add(eventData.nodeId);
    }

    // Convert Set to Array for JSON serialization
    dailyData.nodes = Array.from(dailyData.nodes);

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  }

  async checkAlertThresholds(eventData) {
    const { network, nodeId, kWh } = eventData;
    const usage = parseInt(kWh);
    const nodeKey = `${network}:${nodeId}`;

    // Check absolute thresholds
    if (usage > this.alertThresholds.highUsage) {
      await this.sendAlert("HIGH_USAGE", eventData,
        `⚡ High energy usage detected: ${(usage / 1000).toFixed(3)} kWh on ${network} node ${nodeId}`);
    }

    if (usage < this.alertThresholds.lowUsage) {
      await this.sendAlert("LOW_USAGE", eventData,
        `📉 Unusually low energy usage: ${(usage / 1000).toFixed(3)} kWh on ${network} node ${nodeId}`);
    }

    // Check for usage spikes
    const lastUsage = this.lastUsage.get(nodeKey);
    if (lastUsage && usage > lastUsage * this.alertThresholds.usageSpike) {
      await this.sendAlert("USAGE_SPIKE", eventData,
        `📈 Energy usage spike detected on ${network} node ${nodeId}: ${(usage / 1000).toFixed(3)} kWh (was ${(lastUsage / 1000).toFixed(3)} kWh)`);
    }

    this.lastUsage.set(nodeKey, usage);
  }

  async sendAlert(type, data, message) {
    this.log('warn', `ALERT [${type}]: ${message}`);

    // Send to Slack if configured
    if (this.slackWebhook) {
      try {
        await axios.post(this.slackWebhook, {
          text: `🚨 Open Grid Alert: ${message}`,
          attachments: [{
            color: type === "HIGH_USAGE" || type === "USAGE_SPIKE" ? "danger" : "warning",
            fields: [{
              title: "Event Details",
              value: `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``,
              short: false
            }],
            footer: "Open Grid Energy Monitor",
            ts: Math.floor(Date.now() / 1000)
          }]
        }, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        this.log('error', 'Slack alert failed:', error.message);
      }
    }
  }

  async startListening(networks = null) {
    const targetNetworks = networks || Object.keys(SUPPORTED_NETWORKS);
    
    console.log(`\n🌐 Starting Multi-Chain Energy Monitor Listener`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📋 Target networks: ${targetNetworks.join(", ")}`);
    console.log(`🕒 Started at: ${this.startTime.toISOString()}`);
    console.log(`📁 Data directory: ${this.dataDir}`);
    console.log(`🚨 Alert thresholds: High=${this.alertThresholds.highUsage/1000}kWh, Low=${this.alertThresholds.lowUsage/1000}kWh, Spike=${this.alertThresholds.usageSpike}x`);
    
    if (this.webhookUrl) {
      console.log(`🪝 Webhook configured: ${this.webhookUrl}`);
    }
    
    if (this.slackWebhook) {
      console.log(`💬 Slack alerts configured`);
    }
    
    console.log(`${"=".repeat(60)}\n`);

    const results = [];
    const errors = [];

    for (const network of targetNetworks) {
      try {
        console.log(`🔌 Initializing ${network}...`);
        const result = await this.initializeProvider(network);
        
        if (result) {
          await this.startNetworkListener(network);
          results.push(network);
          console.log(`✅ ${network} listener active`);
        }
        
        // Small delay between network initializations
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to start listener for ${network}: ${error.message}`);
        errors.push({ network, error: error.message });
      }
    }

    console.log(`\n📊 Listener Status:`);
    console.log(`   ✅ Active listeners: ${results.length}/${targetNetworks.length}`);
    console.log(`   ❌ Failed: ${errors.length}/${targetNetworks.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Failed Networks:`);
      errors.forEach(({ network, error }) => {
        console.log(`   🔴 ${network}: ${error}`);
      });
    }

    if (results.length > 0) {
      console.log(`\n🎧 Listening for events on ${results.length} networks...`);
      console.log(`💡 Press Ctrl+C to stop gracefully\n`);
      
      // Start periodic status updates
      this.startStatusUpdates();
    } else {
      console.log(`\n💥 No listeners started successfully!`);
      process.exit(1);
    }

    return { results, errors };
  }

  startStatusUpdates() {
    setInterval(() => {
      this.printStatus();
    }, 300000); // Every 5 minutes
  }

  printStatus() {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    console.log(`\n📊 Status Update - Uptime: ${hours}h ${minutes}m`);
    
    let totalEvents = 0;
    for (const [network, counts] of this.eventCounts.entries()) {
      const networkTotal = counts.DataUpdated + counts.NodeRegistered + counts.NodeDeactivated;
      totalEvents += networkTotal;
      
      if (networkTotal > 0) {
        console.log(`   ${network}: ${counts.DataUpdated} data, ${counts.NodeRegistered} nodes, ${counts.NodeDeactivated} deactivated`);
      }
    }
    
    console.log(`   Total events processed: ${totalEvents}`);
    console.log(`   Active connections: ${this.providers.size}\n`);
  }

  printFinalStats() {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   ⏱️  Total uptime: ${hours}h ${minutes}m`);
    
    let totalEvents = 0;
    for (const [network, counts] of this.eventCounts.entries()) {
      const networkTotal = counts.DataUpdated + counts.NodeRegistered + counts.NodeDeactivated;
      totalEvents += networkTotal;
      console.log(`   📡 ${network}: ${networkTotal} events total`);
    }
    
    console.log(`   🎯 Total events processed: ${totalEvents}`);
    console.log(`   📁 Data saved to: ${this.dataDir}`);
    console.log(`\n👋 Listener stopped gracefully`);
  }

  async stopListening() {
    console.log(`🛑 Stopping all listeners...`);
    
    for (const [network, contract] of this.contracts.entries()) {
      try {
        contract.removeAllListeners();
        const provider = this.providers.get(network);
        if (provider && provider.websocket) {
          provider.websocket.close();
        }
        console.log(`✅ ${network} listener stopped`);
      } catch (error) {
        console.log(`⚠️  Error stopping ${network} listener: ${error.message}`);
      }
    }
  }

  async getHistoricalEvents(network, fromBlock, toBlock = 'latest') {
    const contract = this.contracts.get(network);
    if (!contract) {
      throw new Error(`No contract available for network: ${network}`);
    }

    console.log(`📚 Fetching historical events for ${network} from block ${fromBlock} to ${toBlock}...`);

    try {
      const dataUpdatedFilter = contract.filters.DataUpdated();
      const nodeRegisteredFilter = contract.filters.NodeRegistered();
      const nodeDeactivatedFilter = contract.filters.NodeDeactivated();

      const [dataEvents, nodeEvents, deactivatedEvents] = await Promise.all([
        contract.queryFilter(dataUpdatedFilter, fromBlock, toBlock),
        contract.queryFilter(nodeRegisteredFilter, fromBlock, toBlock),
        contract.queryFilter(nodeDeactivatedFilter, fromBlock, toBlock)
      ]);

      const allEvents = [
        ...dataEvents.map(event => ({ ...event, eventType: 'DataUpdated' })),
        ...nodeEvents.map(event => ({ ...event, eventType: 'NodeRegistered' })),
        ...deactivatedEvents.map(event => ({ ...event, eventType: 'NodeDeactivated' }))
      ].sort((a, b) => a.blockNumber - b.blockNumber);

      console.log(`📊 Found ${allEvents.length} historical events for ${network}`);
      
      // Save historical events
      const historyFile = path.join(this.dataDir, `${network}-history-${fromBlock}-${toBlock}.json`);
      fs.writeFileSync(historyFile, JSON.stringify(allEvents, null, 2));
      
      return allEvents;

    } catch (error) {
      console.error(`❌ Failed to fetch historical events for ${network}:`, error.message);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🎧 Multi-Chain Energy Monitor Event Listener

Usage:
  node listener.js [options] [networks...]

Options:
  --help, -h              Show this help message
  --history FROM [TO]     Fetch historical events from block FROM to TO (default: latest)
  --max-reconnects N      Maximum reconnection attempts (default: 5)
  --reconnect-delay MS    Delay between reconnection attempts in ms (default: 5000)

Examples:
  node listener.js                                    # Listen on all configured networks
  node listener.js polygon arbitrum optimism         # Listen on specific networks
  node listener.js --history 45000000               # Fetch history from block 45M to latest
  node listener.js --history 45000000 45100000      # Fetch history from specific range

Supported Networks:
  ${Object.keys(SUPPORTED_NETWORKS).join(", ")}

Environment Variables:
  Required for each network:
  - {NETWORK}_CONTRACT_ADDRESS: Deployed EnergyMonitor contract address
  - {NETWORK}_RPC_URL: RPC endpoint (WebSocket preferred, HTTP fallback)
  
  Optional:
  - WEBHOOK_URL: HTTP endpoint for event notifications  
  - SLACK_WEBHOOK: Slack webhook URL for alerts
  - LOG_LEVEL: Logging level (error, warn, info, debug) default: info
  - HIGH_USAGE_THRESHOLD: Alert threshold for high usage (default: 5000000)
  - LOW_USAGE_THRESHOLD: Alert threshold for low usage (default: 100000)
  - USAGE_SPIKE_THRESHOLD: Multiplier for usage spike alerts (default: 2.0)

Example .env:
  POLYGON_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
  POLYGON_RPC_URL=wss://polygon-mainnet.infura.io/ws/v3/your_key
  WEBHOOK_URL=https://api.yourdomain.com/webhook/energy-events
  SLACK_WEBHOOK=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
    `);
    process.exit(0);
  }

  try {
    const maxReconnectIndex = args.indexOf("--max-reconnects");
    const maxReconnectAttempts = maxReconnectIndex !== -1 ? parseInt(args[maxReconnectIndex + 1]) : 5;
    
    const reconnectDelayIndex = args.indexOf("--reconnect-delay");
    const reconnectDelay = reconnectDelayIndex !== -1 ? parseInt(args[reconnectDelayIndex + 1]) : 5000;
    
    const historyIndex = args.indexOf("--history");
    
    const networks = args.filter(arg => 
      !arg.startsWith("--") && 
      !arg.match(/^\d+$/) &&
      Object.keys(SUPPORTED_NETWORKS).includes(arg)
    );

    const listener = new MultiChainEnergyListener({
      maxReconnectAttempts,
      reconnectDelay
    });

    if (historyIndex !== -1) {
      const fromBlock = parseInt(args[historyIndex + 1]);
      const toBlock = args[historyIndex + 2] ? parseInt(args[historyIndex + 2]) : 'latest';
      
      if (!fromBlock) {
        console.error("❌ --history requires a starting block number");
        process.exit(1);
      }

      const targetNetworks = networks.length > 0 ? networks : Object.keys(SUPPORTED_NETWORKS);
      
      for (const network of targetNetworks) {
        try {
          await listener.initializeProvider(network);
          await listener.getHistoricalEvents(network, fromBlock, toBlock);
        } catch (error) {
          console.error(`❌ Failed to fetch history for ${network}: ${error.message}`);
        }
      }
    } else {
      await listener.startListening(networks.length > 0 ? networks : null);
    }

  } catch (error) {
    console.error(`💥 Listener failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MultiChainEnergyListener, SUPPORTED_NETWORKS };