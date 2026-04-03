import { cn } from '@/lib/utils'
import type { Workspace } from '@/entities/Workspace'
import './SettingsSidebar.css'

interface SettingsSidebarProps {
  activeView: string | null
  workspaces: Workspace[]
  onViewChange: (view: string) => void
}

export default function SettingsSidebar({
  activeView,
  workspaces,
  onViewChange,
}: SettingsSidebarProps) {
  const menuItems = [
    { id: 'workspace', label: 'Workspaces' },
  ]

  return (
    <div className="settings-sidebar border-r bg-background">
      <div className="p-4">
        <ul className="space-y-2">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                  activeView === item.id
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {item.label}
              </button>
              {item.id === 'workspace' && workspaces.length > 0 && (
                <ul className="mt-1 space-y-1 pl-4">
                  {workspaces.map(workspace => (
                    <li key={workspace.Id}>
                      <button
                        onClick={() => onViewChange('workspace')}
                        className="w-full truncate rounded px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                        title={workspace.Name}
                      >
                        {workspace.Name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
