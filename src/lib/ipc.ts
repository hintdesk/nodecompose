/**
 * IPC Bridge for communicating with Electron main process
 */

type ElectronAPI = {
  invoke: (channel: string, data?: any) => Promise<any>;
  send: (channel: string, data?: any) => void;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  once: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
};

const electron = (window as any).electron as ElectronAPI;

// ==================== FILE OPERATIONS ====================

export async function readFile(filePath: string): Promise<string> {
  const result = await electron.invoke('file:read', filePath);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.content;
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const result = await electron.invoke('file:write', { filePath, content });
  if (!result.success) {
    throw new Error(result.error);
  }
}

export interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  ModifiedAt?: string;
}

export async function listDirectory(dirPath: string): Promise<FileItem[]> {
  const result = await electron.invoke('file:list', dirPath);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.files;
}

export async function fileExists(filePath: string): Promise<boolean> {
  const result = await electron.invoke('file:exists', filePath);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.exists;
}

export async function createDirectory(dirPath: string): Promise<void> {
  const result = await electron.invoke('file:mkdir', dirPath);
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const result = await electron.invoke('file:delete', filePath);
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function removeDirectory(dirPath: string): Promise<void> {
  const result = await electron.invoke('file:rmdir', dirPath);
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function getFileHash(filePath: string): Promise<string> {
  const result = await electron.invoke('file:hash', filePath);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.hash;
}

// ==================== SYSTEM OPERATIONS ====================

export async function getTmpDir(): Promise<string> {
  const result = await electron.invoke('system:tmpdir');
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.tmpdir;
}

// ==================== FOLDER PICKER ====================

export async function pickFolder(): Promise<string | null> {
  const result = await electron.invoke('dialog:openDirectory');
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0] || null;
}

// ==================== GIT OPERATIONS ====================

export async function gitInit(dirPath: string): Promise<void> {
  const result = await electron.invoke('git:init', dirPath);
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function gitClone(repoUrl: string, targetPath: string): Promise<void> {
  const result = await electron.invoke('git:clone', { repoUrl, targetPath });
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function gitStatus(dirPath: string): Promise<string> {
  const result = await electron.invoke('git:status', dirPath);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.status;
}

export async function gitIsInstalled(): Promise<boolean> {
  const result = await electron.invoke('git:isInstalled');
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.installed;
}

// ==================== TERMINAL/PTY OPERATIONS ====================

export async function createTerminalSession(workspaceFolder: string): Promise<string> {
  const result = await electron.invoke('terminal:create', workspaceFolder);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.sessionId;
}

export async function writeToTerminal(sessionId: string, data: string): Promise<void> {
  const result = await electron.invoke('terminal:write', { sessionId, data });
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function closeTerminalSession(sessionId: string): Promise<void> {
  const result = await electron.invoke('terminal:close', sessionId);
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
  await electron.invoke('terminal:resize', { sessionId, cols, rows });
}

export function onTerminalData(sessionId: string, callback: (data: string) => void): void {
  electron.on(`terminal:${sessionId}:data`, callback);
}

export function onTerminalClose(sessionId: string, callback: (code: number) => void): void {
  electron.on(`terminal:${sessionId}:close`, callback);
}

export function removeTerminalListeners(sessionId: string): void {
  electron.removeAllListeners(`terminal:${sessionId}:data`);
  electron.removeAllListeners(`terminal:${sessionId}:close`);
}
