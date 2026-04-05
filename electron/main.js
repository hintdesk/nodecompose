import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import pty from 'node-pty';

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

    Menu.setApplicationMenu(null);
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
            .map(file => {
                const fullPath = path.join(dirPath, file.name);
                const stats = fs.statSync(fullPath);
                return {
                    name: file.name,
                    isDirectory: file.isDirectory(),
                    path: fullPath,
                    ModifiedAt: stats.mtime.toISOString(),
                };
            })
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

ipcMain.handle('file:delete', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:rmdir', async (event, dirPath) => {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:hash', async (event, filePath) => {
    try {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => {
                resolve({ success: true, hash: hash.digest('hex') });
            });
            stream.on('error', (err) => {
                reject({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== SYSTEM OPERATIONS ====================

ipcMain.handle('system:tmpdir', async (event) => {
    try {
        return { success: true, tmpdir: os.tmpdir() };
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

        const ptyProcess = pty.spawn(shell, args, {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: workspaceFolder,
            env: process.env,
        });

        // Store the process
        terminalSessions.set(sessionId, {
            process: ptyProcess,
            workspaceFolder,
        });

        // Handle output
        ptyProcess.onData((data) => {
            mainWindow.webContents.send(`terminal:${sessionId}:data`, data.toString());
        });

        ptyProcess.onExit(({ exitCode }) => {
            terminalSessions.delete(sessionId);
            mainWindow.webContents.send(`terminal:${sessionId}:close`, exitCode);
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
        session.process.write(data);
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

ipcMain.handle('terminal:resize', async (event, params) => {
    try {
        const { sessionId, cols, rows } = params;
        const session = terminalSessions.get(sessionId);
        if (session) {
            session.process.resize(Math.max(1, cols), Math.max(1, rows));
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});