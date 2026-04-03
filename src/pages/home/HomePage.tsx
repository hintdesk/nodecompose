import { useState, useEffect } from 'react'
import type { Workspace } from '@/entities/Workspace'
import { workspaceService } from '@/services/workspace.service'
import TopMenuBar from '@/components/layout/home/TopMenuBar'
import FileTreeView from '@/components/layout/home/FileTreeView'
import EditorPanel from '@/components/layout/home/EditorPanel'
import TerminalPanel from '@/components/layout/home/TerminalPanel'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import './HomePage.css'

export default function HomePage() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Initialize selected workspace on component mount
    const workspace = workspaceService.initializeSelectedWorkspace()
    setSelectedWorkspace(workspace)
  }, [])

  const handleWorkspaceChange = (workspace: Workspace | null) => {
    setSelectedWorkspace(workspace)
    if (workspace) {
      workspaceService.setSelectedWorkspaceId(workspace.Id)
    } else {
      workspaceService.clearSelectedWorkspace()
    }
    setSelectedFile(null)
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath)
    // File content will be loaded by EditorPanel
  }

  const handleFileContentChange = () => {
    // File content changes are handled by EditorPanel
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopMenuBar
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
        onRefresh={handleRefresh}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {selectedWorkspace ? (
          <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize={20} minSize={15} className="min-h-0">
              <FileTreeView
                key={refreshKey}
                workspacePath={selectedWorkspace.Folder}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={80} className="min-h-0">
              <ResizablePanelGroup orientation="vertical" className="h-full min-h-0">
                <ResizablePanel defaultSize={60} minSize={20} className="min-h-0">
                  <EditorPanel
                    filePath={selectedFile}
                    onContentChange={handleFileContentChange}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={20} className="min-h-0">
                  <TerminalPanel workspacePath={selectedWorkspace.Folder} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
              <p className="text-muted-foreground">Go to Settings to create or select a workspace</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
