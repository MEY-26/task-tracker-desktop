// ESM sürüm
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { ipcMain } from 'electron';
import fs from 'fs';

const isDev = process.env.NODE_ENV === 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200, height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Local dosyalara erişim için
            allowRunningInsecureContent: true
        }
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // Production modunda dist klasörünü doğru yoldan yükle
        let distPath;
        if (process.resourcesPath) {
            // Packaged app
            distPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
        } else {
            // Unpacked app
            distPath = path.join(__dirname, '..', 'dist', 'index.html');
        }
        
        // Dosya varlığını kontrol et
        if (fs.existsSync(distPath)) {
            win.loadFile(distPath);
        } else {
            console.error('Index.html not found at:', distPath);
            // Fallback: basit bir HTML sayfası göster
            win.loadURL('data:text/html,<h1>Task Tracker</h1><p>Loading...</p>');
        }
    }
}


app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Optional ping handler for preload example
ipcMain.handle('ping', async () => 'pong');
