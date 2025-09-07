import { useState, useEffect } from "react"
import { useConnection } from "@/contexts/connection-context"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import { CmdKeyItem } from "@/services/manual-rekey-application"
import { KeyContainerService, KeyloadValidate } from "@/services/key-container-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateRandomKey, formatHex, validateHexInput, hexToDecimal, decimalToHex } from "@/lib/utils"
import { Key, Eye, EyeOff, Shuffle, AlertTriangle } from "lucide-react"

type NumberBase = "hex" | "dec"

interface Algorithm {
  id: number
  name: string
  keyLength?: number
  keyParity: boolean
}

const algorithms: Algorithm[] = [
  { id: 0, name: "ACCORDION", keyParity: false },
  { id: 1, name: "BATON_ODD", keyParity: false },
  { id: 2, name: "FIREFLY", keyParity: false },
  { id: 3, name: "MAYFLY", keyParity: false },
  { id: 4, name: "SAVILLE", keyParity: false },
  { id: 5, name: "PADSTONE", keyParity: false },
  { id: 65, name: "BATON_EVEN", keyParity: false },
  { id: 128, name: "CLEAR", keyParity: false },
  { id: 129, name: "DES-OFB", keyLength: 8, keyParity: true },
  { id: 131, name: "TDES", keyParity: false },
  { id: 132, name: "AES-256", keyLength: 32, keyParity: false },
  { id: 133, name: "AES-128", keyLength: 16, keyParity: false },
  { id: 159, name: "DES-XL", keyLength: 8, keyParity: true },
  { id: 160, name: "DVI-XL", keyParity: false },
  { id: 161, name: "DVP-XL", keyParity: false },
  { id: 170, name: "ADP/RC4", keyLength: 5, keyParity: false },
  { id: 256, name: "Custom", keyParity: false },
]

interface CreateKeyPageProps {
  editingKey?: any
  onKeyCreated?: (key: any) => void
  onKeyUpdated?: (key: any) => void
  onCancel?: () => void
}

