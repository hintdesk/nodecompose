import { useState, useEffect } from 'react'
import type { Workspace } from '@/entities/Workspace'
import type { N8nProject } from '@/entities/N8nProject'
import { workspaceService } from '@/services/workspace.service'
import { n8nService } from '@/services/n8n.service'
import { useAppStore } from '@/stores/app.store'
import { pickFolder, createDirectory, gitIsRepo, gitInit } from '@/lib/ipc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import './WorkspaceForm.css'

interface WorkspaceFormProps {
  workspace: Workspace | null
  mode: 'create' | 'edit'
  onSave: (workspace: Workspace) => void
  onCancel: () => void
}

export default function WorkspaceForm({
  workspace,
  mode,
  onSave,
  onCancel,
}: WorkspaceFormProps) {
  const selectedWorkspace = useAppStore(state => state.selectedWorkspace)
  const setSelectedWorkspace = useAppStore(state => state.setSelectedWorkspace)
  const [formData, setFormData] = useState<Omit<Workspace, 'Id'>>({
    Name: '',
    N8nUrl: '',
    N8nApiKey: '',
    N8nProjectId: '',
    Folder: '',
  })
  const [projects, setProjects] = useState<N8nProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fetchingProjects, setFetchingProjects] = useState(false)

  useEffect(() => {
    if (workspace) {
      setFormData({
        Name: workspace.Name,
        N8nUrl: workspace.N8nUrl,
        N8nApiKey: workspace.N8nApiKey,
        N8nProjectId: workspace.N8nProjectId,
        Folder: workspace.Folder,
      })
    }
  }, [workspace])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleFetchProjects = async () => {
    if (!formData.N8nUrl || !formData.N8nApiKey) {
      setError('Please enter N8n URL and API Key first')
      return
    }

    try {
      setFetchingProjects(true)
      setError(null)
      const fetched = await n8nService.getProjects(formData.N8nUrl, formData.N8nApiKey)
      setProjects(fetched)
      if (fetched.length > 0) {
        setFormData(prev => ({ ...prev, N8nProjectId: fetched[0].Id }))
      }
      setSuccess('Projects fetched successfully')
    } catch (err) {
      setError(`Failed to fetch projects: ${(err as Error).message}`)
    } finally {
      setFetchingProjects(false)
    }
  }

  const handleSelectFolder = async () => {
    try {
      const folder = await pickFolder()
      if (folder) {
        setFormData(prev => ({ ...prev, Folder: folder }))
        setSuccess('Folder selected')
        setError(null)
      }
    } catch (err) {
      setError(`Failed to select folder: ${(err as Error).message}`)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.Name.trim()) {
      setError('Workspace name is required')
      return false
    }
    if (!formData.N8nUrl.trim()) {
      setError('N8n URL is required')
      return false
    }
    if (!formData.N8nApiKey.trim()) {
      setError('N8n API Key is required')
      return false
    }
    if (!formData.N8nProjectId.trim()) {
      setError('N8n Project is required')
      return false
    }
    if (!formData.Folder.trim()) {
      setError('Local folder is required')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      await createDirectory(formData.Folder)
      const isRepo = await gitIsRepo(formData.Folder)
      if (!isRepo) {
        await gitInit(formData.Folder);
        console.log('Initialized new git repository in selected folder');
      }

      const newWorkspace: Workspace = workspace
        ? { Id: workspace.Id, ...formData }
        : { Id: '', ...formData }

      if (mode === 'create') {
        const createdWorkspace = await workspaceService.createNewWorkspace(formData)
        onSave(createdWorkspace)
      } else {
        workspaceService.saveWorkspace(newWorkspace)
        if (selectedWorkspace && selectedWorkspace.Id === newWorkspace.Id) {
          setSelectedWorkspace(newWorkspace)
        }
        onSave(newWorkspace)
      }

      setSuccess('Workspace saved successfully')
      setTimeout(() => {
        onCancel()
      }, 1000)
    } catch (err) {
      setError(`Failed to save workspace: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workspace-form-container">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-bold">
          {mode === 'create' ? 'Create Workspace' : 'Edit Workspace'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-600 bg-green-600/10 px-4 py-3 text-sm text-green-600">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="Name">Name</Label>
          <Input
            id="Name"
            name="Name"
            value={formData.Name}
            onChange={handleInputChange}
            placeholder="My Workspace"
          />
        </div>

        {/* N8n Fields */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="N8nUrl">N8n URL</Label>
            <Input
              id="N8nUrl"
              name="N8nUrl"
              value={formData.N8nUrl}
              onChange={handleInputChange}
              placeholder="https://n8n.example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="N8nApiKey">N8n API Key</Label>
            <Input
              id="N8nApiKey"
              name="N8nApiKey"
              type="password"
              value={formData.N8nApiKey}
              onChange={handleInputChange}
              placeholder="Your API Key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="N8nProject">N8n Project</Label>
            <div className="flex gap-2">
              <Select
                value={formData.N8nProjectId}
                onValueChange={value => setFormData(prev => ({ ...prev, N8nProjectId: value }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      No projects available. Click &quot;Fetch&quot; to load.
                    </div>
                  ) : (
                    projects.map(project => (
                      <SelectItem key={project.Id} value={project.Id}>
                        {project.Name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchProjects}
                disabled={fetchingProjects}
              >
                {fetchingProjects ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Fetch'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Folder Selection */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="Folder">Local Folder</Label>
            <div className="flex gap-2">
              <Input
                id="Folder"
                name="Folder"
                value={formData.Folder}
                onChange={handleInputChange}
                placeholder="Select a folder"
                readOnly
              />
              <Button type="button" variant="outline" onClick={handleSelectFolder}>
                Browse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select where to store workflow files locally
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-2 border-t pt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
