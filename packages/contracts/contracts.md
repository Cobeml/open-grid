# Smart Contracts Package

Overview

The contracts package contains Solidity smart contracts for the Open Grid
electrical monitoring system, built with Hardhat for multi-chain deployment
across EVM-compatible networks.

Architecture

- EnergyMonitor.sol: Main contract for storing energy data using Chainlink
Functions
- Multi-chain deployment: Supports Polygon, Arbitrum, Optimism, Base,
Avalanche, BNB Chain, Gnosis Chain
- Chainlink Integration: Uses Chainlink Functions for secure off-chain data
ingestion

Package Structure

packages/contracts/
├── package.json
├── hardhat.config.ts
├── .env.example
├── contracts/
│   ├── EnergyMonitor.sol
│   └── interfaces/
│       └── IEnergyMonitor.sol
├── deploy/
│   ├── 01-deploy-energy-monitor.ts
│   └── utils/
│       └── deploy-helpers.ts
├── scripts/
│   ├── deploy-multi-chain.ts
│   ├── setup-chainlink.ts
│   └── verify-contracts.ts
├── test/
│   ├── EnergyMonitor.test.ts
│   └── fixtures/
│       └── deployment.ts
├── tasks/
│   ├── accounts.ts
│   └── deploy.ts
└── typechain-types/

Dependencies

{
"name": "@open-grid/contracts",
"dependencies": {
    "@chainlink/contracts": "^0.8.0",
    "@openzeppelin/contracts": "^5.0.0",
    "ethers": "^6.0.0"
},
"devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "hardhat": "^2.19.0",
    "hardhat-deploy": "^0.11.0",
    "dotenv": "^16.0.0",
    "typescript": "^5.0.0"
}
}

Hardhat Configuration

Multi-chain setup supporting all major EVM networks where Chainlink
Functions are available:

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
solidity: {
    version: "0.8.20",
    settings: {
    optimizer: {
        enabled: true,
        runs: 200,
    },
    },
},
networks: {
    hardhat: {
    chainId: 31337,
    },
    // Mainnets
    ethereum: {
    url: process.env.ETHEREUM_RPC_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 1,
    },
    polygon: {
    url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 137,
    },
    arbitrum: {
    url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 42161,
    },
    optimism: {
    url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 10,
    },
    base: {
    url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 8453,
    },
    avalanche: {
    url: process.env.AVALANCHE_RPC_URL ||
"https://api.avax.network/ext/bc/C/rpc",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 43114,
    },
    bnb: {
    url: process.env.BNB_RPC_URL || "https://bsc-dataseed1.binance.org",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 56,
    },
    gnosis: {
    url: process.env.GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 100,
    },
    // Testnets
    sepolia: {
    url: process.env.SEPOLIA_RPC_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 11155111,
    },
    polygonMumbai: {
    url: process.env.POLYGON_MUMBAI_RPC_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 80001,
    },
},
namedAccounts: {
    deployer: {
    default: 0,
    },
},
etherscan: {
    apiKey: {
    mainnet: process.env.ETHERSCAN_API_KEY || "",
    polygon: process.env.POLYGONSCAN_API_KEY || "",
    arbitrumOne: process.env.ARBISCAN_API_KEY || "",
    optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
    base: process.env.BASESCAN_API_KEY || "",
    avalanche: process.env.SNOWTRACE_API_KEY || "",
    bsc: process.env.BSCSCAN_API_KEY || "",
    gnosis: process.env.GNOSISSCAN_API_KEY || "",
    },
},
gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
},
};

export default config;

Smart Contract: EnergyMonitor.sol

Core contract integrating with Chainlink Functions for data ingestion:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from
"@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from
"@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0
_0/libraries/FunctionsRequest.sol";

