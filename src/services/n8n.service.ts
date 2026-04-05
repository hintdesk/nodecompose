import { urlUtil } from '@/utils/url.util'
import type { N8nProject } from '@/entities/N8nProject'
import type { Workflow } from '@/entities/Workflow';

export const n8nService = {
  async getProjects(n8nUrl: string, apiKey: string): Promise<N8nProject[]> {
    const baseUrl = await urlUtil.normalizeUrl(n8nUrl)
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
    const baseUrl = await urlUtil.normalizeUrl(n8nUrl)
    const workflowIds: string[] = []
    let cursor: string | null = null

    // First, fetch all workflow IDs using pagination
    do {
      const url = new URL(`${baseUrl}/api/v1/workflows?excludePinnedData=true`)
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

      // Extract only workflow IDs from the list
      const ids = (data.data || []).map((w: any) => w.id)
      workflowIds.push(...ids)

      cursor = data.nextCursor || null
    } while (cursor)

    // Then, fetch the full content of each workflow individually
    const allWorkflows: any[] = []
    for (const workflowId of workflowIds) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        })

        if (response.ok) {
          const workflow = await response.json()
          allWorkflows.push(workflow)
        }
      } catch (error) {
        console.warn(`Failed to fetch workflow ${workflowId}:`, error)
        // Continue with next workflow
      }
    }

    return allWorkflows
  },

  async getWorkflow(n8nUrl: string, apiKey: string, workflowId: string): Promise<Workflow> {
    const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      headers: { 'X-N8N-API-KEY': apiKey },
    });

    return {
      StatusCode: response.status,
      Source: response.ok ? await response.json() : null,
    };
  },

  async updateWorkflow(
    baseUrl: string,
    workflowId: string,
    payload: any,
    apiKey: string,
  ): Promise<Workflow> {
    const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return {
      StatusCode: response.status,
      Source: await response.json(),
    };
  }
}
