import { cn } from '@/lib/utils'
import { getAppVersion } from '@/lib/ipc'
import { useEffect, useState } from 'react'
import './SettingsSidebar.css'

interface SettingsSidebarProps {
  activeView: string | null
  onViewChange: (view: string) => void
}

export default function SettingsSidebar({
  activeView,
  onViewChange,
}: SettingsSidebarProps) {
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    let mounted = true

    const loadVersion = async () => {
      try {
        const version = await getAppVersion()
        if (mounted) {
          setAppVersion(version)
        }
      } catch {
        if (mounted) {
          setAppVersion('')
        }
      }
    }

    loadVersion()

    return () => {
      mounted = false
    }
  }, [])

  const menuItems = [
    { id: 'workspace', label: 'Workspaces' },
  ]

  return (
    <div className="settings-sidebar border-r bg-background">
      <div className="settings-sidebar-content p-4">
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
            </li>
          ))}
        </ul>
      </div>

      <div className="settings-sidebar-footer border-t px-4 py-3 text-xs text-muted-foreground">
        Version {appVersion || '-'}
      </div>
    </div>
  )
}
