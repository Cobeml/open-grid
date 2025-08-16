# Scripts Package

  Overview

  The scripts package contains Node.js applications for data ingestion and
  event listening across multiple blockchain networks. This package handles
  the bridge between off-chain data sources and on-chain smart contracts.

  Architecture

  - Data Ingestion: Fetches electricity data from UtilityAPI, Con Edison, or
  mock sources
  - Multi-Chain Listeners: Monitor contract events across all supported
  networks
  - Chainlink Functions: Execute off-chain computations and data fetching
  - Event Processing: Handle blockchain events and trigger off-chain actions

  Package Structure

  packages/scripts/
  ├── package.json
  ├── tsconfig.json
  ├── .env.example
  ├── src/
  │   ├── ingestion/
  │   │   ├── index.ts
  │   │   ├── sources/
  │   │   │   ├── utility-api.ts
  │   │   │   ├── con-edison.ts
  │   │   │   └── mock-data.ts
  │   │   ├── chainlink/
  │   │   │   ├── functions-source.js
  │   │   │   ├── secrets-manager.ts
  │   │   │   └── request-builder.ts
  │   │   └── scheduler.ts
  │   ├── listeners/
  │   │   ├── index.ts
  │   │   ├── multi-chain-listener.ts
  │   │   ├── event-processor.ts
  │   │   └── handlers/
  │   │       ├── data-updated.ts
  │   │       ├── node-registered.ts
  │   │       └── alert-manager.ts
  │   ├── utils/
  │   │   ├── config.ts
  │   │   ├── logger.ts
  │   │   ├── retry.ts
  │   │   └── validation.ts
  │   └── types/
  │       ├── energy-data.ts
  │       ├── network-config.ts
  │       └── chainlink.ts
  ├── scripts/
  │   ├── setup-subscriptions.ts
  │   ├── deploy-functions.ts
  │   └── health-check.ts
  └── config/
      ├── networks.json
      ├── chainlink-config.json
      └── data-sources.json

  Dependencies

  {
    "name": "@open-grid/scripts",
    "dependencies": {
      "ethers": "^6.0.0",
      "axios": "^1.6.0",
      "dotenv": "^16.0.0",
      "winston": "^3.11.0",
      "node-cron": "^3.0.3",
      "@chainlink/functions-toolkit": "^0.2.0",
      "csv-parser": "^3.0.0",
      "fs-extra": "^11.0.0"
    },
    "devDependencies": {
      "@types/node": "^20.0.0",
      "@types/node-cron": "^3.0.0",
      "typescript": "^5.0.0",
      "ts-node": "^10.9.0",
      "nodemon": "^3.0.0"
    }
  }

  Configuration Management

  // src/utils/config.ts
  import * as dotenv from "dotenv";

  dotenv.config();

  export interface NetworkConfig {
    name: string;
    rpcUrl: string;
    chainId: number;
    contractAddress: string;
    subscriptionId?: string;
    donId?: string;
  }

  export interface DataSourceConfig {
    type: "utility-api" | "con-edison" | "mock";
    apiKey?: string;
    baseUrl?: string;
    endpoints?: Record<string, string>;
  }

  export const NETWORKS: NetworkConfig[] = [
    {
      name: "polygon",
      rpcUrl: process.env.POLYGON_RPC_URL!,
      chainId: 137,
      contractAddress: process.env.POLYGON_CONTRACT_ADDRESS!,
      subscriptionId: process.env.POLYGON_SUBSCRIPTION_ID,
      donId: process.env.POLYGON_DON_ID,
    },
    {
      name: "arbitrum",
      rpcUrl: process.env.ARBITRUM_RPC_URL!,
      chainId: 42161,
      contractAddress: process.env.ARBITRUM_CONTRACT_ADDRESS!,
      subscriptionId: process.env.ARBITRUM_SUBSCRIPTION_ID,
      donId: process.env.ARBITRUM_DON_ID,
    },
    {
      name: "optimism",
      rpcUrl: process.env.OPTIMISM_RPC_URL!,
      chainId: 10,
      contractAddress: process.env.OPTIMISM_CONTRACT_ADDRESS!,
      subscriptionId: process.env.OPTIMISM_SUBSCRIPTION_ID,
      donId: process.env.OPTIMISM_DON_ID,
    },
    {
      name: "base",
      rpcUrl: process.env.BASE_RPC_URL!,
      chainId: 8453,
      contractAddress: process.env.BASE_CONTRACT_ADDRESS!,
      subscriptionId: process.env.BASE_SUBSCRIPTION_ID,
      donId: process.env.BASE_DON_ID,
    },
  ];

  export const DATA_SOURCES: DataSourceConfig[] = [
    {
      type: "utility-api",
      apiKey: process.env.UTILITY_API_KEY,
      baseUrl: "https://utilityapi.com/api/v2",
      endpoints: {
        intervals: "/intervals",
        meters: "/meters",
      },
    },
    {
      type: "con-edison",
      apiKey: process.env.CON_EDISON_API_KEY,
      baseUrl: "https://api.coned.com/v1",
      endpoints: {
        usage: "/usage",
        demand: "/demand",
      },
    },
    {
      type: "mock",
      baseUrl: "./mock-data",
    },
  ];

  Data Ingestion

  Main Ingestion Service

  // src/ingestion/index.ts
  import { ethers } from "ethers";
  import { UtilityAPISource } from "./sources/utility-api";
  import { ConEdisonSource } from "./sources/con-edison";
  import { MockDataSource } from "./sources/mock-data";
  import { ChainlinkFunctionsManager } from "./chainlink/request-builder";
  import { NETWORKS, DATA_SOURCES } from "../utils/config";
  import { logger } from "../utils/logger";
  import { EnergyData } from "../types/energy-data";

  export class DataIngestionService {
    private providers: Map<string, ethers.JsonRpcProvider> = new Map();
    private contracts: Map<string, ethers.Contract> = new Map();
    private dataSources: Map<string, any> = new Map();
    private chainlinkManager: ChainlinkFunctionsManager;

    constructor() {
      this.initializeProviders();
      this.initializeDataSources();
      this.chainlinkManager = new ChainlinkFunctionsManager();
    }

    private initializeProviders(): void {
      NETWORKS.forEach(network => {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        this.providers.set(network.name, provider);

        const contract = new ethers.Contract(
          network.contractAddress,
          require("../../abi/EnergyMonitor.json"),
          provider
        );
        this.contracts.set(network.name, contract);
      });
    }

    private initializeDataSources(): void {
      DATA_SOURCES.forEach(source => {
        switch (source.type) {
          case "utility-api":
            this.dataSources.set("utility-api", new UtilityAPISource(source));
            break;
          case "con-edison":
            this.dataSources.set("con-edison", new ConEdisonSource(source));
            break;
          case "mock":
            this.dataSources.set("mock", new MockDataSource(source));
            break;
        }
      });
    }

    async ingestData(
      sourceType: string,
      networkName: string,
      nodeId: number
    ): Promise<void> {
      try {
        const dataSource = this.dataSources.get(sourceType);
        if (!dataSource) {
          throw new Error(`Data source ${sourceType} not found`);
        }

        const network = NETWORKS.find(n => n.name === networkName);
        if (!network) {
          throw new Error(`Network ${networkName} not configured`);
        }

        // Fetch data from external source
        const energyData: EnergyData = await
  dataSource.fetchLatestData(nodeId);

        logger.info(`Fetched energy data for node ${nodeId}:`, energyData);

        // Submit via Chainlink Functions
        await this.submitViaChainlinkFunctions(
          networkName,
          nodeId,
          energyData
        );

      } catch (error) {
        logger.error(`Ingestion failed for ${sourceType}/${networkName}:`,
  error);
        throw error;
      }
    }

    private async submitViaChainlinkFunctions(
      networkName: string,
      nodeId: number,
      data: EnergyData
    ): Promise<void> {
      const network = NETWORKS.find(n => n.name === networkName);
      if (!network || !network.subscriptionId) {
        throw new Error(`Chainlink not configured for ${networkName}`);
      }

      const requestId = await this.chainlinkManager.submitRequest(
        networkName,
        nodeId,
        data
      );

      logger.info(`Chainlink Functions request submitted: ${requestId}`);
    }

    async startScheduledIngestion(): void {
      const cron = require("node-cron");

      // Run every 15 minutes
      cron.schedule("*/15 * * * *", async () => {
        logger.info("Starting scheduled data ingestion");

        for (const network of NETWORKS) {
          try {
            // Ingest data for all nodes on each network
            await this.ingestData("utility-api", network.name, 1);
            await this.ingestData("mock", network.name, 2);
          } catch (error) {
            logger.error(`Scheduled ingestion failed for ${network.name}:`,
  error);
          }
        }
      });

      logger.info("Scheduled ingestion started");
    }
  }

  UtilityAPI Data Source

  // src/ingestion/sources/utility-api.ts
  import axios from "axios";
  import { EnergyData } from "../../types/energy-data";
  import { DataSourceConfig } from "../../utils/config";
  import { logger } from "../../utils/logger";

  export class UtilityAPISource {
    private config: DataSourceConfig;

    constructor(config: DataSourceConfig) {
      this.config = config;
    }

    async fetchLatestData(nodeId: number): Promise<EnergyData> {
      try {
        const response = await axios.get(
          `${this.config.baseUrl}${this.config.endpoints?.intervals}`,
          {
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
            },
            params: {
              meters: this.getMeterIdForNode(nodeId),
              limit: 1,
              order: "desc",
            },
          }
        );

        const interval = response.data.intervals[0];

        return {
          timestamp: new Date(interval.start).getTime(),
          kWh: Math.round(interval.kwh * 1000), // Convert to Wei-like units
          location: await this.getLocationForNode(nodeId),
          nodeId,
          source: "utility-api",
        };
      } catch (error) {
        logger.error("UtilityAPI fetch failed:", error);
        throw error;
      }
    }

    private getMeterIdForNode(nodeId: number): string {
      // Map node IDs to actual meter IDs
      const meterMap: Record<number, string> = {
        1: process.env.UTILITY_API_METER_1 || "meter_123",
        2: process.env.UTILITY_API_METER_2 || "meter_456",
      };
      return meterMap[nodeId] || "default_meter";
    }

    private async getLocationForNode(nodeId: number): Promise<string> {
      // Return GPS coordinates for the node
      const locationMap: Record<number, string> = {
        1: "lat:40.7128,lon:-74.0060", // NYC
        2: "lat:34.0522,lon:-118.2437", // LA
      };
      return locationMap[nodeId] || "lat:0,lon:0";
    }
  }

  Chainlink Functions Source Code

  // src/ingestion/chainlink/functions-source.js
  // This JavaScript code runs in Chainlink Functions DON

  const utilityApiKey = secrets.apiKey;
  const nodeId = args[0];
  const meterIds = {
    "1": "meter_123",
    "2": "meter_456"
  };

  if (!utilityApiKey) {
    throw Error("UtilityAPI key required");
  }

  const meterId = meterIds[nodeId] || "default_meter";

  const utilityApiRequest = Functions.makeHttpRequest({
    url: `https://utilityapi.com/api/v2/intervals?meters=${meterId}&limit=1&or
  der=desc`,
    headers: {
      Authorization: `Bearer ${utilityApiKey}`,
    },
  });

  const [utilityResponse] = await Promise.all([utilityApiRequest]);

  if (utilityResponse.error) {
    console.error("UtilityAPI Error:", utilityResponse.error);
    throw Error(`UtilityAPI request failed`);
  }

  const interval = utilityResponse.data.intervals[0];
  if (!interval) {
    throw Error("No interval data available");
  }

  // Convert kWh to integer (multiply by 1000 for precision)
  const kWh = Math.round(interval.kwh * 1000);

  // Return encoded uint256
  return Functions.encodeUint256(kWh);

  Multi-Chain Event Listener

  Main Listener Service

  // src/listeners/multi-chain-listener.ts
  import { ethers } from "ethers";
  import { NETWORKS } from "../utils/config";
  import { DataUpdatedHandler } from "./handlers/data-updated";
  import { NodeRegisteredHandler } from "./handlers/node-registered";
  import { AlertManager } from "./handlers/alert-manager";
  import { logger } from "../utils/logger";

  export class MultiChainListener {
    private providers: Map<string, ethers.JsonRpcProvider> = new Map();
    private contracts: Map<string, ethers.Contract> = new Map();
    private handlers: Map<string, any> = new Map();
    private alertManager: AlertManager;

    constructor() {
      this.initializeProviders();
      this.initializeHandlers();
      this.alertManager = new AlertManager();
    }

    private initializeProviders(): void {
      NETWORKS.forEach(network => {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        this.providers.set(network.name, provider);

        const contract = new ethers.Contract(
          network.contractAddress,
          require("../../abi/EnergyMonitor.json"),
          provider
        );
        this.contracts.set(network.name, contract);
      });
    }

    private initializeHandlers(): void {
      this.handlers.set("DataUpdated", new DataUpdatedHandler());
      this.handlers.set("NodeRegistered", new NodeRegisteredHandler());
    }

    async startListening(): Promise<void> {
      logger.info("Starting multi-chain event listeners");

      for (const [networkName, contract] of this.contracts.entries()) {
        try {
          // Listen for DataUpdated events
          contract.on("DataUpdated", async (dataId, nodeId, kWh, location,
  timestamp, event) => {
            const eventData = {
              network: networkName,
              dataId: dataId.toString(),
              nodeId: nodeId.toString(),
              kWh: kWh.toString(),
              location,
              timestamp: timestamp.toString(),
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
            };

            logger.info(`[${networkName}] DataUpdated event:`, eventData);

            try {
              await this.handlers.get("DataUpdated").handle(eventData);
              await this.alertManager.checkThresholds(eventData);
            } catch (error) {
              logger.error(`Handler failed for DataUpdated on 
  ${networkName}:`, error);
            }
          });

          // Listen for NodeRegistered events
          contract.on("NodeRegistered", async (nodeId, location, event) => {
            const eventData = {
              network: networkName,
              nodeId: nodeId.toString(),
              location,
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
            };

            logger.info(`[${networkName}] NodeRegistered event:`, eventData);

            try {
              await this.handlers.get("NodeRegistered").handle(eventData);
            } catch (error) {
              logger.error(`Handler failed for NodeRegistered on 
  ${networkName}:`, error);
            }
          });

          // Listen for NodeDeactivated events
          contract.on("NodeDeactivated", async (nodeId, event) => {
            logger.info(`[${networkName}] Node ${nodeId} deactivated`);
            await this.alertManager.nodeDeactivated(networkName,
  nodeId.toString());
          });

          logger.info(`Listeners started for ${networkName}`);
        } catch (error) {
          logger.error(`Failed to start listener for ${networkName}:`, error);
        }
      }
    }

    async getHistoricalEvents(
      networkName: string,
      eventName: string,
      fromBlock: number,
      toBlock: number = -1
    ): Promise<any[]> {
      const contract = this.contracts.get(networkName);
      if (!contract) {
        throw new Error(`Contract not found for network: ${networkName}`);
      }

      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => ({
        network: networkName,
        event: event.eventName,
        args: event.args,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      }));
    }

    async stopListening(): Promise<void> {
      logger.info("Stopping all listeners");

      for (const contract of this.contracts.values()) {
        contract.removeAllListeners();
      }
    }
  }

  Event Handlers

  // src/listeners/handlers/data-updated.ts
  import { logger } from "../../utils/logger";
  import fs from "fs-extra";
  import path from "path";

  export class DataUpdatedHandler {
    private dataStorage: string;

    constructor() {
      this.dataStorage = path.join(process.cwd(), "data",
  "energy-updates.jsonl");
      fs.ensureDirSync(path.dirname(this.dataStorage));
    }

    async handle(eventData: any): Promise<void> {
      try {
        // Store to local file (could be database in production)
        const record = {
          ...eventData,
          processedAt: new Date().toISOString(),
        };

        await fs.appendFile(
          this.dataStorage,
          JSON.stringify(record) + "\n"
        );

        // Trigger any downstream processes
        await this.notifyDownstreamSystems(eventData);

        logger.info(`Processed DataUpdated event for node 
  ${eventData.nodeId}`);
      } catch (error) {
        logger.error("DataUpdated handler error:", error);
        throw error;
      }
    }

    private async notifyDownstreamSystems(eventData: any): Promise<void> {
      // Send to webhook, database, or other systems
      // Example: notify frontend via WebSocket
      if (process.env.WEBHOOK_URL) {
        const axios = require("axios");
        try {
          await axios.post(process.env.WEBHOOK_URL, {
            type: "energy_update",
            data: eventData,
          });
        } catch (error) {
          logger.warn("Webhook notification failed:", error.message);
        }
      }
    }
  }

  Alert Manager

  // src/listeners/handlers/alert-manager.ts
  import { logger } from "../../utils/logger";

  export class AlertManager {
    private thresholds = {
      highUsage: 5000, // kWh * 1000
      lowUsage: 100,
      usageSpike: 2.0, // 2x increase
    };

    private lastUsage: Map<string, number> = new Map();

    async checkThresholds(eventData: any): Promise<void> {
      const { network, nodeId, kWh } = eventData;
      const usage = parseInt(kWh);
      const nodeKey = `${network}:${nodeId}`;

      // Check absolute thresholds
      if (usage > this.thresholds.highUsage) {
        await this.sendAlert("HIGH_USAGE", eventData,
          `High energy usage detected: ${usage / 1000} kWh`);
      }

      if (usage < this.thresholds.lowUsage) {
        await this.sendAlert("LOW_USAGE", eventData,
          `Unusually low energy usage: ${usage / 1000} kWh`);
      }

      // Check for usage spikes
      const lastUsage = this.lastUsage.get(nodeKey);
      if (lastUsage && usage > lastUsage * this.thresholds.usageSpike) {
        await this.sendAlert("USAGE_SPIKE", eventData,
          `Energy usage spike detected: ${usage / 1000} kWh (was ${lastUsage /
   1000} kWh)`);
      }

      this.lastUsage.set(nodeKey, usage);
    }

    async nodeDeactivated(network: string, nodeId: string): Promise<void> {
      await this.sendAlert("NODE_DEACTIVATED", { network, nodeId },
        `Node ${nodeId} on ${network} has been deactivated`);
    }

    private async sendAlert(type: string, data: any, message: string):
  Promise<void> {
      logger.warn(`ALERT [${type}]: ${message}`, data);

      // Send to external alerting systems
      if (process.env.SLACK_WEBHOOK) {
        try {
          const axios = require("axios");
          await axios.post(process.env.SLACK_WEBHOOK, {
            text: `🚨 Open Grid Alert: ${message}`,
            attachments: [{
              color: "danger",
              fields: [{
                title: "Details",
                value: JSON.stringify(data, null, 2),
                short: false,
              }],
            }],
          });
        } catch (error) {
          logger.error("Slack alert failed:", error);
        }
      }
    }
  }

  Environment Variables

  # Network RPC URLs
  POLYGON_RPC_URL=wss://polygon-mainnet.infura.io/ws/v3/your_key
  ARBITRUM_RPC_URL=wss://arbitrum-mainnet.infura.io/ws/v3/your_key
  OPTIMISM_RPC_URL=wss://optimism-mainnet.infura.io/ws/v3/your_key
  BASE_RPC_URL=wss://base-mainnet.infura.io/ws/v3/your_key

  # Contract Addresses (deployed contracts)
  POLYGON_CONTRACT_ADDRESS=0x...
  ARBITRUM_CONTRACT_ADDRESS=0x...
  OPTIMISM_CONTRACT_ADDRESS=0x...
  BASE_CONTRACT_ADDRESS=0x...

  # Chainlink Configuration
  POLYGON_SUBSCRIPTION_ID=123
  ARBITRUM_SUBSCRIPTION_ID=456
  POLYGON_DON_ID=0x66756e2d706f6c79676f6e2d6d61696e6e65742d31
  ARBITRUM_DON_ID=0x66756e2d617262697472756d2d6d61696e6e65742d31

  # Data Sources
  UTILITY_API_KEY=your_utility_api_key
  CON_EDISON_API_KEY=your_con_edison_key
  UTILITY_API_METER_1=meter_id_1
  UTILITY_API_METER_2=meter_id_2

  # Alerting
  SLACK_WEBHOOK=https://hooks.slack.com/services/...
  WEBHOOK_URL=https://your-frontend.com/api/webhooks/energy-updates

  # Logging
  LOG_LEVEL=info
  LOG_FILE=./logs/scripts.log

  CLI Scripts

  {
    "scripts": {
      "build": "tsc",
      "dev": "nodemon --exec ts-node src/index.ts",
      "start": "node dist/index.js",
      "listen": "ts-node src/listeners/index.ts",
      "ingest": "ts-node src/ingestion/index.ts",
      "ingest:schedule": "ts-node src/ingestion/scheduler.ts",
      "setup:subscriptions": "ts-node scripts/setup-subscriptions.ts",
      "health": "ts-node scripts/health-check.ts",
      "test": "jest",
      "lint": "eslint src/**/*.ts"
    }
  }

  Key Features

  - Multi-Chain Support: Monitor events across 8+ EVM networks simultaneously
  - Robust Data Ingestion: UtilityAPI, Con Edison, and mock data sources
  - Chainlink Functions Integration: Secure off-chain computations
  - Real-time Alerting: Threshold-based monitoring and notifications
  - Event Processing: Structured handling of blockchain events
  - Scheduled Operations: Automated data collection and processing
  - Error Handling: Comprehensive logging and retry mechanisms
  - Scalable Architecture: Modular design for easy extension