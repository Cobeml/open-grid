# Open Grid: Decentralized Electrical Network Monitoring

A decentralized electrical networking monitoring system that ingests electricity data from smart meters and sensors, stores it on-chain using Chainlink Functions, and enables cross-chain data transmission via LayerZero.

## 🏗️ Architecture

- **Data Sources**: Con Edison smart meters via UtilityAPI or mock datasets
- **On-Chain Storage**: Smart contracts store energy data (timestamp, kWh, location, node ID)
- **Cross-Chain Communication**: LayerZero enables data transmission between networks
- **Frontend**: React app with Mapbox for geospatial visualization of smart meter nodes
- **Multi-Chain Support**: Deployed across Polygon Amoy, Flow Testnet, and Base Sepolia

## 🔗 Contract Deployments

### Polygon Amoy (Chainlink Functions)
- **Contract**: [0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB](https://amoy.polygonscan.com/address/0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB)
- **Purpose**: Primary data ingestion using Chainlink Functions to fetch external energy data
- **Technology**: Chainlink Functions for secure off-chain computation

### Flow Testnet
- **Contract 1**: [0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2](https://evm-testnet.flowscan.io/address/0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2)
- **Contract 2**: [0xebC3804cD5ea34518035D92e229F17F0d93e75D7](https://evm-testnet.flowscan.io/address/0xebC3804cD5ea34518035D92e229F17F0d93e75D7)
- **Purpose**: Energy data storage and processing on Flow blockchain

### Base Sepolia (Cross-Chain Receiver)
- **Contract**: [0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6](https://sepolia.basescan.org/address/0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6)
- **Purpose**: Receives cross-chain data transmissions from Polygon Amoy
- **Technology**: LayerZero for secure cross-chain messaging

## 🌉 Cross-Chain Data Flow

Data flows from Polygon Amoy → Base Sepolia using LayerZero:
- **Completed Transaction**: [0xb6115f2ec498182b27019546a08be37c1f661de67647e2781615cf41723b4280](https://testnet.layerzeroscan.com/tx/0xb6115f2ec498182b27019546a08be37c1f661de67647e2781615cf41723b4280)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Deploy contracts
cd packages/contracts
npx hardhat deploy --network polygon-amoy

# Start frontend
cd packages/frontend
npm run dev
```

## 📁 Project Structure

```
packages/
├── contracts/     # Smart contracts and deployment scripts
├── frontend/      # React app with Mapbox visualization
├── scripts/       # Data ingestion and listener scripts
└── mock-data/     # Mock sensor data generation
```

## 🔧 Technologies

- **Blockchain**: Polygon Amoy, Flow Testnet, Base Sepolia
- **Cross-Chain**: LayerZero
- **Oracle**: Chainlink Functions
- **Frontend**: React, wagmi, react-map-gl
- **Development**: Hardhat, TypeScript

## 📖 Documentation

For detailed implementation information, see [overview.md](./overview.md).

## 🔗 Resources

- [Chainlink Functions Documentation](https://functions.chain.link/polygon-amoy)
- [LayerZero Documentation](https://layerzero.network/)
- [Flow Developer Portal](https://developers.flow.com/build/smart-contracts/deploying)
