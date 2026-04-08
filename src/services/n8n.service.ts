import { urlUtil } from '@/utils/url.util'
import type { N8nProject } from '@/entities/N8nProject'
import type { Workflow } from '@/entities/Workflow'
import type { Workspace } from '@/entities/Workspace'

function getLastPullStorageKey(workspace: Workspace): string {
  return `n8n:lastPull:${workspace.Id}:${workspace.N8nProjectId}`
}

export const n8nService = {
  setLastPullDate(workspace: Workspace): void {
    localStorage.setItem(getLastPullStorageKey(workspace), new Date().toISOString())
  },

  getLastPullDate(workspace: Workspace): Date | null {
    const value = localStorage.getItem(getLastPullStorageKey(workspace))
    if (!value) {
      return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  },

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

  async getWorkflowMetadata(workspace: Workspace): Promise<Workflow[]> {
    const baseUrl = await urlUtil.normalizeUrl(workspace.N8nUrl)
    const workflows: Workflow[] = []
    let cursor: string | null = null

    // First, fetch all workflow IDs using pagination
    do {
      const url = new URL(`${baseUrl}/api/v1/workflows?excludePinnedData=true`)
      if (workspace.N8nProjectId !== 'default') {
        url.searchParams.set('projectId', workspace.N8nProjectId)
      }
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: { 'X-N8N-API-KEY': workspace.N8nApiKey },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`)
      }

      const data = await response.json()

      const wks = (data.data || []).map((w: any) => ({
        Id: w.id,
        Name: w.name,
        UpdatedAt: w.updatedAt ? new Date(w.updatedAt) : undefined,
      }))
      workflows.push(...wks)

      cursor = data.nextCursor || null
    } while (cursor)

    return workflows
  },

  async getWorkflows(
    workspace: Workspace,
    workflows: Workflow[]

  ): Promise<any[]> {
    const baseUrl = await urlUtil.normalizeUrl(workspace.N8nUrl)
    const lastPullDate = this.getLastPullDate(workspace);
    console.log('Last pull date:', lastPullDate)

    const filteredWorkflows = workflows.filter((workflow) => {
      if (!lastPullDate) {
        return true
      }
      if (!workflow.UpdatedAt) {
        return false
      }
      return workflow.UpdatedAt > lastPullDate
    })

    const workflowIds = filteredWorkflows
      .map((workflow) => workflow.Id)
      .filter((id): id is string => !!id)

    const allWorkflows: any[] = []
    for (const workflowId of workflowIds) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': workspace.N8nApiKey },
        })

        if (response.ok) {
          const workflow = await response.json()
          allWorkflows.push(workflow)
        }
      } catch (error) {
        console.warn(`Failed to fetch workflow ${workflowId}:`, error)
      }
    }

    return allWorkflows
  },

  async getWorkflow(workspace: Workspace, workflowId: string): Promise<Workflow> {
    const response = await fetch(`${workspace.N8nUrl}/api/v1/workflows/${workflowId}`, {
      headers: { 'X-N8N-API-KEY': workspace.N8nApiKey },
    })

    return {
      StatusCode: response.status,
      Source: response.ok ? await response.json() : null,
    }
  },

  async updateWorkflow(
    workspace: Workspace,
    workflowId: string,
    payload: any,
  ): Promise<Workflow> {
    const response = await fetch(`${workspace.N8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': workspace.N8nApiKey,
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
