import { create } from 'zustand'
import type { Workspace } from '@/entities/Workspace'

interface AppStoreState {
  selectedWorkspace: Workspace | null
  setSelectedWorkspace: (workspace: Workspace | null) => void
}

export const useAppStore = create<AppStoreState>()((set) => ({
  selectedWorkspace: null,
  setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
}))
