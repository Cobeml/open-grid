import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";

// Load environment variables from root .env file
dotenv.config({ path: "../../.env" });

// Helper function to validate and format private key
function getValidPrivateKey(): string[] {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.warn("Warning: No PRIVATE_KEY found in environment variables");
    return [];
  }
  
  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Check if private key has correct length (64 hex characters)
  if (cleanKey.length !== 64) {
    console.warn(`Warning: Private key has incorrect length: ${cleanKey.length} (expected 64)`);
    return [];
  }
  
  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
    console.warn("Warning: Private key contains invalid hex characters");
    return [];
  }
  
  return [`0x${cleanKey}`];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    
    // Primary Mainnets
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 1,
      gasPrice: "auto",
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 137,
      gasPrice: "auto",
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arbitrum-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 42161,
      gasPrice: "auto",
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "https://optimism-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 10,
      gasPrice: "auto",
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: getValidPrivateKey(),
      chainId: 8453,
      gasPrice: "auto",
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      accounts: getValidPrivateKey(),
      chainId: 43114,
      gasPrice: "auto",
    },
    bnb: {
      url: process.env.BNB_RPC_URL || "https://bsc-dataseed1.binance.org",
      accounts: getValidPrivateKey(),
      chainId: 56,
      gasPrice: "auto",
    },
    gnosis: {
      url: process.env.GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
      accounts: getValidPrivateKey(),
      chainId: 100,
      gasPrice: "auto",
    },

    // Additional Hackathon Chains
    zircuit: {
      url: process.env.ZIRCUIT_RPC_URL || "https://zircuit1-mainnet.p2pify.com/",
      accounts: getValidPrivateKey(),
      chainId: 48900,
      gasPrice: "auto",
    },
    flare: {
      url: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/bc/C/rpc",
      accounts: getValidPrivateKey(),
      chainId: 14,
      gasPrice: "auto",
    },
    hedera: {
      url: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
      accounts: getValidPrivateKey(),
      chainId: 295,
      gasPrice: "auto",
    },
    hederaTestnet: {
      url: process.env.HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api",
      accounts: getValidPrivateKey(),
      chainId: 296,
      gasPrice: "auto",
    },
    flow: {
      url: process.env.FLOW_TESTNET_RPC_URL || "https://access-testnet.onflow.org",
      accounts: getValidPrivateKey(),
      chainId: 545,
      gasPrice: "auto",
    },
    flowMainnet: {
      url: process.env.FLOW_MAINNET_RPC_URL || "https://access-mainnet-beta.onflow.org",
      accounts: getValidPrivateKey(),
      chainId: 122,
      gasPrice: "auto",
    },

    // Testnets
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 11155111,
      gasPrice: "auto",
    },
    polygonMumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL || "https://polygon-mumbai.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 80001,
      gasPrice: "auto",
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: getValidPrivateKey(),
      chainId: 80002,
      gasPrice: "auto",
    },
    arbitrumGoerli: {
      url: process.env.ARBITRUM_GOERLI_RPC_URL || "https://arbitrum-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 421613,
      gasPrice: "auto",
    },
    optimismGoerli: {
      url: process.env.OPTIMISM_GOERLI_RPC_URL || "https://optimism-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: getValidPrivateKey(),
      chainId: 420,
      gasPrice: "auto",
    },
    baseGoerli: {
      url: process.env.BASE_GOERLI_RPC_URL || "https://goerli.base.org",
      accounts: getValidPrivateKey(),
      chainId: 84531,
      gasPrice: "auto",
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: getValidPrivateKey(),
      chainId: 84532,
      gasPrice: "auto",
    },
    fuji: {
      url: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: getValidPrivateKey(),
      chainId: 43113,
      gasPrice: "auto",
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: getValidPrivateKey(),
      chainId: 97,
      gasPrice: "auto",
    },
  },
  
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
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
      
      // Testnets
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      arbitrumGoerli: process.env.ARBISCAN_API_KEY || "",
      optimismGoerli: process.env.OPTIMISM_API_KEY || "",
      baseGoerli: process.env.BASESCAN_API_KEY || "",
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "zircuit",
        chainId: 48900,
        urls: {
          apiURL: "https://explorer.zircuit.com/api",
          browserURL: "https://explorer.zircuit.com"
        }
      },
      {
        network: "flare",
        chainId: 14,
        urls: {
          apiURL: "https://flare-explorer.flare.network/api",
          browserURL: "https://flare-explorer.flare.network"
        }
      },
      {
        network: "hedera",
        chainId: 295,
        urls: {
          apiURL: "https://hashscan.io/mainnet/api",
          browserURL: "https://hashscan.io/mainnet"
        }
      }
    ]
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 21,
    showTimeSpent: true,
    showMethodSig: true,
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments",
  },

  mocha: {
    timeout: 300000, // 5 minutes
  },
};

export default config;