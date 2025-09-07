import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { SimpleThemeToggle } from "@/components/simple-theme-toggle"
import { ConnectionStatusWidget } from "@/components/connection-status-widget"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-full bg-background flex">
      <Sidebar
        currentPage={currentPage}
        onPageChange={onPageChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header with safe area support */}
        <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-30 safe-top safe-left safe-right">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button integrated into header */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">KFD Online</h1>
            </div>
            <div className="flex items-center space-x-3">
              <ConnectionStatusWidget />
              <div className="h-6 w-px bg-border"></div>
              <SimpleThemeToggle />
            </div>
          </div>
        </header>

        {/* Main content with safe area support - single scroll container */}
        <main className="flex-1 overflow-y-auto scrollable safe-bottom safe-left safe-right">
          <div className="p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
