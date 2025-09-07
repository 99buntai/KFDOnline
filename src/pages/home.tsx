import { useState } from "react"
import { DeviceConnectionModal } from "@/components/device-connection-modal"
import { useConnection } from "@/contexts/connection-context"
import FuturisticBackground from "@/components/ui/FuturisticBackground"
import { 
  Usb, 
  Key, 
  Upload, 
  FolderOpen, 
  Settings, 
  List, 
  Layers,
  Radio,
  Database,
  Download,
  RotateCcw,
  Trash2,
  Plus
} from "lucide-react"

interface DashboardButtonProps {
  title: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "secondary" | "outline"
}

function DashboardButton({ title, icon, onClick, disabled = false, variant = "default" }: DashboardButtonProps) {
  return (
    <div 
      className={`group cursor-pointer transition-all duration-200 active:scale-95 hover:scale-105 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="text-center space-y-2">
        <div className={`mx-auto w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center transition-all duration-200 group-hover:brightness-110 shadow-lg ${
          variant === "default" && !disabled ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-primary/30" :
          variant === "secondary" ? "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-secondary/20" :
          disabled ? "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500 dark:from-gray-700 dark:to-gray-800 dark:text-gray-400 shadow-gray-300/20" :
          "bg-gradient-to-br from-muted to-muted/80 text-muted-foreground shadow-muted/20"
        }`}>
          <div className="w-6 h-6 md:w-7 md:h-7">
            {icon}
          </div>
        </div>
        <div className="space-y-1 px-1">
          <p className="text-xs md:text-sm font-medium text-foreground leading-tight line-clamp-2">{title}</p>
        </div>
      </div>
    </div>
  )
}

interface HomePageProps {
  onNavigate?: (page: string) => void
}

export function HomePage({ onNavigate }: HomePageProps = {}) {
  const { connectionStatus, dliConnected } = useConnection()
  const isConnected = connectionStatus === "connected" || dliConnected
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page)
    } else {
      // Fallback: try to find navigation function from parent
      const event = new CustomEvent('navigate', { detail: { page } })
      window.dispatchEvent(event)
    }
  }

  const handleConnectDevice = () => {
    setShowConnectionModal(true)
  }

  return (
    <>
      <FuturisticBackground />
      <div className="relative z-10 flex flex-col items-center justify-center py-8 px-4 md:px-6">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            KFD Online D0.2.0
          </h1>
      </div>
        <div className="bg-gradient-to-br from-background/80 via-background/60 to-muted/10 p-4 md:p-6 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-2xl border border-white/10 w-full max-w-7xl">
          <div className="space-y-6 md:space-y-8">
            {/* App Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 justify-items-center max-w-sm sm:max-w-md md:max-w-none mx-auto">
        {/* Connection & Setup */}
          <DashboardButton
            title="Connect Device"
            icon={<Usb />}
            onClick={handleConnectDevice}
          />
          <DashboardButton
            title="Device Options"
            icon={<Settings />}
            onClick={() => navigateTo('options')}
            disabled={!isConnected}
            variant={!isConnected ? "outline" : "default"}
          />

          {/* Key Management */}
          <DashboardButton
            title="Create Key"
            icon={<Plus  />}
            onClick={() => navigateTo('create-key')}
          />
          <DashboardButton
            title="Load Keys"
            icon={<Upload  />}
            onClick={() => navigateTo('load-keys')}
            disabled={!isConnected}
            variant={!isConnected ? "outline" : "default"}
          />
          <DashboardButton
            title="Manage Keys"
            icon={<Key  />}
            onClick={() => navigateTo('manage-keys')}
            disabled={!isConnected}
            variant={!isConnected ? "outline" : "default"}
          />
          <DashboardButton
            title="Regenerate Keys"
            icon={<RotateCcw  />}
            onClick={() => navigateTo('regenerate-keys')}
          />

          {/* Radio Management */}
          <DashboardButton
            title="Manage Keysets"
            icon={<Layers  />}
            onClick={() => navigateTo('manage-keysets')}
            disabled={!isConnected}
            variant={!isConnected ? "outline" : "default"}
          />
          <DashboardButton
            title="Manage RSI"
            icon={<Radio  />}
            onClick={() => navigateTo('manage-rsi')}
            disabled={!isConnected}
            variant={!isConnected ? "outline" : "default"}
          />
          <DashboardButton
            title="Manage KMF"
            icon={<Database  />}
            onClick={() => navigateTo('manage-kmf')}
            disabled={!isConnected}
            variant={!isConnected ? "outline" : "default"}
          />

          {/* Container Management */}
          <DashboardButton
            title="Load Container"
            icon={<FolderOpen  />}
            onClick={() => navigateTo('load-container')}
          />
          <DashboardButton
            title="Container Keys"
            icon={<List  />}
            onClick={() => navigateTo('container-keys')}
          />
          <DashboardButton
            title="Container Groups"
            icon={<Layers  />}
            onClick={() => navigateTo('container-groups')}
          />
          <DashboardButton
            title="Export Container"
            icon={<Download  />}
            onClick={() => navigateTo('export-container')}
          />

          {/* Utilities */}
          <DashboardButton
            title="Reset Container"
            icon={<Trash2  />}
            onClick={() => navigateTo('reset-container')}
            variant="outline"
          />
            </div>
              </div>
            </div>
      </div>

      {/* Device Connection Modal */}
      <DeviceConnectionModal 
        open={showConnectionModal} 
        onOpenChange={setShowConnectionModal} 
      />
    </>
  )
}
