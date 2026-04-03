import type { Workspace } from '@/entities/Workspace'
import { Button } from '@/components/ui/button'
import { Trash2, Edit2 } from 'lucide-react'
import './WorkspaceList.css'

interface WorkspaceListProps {
  workspaces: Workspace[]
  onEdit: (workspace: Workspace) => void
  onDelete: (id: string) => void
}

export default function WorkspaceList({
  workspaces,
  onEdit,
  onDelete,
}: WorkspaceListProps) {
  return (
    <div className="workspace-list-container">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">N8n URL</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Folder</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map(workspace => (
              <tr key={workspace.Id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm">{workspace.Name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground truncate">
                  {workspace.N8nUrl}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground truncate">
                  {workspace.Folder}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(workspace)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(workspace.Id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
