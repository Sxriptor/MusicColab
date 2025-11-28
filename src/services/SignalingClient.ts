import { Logger } from '../utils/logger';

export type SignalingEventType = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'user-joined'
  | 'user-left'
  | 'offer'
  | 'answer'
  | 'ice-candidate';

export interface SignalingMessage {
  type: string;
  roomCode?: string;
  userId?: string;
  data?: any;
}

export type SignalingEventCallback = (event: SignalingEventType, data?: any) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private roomCode: string = '';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000;
  private eventCallback: SignalingEventCallback | null = null;
  private messageQueue: SignalingMessage[] = [];

  setEventCallback(callback: SignalingEventCallback): void {
    this.eventCallback = callback;
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
        case 'user-joined':
          this.emitEvent('user-joined', { userId: message.userId });
          break;
        case 'user-left':
          this.emitEvent('user-left', { userId: message.userId });
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

  registerRoom(roomCode: string): void {
    this.roomCode = roomCode;
    this.sendMessage({
      type: 'register-room',
      roomCode,
    });
    Logger.info(`Registered room: ${roomCode}`);
  }

  sendOffer(userId: string, offer: RTCSessionDescriptionInit): void {
    this.sendMessage({
      type: 'offer',
      roomCode: this.roomCode,
      userId,
      data: offer,
    });
  }

  sendAnswer(userId: string, answer: RTCSessionDescriptionInit): void {
    this.sendMessage({
      type: 'answer',
      roomCode: this.roomCode,
      userId,
      data: answer,
    });
  }

  sendICECandidate(userId: string, candidate: RTCIceCandidate): void {
    this.sendMessage({
      type: 'ice-candidate',
      roomCode: this.roomCode,
      userId,
      data: candidate.toJSON(),
    });
  }

  notifyUserConnected(userId: string): void {
    this.sendMessage({
      type: 'user-connected',
      roomCode: this.roomCode,
      userId,
    });
  }

  notifyUserDisconnected(userId: string): void {
    this.sendMessage({
      type: 'user-disconnected',
      roomCode: this.roomCode,
      userId,
    });
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
      this.sendMessage({
        type: 'leave-room',
        roomCode: this.roomCode,
      });
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.roomCode = '';
    Logger.info('Disconnected from signaling server');
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getRoomCode(): string {
    return this.roomCode;
  }
}
