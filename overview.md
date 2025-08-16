# Open Grid: Electrical Networking Monitoring System Implementation Plan

## Overview
Open Grid is a decentralized electrical networking monitoring system that ingests electricity data from sources like Con Edison smart meters or custom sensors, pushes it on-chain using Chainlink Functions for secure and verifiable storage, and enables listeners to fetch this data for visualization and automated actions. The frontend is a React app using ethers.js for blockchain interactions and Mapbox for geospatial visualization of smart meter nodes (e.g., locations in data centers, AI training farms, or crypto mining setups). The system supports network management by providing real-time insights into energy usage, anomalies, and triggers for on-chain/off-chain functions (e.g., alerts for overloads).

To maximize eligibility for prizes (e.g., in hackathons like ETHGlobal or Chainlink-specific bounties), the infrastructure is designed for multi-chain deployment on EVM-compatible networks where Chainlink Functions are supported. Based on current Chainlink docs (as of August 2025), supported chains include Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Base, BNB Chain, and Gnosis Chain. We'll use Hardhat for development and deployment, with configurable networks to handle this seamlessly.

The project will be structured as a monorepo using Yarn workspaces or npm for simplicity:
- `/packages/contracts`: Smart contracts and Hardhat setup.
- `/packages/frontend`: React app for visualization.
- `/packages/scripts`: Node.js listeners and data ingestion scripts.
- `/packages/mock-data`: Scripts to generate/load mock sensor data from open datasets.

This allows easy CI/CD and cross-package dependencies while keeping components modular.

## Architecture
- **Data Sources**: Con Edison via UtilityAPI/Green Button (real) or open datasets (mock) like Kaggle Smart Meter or London Households.
- **Ingestion**: Chainlink Functions fetch off-chain data (e.g., via API calls) and push to smart contracts on multiple chains.
- **On-Chain Storage**: Solidity contracts store data (timestamp, kWh, location, node ID) and emit events.
- **Indexing**: The Graph subgraphs for efficient querying across chains.
- **Listeners**: Node.js scripts using ethers.js to listen for events and trigger actions (e.g., update DB or notify).
- **Frontend**: React app with wagmi for blockchain hooks, react-map-gl for Mapbox, displaying nodes as markers/heatmaps.
- **Multi-Chain**: Hardhat config with network-specific env vars (e.g., RPC URLs, private keys). Deployment scripts loop over chains. Chainlink subscriptions per chain.
- **Testing**: Hardhat tests with mock Chainlink, synthetic data generation via numpy (in code_execution tool or local Python).

Deployment Flow:
1. Deploy contracts to each chain via Hardhat.
2. Create Chainlink Functions subscriptions on each chain.
3. Run ingestion jobs (e.g., via Chainlink Automation for scheduling).
4. Frontend: Configurable provider URLs for chain switching.

## Multi-Chain Setup
Use `.env` for secrets (e.g., `POLYGON_RPC_URL`, `ARBITRUM_PRIVATE_KEY`). Hardhat config supports multiple networks out-of-box.

Code Snippet: `hardhat.config.ts`
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Add more: base, avalanche, etc.
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
```

Deployment Script Example: `deploy.js`
```javascript
async function main() {
  const chains = ['polygon', 'arbitrum', 'optimism']; // Add more
  for (const chain of chains) {
    console.log(`Deploying to ${chain}...`);
    // Use hardhat-deploy to deploy EnergyMonitor contract
    await deploy('EnergyMonitor', { from: deployer, log: true, args: [] });
  }
}
```

For Chainlink: Each chain needs a separate subscription ID. Use Chainlink's CLI or scripts to create/manage.

## Smart Contracts
Simple contract to store energy data and emit events. Integrate with Chainlink Functions consumer.

Code Snippet: `packages/contracts/EnergyMonitor.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

