import { useState, useEffect } from "react"
import { useConnection } from "@/contexts/connection-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { KeyContainerService, KeyloadValidate } from "@/services/key-container-service"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import type { KeyGroup, ContainerKey } from "@/types"
import { 
  Layers3, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Send,
  Users,
  Key,
  FileKey
} from "lucide-react"

export function ContainerGroupsPage() {
  const { connectionStatus } = useConnection()
  const [groups, setGroups] = useState<KeyGroup[]>([])
  const [keys, setKeys] = useState<ContainerKey[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [containerName, setContainerName] = useState("New Container")
  const [editingGroup, setEditingGroup] = useState<KeyGroup | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<KeyGroup | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    selectedKeyIds: new Set<number>()
  })

  const containerService = KeyContainerService.getInstance()
  const radioService = RadioCommunicationService.getInstance()

  useEffect(() => {
    const updateData = () => {
      const container = containerService.getContainer()
      setGroups(container.groups)
      setKeys(container.keys)
      setContainerName(container.source)
    }

    containerService.onChange(updateData)
    updateData()
  }, [])

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.keys.length.toString().includes(searchTerm)
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

  const addNewGroup = () => {
    setEditingGroup(null)
    setEditForm({
      name: "",
      selectedKeyIds: new Set()
    })
    setShowEditDialog(true)
  }

  const editGroup = (group: KeyGroup) => {
    setEditingGroup(group)
    setEditForm({
      name: group.name,
      selectedKeyIds: new Set(group.keys)
    })
    setShowEditDialog(true)
  }

  const deleteGroup = (group: KeyGroup) => {
    setGroupToDelete(group)
    setShowDeleteDialog(true)
  }

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      containerService.removeGroup(groupToDelete.id)
      setShowDeleteDialog(false)
      setGroupToDelete(null)
    }
  }

  const saveGroupChanges = () => {
    if (!editForm.name.trim()) {
      alert("Group name is required")
      return
    }

    // Check for duplicate names (excluding current group if editing)
    const existingGroup = groups.find(g => 
      g.name.toLowerCase() === editForm.name.toLowerCase() && 
      (!editingGroup || g.id !== editingGroup.id)
    )
    
    if (existingGroup) {
      alert("A group with this name already exists")
      return
    }

    const groupData = {
      name: editForm.name.trim(),
      keys: Array.from(editForm.selectedKeyIds)
    }

    if (editingGroup) {
      containerService.updateGroup(editingGroup.id, groupData)
    } else {
      containerService.addGroup(groupData)
    }

    setShowEditDialog(false)
    setEditingGroup(null)
  }

  const loadGroupToRadio = async (group: KeyGroup) => {
    if (connectionStatus !== "connected") {
      alert("Device not connected")
      return
    }

    if (group.keys.length === 0) {
      alert("Cannot load empty group to radio")
      return
    }

    setIsLoadingGroup(true)
    
    try {
      // Get all keys in the group
      const groupKeys = containerService.getKeysInGroup(group.id)
      
      if (groupKeys.length === 0) {
        alert("No valid keys found in group")
        return
      }

      // Validate all keys in the group
      for (const key of groupKeys) {
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
          alert(`Key validation failed for "${key.name}": ${validation.message}`)
          return
        }
      }
      
      // Convert to CmdKeyItems and load to radio
      const cmdKeys = containerService.convertKeysToCmdItems(group.keys)
      
      if (cmdKeys.length === 0) {
        alert("Failed to prepare keys for loading")
        return
      }
      
      const results = await radioService.sendKeysToRadio(cmdKeys, "multiple")
      
      let successCount = 0
      let failCount = 0
      
      results.forEach(result => {
        if (result.Status === 0) {
          successCount++
        } else {
          failCount++
        }
      })
      
      if (failCount === 0) {
        alert(`Group "${group.name}" with ${successCount} keys loaded to radio successfully!`)
      } else {
        alert(`Group "${group.name}" partially loaded: ${successCount} succeeded, ${failCount} failed`)
      }
    } catch (error) {
      console.error("Failed to load group to radio:", error)
      alert(`Failed to load group to radio: ${error instanceof Error ? error.message : error}`)
    } finally {
      setIsLoadingGroup(false)
    }
  }

  const toggleKeySelection = (keyId: number) => {
    const newSelection = new Set(editForm.selectedKeyIds)
    if (newSelection.has(keyId)) {
      newSelection.delete(keyId)
    } else {
      newSelection.add(keyId)
    }
    setEditForm(prev => ({ ...prev, selectedKeyIds: newSelection }))
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

  const deleteSelectedGroups = () => {
    if (selectedGroups.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedGroups.size} selected group(s)?`)) {
      return
    }

    selectedGroups.forEach(groupId => {
      containerService.removeGroup(groupId)
    })
    setSelectedGroups(new Set())
  }

  const getKeysInGroup = (group: KeyGroup): ContainerKey[] => {
    return keys.filter(key => group.keys.includes(key.id))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Container Groups</h1>
        <p className="text-muted-foreground">
          Organize keys into groups for efficient batch operations.
        </p>
      </div>

      {/* Action Bar */}
      {selectedGroups.size > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Ready to Delete</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''}</span>
                  <Badge variant="destructive">
                    {selectedGroups.size} selected
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedGroups(new Set())}
                >
                  Clear Selection
                </Button>
                <Button 
                  variant="destructive"
                  onClick={deleteSelectedGroups}
                  className="min-w-[120px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Groups
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Groups List */}
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
            <Button onClick={addNewGroup} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Group
            </Button>
          </div>
          {groups.length > 3 && (
            <div className="flex items-center space-x-2 pt-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <p className="text-xs mt-1">Create groups to organize your keys</p>
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
                    
                    <div className="flex items-center space-x-1">
                      {group.keys.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            loadGroupToRadio(group)
                          }}
                          disabled={connectionStatus !== "connected" || isLoadingGroup}
                          className="h-8 px-2"
                        >
                          {isLoadingGroup ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-background border-t-transparent" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          editGroup(group)
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
                          deleteGroup(group)
                        }}
                        className="h-8 px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Group" : "Create New Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup ? "Modify the group name and select keys to include" : "Create a new group and select keys to include"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                maxLength={31}
                placeholder="Enter group name"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Keys for Group</Label>
                <div className="text-sm text-muted-foreground">
                  {editForm.selectedKeyIds.size} of {keys.length} keys selected
                </div>
              </div>
              
              {keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No keys available. Add keys to the container first.
                </div>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {keys.map((key) => (
                    <div key={key.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`key-${key.id}`}
                        checked={editForm.selectedKeyIds.has(key.id)}
                        onCheckedChange={() => toggleKeySelection(key.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{key.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getAlgorithmName(key.algorithmId)}, {getKeyType(key.slnCkr)}, 
                          SLN {key.slnCkr}, KID {key.keyId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveGroupChanges}>
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the group "{groupToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGroup}>
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
