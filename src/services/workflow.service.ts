import { folderService } from '@/services/folder.service'
import { n8nService } from '@/services/n8n.service'
import {
  readFile,
  writeFile,
  listDirectory,
  deleteFile,
  gitReadHeadFile,
  gitCommitAll,
  gitIsRepo,
} from '@/lib/ipc'
import type { FileItem } from '@/entities/FileItem'
import type { Workflow } from '@/entities/Workflow'
import type { Workspace } from '@/entities/Workspace'

async function pullDelete(localFiles: FileItem[], remoteFiles: FileItem[]): Promise<void> {
  const remoteNames = new Set(remoteFiles.map((f) => f.name))
  const toDelete = localFiles.filter((f) => !f.isDirectory && !remoteNames.has(f.name))
  await Promise.all(toDelete.map((f) => deleteFile(f.path).catch(() => { })))
}

async function pullAdd(localFiles: FileItem[], remoteFiles: FileItem[], local: string): Promise<void> {
  const localNames = new Set(localFiles.map((f) => f.name))
  const toAdd = remoteFiles.filter((f) => !f.isDirectory && !localNames.has(f.name))
  await Promise.all(
    toAdd.map(async (f) => {
      const content = await readFile(f.path)
      await writeFile(`${local}/${f.name}`, content)
    }),
  )
}

async function getConflicts(
  localRoot: string,
  localFiles: FileItem[],
  remoteFiles: FileItem[],
): Promise<Workflow[]> {
  const remoteByName = new Map(remoteFiles.map((f) => [f.name, f]))
  const conflicts: Workflow[] = []

  const bothFiles = localFiles.filter((f) => !f.isDirectory && remoteByName.has(f.name))

  await Promise.all(
    bothFiles.map(async (localFile) => {
      const remoteFile = remoteByName.get(localFile.name)!
      const [localContent, remoteContent] = await Promise.all([
        readFile(localFile.path),
        readFile(remoteFile.path),
      ])

      if (localContent === remoteContent) {
        return
      }

      const headContent = await gitReadHeadFile(localRoot, localFile.path)
      if (headContent === null) {
        let workflowId = ''
        let name = localFile.name
        try {
          const parsed = JSON.parse(localContent)
          workflowId = parsed.id ?? ''
          name = parsed.name ?? localFile.name
        } catch {
          // keep defaults
        }
        conflicts.push({
          Id: workflowId,
          Name: name,
          LocalPath: localFile.path,
          RemotePath: remoteFile.path,
        })
        return
      }

      if (headContent === localContent && headContent !== remoteContent) {
        await writeFile(localFile.path, remoteContent)
        return
      }

      if (headContent === remoteContent && headContent !== localContent) {
        return
      }

      let workflowId = ''
      let name = localFile.name
      try {
        const parsed = JSON.parse(localContent)
        workflowId = parsed.id ?? ''
        name = parsed.name ?? localFile.name
      } catch {
        // keep defaults
      }
      conflicts.push({
        Id: workflowId,
        Name: name,
        LocalPath: localFile.path,
        RemotePath: remoteFile.path,
      })
    }),
  )

  return conflicts
}

async function download(workspace: Workspace): Promise<string> {
  // Read metadata of all workflows
  const workflows = await n8nService.getWorkflowMetadata(workspace)

  var remoteFolder = await folderService.removeDeleted(workspace, workflows)

  const fullWorkflows = await n8nService.getWorkflows(workspace,workflows )

  for (const wf of fullWorkflows) {
    const fileName = folderService.getWorkflowFileName({
      Id: wf.id,
      Name: wf.name,
    } as Workflow);

    if (fileName) {
      const filePath = `${remoteFolder}/${fileName}`
      await writeFile(filePath, JSON.stringify(wf, null, 2))
    }
  }

  return remoteFolder
}

