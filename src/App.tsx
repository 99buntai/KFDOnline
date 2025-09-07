import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { ConnectionProvider } from "@/contexts/connection-context"
import { Layout } from "@/components/layout"
import { HomePage } from "@/pages/home"
import { ConnectDevicePage } from "@/pages/connect-device"
import { CreateKeyPage } from "@/pages/create-key"
import { LoadContainerPage } from "@/pages/load-container"
import { ManageKeysPage } from "@/pages/manage-keys"
import { ContainerKeysPage } from "@/pages/container-keys"
import { ContainerGroupsPage } from "@/pages/container-groups"
import { ExportContainerPage } from "@/pages/export-container"
import { ResetContainerPage } from "@/pages/reset-container"
import { RegenerateKeysPage } from "@/pages/regenerate-keys"
import { ManageKeysetsPage } from "@/pages/manage-keysets"
import { ManageRsiPage } from "@/pages/manage-rsi"
import { ManageKmfPage } from "@/pages/manage-kmf"
import { LoadKeysPage } from "@/pages/load-keys"
import { DeviceOptionsPage } from "@/pages/device-options"

// Placeholder components for other pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-center">
      <h1 className="text-3xl font-bold tracking-tight mb-4">{title}</h1>
      <p className="text-muted-foreground">This page is under development.</p>
    </div>
  </div>
)

function App() {
  const [currentPage, setCurrentPage] = useState("home")

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={setCurrentPage} />
      case "connect":
        return <HomePage onNavigate={setCurrentPage} /> // Redirect to home since connection is now system-wide
      case "options":
        return <DeviceOptionsPage />
      case "create-key":
        return <CreateKeyPage />
      case "load-keys":
        return <LoadKeysPage />
      case "manage-keys":
        return <ManageKeysPage />
      case "manage-keysets":
        return <ManageKeysetsPage />
      case "manage-rsi":
        return <ManageRsiPage />
      case "manage-kmf":
        return <ManageKmfPage />
      case "load-container":
        return <LoadContainerPage />
      case "container-keys":
        return <ContainerKeysPage />
      case "container-groups":
        return <ContainerGroupsPage />
      case "regenerate-keys":
        return <RegenerateKeysPage />
      case "export-container":
        return <ExportContainerPage />
      case "reset-container":
        return <ResetContainerPage />
      default:
        return <HomePage onNavigate={setCurrentPage} />
    }
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="kfd-online-theme">
      <ConnectionProvider>
        <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
          {renderPage()}
        </Layout>
      </ConnectionProvider>
    </ThemeProvider>
  )
}

export default App