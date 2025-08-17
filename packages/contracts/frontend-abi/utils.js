
/**
 * Frontend utility functions for Energy Monitor contracts
 */

// Parse energy data from contract response
export function parseEnergyData(data) {
  return {
    timestamp: new Date(parseInt(data.timestamp) * 1000).toISOString(),
    kWh: (parseInt(data.kWh) / 1000).toFixed(3), // Convert from Wei-like units
    location: data.location,
    nodeId: data.nodeId.toString()
  };
}

// Parse coordinates from location string
export function parseCoordinates(location) {
  const match = location.match(/lat:([^,]+),lon:([^,]+)/);
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2])
    };
  }
  return null;
}

// Format kWh for display
export function formatKWh(kWhString) {
  const kWh = parseInt(kWhString) / 1000;
  return kWh.toFixed(3) + ' kWh';
}

// Get network configuration by chain ID
export function getNetworkConfig(chainId, deployments) {
  const networks = Object.values(deployments.networks);
  return networks.find(network => network.chainId === chainId);
}

// Setup contract instance (assumes ethers is available)
export function getContractInstance(contractName, networkConfig, signerOrProvider) {
  const address = networkConfig.contracts[contractName];
  if (!address || address === 'TBD') {
    throw new Error(`${contractName} not deployed on ${networkConfig.name}`);
  }
  
  // You'll need to import the ABI in your frontend
  // const contractABI = require(`./${contractName}.json`).abi;
  // return new ethers.Contract(address, contractABI, signerOrProvider);
  
  return {
    address,
    contractName,
    network: networkConfig.name
  };
}

// Listen to contract events
export function setupEventListeners(contract, callbacks) {
  // DataUpdated event
  if (callbacks.onDataUpdated && contract.on) {
    contract.on('DataUpdated', (dataId, nodeId, kWh, location, timestamp, event) => {
      callbacks.onDataUpdated({
        dataId: dataId.toString(),
        nodeId: nodeId.toString(),
        kWh: kWh.toString(),
        location,
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
  
  // NodeRegistered event
  if (callbacks.onNodeRegistered && contract.on) {
    contract.on('NodeRegistered', (nodeId, location, event) => {
      callbacks.onNodeRegistered({
        nodeId: nodeId.toString(),
        location,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
  
  // RequestSent event (for Chainlink contracts)
  if (callbacks.onRequestSent && contract.on) {
    contract.on('RequestSent', (...args) => {
      const event = args[args.length - 1];
      callbacks.onRequestSent({
        requestId: args[0],
        nodeId: args[1]?.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
}

export default {
  parseEnergyData,
  parseCoordinates,
  formatKWh,
  getNetworkConfig,
  getContractInstance,
  setupEventListeners
};
