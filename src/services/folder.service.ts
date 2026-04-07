import { getTmpDir, createDirectory, fileExists, listDirectory, deleteFile, getFileHash as getFileHashIpc } from '@/lib/ipc'
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
  
  async removeDeleted(workspace: Workspace, workflows: Workflow[]): Promise<string> {
    const folderPath = await this.getN8nPath(workspace)
    const expectedFileNames = new Set(
      workflows
        .map((workflow) => this.getWorkflowFileName(workflow))
        .filter((fileName): fileName is string => !!fileName),
    )

    const files = await listDirectory(folderPath).catch(() => [])
    const toDelete = files.filter((file) => !file.isDirectory && !expectedFileNames.has(file.name))

    await Promise.all(toDelete.map((file) => deleteFile(file.path).catch(() => { })))
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
