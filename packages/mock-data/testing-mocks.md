# Testing & Mock Data Package

## Overview
The testing and mock data package provides comprehensive testing infrastructure and realistic data generation for the Open Grid system. This includes smart contract tests, integration tests, mock data generators, and performance testing tools.

## Architecture
- **Contract Testing**: Hardhat-based Solidity testing with mock Chainlink
- **Integration Testing**: End-to-end testing across packages
- **Mock Data Generation**: Realistic electricity usage patterns
- **Load Testing**: Performance testing for multi-chain scenarios
- **Synthetic Datasets**: Generated data for development and demos

## Package Structure
```
packages/mock-data/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
├── src/
│   ├── index.ts
│   ├── generators/
│   │   ├── energy-data.ts
│   │   ├── location-data.ts
│   │   ├── time-series.ts
│   │   └── realistic-patterns.ts
│   ├── datasets/
│   │   ├── household-usage.ts
│   │   ├── commercial-usage.ts
│   │   ├── industrial-usage.ts
│   │   └── data-center-usage.ts
│   ├── mocks/
│   │   ├── chainlink-functions.ts
│   │   ├── utility-api.ts
│   │   ├── blockchain-events.ts
│   │   └── network-responses.ts
│   ├── fixtures/
│   │   ├── contract-deployment.ts
│   │   ├── test-accounts.ts
│   │   └── network-configs.ts
│   ├── testing/
│   │   ├── contract-tests/
│   │   │   ├── EnergyMonitor.test.ts
│   │   │   ├── deployment.test.ts
│   │   │   └── chainlink-integration.test.ts
│   │   ├── integration-tests/
│   │   │   ├── multi-chain.test.ts
│   │   │   ├── data-flow.test.ts
│   │   │   └── frontend-backend.test.ts
│   │   ├── performance-tests/
│   │   │   ├── load-testing.ts
│   │   │   ├── stress-testing.ts
│   │   │   └── scalability.test.ts
│   │   └── e2e-tests/
│   │       ├── user-flows.test.ts
│   │       ├── wallet-connection.test.ts
│   │       └── data-visualization.test.ts
│   └── utils/
│       ├── test-helpers.ts
│       ├── mock-server.ts
│       ├── data-validation.ts
│       └── performance-metrics.ts
├── data/
│   ├── csv/
│   │   ├── london-households.csv
│   │   ├── smart-meter-sample.csv
│   │   └── commercial-buildings.csv
│   ├── json/
│   │   ├── test-scenarios.json
│   │   ├── location-mappings.json
│   │   └── usage-patterns.json
│   └── generated/
│       ├── synthetic-hourly.json
│       ├── synthetic-daily.json
│       └── stress-test-data.json
├── scripts/
│   ├── generate-datasets.ts
│   ├── run-all-tests.ts
│   ├── setup-test-env.ts
│   └── performance-report.ts
└── config/
    ├── test-networks.json
    ├── mock-apis.json
    └── performance-thresholds.json
```

## Dependencies
```json
{
  "name": "@open-grid/mock-data",
  "dependencies": {
    "ethers": "^6.0.0",
    "csv-parser": "^3.0.0",
    "csv-writer": "^1.6.0",
    "faker": "^8.4.0",
    "@faker-js/faker": "^8.4.0",
    "fast-csv": "^5.0.0",
    "fs-extra": "^11.0.0",
    "lodash": "^4.17.21",
    "moment": "^2.30.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/lodash": "^4.14.0",
    "typescript": "^5.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",
    "artillery": "^2.0.0",
    "hardhat": "^2.19.0",
    "@nomicfoundation/hardhat-toolbox": "^4.0.0"
  }
}
```

## Mock Data Generators

