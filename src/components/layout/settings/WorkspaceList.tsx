import './WorkspaceList.css'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, Edit2 } from 'lucide-react'
import type { Workspace } from '@/entities/Workspace'

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
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-6 py-3 text-sm font-semibold">Name</TableHead>
              <TableHead className="px-6 py-3 text-sm font-semibold">N8n URL</TableHead>
              <TableHead className="px-6 py-3 text-sm font-semibold">Folder</TableHead>
              <TableHead className="px-6 py-3 text-right text-sm font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.map(workspace => (
              <TableRow key={workspace.Id}>
                <TableCell className="px-6 py-4 text-sm">{workspace.Name}</TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground truncate">
                  {workspace.N8nUrl}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground truncate">
                  {workspace.Folder}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
