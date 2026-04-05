import './Workspaces.css'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { workspaceService } from '@/services/workspace.service'
import type { Workspace } from '@/entities/Workspace'
import WorkspaceForm from './WorkspaceForm'
import WorkspaceList from './WorkspaceList'

type ViewMode = 'list' | 'create' | 'edit'

interface WorkspacesProps {
  onWorkspaceListChange?: (workspaces: Workspace[]) => void
}

export default function Workspaces({ onWorkspaceListChange }: WorkspacesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadWorkspaces()
  }, [refreshKey])

  const loadWorkspaces = () => {
    const all = workspaceService.getAllWorkspaces()
    setWorkspaces(all)
    onWorkspaceListChange?.(all)
  }

  const handleNew = () => {
    setSelectedWorkspace(null)
    setViewMode('create')
  }

  const handleEdit = (workspace: Workspace) => {
    setSelectedWorkspace(workspace)
    setViewMode('edit')
  }

  const handleDelete = (id: string) => {
    setPendingDeleteId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (pendingDeleteId) {
      workspaceService.deleteWorkspace(pendingDeleteId)
      setRefreshKey(prev => prev + 1)
      setDeleteDialogOpen(false)
      setPendingDeleteId(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setPendingDeleteId(null)
  }

  const handleSave = (workspace: Workspace) => {
    workspaceService.saveWorkspace(workspace)
    setViewMode('list')
    setRefreshKey(prev => prev + 1)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedWorkspace(null)
  }

  return (
    <div className="workspaces-container p-6">
      {viewMode === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Workspaces</h2>
            <Button onClick={handleNew} variant="outline">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No workspaces yet</p>
            </div>
          ) : (
            <WorkspaceList
              workspaces={workspaces}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this workspace? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(viewMode === 'create' || viewMode === 'edit') && (
        <WorkspaceForm
          workspace={selectedWorkspace}
          mode={viewMode === 'create' ? 'create' : 'edit'}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
