import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConflictDialogProps {
  open: boolean
  conflicts: string[]
  onClose: () => void
}

export default function ConflictDialog({ open, conflicts, onClose }: ConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Workflow Conflicts
          </DialogTitle>
          <DialogDescription>
            The following workflows have conflicting versions between local and remote. Please
            resolve them manually.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {conflicts.map((filePath, i) => {
            const fileName = filePath.split(/[\\/]/).pop() || filePath
            return (
              <div
                key={i}
                className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-sm font-mono text-yellow-800 dark:text-yellow-200"
              >
                {fileName}
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
