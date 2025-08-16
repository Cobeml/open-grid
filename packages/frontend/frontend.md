
⏺ # Frontend Package

  Overview

  The frontend package is a React application that provides real-time
  visualization of electrical monitoring data across multiple blockchain
  networks. Built with modern React patterns, it features interactive maps,
  multi-chain support, and real-time updates.

  Architecture

  - React 18: Modern React with concurrent features and hooks
  - wagmi: React hooks for Ethereum interaction
  - Mapbox: Interactive geospatial visualization
  - Multi-chain: Support for network switching
  - Real-time: WebSocket updates and event listening
  - TypeScript: Full type safety throughout

  Package Structure

  packages/frontend/
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  ├── tailwind.config.js
  ├── .env.example
  ├── public/
  │   ├── index.html
  │   ├── manifest.json
  │   └── icons/
  ├── src/
  │   ├── main.tsx
  │   ├── App.tsx
  │   ├── vite-env.d.ts
  │   ├── components/
  │   │   ├── layout/
  │   │   │   ├── Header.tsx
  │   │   │   ├── Sidebar.tsx
  │   │   │   └── Footer.tsx
  │   │   ├── map/
  │   │   │   ├── MapContainer.tsx
  │   │   │   ├── EnergyNodeMarker.tsx
  │   │   │   ├── HeatmapLayer.tsx
  │   │   │   └── NetworkSelector.tsx
  │   │   ├── dashboard/
  │   │   │   ├── MetricCards.tsx
  │   │   │   ├── UsageChart.tsx
  │   │   │   ├── AlertPanel.tsx
  │   │   │   └── NodeList.tsx
  │   │   ├── wallet/
  │   │   │   ├── ConnectButton.tsx
  │   │   │   ├── NetworkSwitcher.tsx
  │   │   │   └── AccountInfo.tsx
  │   │   └── ui/
  │   │       ├── Button.tsx
  │   │       ├── Card.tsx
  │   │       ├── Modal.tsx
  │   │       └── Loading.tsx
  │   ├── hooks/
  │   │   ├── useEnergyData.ts
  │   │   ├── useMultiChainEvents.ts
  │   │   ├── useMapData.ts
  │   │   └── useWebSocket.ts
  │   ├── lib/
  │   │   ├── wagmi.ts
  │   │   ├── mapbox.ts
  │   │   ├── constants.ts
  │   │   └── utils.ts
  │   ├── types/
  │   │   ├── energy.ts
  │   │   ├── map.ts
  │   │   └── wagmi.ts
  │   ├── stores/
  │   │   ├── energyStore.ts
  │   │   ├── mapStore.ts
  │   │   └── alertStore.ts
  │   └── styles/
  │       ├── globals.css
  │       └── components.css
  ├── contracts/
  │   ├── abi/
  │   │   └── EnergyMonitor.json
  │   └── addresses.json
  └── scripts/
      ├── build.ts
      └── deploy.ts

  Dependencies

  {
    "name": "@open-grid/frontend",
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "wagmi": "^2.5.0",
      "viem": "^2.7.0",
      "@tanstack/react-query": "^5.0.0",
      "@rainbow-me/rainbowkit": "^2.0.0",
      "react-map-gl": "^7.1.0",
      "mapbox-gl": "^3.1.0",
      "@deck.gl/react": "^9.0.0",
      "@deck.gl/layers": "^9.0.0",
      "recharts": "^2.8.0",
      "framer-motion": "^11.0.0",
      "lucide-react": "^0.344.0",
      "clsx": "^2.1.0",
      "tailwind-merge": "^2.2.0",
      "date-fns": "^3.0.0",
      "socket.io-client": "^4.7.0",
      "zustand": "^4.5.0"
    },
    "devDependencies": {
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.2.0",
      "vite": "^5.1.0",
      "typescript": "^5.0.0",
      "tailwindcss": "^3.4.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0",
      "eslint": "^8.57.0",
      "prettier": "^3.2.0"
    }
  }

  Core Configuration

  Vite Configuration

  // vite.config.ts
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import path from 'path'

  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@contracts': path.resolve(__dirname, './contracts'),
      },
    },
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  })

  wagmi Configuration

  // src/lib/wagmi.ts
  import { getDefaultConfig } from '@rainbow-me/rainbowkit'
  import {
    mainnet,
    polygon,
    arbitrum,
    optimism,
    base,
    avalanche,
    bsc,
    gnosis,
    sepolia,
    polygonMumbai,
  } from 'wagmi/chains'

  export const config = getDefaultConfig({
    appName: 'Open Grid Energy Monitor',
    projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID!,
    chains: [
      // Mainnets
      mainnet,
      polygon,
      arbitrum,
      optimism,
      base,
      avalanche,
      bsc,
      gnosis,
      // Testnets
      sepolia,
      polygonMumbai,
    ],
    ssr: false,
  })

  export const SUPPORTED_CHAINS = {
    [mainnet.id]: {
      name: 'Ethereum',
      shortName: 'ETH',
      contractAddress: process.env.VITE_ETHEREUM_CONTRACT_ADDRESS,
    },
    [polygon.id]: {
      name: 'Polygon',
      shortName: 'MATIC',
      contractAddress: process.env.VITE_POLYGON_CONTRACT_ADDRESS,
    },
    [arbitrum.id]: {
      name: 'Arbitrum',
      shortName: 'ARB',
      contractAddress: process.env.VITE_ARBITRUM_CONTRACT_ADDRESS,
    },
    [optimism.id]: {
      name: 'Optimism',
      shortName: 'OP',
      contractAddress: process.env.VITE_OPTIMISM_CONTRACT_ADDRESS,
    },
    [base.id]: {
      name: 'Base',
      shortName: 'BASE',
      contractAddress: process.env.VITE_BASE_CONTRACT_ADDRESS,
    },
    [avalanche.id]: {
      name: 'Avalanche',
      shortName: 'AVAX',
      contractAddress: process.env.VITE_AVALANCHE_CONTRACT_ADDRESS,
    },
    [bsc.id]: {
      name: 'BNB Chain',
      shortName: 'BNB',
      contractAddress: process.env.VITE_BNB_CONTRACT_ADDRESS,
    },
    [gnosis.id]: {
      name: 'Gnosis',
      shortName: 'GNO',
      contractAddress: process.env.VITE_GNOSIS_CONTRACT_ADDRESS,
    },
  } as const

  Main Application Components

  App Component

  // src/App.tsx
  import React from 'react'
  import { WagmiProvider } from 'wagmi'
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
  import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
  import { config } from '@/lib/wagmi'
  import { Header } from '@/components/layout/Header'
  import { MapContainer } from '@/components/map/MapContainer'
  import { Dashboard } from '@/components/dashboard/Dashboard'
  import { useEnergyStore } from '@/stores/energyStore'
  import '@rainbow-me/rainbowkit/styles.css'
  import './styles/globals.css'

  const queryClient = new QueryClient()

  function App() {
    const { viewMode } = useEnergyStore()

    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main className="container mx-auto px-4 py-6">
                {viewMode === 'map' ? <MapContainer /> : <Dashboard />}
              </main>
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  }

  export default App

  Map Container

  // src/components/map/MapContainer.tsx
  import React, { useMemo } from 'react'
  import Map, { NavigationControl, FullscreenControl } from 'react-map-gl'
  import DeckGL from '@deck.gl/react'
  import { ScatterplotLayer, HeatmapLayer } from '@deck.gl/layers'
  import { useChainId } from 'wagmi'
  import { useMapData } from '@/hooks/useMapData'
  import { useEnergyData } from '@/hooks/useEnergyData'
  import { NetworkSelector } from './NetworkSelector'
  import { EnergyNodeMarker } from './EnergyNodeMarker'
  import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants'

  const INITIAL_VIEW_STATE = {
    longitude: -100,
    latitude: 40,
    zoom: 4,
    maxZoom: 16,
    pitch: 0,
    bearing: 0,
  }

  export function MapContainer() {
    const chainId = useChainId()
    const { nodes, isLoading } = useEnergyData(chainId)
    const { viewState, setViewState } = useMapData()

    const layers = useMemo(() => {
      if (!nodes.length) return []

      return [
        new ScatterplotLayer({
          id: 'energy-nodes',
          data: nodes,
          getPosition: (d: any) => [d.longitude, d.latitude],
          getRadius: (d: any) => Math.sqrt(d.currentUsage) * 100,
          getFillColor: (d: any) => {
            const usage = d.currentUsage || 0
            if (usage > 5000) return [255, 0, 0, 160] // High usage - red
            if (usage > 2000) return [255, 165, 0, 160] // Medium usage - 
  orange
            return [0, 255, 0, 160] // Low usage - green
          },
          pickable: true,
          radiusMinPixels: 8,
          radiusMaxPixels: 100,
          onClick: (info: any) => {
            if (info.object) {
              console.log('Node clicked:', info.object)
            }
          },
        }),
        new HeatmapLayer({
          id: 'energy-heatmap',
          data: nodes,
          getPosition: (d: any) => [d.longitude, d.latitude],
          getWeight: (d: any) => d.currentUsage || 0,
          radiusPixels: 60,
          visible: nodes.length > 10, // Only show heatmap with sufficient 
  data
        }),
      ]
    }, [nodes])

    return (
      <div className="relative w-full h-[600px] rounded-lg overflow-hidden 
  shadow-lg">
        <NetworkSelector />

        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
        >
          <Map
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            reuseMaps
          >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />
          </Map>
        </DeckGL>

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex 
  items-center justify-center">
            <div className="text-white">Loading energy data...</div>
          </div>
        )}
      </div>
    )
  }

  Energy Data Hook

  // src/hooks/useEnergyData.ts
  import { useEffect, useState } from 'react'
  import { useContractReads, useContractEvent } from 'wagmi'
  import { useWebSocket } from './useWebSocket'
  import { SUPPORTED_CHAINS } from '@/lib/wagmi'
  import { EnergyNode, EnergyData } from '@/types/energy'
  import EnergyMonitorABI from '@contracts/abi/EnergyMonitor.json'

  export function useEnergyData(chainId: number) {
    const [nodes, setNodes] = useState<EnergyNode[]>([])
    const [latestData, setLatestData] = useState<EnergyData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const chainConfig = SUPPORTED_CHAINS[chainId as keyof typeof
  SUPPORTED_CHAINS]
    const contractAddress = chainConfig?.contractAddress as `0x${string}`

    // Read contract data
    const { data: contractData, isError, isLoading: contractLoading } =
  useContractReads({
      contracts: [
        {
          address: contractAddress,
          abi: EnergyMonitorABI,
          functionName: 'getAllNodes',
        },
        {
          address: contractAddress,
          abi: EnergyMonitorABI,
          functionName: 'dataCount',
        },
      ],
      enabled: !!contractAddress,
    })

    // Listen for real-time events
    useContractEvent({
      address: contractAddress,
      abi: EnergyMonitorABI,
      eventName: 'DataUpdated',
      listener: (logs) => {
        logs.forEach((log) => {
          const { dataId, nodeId, kWh, location, timestamp } = log.args

          const newData: EnergyData = {
            id: dataId.toString(),
            nodeId: nodeId.toString(),
            kWh: Number(kWh),
            location: location,
            timestamp: Number(timestamp),
            chainId,
          }

          setLatestData(prev => [newData, ...prev.slice(0, 99)]) // Keep last 
  100 entries

          // Update node with latest usage
          setNodes(prev => prev.map(node =>
            node.id === nodeId.toString()
              ? { ...node, currentUsage: Number(kWh), lastUpdate:
  Number(timestamp) }
              : node
          ))
        })
      },
      enabled: !!contractAddress,
    })

    // WebSocket for cross-chain updates
    const { lastMessage } = useWebSocket(process.env.VITE_WEBSOCKET_URL!)

    useEffect(() => {
      if (lastMessage) {
        try {
          const data = JSON.parse(lastMessage.data)
          if (data.type === 'energy_update' && data.chainId === chainId) {
            // Handle cross-chain updates
            const { nodeId, kWh, timestamp } = data
            setNodes(prev => prev.map(node =>
              node.id === nodeId
                ? { ...node, currentUsage: kWh, lastUpdate: timestamp }
                : node
            ))
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error)
        }
      }
    }, [lastMessage, chainId])

    useEffect(() => {
      if (contractData && contractData[0]) {
        const nodesData = contractData[0] as any[]

        const formattedNodes: EnergyNode[] = nodesData.map((node, index) => {
          const [lat, lon] = parseLocation(node.location)
          return {
            id: node.id.toString(),
            location: node.location,
            latitude: lat,
            longitude: lon,
            active: node.active,
            lastUpdate: Number(node.lastUpdate),
            currentUsage: 0, // Will be updated by events
            chainId,
          }
        })

        setNodes(formattedNodes)
        setIsLoading(false)
      }
    }, [contractData, chainId])

    return {
      nodes,
      latestData,
      isLoading: isLoading || contractLoading,
      isError,
      refetch: () => {
        // Trigger refetch logic
      },
    }
  }

  function parseLocation(location: string): [number, number] {
    try {
      const [latStr, lonStr] = location.split(',')
      const lat = parseFloat(latStr.split(':')[1])
      const lon = parseFloat(lonStr.split(':')[1])
      return [lat, lon]
    } catch {
      return [0, 0]
    }
  }

  Multi-Chain Event Hook

  // src/hooks/useMultiChainEvents.ts
  import { useEffect, useState } from 'react'
  import { useContractEvent } from 'wagmi'
  import { SUPPORTED_CHAINS } from '@/lib/wagmi'
  import { EnergyData } from '@/types/energy'
  import EnergyMonitorABI from '@contracts/abi/EnergyMonitor.json'

  export function useMultiChainEvents() {
    const [allEvents, setAllEvents] = useState<EnergyData[]>([])
    const [eventsByChain, setEventsByChain] = useState<Record<number,
  EnergyData[]>>({})

    // Create listeners for each supported chain
    const chainIds = Object.keys(SUPPORTED_CHAINS).map(Number)

    useEffect(() => {
      const listeners: (() => void)[] = []

      chainIds.forEach(chainId => {
        const chainConfig = SUPPORTED_CHAINS[chainId as keyof typeof
  SUPPORTED_CHAINS]
        if (!chainConfig?.contractAddress) return

        // This would ideally use a multi-chain provider
        // For now, we'll use the current approach with individual listeners
      })

      return () => {
        listeners.forEach(cleanup => cleanup())
      }
    }, [])

    return {
      allEvents,
      eventsByChain,
      totalEventCount: allEvents.length,
    }
  }

  Dashboard Component

  // src/components/dashboard/Dashboard.tsx
  import React from 'react'
  import { useChainId } from 'wagmi'
  import { useEnergyData } from '@/hooks/useEnergyData'
  import { MetricCards } from './MetricCards'
  import { UsageChart } from './UsageChart'
  import { NodeList } from './NodeList'
  import { AlertPanel } from './AlertPanel'

  export function Dashboard() {
    const chainId = useChainId()
    const { nodes, latestData, isLoading } = useEnergyData(chainId)

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 
  border-blue-500"></div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCards nodes={nodes} latestData={latestData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UsageChart data={latestData} />
          <AlertPanel />
        </div>

        <NodeList nodes={nodes} />
      </div>
    )
  }

  State Management

  Energy Store

  // src/stores/energyStore.ts
  import { create } from 'zustand'
  import { EnergyNode, EnergyData } from '@/types/energy'

  interface EnergyState {
    viewMode: 'map' | 'dashboard'
    selectedChain: number
    selectedNode: string | null
    nodes: Record<number, EnergyNode[]> // chainId -> nodes
    historicalData: EnergyData[]
    alerts: Alert[]

    // Actions
    setViewMode: (mode: 'map' | 'dashboard') => void
    setSelectedChain: (chainId: number) => void
    setSelectedNode: (nodeId: string | null) => void
    updateNodeData: (chainId: number, nodeId: string, data: 
  Partial<EnergyNode>) => void
    addEnergyData: (data: EnergyData) => void
    addAlert: (alert: Alert) => void
    clearAlerts: () => void
  }

  export const useEnergyStore = create<EnergyState>((set, get) => ({
    viewMode: 'map',
    selectedChain: 137, // Polygon default
    selectedNode: null,
    nodes: {},
    historicalData: [],
    alerts: [],

    setViewMode: (mode) => set({ viewMode: mode }),

    setSelectedChain: (chainId) => set({ selectedChain: chainId }),

    setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),

    updateNodeData: (chainId, nodeId, data) => set((state) => ({
      nodes: {
        ...state.nodes,
        [chainId]: state.nodes[chainId]?.map(node =>
          node.id === nodeId ? { ...node, ...data } : node
        ) || []
      }
    })),

    addEnergyData: (data) => set((state) => ({
      historicalData: [data, ...state.historicalData.slice(0, 999)] // Keep 
  last 1000
    })),

    addAlert: (alert) => set((state) => ({
      alerts: [alert, ...state.alerts.slice(0, 49)] // Keep last 50
    })),

    clearAlerts: () => set({ alerts: [] }),
  }))

  Environment Variables

  # Mapbox
  VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token

  # WalletConnect
  VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

  # Contract Addresses
  VITE_ETHEREUM_CONTRACT_ADDRESS=0x...
  VITE_POLYGON_CONTRACT_ADDRESS=0x...
  VITE_ARBITRUM_CONTRACT_ADDRESS=0x...
  VITE_OPTIMISM_CONTRACT_ADDRESS=0x...
  VITE_BASE_CONTRACT_ADDRESS=0x...
  VITE_AVALANCHE_CONTRACT_ADDRESS=0x...
  VITE_BNB_CONTRACT_ADDRESS=0x...
  VITE_GNOSIS_CONTRACT_ADDRESS=0x...

  # WebSocket for real-time updates
  VITE_WEBSOCKET_URL=ws://localhost:8080

  # API endpoints
  VITE_API_BASE_URL=http://localhost:3001/api

  Build Scripts

  {
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "lint": "eslint . --ext ts,tsx --report-unused-disable-directives 
  --max-warnings 0",
      "lint:fix": "eslint . --ext ts,tsx --fix",
      "type-check": "tsc --noEmit",
      "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
      "test": "vitest",
      "test:ui": "vitest --ui"
    }
  }

  Key Features

  - Multi-Chain Support: Seamless switching between 8+ EVM networks
  - Real-time Visualization: Live maps with energy usage data
  - Interactive Dashboard: Comprehensive metrics and analytics
  - Wallet Integration: Connect with popular Ethereum wallets
  - Responsive Design: Works on desktop and mobile devices
  - Type Safety: Full TypeScript coverage
  - Performance: Optimized rendering with Vite and React 18
  - Real-time Updates: WebSocket and blockchain event integration