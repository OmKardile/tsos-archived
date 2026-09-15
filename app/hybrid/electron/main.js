const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'TSOS POS',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#0f172a',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL('https://tsos-frontend.onrender.com');
  }

  // Window state management
  const windowState = store.get('windowState', { x: undefined, y: undefined, width: 1280, height: 800 });
  mainWindow.setBounds(windowState);

  mainWindow.on('close', () => {
    store.set('windowState', mainWindow.getBounds());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('navigate', '/dashboard/settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'POS', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('navigate', '/dashboard/pos') },
        { label: 'Orders', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('navigate', '/dashboard/orders') },
        { label: 'KDS', accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.webContents.send('navigate', '/dashboard/kds') },
        { label: 'Menu', accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.webContents.send('navigate', '/dashboard/menu') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About TSOS POS', click: () => mainWindow?.webContents.send('show-about') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);

// Kiosk mode toggle
ipcMain.handle('toggle-kiosk', (event, enabled) => {
  mainWindow?.setKiosk(enabled);
});

// Print receipt
ipcMain.handle('print-receipt', async (event, html) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true },
  });
  await printWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
  printWindow.webContents.print({ silent: true, printBackground: true });
  printWindow.close();
});
