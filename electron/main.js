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
        
        // Basit path hesaplama
        if (process.resourcesPath) {
            // Packaged app - dist klasörü app.asar içinde
            distPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
        } else {
            // Unpacked app - ana proje dizinindeki dist klasörü
            distPath = path.join(__dirname, '..', 'dist', 'index.html');
        }
        
        console.log('🔍 Looking for index.html at:', distPath);
        console.log('📁 Current working directory:', process.cwd());
        console.log('📁 __dirname:', __dirname);
        console.log('📁 process.resourcesPath:', process.resourcesPath);
        
        // Dosya varlığını kontrol et
        if (fs.existsSync(distPath)) {
            console.log('✅ Found index.html, loading...');
            win.loadFile(distPath);
        } else {
            console.error('❌ Index.html not found at:', distPath);
            console.log('🔍 Trying alternative path...');
            
            // Alternatif path dene
            const altPath = path.join(process.cwd(), 'dist', 'index.html');
            console.log('🔍 Trying alternative path:', altPath);
            
            if (fs.existsSync(altPath)) {
                console.log('✅ Found index.html at alternative path, loading...');
                win.loadFile(altPath);
            } else {
                console.error('❌ Index.html not found at alternative path either');
                // Debug bilgileri ile fallback sayfası göster
                win.loadURL(`data:text/html,<h1>Debug Info</h1><p>Looking for: ${distPath}</p><p>Current dir: ${process.cwd()}</p><p>__dirname: ${__dirname}</p><p>resourcesPath: ${process.resourcesPath}</p><p>Alternative path: ${altPath}</p>`);
            }
        }
    }
}


app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Optional ping handler for preload example
ipcMain.handle('ping', async () => 'pong');