### Energy Data Generator
```typescript
// src/generators/energy-data.ts
import { faker } from '@faker-js/faker'
import { EnergyUsagePattern, GenerationOptions } from '../types/generation'

export class EnergyDataGenerator {
  private patterns: Map<string, EnergyUsagePattern> = new Map()

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns(): void {
    // Residential pattern: low baseline with evening peaks
    this.patterns.set('residential', {
      baselineKwh: 0.5,
      peakKwh: 3.5,
      peakHours: [18, 19, 20, 21], // 6-9 PM
      weekdayMultiplier: 1.0,
      weekendMultiplier: 1.2,
      seasonalVariation: 0.3,
    })

    // Commercial pattern: high during business hours
    this.patterns.set('commercial', {
      baselineKwh: 2.0,
      peakKwh: 15.0,
      peakHours: [9, 10, 11, 14, 15, 16], // Business hours
      weekdayMultiplier: 1.0,
      weekendMultiplier: 0.3,
      seasonalVariation: 0.4,
    })

    // Industrial pattern: consistent high usage
    this.patterns.set('industrial', {
      baselineKwh: 25.0,
      peakKwh: 45.0,
      peakHours: [8, 9, 10, 13, 14, 15], // Shift changes
      weekdayMultiplier: 1.0,
      weekendMultiplier: 0.8,
      seasonalVariation: 0.2,
    })

    // Data center pattern: very consistent 24/7
    this.patterns.set('datacenter', {
      baselineKwh: 50.0,
      peakKwh: 65.0,
      peakHours: [14, 15, 16], // Slight afternoon peak
      weekdayMultiplier: 1.0,
      weekendMultiplier: 0.98,
      seasonalVariation: 0.1,
    })
  }

  generateTimeSeries(
    patternType: string,
    startDate: Date,
    durationHours: number,
    options: GenerationOptions = {}
  ): EnergyDataPoint[] {
    const pattern = this.patterns.get(patternType)
    if (!pattern) {
      throw new Error(`Unknown pattern type: ${patternType}`)
    }

    const dataPoints: EnergyDataPoint[] = []
    const { anomalyProbability = 0.02, noiseLevel = 0.1 } = options

    for (let hour = 0; hour < durationHours; hour++) {
      const currentTime = new Date(startDate.getTime() + hour * 3600000)
      const hourOfDay = currentTime.getHours()
      const dayOfWeek = currentTime.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const monthOfYear = currentTime.getMonth()

      // Base calculation
      let kWh = pattern.baselineKwh

      // Peak hours multiplier
      if (pattern.peakHours.includes(hourOfDay)) {
        kWh = pattern.peakKwh
      }

      // Weekend adjustment
      if (isWeekend) {
        kWh *= pattern.weekendMultiplier
      }

      // Seasonal variation (summer peak)
      const seasonalFactor = 1 + pattern.seasonalVariation * 
        Math.sin((monthOfYear - 2) * Math.PI / 6)
      kWh *= seasonalFactor

      // Add realistic noise
      kWh *= (1 + (Math.random() - 0.5) * noiseLevel)

      // Occasional anomalies
      if (Math.random() < anomalyProbability) {
        kWh *= faker.number.float({ min: 0.1, max: 3.0 })
      }

      // Ensure positive values
      kWh = Math.max(0.1, kWh)

      dataPoints.push({
        timestamp: currentTime.getTime(),
        kWh: Math.round(kWh * 1000), // Convert to Wei-like units
        hour: hourOfDay,
        dayOfWeek,
        month: monthOfYear,
        patternType,
      })
    }

    return dataPoints
  }

  generateLocationBasedData(
    locationPattern: 'urban' | 'suburban' | 'rural',
    count: number
  ): LocationBasedEnergyData[] {
    const multipliers = {
      urban: { residential: 0.8, commercial: 1.2, density: 'high' },
      suburban: { residential: 1.0, commercial: 0.9, density: 'medium' },
      rural: { residential: 1.3, commercial: 0.6, density: 'low' },
    }

    const config = multipliers[locationPattern]
    const data: LocationBasedEnergyData[] = []

    for (let i = 0; i < count; i++) {
      const patternType = faker.helpers.weightedArrayElement([
        { weight: 60, value: 'residential' },
        { weight: 25, value: 'commercial' },
        { weight: 10, value: 'industrial' },
        { weight: 5, value: 'datacenter' },
      ])

      const baseLocation = this.generateRealisticLocation(locationPattern)
      
      data.push({
        nodeId: i + 1,
        location: `lat:${baseLocation.lat},lon:${baseLocation.lon}`,
        patternType,
        multiplier: config[patternType as keyof typeof config] || 1.0,
        density: config.density,
        coordinates: baseLocation,
      })
    }

    return data
  }

  private generateRealisticLocation(pattern: string): { lat: number; lon: number } {
    // Generate realistic coordinates based on major metropolitan areas
    const cityBounds = {
      urban: [
        { name: 'NYC', bounds: { lat: [40.4774, 40.9176], lon: [-74.2591, -73.7004] } },
        { name: 'LA', bounds: { lat: [33.7037, 34.3373], lon: [-118.6681, -118.1553] } },
        { name: 'Chicago', bounds: { lat: [41.6444, 42.0230], lon: [-87.9401, -87.5240] } },
      ],
      suburban: [
        { name: 'Suburbs', bounds: { lat: [39.0, 42.0], lon: [-85.0, -75.0] } },
      ],
      rural: [
        { name: 'Rural', bounds: { lat: [35.0, 45.0], lon: [-95.0, -80.0] } },
      ],
    }

    const areas = cityBounds[pattern as keyof typeof cityBounds] || cityBounds.urban
    const area = faker.helpers.arrayElement(areas)
    
    return {
      lat: faker.number.float({ 
        min: area.bounds.lat[0], 
        max: area.bounds.lat[1], 
        precision: 0.0001 
      }),
      lon: faker.number.float({ 
        min: area.bounds.lon[0], 
        max: area.bounds.lon[1], 
        precision: 0.0001 
      }),
    }
  }

  generateBulkDataset(specifications: DatasetSpecification[]): DatasetCollection {
    const collection: DatasetCollection = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalDataPoints: 0,
        patterns: specifications.map(s => s.patternType),
      },
      datasets: {},
    }

    specifications.forEach((spec, index) => {
      const timeSeries = this.generateTimeSeries(
        spec.patternType,
        spec.startDate,
        spec.durationHours,
        spec.options
      )

      const locationData = this.generateLocationBasedData(
        spec.locationPattern || 'urban',
        spec.nodeCount || 10
      )

      collection.datasets[`dataset_${index}`] = {
        specification: spec,
        timeSeries,
        locations: locationData,
        summary: {
          averageKwh: timeSeries.reduce((sum, p) => sum + p.kWh, 0) / timeSeries.length,
          maxKwh: Math.max(...timeSeries.map(p => p.kWh)),
          minKwh: Math.min(...timeSeries.map(p => p.kWh)),
          dataPoints: timeSeries.length,
        },
      }

      collection.metadata.totalDataPoints += timeSeries.length
    })

    return collection
  }
}

// Type definitions
interface EnergyUsagePattern {
  baselineKwh: number
  peakKwh: number
  peakHours: number[]
  weekdayMultiplier: number
  weekendMultiplier: number
  seasonalVariation: number
}

interface EnergyDataPoint {
  timestamp: number
  kWh: number
  hour: number
  dayOfWeek: number
  month: number
  patternType: string
}

interface LocationBasedEnergyData {
  nodeId: number
  location: string
  patternType: string
  multiplier: number
  density: string
  coordinates: { lat: number; lon: number }
}

interface GenerationOptions {
  anomalyProbability?: number
  noiseLevel?: number
}

interface DatasetSpecification {
  patternType: string
  startDate: Date
  durationHours: number
  nodeCount?: number
  locationPattern?: 'urban' | 'suburban' | 'rural'
  options?: GenerationOptions
}

interface DatasetCollection {
  metadata: {
    generatedAt: string
    totalDataPoints: number
    patterns: string[]
  }
  datasets: Record<string, {
    specification: DatasetSpecification
    timeSeries: EnergyDataPoint[]
    locations: LocationBasedEnergyData[]
    summary: {
      averageKwh: number
      maxKwh: number
      minKwh: number
      dataPoints: number
    }
  }>
}
```

