import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { Workspace } from '@/entities/Workspace'
import { workspaceService } from '@/services/workspace.service'
import { n8nService } from '@/services/n8n.service'
import { workflowService } from '@/services/workflow.service'
import { readFile, writeFile, listDirectory, createDirectory } from '@/lib/ipc'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, RotateCcw, Download, Upload, Loader2 } from 'lucide-react'
import ConflictDialog from './ConflictDialog'
import PushDialog, { type WorkflowFile } from './PushDialog'

interface TopMenuBarProps {
  selectedWorkspace: Workspace | null
  onWorkspaceChange: (workspace: Workspace | null) => void
  onRefresh: () => void
}

export default function TopMenuBar({
  selectedWorkspace,
  onWorkspaceChange,
  onRefresh,
}: TopMenuBarProps) {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [pulling, setPulling] = useState(false)
  const [pushDialogOpen, setPushDialogOpen] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])
  const [pushWorkflows, setPushWorkflows] = useState<WorkflowFile[]>([])

  useEffect(() => {
    const allWorkspaces = workspaceService.getAllWorkspaces()
    setWorkspaces(allWorkspaces)
  }, [])

  const handleWorkspaceSelect = (workspaceId: string) => {
    const workspace = workspaceService.getWorkspaceById(workspaceId)
    onWorkspaceChange(workspace)
  }

  const getTempDir = (workspace: Workspace): string => {
    const sep = workspace.Folder.includes('\\') ? '\\' : '/'
    return `${workspace.Folder}${sep}.n8n-sync${sep}${workspace.N8nProjectId}${sep}workflows`
  }

  const handlePull = async () => {
    if (!selectedWorkspace) return
    setPulling(true)
    try {
      const workflows = await n8nService.getWorkflows(
        selectedWorkspace.N8nUrl,
        selectedWorkspace.N8nApiKey,
        selectedWorkspace.N8nProjectId,
      )

      const tempDir = getTempDir(selectedWorkspace)
      await createDirectory(tempDir)

      const sep = tempDir.includes('\\') ? '\\' : '/'
      for (const wf of workflows) {
        const safeName = String(wf.name).replace(/[/\\?%*:|"<>]/g, '_')
        const filePath = `${tempDir}${sep}${safeName}.${wf.id}.json`
        await writeFile(filePath, JSON.stringify(wf, null, 2))
      }

      const result = await workflowService.pull(selectedWorkspace.Folder, tempDir)

      const localSep = selectedWorkspace.Folder.includes('\\') ? '\\' : '/'
      for (const remotePath of result.download) {
        const content = await readFile(remotePath)
        const fileName = remotePath.split(/[\\/]/).pop()!
        const localPath = `${selectedWorkspace.Folder}${localSep}${fileName}`
        await writeFile(localPath, content)
      }

      if (result.conflict.length > 0) {
        setConflicts(result.conflict)
        setConflictDialogOpen(true)
      }

      onRefresh()
    } catch (err) {
      console.error('Pull failed:', err)
    } finally {
      setPulling(false)
    }
  }

  const handleOpenPush = async () => {
    if (!selectedWorkspace) return
    try {
      const files = await listDirectory(selectedWorkspace.Folder)
      const jsonFiles = files.filter(f => !f.isDirectory && f.name.endsWith('.json'))

      const workflowFiles: WorkflowFile[] = []
      for (const file of jsonFiles) {
        try {
          const content = JSON.parse(await readFile(file.path))
          workflowFiles.push({
            Path: file.path,
            Name: content.name || file.name,
            UpdatedAt: content.updatedAt || '',
            WorkflowId: content.id || '',
          })
        } catch {
          // skip invalid files
        }
      }

      workflowFiles.sort((a, b) => {
        if (!a.UpdatedAt) return 1
        if (!b.UpdatedAt) return -1
        return new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime()
      })

      setPushWorkflows(workflowFiles)
      setPushDialogOpen(true)
    } catch (err) {
      console.error('Error loading workflows for push:', err)
    }
  }

  const handlePush = async (filePaths: string[]): Promise<Record<string, number>> => {
    if (!selectedWorkspace) return {}
    return workflowService.push(
      filePaths,
      selectedWorkspace.N8nUrl,
      selectedWorkspace.N8nApiKey,
    )
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
            onClick={onRefresh}
            title="Refresh workspace"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
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
        conflicts={conflicts}
        onClose={() => setConflictDialogOpen(false)}
      />
      <PushDialog
        open={pushDialogOpen}
        workflows={pushWorkflows}
        onClose={() => setPushDialogOpen(false)}
        onPush={handlePush}
      />
    </>
  )
}

