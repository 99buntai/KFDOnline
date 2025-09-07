import { useState, useEffect } from "react"
import { useConnection } from "@/contexts/connection-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { KeyContainerService, KeyloadValidate } from "@/services/key-container-service"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import type { ContainerKey } from "@/types"
import { 
  List, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Send, 
  Key,
  Eye,
  EyeOff,
  Shuffle,
  AlertTriangle,
  FileKey
} from "lucide-react"

const algorithms = [
  { id: 0, name: "ACCORDION", keyLength: 0, keyParity: false },
  { id: 1, name: "BATON_ODD", keyLength: 0, keyParity: false },
  { id: 2, name: "FIREFLY", keyLength: 0, keyParity: false },
  { id: 3, name: "MAYFLY", keyLength: 0, keyParity: false },
  { id: 4, name: "SAVILLE", keyLength: 0, keyParity: false },
  { id: 5, name: "PADSTONE", keyLength: 0, keyParity: false },
  { id: 65, name: "BATON_EVEN", keyLength: 0, keyParity: false },
  { id: 128, name: "CLEAR", keyLength: 0, keyParity: false },
  { id: 129, name: "DES-OFB", keyLength: 8, keyParity: true },
  { id: 131, name: "TDES", keyLength: 0, keyParity: false },
  { id: 132, name: "AES-256", keyLength: 32, keyParity: false },
  { id: 133, name: "AES-128", keyLength: 16, keyParity: false },
  { id: 159, name: "DES-XL", keyLength: 8, keyParity: true },
  { id: 160, name: "DVI-XL", keyLength: 0, keyParity: false },
  { id: 161, name: "DVP-XL", keyLength: 0, keyParity: false },
  { id: 170, name: "ADP/RC4", keyLength: 5, keyParity: false },
]

