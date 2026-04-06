import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DiffEditor } from '@monaco-editor/react'
import { getFontConfig } from '@/utils/font.util'

interface DiffDialogProps {
  open: boolean
  title: string
  localContent: string
  remoteContent: string
  onOpenChange: (open: boolean) => void
}

export default function DiffDialog({
  open,
  title,
  localContent,
  remoteContent,
  onOpenChange,
}: DiffDialogProps) {
  const { FontFamily, FontSize } = getFontConfig()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Diff: {title}</DialogTitle>
          <DialogDescription>Compare local workflow and n8n workflow content.</DialogDescription>
        </DialogHeader>

        <div className="h-[65vh] min-h-[420px] overflow-hidden rounded-md border">
          <DiffEditor
            height="100%"
            language="json"
            original={localContent}
            modified={remoteContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              fontFamily: FontFamily,
              fontSize: FontSize,
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}