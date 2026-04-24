import { getTmpDir, createDirectory, fileExists, removeDirectory, getFileHash as getFileHashIpc } from '@/lib/ipc'
import type { FileItem } from '@/entities/FileItem'
import type { Workflow } from '@/entities/Workflow'
import type { Workspace } from '@/entities/Workspace'



export const folderService = {
  /**
   * Get path to n8n temporary folder for a workspace
   * Returns: {tmpdir}/NodeCompose/{projectId}
   */
  async getN8nPath(workspace: Workspace): Promise<string> {
    const tmpdir = await getTmpDir()
    const folderPath = `${tmpdir}/NodeCompose/${workspace.Id}/${workspace.N8nProjectId}`;

    // Create folder if it doesn't exist
    if (!(await fileExists(folderPath))) {
      await createDirectory(folderPath)
    }

    return folderPath
  },
  
  async removeDeleted(workspace: Workspace): Promise<string> {
    const folderPath = await this.getN8nPath(workspace)
    await removeDirectory(folderPath).catch(() => { })
    await createDirectory(folderPath)
    return folderPath;
  },

  /**
   * Calculate SHA-256 hash of a file
   */
  async getFileHash(fileItem: FileItem): Promise<string> {
    return await getFileHashIpc(fileItem.path)
  },

  getWorkflowFileName(workflow: Workflow): string | null {
    if (!workflow.Id || !workflow.Name) {
      return null
    }
    const safeName = workflow.Name.replace(/[/\\?%*:|"<>]/g, '_')
    return `${safeName}.${workflow.Id}.json`
  }
}
