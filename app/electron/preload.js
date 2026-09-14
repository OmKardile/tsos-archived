const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  toggleKiosk: (enabled) => ipcRenderer.invoke('toggle-kiosk', enabled),
  printReceipt: (html) => ipcRenderer.invoke('print-receipt', html),
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, path) => callback(path)),
  onShowAbout: (callback) => ipcRenderer.on('show-about', () => callback()),
});
