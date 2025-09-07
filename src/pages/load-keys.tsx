import { useState, useEffect } from "react"
import { useConnection } from "@/contexts/connection-context"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import { CmdKeyItem } from "@/services/manual-rekey-application"
import { KeyContainerService, KeyloadValidate } from "@/services/key-container-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { ContainerKey, KeyGroup } from "@/types"
import { 
  Search, 
  Key,
  Layers3,
  CheckCircle,
  AlertTriangle,
  FileKey,
  Radio,
  Send,
  Users
} from "lucide-react"

export function LoadKeysPage() {
  const { connectionStatus } = useConnection()
  const radioService = RadioCommunicationService.getInstance()
  const [keys, setKeys] = useState<ContainerKey[]>([])
  const [groups, setGroups] = useState<KeyGroup[]>([])
  const [searchTermKeys, setSearchTermKeys] = useState("")
  const [searchTermGroups, setSearchTermGroups] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [containerName, setContainerName] = useState("New Container")
  const [isLoading, setIsLoading] = useState(false)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [loadResults, setLoadResults] = useState<string[]>([])

  const containerService = KeyContainerService.getInstance()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to load keys
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && getTotalSelectedKeys() > 0) {
        e.preventDefault()
        loadKeysToRadio()
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedKeys(new Set())
        setSelectedGroups(new Set())
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedKeys, selectedGroups, connectionStatus, isLoading])

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

  const loadKeysToRadio = async () => {
    if (connectionStatus !== "connected") {
      alert("Device not connected")
      return
    }

    if (selectedKeys.size === 0 && selectedGroups.size === 0) {
      alert("Please select keys or groups to load")
      return
    }

    setIsLoading(true)
    const results: string[] = []

    try {
      // Collect all key IDs (individual + from groups)
      const allKeyIds = new Set<number>()
      
      // Add individual keys
      selectedKeys.forEach(keyId => allKeyIds.add(keyId))
      
      // Add keys from groups
      selectedGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId)
        if (group) {
          group.keys.forEach(keyId => allKeyIds.add(keyId))
        }
      })

      // Convert to CmdKeyItems using the container service
      const cmdKeys = containerService.convertKeysToCmdItems(Array.from(allKeyIds))
      
      if (cmdKeys.length === 0) {
        alert("No valid keys found to load")
        return
      }

      // Validate all keys before loading
      for (const key of keys.filter(k => allKeyIds.has(k.id))) {
        const keyBytes = []
        for (let i = 0; i < key.keyValue.length; i += 2) {
          keyBytes.push(parseInt(key.keyValue.substr(i, 2), 16))
        }
        
        const validation = KeyloadValidate(
          key.keysetId, 
          key.slnCkr, 
          key.slnCkr >= 61440 && key.slnCkr <= 65535, 
          key.keyId, 
          key.algorithmId, 
          keyBytes
        )
        
        if (validation.status === "Error") {
          alert(`Key validation failed for "${key.name}": ${validation.message}`)
          return
        }
      }

      // Load all keys to radio
      const keyStatuses = await radioService.sendKeysToRadio(cmdKeys, "multiple")
      
      // Process results - match with original key names
      const keyArray = Array.from(allKeyIds).map(id => keys.find(k => k.id === id)).filter(k => k)
      
      for (let i = 0; i < keyStatuses.length; i++) {
        const status = keyStatuses[i]
        const keyName = keyArray[i]?.name || `Key ${i + 1}`
        
        if (status.Status === 0) {
          results.push(`✓ ${keyName} - Success`)
        } else {
          results.push(`✗ ${keyName} - Failed (Status: ${status.Status})`)
        }
      }

      setLoadResults(results)
      setSelectedKeys(new Set())
      setSelectedGroups(new Set())
      setShowResultsDialog(true)
    } catch (err) {
      console.error("Load keys error:", err)
      alert(`Failed to load keys to radio: ${err instanceof Error ? err.message : err}`)
    } finally {
      setIsLoading(false)
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Load Keys to Radio</h1>
        <p className="text-muted-foreground">
          Select keys/groups from container and load it to MACE.
        </p>
      </div>

      {/* Action Bar */}
      {(selectedKeys.size > 0 || selectedGroups.size > 0) && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Ready to Load</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{selectedKeys.size} individual keys</span>
                  <span>{selectedGroups.size} groups</span>
                  <Badge variant="default" className="bg-green-600">
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
                  onClick={loadKeysToRadio}
                  disabled={getTotalSelectedKeys() === 0 || isLoading || connectionStatus !== "connected"}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Load to Radio
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Individual Keys */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Individual Keys</span>
                <Badge variant="secondary" className="ml-2">
                  {keys.length}
                </Badge>
              </CardTitle>
              {keys.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllKeys}
                  className="text-xs"
                >
                  {selectedKeys.size === filteredKeys.length && filteredKeys.length > 0 ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            {keys.length > 3 && (
              <div className="flex items-center space-x-2 pt-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keys..."
                  value={searchTermKeys}
                  onChange={(e) => setSearchTermKeys(e.target.value)}
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
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Layers3 className="h-5 w-5" />
                <span>Key Groups</span>
                <Badge variant="secondary" className="ml-2">
                  {groups.length}
                </Badge>
              </CardTitle>
              {groups.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllGroups}
                  className="text-xs"
                >
                  {selectedGroups.size === filteredGroups.length && filteredGroups.length > 0 ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            {groups.length > 3 && (
              <div className="flex items-center space-x-2 pt-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchTermGroups}
                  onChange={(e) => setSearchTermGroups(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No groups in container</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>No groups match your search</p>
                </div>
              ) : (
                filteredGroups.map((group) => {
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
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Load Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Keys Loaded Successfully</span>
            </DialogTitle>
            <DialogDescription>
              {loadResults.length} key{loadResults.length !== 1 ? 's' : ''} transferred to radio
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {loadResults.map((result, index) => {
                const isSuccess = result.startsWith('✓')
                return (
                  <div key={index} className={`flex items-center space-x-2 p-2 rounded ${
                    isSuccess ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
                  }`}>
                    {isSuccess ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm">{result.substring(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Empty Container State */}
      {keys.length === 0 && groups.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileKey className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Keys Available</h3>
            <p className="text-muted-foreground text-center mb-4">
              Load a key container or create keys to get started
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