## Smart Contract Testing

### Comprehensive Contract Tests
```typescript
// src/testing/contract-tests/EnergyMonitor.test.ts
import { expect } from "chai"
import { ethers, deployments } from "hardhat"
import { EnergyMonitor } from "../../../contracts/typechain-types"
import { MockChainlinkFunctions } from "../../mocks/chainlink-functions"

describe("EnergyMonitor Contract", function () {
  let energyMonitor: EnergyMonitor
  let mockChainlink: MockChainlinkFunctions
  let owner: any
  let user: any

  beforeEach(async function () {
    await deployments.fixture(["EnergyMonitor", "MockChainlink"])
    ;[owner, user] = await ethers.getSigners()
    
    energyMonitor = await ethers.getContract("EnergyMonitor")
    mockChainlink = await ethers.getContract("MockChainlinkFunctions")
  })

  describe("Node Management", function () {
    it("Should register a new node", async function () {
      const location = "lat:40.7128,lon:-74.0060"
      const tx = await energyMonitor.registerNode(location)
      
      await expect(tx)
        .to.emit(energyMonitor, "NodeRegistered")
        .withArgs(0, location)

      const node = await energyMonitor.nodes(0)
      expect(node.location).to.equal(location)
      expect(node.active).to.be.true
    })

    it("Should handle multiple nodes", async function () {
      const locations = [
        "lat:40.7128,lon:-74.0060", // NYC
        "lat:34.0522,lon:-118.2437", // LA
        "lat:41.8781,lon:-87.6298", // Chicago
      ]

      for (let i = 0; i < locations.length; i++) {
        await energyMonitor.registerNode(locations[i])
      }

      const nodeCount = await energyMonitor.nodeCount()
      expect(nodeCount).to.equal(3)

      const allNodes = await energyMonitor.getAllNodes()
      expect(allNodes.length).to.equal(3)
      expect(allNodes[0].location).to.equal(locations[0])
    })

    it("Should deactivate nodes", async function () {
      await energyMonitor.registerNode("lat:40.7128,lon:-74.0060")
      
      const tx = await energyMonitor.deactivateNode(0)
      await expect(tx)
        .to.emit(energyMonitor, "NodeDeactivated")
        .withArgs(0)

      const node = await energyMonitor.nodes(0)
      expect(node.active).to.be.false
    })
  })

  describe("Chainlink Functions Integration", function () {
    beforeEach(async function () {
      await energyMonitor.registerNode("lat:40.7128,lon:-74.0060")
    })

    it("Should request data update", async function () {
      const source = "const kWh = 2500; return Functions.encodeUint256(kWh);"
      const secrets = "0x"
      const args = ["node1"]

      const tx = await energyMonitor.requestDataUpdate(
        0, // nodeId
        source,
        secrets,
        0, // donHostedSecretsSlotID
        0, // donHostedSecretsVersion
        args
      )

      await expect(tx).to.emit(energyMonitor, "RequestSent")
    })

    it("Should handle Chainlink Functions response", async function () {
      // Mock a Chainlink Functions request/response cycle
      const kWh = 2500
      const encodedResponse = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [kWh]
      )

      await mockChainlink.mockFulfillment(
        energyMonitor.target,
        encodedResponse
      )

      const dataCount = await energyMonitor.dataCount()
      expect(dataCount).to.equal(1)

      const dataPoint = await energyMonitor.dataPoints(0)
      expect(dataPoint.kWh).to.equal(kWh)
      expect(dataPoint.nodeId).to.equal(0)
    })

    it("Should handle multiple rapid updates", async function () {
      const updates = [1500, 2000, 2500, 3000, 1800]
      
      for (const kWh of updates) {
        const encodedResponse = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256"],
          [kWh]
        )
        await mockChainlink.mockFulfillment(
          energyMonitor.target,
          encodedResponse
        )
      }

      const dataCount = await energyMonitor.dataCount()
      expect(dataCount).to.equal(updates.length)

      // Check latest data for node
      const latestData = await energyMonitor.getLatestDataForNode(0)
      expect(latestData.kWh).to.equal(updates[updates.length - 1])
    })
  })

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for node registration", async function () {
      const tx = await energyMonitor.registerNode("lat:40.7128,lon:-74.0060")
      const receipt = await tx.wait()
      
      expect(receipt!.gasUsed).to.be.below(100000) // Should be well under 100k gas
    })

    it("Should batch multiple operations efficiently", async function () {
      // Register multiple nodes in sequence and measure gas
      const locations = Array.from({ length: 10 }, (_, i) => 
        `lat:${40 + i * 0.1},lon:${-74 + i * 0.1}`
      )

      const gasUsed: bigint[] = []
      for (const location of locations) {
        const tx = await energyMonitor.registerNode(location)
        const receipt = await tx.wait()
        gasUsed.push(receipt!.gasUsed)
      }

      // Gas usage should remain consistent (no significant increase)
      const avgGas = gasUsed.reduce((sum, gas) => sum + gas, 0n) / BigInt(gasUsed.length)
      const maxDeviation = gasUsed.reduce((max, gas) => {
        const deviation = gas > avgGas ? gas - avgGas : avgGas - gas
        return deviation > max ? deviation : max
      }, 0n)

      expect(maxDeviation).to.be.below(avgGas / 10n) // Less than 10% deviation
    })
  })

  describe("Error Handling", function () {
    it("Should reject non-owner calls", async function () {
      await expect(
        energyMonitor.connect(user).registerNode("lat:40.7128,lon:-74.0060")
      ).to.be.revertedWith("OwnableUnauthorizedAccount")
    })

    it("Should handle invalid node IDs", async function () {
      await expect(
        energyMonitor.getLatestDataForNode(999)
      ).to.be.revertedWith("NodeNotFound")

      await expect(
        energyMonitor.deactivateNode(999)
      ).to.be.revertedWith("NodeNotFound")
    })

    it("Should handle empty responses", async function () {
      await energyMonitor.registerNode("lat:40.7128,lon:-74.0060")
      
      await expect(
        mockChainlink.mockFulfillment(energyMonitor.target, "0x")
      ).to.be.revertedWith("EmptyResponse")
    })
  })
})
```

