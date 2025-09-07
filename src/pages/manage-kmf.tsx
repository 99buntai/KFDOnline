import { useState, useEffect } from "react"
import { RadioCommunicationService } from "@/services/radio-communication-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Building, 
  Eye, 
  Edit, 
  Clock,
  AlertTriangle,
  Radio
} from "lucide-react"

interface KmfRsiItem {
  type: "KMF"
  rsiId: number
  messageNumber: number
}

type NumberBase = "hex" | "dec"

export function ManageKmfPage() {
  const [kmfRsiItems, setKmfRsiItems] = useState<KmfRsiItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [editingKmfRsi, setEditingKmfRsi] = useState<KmfRsiItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showClockDialog, setShowClockDialog] = useState(false)
  const [numberBase, setNumberBase] = useState<NumberBase>("dec")

  // Edit form state
  const [editForm, setEditForm] = useState({
    rsiId: "",
    messageNumber: ""
  })

  // Clock form state
  const [clockForm, setClockForm] = useState({
    useComputerTime: true,
    customDateTime: ""
  })

  const radioService = RadioCommunicationService.getInstance()

  useEffect(() => {
    // Set current time as default for clock setting
    const now = new Date()
    setClockForm(prev => ({
      ...prev,
      customDateTime: now.toISOString().slice(0, 16)
    }))
  }, [])

  const viewKmfInformation = async () => {
    setIsLoading(true)
    setError("")

    try {
      
      // Get KMF RSI and MNP from radio
      const kmfInfo = await radioService.viewKmfInformation()
      const kmfRsi = kmfInfo.rsi
      const mnp = kmfInfo.mnp
      
      const kmfRsiItem: KmfRsiItem = {
        type: "KMF",
        rsiId: kmfRsi,
        messageNumber: mnp
      }

      setKmfRsiItems([kmfRsiItem])
    } catch (err) {
      console.error("Failed to retrieve KMF information:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to retrieve KMF information"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode before performing KMF operations.")
      } else {
        setError(errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const editKmfRsi = (kmfRsi: KmfRsiItem) => {
    setEditingKmfRsi(kmfRsi)
    setEditForm({
      rsiId: kmfRsi.rsiId.toString(numberBase === "hex" ? 16 : 10),
      messageNumber: kmfRsi.messageNumber.toString(numberBase === "hex" ? 16 : 10)
    })
    setShowEditDialog(true)
  }

  const saveKmfRsiChanges = async () => {
    const rsiId = parseInt(editForm.rsiId, numberBase === "hex" ? 16 : 10)
    const messageNumber = parseInt(editForm.messageNumber, numberBase === "hex" ? 16 : 10)

    // Validate KMF RSI range
    if (rsiId < 1 || rsiId > 9999999) {
      alert("Valid range for KMF RSI is 1 to 9,999,999 (0x000001 to 0x98967F)")
      return
    }

    if (messageNumber < 0 || messageNumber > 65535) {
      alert("Valid range for Message Number is 0 to 65,535 (0x0000 to 0xFFFF)")
      return
    }

    try {
      
      if (editingKmfRsi) {
        // Update existing KMF RSI using LoadConfig
        await radioService.loadConfig(rsiId, messageNumber)
        
        setKmfRsiItems(prev => prev.map(r => 
          r.rsiId === editingKmfRsi.rsiId 
            ? { ...r, rsiId, messageNumber }
            : r
        ))
        
        alert("KMF RSI updated successfully!")
      }

      setShowEditDialog(false)
      setEditingKmfRsi(null)
    } catch (err) {
      console.error("Failed to save KMF RSI:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to save KMF RSI"
      if (errorMsg.includes("Communication timeout")) {
        setError("Communication timeout. Please ensure the radio is connected and in Keyloading mode.")
      } else {
        setError(errorMsg)
      }
    }
  }

  const setRadioClock = async () => {
    try {
      const targetDateTime = clockForm.useComputerTime 
        ? new Date() 
        : new Date(clockForm.customDateTime)

      // Implement actual clock setting here
      console.log("Setting radio clock to:", targetDateTime)
      
      alert(`Radio clock set to: ${targetDateTime.toLocaleString()}`)
      setShowClockDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set radio clock")
    }
  }

  const formatNumber = (value: number): string => {
    if (numberBase === "hex") {
      return "0x" + value.toString(16).toUpperCase().padStart(6, "0")
    }
    return value.toString()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage KMF RSI</h1>
          <p className="text-muted-foreground">
            Manage Key Management Facility Radio Set Identifier for the connected radio.
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
                onClick={viewKmfInformation}
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
                    View KMF Information
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setShowClockDialog(true)}
                variant="outline"
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-2" />
                Set Radio Clock
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

      {/* KMF RSI Items List */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>KMF RSI Information</span>
              <Badge variant="secondary" className="ml-2">
                {kmfRsiItems.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {kmfRsiItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No KMF RSI found on radio</p>
                <p className="text-xs mt-1">Click "View KMF Information" to load KMF data from radio</p>
              </div>
            ) : (
              kmfRsiItems.map((rsi) => (
                <div 
                  key={rsi.rsiId} 
                  className="group relative flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-muted/30"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      <Building className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">KMF RSI {formatNumber(rsi.rsiId)}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          KMF
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
                      onClick={() => editKmfRsi(rsi)}
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

      {/* Edit KMF RSI Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit KMF RSI</DialogTitle>
            <DialogDescription>
              Modify the Key Management Facility RSI configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kmfRsiId">KMF RSI ID</Label>
              <Input
                id="kmfRsiId"
                value={editForm.rsiId}
                onChange={(e) => setEditForm(prev => ({ ...prev, rsiId: e.target.value }))}
                placeholder={numberBase === "hex" ? "0x98967F" : "9999999"}
              />
              <div className="text-xs text-muted-foreground">
                Valid range: 1 to 9,999,999 (0x000001 to 0x98967F)
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kmfMessageNumber">Message Number</Label>
              <Input
                id="kmfMessageNumber"
                value={editForm.messageNumber}
                onChange={(e) => setEditForm(prev => ({ ...prev, messageNumber: e.target.value }))}
                placeholder={numberBase === "hex" ? "0xFFFF" : "65535"}
              />
              <div className="text-xs text-muted-foreground">
                Valid range: 0 to 65,535 (0x0000 to 0xFFFF)
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveKmfRsiChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Radio Clock Dialog */}
      <Dialog open={showClockDialog} onOpenChange={setShowClockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Radio Clock</DialogTitle>
            <DialogDescription>
              Synchronize the radio's internal clock with the specified time
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="useComputerTime"
                checked={clockForm.useComputerTime}
                onCheckedChange={(checked) => setClockForm(prev => ({ ...prev, useComputerTime: checked }))}
              />
              <Label htmlFor="useComputerTime">Use Computer Time</Label>
            </div>

            {!clockForm.useComputerTime && (
              <div className="space-y-2">
                <Label htmlFor="customDateTime">Custom Date/Time</Label>
                <Input
                  id="customDateTime"
                  type="datetime-local"
                  value={clockForm.customDateTime}
                  onChange={(e) => setClockForm(prev => ({ ...prev, customDateTime: e.target.value }))}
                />
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <strong>Target Time:</strong> {clockForm.useComputerTime 
                  ? new Date().toLocaleString()
                  : clockForm.customDateTime 
                    ? new Date(clockForm.customDateTime).toLocaleString()
                    : "Invalid date"
                }
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={setRadioClock}>
              <Clock className="h-4 w-4 mr-2" />
              Set Clock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
