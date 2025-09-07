import { useState, useEffect } from "react"
import { AdapterProtocolService } from "@/services/adapter-protocol-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Usb, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react"

type ConnectionMethod = "webserial" | "webusb"
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface DeviceInfo {
  name: string
  version: string
  serialNumber: string
  firmwareVersion: string
}

export function ConnectDevicePage() {
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("webserial")
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState<string>("")
  const deviceService = AdapterProtocolService.getInstance()

  useEffect(() => {
    // Determine the best connection method based on browser support
    const method = deviceService.getConnectionMethod()
    setConnectionMethod(method)

    // Set up connection status monitoring
    deviceService.onConnectionChange((connected) => {
      setConnectionStatus(connected ? "connected" : "disconnected")
      if (connected) {
        setDeviceInfo(deviceService.getDeviceInfo())
      } else {
        setDeviceInfo(null)
      }
    })
  }, [])

  const connectDevice = async () => {
    setConnectionStatus("connecting")
    setError("")
    
    try {
      const info = await deviceService.connect()
      setDeviceInfo(info)
      setConnectionStatus("connected")
    } catch (err) {
      setConnectionStatus("error")
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    }
  }

  const disconnectDevice = async () => {
    try {
      await deviceService.disconnect()
      setConnectionStatus("disconnected")
      setDeviceInfo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error disconnecting device")
    }
  }


  const checkConnection = async () => {
    try {
      const isConnected = await deviceService.checkConnection()
      if (isConnected) {
        alert("Connection is active and working properly.")
      } else {
        alert("Connection check failed. Please verify device connection.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection check failed")
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "connecting":
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "error":
        return "Connection Error"
      default:
        return "Disconnected"
    }
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Connected</Badge>
      case "connecting":
        return <Badge variant="secondary">Connecting</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Disconnected</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connect Key Fill Device</h1>
        <p className="text-muted-foreground">
          Connect your KFDtool, KFDshield, or KFDMicro device to begin key management operations.
        </p>
      </div>

      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Usb className="h-5 w-5" />
            <span>Device Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={connectDevice}
              disabled={connectionStatus === "connecting" || connectionStatus === "connected"}
            >
              Connect KFD
            </Button>
            <Button 
              variant="outline"
              onClick={disconnectDevice}
              disabled={connectionStatus !== "connected"}
            >
              Disconnect KFD
            </Button>
            <Button 
              variant="outline"
              onClick={checkConnection}
              disabled={connectionStatus !== "connected"}
            >
              Check MR Connection
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Connection Method */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Method</CardTitle>
          <CardDescription>
            Select the connection method for communicating with your device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={connectionMethod} 
            onValueChange={(value: ConnectionMethod) => setConnectionMethod(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select connection method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="webserial">Web Serial API</SelectItem>
              <SelectItem value="webusb">WebUSB API</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>Connection Status</span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{getStatusText()}</p>
        </CardContent>
      </Card>

      {/* Device Properties */}
      {deviceInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Device Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="font-medium">Device Name:</span>
                <span>{deviceInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Version:</span>
                <span>{deviceInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Serial Number:</span>
                <span>{deviceInfo.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Firmware Version:</span>
                <span>{deviceInfo.firmwareVersion}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KFDtool Firmware Notice */}
      <Accordion type="single" collapsible>
        <AccordionItem value="firmware-notice">
          <AccordionTrigger>KFDtool Firmware Notice</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  KFDtool must be running firmware <strong>v1.4.0</strong> for proper operation
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Firmware Update Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Download the current firmware from the official KFDtool website</li>
                  <li>Open KFDtool v1.5.0 on a Windows computer</li>
                  <li>Select Utility → Adapter Self Test → Enter BSL Mode</li>
                  <li>Select Utility → Initialize Adapter, choose the decompressed cfp file</li>
                  <li>Select the HW version (found on the bottom of the KFDtool software or device label)</li>
                </ol>
              </div>

              <div className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <a 
                  href="/KFDtool_firmware_AP_v1_1_1.zip" 
                  download 
                  className="text-primary hover:underline"
                >
                  Download Beta Firmware (Testing Only)
                </a>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
