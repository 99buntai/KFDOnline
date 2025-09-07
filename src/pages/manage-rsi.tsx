import { useState } from "react"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Radio, 
  Eye, 
  Plus, 
  Edit, 
  Trash2,
  AlertTriangle,
  Rss,
  Users,
  Building,
  Search
} from "lucide-react"

interface RsiItem {
  type: "Individual" | "Group" | "KMF"
  rsiId: number
  messageNumber: number
}

type NumberBase = "hex" | "dec"

export function ManageRsiPage() {
  const [rsiItems, setRsiItems] = useState<RsiItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [editingRsi, setEditingRsi] = useState<RsiItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [rsiToDelete, setRsiToDelete] = useState<RsiItem | null>(null)
  const [numberBase, setNumberBase] = useState<NumberBase>("dec")

  // Edit form state
  const [editForm, setEditForm] = useState({
    rsiId: "",
    messageNumber: "",
    isNew: false
  })

  const radioService = RadioCommunicationService.getInstance()

  const viewRsiInformation = async () => {
    setIsLoading(true)
    setError("")

    try {
      const rsiInfos = await radioService.viewRsiInformation()
      
      // Convert to RsiItem format
      const radioRsiItems: RsiItem[] = rsiInfos.map(info => ({
        type: info.RSI < 9999999 ? 'Individual' : 'Group',
        rsiId: info.RSI,
        messageNumber: info.MN
      }))

      setRsiItems(radioRsiItems.sort((a, b) => a.rsiId - b.rsiId))
    } catch (err) {
      console.error("Failed to retrieve RSI information:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to retrieve RSI information"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode before performing RSI operations.")
      } else {
        setError(errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const addNewRsi = () => {
    setEditingRsi(null)
    setEditForm({
      rsiId: "",
      messageNumber: "",
      isNew: true
    })
    setShowEditDialog(true)
  }

  const editRsi = (rsi: RsiItem) => {
    setEditingRsi(rsi)
    setEditForm({
      rsiId: rsi.rsiId.toString(numberBase === "hex" ? 16 : 10),
      messageNumber: rsi.messageNumber.toString(numberBase === "hex" ? 16 : 10),
      isNew: false
    })
    setShowEditDialog(true)
  }

  const deleteRsi = (rsi: RsiItem) => {
    if (rsi.type === "KMF") {
      alert("KMF RSI cannot be deleted. Use the KMF RSI management page instead.")
      return
    }
    setRsiToDelete(rsi)
    setShowDeleteDialog(true)
  }

  const confirmDeleteRsi = async () => {
    if (!rsiToDelete) return

    try {
      
      // Delete RSI (change to 0 to delete)
      await radioService.changeRsi(rsiToDelete.rsiId, 0, 0)
      
      setRsiItems(prev => prev.filter(r => r.rsiId !== rsiToDelete.rsiId))
      alert(`RSI ${rsiToDelete.rsiId} deleted successfully!`)
    } catch (err) {
      console.error("Failed to delete RSI:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to delete RSI"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode.")
      } else {
        setError(errorMsg)
      }
    } finally {
      setShowDeleteDialog(false)
      setRsiToDelete(null)
    }
  }

  const saveRsiChanges = async () => {
    const rsiId = parseInt(editForm.rsiId, numberBase === "hex" ? 16 : 10)
    const messageNumber = parseInt(editForm.messageNumber, numberBase === "hex" ? 16 : 10)

    // Validate RSI ranges
    const rsiType = getRsiType(rsiId)
    if (!validateRsiRange(rsiId, rsiType)) {
      return
    }

    try {
      
      if (editForm.isNew) {
        // Add new RSI (change from 0 to new RSI)
        await radioService.changeRsi(0, rsiId, messageNumber)
        
        const newRsi: RsiItem = {
          type: rsiType,
          rsiId,
          messageNumber
        }
        
        setRsiItems(prev => [...prev, newRsi].sort((a, b) => a.rsiId - b.rsiId))
        alert(`New ${rsiType} RSI ${rsiId} added successfully!`)
      } else if (editingRsi) {
        // Update existing RSI
        await radioService.changeRsi(editingRsi.rsiId, rsiId, messageNumber)
        
        setRsiItems(prev => prev.map(r => 
          r.rsiId === editingRsi.rsiId 
            ? { ...r, rsiId, messageNumber }
            : r
        ).sort((a, b) => a.rsiId - b.rsiId))
        
        alert(`RSI updated successfully!`)
      }

      setShowEditDialog(false)
      setEditingRsi(null)
    } catch (err) {
      console.error("Failed to save RSI:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to save RSI"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode.")
      } else {
        setError(errorMsg)
      }
    }
  }

  const getRsiType = (rsiId: number): "Individual" | "Group" | "KMF" => {
    if (rsiId >= 1 && rsiId <= 9999999) return "KMF"
    if (rsiId >= 1 && rsiId <= 9999998) return "Individual"
    if (rsiId >= 10000000 && rsiId <= 16777215) return "Group"
    return "Individual"
  }

  const validateRsiRange = (rsiId: number, type: "Individual" | "Group" | "KMF"): boolean => {
    switch (type) {
      case "KMF":
        if (rsiId < 1 || rsiId > 9999999) {
          alert("Valid range for KMF RSI is 1 to 9,999,999 (0x000001 to 0x98967F)")
          return false
        }
        break
      case "Individual":
        if (rsiId < 1 || rsiId > 9999998) {
          alert("Valid range for Individual RSI is 1 to 9,999,998 (0x000001 to 0x98967E)")
          return false
        }
        break
      case "Group":
        if (rsiId < 10000000 || rsiId > 16777215) {
          alert("Valid range for Group RSI is 10,000,000 to 16,777,215 (0x989680 to 0xFFFFFF)")
          return false
        }
        break
    }
    return true
  }

  const formatNumber = (value: number): string => {
    if (numberBase === "hex") {
      return "0x" + value.toString(16).toUpperCase().padStart(6, "0")
    }
    return value.toString()
  }

  const getRsiTypeBadge = (type: string) => {
    switch (type) {
      case "Individual":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Individual</Badge>
      case "Group":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Group</Badge>
      case "KMF":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">KMF</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage RSIs</h1>
          <p className="text-muted-foreground">
            Manage Radio Set Identifiers (RSIs) for the connected radio.
          </p>
        </div>
        
        {/* Format Toggle */}
        <div className="flex space-x-1">
          <Button
            variant={numberBase === "dec" ? "default" : "outline"}
            size="sm"
            onClick={() => setNumberBase("dec")}
            className="h-7 px-2 text-xs"
          >
            Dec
          </Button>
          <Button
            variant={numberBase === "hex" ? "default" : "outline"}
            size="sm"
            onClick={() => setNumberBase("hex")}
            className="h-7 px-2 text-xs"
          >
            Hex
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={viewRsiInformation}
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
                    View RSI Information
                  </>
                )}
              </Button>
              <Button 
                onClick={addNewRsi}
                disabled={isLoading}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New RSI
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

      {/* RSI Items List */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Rss className="h-5 w-5" />
              <span>RSI Items</span>
              <Badge variant="secondary" className="ml-2">
                {rsiItems.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {rsiItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Rss className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No RSIs found on radio</p>
                <p className="text-xs mt-1">Click "View RSI Information" to load RSIs from radio</p>
              </div>
            ) : (
              rsiItems.map((rsi) => {
                const getIcon = () => {
                  switch (rsi.type) {
                    case "Individual": return <Users className="h-3.5 w-3.5" />
                    case "Group": return <Building className="h-3.5 w-3.5" />
                    case "KMF": return <Radio className="h-3.5 w-3.5" />
                    default: return <Rss className="h-3.5 w-3.5" />
                  }
                }
                
                return (
                  <div 
                    key={rsi.rsiId} 
                    className="group relative flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-muted/30"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 text-primary">
                        {getIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">RSI {formatNumber(rsi.rsiId)}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge 
                            variant={rsi.type === 'Individual' ? 'default' : rsi.type === 'Group' ? 'secondary' : 'outline'}
                            className="text-xs px-1.5 py-0.5 h-5"
                          >
                            {rsi.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            MN {formatNumber(rsi.messageNumber)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editRsi(rsi)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {rsi.type === "Group" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRsi(rsi)}
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit RSI Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editForm.isNew ? "Add New RSI" : "Edit RSI"}</DialogTitle>
            <DialogDescription>
              {editForm.isNew ? "Add a new Radio Set Identifier" : "Modify the selected RSI"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rsiId">RSI ID</Label>
              <Input
                id="rsiId"
                value={editForm.rsiId}
                onChange={(e) => setEditForm(prev => ({ ...prev, rsiId: e.target.value }))}
                placeholder={numberBase === "hex" ? "0xFFFFFF" : "16777215"}
              />
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const rsiId = parseInt(editForm.rsiId, numberBase === "hex" ? 16 : 10)
                  if (!isNaN(rsiId)) {
                    const type = getRsiType(rsiId)
                    return `Detected type: ${type}`
                  }
                  return "Enter RSI ID to see type detection"
                })()}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="messageNumber">Message Number</Label>
              <Input
                id="messageNumber"
                value={editForm.messageNumber}
                onChange={(e) => setEditForm(prev => ({ ...prev, messageNumber: e.target.value }))}
                placeholder={numberBase === "hex" ? "0xFFFF" : "65535"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveRsiChanges}>
              {editForm.isNew ? "Add RSI" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete RSI Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete RSI</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete RSI {rsiToDelete?.rsiId}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Deleting an RSI will affect radio system identification. 
                Ensure this change is coordinated across all radios in the system.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRsi}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete RSI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About RSIs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Radio Set Identifiers (RSIs) are used for P25 system identification:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Individual RSI (1-9,999,998):</strong> Identifies individual radio units</li>
              <li><strong>Group RSI (10,000,000-16,777,215):</strong> Identifies talk groups</li>
              <li><strong>KMF RSI (1-9,999,999):</strong> Key Management Facility identifier</li>
              <li><strong>Message Number:</strong> Sequential counter for RSI-related messages</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