### Mock Chainlink Functions
```typescript
// src/mocks/chainlink-functions.ts
import { ethers } from "hardhat"

export class MockChainlinkFunctions {
  private requestId: string = "0x1234567890123456789012345678901234567890123456789012345678901234"
  private subscriptionId: number = 1

  async mockFulfillment(
    contractAddress: string,
    response: string,
    error: string = "0x"
  ): Promise<void> {
    const contract = await ethers.getContractAt("EnergyMonitor", contractAddress)
    
    // Simulate the Chainlink Functions DON calling fulfillRequest
    await contract.fulfillRequest(this.requestId, response, error)
  }

  async simulateRequestError(
    contractAddress: string,
    errorMessage: string
  ): Promise<void> {
    const errorBytes = ethers.toUtf8Bytes(errorMessage)
    await this.mockFulfillment(contractAddress, "0x", ethers.hexlify(errorBytes))
  }

  async simulateNetworkDelay(delayMs: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  generateMockAPIResponse(kWh: number, timestamp?: number): string {
    const data = {
      kWh,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      source: "mock-utility-api"
    }
    
    // Simulate what the Chainlink Functions source would return
    return ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [kWh])
  }

  createLoadTestScenario(requestCount: number, intervalMs: number): Promise<void> {
    return new Promise((resolve) => {
      let completed = 0
      const interval = setInterval(async () => {
        const kWh = Math.floor(Math.random() * 5000) + 500 // 500-5500 kWh
        const response = this.generateMockAPIResponse(kWh)
        
        // This would be called for each contract in a real scenario
        // For testing, we'll just increment the counter
        completed++
        
        if (completed >= requestCount) {
          clearInterval(interval)
          resolve()
        }
      }, intervalMs)
    })
  }
}
```

