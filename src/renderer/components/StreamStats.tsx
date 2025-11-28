import React from 'react';

export interface StreamStatsData {
  bitrate: number;
  latency: number;
  frameRate: number;
  packetsLost: number;
}

interface StreamStatsProps {
  stats: StreamStatsData;
}

export const StreamStats: React.FC<StreamStatsProps> = ({ stats }) => {
  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(2)} Mbps`;
    }
    return `${(bitrate / 1000).toFixed(0)} Kbps`;
  };

  const getLatencyClass = (latency: number): string => {
    if (latency <= 50) return 'excellent';
    if (latency <= 100) return 'good';
    if (latency <= 150) return 'fair';
    return 'poor';
  };

  return (
    <div className="stream-stats">
      <h3>Stream Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Bitrate</span>
          <span className="stat-value">{formatBitrate(stats.bitrate)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Latency</span>
          <span className={`stat-value ${getLatencyClass(stats.latency)}`}>
            {stats.latency.toFixed(0)} ms
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Frame Rate</span>
          <span className="stat-value">{stats.frameRate.toFixed(0)} FPS</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Packets Lost</span>
          <span className="stat-value">{stats.packetsLost}</span>
        </div>
      </div>
    </div>
  );
};
