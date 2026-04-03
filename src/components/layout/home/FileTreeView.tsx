import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { listDirectory, type FileItem } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import './FileTreeView.css'

interface FileNode extends FileItem {
  children?: FileNode[]
}

interface FileTreeViewProps {
  workspacePath: string
  onFileSelect: (filePath: string) => void
  selectedFile: string | null
}

export default function FileTreeView({
  workspacePath,
  onFileSelect,
  selectedFile,
}: FileTreeViewProps) {
  const [root, setRoot] = useState<FileNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFileTree()
  }, [workspacePath])

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
      
      // Load root level children
      try {
        const children = await listDirectory(workspacePath)
        tree.children = children as FileNode[]
      } catch (err) {
        console.error('Error loading root directory:', err)
        setError('Could not load directory')
      }
      
      setRoot(tree)
      setExpanded(new Set([workspacePath]))
    } catch (error) {
      console.error('Error loading file tree:', error)
      setError('Failed to load file tree')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
      loadDirectoryChildren(path)
    }
    setExpanded(newExpanded)
  }

  const loadDirectoryChildren = async (dirPath: string) => {
    try {
      const children = await listDirectory(dirPath)
      // Update the tree with loaded children
      updateNodeChildren(root, dirPath, children as FileNode[])
    } catch (err) {
      console.error('Error loading directory:', err)
    }
  }

  const updateNodeChildren = (
    node: FileNode | undefined | null,
    targetPath: string,
    children: FileNode[]
  ): boolean => {
    if (!node) return false
    
    if (node.path === targetPath) {
      node.children = children
      setRoot({ ...root! })
      return true
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (updateNodeChildren(child, targetPath, children)) {
          return true
        }
      }
    }
    
    return false
  }

  const TreeNode = ({ node, depth }: { node: FileNode; depth: number }) => {
    const isExpanded = expanded.has(node.path)
    const isSelected = node.path === selectedFile

    return (
      <div key={node.path} className="select-none">
        <div
          className={cn(
            'flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded',
            isSelected && 'bg-accent text-accent-foreground font-semibold'
          )}
          style={{ paddingLeft: `${(depth + 1) * 16}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleExpanded(node.path)
            } else {
              onFileSelect(node.path)
            }
          }}
        >
          {node.isDirectory && (
            <span className="mr-1 flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          {!node.isDirectory && <span className="mr-1 flex-shrink-0 w-4" />}

          {node.isDirectory ? (
            <Folder className="h-4 w-4 mr-2 flex-shrink-0" />
          ) : (
            <File className="h-4 w-4 mr-2 flex-shrink-0" />
          )}

          <span className="truncate">{node.name}</span>
        </div>

        {node.isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
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
          <TreeNode key={child.path} node={child} depth={0} />
        ))
      ) : (
        <div className="p-2 text-sm text-muted-foreground">No files</div>
      )}
    </div>
  )
}
