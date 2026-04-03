import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export interface WorkflowFile {
  Path: string
  Name: string
  UpdatedAt: string
  WorkflowId: string
}

interface PushDialogProps {
  open: boolean
  workflows: WorkflowFile[]
  onClose: () => void
  onPush: (filePaths: string[]) => Promise<Record<string, number>>
}

export default function PushDialog({ open, workflows, onClose, onPush }: PushDialogProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pushing, setPushing] = useState(false)
  const [results, setResults] = useState<Record<string, number>>({})

  const filtered = useMemo(
    () => workflows.filter(wf => wf.Name.toLowerCase().includes(search.toLowerCase())),
    [workflows, search],
  )

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(wf => wf.Path)))
    }
  }

  const handlePush = async () => {
    const filePaths = Array.from(selected)
    if (filePaths.length === 0) return
    setPushing(true)
    try {
      const res = await onPush(filePaths)
      setResults(res)
    } finally {
      setPushing(false)
    }
  }

  const handleClose = () => {
    setSearch('')
    setSelected(new Set())
    setResults({})
    onClose()
  }

  const getStatus = (wf: WorkflowFile): 'success' | 'conflict' | 'error' | null => {
    if (!(wf.WorkflowId in results)) return null
    const code = results[wf.WorkflowId]
    if (code === 200) return 'success'
    if (code === 304) return 'conflict'
    return 'error'
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Push Workflows</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />

          <div className="max-h-80 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left w-8">
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Updated</th>
                  <th className="px-4 py-2 text-center font-semibold w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(wf => {
                  const status = getStatus(wf)
                  return (
                    <tr key={wf.Path} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={selected.has(wf.Path)}
                          onCheckedChange={() => toggleSelect(wf.Path)}
                        />
                      </td>
                      <td className="px-4 py-2">{wf.Name}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {wf.UpdatedAt ? new Date(wf.UpdatedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
                        )}
                        {(status === 'conflict' || status === 'error') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block cursor-default">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {status === 'conflict'
                                ? 'The workflow in server has newer version'
                                : 'Failed to push workflow'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No workflows found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handlePush} disabled={pushing || selected.size === 0}>
              {pushing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pushing...
                </>
              ) : (
                `Push (${selected.size})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
