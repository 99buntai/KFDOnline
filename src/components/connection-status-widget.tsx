import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useConnection } from "@/contexts/connection-context"
import { DeviceConnectionModal } from "@/components/device-connection-modal"
import { 
  Usb, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  Wifi
} from "lucide-react"

export function ConnectionStatusWidget() {
  const [showModal, setShowModal] = useState(false)
  const { connectionStatus, deviceInfo, dliConnected } = useConnection()

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: deviceInfo?.name || "Connected",
          bgColor: "bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900",
          textColor: "text-green-700 dark:text-green-300",
          borderColor: "border-green-200 dark:border-green-800"
        }
      case "connecting":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Connecting...",
          bgColor: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900",
          textColor: "text-blue-700 dark:text-blue-300",
          borderColor: "border-blue-200 dark:border-blue-800"
        }
      case "error":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          text: "Error",
          bgColor: "bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900",
          textColor: "text-red-700 dark:text-red-300",
          borderColor: "border-red-200 dark:border-red-800"
        }
      default:
        return {
          icon: <Usb className="h-4 w-4" />,
          text: "Disconnected",
          bgColor: "bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900",
          textColor: "text-gray-700 dark:text-gray-300",
          borderColor: "border-gray-200 dark:border-gray-800"
        }
    }
  }

  const config = getStatusConfig()

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          className={`
            h-8 px-3 py-1 rounded-md border transition-all duration-200
            ${config.bgColor} ${config.textColor} ${config.borderColor}
            flex items-center space-x-2
          `}
          onClick={() => setShowModal(true)}
        >
          {config.icon}
          <span className="text-sm font-medium">{config.text}</span>
        </Button>
        
        {dliConnected && (
          <Badge variant="outline" className="h-6 px-2 flex items-center space-x-1">
            <Wifi className="h-3 w-3" />
            <span className="text-xs">DLI</span>
          </Badge>
        )}
      </div>

      <DeviceConnectionModal 
        open={showModal} 
        onOpenChange={setShowModal}
      />
    </>
  )
}
