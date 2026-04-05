import './HomePage.css'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useAppStore } from '@/stores/app.store'
import { useState, useEffect } from 'react'
import { workspaceService } from '@/services/workspace.service'
import EditorPanel from '@/components/layout/home/EditorPanel'
import FileTreeView from '@/components/layout/home/FileTreeView'
import HomeMenuBar from '@/components/layout/home/HomeMenuBar'
import TerminalPanel from '@/components/layout/home/TerminalPanel'

export default function HomePage() {
  const selectedWorkspace = useAppStore(state => state.selectedWorkspace)
  const setSelectedWorkspace = useAppStore(state => state.setSelectedWorkspace)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  useEffect(() => {
    const workspace = workspaceService.initializeSelectedWorkspace()
    setSelectedWorkspace(workspace)
  }, [])

  useEffect(() => {
    setSelectedFile(null)
  }, [selectedWorkspace?.Id])

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath)
    // File content will be loaded by EditorPanel
  }

  const handleFileContentChange = () => {
    // File content changes are handled by EditorPanel
  }

  const handleAfterPull = () => {
    // Trigger reload of currently selected file
    setReloadTrigger(prev => prev + 1)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <HomeMenuBar
        onAfterPull={handleAfterPull}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {selectedWorkspace ? (
          <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize={20} minSize={15} className="min-h-0">
              <FileTreeView
                workspacePath={selectedWorkspace.Folder}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                reloadTrigger={reloadTrigger}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={80} className="min-h-0">
              <ResizablePanelGroup orientation="vertical" className="h-full min-h-0">
                <ResizablePanel defaultSize={60} minSize={20} className="min-h-0">
                  <EditorPanel
                    filePath={selectedFile}
                    onContentChange={handleFileContentChange}
                    reloadTrigger={reloadTrigger}
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
