import { Logger } from '../utils/logger';
import { PeerConnection, PeerConnectionStats } from '../models/Room';

export interface ConnectionConfig {
  iceServers?: RTCIceServer[];
}

export type ConnectionStateCallback = (userId: string, state: RTCPeerConnectionState) => void;
export type ICECandidateCallback = (userId: string, candidate: RTCIceCandidate) => void;

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class WebRTCConnectionManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private connectionStates: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private config: ConnectionConfig;
  private onConnectionStateChange: ConnectionStateCallback | null = null;
  private onICECandidate: ICECandidateCallback | null = null;

  constructor(config: ConnectionConfig = {}) {
    this.config = {
      iceServers: config.iceServers || DEFAULT_ICE_SERVERS,
    };
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    // Update existing connections with new stream
    this.peerConnections.forEach((pc, userId) => {
      this.addStreamToPeerConnection(pc, stream);
    });
  }

  setOnConnectionStateChange(callback: ConnectionStateCallback): void {
    this.onConnectionStateChange = callback;
  }

  setOnICECandidate(callback: ICECandidateCallback): void {
    this.onICECandidate = callback;
  }

  async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(userId)) {
      await this.closePeerConnection(userId);
    }

    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    this.setupPeerConnectionHandlers(pc, userId);

    if (this.localStream) {
      this.addStreamToPeerConnection(pc, this.localStream);
    }

    this.peerConnections.set(userId, pc);
    this.connectionStates.set(userId, {
      userId,
      connectionState: 'connecting',
      createdAt: Date.now(),
      stats: { bitrate: 0, latency: 0, frameRate: 0, packetsLost: 0 },
    });

    Logger.info(`Peer connection created for user: ${userId}`);
    return pc;
  }

  private setupPeerConnectionHandlers(pc: RTCPeerConnection, userId: string): void {
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onICECandidate) {
        this.onICECandidate(userId, event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = this.connectionStates.get(userId);
      if (state) {
        state.connectionState = this.mapConnectionState(pc.connectionState);
        this.connectionStates.set(userId, state);
      }

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.connectionState);
      }

      Logger.info(`Connection state changed for ${userId}: ${pc.connectionState}`);
    };

    pc.oniceconnectionstatechange = () => {
      Logger.info(`ICE connection state for ${userId}: ${pc.iceConnectionState}`);
    };
  }

  private mapConnectionState(state: RTCPeerConnectionState): PeerConnection['connectionState'] {
    switch (state) {
      case 'new':
      case 'connecting':
        return 'connecting';
      case 'connected':
        return 'connected';
      case 'disconnected':
      case 'closed':
        return 'disconnected';
      case 'failed':
        return 'failed';
      default:
        return 'disconnected';
    }
  }

  private addStreamToPeerConnection(pc: RTCPeerConnection, stream: MediaStream): void {
    // Remove existing tracks
    pc.getSenders().forEach((sender) => {
      pc.removeTrack(sender);
    });

    // Add new tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }

  async createOffer(userId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      Logger.error(`No peer connection found for user: ${userId}`);
      return null;
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (error) {
      Logger.error(`Failed to create offer for ${userId}`, error);
      return null;
    }
  }

  async handleRemoteOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    let pc = this.peerConnections.get(userId);
    if (!pc) {
      pc = await this.createPeerConnection(userId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
      Logger.error(`Failed to handle offer from ${userId}`, error);
      return null;
    }
  }

  async handleRemoteAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<boolean> {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      Logger.error(`No peer connection found for user: ${userId}`);
      return false;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      return true;
    } catch (error) {
      Logger.error(`Failed to handle answer from ${userId}`, error);
      return false;
    }
  }

  async handleICECandidate(userId: string, candidate: RTCIceCandidateInit): Promise<boolean> {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      Logger.error(`No peer connection found for user: ${userId}`);
      return false;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      return true;
    } catch (error) {
      Logger.error(`Failed to add ICE candidate for ${userId}`, error);
      return false;
    }
  }

  async closePeerConnection(userId: string): Promise<void> {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
      this.connectionStates.delete(userId);
      Logger.info(`Peer connection closed for user: ${userId}`);
    }
  }

  async closeAllConnections(): Promise<void> {
    const userIds = Array.from(this.peerConnections.keys());
    for (const userId of userIds) {
      await this.closePeerConnection(userId);
    }
    Logger.info('All peer connections closed');
  }

  async getConnectionStats(userId: string): Promise<PeerConnectionStats | null> {
    const pc = this.peerConnections.get(userId);
    if (!pc) return null;

    try {
      const stats = await pc.getStats();
      let bitrate = 0;
      let packetsLost = 0;
      let frameRate = 0;
      let latency = 0;

      stats.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          bitrate = report.bytesSent ? (report.bytesSent * 8) / 1000 : 0;
          frameRate = report.framesPerSecond || 0;
        }
        if (report.type === 'remote-inbound-rtp') {
          packetsLost = report.packetsLost || 0;
          latency = report.roundTripTime ? report.roundTripTime * 1000 : 0;
        }
      });

      return { bitrate, latency, frameRate, packetsLost };
    } catch (error) {
      Logger.error(`Failed to get stats for ${userId}`, error);
      return null;
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectionStates.entries())
      .filter(([_, state]) => state.connectionState === 'connected')
      .map(([userId]) => userId);
  }

  getAllUsers(): string[] {
    return Array.from(this.peerConnections.keys());
  }

  getConnectionState(userId: string): PeerConnection | undefined {
    return this.connectionStates.get(userId);
  }

  getConnectionCount(): number {
    return this.getConnectedUsers().length;
  }
}
