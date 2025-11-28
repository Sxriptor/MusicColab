import { BrowserWindow, ipcMain } from 'electron';
import { RoomManager } from '../../services/RoomManager';
import { DesktopCaptureService } from '../../services/DesktopCaptureService';
import { ConnectionTracker } from '../../services/ConnectionTracker';
import { DisplayManager } from '../../services/DisplayManager';
import { ErrorHandler } from '../../services/ErrorHandler';
import { ShutdownManager } from '../../services/ShutdownManager';
import { SignalingServerManager } from '../../services/SignalingServerManager';
import { Logger } from '../../utils/logger';

export class AppController {
  private mainWindow: BrowserWindow;
  private roomManager: RoomManager;
  private desktopCapture: DesktopCaptureService;
  private connectionTracker: ConnectionTracker;
  private displayManager: DisplayManager;
  private errorHandler: ErrorHandler;
  private shutdownManager: ShutdownManager;
  private signalingServer: SignalingServerManager;
  private isCapturing: boolean = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    // Initialize services
    this.roomManager = new RoomManager();
    this.desktopCapture = new DesktopCaptureService();
    this.connectionTracker = new ConnectionTracker();
    this.displayManager = new DisplayManager(this.desktopCapture);
    this.errorHandler = new ErrorHandler();
    this.shutdownManager = new ShutdownManager();
    this.signalingServer = new SignalingServerManager(8765);

