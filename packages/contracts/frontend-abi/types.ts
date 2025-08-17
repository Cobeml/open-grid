
// Generated TypeScript types for Energy Monitor contracts
export interface EnergyData {
  timestamp: string;
  kWh: string;
  location: string;
  nodeId: string;
}

export interface Node {
  location: string;
  active: boolean;
  registeredAt: string;
  lastUpdate: string;
  name?: string; // Only in SimpleEnergyMonitorWithChainlink
}

export interface ContractAddresses {
  EnergyMonitorLegacy: string;
  SimpleEnergyMonitorWithChainlink: string;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  contracts: ContractAddresses;
}

export interface DeploymentInfo {
  version: string;
  deployedAt: string;
  networks: {
    localhost: NetworkConfig;
    polygonAmoy: NetworkConfig;
    sepolia: NetworkConfig;
  };
}

// Event types
export interface DataUpdatedEvent {
  dataId: string;
  nodeId: string;
  kWh: string;
  location: string;
  timestamp: string;
  transactionHash?: string;
  blockNumber?: number;
}

export interface NodeRegisteredEvent {
  nodeId: string;
  location: string;
  name?: string;
  transactionHash?: string;
  blockNumber?: number;
}

export interface RequestSentEvent {
  requestId: string;
  nodeId: string;
  transactionHash?: string;
  blockNumber?: number;
}
