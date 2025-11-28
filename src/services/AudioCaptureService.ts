import { Logger } from '../utils/logger';

export interface AudioConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
}

export class AudioCaptureService {
  private currentStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isCapturing: boolean = false;

  async startAudioCapture(config: AudioConfig = {}): Promise<MediaStream | null> {
    try {
      if (this.isCapturing) {
        await this.stopAudioCapture();
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          // @ts-ignore - Electron-specific constraint for system audio
          mandatory: {
            chromeMediaSource: 'desktop',
          },
          echoCancellation: config.echoCancellation ?? false,
          noiseSuppression: config.noiseSuppression ?? false,
          sampleRate: config.sampleRate ?? 48000,
          channelCount: config.channelCount ?? 2,
        },
        video: false,
      };

      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.setupAudioAnalyser();
      this.isCapturing = true;

      Logger.info('Audio capture started');
      return this.currentStream;
    } catch (error) {
      Logger.error('Failed to start audio capture', error);
      this.isCapturing = false;
      return null;
    }
  }

  private setupAudioAnalyser(): void {
    if (!this.currentStream) return;

    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(this.currentStream);
      source.connect(this.analyser);
    } catch (error) {
      Logger.error('Failed to setup audio analyser', error);
    }
  }

  async stopAudioCapture(): Promise<void> {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.isCapturing = false;
    Logger.info('Audio capture stopped');
  }

  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / dataArray.length;
    return Math.round((average / 255) * 100);
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  getIsCapturing(): boolean {
    return this.isCapturing;
  }
}