function getPushPayload(content: any): Record<string, any> {
  // const allowedKeys = ['connections', 'name', 'nodes', 'settings', 'pinData', 'shared', 'staticData']
  const allowedKeys = ['connections', 'name', 'nodes', 'settings']
  return allowedKeys.reduce(
    (acc, key) => {
      if (key in content) {
        if (key === 'shared' && Array.isArray(content[key])) {
          // Filter each shared item to only allow specific sub-keys
          const allowedSharedKeys = ['project', 'projectId', 'role', 'workflowId']
          const filteredShared = content[key]
            .filter((item: unknown) => typeof item === 'object' && item !== null)
            .map((item: Record<string, any>) => {
              const filteredItem = allowedSharedKeys.reduce(
                (sharedObj, subKey) => {
                  if (subKey in item) {
                    if (subKey === 'project' && typeof item.project === 'object' && item.project !== null) {
                      const projectName = item.project.name
                      if (projectName !== undefined && projectName !== null) {
                        sharedObj.project = { name: projectName }
                      }
                    } else {
                      sharedObj[subKey] = item[subKey]
                    }
                  }
                  return sharedObj
                },
                {} as Record<string, any>,
              )

              return filteredItem
            })
            .filter((item: Record<string, any>) => Object.keys(item).length > 0)

          if (filteredShared.length > 0) {
            acc[key] = filteredShared
          }
        } else if (key === 'settings' && typeof content[key] === 'object' && content[key] !== null) {
          // Filter settings to only allow specific sub-keys
          const allowedSettingsKeys = [
            'availableInMCP',
            'callerIds',
            'callerPolicy',
            'errorWorkflow',
            'executionOrder',
            'executionTimeout',
            'saveDataErrorExecution',
            'saveDataSuccessExecution',
            'saveExecutionProgress',
            'saveManualExecutions',
            'timeSavedPerExecution',
            'timezone',
          ]
          const filteredSettings = allowedSettingsKeys.reduce(
            (settingsObj, subKey) => {
              if (subKey in content[key]) {
                settingsObj[subKey] = content[key][subKey]
              }
              return settingsObj
            },
            {} as Record<string, any>,
          )
          // Only include settings if it has properties
          if (Object.keys(filteredSettings).length > 0) {
            acc[key] = filteredSettings
          }
        } else {
          // For other keys, only include if not null and not empty object
          const value = content[key]
          if (value !== null && value !== undefined) {
            acc[key] = value
          }
        }
      }
      return acc
    },
    {} as Record<string, any>,
  )
}

export const workflowService = {
  async pull(workspace: Workspace): Promise<Workflow[]> {
    const remoteFolder = await download(workspace)
    const conflicts = await this.sync(workspace.Folder, remoteFolder)
    if (conflicts.length === 0) {
      n8nService.setLastPullDate(workspace)
      try {
        const isRepo = await gitIsRepo(workspace.Folder)
        if (isRepo) {
          await gitCommitAll(workspace.Folder, 'Auto-commit: pull without conflicts')
        }
      } catch {
        // Non-blocking: pull is already completed.
      }
    }
    return conflicts
  },

  async sync(local: string, remote: string): Promise<Workflow[]> {
    const [localFiles, remoteFiles] = await Promise.all([
      listDirectory(local).catch(() => []),
      listDirectory(remote).catch(() => []),
    ])

    await pullDelete(localFiles, remoteFiles)
    await pullAdd(localFiles, remoteFiles, local)
    return getConflicts(local, localFiles, remoteFiles)
  },

  async push(localFiles: string[], workspace: Workspace): Promise<Workflow[]> {
    const result: Workflow[] = []

    for (const file of localFiles) {
      const local = JSON.parse(await readFile(file))
      const workflowId = local.id
      // Get current version from n8n
      const getResponse = await n8nService.getWorkflow(workspace, workflowId)
      const remote = getResponse.Source
      if (remote.updatedAt !== local.updatedAt) {
        // Server has newer version — do not push
        result.push({
          Id: workflowId,
          StatusCode: 304,
          LocalPath: file
        })
        continue
      }

      // Safe to push - filter payload to only allowed properties
      const payload = getPushPayload(local)
      const putResponse = await n8nService.updateWorkflow(workspace, workflowId, payload)

      if (putResponse.StatusCode === 200) {
        // Fetch latest version from endpoint to ensure we have the most recent data
        const getLatestResponse = await n8nService.getWorkflow(workspace, workflowId)
        const latest = getLatestResponse.Source
        await writeFile(file, JSON.stringify(latest, null, 2))
        result.push({
          Id: workflowId,
          StatusCode: 200,
          LocalPath: file
        })

      } else {
        result.push({
          Id: workflowId,
          StatusCode: putResponse.StatusCode,
          LocalPath: file
        })
      }
    }

    const hasSuccessfulPush = result.some((item) => item.StatusCode === 200)
    if (hasSuccessfulPush) {
      try {
        const isRepo = await gitIsRepo(workspace.Folder)
        if (isRepo) {
          await gitCommitAll(workspace.Folder, 'Auto-commit: push successful')
        }
      } catch {
        // Non-blocking: push is already completed.
      }
    }

    return result
  },
}
