import { Logger } from '../utils/logger';

export type SignalingEventType = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'user-joined'
  | 'user-left'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'host-disconnected'
  | 'registered';

export interface SignalingMessage {
  type: string;
  userId?: string;
  clientId?: string;
  data?: any;
  hostConnected?: boolean;
  role?: string;
}

export type SignalingEventCallback = (event: SignalingEventType, data?: any) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private clientId: string = '';
  private isHost: boolean = false;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000;
  private eventCallback: SignalingEventCallback | null = null;
  private messageQueue: SignalingMessage[] = [];

  setEventCallback(callback: SignalingEventCallback): void {
    this.eventCallback = callback;
  }

  /**
   * Connect to the signaling server as a host
   * @param host IP address of the signaling server
   * @param port Port number of the signaling server
   */
  async connectAsHost(host: string, port: number): Promise<boolean> {
    const serverUrl = `ws://${host}:${port}`;
    this.isHost = true;
    const connected = await this.connect(serverUrl);
    if (connected) {
      // Register as host
      this.sendMessage({ type: 'register-host' });
    }
    return connected;
  }

  /**
   * Connect to the signaling server as a remote user
   * @param host IP address of the signaling server
   * @param port Port number of the signaling server
   */
  async connectAsRemote(host: string, port: number): Promise<boolean> {
    const serverUrl = `ws://${host}:${port}`;
    this.isHost = false;
    return this.connect(serverUrl);
  }

  async connect(serverUrl: string): Promise<boolean> {
    this.serverUrl = serverUrl;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          Logger.info(`Connected to signaling server: ${serverUrl}`);
          this.emitEvent('connected');
          this.flushMessageQueue();
          resolve(true);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          Logger.info('Disconnected from signaling server');
          this.emitEvent('disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          Logger.error('Signaling server error', error);
          this.emitEvent('error', error);
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        Logger.error('Failed to connect to signaling server', error);
        resolve(false);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: SignalingMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'welcome':
          // Server assigned us a client ID
          this.clientId = message.clientId || '';
          Logger.info(`Received client ID: ${this.clientId}, host connected: ${message.hostConnected}`);
          break;
        case 'registered':
          // Host registration confirmed
          Logger.info(`Registered as: ${message.role}`);
          this.emitEvent('registered', { role: message.role });
          break;
        case 'user-joined':
          this.emitEvent('user-joined', { userId: message.userId });
          break;
        case 'user-left':
          this.emitEvent('user-left', { userId: message.userId });
          break;
        case 'host-disconnected':
          this.emitEvent('host-disconnected');
          break;
        case 'offer':
          this.emitEvent('offer', { userId: message.userId, offer: message.data });
          break;
        case 'answer':
          this.emitEvent('answer', { userId: message.userId, answer: message.data });
          break;
        case 'ice-candidate':
          this.emitEvent('ice-candidate', { userId: message.userId, candidate: message.data });
          break;
        case 'pong':
          // Heartbeat response, ignore
          break;
        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error('Failed to parse signaling message', error);
    }
  }

  private emitEvent(event: SignalingEventType, data?: any): void {
    if (this.eventCallback) {
      this.eventCallback(event, data);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      Logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    Logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect(this.serverUrl);
    }, delay);
  }

  /**
   * Send SDP offer to a specific user (host to remote) or to host (remote to host)
   */
  sendOffer(userId: string | null, offer: RTCSessionDescriptionInit): void {
    const message: SignalingMessage = {
      type: 'offer',
      data: offer,
    };
    if (userId) {
      message.userId = userId;
    }
    this.sendMessage(message);
  }

  /**
   * Send SDP answer to a specific user (host to remote) or to host (remote to host)
   */
  sendAnswer(userId: string | null, answer: RTCSessionDescriptionInit): void {
    const message: SignalingMessage = {
      type: 'answer',
      data: answer,
    };
    if (userId) {
      message.userId = userId;
    }
    this.sendMessage(message);
  }

  /**
   * Send ICE candidate to a specific user (host to remote) or to host (remote to host)
   */
  sendICECandidate(userId: string | null, candidate: RTCIceCandidate): void {
    const message: SignalingMessage = {
      type: 'ice-candidate',
      data: candidate.toJSON(),
    };
    if (userId) {
      message.userId = userId;
    }
    this.sendMessage(message);
  }

  /**
   * Send a ping to keep the connection alive
   */
  sendPing(): void {
    this.sendMessage({ type: 'ping' });
  }

  private sendMessage(message: SignalingMessage): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.clientId = '';
    Logger.info('Disconnected from signaling server');
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getClientId(): string {
    return this.clientId;
  }

  getIsHost(): boolean {
    return this.isHost;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}
