import { PeerConnection, PeerConnectionStats } from '../models/Room';
import { Logger } from '../utils/logger';

export interface ConnectionInfo {
  userId: string;
  connectionState: PeerConnection['connectionState'];
  connectedAt: number;
  lastActivityAt: number;
  stats: PeerConnectionStats;
}

export type ConnectionEventCallback = (event: 'connected' | 'disconnected' | 'updated', info: ConnectionInfo) => void;

export class ConnectionTracker {
  private connections: Map<string, ConnectionInfo> = new Map();
  private eventCallback: ConnectionEventCallback | null = null;

  setEventCallback(callback: ConnectionEventCallback): void {
    this.eventCallback = callback;
  }

  addConnection(userId: string): ConnectionInfo {
    const now = Date.now();
    const info: ConnectionInfo = {
      userId,
      connectionState: 'connecting',
      connectedAt: now,
      lastActivityAt: now,
      stats: {
        bitrate: 0,
        latency: 0,
        frameRate: 0,
        packetsLost: 0,
      },
    };

    this.connections.set(userId, info);
    Logger.info(`Connection added: ${userId}`);
    return info;
  }

  updateConnectionState(userId: string, state: PeerConnection['connectionState']): void {
    const info = this.connections.get(userId);
    if (info) {
      const previousState = info.connectionState;
      info.connectionState = state;
      info.lastActivityAt = Date.now();
      this.connections.set(userId, info);

      if (previousState !== 'connected' && state === 'connected') {
        this.emitEvent('connected', info);
      } else if (previousState === 'connected' && state !== 'connected') {
        this.emitEvent('disconnected', info);
      } else {
        this.emitEvent('updated', info);
      }

      Logger.info(`Connection state updated: ${userId} -> ${state}`);
    }
  }

  updateConnectionStats(userId: string, stats: PeerConnectionStats): void {
    const info = this.connections.get(userId);
    if (info) {
      info.stats = stats;
      info.lastActivityAt = Date.now();
      this.connections.set(userId, info);
      this.emitEvent('updated', info);
    }
  }

  removeConnection(userId: string): void {
    const info = this.connections.get(userId);
    if (info) {
      this.connections.delete(userId);
      this.emitEvent('disconnected', info);
      Logger.info(`Connection removed: ${userId}`);
    }
  }

  getConnection(userId: string): ConnectionInfo | undefined {
    return this.connections.get(userId);
  }

  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  getActiveConnections(): ConnectionInfo[] {
    return this.getAllConnections().filter(
      (info) => info.connectionState === 'connected'
    );
  }

  getConnectionCount(): number {
    return this.getActiveConnections().length;
  }

  getTotalConnectionCount(): number {
    return this.connections.size;
  }

  isUserConnected(userId: string): boolean {
    const info = this.connections.get(userId);
    return info?.connectionState === 'connected';
  }

  getConnectionDuration(userId: string): number {
    const info = this.connections.get(userId);
    if (!info) return 0;
    return Date.now() - info.connectedAt;
  }

  clearAllConnections(): void {
    const connections = this.getAllConnections();
    connections.forEach((info) => {
      this.emitEvent('disconnected', info);
    });
    this.connections.clear();
    Logger.info('All connections cleared');
  }

  private emitEvent(event: 'connected' | 'disconnected' | 'updated', info: ConnectionInfo): void {
    if (this.eventCallback) {
      this.eventCallback(event, info);
    }
  }

  getAverageStats(): PeerConnectionStats {
    const activeConnections = this.getActiveConnections();
    if (activeConnections.length === 0) {
      return { bitrate: 0, latency: 0, frameRate: 0, packetsLost: 0 };
    }

    const totals = activeConnections.reduce(
      (acc, info) => ({
        bitrate: acc.bitrate + info.stats.bitrate,
        latency: acc.latency + info.stats.latency,
        frameRate: acc.frameRate + info.stats.frameRate,
        packetsLost: acc.packetsLost + info.stats.packetsLost,
      }),
      { bitrate: 0, latency: 0, frameRate: 0, packetsLost: 0 }
    );

    const count = activeConnections.length;
    return {
      bitrate: totals.bitrate / count,
      latency: totals.latency / count,
      frameRate: totals.frameRate / count,
      packetsLost: totals.packetsLost / count,
    };
  }
}
