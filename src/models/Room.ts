export interface PeerConnectionStats {
  bitrate: number;
  latency: number;
  frameRate: number;
  packetsLost: number;
}

export interface PeerConnection {
  userId: string;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
  createdAt: number;
  stats: PeerConnectionStats;
}

export interface RoomStats {
  totalConnections: number;
  averageBitrate: number;
  averageLatency: number;
}

export class Room {
  roomCode: string;
  hostId: string;
  createdAt: number;
  connectedUsers: PeerConnection[] = [];
  displayId: string = '';
  isCapturing: boolean = false;
  stats: RoomStats = {
    totalConnections: 0,
    averageBitrate: 0,
    averageLatency: 0,
  };

  constructor(roomCode: string, hostId: string) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.createdAt = Date.now();
  }

  addUser(peerConnection: PeerConnection): void {
    this.connectedUsers.push(peerConnection);
    this.updateStats();
  }

  removeUser(userId: string): void {
    this.connectedUsers = this.connectedUsers.filter(
      (peer) => peer.userId !== userId
    );
    this.updateStats();
  }

  getUser(userId: string): PeerConnection | undefined {
    return this.connectedUsers.find((peer) => peer.userId === userId);
  }

  private updateStats(): void {
    this.stats.totalConnections = this.connectedUsers.length;
    if (this.connectedUsers.length > 0) {
      const totalBitrate = this.connectedUsers.reduce(
        (sum, peer) => sum + peer.stats.bitrate,
        0
      );
      const totalLatency = this.connectedUsers.reduce(
        (sum, peer) => sum + peer.stats.latency,
        0
      );
      this.stats.averageBitrate = totalBitrate / this.connectedUsers.length;
      this.stats.averageLatency = totalLatency / this.connectedUsers.length;
    }
  }
}
