import './FileTreeView.css'
import { cn } from '@/lib/utils'
import { File } from 'lucide-react'
import { listDirectory } from '@/lib/ipc'
import { useState, useEffect } from 'react'
import type { FileItem } from '@/entities/FileItem'

interface FileNode extends FileItem {
  children?: FileNode[]
}

interface FileTreeViewProps {
  workspacePath: string
  onFileSelect: (filePath: string) => void
  selectedFile: string | null
  reloadTrigger?: number
}

export default function FileTreeView({
  workspacePath,
  onFileSelect,
  selectedFile,
  reloadTrigger = 0,
}: FileTreeViewProps) {
  const [root, setRoot] = useState<FileNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFileTree()
  }, [workspacePath, reloadTrigger])

  const loadFileTree = async () => {
    try {
      setLoading(true)
      setError(null)

      const tree: FileNode = {
        name: workspacePath.split('\\').pop() || workspacePath.split('/').pop() || 'workspace',
        path: workspacePath,
        isDirectory: true,
        children: [],
      }

      // Load root level children - only .json files
      try {
        const children = await listDirectory(workspacePath)
        // Filter to only include .json files at the first level
        tree.children = children.filter(child => !child.isDirectory && child.name.endsWith('.json')) as FileNode[]
      } catch (err) {
        console.error('Error loading root directory:', err)
        setError('Could not load directory')
      }

      setRoot(tree)
    } catch (error) {
      console.error('Error loading file tree:', error)
      setError('Failed to load file tree')
    } finally {
      setLoading(false)
    }
  }

  const TreeNode = ({ node }: { node: FileNode }) => {
    const isSelected = node.path === selectedFile

    return (
      <div key={node.path} className="select-none">
        <div
          className={cn(
            'flex items-center px-2 py-1 cursor-pointer hover:bg-accent rounded',
            isSelected && 'bg-accent text-accent-foreground font-semibold'
          )}
          onClick={() => {
            onFileSelect(node.path)

          }}
        >
          <File className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-destructive p-4 text-center">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!root) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No files
      </div>
    )
  }

  return (
    <div className="file-tree-view border-r overflow-auto h-full">
      {root.children && root.children.length > 0 ? (
        root.children.map(child => (
          <TreeNode key={child.path} node={child} />
        ))
      ) : (
        <div className="p-2 text-sm text-muted-foreground">No files</div>
      )}
    </div>
  )
}
