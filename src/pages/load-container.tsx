import { useState, useRef, useEffect } from "react"
import { KeyContainerService } from "@/services/key-container-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { FileKey, Upload, AlertTriangle, Download, Eye, EyeOff } from "lucide-react"

export function LoadContainerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentContainer, setCurrentContainer] = useState("New Container")
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerService = KeyContainerService.getInstance()

  useEffect(() => {
    // Set up container change monitoring
    const updateContainerInfo = () => {
      const container = containerService.getContainer()
      setCurrentContainer(container.source)
    }

    containerService.onChange(updateContainerInfo)
    updateContainerInfo() // Initial load
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to load container
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selectedFile && password) {
        e.preventDefault()
        openContainer()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, password, isLoading])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    handleFile(file)
  }

  const handleFile = (file: File | undefined) => {
    if (file && file.name.endsWith('.ekc')) {
      setSelectedFile(file)
      setError("")
    } else if (file) {
      setError("Please select a valid .ekc file")
      setSelectedFile(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const openContainer = async () => {
    if (!selectedFile || !password) {
      setError("Please select a file and enter a password")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await containerService.loadContainer(selectedFile, password)
      
      // Clear form
      setPassword("")
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      // Show success message and redirect
      const container = containerService.getContainer()
      alert(`Container "${container.source}" loaded successfully!\n${container.keys.length} keys and ${container.groups.length} groups imported.`)
    } catch (err) {
      console.error('Container load error:', err)
      let errorMessage = "Failed to load container. Please check your file and password."
      
      if (err instanceof Error) {
        if (err.message.includes("Invalid password")) {
          errorMessage = "Invalid password for the selected container file. Please check your password and try again."
        } else if (err.message.includes("Invalid file format")) {
          errorMessage = "Invalid file format. Please select a valid .ekc container file."
        } else if (err.message.includes("File size mismatch") || err.message.includes("corrupt")) {
          errorMessage = "The container file appears to be corrupted. Please try with a different file."
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSampleContainer = () => {
    const link = document.createElement('a')
    link.href = '/public_safety_example.ekc'
    link.download = 'public_safety_example.ekc'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Load Key Container</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Import an encrypted key container (.ekc) file to access your stored encryption keys and groups.
        </p>
      </div>

      {/* Current Container Status */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileKey className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Current Container</p>
                <p className="text-sm text-muted-foreground">
                  {currentContainer === "New Container" ? "No container loaded" : `Loaded: ${currentContainer}`}
                </p>
              </div>
            </div>
            <Badge variant={currentContainer === "New Container" ? "secondary" : "default"} className="px-3 py-1">
              {currentContainer}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* File Upload Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload Container</span>
            </CardTitle>
            <CardDescription>
              Select your encrypted key container file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-3">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Input
                  id="containerFile"
                  type="file"
                  accept=".ekc"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="sr-only"
                />
                <label 
                  htmlFor="containerFile" 
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className={`h-8 w-8 transition-colors ${
                    isDragOver ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="text-sm">
                    <span className="font-medium text-primary">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Encrypted Key Container (.ekc files only)
                  </div>
                </label>
              </div>
              
              {selectedFile && (
                <div className="flex items-center justify-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <FileKey className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="containerPassword" className="text-sm font-medium">
                Container Password
              </Label>
              <div className="relative">
                <Input
                  id="containerPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your container password"
                  className="pr-10"
                  autoComplete="off"
                  onKeyPress={(e) => e.key === 'Enter' && selectedFile && password && openContainer()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Load Button */}
            <Button 
              onClick={openContainer}
              disabled={!selectedFile || !password || isLoading}
              className="w-full h-11"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Decrypting Container...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Load Container
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Information & Sample */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Try Sample Container</span>
            </CardTitle>
            <CardDescription>
              Test the functionality with our sample encrypted container
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileKey className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">public_safety_example.ekc</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Contains sample P25 encryption keys for testing purposes
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-medium">Password:</span>
                  <code className="ml-1 bg-muted px-1 py-0.5 rounded">test</code>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadSampleContainer}
                  className="h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            
            {/* Security Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Security Features</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  <span>AES-256 encryption</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  <span>PBKDF2 key derivation (100,000 iterations)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  <span>Compatible with KFDtool software</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  <span>Compressed for efficient storage</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Notice */}
      {currentContainer !== "New Container" && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Loading a new container will replace your current container and all its keys and groups.
          </AlertDescription>
        </Alert>
      )}

    </div>
  )
}
