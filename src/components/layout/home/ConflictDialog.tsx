import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { readFile, writeFile } from '@/lib/ipc'
import { AlertTriangle } from 'lucide-react'
import type { Workflow } from '@/entities/Workflow'
import DiffDialog from './DiffDialog'

interface ConflictDialogProps {
  open: boolean
  conflicts: Workflow[]
  onClose: () => void
}

export default function ConflictDialog({ open, conflicts, onClose }: ConflictDialogProps) {
  const [resolved, setResolved] = useState<Record<string, boolean>>({})
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffTitle, setDiffTitle] = useState('')
  const [localDiff, setLocalDiff] = useState('')
  const [remoteDiff, setRemoteDiff] = useState('')
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const allResolved = useMemo(
    () => conflicts.length > 0 && conflicts.every((c) => resolved[c.Id!]),
    [conflicts, resolved],
  )

  const handleClose = () => {
    setResolved({})
    setDiffOpen(false)
    setDiffTitle('')
    setLocalDiff('')
    setRemoteDiff('')
    setLoadingKey(null)
    onClose()
  }

  const handleKeepLocal = (item: Workflow) => {
    setResolved((prev) => ({ ...prev, [item.Id!]: true }))
  }

  const handleUseN8n = async (item: Workflow) => {
    const key = `${item.Id}:remote`
    setLoadingKey(key)
    try {
      const remoteContent = await readFile(item.RemotePath!)
      await writeFile(item.LocalPath!, remoteContent)
      setResolved((prev) => ({ ...prev, [item.Id!]: true }))
    } catch (error) {
      console.error('Failed to apply remote workflow:', error)
    } finally {
      setLoadingKey(null)
    }
  }

  const handleShowDiff = async (item: Workflow) => {
    const key = `${item.Id}:diff`
    setLoadingKey(key)
    try {
      const [localContent, remoteContent] = await Promise.all([
        readFile(item.LocalPath!),
        readFile(item.RemotePath!),
      ])
      setDiffTitle(item.Name!)
      setLocalDiff(localContent)
      setRemoteDiff(remoteContent)
      setDiffOpen(true)
    } catch (error) {
      console.error('Failed to load workflow diff:', error)
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose()
        }
      }}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Workflow Conflicts
            </DialogTitle>
            <DialogDescription>
              Choose one action per workflow conflict. Resolved rows are marked green.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Keep Local</TableHead>
                  <TableHead>Use n8n</TableHead>
                  <TableHead>Show Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((item) => {
                  const isResolved = !!resolved[item.Id!]
                  const remoteKey = `${item.Id!}:remote`
                  const diffKey = `${item.Id!}:diff`

                  return (
                    <TableRow key={item.Id!}>
                      <TableCell className={`${isResolved ? 'font-semibold text-green-600' : ''}`}>
                        {item.Id!}
                      </TableCell>
                      <TableCell className={`${isResolved ? 'font-semibold text-green-600' : ''}`}>
                        {item.Name}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleKeepLocal(item)}
                          disabled={isResolved || loadingKey !== null}
                        >
                          Keep Local
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseN8n(item)}
                          disabled={isResolved || loadingKey !== null}
                        >
                          {loadingKey === remoteKey ? 'Applying...' : 'Use n8n'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDiff(item)}
                          disabled={isResolved || loadingKey !== null}
                        >
                          {loadingKey === diffKey ? 'Loading...' : 'Show Diff'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {conflicts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No conflicts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>{allResolved ? 'Done' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiffDialog
        open={diffOpen}
        title={diffTitle}
        localContent={localDiff}
        remoteContent={remoteDiff}
        onOpenChange={setDiffOpen}
      />
    </>
  )
}
