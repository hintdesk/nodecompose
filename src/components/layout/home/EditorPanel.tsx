import './EditorPanel.css'
import { Button } from '@/components/ui/button'
import {
  readFile,
  writeFile,
  watchFile,
  unwatchFile,
  onFileChanged,
  removeFileChangedListeners,
} from '@/lib/ipc'
import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { getFontConfig } from '@/utils/font.util'

interface EditorPanelProps {
  filePath: string | null
  onContentChange: (content: string) => void
  reloadTrigger?: number
}

export default function EditorPanel({
  filePath,
  onContentChange,
  reloadTrigger,
}: EditorPanelProps) {
  const { FontFamily, FontSize } = getFontConfig()
  const [content, setContent] = useState<string>('')
  const [language, setLanguage] = useState<string>('plaintext')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!filePath) {
      setContent('')
      setLoading(false)
      setError(null)
      setIsDirty(false)
      return
    }

    loadFile()
  }, [filePath, reloadTrigger])

  useEffect(() => {
    if (!filePath) return

    let reloadTimeout: ReturnType<typeof setTimeout> | null = null

    const startWatch = async () => {
      try {
        await watchFile(filePath)
      } catch (err) {
        console.error('Failed to watch file:', err)
      }
    }

    startWatch()

    onFileChanged((payload) => {
      if (payload.filePath !== filePath || payload.eventType === 'error') {
        return
      }

      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }

      // Debounce external file system events fired in bursts.
      reloadTimeout = setTimeout(() => {
        loadFile()
      }, 120)
    })

    return () => {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }
      removeFileChangedListeners()
      unwatchFile(filePath).catch(() => {
        // No-op: watcher may already be disposed.
      })
    }
  }, [filePath, reloadTrigger])

  const loadFile = async () => {
    try {
      setLoading(true)
      setError(null)
      const fileContent = await readFile(filePath!)
      setContent(fileContent)
      setIsDirty(false)
      
      // Determine language based on file extension
      const ext = filePath!.split('.').pop()?.toLowerCase()
      switch (ext) {
        case 'json':
          setLanguage('json')
          break
        case 'ts':
          setLanguage('typescript')
          break
        case 'tsx':
          setLanguage('typescript')
          break
        case 'js':
          setLanguage('javascript')
          break
        case 'jsx':
          setLanguage('javascript')
          break
        case 'yml':
        case 'yaml':
          setLanguage('yaml')
          break
        case 'md':
          setLanguage('markdown')
          break
        case 'html':
          setLanguage('html')
          break
        case 'css':
          setLanguage('css')
          break
        default:
          setLanguage('plaintext')
      }
    } catch (err) {
      console.error('Error loading file:', err)
      setError(`Failed to load file: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value)
      setIsDirty(true)
      onContentChange(value)
    }
  }

  const handleSave = async () => {
    if (!filePath) return
    try {
      setError(null)
      await writeFile(filePath, content)
      setIsDirty(false)
    } catch (err) {
      console.error('Error saving file:', err)
      setError(`Failed to save file: ${(err as Error).message}`)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content, filePath])

  if (!filePath) {
    return (
      <div
        className="editor-panel flex items-center justify-center"
        style={{ fontFamily: FontFamily, fontSize: `${FontSize}px` }}
      >
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a file to view and edit</p>
        </div>
      </div>
    )
  }

  const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'Untitled'

  return (
    <div
      className="editor-panel flex flex-col"
      style={{ fontFamily: FontFamily, fontSize: `${FontSize}px` }}
    >
      <div className="border-b px-4 py-2 font-semibold flex items-center justify-between">
        <div>
          <span>{fileName}</span>
          {isDirty && <span className="ml-2 text-yellow-500">●</span>}
        </div>
        {isDirty && (
          <Button
            onClick={handleSave}
            size="sm"
            variant="outline"
          >
            Save (Ctrl+S)
          </Button>
        )}
      </div>
      
      {error && (
        <div className="border-b px-4 py-2 text-sm text-destructive bg-destructive/10">
          {error}
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontFamily: FontFamily,
              fontSize: FontSize,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
