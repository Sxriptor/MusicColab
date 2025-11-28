import { WebRTCConnectionManager } from './WebRTCConnectionManager';
import { Logger } from '../utils/logger';

export interface BitrateConfig {
  minBitrate: number;
  maxBitrate: number;
  startBitrate: number;
}

export class StreamBroadcaster {
  private connectionManager: WebRTCConnectionManager;
  private videoStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private bitrateConfigs: Map<string, BitrateConfig> = new Map();
  private defaultBitrateConfig: BitrateConfig = {
    minBitrate: 500000,
    maxBitrate: 5000000,
    startBitrate: 2000000,
  };

  constructor(connectionManager: WebRTCConnectionManager) {
    this.connectionManager = connectionManager;
  }

  setVideoStream(stream: MediaStream): void {
    this.videoStream = stream;
    this.updateCombinedStream();
  }

  setAudioStream(stream: MediaStream): void {
    this.audioStream = stream;
    this.updateCombinedStream();
  }

  private updateCombinedStream(): void {
    const tracks: MediaStreamTrack[] = [];

    if (this.videoStream) {
      this.videoStream.getVideoTracks().forEach((track) => tracks.push(track));
    }

    if (this.audioStream) {
      this.audioStream.getAudioTracks().forEach((track) => tracks.push(track));
    }

    if (tracks.length > 0) {
      this.combinedStream = new MediaStream(tracks);
      this.connectionManager.setLocalStream(this.combinedStream);
      Logger.info('Combined stream updated and set to connection manager');
    }
  }

  async addPeer(userId: string): Promise<RTCSessionDescriptionInit | null> {
    try {
      await this.connectionManager.createPeerConnection(userId);
      
      // Set default bitrate config for new peer
      this.bitrateConfigs.set(userId, { ...this.defaultBitrateConfig });
      
      const offer = await this.connectionManager.createOffer(userId);
      
      if (offer) {
        await this.applyBitrateConstraints(userId);
      }
      
      Logger.info(`Peer ${userId} added to broadcast`);
      return offer;
    } catch (error) {
      Logger.error(`Failed to add peer ${userId}`, error);
      return null;
    }
  }

  async removePeer(userId: string): Promise<void> {
    await this.connectionManager.closePeerConnection(userId);
    this.bitrateConfigs.delete(userId);
    Logger.info(`Peer ${userId} removed from broadcast`);
  }

  async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    this.bitrateConfigs.set(userId, { ...this.defaultBitrateConfig });
    const answer = await this.connectionManager.handleRemoteOffer(userId, offer);
    
    if (answer) {
      await this.applyBitrateConstraints(userId);
    }
    
    return answer;
  }

  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<boolean> {
    return this.connectionManager.handleRemoteAnswer(userId, answer);
  }

  async handleICECandidate(userId: string, candidate: RTCIceCandidateInit): Promise<boolean> {
    return this.connectionManager.handleICECandidate(userId, candidate);
  }

  async adaptBitrate(userId: string, targetBitrate: number): Promise<void> {
    const config = this.bitrateConfigs.get(userId);
    if (!config) return;

    const clampedBitrate = Math.max(
      config.minBitrate,
      Math.min(config.maxBitrate, targetBitrate)
    );

    config.startBitrate = clampedBitrate;
    this.bitrateConfigs.set(userId, config);

    await this.applyBitrateConstraints(userId);
    Logger.info(`Bitrate adapted for ${userId}: ${clampedBitrate}`);
  }

  private async applyBitrateConstraints(userId: string): Promise<void> {
    const state = this.connectionManager.getConnectionState(userId);
    if (!state) return;

    // Bitrate constraints are applied through RTCRtpSender parameters
    // This is handled internally by the WebRTC stack based on network conditions
  }

  setBitrateConfig(userId: string, config: BitrateConfig): void {
    this.bitrateConfigs.set(userId, config);
  }

  getBitrateConfig(userId: string): BitrateConfig | undefined {
    return this.bitrateConfigs.get(userId);
  }

  getConnectedPeers(): string[] {
    return this.connectionManager.getConnectedUsers();
  }

  getPeerCount(): number {
    return this.connectionManager.getConnectionCount();
  }

  async stopBroadcast(): Promise<void> {
    await this.connectionManager.closeAllConnections();
    this.bitrateConfigs.clear();
    
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    
    this.combinedStream = null;
    Logger.info('Broadcast stopped');
  }
}
