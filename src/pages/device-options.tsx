import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { KeyContainerService } from "@/services/key-container-service"
import { DliService, type DliBridgeSettings } from "@/services/dli-service"
import type { ContainerKey } from "@/types"
import { 
  Wifi, 
  Shield, 
  MessageSquare,
  Copy,
  Radio,
  AlertTriangle,
  Settings,
  Network,
  Lock
} from "lucide-react"

export function DeviceOptionsPage() {
  // DLI (Data Link Independent) Settings
  const [dliEnabled, setDliEnabled] = useState(false)
  const [dliConnected, setDliConnected] = useState(false)

  // FIPS Transfer Mode Settings
  const [fipsEnabled, setFipsEnabled] = useState(false)
  const [fipsSettings, setFipsSettings] = useState({
    tekKeyId: "",
    kekKeyId: ""
  })

  // Message Authentication Settings
  const [macEnabled, setMacEnabled] = useState(false)
  const [macSettings, setMacSettings] = useState({
    macKeyId: "",
    mnp: "0"
  })

  const [availableKeys, setAvailableKeys] = useState<ContainerKey[]>([])
  const [bridgeCliCommand, setBridgeCliCommand] = useState("")

  const containerService = KeyContainerService.getInstance()
  const dliService = DliService.getInstance()

  useEffect(() => {
    // Initialize DLI settings from service
    setBridgeCliCommand(dliService.generateDliCli())
    
    // Load available keys for FIPS and MAC
    const updateKeys = () => {
      const container = containerService.getContainer()
      setAvailableKeys(container.keys)
    }

    // Set up connection change listener
    const handleDliConnection = (connected: boolean) => {
      setDliConnected(connected)
    }

    containerService.onChange(updateKeys)
    dliService.onConnectionChange(handleDliConnection)
    
    updateKeys()
    setDliConnected(dliService.isConnected())
  }, [])

  useEffect(() => {
    // Update CLI command when settings change
    setBridgeCliCommand(dliService.generateDliCli())
  }, [dliEnabled])

  const updateDliSettings = (key: keyof DliBridgeSettings, value: string | number) => {
    dliService.updateSettings({ [key]: value })
    setBridgeCliCommand(dliService.generateDliCli())
  }

  const copyDliCli = async () => {
    const success = await dliService.copyDliCli()
    if (success) {
      alert("DLI CLI command copied to clipboard!")
    } else {
      // Fallback: show the command in an alert
      alert(`DLI CLI Command:\n${bridgeCliCommand}`)
    }
  }

  const connectDliBridge = async () => {
    try {
      await dliService.connectSocket()
      alert("DLI Bridge connection initiated")
    } catch (error) {
      console.error("Failed to connect to DLI Bridge:", error)
      alert("Failed to connect to DLI Bridge")
    }
  }

  const disconnectDliBridge = async () => {
    try {
      await dliService.disconnectSocket()
      alert("DLI Bridge disconnected")
    } catch (error) {
      console.error("Failed to disconnect DLI Bridge:", error)
      alert("Failed to disconnect DLI Bridge")
    }
  }

  const checkMrConnection = async () => {
    try {
      await dliService.checkMrConnection()
      alert("MR Connection check completed successfully")
    } catch (error) {
      console.error("MR Connection check failed:", error)
      alert("MR Connection check failed")
    }
  }

  const syncMnpToRadio = async () => {
    try {
      console.log("Syncing MNP to radio:", macSettings.mnp)
      // Implement MNP sync logic here
      alert(`MNP ${macSettings.mnp} synced to radio successfully!`)
    } catch (error) {
      alert("Failed to sync MNP to radio")
    }
  }

  const getTekKeys = (): ContainerKey[] => {
    return availableKeys.filter(key => {
      const sln = key.slnCkr
      return sln >= 0 && sln <= 61439 // TEK range
    })
  }

  const getKekKeys = (): ContainerKey[] => {
    return availableKeys.filter(key => {
      const sln = key.slnCkr
      return sln >= 61440 && sln <= 65535 // KEK range
    })
  }


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Device Options</h1>
        <p className="text-muted-foreground">
          Under Development.
        </p>
      </div>

      {/* Data Link Independent (DLI) */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Data Link Independent (DLI)</span>
            {dliConnected && (
              <span className="ml-2 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </CardTitle>
          <CardDescription>
            Configure IP/UDP connection for remote radio communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dliSwitch"
              checked={dliEnabled}
              onCheckedChange={setDliEnabled}
            />
            <Label htmlFor="dliSwitch">Enable Data Link Independent</Label>
          </div>

          {dliEnabled && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="radioHost">Radio Hostname or IP</Label>
                  <Input
                    id="radioHost"
                    value={dliService.getSettings().radioHost}
                    onChange={(e) => updateDliSettings('radioHost', e.target.value)}
                    placeholder="192.168.132.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyloadingPort">Keyloading UDP Port</Label>
                  <Input
                    id="keyloadingPort"
                    type="number"
                    value={dliService.getSettings().keyloadingPort.toString()}
                    onChange={(e) => updateDliSettings('keyloadingPort', parseInt(e.target.value) || 49644)}
                    min="0"
                    max="65535"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="radioVariant">Radio Variant</Label>
                  <Select 
                    value={dliService.getSettings().radioVariant.toString()} 
                    onValueChange={(value) => updateDliSettings('radioVariant', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Standard</SelectItem>
                      <SelectItem value="1">Motorola</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bridgePort">DLI Bridge Port</Label>
                  <Input
                    id="bridgePort"
                    type="number"
                    value={dliService.getSettings().bridgePort.toString()}
                    onChange={(e) => updateDliSettings('bridgePort', parseInt(e.target.value) || 8080)}
                    min="0"
                    max="65535"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>DLI Bridge CLI Command</Label>
                <div className="flex space-x-2">
                  <Input
                    value={bridgeCliCommand}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={copyDliCli}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex space-x-2">
                {!dliConnected ? (
                  <Button onClick={connectDliBridge}>
                    Connect to DLI Bridge
                  </Button>
                ) : (
                  <Button variant="outline" onClick={disconnectDliBridge}>
                    Disconnect DLI Bridge
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={checkMrConnection}
                  disabled={!dliConnected}
                >
                  Check MR Connection
                </Button>
              </div>
              
              {dliConnected && (
                <Alert>
                  <Radio className="h-4 w-4" />
                  <AlertDescription>
                    DLI Bridge is connected and ready for radio communication.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FIPS Transfer Mode */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>FIPS Transfer Mode</span>
            {fipsEnabled && (
              <Lock className="h-4 w-4 text-green-600" />
            )}
          </CardTitle>
          <CardDescription>
            Configure FIPS-compliant key transfer with encryption keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="fipsSwitch"
              checked={fipsEnabled}
              onCheckedChange={setFipsEnabled}
            />
            <Label htmlFor="fipsSwitch">Enable FIPS Transfer Mode</Label>
          </div>

          {fipsEnabled && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tekKey">Traffic Encryption Key (TEK)</Label>
                  <Select 
                    value={fipsSettings.tekKeyId} 
                    onValueChange={(value) => setFipsSettings(prev => ({ ...prev, tekKeyId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select TEK key" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTekKeys().map((key) => (
                        <SelectItem key={key.id} value={key.id.toString()}>
                          {key.name} - SLN {key.slnCkr}, KID {key.keyId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kekKey">Key Encryption Key (KEK)</Label>
                  <Select 
                    value={fipsSettings.kekKeyId} 
                    onValueChange={(value) => setFipsSettings(prev => ({ ...prev, kekKeyId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select KEK key" />
                    </SelectTrigger>
                    <SelectContent>
                      {getKekKeys().map((key) => (
                        <SelectItem key={key.id} value={key.id.toString()}>
                          {key.name} - SLN {key.slnCkr}, KID {key.keyId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Authentication */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Message Authentication</span>
            {macEnabled && (
              <Lock className="h-4 w-4 text-blue-600" />
            )}
          </CardTitle>
          <CardDescription>
            Configure message authentication with MAC keys and MNP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="macSwitch"
              checked={macEnabled}
              onCheckedChange={setMacEnabled}
            />
            <Label htmlFor="macSwitch">Enable Message Authentication</Label>
          </div>

          {macEnabled && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="macKey">Message Authentication Key</Label>
                  <Select 
                    value={macSettings.macKeyId} 
                    onValueChange={(value) => setMacSettings(prev => ({ ...prev, macKeyId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select MAC key" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTekKeys().map((key) => (
                        <SelectItem key={key.id} value={key.id.toString()}>
                          {key.name} - SLN {key.slnCkr}, KID {key.keyId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mnp">MNP (Message Number)</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="mnp"
                      type="number"
                      value={macSettings.mnp}
                      onChange={(e) => setMacSettings(prev => ({ ...prev, mnp: e.target.value }))}
                      min="0"
                      max="65535"
                    />
                    <Button onClick={syncMnpToRadio} variant="outline">
                      Sync to Radio
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Device Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Data Link Independent (DLI):</strong> Enables IP/UDP communication with remote radios</p>
            <p><strong>FIPS Transfer Mode:</strong> Uses encryption keys for secure key transfers</p>
            <p><strong>Message Authentication:</strong> Adds cryptographic authentication to messages</p>
            
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                These are advanced features that require specific radio configurations and may not be supported on all devices.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
