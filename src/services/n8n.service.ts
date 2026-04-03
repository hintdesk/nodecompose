import type { N8nProject } from '@/entities/N8nProject'

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export const n8nService = {
  async getProjects(n8nUrl: string, apiKey: string): Promise<N8nProject[]> {
    const baseUrl = normalizeUrl(n8nUrl)
    const response = await fetch(`${baseUrl}/api/v1/projects`, {
      headers: { 'X-N8N-API-KEY': apiKey },
    })

    if (response.status === 403) {
      return [{ Id: 'default', Name: 'Default' }]
    }

    if (response.status !== 200) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`)
    }

    const data = await response.json()

    return (data.data || []).map((p: any) => ({ Id: p.id, Name: p.name }))
  },

  async getWorkflows(n8nUrl: string, apiKey: string, projectId: string): Promise<any[]> {
    const baseUrl = normalizeUrl(n8nUrl)
    const allWorkflows: any[] = []
    let cursor: string | null = null

    do {
      const url = new URL(`${baseUrl}/api/v1/workflows`)
      if (projectId !== 'default') {
        url.searchParams.set('projectId', projectId)
      }
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: { 'X-N8N-API-KEY': apiKey },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`)
      }

      const data = await response.json()
      allWorkflows.push(...(data.data || []))
      cursor = data.nextCursor || null
    } while (cursor)

    return allWorkflows
  },
}
