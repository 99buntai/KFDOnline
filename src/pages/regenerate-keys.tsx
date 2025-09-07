import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { KeyContainerService } from "@/services/key-container-service"
import type { ContainerKey, KeyGroup } from "@/types"
import { 
  RefreshCw, 
  Search, 
  Key,
  Layers3,
  CheckCircle,
  AlertTriangle,
  FileKey,
  Users
} from "lucide-react"

export function RegenerateKeysPage() {
  const [keys, setKeys] = useState<ContainerKey[]>([])
  const [groups, setGroups] = useState<KeyGroup[]>([])
  const [searchTermKeys, setSearchTermKeys] = useState("")
  const [searchTermGroups, setSearchTermGroups] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [containerName, setContainerName] = useState("New Container")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regeneratedKeys, setRegeneratedKeys] = useState<string[]>([])
  const [showResultsDialog, setShowResultsDialog] = useState(false)

  const containerService = KeyContainerService.getInstance()

  useEffect(() => {
    const updateData = () => {
      const container = containerService.getContainer()
      setKeys(container.keys)
      setGroups(container.groups)
      setContainerName(container.source)
    }

    containerService.onChange(updateData)
    updateData()
  }, [])

  const filteredKeys = keys.filter(key => 
    key.name.toLowerCase().includes(searchTermKeys.toLowerCase()) ||
    key.keyId.toString().includes(searchTermKeys) ||
    key.slnCkr.toString().includes(searchTermKeys)
  )

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTermGroups.toLowerCase())
  )

  const getAlgorithmName = (id: number): string => {
    const algorithms = [
      { id: 132, name: "AES-256" },
      { id: 129, name: "DES-OFB" },
      { id: 133, name: "AES-128" },
      { id: 159, name: "DES-XL" },
      { id: 170, name: "ADP/RC4" },
    ]
    const algorithm = algorithms.find(alg => alg.id === id)
    return algorithm?.name || `Custom (${id})`
  }

  const getKeyType = (sln: number): string => {
    if (sln >= 0 && sln <= 61439) return "TEK"
    if (sln >= 61440 && sln <= 65535) return "KEK"
    return "Auto"
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

  const toggleGroupSelection = (groupId: number) => {
    const newSelection = new Set(selectedGroups)
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId)
    } else {
      newSelection.add(groupId)
    }
    setSelectedGroups(newSelection)
  }

  const selectAllKeys = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(filteredKeys.map(k => k.id)))
    }
  }

  const selectAllGroups = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id)))
    }
  }

  const regenerateKeys = async () => {
    setIsRegenerating(true)
    const regenerated: string[] = []

    try {
      // Regenerate selected individual keys
      for (const keyId of selectedKeys) {
        const key = keys.find(k => k.id === keyId)
        if (key) {
          const algorithm = getAlgorithmFromId(key.algorithmId)
          if (algorithm && algorithm.keyLength > 0) {
            const newKeyValue = containerService.generateRandomKey(algorithm.keyLength, algorithm.keyParity)
            containerService.updateKey(keyId, { keyValue: newKeyValue })
            regenerated.push(`${key.name} (Individual Key)`)
          }
        }
      }

      // Regenerate keys in selected groups
      for (const groupId of selectedGroups) {
        const group = groups.find(g => g.id === groupId)
        if (group) {
          const groupKeys = containerService.getKeysInGroup(groupId)
          for (const key of groupKeys) {
            const algorithm = getAlgorithmFromId(key.algorithmId)
            if (algorithm && algorithm.keyLength > 0) {
              const newKeyValue = containerService.generateRandomKey(algorithm.keyLength, algorithm.keyParity)
              containerService.updateKey(key.id, { keyValue: newKeyValue })
              regenerated.push(`${key.name} (from ${group.name})`)
            }
          }
        }
      }

      setRegeneratedKeys(regenerated)
      setShowConfirmDialog(false)
      setSelectedKeys(new Set())
      setSelectedGroups(new Set())
      setShowResultsDialog(true)
    } catch (error) {
      alert("Failed to regenerate keys")
    } finally {
      setIsRegenerating(false)
    }
  }

  const getAlgorithmFromId = (id: number) => {
    const algorithms = [
      { id: 132, name: "AES-256", keyLength: 32, keyParity: false },
      { id: 129, name: "DES-OFB", keyLength: 8, keyParity: true },
      { id: 133, name: "AES-128", keyLength: 16, keyParity: false },
      { id: 159, name: "DES-XL", keyLength: 8, keyParity: true },
      { id: 170, name: "ADP/RC4", keyLength: 5, keyParity: false },
    ]
    return algorithms.find(alg => alg.id === id)
  }

  const getTotalSelectedKeys = (): number => {
    let total = selectedKeys.size
    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId)
      if (group) {
        total += group.keys.length
      }
    })
    return total
  }

  const getKeysInGroup = (group: KeyGroup): ContainerKey[] => {
    return keys.filter(key => group.keys.includes(key.id))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Regenerate Keys</h1>
        <p className="text-muted-foreground">
          Generate new random values for selected keys while preserving their metadata.
        </p>
      </div>

      {/* Action Bar */}
      {(selectedKeys.size > 0 || selectedGroups.size > 0) && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Ready to Regenerate</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{selectedKeys.size} individual keys</span>
                  <span>{selectedGroups.size} groups</span>
                  <Badge variant="default" className="bg-orange-600">
                    {getTotalSelectedKeys()} total keys
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedKeys(new Set())
                    setSelectedGroups(new Set())
                  }}
                >
                  Clear Selection
                </Button>
                <Button 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={getTotalSelectedKeys() === 0}
                  className="min-w-[140px] bg-orange-600 hover:bg-orange-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Keys
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Individual Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Individual Keys</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllKeys}
              >
                {selectedKeys.size === filteredKeys.length ? "Deselect All" : "Select All"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter keys..."
                value={searchTermKeys}
                onChange={(e) => setSearchTermKeys(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredKeys.map((key) => (
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers3 className="h-5 w-5" />
                <span>Key Groups</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllGroups}
              >
                {selectedGroups.size === filteredGroups.length ? "Deselect All" : "Select All"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter groups..."
                value={searchTermGroups}
                onChange={(e) => setSearchTermGroups(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredGroups.map((group) => {
                  const groupKeys = getKeysInGroup(group)
                  const isEmpty = group.keys.length === 0
                  return (
                    <div 
                      key={group.id} 
                      className={`group relative flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                        isEmpty 
                          ? 'opacity-50 cursor-not-allowed border-border' 
                          : selectedGroups.has(group.id)
                            ? 'border-primary bg-primary/10 shadow-sm cursor-pointer'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30 cursor-pointer'
                      }`}
                      onClick={() => !isEmpty && toggleGroupSelection(group.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                          selectedGroups.has(group.id) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <Layers3 className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{group.name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                              <Users className="h-3 w-3 mr-1" />
                              {group.keys.length} key{group.keys.length !== 1 ? 's' : ''}
                            </Badge>
                            {isEmpty && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 text-orange-500">
                                Empty
                              </Badge>
                            )}
                            {groupKeys.length > 0 && groupKeys.length <= 2 && (
                              <span className="text-xs text-muted-foreground">
                                {groupKeys.map(k => k.name).join(", ")}
                              </span>
                            )}
                            {groupKeys.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                {groupKeys[0].name}, {groupKeys[1].name} +{groupKeys.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Key Regeneration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Key regeneration will:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Generate new random key values for selected keys</li>
              <li>Preserve all metadata (name, IDs, algorithm, etc.)</li>
              <li>Maintain group associations</li>
              <li>Use cryptographically secure random number generation</li>
            </ul>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Regenerating keys will make them incompatible with devices 
                that have the old key values. Ensure all devices are updated with the new keys.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Key Regeneration</DialogTitle>
            <DialogDescription>
              This will generate new random values for the selected keys. The old key values will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Individual keys to regenerate:</span>
                <Badge>{selectedKeys.size}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Groups to regenerate:</span>
                <Badge>{selectedGroups.size}</Badge>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total keys affected:</span>
                <Badge variant="default">{getTotalSelectedKeys()}</Badge>
              </div>
            </div>
            
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This operation cannot be undone. Make sure to export your container as a backup first.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={regenerateKeys}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Keys
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Regeneration Complete</span>
            </DialogTitle>
            <DialogDescription>
              The following keys have been regenerated with new random values:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-60 overflow-y-auto border rounded-lg p-3">
              {regeneratedKeys.map((keyName, index) => (
                <div key={index} className="flex items-center space-x-2 py-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{keyName}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <strong>{regeneratedKeys.length}</strong> key{regeneratedKeys.length !== 1 ? 's' : ''} regenerated successfully.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {keys.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No keys available for regeneration. Add keys to the container first.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
