import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const terminalSessions = new Map();

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../electron/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
    //additional logic here
}).then(createWindow)

app.on('window-all-closed', () => {
    // eslint-disable-next-line no-undef
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ==================== FILE OPERATIONS ====================

ipcMain.handle('file:read', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:write', async (event, params) => {
    try {
        const { filePath, content } = params;
        // Ensure directory exists
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:list', async (event, dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            return { success: true, files: [] };
        }
        
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = files
            .filter(file => !file.name.startsWith('.'))
            .map(file => ({
                name: file.name,
                isDirectory: file.isDirectory(),
                path: path.join(dirPath, file.name),
            }))
            .sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) {
                    return b.isDirectory ? 1 : -1;
                }
                return a.name.localeCompare(b.name);
            });
        return { success: true, files: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:exists', async (event, filePath) => {
    try {
        return { success: true, exists: fs.existsSync(filePath) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:mkdir', async (event, dirPath) => {
    try {
        fs.mkdirSync(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== FOLDER PICKER ====================

ipcMain.handle('dialog:openDirectory', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    return result;
});

// ==================== GIT OPERATIONS ====================

ipcMain.handle('git:init', async (event, dirPath) => {
    try {
        const { stderr } = await execPromise(`cd "${dirPath}" && git init`);
        if (stderr && !stderr.includes('Initialized empty Git repository')) {
            return { success: false, error: stderr };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git:clone', async (event, params) => {
    try {
        const { repoUrl, targetPath } = params;
        const { stderr } = await execPromise(`git clone "${repoUrl}" "${targetPath}"`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git:status', async (event, dirPath) => {
    try {
        const { stdout } = await execPromise(`cd "${dirPath}" && git status --porcelain`);
        return { success: true, status: stdout };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('git:isInstalled', async (event) => {
    try {
        await execPromise('git --version');
        return { success: true, installed: true };
    } catch (error) {
        return { success: true, installed: false };
    }
});

// ==================== TERMINAL/PTY OPERATIONS ====================

ipcMain.handle('terminal:create', async (event, workspaceFolder) => {
    try {
        const sessionId = Math.random().toString(36).substr(2, 9);
        
        // Detect shell based on platform
        let shell, args;
        if (process.platform === 'win32') {
            shell = 'powershell.exe';
            args = ['-NoExit', '-NoProfile'];
        } else {
            shell = '/bin/bash';
            args = [];
        }

        const ptyProcess = spawn(shell, args, {
            cwd: workspaceFolder,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
        });

        // Keep stdin open and writable
        ptyProcess.stdin.setDefaultEncoding('utf-8');

        // Store the process
        terminalSessions.set(sessionId, {
            process: ptyProcess,
            workspaceFolder,
        });

        // Handle output
        ptyProcess.stdout.on('data', (data) => {
            mainWindow.webContents.send(`terminal:${sessionId}:data`, data.toString());
        });

        ptyProcess.stderr.on('data', (data) => {
            mainWindow.webContents.send(`terminal:${sessionId}:data`, data.toString());
        });

        ptyProcess.on('close', (code) => {
            terminalSessions.delete(sessionId);
            mainWindow.webContents.send(`terminal:${sessionId}:close`, code);
        });

        ptyProcess.on('error', (error) => {
            console.error('Terminal process error:', error);
        });

        return { success: true, sessionId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('terminal:write', async (event, params) => {
    try {
        const { sessionId, data } = params;
        const session = terminalSessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }
        session.process.stdin.write(data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('terminal:close', async (event, sessionId) => {
    try {
        const session = terminalSessions.get(sessionId);
        if (session) {
            session.process.kill();
            terminalSessions.delete(sessionId);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});