import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Workspace } from '@/entities/Workspace'
import { workspaceService } from '@/services/workspace.service'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import SettingsSidebar from '@/components/layout/settings/SettingsSidebar'
import Workspaces from '@/components/layout/settings/Workspaces'
import './SettingsPage.css'

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
    <div className="flex min-h-screen flex-col bg-background">
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
        <p>Settings</p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize={20} minSize={15}>
            <SettingsSidebar
              activeView={activeView}
              workspaces={workspaces}
              onViewChange={(view) => setActiveView(view as SettingsView)}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80}>
            <div className="h-full overflow-auto">
              {renderContent()}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
