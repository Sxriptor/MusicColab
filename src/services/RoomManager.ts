import { Room, PeerConnection } from '../models/Room';
import { RoomCodeGenerator } from './RoomCodeGenerator';
import { Logger } from '../utils/logger';

export class RoomManager {
  private currentRoom: Room | null = null;
  private hostId: string;

  constructor(hostId?: string) {
    this.hostId = hostId || this.generateHostId();
  }

  private generateHostId(): string {
    return `host_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createRoom(): Room {
    const roomCode = RoomCodeGenerator.generate();
    this.currentRoom = new Room(roomCode, this.hostId);
    Logger.info(`Room created with code: ${roomCode}`);
    return this.currentRoom;
  }

  getRoom(): Room | null {
    return this.currentRoom;
  }

  getRoomCode(): string {
    return this.currentRoom?.roomCode || '';
  }

  addUser(peerConnection: PeerConnection): void {
    if (this.currentRoom) {
      this.currentRoom.addUser(peerConnection);
      Logger.info(`User ${peerConnection.userId} added to room`);
    }
  }

  removeUser(userId: string): void {
    if (this.currentRoom) {
      this.currentRoom.removeUser(userId);
      Logger.info(`User ${userId} removed from room`);
    }
  }

  getUser(userId: string): PeerConnection | undefined {
    return this.currentRoom?.getUser(userId);
  }

  getConnectedUsers(): PeerConnection[] {
    return this.currentRoom?.connectedUsers || [];
  }

  getConnectionCount(): number {
    return this.currentRoom?.connectedUsers.length || 0;
  }

  setCapturing(isCapturing: boolean): void {
    if (this.currentRoom) {
      this.currentRoom.isCapturing = isCapturing;
    }
  }

  isCapturing(): boolean {
    return this.currentRoom?.isCapturing || false;
  }

  setDisplayId(displayId: string): void {
    if (this.currentRoom) {
      this.currentRoom.displayId = displayId;
    }
  }

  closeRoom(): void {
    if (this.currentRoom) {
      Logger.info(`Room ${this.currentRoom.roomCode} closed`);
      this.currentRoom = null;
    }
  }

  isRoomActive(): boolean {
    return this.currentRoom !== null;
  }
}
