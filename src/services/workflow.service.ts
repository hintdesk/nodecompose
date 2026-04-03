import { readFile, writeFile, listDirectory } from '@/lib/ipc'

export interface PullResult {
  download: string[]
  conflict: string[]
}

export interface PushResult {
  [workflowId: string]: number
}

export const workflowService = {
  async pull(local: string, remote: string): Promise<PullResult> {
    const [localFiles, remoteFiles] = await Promise.all([
      listDirectory(local).catch(() => []),
      listDirectory(remote).catch(() => []),
    ])

    const localJsonFiles = localFiles.filter(f => !f.isDirectory && f.name.endsWith('.json'))
    const remoteJsonFiles = remoteFiles.filter(f => !f.isDirectory && f.name.endsWith('.json'))

    // Build map of local workflows indexed by id
    const localById = new Map<string, { content: any; path: string }>()
    await Promise.all(
      localJsonFiles.map(async file => {
        try {
          const content = JSON.parse(await readFile(file.path))
          if (content.id) {
            localById.set(content.id, { content, path: file.path })
          }
        } catch {
          // skip invalid files
        }
      }),
    )

    const download: string[] = []
    const conflict: string[] = []

    await Promise.all(
      remoteJsonFiles.map(async file => {
        try {
          const content = JSON.parse(await readFile(file.path))
          const remoteId = content.id
          if (!remoteId) return

          const localEntry = localById.get(remoteId)
          if (!localEntry) {
            // Not in local → download
            download.push(file.path)
          } else if (localEntry.content.versionId !== content.versionId) {
            // Different versionId → conflict
            conflict.push(file.path)
          }
          // Same versionId → already in sync, skip
        } catch {
          // skip invalid files
        }
      }),
    )

    return { download, conflict }
  },

  async push(filePaths: string[], n8nUrl: string, apiKey: string): Promise<PushResult> {
    const baseUrl = n8nUrl.endsWith('/') ? n8nUrl.slice(0, -1) : n8nUrl
    const result: PushResult = {}

    for (const filePath of filePaths) {
      let content: any
      try {
        content = JSON.parse(await readFile(filePath))
      } catch {
        continue
      }

      const workflowId = content.id
      if (!workflowId) continue

      // Get current version from n8n
      const getResponse = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': apiKey },
      })

      if (!getResponse.ok) {
        result[workflowId] = getResponse.status
        continue
      }

      const current = await getResponse.json()

      if (current.updatedAt !== content.updatedAt) {
        // Server has newer version — do not push
        result[workflowId] = 304
        continue
      }

      // Safe to push
      const putResponse = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      })

      result[workflowId] = putResponse.status

      if (putResponse.status === 200) {
        const updated = await putResponse.json()
        await writeFile(filePath, JSON.stringify(updated, null, 2))
      }
    }

    return result
  },
}
