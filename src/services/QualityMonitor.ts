import { WebRTCConnectionManager } from './WebRTCConnectionManager';
import { StreamBroadcaster } from './StreamBroadcaster';
import { ConnectionTracker } from './ConnectionTracker';
import { PeerConnectionStats } from '../models/Room';
import { Logger } from '../utils/logger';

export interface QualityThresholds {
  maxLatency: number;
  minFrameRate: number;
  maxPacketLoss: number;
}

export interface AdaptationConfig {
  checkInterval: number;
  bitrateStep: number;
  minBitrate: number;
  maxBitrate: number;
}

export class QualityMonitor {
  private connectionManager: WebRTCConnectionManager;
  private broadcaster: StreamBroadcaster;
  private connectionTracker: ConnectionTracker;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  private thresholds: QualityThresholds = {
    maxLatency: 150,
    minFrameRate: 24,
    maxPacketLoss: 5,
  };

  private adaptationConfig: AdaptationConfig = {
    checkInterval: 2000,
    bitrateStep: 500000,
    minBitrate: 500000,
    maxBitrate: 5000000,
  };

  private currentBitrates: Map<string, number> = new Map();

  constructor(
    connectionManager: WebRTCConnectionManager,
    broadcaster: StreamBroadcaster,
    connectionTracker: ConnectionTracker
  ) {
    this.connectionManager = connectionManager;
    this.broadcaster = broadcaster;
    this.connectionTracker = connectionTracker;
  }

  setThresholds(thresholds: Partial<QualityThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  setAdaptationConfig(config: Partial<AdaptationConfig>): void {
    this.adaptationConfig = { ...this.adaptationConfig, ...config };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.checkAllConnections();
    }, this.adaptationConfig.checkInterval);

    Logger.info('Quality monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    this.currentBitrates.clear();
    Logger.info('Quality monitoring stopped');
  }

  private async checkAllConnections(): Promise<void> {
    const users = this.connectionManager.getAllUsers();

    for (const userId of users) {
      await this.checkConnection(userId);
    }
  }

  private async checkConnection(userId: string): Promise<void> {
    const stats = await this.connectionManager.getConnectionStats(userId);
    if (!stats) return;

    // Update connection tracker with latest stats
    this.connectionTracker.updateConnectionStats(userId, stats);

    // Check if adaptation is needed
    const needsAdaptation = this.needsBitrateAdaptation(userId, stats);
    
    if (needsAdaptation.decrease) {
      await this.decreaseBitrate(userId);
    } else if (needsAdaptation.increase) {
      await this.increaseBitrate(userId);
    }
  }

  private needsBitrateAdaptation(
    userId: string,
    stats: PeerConnectionStats
  ): { increase: boolean; decrease: boolean } {
    const result = { increase: false, decrease: false };

    // Check if latency is too high
    if (stats.latency > this.thresholds.maxLatency) {
      result.decrease = true;
      Logger.info(`High latency detected for ${userId}: ${stats.latency}ms`);
    }

    // Check if frame rate is too low
    if (stats.frameRate < this.thresholds.minFrameRate && stats.frameRate > 0) {
      result.decrease = true;
      Logger.info(`Low frame rate detected for ${userId}: ${stats.frameRate}fps`);
    }

    // Check packet loss
    if (stats.packetsLost > this.thresholds.maxPacketLoss) {
      result.decrease = true;
      Logger.info(`High packet loss detected for ${userId}: ${stats.packetsLost}`);
    }

    // If all metrics are good, consider increasing bitrate
    if (
      !result.decrease &&
      stats.latency < this.thresholds.maxLatency * 0.5 &&
      stats.frameRate >= this.thresholds.minFrameRate &&
      stats.packetsLost < this.thresholds.maxPacketLoss * 0.5
    ) {
      result.increase = true;
    }

    return result;
  }

  private async decreaseBitrate(userId: string): Promise<void> {
    const currentBitrate = this.currentBitrates.get(userId) || this.adaptationConfig.maxBitrate;
    const newBitrate = Math.max(
      this.adaptationConfig.minBitrate,
      currentBitrate - this.adaptationConfig.bitrateStep
    );

    if (newBitrate !== currentBitrate) {
      this.currentBitrates.set(userId, newBitrate);
      await this.broadcaster.adaptBitrate(userId, newBitrate);
      Logger.info(`Decreased bitrate for ${userId}: ${currentBitrate} -> ${newBitrate}`);
    }
  }

  private async increaseBitrate(userId: string): Promise<void> {
    const currentBitrate = this.currentBitrates.get(userId) || this.adaptationConfig.minBitrate;
    const newBitrate = Math.min(
      this.adaptationConfig.maxBitrate,
      currentBitrate + this.adaptationConfig.bitrateStep
    );

    if (newBitrate !== currentBitrate) {
      this.currentBitrates.set(userId, newBitrate);
      await this.broadcaster.adaptBitrate(userId, newBitrate);
      Logger.info(`Increased bitrate for ${userId}: ${currentBitrate} -> ${newBitrate}`);
    }
  }

  async getLatency(userId: string): Promise<number> {
    const stats = await this.connectionManager.getConnectionStats(userId);
    return stats?.latency || 0;
  }

  async getFrameRate(userId: string): Promise<number> {
    const stats = await this.connectionManager.getConnectionStats(userId);
    return stats?.frameRate || 0;
  }

  getCurrentBitrate(userId: string): number {
    return this.currentBitrates.get(userId) || this.adaptationConfig.maxBitrate;
  }

  isWithinLatencyBounds(latency: number): boolean {
    return latency <= this.thresholds.maxLatency;
  }

  isWithinFrameRateBounds(frameRate: number): boolean {
    return frameRate >= this.thresholds.minFrameRate;
  }
}