contract EnergyMonitor is FunctionsClient, ConfirmedOwner {
    using Functions for Functions.Request;

    struct EnergyData {
        uint256 timestamp;
        uint256 kWh;
        string location; // e.g., "lat:40.7128,lon:-74.0060"
        uint256 nodeId;
    }

    mapping(uint256 => EnergyData) public dataPoints;
    uint256 public dataCount;

    event DataUpdated(uint256 indexed id, uint256 kWh, string location);

    bytes32 public lastRequestId;
    bytes public lastResponse;
    bytes public lastError;

    constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender) {}

    function requestDataUpdate(string calldata source, bytes calldata secrets, string[] calldata args) external onlyOwner {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (secrets.length > 0) req.addRemoteSecrets(secrets);
        if (args.length > 0) req.addArgs(args);

        lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
    }

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        lastResponse = response;
        lastError = err;

        // Parse response (e.g., kWh from UtilityAPI) and store
        uint256 kWh = abi.decode(response, (uint256)); // Simplified
        dataPoints[dataCount] = EnergyData(block.timestamp, kWh, "example-loc", 1);
        emit DataUpdated(dataCount, kWh, "example-loc");
        dataCount++;
    }
}
```

## Data Ingestion
Use Chainlink Functions to fetch from UtilityAPI or mock endpoints. Source JS: GET request to API, return encoded data.

Code Snippet: Example Chainlink Functions Source (JS)
```javascript
const utilityApiKey = secrets.apiKey;
const response = await Functions.makeHttpRequest({
  url: `https://utilityapi.com/api/v2/intervals?meters=12345`,
  headers: { Authorization: `Bearer ${utilityApiKey}` },
});
if (response.error) throw Error("API Error");
const kWh = response.data.usage[0].kwh; // Simplified
return Functions.encodeUint256(kWh);
```

For mocks: Load CSV from open datasets, simulate API.

## Listeners
Node.js script to listen for events across chains.

Code Snippet: `packages/scripts/listener.js`
```javascript
const { ethers } = require("ethers");
const EnergyMonitorABI = [...]; // ABI here

async function main() {
  const providers = {
    polygon: new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL),
    // Add more
  };

  for (const [chain, provider] of Object.entries(providers)) {
    const contract = new ethers.Contract("0xContractAddress", EnergyMonitorABI, provider);
    contract.on("DataUpdated", (id, kWh, location) => {
      console.log(`[${chain}] Update: ID ${id}, kWh ${kWh}, Loc ${location}`);
      // Trigger off-chain action or update DB for frontend
    });
  }
}

main();
```

## Frontend
React app with chain selector.

Code Snippet: `packages/frontend/src/App.js`
```jsx
import { useState } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { polygon, arbitrum } from 'wagmi/chains';
import { ConnectKitProvider } from 'connectkit';
import Map from './MapComponent'; // With react-map-gl

const config = createConfig({
  chains: [polygon, arbitrum /* add more */],
  // Connectors...
});

function App() {
  const [chain, setChain] = useState(polygon.id);
  // Fetch data via wagmi useContractRead or useContractEvent
  return (
    <WagmiConfig config={config}>
      <ConnectKitProvider>
        <select onChange={(e) => setChain(e.target.value)}>
          <option value={polygon.id}>Polygon</option>
          <option value={arbitrum.id}>Arbitrum</option>
        </select>
        <Map chainId={chain} /> {/* Render nodes with data */}
      </ConnectKitProvider>
    </WagmiConfig>
  );
}
```

Map Component: Use react-map-gl to plot locations from on-chain data.

## Deployment and Testing
- Deploy: `npx hardhat deploy --network polygon`
- Test: Hardhat tests with mock Functions.
- Mocks: Use Python/numpy to generate synthetic data or load from CSVs (e.g., Kaggle dataset).
- CI/CD: GitHub Actions to deploy to testnets.

For prizes: Document multi-chain deployments, Chainlink usage, and innovative energy management use case.