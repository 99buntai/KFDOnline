import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { AdapterProtocolService } from "@/services/adapter-protocol-service"
import { DliService } from "@/services/dli-service"
import { hasWebSerialSupport, hasWebUSBSupport } from "@/lib/utils"
import type { DeviceInfo, ConnectionMethod, ConnectionStatus } from "@/types"

interface ConnectionContextType {
  connectionStatus: ConnectionStatus
  connectionMethod: ConnectionMethod
  deviceInfo: DeviceInfo | null
  error: string
  isConnecting: boolean
  dliConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  checkConnection: () => Promise<void>
  clearError: () => void
  setConnectionMethod: (method: ConnectionMethod) => void
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (context === undefined) {
    // During development, this might happen due to hot module reload
    if (import.meta.env.DEV) {
      console.warn("useConnection called outside ConnectionProvider during HMR")
      return {
        connectionStatus: "disconnected" as ConnectionStatus,
        connectionMethod: "webserial" as ConnectionMethod,
        deviceInfo: null,
        error: "",
        isConnecting: false,
        dliConnected: false,
        connect: async () => {},
        disconnect: async () => {},
        checkConnection: async () => {},
        clearError: () => {},
        setConnectionMethod: () => {}
      }
    }
    throw new Error("useConnection must be used within a ConnectionProvider")
  }
  return context
}

interface ConnectionProviderProps {
  children: ReactNode
}

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("webserial")
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [dliConnected, setDliConnected] = useState(false)

  const deviceService = AdapterProtocolService.getInstance()
  const dliService = DliService.getInstance()

  useEffect(() => {
    // Initialize connection method based on browser support
    const method = deviceService.getConnectionMethod()
    setConnectionMethod(method)
    
    // Set the method in the service as well
    try {
      deviceService.setConnectionMethod(method)
    } catch (error) {
      // Ignore error if already connected
    }

    // Set up connection status monitoring
    deviceService.onConnectionChange((connected) => {
      setConnectionStatus(connected ? "connected" : "disconnected")
      if (connected) {
        setDeviceInfo(deviceService.getDeviceInfo())
        setError("")
      } else {
        setDeviceInfo(null)
      }
      setIsConnecting(false)
    })

    // Set up DLI connection monitoring
    dliService.onConnectionChange((connected) => {
      setDliConnected(connected)
    })

    // Check initial connection states
    if (deviceService.isConnected()) {
      setConnectionStatus("connected")
      setDeviceInfo(deviceService.getDeviceInfo())
    }
    setDliConnected(dliService.isConnected())
  }, [])

  const connect = async () => {
    setIsConnecting(true)
    setConnectionStatus("connecting")
    setError("")
    
    try {
      // Check if browser supports required APIs
      if (!hasWebSerialSupport() && !hasWebUSBSupport()) {
        throw new Error("Your browser doesn't support Web Serial API or WebUSB. Please use Chrome, Edge, or Opera.")
      }

      const info = await deviceService.connect()
      setDeviceInfo(info)
      setConnectionStatus("connected")
      setIsConnecting(false)
    } catch (err) {
      setConnectionStatus("error")
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setIsConnecting(false)
    }
  }

  const disconnect = async () => {
    try {
      await deviceService.disconnect()
      setConnectionStatus("disconnected")
      setDeviceInfo(null)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error disconnecting device")
    }
  }

  const checkConnection = async () => {
    try {
      // This implements the exact same logic as CheckMrConnection() in the HTML version
      const serialConnected = deviceService.isConnected()
      const dliConnected = dliService.isConnected()
      
      if (!serialConnected && !dliConnected) {
        const errorMsg = "No MR connection methods have been established yet - connect a MR using a KFD or DLI"
        setError(errorMsg)
        return
      }

      if (serialConnected) {
        // Test MR connection via serial (KFD hardware) - exact HTML logic
        const { ManualRekeyApplication } = await import("@/services/manual-rekey-application")
        
        // Test communication using the device service directly
        const mra = new ManualRekeyApplication(deviceService, false)
        
        // Test the connection by doing a Begin/End cycle like HTML version
        await mra.Begin()
        await mra.End()
        
        setError("")
        console.log("MR connection test successful via serial")
        return
      } else if (dliConnected) {
        // Test MR connection via DLI bridge - exact HTML logic
        await dliService.checkMrConnection()
        setError("")
        console.log("MR connection test successful via DLI")
        return
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "There was a problem connecting to the MR"
      setError(errorMsg)
      console.error("MR connection check failed:", err)
      throw err
    }
  }

  const clearError = () => {
    setError("")
  }

  const setConnectionMethodHandler = (method: ConnectionMethod) => {
    if (connectionStatus === "disconnected") {
      setConnectionMethod(method)
      // Update the device service with the new method
      try {
        deviceService.setConnectionMethod(method)
      } catch (error) {
        console.error('Failed to set connection method:', error)
      }
    }
  }

  const value: ConnectionContextType = {
    connectionStatus,
    connectionMethod,
    deviceInfo,
    error,
    isConnecting,
    dliConnected,
    connect,
    disconnect,
    checkConnection,
    clearError,
    setConnectionMethod: setConnectionMethodHandler
  }

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}
