import { Button } from '@/components/ui/button'
import { readFile, gitChangedFiles } from '@/lib/ipc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select'
import { Settings, Download, Upload, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores/app.store'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { workflowService } from '@/services/workflow.service'
import { workspaceService } from '@/services/workspace.service'
import ConflictDialog from './ConflictDialog'
import PushDialog from './PushDialog'
import type { Workflow } from '@/entities/Workflow'
import type { Workspace } from '@/entities/Workspace'

interface HomeMenuBarProps {
  onAfterPull?: () => void
}

export default function HomeMenuBar({
  onAfterPull,
}: HomeMenuBarProps) {
  const selectedWorkspace = useAppStore(state => state.selectedWorkspace)
  const setSelectedWorkspace = useAppStore(state => state.setSelectedWorkspace)
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [pulling, setPulling] = useState(false)
  const [pushDialogOpen, setPushDialogOpen] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflictingWorkflows, setConflicts] = useState<Workflow[]>([])
  const [pushingWorkflows, setPushWorkflows] = useState<Workflow[]>([])

  useEffect(() => {
    const allWorkspaces = workspaceService.getAllWorkspaces()
    setWorkspaces(allWorkspaces)
  }, [])

  const handleWorkspaceSelect = (workspaceId: string) => {
    const workspace = workspaceService.getWorkspaceById(workspaceId)
    if (workspace) {
      workspaceService.setSelectedWorkspaceId(workspace.Id)
    } else {
      workspaceService.clearSelectedWorkspace()
    }
    setSelectedWorkspace(workspace)
  }

  const handlePull = async () => {
    if (!selectedWorkspace) return
    setPulling(true)
    try {
      const result = await workflowService.pull(selectedWorkspace)

      if (result.length > 0) {
        setConflicts(result)
        setConflictDialogOpen(true)
      } else {
        // No conflicts: refresh the currently opened file immediately.
        onAfterPull?.()
      }
    } catch (err) {
      console.error('Pull failed:', err)
    } finally {
      setPulling(false)
    }
  }

  const handleConflictDialogClose = () => {
    setConflictDialogOpen(false)
    // Conflicts are resolved or dialog was closed; refresh current editor file.
    onAfterPull?.()
  }

  const handleOpenPush = async () => {
    if (!selectedWorkspace) return
    try {
      const changedFiles = await gitChangedFiles(selectedWorkspace.Folder)
      const jsonChangedFiles = changedFiles.filter((file) => file.endsWith('.json'))

      const workflowFiles: Workflow[] = []
      for (const relativePath of jsonChangedFiles) {
        const normalizedRelativePath = relativePath.replace(/\\/g, '/')
        const fullPath = `${selectedWorkspace.Folder}/${normalizedRelativePath}`
        try {
          const content = JSON.parse(await readFile(fullPath))
          const modifiedAtString = content.updatedAt
          const modifiedAt = modifiedAtString ? new Date(modifiedAtString) : undefined
          workflowFiles.push({
            LocalPath: fullPath,
            Name: content.name || normalizedRelativePath.split('/').pop() || normalizedRelativePath,
            ModifiedAt: modifiedAt,
            Id: content.id || '',
          })
        } catch {
          // skip invalid files
        }
      }

      workflowFiles.sort((a, b) => {
        if (!a.ModifiedAt) return 1
        if (!b.ModifiedAt) return -1
        return b.ModifiedAt.getTime() - a.ModifiedAt.getTime()
      })

      setPushWorkflows(workflowFiles)
      setPushDialogOpen(true)
    } catch (err) {
      console.error('Error loading workflows for push:', err)
    }
  }

  return (
    <>
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={selectedWorkspace?.Id || ''}
            onValueChange={handleWorkspaceSelect}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.length === 0 ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">
                  No workspaces available
                </div>
              ) : (
                workspaces.map(ws => (
                  <SelectItem key={ws.Id} value={ws.Id}>
                    {ws.Name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePull}
              disabled={!selectedWorkspace || pulling}
              className="rounded-r-none border-r-0 gap-1"
            >
              {pulling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Pull
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPush}
              disabled={!selectedWorkspace}
              className="rounded-l-none gap-1"
            >
              <Upload className="h-4 w-4" />
              Push
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConflictDialog
        open={conflictDialogOpen}
        conflicts={conflictingWorkflows}
        onClose={handleConflictDialogClose}
      />
      <PushDialog
        open={pushDialogOpen}
        workflows={pushingWorkflows}
        onClose={() => setPushDialogOpen(false)}
      />
    </>
  )
}
