export interface VideoStats {
  frameRate: number;
  bitrate: number;
  resolution: { width: number; height: number };
  codec: string;
}

export interface AudioStats {
  bitrate: number;
  codec: string;
  sampleRate: number;
}

export interface ConnectionStats {
  latency: number;
  packetsLost: number;
  jitter: number;
}

export interface StreamStats {
  timestamp: number;
  videoStats: VideoStats;
  audioStats: AudioStats;
  connectionStats: ConnectionStats;
}
