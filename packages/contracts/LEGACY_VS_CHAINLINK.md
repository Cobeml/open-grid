# Legacy vs Chainlink Contract Versions

## Overview

This project now has two clean contract implementations to support different deployment scenarios:

1. **`SimpleEnergyMonitorWithChainlink.sol`** - Real Chainlink Functions integration
2. **`EnergyMonitorLegacy.sol`** - Mock Chainlink integration (deployable anywhere)

## File Structure

### Legacy Implementation
```
contracts/
├── EnergyMonitorLegacy.sol          # Legacy contract (no Chainlink deps)
├── mocks/
│   └── MockFunctionsRouter.sol      # Mock router for testing
scripts/
├── deploy-legacy.ts                 # Legacy deployment script
test/
└── EnergyMonitorLegacy.test.js      # Legacy contract tests
```

### Chainlink Implementation
```
contracts/
├── SimpleEnergyMonitorWithChainlink.sol  # Real Chainlink contract
├── mocks/
│   └── MockFunctionsRouter.sol           # Mock router for testing
scripts/
├── deploy-chainlink-functions.js         # Chainlink deployment script
test/
└── SimpleEnergyMonitorWithChainlink.test.js  # Chainlink contract tests
```

## Contract Comparison

| Feature | Legacy Version | Chainlink Version |
|---------|---------------|-------------------|
| **Dependencies** | Only OpenZeppelin | Chainlink Functions + OpenZeppelin |
| **Deployment Cost** | ~25KB (low) | ~25KB (low) |
| **Chain Compatibility** | ANY EVM chain | Chainlink-supported chains only |
| **Data Source** | Mock/simulated | Real Chainlink DON |
| **Gas Requirements** | Minimal | Higher (Chainlink fees) |
| **Testnet Support** | All testnets | Limited to Chainlink testnets |

## Deployment Options

### Legacy Version (`EnergyMonitorLegacy.sol`)

**Use when:**
- Deploying on non-Chainlink chains (Flow EVM, Hedera, etc.)
- Limited testnet funds
- Testing/demo purposes
- Need maximum chain compatibility

**Deploy with:**
```bash
cd packages/contracts
npx hardhat run scripts/deploy-legacy.ts --network <your-network>
```

**Supported Networks:**
- Any EVM-compatible chain
- Flow EVM (testnet/mainnet)
- Hedera
- Polygon Amoy (if you want to avoid Chainlink fees)
- Local development networks

### Chainlink Version (`SimpleEnergyMonitorWithChainlink.sol`)

**Use when:**
- Deploying on Chainlink-supported chains
- Need real oracle data
- Production deployment
- Have sufficient testnet funds

**Deploy with:**
```bash
cd packages/contracts
npx hardhat run scripts/deploy-chainlink-functions.js --network polygonAmoy
```

**Supported Networks:**
- Ethereum Sepolia
- Polygon Amoy
- Arbitrum Goerli
- Optimism Goerli
- Base Goerli
- Avalanche Fuji
- Celo Alfajores
- zkSync Era Sepolia

## Key Differences

### Legacy Version Features
- ✅ Simple node registration (`registerNode(location)`)
- ✅ Mock data requests (emits events, no real execution)
- ✅ Manual fulfillment via `fulfillRequest()`
- ✅ Basic data storage and retrieval
- ✅ No external dependencies beyond OpenZeppelin

### Chainlink Version Features
- ✅ Advanced node registration with metadata
- ✅ Real Chainlink Functions integration
- ✅ Automatic DON execution and fulfillment
- ✅ Enhanced data structures and grid topology
- ✅ Real-time energy data from external APIs

## Testing

### Legacy Version Tests
```bash
npx hardhat test --grep EnergyMonitorLegacy
```

### Chainlink Version Tests
```bash
npx hardhat test --grep SimpleEnergyMonitorWithChainlink
```

### All Tests
```bash
npx hardhat test
```

## Migration Path

You can easily migrate from Legacy to Chainlink version:

1. **Deploy Legacy** on any chain for testing
2. **Test functionality** with mock data
3. **Deploy Chainlink version** when ready for production
4. **Update frontend** to use new contract address

## Cost Comparison

### Legacy Deployment (Polygon Amoy)
- Gas cost: ~0.001-0.005 POL
- No ongoing fees
- Perfect for testing with limited funds

### Chainlink Deployment (Polygon Amoy)
- Gas cost: ~0.01-0.05 POL
- Ongoing Chainlink Functions fees
- Real data but higher costs

## Recommendation

**For your current situation:**
1. **Start with Legacy version** - deploy on Flow EVM or any testnet
2. **Test thoroughly** with mock data
3. **Upgrade to Chainlink** when you have sufficient funds and need real data

The Legacy version provides the same core functionality for testing and demonstration purposes, while being deployable on any EVM chain with minimal costs.

## Environment Variables

Add to your **root directory's `.env` file**:

```bash
# Required for all deployments
PRIVATE_KEY=your_private_key_here

# For Flow deployment
FLOW_RPC_URL=https://access-testnet.onflow.org
FLOW_MAINNET_RPC_URL=https://access-mainnet-beta.onflow.org

# For Chainlink deployment (optional - uses defaults)
POLYGON_AMOY_FUNCTIONS_ROUTER=0xC22a79eBA640940ABB6dF0f7982cc119578E11De
POLYGON_SUBSCRIPTIONS_ID=1
```
