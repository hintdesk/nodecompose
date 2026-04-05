import { folderService } from '@/services/folder.service'
import { n8nService } from '@/services/n8n.service'
import { readFile, writeFile, listDirectory, deleteFile, getFileHash } from '@/lib/ipc'
import { urlUtil } from '@/utils/url.util'
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
  localFiles: FileItem[],
  remoteFiles: FileItem[],
): Promise<Workflow[]> {
  const remoteByName = new Map(remoteFiles.map((f) => [f.name, f]))
  const conflicts: Workflow[] = []

  const bothFiles = localFiles.filter((f) => !f.isDirectory && remoteByName.has(f.name))

  await Promise.all(
    bothFiles.map(async (localFile) => {
      const remoteFile = remoteByName.get(localFile.name)!
      const [localHash, remoteHash] = await Promise.all([
        getFileHash(localFile.path),
        getFileHash(remoteFile.path),
      ])
      if (localHash !== remoteHash) {
        let workflowId = ''
        let name = localFile.name
        try {
          const parsed = JSON.parse(await readFile(localFile.path))
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
      }
    }),
  )

  return conflicts
}

async function download(workspace: Workspace): Promise<string> {
  const workflows = await n8nService.getWorkflows(
    workspace.N8nUrl,
    workspace.N8nApiKey,
    workspace.N8nProjectId,
  )

  const remoteFolder = await folderService.newN8nPath(workspace)

  for (const wf of workflows) {
    const safeName = String(wf.name).replace(/[/\\?%*:|"<>]/g, '_')
    const filePath = `${remoteFolder}/${safeName}.${wf.id}.json`
    await writeFile(filePath, JSON.stringify(wf, null, 2))
  }

  return remoteFolder
}

function getPushPayload(content: any): Record<string, any> {
  const allowedKeys = ['connections', 'name', 'nodes', 'settings', 'pinData', 'shared', 'staticData']
  return allowedKeys.reduce(
    (acc, key) => {
      if (key in content) {
        if (key === 'shared' && typeof content[key] === 'object' && content[key] !== null) {
          // Filter shared to only allow specific sub-keys
          const allowedSharedKeys = ['project', 'projectId', 'role', 'workflowId']
          const filteredShared = allowedSharedKeys.reduce(
            (sharedObj, subKey) => {
              if (subKey in content[key]) {
                sharedObj[subKey] = content[key][subKey]
              }
              return sharedObj
            },
            {} as Record<string, any>,
          )
          // Only include shared if it has properties
          if (Object.keys(filteredShared).length > 0) {
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
          if (value !== null && value !== undefined && !(typeof value === 'object' && Object.keys(value).length === 0)) {
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
    return this.sync(workspace.Folder, remoteFolder)
  },

  async sync(local: string, remote: string): Promise<Workflow[]> {
    const [localFiles, remoteFiles] = await Promise.all([
      listDirectory(local).catch(() => []),
      listDirectory(remote).catch(() => []),
    ])

    await pullDelete(localFiles, remoteFiles)
    await pullAdd(localFiles, remoteFiles, local)
    return getConflicts(localFiles, remoteFiles)
  },

  async push(localFiles: string[], workspace: Workspace): Promise<Workflow[]> {
    const n8nUrl = workspace.N8nUrl
    const apiKey = workspace.N8nApiKey
    const baseUrl = await urlUtil.normalizeUrl(n8nUrl)
    const result: Workflow[] = []

    for (const file of localFiles) {
      const local = JSON.parse(await readFile(file))
      const workflowId = local.id
      // Get current version from n8n
      const getResponse = await n8nService.getWorkflow(baseUrl, apiKey, workflowId)
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
      const putResponse = await n8nService.updateWorkflow(baseUrl, workflowId, payload, apiKey)

      if (putResponse.StatusCode === 200) {
        // Fetch latest version from endpoint to ensure we have the most recent data
        const getLatestResponse = await n8nService.getWorkflow(baseUrl, apiKey, workflowId)
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

    return result
  },
}
