import { app, BrowserWindow, session, desktopCapturer } from 'electron';
import path from 'path';
import { AppController } from './controllers/AppController';

let mainWindow: BrowserWindow | null = null;
let appController: AppController | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox to allow desktop capture
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    if (appController) {
      appController.shutdown();
    }
    mainWindow = null;
  });
};

// Set up permissions for desktop capture
const setupPermissions = () => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permissions for our app
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  // Handle display media request for screen capture
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Return the first screen source
      if (sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    });
  });
};

app.on('ready', async () => {
  setupPermissions();
  createWindow();
  appController = new AppController(mainWindow!);
  await appController.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  if (appController) {
    await appController.shutdown();
  }
});