export function CreateKeyPage({ editingKey, onKeyCreated, onKeyUpdated, onCancel }: CreateKeyPageProps = {}) {
  const { connectionStatus } = useConnection()
  const radioService = RadioCommunicationService.getInstance()
  const containerService = KeyContainerService.getInstance()
  const [numberBase, setNumberBase] = useState<NumberBase>("dec")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [keyName, setKeyName] = useState("")
  const [activeKeyset, setActiveKeyset] = useState(true)
  const [keysetId, setKeysetId] = useState("1")
  const [slnCkr, setSlnCkr] = useState("")
  const [keyId, setKeyId] = useState("")
  const [algorithm, setAlgorithm] = useState("132") // AES-256
  const [customAlgorithmId, setCustomAlgorithmId] = useState("132")
  const [keyValue, setKeyValue] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [keyError, setKeyError] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)

  const selectedAlgorithm = algorithms.find(alg => alg.id === parseInt(algorithm))
  const isCustomAlgorithm = algorithm === "256"
  const keyLength = selectedAlgorithm?.keyLength || 32
  const maxKeyLength = keyLength * 2 // Hex characters

  useEffect(() => {
    // Initialize form for editing if editingKey is provided
    if (editingKey) {
      setIsEditMode(true)
      setKeyName(editingKey.name || editingKey.Name || "")
      setActiveKeyset(editingKey.keysetId === 1 || editingKey.ActiveKeyset)
      setKeysetId((editingKey.keysetId || editingKey.KeysetId || 1).toString())
      setSlnCkr((editingKey.slnCkr || editingKey.Sln || "").toString())
      setKeyId((editingKey.keyId || editingKey.KeyId || "").toString())
      setAlgorithm((editingKey.algorithmId || editingKey.AlgorithmId || 132).toString())
      setKeyValue(editingKey.keyValue || (editingKey.Key ? editingKey.Key.join("") : ""))
    } else {
      setIsEditMode(false)
      // Auto-generate key when algorithm changes for new keys
      if (selectedAlgorithm?.keyLength && !keyValue) {
        generateKey()
      }
    }
  }, [editingKey, algorithm])

  useEffect(() => {
    // Auto-generate key when algorithm changes for new keys
    if (!isEditMode && selectedAlgorithm?.keyLength) {
      generateKey()
    }
  }, [algorithm, isEditMode])

  const generateKey = () => {
    if (selectedAlgorithm?.keyLength) {
      const newKey = containerService.generateRandomKey(selectedAlgorithm.keyLength, selectedAlgorithm.keyParity)
      setKeyValue(newKey)
      setKeyError("")
    }
  }

  const handleKeyChange = (value: string) => {
    const formatted = formatHex(value)
    
    if (!validateHexInput(formatted, maxKeyLength)) {
      setKeyError("Invalid hex characters or key too long")
      return
    }
    
    setKeyValue(formatted)
    setKeyError("")
  }

  const formatNumber = (value: string, targetBase: NumberBase): string => {
    if (!value) return ""
    
    try {
      const num = parseInt(value, numberBase === "hex" ? 16 : 10)
      if (targetBase === "hex") {
        return "0x" + num.toString(16).toUpperCase().padStart(4, "0")
      } else {
        return num.toString()
      }
    } catch {
      return value
    }
  }

  const convertNumberBase = (value: string, fromBase: NumberBase, toBase: NumberBase): string => {
    if (!value || fromBase === toBase) return value
    
    try {
      const num = parseInt(value.replace("0x", ""), fromBase === "hex" ? 16 : 10)
      if (toBase === "hex") {
        return "0x" + num.toString(16).toUpperCase().padStart(4, "0")
      } else {
        return num.toString()
      }
    } catch {
      return value
    }
  }

  // Convert values when number base changes
  useEffect(() => {
    if (slnCkr) {
      const oldBase = numberBase === "hex" ? "dec" : "hex"
      setSlnCkr(convertNumberBase(slnCkr, oldBase, numberBase))
    }
    if (keyId) {
      const oldBase = numberBase === "hex" ? "dec" : "hex"
      setKeyId(convertNumberBase(keyId, oldBase, numberBase))
    }
    if (keysetId) {
      const oldBase = numberBase === "hex" ? "dec" : "hex"
      setKeysetId(convertNumberBase(keysetId, oldBase, numberBase))
    }
  }, [numberBase])

  const getCryptoGroup = (): number => {
    if (!slnCkr) return 0
    const sln = parseInt(slnCkr, numberBase === "hex" ? 16 : 10)
    if (isNaN(sln)) return 0
    return sln >>> 12 // Use bit shift like original (sln >>> 12)
  }

  const getKeyType = (): string => {
    const group = getCryptoGroup()
    if (!slnCkr) return ""
    const sln = parseInt(slnCkr, numberBase === "hex" ? 16 : 10)
    if (isNaN(sln)) return ""
    
    if (group < 0xF) {
      return "TEK"
    } else if (group === 0xF) {
      // UKEK are even, CKEK are odd (from original)
      return sln % 2 === 0 ? "UKEK" : "CKEK"
    }
    return "Invalid"
  }

  const loadKeyToRadio = async () => {
    if (connectionStatus !== "connected") {
      setError("Device not connected")
      return
    }

    // Validate all fields
    if (!keyName.trim()) {
      setError("Key name is required")
      return
    }
    if (!slnCkr) {
      setError("SLN/CKR is required") 
      return
    }
    if (!keyId) {
      setError("Key ID is required")
      return
    }
    if (!keyValue) {
      setError("Key value is required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Convert key hex string to byte array
      const keyBytes: number[] = []
      for (let i = 0; i < keyValue.length; i += 2) {
        keyBytes.push(parseInt(keyValue.substr(i, 2), 16))
      }

      // Create CmdKeyItem for radio communication using constructor
      const cmdKey = new CmdKeyItem(
        activeKeyset,
        activeKeyset ? 1 : parseInt(keysetId, numberBase === "hex" ? 16 : 10),
        parseInt(slnCkr, numberBase === "hex" ? 16 : 10),
        false, // Determine from SLN below
        parseInt(keyId, numberBase === "hex" ? 16 : 10),
        isCustomAlgorithm ? parseInt(customAlgorithmId, numberBase === "hex" ? 16 : 10) : parseInt(algorithm),
        keyBytes
      )

      // Determine if it's a KEK based on SLN
      const sln = cmdKey.Sln
      if (sln >= 61440 && sln <= 65535) {
        cmdKey.IsKek = true
      }

      const keyStatuses = await radioService.sendKeysToRadio([cmdKey], "single")
      const keyStatus = keyStatuses[0]
      
      if (keyStatus.Status === 0) {
        alert(`Key "${keyName}" loaded successfully to radio.`)
        // Reset form
        setKeyName("")
        setSlnCkr("")
        setKeyId("")
        setKeyValue("")
      } else {
        throw new Error(`Key loading failed: status ${keyStatus.Status}`)
      }
    } catch (error) {
      console.error("Failed to load key to radio:", error)
      setError(error instanceof Error ? error.message : "Failed to load key to radio")
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    if (!keyName.trim()) {
      setError("Key name cannot be empty")
      return false
    }
    
    if (!slnCkr.trim()) {
      setError("SLN/CKR cannot be empty")
      return false
    }
    
    if (!keyId.trim()) {
      setError("Key ID cannot be empty")
      return false
    }
    
    if (!keyValue.trim()) {
      setError("Key value cannot be empty")
      return false
    }
    
    if (keyError) {
      setError("Please fix key validation errors")
      return false
    }
    
    return true
  }

  const loadKeyToContainer = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setError("")
      
      // Convert hex string to byte array for validation
      const keyBytes: number[] = []
      for (let i = 0; i < keyValue.length; i += 2) {
        keyBytes.push(parseInt(keyValue.substr(i, 2), 16))
      }
      
      const finalKeysetId = activeKeyset ? 1 : parseInt(keysetId, numberBase === "hex" ? 16 : 10)
      const finalSlnCkr = parseInt(slnCkr, numberBase === "hex" ? 16 : 10)
      const finalKeyId = parseInt(keyId, numberBase === "hex" ? 16 : 10)
      const finalAlgorithmId = isCustomAlgorithm ? parseInt(customAlgorithmId, numberBase === "hex" ? 16 : 10) : parseInt(algorithm)
      
      // Validate the key
      const validation = KeyloadValidate(
        finalKeysetId,
        finalSlnCkr,
        finalSlnCkr >= 61440 && finalSlnCkr <= 65535, // isKek
        finalKeyId,
        finalAlgorithmId,
        keyBytes
      )
      
      if (validation.status === "Error") {
        setError(validation.message)
        return
      }
      
      if (validation.status === "Warning") {
        if (!window.confirm(`Warning: ${validation.message} - do you wish to continue anyway?`)) {
          return
        }
      }
      
      // Add key to container
      const containerKey = {
        name: keyName.trim(),
        keysetId: finalKeysetId,
        slnCkr: finalSlnCkr,
        keyId: finalKeyId,
        algorithmId: finalAlgorithmId,
        keyValue: keyValue
      }
      
      containerService.addKey(containerKey)
      
      // Clear form
      setKeyName("")
      setSlnCkr("")
      setKeyId("")
      setKeyValue("")
      setKeyError("")
      
      alert("Key added to container successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add key to container")
    }
  }

  const cancelKeyChanges = () => {
    if (onCancel) {
      onCancel()
    } else {
      // Reset form
      setKeyName("")
      setSlnCkr("")
      setKeyId("")
      setKeyValue("")
      setKeyError("")
    }
  }

  const saveKeyChanges = async () => {
    if (isEditMode && editingKey && onKeyUpdated) {
      const updatedKey = {
        ...editingKey,
        name: keyName,
        keysetId: parseInt(keysetId),
        slnCkr: parseInt(slnCkr, numberBase === "hex" ? 16 : 10),
        keyId: parseInt(keyId, numberBase === "hex" ? 16 : 10),
        algorithmId: isCustomAlgorithm ? parseInt(customAlgorithmId) : parseInt(algorithm),
        keyValue: keyValue
      }
      onKeyUpdated(updatedKey)
    } else if (!isEditMode && onKeyCreated) {
      const newKey = {
        name: keyName,
        keysetId: parseInt(keysetId),
        slnCkr: parseInt(slnCkr, numberBase === "hex" ? 16 : 10),
        keyId: parseInt(keyId, numberBase === "hex" ? 16 : 10),
        algorithmId: isCustomAlgorithm ? parseInt(customAlgorithmId) : parseInt(algorithm),
        keyValue: keyValue
      }
      onKeyCreated(newKey)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditMode ? "Edit Key" : "Create New Key"}
        </h1>
        <p className="text-muted-foreground">
          {isEditMode 
            ? "Modify the selected encryption key properties and value."
            : "Generate or create a new encryption key for your P25 radio."
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Key Configuration</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                variant={numberBase === "dec" ? "default" : "outline"}
                size="sm"
                onClick={() => setNumberBase("dec")}
              >
                Dec
              </Button>
              <Button
                variant={numberBase === "hex" ? "default" : "outline"}
                size="sm"
                onClick={() => setNumberBase("hex")}
              >
                Hex
              </Button>
            </div>
          </div>
          <CardDescription>
            {selectedAlgorithm?.keyLength && `Algorithm: ${selectedAlgorithm.name} • Key length: ${keyLength} bytes (${keyLength * 8} bits)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top Row: Key Name and Active Keyset */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                maxLength={14}
                placeholder="Enter key name"
              />
            </div>
            <div className="flex items-center space-x-4 pt-7">
              <div className="flex items-center space-x-2">
                <Switch
                  id="activeKeyset"
                  checked={activeKeyset}
                  onCheckedChange={setActiveKeyset}
                />
                <Label htmlFor="activeKeyset">Active Keyset</Label>
              </div>
              {!activeKeyset && (
                <div className="flex-1">
                  <Input
                    value={keysetId}
                    onChange={(e) => setKeysetId(e.target.value)}
                    placeholder={numberBase === "hex" ? "FF" : "255"}
                    className="w-20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Second Row: SLN/CKR and Key ID */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slnCkr">SLN/CKR</Label>
              <Input
                id="slnCkr"
                value={slnCkr}
                onChange={(e) => setSlnCkr(e.target.value)}
                placeholder={numberBase === "hex" ? "FFFF" : "65535"}
              />
              {slnCkr && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-muted-foreground">Crypto Group:</span>
                  <Badge variant="outline">{getCryptoGroup()}</Badge>
                  <span className="text-muted-foreground">Key Type:</span>
                  <Badge variant="outline">{getKeyType()}</Badge>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyId">Key ID</Label>
              <Input
                id="keyId"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder={numberBase === "hex" ? "FFFF" : "65535"}
              />
            </div>
          </div>

          {/* Third Row: Algorithm */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select algorithm" />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((alg) => (
                    <SelectItem key={alg.id} value={alg.id.toString()}>
                      {alg.name} {alg.keyLength && `(${alg.keyLength * 8}-bit)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCustomAlgorithm && (
              <div className="space-y-2">
                <Label htmlFor="customAlgorithmId">Custom Algorithm ID</Label>
                <Input
                  id="customAlgorithmId"
                  value={customAlgorithmId}
                  onChange={(e) => setCustomAlgorithmId(e.target.value)}
                  placeholder={numberBase === "hex" ? "FF" : "255"}
                />
              </div>
            )}
          </div>

          {/* Key Value Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="keyValue">Key (hex)</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showKey ? "Hide" : "Show"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateKey}
                >
                  <Shuffle className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              </div>
            </div>
            <Input
              id="keyValue"
              type={showKey ? "text" : "password"}
              value={keyValue}
              onChange={(e) => handleKeyChange(e.target.value)}
              maxLength={maxKeyLength}
              placeholder="Enter key value in hex"
              className="font-mono"
              autoComplete="off"
            />
            {keyError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{keyError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Length: {keyValue.length}/{maxKeyLength} characters • Use only 0-9, A-F
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            {isEditMode ? (
              <>
                <Button 
                  onClick={saveKeyChanges}
                  className="flex-1"
                  disabled={!keyValue || !!keyError}
                >
                  Save Key Changes
                </Button>
                <Button 
                  variant="outline"
                  onClick={cancelKeyChanges}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={loadKeyToRadio}
                  className="flex-1"
                  disabled={!keyValue || !!keyError || connectionStatus !== "connected" || isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load to Radio
                      {connectionStatus !== "connected" && (
                        <span className="ml-2 text-xs opacity-60"></span>
                      )}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={loadKeyToContainer}
                  className="flex-1"
                  disabled={!keyValue || !!keyError}
                >
                  Load to Container
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