## Integration Testing

### Multi-Chain Integration Tests
```typescript
// src/testing/integration-tests/multi-chain.test.ts
import { expect } from "chai"
import { ethers } from "hardhat"
import { EnergyDataGenerator } from "../../generators/energy-data"
import { MockUtilityAPI } from "../../mocks/utility-api"

describe("Multi-Chain Integration", function () {
  let generator: EnergyDataGenerator
  let mockAPI: MockUtilityAPI
  
  before(async function () {
    generator = new EnergyDataGenerator()
    mockAPI = new MockUtilityAPI()
    await mockAPI.start()
  })

  after(async function () {
    await mockAPI.stop()
  })

  it("Should handle cross-chain data consistency", async function () {
    // Generate test data for multiple chains
    const testData = generator.generateTimeSeries(
      'datacenter',
      new Date(),
      24, // 24 hours
      { anomalyProbability: 0, noiseLevel: 0.05 }
    )

    // Deploy contracts to multiple test networks
    const networks = ['polygon', 'arbitrum', 'optimism']
    const contracts: Record<string, any> = {}

    for (const network of networks) {
      // In a real test, this would deploy to actual test networks
      contracts[network] = await deployToNetwork(network)
    }

    // Submit same data to all chains
    for (const dataPoint of testData.slice(0, 5)) { // Test with first 5 points
      for (const network of networks) {
        await submitDataToChain(contracts[network], dataPoint)
      }
    }

    // Verify data consistency across chains
    for (let i = 0; i < 5; i++) {
      const originalKwh = testData[i].kWh
      for (const network of networks) {
        const chainData = await contracts[network].dataPoints(i)
        expect(chainData.kWh).to.equal(originalKwh)
      }
    }
  })

  it("Should handle network failures gracefully", async function () {
    // Simulate network failure scenarios
    const scenarios = [
      { name: 'polygon', fails: true },
      { name: 'arbitrum', fails: false },
      { name: 'optimism', fails: false },
    ]

    for (const scenario of scenarios) {
      if (scenario.fails) {
        // Simulate network failure
        expect(async () => {
          await submitDataToFailingNetwork(scenario.name)
        }).to.throw()
      } else {
        // Should succeed normally
        const result = await submitDataToNetwork(scenario.name, {
          kWh: 2500,
          timestamp: Date.now()
        })
        expect(result).to.be.ok
      }
    }
  })
})

async function deployToNetwork(network: string): Promise<any> {
  // Mock deployment - in real tests this would use actual network configs
  const contract = await ethers.deployContract("EnergyMonitor", [
    "0x1234567890123456789012345678901234567890", // mock router
    1, // subscription ID
    300000, // gas limit
    "0x66756e2d706f6c79676f6e2d6d61696e6e65742d310000000000000000000000" // DON ID
  ])
  return contract
}

async function submitDataToChain(contract: any, dataPoint: any): Promise<any> {
  // Mock data submission
  const encodedResponse = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [dataPoint.kWh]
  )
  
  return contract.mockFulfillment(encodedResponse)
}

async function submitDataToFailingNetwork(network: string): Promise<any> {
  throw new Error(`Network ${network} is unavailable`)
}
```

