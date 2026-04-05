import './SettingsPage.css'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { workspaceService } from '@/services/workspace.service'
import SettingsSidebar from '@/components/layout/settings/SettingsSidebar'
import type { Workspace } from '@/entities/Workspace'
import Workspaces from '@/components/layout/settings/Workspaces'

type SettingsView = 'workspace' | null

export default function SettingsPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<SettingsView>('workspace')
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() =>
    workspaceService.getAllWorkspaces(),
  )

  const handleWorkspaceListChange = (updatedWorkspaces: Workspace[]) => {
    setWorkspaces(updatedWorkspaces)
  }

  const handleBack = () => {
    navigate('/')
  }

  const renderContent = () => {
    switch (activeView) {
      case 'workspace':
        return <Workspaces onWorkspaceListChange={handleWorkspaceListChange} />
      default:
        return <Workspaces onWorkspaceListChange={handleWorkspaceListChange} />
    }
  }

  return (
    <div className="settings-page flex min-h-screen flex-col bg-background">
      {/* Menu Bar */}
      <div className="border-b bg-background px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          title="Back to home"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-bold">Settings</p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 border-r bg-background">
          <SettingsSidebar
            activeView={activeView}
            workspaces={workspaces}
            onViewChange={(view) => setActiveView(view as SettingsView)}
          />
        </div>
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
