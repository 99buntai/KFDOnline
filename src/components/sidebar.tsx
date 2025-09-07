import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Home,
  Settings,
  Plus,
  Upload,
  List,
  Layers3,
  Radio,
  Building,
  FileKey,
  Trash2,
  RefreshCw,
  Save,
} from "lucide-react"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  isOpen: boolean
  onToggle: () => void
  className?: string
}

const navigationItems = [
  {
    title: "Home",
    items: [
      { id: "home", label: "Home", icon: Home },
      { id: "options", label: "Device Options", icon: Settings, hidden: false },
      { id: "create-key", label: "Create New Key", icon: Plus },
      { id: "load-keys", label: "Load Keys", icon: Upload },
    ],
  },
  {
    title: "Manage Radio",
    items: [
      { id: "manage-keys", label: "Manage Keys", icon: List },
      { id: "manage-keysets", label: "Manage Keysets", icon: Layers3 },
      { id: "manage-rsi", label: "Manage RSIs", icon: Radio },
      { id: "manage-kmf", label: "Manage KMF RSI", icon: Building },
    ],
  },
  {
    title: "Manage Key Container",
    items: [
      { id: "load-container", label: "Load Key Container", icon: FileKey },
      { id: "container-keys", label: "Manage Keys", icon: List },
      { id: "container-groups", label: "Manage Groups", icon: Layers3 },
      { id: "regenerate-keys", label: "Regenerate Keys", icon: RefreshCw },
      { id: "export-container", label: "Export Key Container", icon: Save },
      { id: "reset-container", label: "Reset Key Container", icon: Trash2 },
    ],
  },
]

export function Sidebar({ currentPage, onPageChange, isOpen, onToggle, className }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-br from-background/80 via-background/60 to-muted/10 backdrop-blur-sm border-r border-white/10 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 safe-top safe-left flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <img src="/favicon.ico" alt="KFD Online" className="h-6 w-6" />
            <h1 className="font-semibold text-lg">KFD Online</h1>
          </div>
        </div>

        <ScrollArea className="flex-1 scrollable safe-bottom">
          <div className="p-4 space-y-6">
            {navigationItems.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items
                    .filter((item) => !item.hidden)
                    .map((item) => {
                      const Icon = item.icon
                      return (
                        <Button
                          key={item.id}
                          variant={currentPage === item.id ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => {
                            onPageChange(item.id)
                            if (window.innerWidth < 768) {
                              onToggle()
                            }
                          }}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}