export function ContainerKeysPage() {
  const { connectionStatus } = useConnection()
  const [keys, setKeys] = useState<ContainerKey[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set())
  const [containerName, setContainerName] = useState("New Container")
  const [editingKey, setEditingKey] = useState<ContainerKey | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ContainerKey | null>(null)
  const [isLoadingKey, setIsLoadingKey] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    keysetId: "1",
    slnCkr: "",
    keyId: "",
    algorithmId: 132,
    keyValue: "",
    showKey: false
  })

  const containerService = KeyContainerService.getInstance()
  const radioService = RadioCommunicationService.getInstance()

  useEffect(() => {
    const updateData = () => {
      const container = containerService.getContainer()
      setKeys(container.keys)
      setContainerName(container.source)
    }

    containerService.onChange(updateData)
    updateData()
  }, [])

  const filteredKeys = keys.filter(key => 
    key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.keyId.toString().includes(searchTerm) ||
    key.slnCkr.toString().includes(searchTerm) ||
    getAlgorithmName(key.algorithmId).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAlgorithmName = (id: number): string => {
    const algorithm = algorithms.find(alg => alg.id === id)
    return algorithm?.name || `Custom (${id})`
  }

  const getKeyType = (sln: number): string => {
    if (sln >= 0 && sln <= 61439) return "TEK"
    if (sln >= 61440 && sln <= 65535) return "KEK"
    return "Auto"
  }

  const addNewKey = () => {
    // Navigate to create key page
    // This would be handled by the parent component
    console.log("Navigate to create key page")
  }

  const editKey = (key: ContainerKey) => {
    setEditingKey(key)
    setEditForm({
      name: key.name,
      keysetId: key.keysetId.toString(),
      slnCkr: key.slnCkr.toString(),
      keyId: key.keyId.toString(),
      algorithmId: key.algorithmId,
      keyValue: key.keyValue,
      showKey: false
    })
    setShowEditDialog(true)
  }

  const deleteKey = (key: ContainerKey) => {
    setKeyToDelete(key)
    setShowDeleteDialog(true)
  }

  const confirmDeleteKey = () => {
    if (keyToDelete) {
      containerService.removeKey(keyToDelete.id)
      setShowDeleteDialog(false)
      setKeyToDelete(null)
    }
  }

  const saveKeyChanges = () => {
    if (!editingKey) return

    const algorithm = algorithms.find(alg => alg.id === editForm.algorithmId)
    const keyLength = algorithm?.keyLength || 32
    
    if (editForm.keyValue.length !== keyLength * 2) {
      alert(`Key must be exactly ${keyLength * 2} hex characters for ${algorithm?.name}`)
      return
    }

    const updates = {
      name: editForm.name,
      keysetId: parseInt(editForm.keysetId),
      slnCkr: parseInt(editForm.slnCkr),
      keyId: parseInt(editForm.keyId),
      algorithmId: editForm.algorithmId,
      keyValue: editForm.keyValue.toUpperCase()
    }

    containerService.updateKey(editingKey.id, updates)
    setShowEditDialog(false)
    setEditingKey(null)
  }

  const loadKeyToRadio = async (key: ContainerKey) => {
    if (connectionStatus !== "connected") {
      alert("Device not connected")
      return
    }

    setIsLoadingKey(true)
    
    try {
      // Validate the key first
      const keyBytes: number[] = []
      for (let i = 0; i < key.keyValue.length; i += 2) {
        keyBytes.push(parseInt(key.keyValue.substr(i, 2), 16))
      }
      
      const validation = KeyloadValidate(
        key.keysetId,
        key.slnCkr,
        key.slnCkr >= 61440 && key.slnCkr <= 65535, // isKek
        key.keyId,
        key.algorithmId,
        keyBytes
      )
      
      if (validation.status === "Error") {
        alert(`Key validation failed: ${validation.message}`)
        return
      }
      
      if (validation.status === "Warning") {
        if (!window.confirm(`Warning: ${validation.message} - do you wish to continue anyway?`)) {
          return
        }
      }
      
      // Convert to CmdKeyItem and load to radio
      const cmdKeys = containerService.convertKeysToCmdItems([key.id])
      
      if (cmdKeys.length === 0) {
        alert("Failed to prepare key for loading")
        return
      }
      
      const results = await radioService.sendKeysToRadio(cmdKeys, "multiple")
      
      if (results.length > 0 && results[0].Status === 0) {
        alert(`Key "${key.name}" loaded to radio successfully!`)
      } else {
        const status = results[0]?.Status || "unknown"
        alert(`Failed to load key to radio. Status: ${status}`)
      }
    } catch (error) {
      console.error("Failed to load key to radio:", error)
      alert(`Failed to load key to radio: ${error instanceof Error ? error.message : error}`)
    } finally {
      setIsLoadingKey(false)
    }
  }

  const generateRandomKey = () => {
    const algorithm = algorithms.find(alg => alg.id === editForm.algorithmId)
    const keyLength = algorithm?.keyLength || 32
    const keyParity = algorithm?.keyParity || false
    const randomKey = containerService.generateRandomKey(keyLength, keyParity)
    setEditForm(prev => ({ ...prev, keyValue: randomKey }))
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

  const deleteSelectedKeys = () => {
    if (selectedKeys.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedKeys.size} selected key(s)?`)) {
      return
    }

    selectedKeys.forEach(keyId => {
      containerService.removeKey(keyId)
    })
    setSelectedKeys(new Set())
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Container Keys</h1>
        <p className="text-muted-foreground">
          Manage encryption keys stored in the current key container.
        </p>
      </div>

      {/* Action Bar for Selected Items */}
      {selectedKeys.size > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Ready to Delete</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{selectedKeys.size} key{selectedKeys.size !== 1 ? 's' : ''}</span>
                  <Badge variant="destructive">
                    {selectedKeys.size} selected
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Clear Selection
                </Button>
                <Button 
                  variant="destructive"
                  onClick={deleteSelectedKeys}
                  className="min-w-[120px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Keys
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Container Keys List */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Container Keys</span>
              <Badge variant="secondary" className="ml-2">
                {keys.length}
              </Badge>
            </CardTitle>
            <Button onClick={addNewKey} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Key
            </Button>
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
                <p>No keys in container</p>
                <p className="text-xs mt-1">Add keys to get started</p>
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No keys match your search</p>
              </div>
            ) : (
              filteredKeys.map((key) => (
                <div 
                  key={key.id} 
                  className={`group relative flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedKeys.has(key.id) 
                      ? 'border-primary bg-primary/10 shadow-sm' 
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                  onClick={() => toggleKeySelection(key.id)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      selectedKeys.has(key.id) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{key.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                          {getAlgorithmName(key.algorithmId)}
                        </Badge>
                        <Badge 
                          variant={getKeyType(key.slnCkr) === 'KEK' ? 'destructive' : 'default'}
                          className="text-xs px-1.5 py-0.5 h-5"
                        >
                          {getKeyType(key.slnCkr)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">SLN {key.slnCkr}</span>
                        <span className="text-xs text-muted-foreground">KID {key.keyId}</span>
                        <span className="text-xs text-muted-foreground">Keyset {key.keysetId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        loadKeyToRadio(key)
                      }}
                      disabled={connectionStatus !== "connected" || isLoadingKey}
                      className="h-8 px-2"
                    >
                      {isLoadingKey ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-background border-t-transparent" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        editKey(key)
                      }}
                      className="h-8 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteKey(key)
                      }}
                      className="h-8 px-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Key Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Key</DialogTitle>
            <DialogDescription>
              Modify the properties of the selected key
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editKeyName">Key Name</Label>
                <Input
                  id="editKeyName"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editKeysetId">Keyset ID</Label>
                <Input
                  id="editKeysetId"
                  type="number"
                  value={editForm.keysetId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, keysetId: e.target.value }))}
                  min="1"
                  max="255"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editSlnCkr">SLN/CKR</Label>
                <Input
                  id="editSlnCkr"
                  type="number"
                  value={editForm.slnCkr}
                  onChange={(e) => setEditForm(prev => ({ ...prev, slnCkr: e.target.value }))}
                  min="0"
                  max="65535"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editKeyId">Key ID</Label>
                <Input
                  id="editKeyId"
                  type="number"
                  value={editForm.keyId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, keyId: e.target.value }))}
                  min="0"
                  max="65535"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAlgorithm">Algorithm</Label>
              <Select 
                value={editForm.algorithmId.toString()} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, algorithmId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((alg) => (
                    <SelectItem key={alg.id} value={alg.id.toString()}>
                      {alg.name} {alg.keyLength > 0 && `(${alg.keyLength * 8}-bit)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editKeyValue">Key Value</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditForm(prev => ({ ...prev, showKey: !prev.showKey }))}
                  >
                    {editForm.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateRandomKey}
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Input
                id="editKeyValue"
                type={editForm.showKey ? "text" : "password"}
                value={editForm.keyValue}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  keyValue: e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
                }))}
                className="font-mono"
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const algorithm = algorithms.find(alg => alg.id === editForm.algorithmId)
                  const expectedLength = (algorithm?.keyLength || 32) * 2
                  return `Expected length: ${expectedLength} characters (${editForm.keyValue.length}/${expectedLength})`
                })()}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="editShowKey"
                checked={editForm.showKey}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, showKey: checked }))}
              />
              <Label htmlFor="editShowKey">Show Key</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveKeyChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the key "{keyToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteKey}>
              Delete Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