    // Register services with shutdown manager
    this.shutdownManager.registerDesktopCapture(this.desktopCapture);
    this.shutdownManager.registerDisplayManager(this.displayManager);
    this.shutdownManager.registerRoomManager(this.roomManager);
  }

  async initialize(): Promise<void> {
    this.setupIpcHandlers();
    this.setupEventHandlers();
    await this.initializeRoom();
    await this.displayManager.initialize();
    // Start the signaling server
    await this.startSignalingServer();
    // Send initial state immediately after display manager is ready
    this.sendInitialState();
  }

  private async startSignalingServer(): Promise<void> {
    this.signalingServer.setEventCallback((event, data) => {
      try {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (event === 'status-changed') {
            this.mainWindow.webContents.send('server-status-changed', data);
          } else if (event === 'error') {
            this.mainWindow.webContents.send('error', { type: 'server-error', message: data });
          }
        }
      } catch (error) {
        // Window may be closing, ignore send errors
      }
    });

    const started = await this.signalingServer.start();
    if (started) {
      Logger.info('Signaling server started successfully');
      const hostInfo = this.signalingServer.getHostInfo();
      this.mainWindow.webContents.send('host-info-updated', hostInfo);
    } else {
      Logger.error('Failed to start signaling server');
    }
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('get-room-code', () => this.roomManager.getRoomCode());
    
    ipcMain.handle('start-capture', async (_, displayId?: string) => {
      return this.startCapture(displayId);
    });
    
    ipcMain.handle('stop-capture', () => this.stopCapture());
    
    ipcMain.handle('get-displays', async () => {
      const displays = this.displayManager.getAvailableDisplays();
      // Convert Display[] to DisplayOption[] format
      return displays.map((display) => ({
        displayId: display.displayId,
        displayName: display.displayName,
        isPrimary: display.isPrimary,
      }));
    });
    
    ipcMain.handle('get-sources', async () => {
      return this.desktopCapture.getSources();
    });
    
    ipcMain.handle('switch-display', async (_, displayId: string) => {
      return this.switchDisplay(displayId);
    });
    
    ipcMain.handle('get-connection-status', () => ({
      isCapturing: this.isCapturing,
      roomCode: this.roomManager.getRoomCode(),
      connectedUsers: this.connectionTracker.getConnectionCount(),
    }));

    // Host info and server status handlers
    ipcMain.handle('get-host-info', () => this.signalingServer.getHostInfo());
    
    ipcMain.handle('get-server-status', () => this.signalingServer.getStatus());

    // Join host handler (for remote users connecting to a host)
    ipcMain.handle('join-host', async (_, { ip, port }: { ip: string; port: number }) => {
      return this.joinHost(ip, port);
    });

    // Handle capture started from renderer
    ipcMain.on('capture-started-renderer', (_, displayId: string) => {
      this.isCapturing = true;
      this.desktopCapture.setCapturing(displayId, true);
      this.roomManager.setCapturing(true);
      Logger.info(`Capture started for display: ${displayId}`);
    });

    // Handle capture error from renderer
    ipcMain.on('capture-error-renderer', (_, error: string) => {
      this.errorHandler.handleError('capture-error', error);
    });
  }

  private setupEventHandlers(): void {
    // Connection tracker events
    this.connectionTracker.setEventCallback((event, info) => {
      if (event === 'connected') {
        this.mainWindow.webContents.send('user-connected', info);
      } else if (event === 'disconnected') {
        this.mainWindow.webContents.send('user-disconnected', info.userId);
      }
    });

    // Display manager events
    this.displayManager.setEventCallback((event, data) => {
      try {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (event === 'displays-updated') {
            // Convert Display[] to DisplayOption[] format
            const displayOptions = data.map((display: any) => ({
              displayId: display.displayId,
              displayName: display.displayName,
              isPrimary: display.isPrimary,
            }));
            this.mainWindow.webContents.send('displays-updated', displayOptions);
          } else if (event === 'display-disconnected') {
            this.mainWindow.webContents.send('display-disconnected', data);
          }
        }
      } catch (error) {
        // Window may be closing, ignore send errors
      }
    });

    // Error handler events
    this.errorHandler.setErrorCallback((error) => {
      this.mainWindow.webContents.send('error', error);
    });
  }

  private async initializeRoom(): Promise<void> {
    const room = this.roomManager.createRoom();
    this.mainWindow.webContents.send('room-code-generated', room.roomCode);
    Logger.info(`Room initialized with code: ${room.roomCode}`);
  }

  private sendInitialState(): void {
    const displays = this.displayManager.getAvailableDisplays();
    if (displays && displays.length > 0) {
      // Convert Display[] to DisplayOption[] format
      const displayOptions = displays.map((display) => ({
        displayId: display.displayId,
        displayName: display.displayName,
        isPrimary: display.isPrimary,
      }));
      this.mainWindow.webContents.send('displays-updated', displayOptions);
    }

    // Send host info
    const hostInfo = this.signalingServer.getHostInfo();
    this.mainWindow.webContents.send('host-info-updated', hostInfo);
    
    // Send server status
    this.mainWindow.webContents.send('server-status-changed', this.signalingServer.getStatus());
  }

  private async startCapture(displayId?: string): Promise<{ success: boolean; sourceId?: string; error?: string }> {
    try {
      const displays = this.displayManager.getAvailableDisplays();
      const targetDisplayId = displayId || displays[0]?.displayId;

      if (!targetDisplayId) {
        return { success: false, error: 'No display available for capture' };
      }

      const display = this.displayManager.selectDisplay(targetDisplayId);
      if (!display) {
        return { success: false, error: 'Failed to select display' };
      }

      // Return the source ID so the renderer can capture it
      return { success: true, sourceId: targetDisplayId };
    } catch (error) {
      Logger.error('Failed to start capture', error);
      return { success: false, error: 'Failed to start capture' };
    }
  }

  private stopCapture(): void {
    this.displayManager.stopCapture();
    this.isCapturing = false;
    this.roomManager.setCapturing(false);
    this.mainWindow.webContents.send('capture-stopped');
    Logger.info('Capture stopped');
  }

  private switchDisplay(displayId: string): { success: boolean; sourceId?: string; error?: string } {
    const display = this.displayManager.switchDisplay(displayId);
    if (display) {
      return { success: true, sourceId: displayId };
    }
    return { success: false, error: 'Failed to switch display' };
  }

  private joinHost(ip: string, port: number): { success: boolean; error?: string } {
    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ip || !ipRegex.test(ip)) {
      return { success: false, error: 'Invalid IP address format' };
    }

    // Validate port
    if (!port || port < 1 || port > 65535) {
      return { success: false, error: 'Invalid port number' };
    }

    // TODO: Implement actual connection logic via SignalingClient
    // For now, just validate the format and log
    Logger.info(`Join host request for ${ip}:${port}`);
    
    // The actual WebRTC connection will be handled in the renderer process
    // using the SignalingClient
    return { success: true };
  }

  async shutdown(): Promise<void> {
    // Stop the signaling server first
    await this.signalingServer.stop();
    await this.shutdownManager.shutdown();
  }
}
