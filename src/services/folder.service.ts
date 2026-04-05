import { getTmpDir, removeDirectory, createDirectory, getFileHash as getFileHashIpc } from '@/lib/ipc'
import type { FileItem } from '@/entities/FileItem'
import type { Workspace } from '@/entities/Workspace'

export const folderService = {
  /**
   * Get path to n8n temporary folder for a workspace
   * Returns: {tmpdir}/NodeCompose/{projectId}
   */
  async getN8nPath(workspace: Workspace): Promise<string> {
    const tmpdir = await getTmpDir()
    return `${tmpdir}/NodeCompose/${workspace.N8nProjectId}`
  },

  /**
   * Create a fresh n8n folder for a workspace
   * If folder exists, delete it recursively first, then create new
   */
  async newN8nPath(workspace: Workspace): Promise<string> {
    const folderPath = await this.getN8nPath(workspace)

    // Delete folder recursively if it exists
    try {
      await removeDirectory(folderPath)
    } catch (error) {
      console.warn(`Failed to remove ${folderPath}:`, error)
    }

    // Create the folder fresh
    await createDirectory(folderPath)

    return folderPath
  },

  /**
   * Calculate SHA-256 hash of a file
   */
  async getFileHash(fileItem: FileItem): Promise<string> {
    return await getFileHashIpc(fileItem.path)
  },
}
