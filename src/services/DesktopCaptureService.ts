import { desktopCapturer, DesktopCapturerSource } from 'electron';
import { Display } from '../models/Display';
import { Logger } from '../utils/logger';

export interface CaptureConfig {
  frameRate: number;
  width?: number;
  height?: number;
}

export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export class DesktopCaptureService {
  private currentDisplayId: string = '';
  private frameRate: number = 30;
  private isCapturing: boolean = false;

  async getAvailableDisplays(): Promise<Display[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 150, height: 150 },
      });

      Logger.info(`Found ${sources.length} displays`);

      return sources.map((source, index) => ({
        displayId: source.id,
        displayName: source.name || `Display ${index + 1}`,
        width: 1920,
        height: 1080,
        refreshRate: 60,
        isPrimary: index === 0,
      }));
    } catch (error) {
      Logger.error('Failed to get available displays', error);
      return [];
    }
  }

  async getSources(): Promise<DesktopSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 150, height: 150 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      }));
    } catch (error) {
      Logger.error('Failed to get desktop sources', error);
      return [];
    }
  }

  setCapturing(displayId: string, capturing: boolean): void {
    this.currentDisplayId = displayId;
    this.isCapturing = capturing;
    if (capturing) {
      Logger.info(`Desktop capture started for display: ${displayId}`);
    } else {
      Logger.info('Desktop capture stopped');
    }
  }

  stopCapture(): void {
    this.isCapturing = false;
    this.currentDisplayId = '';
    Logger.info('Desktop capture stopped');
  }

  getFrameRate(): number {
    return this.frameRate;
  }

  setFrameRate(frameRate: number): void {
    this.frameRate = frameRate;
  }

  getCurrentDisplayId(): string {
    return this.currentDisplayId;
  }

  getIsCapturing(): boolean {
    return this.isCapturing;
  }
}
