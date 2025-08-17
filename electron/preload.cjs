// CommonJS preload (do NOT use import here)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  // örnek API; ihtiyaç yoksa boş bırakabilirsiniz
  ping: () => ipcRenderer.invoke('ping')
});