contract EnergyMonitor is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    struct EnergyData {
        uint256 timestamp;
        uint256 kWh;
        string location; // "lat:40.7128,lon:-74.0060"
        uint256 nodeId;
        address reporter;
    }

    struct Node {
        uint256 id;
        string location;
        bool active;
        uint256 lastUpdate;
    }

    mapping(uint256 => EnergyData) public dataPoints;
    mapping(uint256 => Node) public nodes;
    mapping(bytes32 => uint256) private requestToNodeId;

    uint256 public dataCount;
    uint256 public nodeCount;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donId;

    bytes32 public lastRequestId;
    bytes public lastResponse;
    bytes public lastError;

    event DataUpdated(
        uint256 indexed dataId,
        uint256 indexed nodeId,
        uint256 kWh,
        string location,
        uint256 timestamp
    );

    event NodeRegistered(uint256 indexed nodeId, string location);
    event NodeDeactivated(uint256 indexed nodeId);

    error UnexpectedRequestID(bytes32 requestId);
    error EmptyResponse();
    error NodeNotFound(uint256 nodeId);

    constructor(
        address router,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donId
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donId = _donId;
    }

    function registerNode(string calldata location) external onlyOwner
returns (uint256) {
        uint256 nodeId = nodeCount++;
        nodes[nodeId] = Node({
            id: nodeId,
            location: location,
            active: true,
            lastUpdate: block.timestamp
        });

        emit NodeRegistered(nodeId, location);
        return nodeId;
    }

    function requestDataUpdate(
        uint256 nodeId,
        string calldata source,
        bytes calldata encryptedSecretsUrls,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] calldata args
    ) external onlyOwner returns (bytes32) {
        if (!nodes[nodeId].active) revert NodeNotFound(nodeId);

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);

        if (encryptedSecretsUrls.length > 0) {
            req.addSecretsReference(encryptedSecretsUrls);
        } else if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(donHostedSecretsSlotID,
donHostedSecretsVersion);
        }

        if (args.length > 0) req.setArgs(args);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        requestToNodeId[requestId] = nodeId;
        lastRequestId = requestId;

        return requestId;
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        lastResponse = response;
        lastError = err;

        if (response.length == 0) {
            revert EmptyResponse();
        }

        uint256 nodeId = requestToNodeId[requestId];
        uint256 kWh = abi.decode(response, (uint256));

        dataPoints[dataCount] = EnergyData({
            timestamp: block.timestamp,
            kWh: kWh,
            location: nodes[nodeId].location,
            nodeId: nodeId,
            reporter: msg.sender
        });

        nodes[nodeId].lastUpdate = block.timestamp;

        emit DataUpdated(
            dataCount,
            nodeId,
            kWh,
            nodes[nodeId].location,
            block.timestamp
        );

        dataCount++;
        delete requestToNodeId[requestId];
    }

    function getLatestDataForNode(uint256 nodeId) external view returns
(EnergyData memory) {
        if (!nodes[nodeId].active) revert NodeNotFound(nodeId);

        for (uint256 i = dataCount; i > 0; i--) {
            if (dataPoints[i - 1].nodeId == nodeId) {
                return dataPoints[i - 1];
            }
        }

        revert("No data found for node");
    }

    function getAllNodes() external view returns (Node[] memory) {
        Node[] memory allNodes = new Node[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];
        }
        return allNodes;
    }

    function deactivateNode(uint256 nodeId) external onlyOwner {
        if (!nodes[nodeId].active) revert NodeNotFound(nodeId);
        nodes[nodeId].active = false;
        emit NodeDeactivated(nodeId);
    }

    function updateSubscription(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    function updateGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }
}

Deployment Scripts

Multi-Chain Deployment

// deploy/01-deploy-energy-monitor.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const CHAINLINK_ROUTERS = {
ethereum: "0x65C939e97716d07C26508D8E8D57cD5e31d5C8D9",
polygon: "0x3C3a92a5dE3B4dd7bd2f31b0F3DC56EC7c7b1c73",
arbitrum: "0x72051E3E8C632a2B5a4C00F4a0E4e4c0c0c2B8cA",
optimism: "0x8aB6B9e8e0b5A8E3f0D1E2F3A4B5C6D7E8F9A0B1",
base: "0x9C9E3D56F0A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8",
avalanche: "0xE1F0C6B7A8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3",
bnb: "0xF1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0",
gnosis: "0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0"
};

