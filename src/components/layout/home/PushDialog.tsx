import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/app.store'
import { useState, useMemo } from 'react'
import { workflowService } from '@/services/workflow.service'
import type { Workflow } from '@/entities/Workflow'


interface PushDialogProps {
  open: boolean
  workflows: Workflow[]
  onClose: () => void
}

export default function PushDialog({ open, workflows, onClose }: PushDialogProps) {
  const selectedWorkspace = useAppStore(state => state.selectedWorkspace)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pushing, setPushing] = useState(false)
  const [results, setResults] = useState<Workflow[]>([])

  const filtered = useMemo(
    () => workflows.filter(wf => wf.Name?.toLowerCase().includes(search.toLowerCase())),
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
      setSelected(new Set(filtered.map(wf => wf.LocalPath!)))
    }
  }

  const handlePush = async () => {
    const filePaths = Array.from(selected)
    if (filePaths.length === 0 || !selectedWorkspace) return
    setPushing(true)
    try {
      const res = await workflowService.push(filePaths, selectedWorkspace)
      setResults(res)
    } finally {
      setPushing(false)
    }
  }

  const handleClose = () => {
    setSearch('')
    setSelected(new Set())
    setResults([])
    onClose()
  }

  const getStatus = (wf: Workflow): 'success' | 'conflict' | 'error' | null => {
    const result = results.find(r => r.Id === wf.Id)
    if (!result) return null

    const code = result.StatusCode
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(wf => {
                  const status = getStatus(wf)
                  return (
                    <TableRow key={wf.Id!}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(wf.LocalPath!)}
                          onCheckedChange={() => toggleSelect(wf.LocalPath!)}
                        />
                      </TableCell>
                      <TableCell>{wf.Name}</TableCell>
                      <TableCell>
                        {wf.ModifiedAt ? wf.ModifiedAt.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        {status === 'success' && (
                          <CheckCircle2 className="inline-block h-4 w-4 text-green-500" />
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
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No workflows found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handlePush} disabled={pushing || selected.size === 0 || !selectedWorkspace}>
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
