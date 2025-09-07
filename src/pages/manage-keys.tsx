import { useState } from "react"
import { useConnection } from "@/contexts/connection-context"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { List, Search, Trash2, AlertTriangle, Eye, MoreHorizontal, CheckCircle, Key, Radio } from "lucide-react"

interface RadioKey {
  keysetId: number
  type: string
  sln: number
  keyId: number
  algorithm: string
  status: "active" | "inactive" | "expired"
}

// Algorithm ID lookup (from original AlgorithmId.js)
const AlgorithmNames: { [key: number]: string } = {
  0x00: "ACCORDION",
  0x01: "BATON_ODD", 
  0x02: "FIREFLY",
  0x03: "MAYFLY",
  0x04: "SAVILLE",
  0x05: "PADSTONE",
  0x41: "BATON_EVEN",
  0x80: "CLEAR",
  0x81: "DES-OFB",
  0x83: "TDES",
  0x84: "AES-256",
  0x85: "AES-128",
  0x9F: "DES-XL",
  0xA0: "DVI-XL",
  0xA1: "DVP-XL",
  0xAA: "ADP/RC4"
}

export function ManageKeysPage() {
  const { connectionStatus, deviceInfo } = useConnection()
  const radioService = RadioCommunicationService.getInstance()
  const [keys, setKeys] = useState<RadioKey[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  const filteredKeys = keys.filter(key => 
    key.keyId.toString().includes(searchTerm) ||
    key.sln.toString().includes(searchTerm) ||
    key.algorithm.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const viewKeyInformation = async () => {
    if (connectionStatus !== "connected") {
      setError("Device not connected")
      return
    }

    setIsLoading(true)
    setError("")
    
    try {
      // Use ported original implementation
      const keyInfos = await radioService.viewKeyInformation()
      
      // Convert to RadioKey format
      const radioKeys: RadioKey[] = keyInfos.map(keyInfo => {
        const algorithmName = AlgorithmNames[keyInfo.AlgorithmId] || `Unknown (0x${keyInfo.AlgorithmId.toString(16).toUpperCase()})`
        const keyType = getKeyTypeFromSln(keyInfo.Sln)
        
        return {
          keysetId: keyInfo.KeysetId,
          type: keyType,
          sln: keyInfo.Sln,
          keyId: keyInfo.KeyId,
          algorithm: algorithmName,
          status: "active" // All retrieved keys are active
        }
      })
      
      setKeys(radioKeys)
    } catch (error) {
      console.error("Failed to retrieve key information:", error)
      const errorMsg = error instanceof Error ? error.message : "Failed to retrieve key information"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode before performing key operations.")
      } else {
        setError(errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to determine key type from SLN (from original utilities.js)
  const getKeyTypeFromSln = (sln: number): string => {
    const cg = sln >>> 12
    
    if (cg < 0xF) {
      return "TEK"
    } else if (cg === 0xF) {
      // UKEK are even, CKEK are odd
      return sln % 2 === 0 ? "UKEK" : "CKEK"
    }
    return "TEK"
  }

  const eraseAllKeys = async () => {
    if (!confirm("Are you sure you want to erase ALL keys from the radio? This action cannot be undone.")) {
      return
    }

    if (connectionStatus !== "connected") {
      setError("Device not connected")
      return
    }

    setIsLoading(true)
    setError("")
    
    try {
      await radioService.eraseAllKeysFromRadio()
      setKeys([])
      alert("All keys have been successfully erased from the radio.")
    } catch (error) {
      console.error("Failed to erase keys:", error)
      setError(error instanceof Error ? error.message : "Failed to erase keys")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "expired":
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const toggleKeySelection = (keyId: number) => {
    const newSelection = new Set(selectedKeys)
    if (newSelection.has(keyId)) {
      newSelection.delete(keyId)
    } else {
      newSelection.add(keyId)
    }
    setSelectedKeys(newSelection)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Radio Keys</h1>
        <p className="text-muted-foreground">
          View and manage encryption keys on the connected radio.
        </p>
      </div>

      {/* Action Bar */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={viewKeyInformation}
                disabled={isLoading || connectionStatus !== "connected"}
                variant="default"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Key Information
                  </>
                )}
              </Button>
              <Button 
                variant="destructive"
                onClick={eraseAllKeys}
                disabled={isLoading || connectionStatus !== "connected"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Erase All Keys
              </Button>
            </div>
            
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Radio Keys List */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Radio Keys</span>
              <Badge variant="secondary" className="ml-2">
                {keys.length}
              </Badge>
            </CardTitle>
          </div>
          {keys.length > 3 && (
            <div className="flex items-center space-x-2 pt-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No keys found on radio</p>
                <p className="text-xs mt-1">Click "View Key Information" to load keys from radio</p>
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No keys match your search</p>
              </div>
            ) : (
              filteredKeys.map((key, index) => (
                <div 
                  key={index} 
                  className={`group relative flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedKeys.has(key.keyId) 
                      ? 'border-primary bg-primary/10 shadow-sm' 
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                  onClick={() => toggleKeySelection(key.keyId)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      selectedKeys.has(key.keyId) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Key {key.keyId}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                          {key.algorithm}
                        </Badge>
                        <Badge 
                          variant={key.type === 'KEK' ? 'destructive' : 'default'}
                          className="text-xs px-1.5 py-0.5 h-5"
                        >
                          {key.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">SLN {key.sln}</span>
                        <span className="text-xs text-muted-foreground">Keyset {key.keysetId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {connectionStatus !== "connected" && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Device Connected</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect a KFD device to view and manage radio keys
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go to Connect Device
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
