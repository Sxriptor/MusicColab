import { DesktopCaptureService } from './DesktopCaptureService';
import { DisplayManager } from './DisplayManager';
import { RoomManager } from './RoomManager';
import { Logger } from '../utils/logger';

export class ShutdownManager {
  private desktopCapture: DesktopCaptureService | null = null;
  private displayManager: DisplayManager | null = null;
  private roomManager: RoomManager | null = null;
  private isShuttingDown: boolean = false;

  registerDesktopCapture(service: DesktopCaptureService): void {
    this.desktopCapture = service;
  }

  registerDisplayManager(manager: DisplayManager): void {
    this.displayManager = manager;
  }

  registerRoomManager(manager: RoomManager): void {
    this.roomManager = manager;
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      Logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    Logger.info('Starting graceful shutdown...');

    try {
      // 1. Stop desktop capture
      if (this.desktopCapture) {
        Logger.info('Stopping desktop capture...');
        this.desktopCapture.stopCapture();
      }

      // 2. Cleanup display manager
      if (this.displayManager) {
        Logger.info('Cleaning up display manager...');
        this.displayManager.cleanup();
      }

      // 3. Close room and release room code
      if (this.roomManager) {
        Logger.info('Closing room...');
        this.roomManager.closeRoom();
      }

      Logger.info('Graceful shutdown completed');
    } catch (error) {
      Logger.error('Error during shutdown', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  async stopSharing(): Promise<void> {
    Logger.info('Stopping sharing...');

    try {
      // Stop captures
      if (this.desktopCapture) {
        this.desktopCapture.stopCapture();
      }

      // Update room state
      if (this.roomManager) {
        this.roomManager.setCapturing(false);
      }

      Logger.info('Sharing stopped');
    } catch (error) {
      Logger.error('Error stopping sharing', error);
    }
  }

  isInProgress(): boolean {
    return this.isShuttingDown;
  }
}
