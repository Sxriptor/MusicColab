import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './RoomManager';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createRoom', () => {
    it('should create a room with a valid room code', () => {
      const room = roomManager.createRoom();
      expect(room).toBeDefined();
      expect(room.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should set the room as not capturing initially', () => {
      const room = roomManager.createRoom();
      expect(room.isCapturing).toBe(false);
    });
  });

  describe('getRoomCode', () => {
    it('should return empty string before room is created', () => {
      expect(roomManager.getRoomCode()).toBe('');
    });

    it('should return room code after room is created', () => {
      roomManager.createRoom();
      const code = roomManager.getRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  describe('setCapturing', () => {
    it('should update capturing state', () => {
      roomManager.createRoom();
      roomManager.setCapturing(true);
      expect(roomManager.isCapturing()).toBe(true);
    });

    it('should handle setting capturing without room', () => {
      // Should not throw
      roomManager.setCapturing(true);
      expect(roomManager.isCapturing()).toBe(false);
    });
  });

  describe('closeRoom', () => {
    it('should close the room', () => {
      roomManager.createRoom();
      roomManager.closeRoom();
      expect(roomManager.getRoomCode()).toBe('');
    });
  });

  describe('getRoom', () => {
    it('should return null before room is created', () => {
      expect(roomManager.getRoom()).toBeNull();
    });

    it('should return room after creation', () => {
      roomManager.createRoom();
      expect(roomManager.getRoom()).not.toBeNull();
    });
  });
});
