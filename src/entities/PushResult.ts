export interface PushResult {
  [workflowId: string]: {
    status: number
    filePath?: string
    updated?: boolean
  }
}