// CommonJS preload (do NOT use import here)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  ping: () => ipcRenderer.invoke('ping')
});
