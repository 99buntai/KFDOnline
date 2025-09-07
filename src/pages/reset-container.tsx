import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { KeyContainerService } from "@/services/key-container-service"
import { Trash2, AlertTriangle, FileKey, RefreshCw } from "lucide-react"

export function ResetContainerPage() {
  const [containerName, setContainerName] = useState("New Container")
  const [keyCount, setKeyCount] = useState(0)
  const [groupCount, setGroupCount] = useState(0)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const containerService = KeyContainerService.getInstance()

  useEffect(() => {
    const updateData = () => {
      const container = containerService.getContainer()
      setContainerName(container.source)
      setKeyCount(container.keys.length)
      setGroupCount(container.groups.length)
    }

    containerService.onChange(updateData)
    updateData()
  }, [])

  const resetContainer = async () => {
    setIsResetting(true)
    
    try {
      containerService.resetContainer()
      setShowConfirmDialog(false)
      alert("All keys and groups have been cleared from memory")
    } catch (error) {
      alert("Failed to reset container")
    } finally {
      setIsResetting(false)
    }
  }

  const isContainerEmpty = keyCount === 0 && groupCount === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reset Key Container</h1>
        <p className="text-muted-foreground">
          Clear all keys and groups from the current container, returning it to its initial state.
        </p>
      </div>

      {/* Container Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileKey className="h-5 w-5" />
            <span>Current Container</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Container Name:</span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {containerName}
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Keys:</span>
                <Badge variant={keyCount > 0 ? "default" : "secondary"}>
                  {keyCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Groups:</span>
                <Badge variant={groupCount > 0 ? "default" : "secondary"}>
                  {groupCount}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>WARNING:</strong> This action will permanently delete all keys and groups from the container! 
          This operation cannot be undone. Make sure to export your container first if you want to keep a backup.
        </AlertDescription>
      </Alert>

      {/* Reset Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will clear all container data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Reset Container
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                This will remove all {keyCount} key{keyCount !== 1 ? 's' : ''} and {groupCount} group{groupCount !== 1 ? 's' : ''} from the container.
              </p>
              <Button 
                variant="destructive" 
                onClick={() => setShowConfirmDialog(true)}
                disabled={isContainerEmpty}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Keys and Groups
              </Button>
            </div>

            {isContainerEmpty && (
              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertDescription>
                  The container is already empty. There is nothing to reset.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Container Reset</DialogTitle>
            <DialogDescription>
              This action will permanently delete all data from the container:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Keys to be deleted:</span>
                <Badge variant="destructive">{keyCount}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Groups to be deleted:</span>
                <Badge variant="destructive">{groupCount}</Badge>
              </div>
            </div>
            
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This operation cannot be undone. All keys and groups will be permanently lost.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={resetContainer}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Reset Container
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Container Reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Resetting the container will:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Remove all encryption keys from memory</li>
              <li>Delete all key groups and their associations</li>
              <li>Reset the container name to "New Container"</li>
              <li>Reset internal counters for new keys and groups</li>
            </ul>
            <p className="mt-4">
              <strong>Recommendation:</strong> Export your container before resetting to create a backup.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
