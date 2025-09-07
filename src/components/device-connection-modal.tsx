import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConnection } from "@/contexts/connection-context"
import { hasWebSerialSupport, hasWebUSBSupport } from "@/lib/utils"
import type { ConnectionMethod } from "@/types"
import { 
  Usb, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  Loader2,
  Radio,
  Settings
} from "lucide-react"

interface DeviceConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceConnectionModal({ open, onOpenChange }: DeviceConnectionModalProps) {
  const { 
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
    setConnectionMethod
  } = useConnection()

  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod>(connectionMethod)
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const [connectionTestSuccess, setConnectionTestSuccess] = useState(false)
  
  // Check if any connection method is available for MR testing
  const canTestMrConnection = connectionStatus === "connected" || dliConnected

  const handleMethodChange = (method: ConnectionMethod) => {
    setSelectedMethod(method)
    setConnectionMethod(method)
  }

  const handleConnect = async () => {
    clearError()
    await connect()
  }

  const handleDisconnect = async () => {
    await disconnect()
  }

  const handleCheckConnection = async () => {
    setIsCheckingConnection(true)
    clearError()
    try {
      await checkConnection()
      // Show green checkmark for success - no popup
      setConnectionTestSuccess(true)
      setTimeout(() => setConnectionTestSuccess(false), 2000) // Hide after 2 seconds
    } catch (err) {
      // Error is already handled by the connection context
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "connecting":
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <Usb className="h-6 w-6 text-gray-500" />
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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getStatusIcon()}
            <span>Device Connection Manager</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Primary Connection Controls */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon()}
              <div>
                <div className="text-xl font-semibold">{getStatusText()}</div>
                {deviceInfo && (
                  <div className="text-sm text-muted-foreground">
                    {deviceInfo.name} v{deviceInfo.version}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              {connectionStatus === "disconnected" && !dliConnected && (
                <Button onClick={handleConnect} disabled={isConnecting} size="lg">
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Usb className="h-5 w-5 mr-2" />
                  )}
                  Connect KFD Device
                </Button>
              )}
              {canTestMrConnection && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleCheckConnection}
                    disabled={isCheckingConnection}
                    className={connectionTestSuccess ? "border-green-500 bg-green-50" : ""}
                  >
                    {isCheckingConnection ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : connectionTestSuccess ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Radio className="h-4 w-4 mr-2" />
                    )}
                    {isCheckingConnection ? "Checking..." : connectionTestSuccess ? "MR Connected!" : "Check MR Connection"}
                  </Button>
                  {connectionStatus === "connected" && (
                    <Button variant="outline" onClick={handleDisconnect}>
                      <Usb className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  )}
                </>
              )}
              {connectionStatus === "error" && (
                <Button onClick={handleConnect} disabled={isConnecting} size="lg">
                  <Usb className="h-5 w-5 mr-2" />
                  Retry Connection
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Device Information - Matches Original Format */}
          {deviceInfo && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-mono">{deviceInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revision:</span>
                    <span className="font-mono">{deviceInfo.hwVersion || '0.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firmware:</span>
                    <span className="font-mono">{deviceInfo.firmwareVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protocol:</span>
                    <span className="font-mono">{deviceInfo.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-mono">{deviceInfo.serialNumber || ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unique ID:</span>
                    <span className="font-mono text-xs">{deviceInfo.uniqueId || ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact Connection Method Selection */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div className="flex items-center space-x-3">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Connection Method:</span>
            </div>
            <div className="flex items-center space-x-2">
              <Select 
                value={selectedMethod} 
                onValueChange={handleMethodChange}
                disabled={connectionStatus === "connected" || connectionStatus === "connecting"}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webserial" disabled={!hasWebSerialSupport()}>
                    <div className="flex items-center justify-between w-full">
                      <span>Web Serial</span>
                      {hasWebSerialSupport() ? (
                        <Badge variant="default" className="ml-2 text-xs">✓</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs">✗</Badge>
                      )}
                    </div>
                  </SelectItem>
                  <SelectItem value="webusb" disabled={!hasWebUSBSupport()}>
                    <div className="flex items-center justify-between w-full">
                      <span>WebUSB</span>
                      {hasWebUSBSupport() ? (
                        <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs">✗</Badge>
                      )}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Firmware Notice - Only show for KFDtool or when disconnected */}
          {(!deviceInfo || deviceInfo.name === "KFDtool") && (
            <Accordion type="single" collapsible>
              <AccordionItem value="firmware-notice">
                <AccordionTrigger className="text-sm py-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Firmware Notice</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        KFDtool requires firmware <strong>v1.4.0+</strong> for proper operation
                      </AlertDescription>
                    </Alert>
                    
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="/KFDtool_firmware_AP_v1_1_1.zip" download>
                        <Download className="h-4 w-4 mr-2" />
                        Download Beta Firmware
                      </a>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