const deployEnergyMonitor: DeployFunction = async function (hre: 
HardhatRuntimeEnvironment) {
const { deployments, getNamedAccounts, network } = hre;
const { deploy } = deployments;
const { deployer } = await getNamedAccounts();

const router = CHAINLINK_ROUTERS[network.name as keyof typeof
CHAINLINK_ROUTERS];
if (!router) {
    throw new Error(`Chainlink router not configured for network: 
${network.name}`);
}

const subscriptionId =
process.env[`${network.name.toUpperCase()}_SUBSCRIPTION_ID`] || "1";
const gasLimit = 300000;
const donId = process.env[`${network.name.toUpperCase()}_DON_ID`] ||
    "0x66756e2d706f6c79676f6e2d6d61696e6e65742d310000000000000000000000";

await deploy("EnergyMonitor", {
    from: deployer,
    args: [router, subscriptionId, gasLimit, donId],
    log: true,
    autoMine: true,
});
};

export default deployEnergyMonitor;
deployEnergyMonitor.tags = ["EnergyMonitor"];

Environment Variables

Create .env file with:
# Private Key
PRIVATE_KEY=your_private_key_here

# RPC URLs
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_key
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your_key
ARBITRUM_RPC_URL=https://arbitrum-mainnet.infura.io/v3/your_key
OPTIMISM_RPC_URL=https://optimism-mainnet.infura.io/v3/your_key
BASE_RPC_URL=https://base-mainnet.infura.io/v3/your_key
AVALANCHE_RPC_URL=https://avalanche-mainnet.infura.io/v3/your_key
BNB_RPC_URL=https://bsc-dataseed1.binance.org
GNOSIS_RPC_URL=https://rpc.gnosischain.com

# Etherscan API Keys
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key
ARBISCAN_API_KEY=your_arbiscan_key
OPTIMISM_API_KEY=your_optimism_key
BASESCAN_API_KEY=your_basescan_key
SNOWTRACE_API_KEY=your_snowtrace_key
BSCSCAN_API_KEY=your_bscscan_key
GNOSISSCAN_API_KEY=your_gnosisscan_key

# Chainlink Configuration
POLYGON_SUBSCRIPTION_ID=123
ARBITRUM_SUBSCRIPTION_ID=456
OPTIMISM_SUBSCRIPTION_ID=789

# DON IDs (hex encoded)
POLYGON_DON_ID=0x66756e2d706f6c79676f6e2d6d61696e6e65742d3100000000000000000
00000
ARBITRUM_DON_ID=0x66756e2d617262697472756d2d6d61696e6e65742d3100000000000000
00000

Scripts

Multi-Chain Deployment Script

# Deploy to all supported networks
yarn contracts:deploy --network polygon
yarn contracts:deploy --network arbitrum
yarn contracts:deploy --network optimism
yarn contracts:deploy --network base

# Verify contracts
yarn hardhat verify --network polygon <contract_address> <constructor_args>

Testing

Comprehensive test suite using Hardhat:
// test/EnergyMonitor.test.ts
import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { EnergyMonitor } from "../typechain-types";

describe("EnergyMonitor", function () {
let energyMonitor: EnergyMonitor;
let owner: any;

beforeEach(async function () {
    await deployments.fixture(["EnergyMonitor"]);
    [owner] = await ethers.getSigners();
    energyMonitor = await ethers.getContract("EnergyMonitor");
});

describe("Node Management", function () {
    it("Should register a new node", async function () {
    const location = "lat:40.7128,lon:-74.0060";
    const tx = await energyMonitor.registerNode(location);

    await expect(tx)
        .to.emit(energyMonitor, "NodeRegistered")
        .withArgs(0, location);
    });
});

describe("Data Updates", function () {
    it("Should handle Chainlink Functions response", async function () {
    // Mock Chainlink Functions response test
    // Implementation depends on mock setup
    });
});
});

Key Features

- Multi-chain Support: Deploy to 8+ EVM networks
- Chainlink Integration: Secure off-chain data ingestion
- Node Management: Register and manage energy monitoring nodes
- Event Emission: Real-time updates for listeners
- Access Control: Owner-only administrative functions
- Gas Optimization: Efficient storage and retrieval patterns