## Performance Testing

### Load Testing with Artillery
```yaml
# config/load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  environments:
    development:
      target: 'http://localhost:3000'
    staging:
      target: 'https://staging.opengrid.com'

scenarios:
  - name: "Multi-chain data ingestion"
    weight: 40
    flow:
      - post:
          url: "/api/energy-data"
          json:
            nodeId: "{{ $randomInt(1, 100) }}"
            kWh: "{{ $randomInt(500, 5000) }}"
            chainId: "{{ $randomInt(1, 8) }}"
            timestamp: "{{ $timestamp }}"
      - think: 1

  - name: "Real-time dashboard loading"
    weight: 30
    flow:
      - get:
          url: "/api/dashboard/metrics"
          qs:
            chainId: "{{ $randomInt(1, 8) }}"
      - get:
          url: "/api/nodes"
          qs:
            chainId: "{{ $randomInt(1, 8) }}"
      - think: 2

  - name: "Map data fetching"
    weight: 30
    flow:
      - get:
          url: "/api/map-data"
          qs:
            bounds: "40.4774,-74.2591,40.9176,-73.7004"
            chainId: "{{ $randomInt(1, 8) }}"
      - think: 3
```

### Performance Metrics Collection
```typescript
// src/utils/performance-metrics.ts
export class PerformanceMetrics {
  private metrics: Map<string, MetricData[]> = new Map()

  startTiming(operation: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMetric(operation, 'duration', duration)
    }
  }

  recordMetric(operation: string, type: string, value: number): void {
    const key = `${operation}:${type}`
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }
    
    this.metrics.get(key)!.push({
      timestamp: Date.now(),
      value,
      operation,
      type,
    })
  }

  getStatistics(operation: string, type: string): PerformanceStats {
    const key = `${operation}:${type}`
    const data = this.metrics.get(key) || []
    
    if (data.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0, p99: 0 }
    }

    const values = data.map(d => d.value).sort((a, b) => a - b)
    const count = values.length
    const sum = values.reduce((a, b) => a + b, 0)
    
    return {
      count,
      average: sum / count,
      min: values[0],
      max: values[count - 1],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)],
    }
  }

  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      generatedAt: new Date().toISOString(),
      operations: {},
    }

    const operations = new Set<string>()
    for (const key of this.metrics.keys()) {
      const [operation] = key.split(':')
      operations.add(operation)
    }

    for (const operation of operations) {
      report.operations[operation] = {
        duration: this.getStatistics(operation, 'duration'),
        throughput: this.calculateThroughput(operation),
        errorRate: this.calculateErrorRate(operation),
      }
    }

    return report
  }

  private calculateThroughput(operation: string): number {
    const key = `${operation}:duration`
    const data = this.metrics.get(key) || []
    
    if (data.length < 2) return 0
    
    const timeSpan = Math.max(...data.map(d => d.timestamp)) - 
                     Math.min(...data.map(d => d.timestamp))
    
    return (data.length / timeSpan) * 1000 // operations per second
  }

  private calculateErrorRate(operation: string): number {
    const successKey = `${operation}:success`
    const errorKey = `${operation}:error`
    
    const successCount = this.metrics.get(successKey)?.length || 0
    const errorCount = this.metrics.get(errorKey)?.length || 0
    const total = successCount + errorCount
    
    return total > 0 ? errorCount / total : 0
  }
}

interface MetricData {
  timestamp: number
  value: number
  operation: string
  type: string
}

interface PerformanceStats {
  count: number
  average: number
  min: number
  max: number
  p95: number
  p99: number
}

interface PerformanceReport {
  generatedAt: string
  operations: Record<string, {
    duration: PerformanceStats
    throughput: number
    errorRate: number
  }>
}
```

