import { Display } from '../models/Display';
import { DesktopCaptureService } from './DesktopCaptureService';
import { Logger } from '../utils/logger';

export type DisplayEventCallback = (event: 'display-changed' | 'display-disconnected' | 'displays-updated', data?: any) => void;

export class DisplayManager {
  private captureService: DesktopCaptureService;
  private availableDisplays: Display[] = [];
  private selectedDisplayId: string = '';
  private eventCallback: DisplayEventCallback | null = null;
  private displayCheckInterval: NodeJS.Timeout | null = null;

  constructor(captureService: DesktopCaptureService) {
    this.captureService = captureService;
  }

  setEventCallback(callback: DisplayEventCallback): void {
    this.eventCallback = callback;
  }

  async initialize(): Promise<void> {
    // Try to get displays with retries in case they're not immediately available
    let retries = 5;
    let lastError: any = null;
    
    while (retries > 0 && this.availableDisplays.length === 0) {
      try {
        await this.refreshDisplays();
        if (this.availableDisplays.length > 0) {
          Logger.info(`Successfully initialized with ${this.availableDisplays.length} displays`);
          break;
        }
      } catch (error) {
        lastError = error;
        Logger.error(`Error refreshing displays (retry ${6 - retries})`, error);
      }
      
      retries--;
      if (retries > 0) {
        Logger.info(`Retrying display refresh in 200ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    if (this.availableDisplays.length === 0) {
      Logger.warn('No displays found after retries', lastError);
    }
    
    this.startDisplayMonitoring();
  }

  async refreshDisplays(): Promise<Display[]> {
    this.availableDisplays = await this.captureService.getAvailableDisplays();
    this.emitEvent('displays-updated', this.availableDisplays);
    return this.availableDisplays;
  }

  getAvailableDisplays(): Display[] {
    return this.availableDisplays;
  }

  getSelectedDisplayId(): string {
    return this.selectedDisplayId;
  }

  getSelectedDisplay(): Display | undefined {
    return this.availableDisplays.find((d) => d.displayId === this.selectedDisplayId);
  }

  selectDisplay(displayId: string): Display | null {
    const display = this.availableDisplays.find((d) => d.displayId === displayId);
    if (!display) {
      Logger.error(`Display not found: ${displayId}`);
      return null;
    }

    const previousDisplayId = this.selectedDisplayId;
    this.selectedDisplayId = displayId;
    this.captureService.setCapturing(displayId, true);

    this.emitEvent('display-changed', {
      previousDisplayId,
      newDisplayId: displayId,
      display,
    });

    Logger.info(`Display selected: ${display.displayName}`);
    return display;
  }

  switchDisplay(displayId: string): Display | null {
    if (displayId === this.selectedDisplayId) {
      Logger.info('Display already selected');
      return this.getSelectedDisplay() || null;
    }

    return this.selectDisplay(displayId);
  }

  private startDisplayMonitoring(): void {
    this.displayCheckInterval = setInterval(async () => {
      await this.checkDisplayAvailability();
    }, 5000);
  }

  private async checkDisplayAvailability(): Promise<void> {
    await this.refreshDisplays();

    // Check if selected display is still available
    if (this.selectedDisplayId) {
      const selectedStillAvailable = this.availableDisplays.some(
        (d) => d.displayId === this.selectedDisplayId
      );

      if (!selectedStillAvailable) {
        Logger.warn(`Selected display disconnected: ${this.selectedDisplayId}`);
        this.emitEvent('display-disconnected', { displayId: this.selectedDisplayId });
        this.fallbackToPrimaryDisplay();
      }
    }
  }

  private fallbackToPrimaryDisplay(): void {
    const primaryDisplay = this.availableDisplays.find((d) => d.isPrimary);

    if (primaryDisplay) {
      Logger.info(`Falling back to primary display: ${primaryDisplay.displayName}`);
      this.selectDisplay(primaryDisplay.displayId);
    } else if (this.availableDisplays.length > 0) {
      Logger.info(`Falling back to first available display`);
      this.selectDisplay(this.availableDisplays[0].displayId);
    } else {
      Logger.error('No displays available');
      this.captureService.stopCapture();
    }
  }

  stopCapture(): void {
    this.captureService.stopCapture();
    this.selectedDisplayId = '';
  }

  stopMonitoring(): void {
    if (this.displayCheckInterval) {
      clearInterval(this.displayCheckInterval);
      this.displayCheckInterval = null;
    }
  }

  private emitEvent(event: 'display-changed' | 'display-disconnected' | 'displays-updated', data?: any): void {
    if (this.eventCallback) {
      this.eventCallback(event, data);
    }
  }

  cleanup(): void {
    this.stopMonitoring();
    this.stopCapture();
  }
}
