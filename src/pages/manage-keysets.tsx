import { useState } from "react"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Layers3, 
  Eye, 
  Play, 
  Edit, 
  AlertTriangle,
  CheckCircle,
  Radio
} from "lucide-react"

interface Keyset {
  id: number
  name: string
  type: string
  activeDatetime: Date
  active: boolean
}

export function ManageKeysetsPage() {
  const [keysets, setKeysets] = useState<Keyset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [editingKeyset, setEditingKeyset] = useState<Keyset | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [keysetToActivate, setKeysetToActivate] = useState<Keyset | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    activeDatetime: ""
  })

  const radioService = RadioCommunicationService.getInstance()

  const viewKeysetInformation = async () => {
    setIsLoading(true)
    setError("")

    try {
      
      // Use the radio service which handles both serial and DLI connections
      const keysetInfos = await radioService.viewKeysetInformation()
        
      // Convert to Keyset format
      const radioKeysets: Keyset[] = keysetInfos.map(info => ({
        id: info.KeysetId,
        name: info.KeysetName || `Keyset ${info.KeysetId}`,
        type: info.KeysetType || "TEK",
        activeDatetime: info.ActivationDateTime || new Date(),
        active: (info as any).isActive || info.KeysetId === 255
      }))

      setKeysets(radioKeysets)
    } catch (err) {
      console.error("Failed to retrieve keyset information:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to retrieve keyset information"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode before performing operations.")
      } else {
        setError(errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const activateKeyset = (keyset: Keyset) => {
    if (keyset.id === 255) {
      alert("Error: Cannot deactivate KEK keyset")
      return
    }
    setKeysetToActivate(keyset)
    setShowActivateDialog(true)
  }

  const confirmActivateKeyset = async () => {
    if (!keysetToActivate) return

    try {
      // Find currently active keyset in same crypto group
      const cryptoGroup = Math.floor((keysetToActivate.id - 1) / 16)
      const currentlyActive = keysets.find(k => 
        k.active && 
        k.type === keysetToActivate.type && 
        Math.floor((k.id - 1) / 16) === cryptoGroup
      )

      if (currentlyActive) {
        const confirmMsg = `Warning: this will deactivate Keyset ${currentlyActive.id}, and activate Keyset ${keysetToActivate.id} on the radio. Do you wish to continue?`
        if (!confirm(confirmMsg)) {
          setShowActivateDialog(false)
          return
        }
      }

      
      // Perform actual changeover on radio
      if (currentlyActive) {
        await radioService.activateKeyset(currentlyActive.id, keysetToActivate.id)
      } else {
        // If no currently active keyset, activate with keyset 1 as superseded
        await radioService.activateKeyset(1, keysetToActivate.id)
      }

      // Update local state
      setKeysets(prev => prev.map(k => ({
        ...k,
        active: k.id === keysetToActivate.id ? true : 
                (k.type === keysetToActivate.type && Math.floor((k.id - 1) / 16) === cryptoGroup) ? false : 
                k.active
      })))

      alert(`Keyset ${keysetToActivate.id} activated successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate keyset")
    } finally {
      setShowActivateDialog(false)
      setKeysetToActivate(null)
    }
  }

  const editKeysetTagging = (keyset: Keyset) => {
    setEditingKeyset(keyset)
    setEditForm({
      name: keyset.name,
      activeDatetime: keyset.activeDatetime.toISOString().slice(0, 16)
    })
    setShowEditDialog(true)
  }

  const saveKeysetChanges = async () => {
    if (!editingKeyset) return

    try {
      // Implement actual keyset modification here
      console.log("Modifying keyset:", {
        id: editingKeyset.id,
        name: editForm.name,
        activeDatetime: new Date(editForm.activeDatetime)
      })

      // Update local state
      setKeysets(prev => prev.map(k => 
        k.id === editingKeyset.id 
          ? { ...k, name: editForm.name, activeDatetime: new Date(editForm.activeDatetime) }
          : k
      ))

      alert("Keyset updated successfully!")
      setShowEditDialog(false)
      setEditingKeyset(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update keyset")
    }
  }

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString()
  }

  const getKeysetTypeBadge = (type: string) => {
    switch (type) {
      case "TEK":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">TEK</Badge>
      case "KEK":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">KEK</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Radio Keysets</h1>
          <p className="text-muted-foreground">
            View and manage keysets on the connected radio.
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
          </div>
          <div className="flex items-center space-x-1">
            <Layers3 className="h-4 w-4 text-muted-foreground" />
            <span>{keysets.length} keysets</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{keysets.filter(k => k.active).length} active</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button 
              onClick={viewKeysetInformation}
              disabled={isLoading}
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
                  View Keyset Information
                </>
              )}
            </Button>
            
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Keysets List */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Layers3 className="h-5 w-5" />
              <span>Radio Keysets</span>
              <Badge variant="secondary" className="ml-2">
                {keysets.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {keysets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No keysets found on radio</p>
                <p className="text-xs mt-1">Click "View Keyset Information" to load keysets from radio</p>
              </div>
            ) : (
              keysets.map((keyset) => (
                <div 
                  key={keyset.id} 
                  className={`group relative flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                    keyset.active
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      keyset.active
                        ? 'bg-green-600 text-white' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <Layers3 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{keyset.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge 
                          variant={keyset.active ? "default" : "outline"}
                          className={`text-xs px-1.5 py-0.5 h-5 ${keyset.active ? 'bg-green-600' : ''}`}
                        >
                          {keyset.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge 
                          variant={keyset.type === 'KEK' ? 'destructive' : 'default'}
                          className="text-xs px-1.5 py-0.5 h-5"
                        >
                          {keyset.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">ID {keyset.id}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(keyset.activeDatetime)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {!keyset.active && keyset.id !== 255 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => activateKeyset(keyset)}
                        className="h-8 px-2"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editKeysetTagging(keyset)}
                      className="h-8 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Keyset Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Keyset Tagging</DialogTitle>
            <DialogDescription>
              Modify the name and activation time for the selected keyset
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keysetName">Keyset Name</Label>
              <Input
                id="keysetName"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                maxLength={31}
                placeholder="Enter keyset name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activeDatetime">Activation Date/Time</Label>
              <Input
                id="activeDatetime"
                type="datetime-local"
                value={editForm.activeDatetime}
                onChange={(e) => setEditForm(prev => ({ ...prev, activeDatetime: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveKeysetChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Keyset Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Keyset</DialogTitle>
            <DialogDescription>
              This will activate Keyset {keysetToActivate?.id} and deactivate any currently active keyset in the same crypto group.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Activating a keyset will change the radio's encryption configuration. 
                Ensure all radios in the system are updated with the same keyset.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmActivateKeyset}>
              <Play className="h-4 w-4 mr-2" />
              Activate Keyset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
