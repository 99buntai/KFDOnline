import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { KeyContainerService } from "@/services/key-container-service"
import { Save, Eye, EyeOff, AlertTriangle, Download, FileKey } from "lucide-react"

export function ExportContainerPage() {
  const [password, setPassword] = useState("")
  const [passwordVerify, setPasswordVerify] = useState("")
  const [filename, setFilename] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordVerify, setShowPasswordVerify] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState("")
  const [containerName, setContainerName] = useState("New Container")
  const [keyCount, setKeyCount] = useState(0)
  const [groupCount, setGroupCount] = useState(0)

  const containerService = KeyContainerService.getInstance()

  useEffect(() => {
    const updateData = () => {
      const container = containerService.getContainer()
      setContainerName(container.source)
      setKeyCount(container.keys.length)
      setGroupCount(container.groups.length)
      
      // Set default filename based on container name
      if (container.source !== "New Container" && !filename) {
        setFilename(container.source.replace(/\.[^/.]+$/, "")) // Remove extension if present
      }
    }

    containerService.onChange(updateData)
    updateData()
  }, [filename])

  const validateForm = (): boolean => {
    setError("")

    if (password !== passwordVerify) {
      setError("Passwords do not match, please verify password")
      return false
    }

    if (!password) {
      setError("Please enter a password")
      return false
    }

    if (!filename.trim()) {
      setError("Please enter a valid file name")
      return false
    }

    if (password.length < 16) {
      if (!confirm("This password is weak (under 16 characters in length) - use anyway?")) {
        return false
      }
    }

    // Check for invalid filename characters
    const invalidChars = /[\\/:*?"<>|]/
    if (invalidChars.test(filename)) {
      setError("Filename contains invalid characters: \\ / : * ? \" < > |")
      return false
    }

    return true
  }

  const exportContainer = async () => {
    if (!validateForm()) return

    setIsExporting(true)
    setError("")

    try {
      const finalFilename = filename.endsWith('.ekc') ? filename : `${filename}.ekc`
      await containerService.exportContainer(finalFilename, password)
      
      // Clear form
      setPassword("")
      setPasswordVerify("")
      setFilename("")
      
      alert("Key container exported successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export container")
    } finally {
      setIsExporting(false)
    }
  }

  const getPasswordStrength = (pwd: string): { strength: string, color: string } => {
    if (pwd.length === 0) return { strength: "None", color: "text-gray-500" }
    if (pwd.length < 8) return { strength: "Very Weak", color: "text-red-500" }
    if (pwd.length < 12) return { strength: "Weak", color: "text-orange-500" }
    if (pwd.length < 16) return { strength: "Fair", color: "text-yellow-500" }
    if (pwd.length < 20) return { strength: "Good", color: "text-blue-500" }
    return { strength: "Strong", color: "text-green-500" }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Export Key Container</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Export your current key container to an encrypted .ekc file for backup or sharing.
        </p>
      </div>

      {/* Container Summary */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileKey className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Ready to Export</p>
                <p className="text-sm text-muted-foreground">
                  {containerName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold">{keyCount}</div>
                <div className="text-xs text-muted-foreground">Keys</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{groupCount}</div>
                <div className="text-xs text-muted-foreground">Groups</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Form */}
      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
          <CardDescription>
            Configure the export parameters for your key container
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exportFilename">File Name</Label>
            <Input
              id="exportFilename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename (without .ekc extension)"
            />
            <p className="text-xs text-muted-foreground">
              The .ekc extension will be added automatically if not present
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exportPassword">Password</Label>
              <div className="relative">
                <Input
                  id="exportPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter encryption password"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Strength:</span>
                <span className={`text-xs font-medium ${passwordStrength.color}`}>
                  {passwordStrength.strength}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exportPasswordVerify">Verify Password</Label>
              <div className="relative">
                <Input
                  id="exportPasswordVerify"
                  type={showPasswordVerify ? "text" : "password"}
                  value={passwordVerify}
                  onChange={(e) => setPasswordVerify(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswordVerify(!showPasswordVerify)}
                >
                  {showPasswordVerify ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {password && passwordVerify && password !== passwordVerify && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={exportContainer}
            disabled={!password || !passwordVerify || !filename || isExporting || keyCount === 0}
            className="w-full"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                Exporting Container...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Export Key Container
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Key containers are encrypted using AES-256 with PBKDF2 key derivation (100,000 iterations).
            </p>
            <p>
              Use a strong password (16+ characters) with a mix of letters, numbers, and symbols.
            </p>
            <p>
              Exported files are compatible with KFDtool and KFDTool-AVR control software.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Empty Container Warning */}
      {keyCount === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Cannot export an empty container. Add keys to the container before exporting.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
