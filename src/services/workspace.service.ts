import { v4 as uuidv4 } from 'uuid'
import type { Workspace } from '@/entities/Workspace'

const WORKSPACES_KEY = 'workspaces'
const SELECTED_WORKSPACE_KEY = 'selectedWorkspaceId'

class WorkspaceService {
  /**
   * Get all workspaces from localStorage
   */
  getAllWorkspaces(): Workspace[] {
    try {
      const data = localStorage.getItem(WORKSPACES_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading workspaces from localStorage:', error)
      return []
    }
  }

  /**
   * Get workspace by ID
   */
  getWorkspaceById(id: string): Workspace | null {
    const workspaces = this.getAllWorkspaces()
    return workspaces.find(ws => ws.Id === id) || null
  }

  /**
   * Create or update workspace
   */
  saveWorkspace(workspace: Workspace): void {
    try {
      const workspaces = this.getAllWorkspaces()
      const index = workspaces.findIndex(ws => ws.Id === workspace.Id)
      
      if (index >= 0) {
        workspaces[index] = workspace
      } else {
        workspaces.push(workspace)
      }
      
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces))
    } catch (error) {
      console.error('Error saving workspace to localStorage:', error)
    }
  }

  /**
   * Delete workspace by ID
   */
  deleteWorkspace(id: string): void {
    try {
      const workspaces = this.getAllWorkspaces()
      const filtered = workspaces.filter(ws => ws.Id !== id)
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(filtered))
      
      // Clear selected workspace if it was deleted
      if (this.getSelectedWorkspaceId() === id) {
        this.clearSelectedWorkspace()
      }
    } catch (error) {
      console.error('Error deleting workspace from localStorage:', error)
    }
  }

  /**
   * Create new workspace with auto-generated ID
   */
  createNewWorkspace(data: Omit<Workspace, 'Id'>): Workspace {
    const workspace: Workspace = {
      Id: uuidv4(),
      ...data
    }
    this.saveWorkspace(workspace)
    return workspace
  }

  /**
   * Get selected workspace ID
   */
  getSelectedWorkspaceId(): string | null {
    try {
      return localStorage.getItem(SELECTED_WORKSPACE_KEY)
    } catch (error) {
      console.error('Error reading selected workspace ID:', error)
      return null
    }
  }

  /**
   * Set selected workspace ID
   */
  setSelectedWorkspaceId(id: string): void {
    try {
      localStorage.setItem(SELECTED_WORKSPACE_KEY, id)
    } catch (error) {
      console.error('Error setting selected workspace ID:', error)
    }
  }

  /**
   * Clear selected workspace
   */
  clearSelectedWorkspace(): void {
    try {
      localStorage.removeItem(SELECTED_WORKSPACE_KEY)
    } catch (error) {
      console.error('Error clearing selected workspace:', error)
    }
  }

  /**
   * Get selected workspace
   */
  getSelectedWorkspace(): Workspace | null {
    const id = this.getSelectedWorkspaceId()
    return id ? this.getWorkspaceById(id) : null
  }

  /**
   * Get default workspace (first one if exists)
   */
  getDefaultWorkspace(): Workspace | null {
    const workspaces = this.getAllWorkspaces()
    return workspaces.length > 0 ? workspaces[0] : null
  }

  /**
   * Initialize selected workspace on app load
   */
  initializeSelectedWorkspace(): Workspace | null {
    let selected = this.getSelectedWorkspace()
    
    // If no selected workspace, try to use default
    if (!selected) {
      selected = this.getDefaultWorkspace()
      if (selected) {
        this.setSelectedWorkspaceId(selected.Id)
      }
    }
    
    return selected
  }
}

export const workspaceService = new WorkspaceService()