## Scripts and CLI

### Dataset Generation Script
```typescript
// scripts/generate-datasets.ts
import { EnergyDataGenerator } from '../src/generators/energy-data'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function generateDatasets() {
  const generator = new EnergyDataGenerator()
  
  console.log('🔄 Generating synthetic datasets...')
  
  // Generate various scenarios
  const specifications = [
    {
      name: 'residential-urban',
      patternType: 'residential',
      startDate: new Date('2024-01-01'),
      durationHours: 24 * 30, // 30 days
      nodeCount: 50,
      locationPattern: 'urban' as const,
      options: { anomalyProbability: 0.02, noiseLevel: 0.1 }
    },
    {
      name: 'commercial-downtown',
      patternType: 'commercial',
      startDate: new Date('2024-01-01'),
      durationHours: 24 * 30,
      nodeCount: 20,
      locationPattern: 'urban' as const,
      options: { anomalyProbability: 0.01, noiseLevel: 0.08 }
    },
    {
      name: 'datacenter-distributed',
      patternType: 'datacenter',
      startDate: new Date('2024-01-01'),
      durationHours: 24 * 7, // 1 week
      nodeCount: 5,
      locationPattern: 'suburban' as const,
      options: { anomalyProbability: 0.005, noiseLevel: 0.03 }
    },
    {
      name: 'stress-test-data',
      patternType: 'mixed',
      startDate: new Date('2024-01-01'),
      durationHours: 24 * 1, // 1 day
      nodeCount: 1000,
      locationPattern: 'urban' as const,
      options: { anomalyProbability: 0.05, noiseLevel: 0.15 }
    }
  ]

  for (const spec of specifications) {
    console.log(`  📊 Generating ${spec.name}...`)
    
    const dataset = generator.generateBulkDataset([spec])
    
    // Save to file
    const outputPath = join(__dirname, '..', 'data', 'generated', `${spec.name}.json`)
    writeFileSync(outputPath, JSON.stringify(dataset, null, 2))
    
    console.log(`  ✅ Saved ${spec.name} to ${outputPath}`)
    console.log(`     📈 ${dataset.metadata.totalDataPoints} data points generated`)
  }
  
  console.log('🎉 All datasets generated successfully!')
}

if (require.main === module) {
  generateDatasets().catch(console.error)
}
```

