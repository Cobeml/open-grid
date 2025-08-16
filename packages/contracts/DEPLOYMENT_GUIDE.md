# Deployment Guide for Multiple Networks

## ✅ Flow Testnet Deployment (COMPLETED)

**Contract Address**: `0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2`

**Frontend Environment Variable**:
```bash
NEXT_PUBLIC_FLOW_TESTNET_CONTRACT_ADDRESS=0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2
```

**Network Details**:
- **Chain ID**: 545
- **RPC URL**: `https://access-testnet.onflow.org`
- **Explorer**: `https://testnet.flowscan.org`
- **Currency**: FLOW

## 🚀 Deployment Guides for Other Networks

### 1. Ethereum Sepolia Testnet

**Environment Variables** (add to root `.env`):
```bash
# Required
PRIVATE_KEY=your_private_key_here

# Sepolia RPC (optional - uses default)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

**Deploy Command**:
```bash
cd packages/contracts
npx hardhat run scripts/deploy-legacy.ts --network sepolia
```

**Frontend Environment Variable**:
```bash
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=<deployed_contract_address>
```

**Network Details**:
- **Chain ID**: 11155111
- **RPC URL**: `https://sepolia.infura.io/v3/your_project_id`
- **Explorer**: `https://sepolia.etherscan.io`
- **Currency**: ETH
- **Faucet**: https://sepoliafaucet.com/

### 2. Base Sepolia Testnet

**Environment Variables** (add to root `.env`):
```bash
# Required
PRIVATE_KEY=your_private_key_here

# Base Sepolia RPC (optional - uses default)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

**Deploy Command**:
```bash
cd packages/contracts
npx hardhat run scripts/deploy-legacy.ts --network baseSepolia
```

**Frontend Environment Variable**:
```bash
NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS=<deployed_contract_address>
```

**Network Details**:
- **Chain ID**: 84532
- **RPC URL**: `https://sepolia.base.org`
- **Explorer**: `https://sepolia.basescan.org`
- **Currency**: ETH
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

### 3. Hedera Testnet

**Environment Variables** (add to root `.env`):
```bash
# Required
PRIVATE_KEY=your_private_key_here

# Hedera Testnet RPC (optional - uses default)
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
```

**Deploy Command**:
```bash
cd packages/contracts
npx hardhat run scripts/deploy-legacy.ts --network hederaTestnet
```

**Frontend Environment Variable**:
```bash
NEXT_PUBLIC_HEDERA_TESTNET_CONTRACT_ADDRESS=<deployed_contract_address>
```

**Network Details**:
- **Chain ID**: 296
- **RPC URL**: `https://testnet.hashio.io/api`
- **Explorer**: `https://hashscan.io/testnet`
- **Currency**: HBAR
- **Faucet**: https://portal.hedera.com/

## 🔧 Frontend Configuration Updates

### 1. Add Missing Network Configurations

Update `packages/frontend/src/lib/wagmi.ts` to add missing networks:

```typescript
// Add these chain definitions
export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://sepolia.base.org'] },
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org' },
  },
});

export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    public: { http: ['https://testnet.hashio.io/api'] },
    default: { http: ['https://testnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'HashScan Testnet', url: 'https://hashscan.io/testnet' },
  },
});

// Add to chains array
chains: [
  // ... existing chains
  baseSepolia,
  hederaTestnet,
  flowTestnet,
],

// Add to SUPPORTED_CHAINS
[baseSepolia.id]: {
  name: 'Base Sepolia',
  shortName: 'BASE',
  contractAddress: process.env.NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS,
  color: '#0052FF',
},
[hederaTestnet.id]: {
  name: 'Hedera Testnet',
  shortName: 'HBAR',
  contractAddress: process.env.NEXT_PUBLIC_HEDERA_TESTNET_CONTRACT_ADDRESS,
  color: '#000000',
},
```

### 2. Update Frontend Environment Variables

Add to `packages/frontend/.env.local`:
```bash
# Flow Testnet (already deployed)
NEXT_PUBLIC_FLOW_TESTNET_CONTRACT_ADDRESS=0x7b72C9A383145c21291aFbA84CDaB0AdDD3E7FF2

# After deploying to other networks, add:
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=<deployed_address>
NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS=<deployed_address>
NEXT_PUBLIC_HEDERA_TESTNET_CONTRACT_ADDRESS=<deployed_address>
```

## 🧪 Testing Deployments

### 1. Verify Contract Deployment
```bash
cd packages/contracts
npx hardhat test --grep EnergyMonitorLegacy
```

### 2. Test Contract Functions
```bash
# Test on local network first
npx hardhat run scripts/deploy-legacy.ts

# Then test on each deployed network
npx hardhat run scripts/deploy-legacy.ts --network sepolia
npx hardhat run scripts/deploy-legacy.ts --network baseSepolia
npx hardhat run scripts/deploy-legacy.ts --network hederaTestnet
```

## 💰 Faucet Information

### Getting Test Tokens

1. **Ethereum Sepolia**: https://sepoliafaucet.com/
2. **Base Sepolia**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
3. **Hedera Testnet**: https://portal.hedera.com/
4. **Flow Testnet**: https://testnet-faucet.onflow.org/

### Recommended Test Token Amounts
- **Sepolia**: 0.1 ETH
- **Base Sepolia**: 0.1 ETH
- **Hedera Testnet**: 100 HBAR
- **Flow Testnet**: 0.1 FLOW

## 🔍 Verification

After deployment, verify contracts on their respective explorers:

1. **Flow Testnet**: https://testnet.flowscan.org
2. **Sepolia**: https://sepolia.etherscan.io
3. **Base Sepolia**: https://sepolia.basescan.org
4. **Hedera Testnet**: https://hashscan.io/testnet

## 📝 Notes

- All deployments use the **Legacy version** (`EnergyMonitorLegacy.sol`)
- No Chainlink dependencies required
- Works on any EVM-compatible chain
- Low deployment costs
- Perfect for testing and demonstration

## 🚨 Troubleshooting

### Common Issues

1. **Insufficient Funds**: Use faucets to get test tokens
2. **Wrong Chain ID**: Verify chain ID in `hardhat.config.ts`
3. **RPC Issues**: Check RPC URL availability
4. **Gas Issues**: Increase gas limit if needed

### Debug Commands
```bash
# Check network connection
npx hardhat console --network <network_name>

# Check account balance
npx hardhat run -e "console.log(await ethers.provider.getBalance(await ethers.getSigners()[0]))" --network <network_name>
```