## Environment Variables
```bash
# Testing Configuration
NODE_ENV=test
TEST_TIMEOUT=30000

# Mock API Settings
MOCK_API_PORT=3001
MOCK_UTILITY_API_DELAY=100
MOCK_CHAINLINK_DELAY=500

# Performance Testing
LOAD_TEST_DURATION=300
STRESS_TEST_RPS=100
PERFORMANCE_THRESHOLD_P95=1000

# Network Configuration
TEST_POLYGON_RPC=http://localhost:8545
TEST_ARBITRUM_RPC=http://localhost:8546
TEST_OPTIMISM_RPC=http://localhost:8547

# Database for Integration Tests
TEST_DATABASE_URL=postgres://test:test@localhost:5432/opengrid_test

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
```

## CLI Scripts
```json
{
  "scripts": {
    "generate": "ts-node scripts/generate-datasets.ts",
    "test": "jest",
    "test:unit": "jest --testMatch='**/*.test.ts'",
    "test:integration": "jest --testMatch='**/integration-tests/**/*.test.ts'",
    "test:e2e": "playwright test",
    "test:performance": "artillery run config/load-test.yml",
    "test:contracts": "cd ../contracts && npm run test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:contracts",
    "mock:server": "ts-node src/utils/mock-server.ts",
    "mock:api": "ts-node src/mocks/utility-api.ts",
    "benchmark": "ts-node scripts/performance-report.ts",
    "validate": "ts-node src/utils/data-validation.ts",
    "clean": "rm -rf data/generated/* && rm -rf test-results/*"
  }
}
```

## Key Features
- **Comprehensive Testing**: Unit, integration, E2E, and performance tests
- **Realistic Mock Data**: Pattern-based energy usage generation
- **Multi-Chain Testing**: Cross-chain consistency validation
- **Performance Monitoring**: Detailed metrics and benchmarking
- **Load Testing**: Stress testing with Artillery
- **Mock Services**: Chainlink Functions and UtilityAPI mocks
- **CI/CD Ready**: Automated test suites for continuous integration
- **Data Validation**: Comprehensive data quality checks