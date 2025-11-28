import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionTracker } from './ConnectionTracker';

describe('ConnectionTracker', () => {
  let tracker: ConnectionTracker;

  beforeEach(() => {
    tracker = new ConnectionTracker();
  });

  describe('addConnection', () => {
    it('should add a new connection', () => {
      tracker.addConnection('user1');
      expect(tracker.getTotalConnectionCount()).toBe(1);
    });

    it('should add multiple unique connections', () => {
      tracker.addConnection('user1');
      tracker.addConnection('user2');
      tracker.addConnection('user3');
      expect(tracker.getTotalConnectionCount()).toBe(3);
    });

    it('should return connection info', () => {
      const info = tracker.addConnection('user1');
      expect(info.userId).toBe('user1');
      expect(info.connectionState).toBe('connecting');
    });
  });

  describe('removeConnection', () => {
    it('should remove an existing connection', () => {
      tracker.addConnection('user1');
      tracker.addConnection('user2');
      tracker.removeConnection('user1');
      expect(tracker.getTotalConnectionCount()).toBe(1);
    });

    it('should handle removing non-existent connection', () => {
      tracker.addConnection('user1');
      tracker.removeConnection('user2');
      expect(tracker.getTotalConnectionCount()).toBe(1);
    });
  });

  describe('getConnection', () => {
    it('should return connection info for existing user', () => {
      tracker.addConnection('user1');
      const connection = tracker.getConnection('user1');
      expect(connection).toBeDefined();
      expect(connection?.userId).toBe('user1');
    });

    it('should return undefined for non-existent user', () => {
      const connection = tracker.getConnection('user1');
      expect(connection).toBeUndefined();
    });
  });

  describe('updateConnectionState', () => {
    it('should update connection state', () => {
      tracker.addConnection('user1');
      tracker.updateConnectionState('user1', 'connected');
      const connection = tracker.getConnection('user1');
      expect(connection?.connectionState).toBe('connected');
    });

    it('should handle updating non-existent connection', () => {
      // Should not throw
      tracker.updateConnectionState('user1', 'connected');
      expect(tracker.getTotalConnectionCount()).toBe(0);
    });
  });

  describe('getAllConnections', () => {
    it('should return all connections', () => {
      tracker.addConnection('user1');
      tracker.addConnection('user2');
      const connections = tracker.getAllConnections();
      expect(connections).toHaveLength(2);
    });

    it('should return empty array when no connections', () => {
      const connections = tracker.getAllConnections();
      expect(connections).toHaveLength(0);
    });
  });

  describe('getActiveConnections', () => {
    it('should return only connected users', () => {
      tracker.addConnection('user1');
      tracker.addConnection('user2');
      tracker.updateConnectionState('user1', 'connected');
      const active = tracker.getActiveConnections();
      expect(active).toHaveLength(1);
      expect(active[0].userId).toBe('user1');
    });
  });

  describe('getConnectionCount', () => {
    it('should return count of active connections', () => {
      tracker.addConnection('user1');
      tracker.addConnection('user2');
      tracker.updateConnectionState('user1', 'connected');
      expect(tracker.getConnectionCount()).toBe(1);
    });
  });

  describe('event callback', () => {
    it('should call callback on connection state change to connected', () => {
      const callback = vi.fn();
      tracker.setEventCallback(callback);
      tracker.addConnection('user1');
      tracker.updateConnectionState('user1', 'connected');
      expect(callback).toHaveBeenCalledWith('connected', expect.objectContaining({ userId: 'user1' }));
    });

    it('should call callback on disconnection', () => {
      const callback = vi.fn();
      tracker.setEventCallback(callback);
      tracker.addConnection('user1');
      tracker.removeConnection('user1');
      expect(callback).toHaveBeenCalledWith('disconnected', expect.objectContaining({ userId: 'user1' }));
    });
  });

  describe('clearAllConnections', () => {
    it('should remove all connections', () => {
      tracker.addConnection('user1');
      tracker.addConnection('user2');
      tracker.clearAllConnections();
      expect(tracker.getTotalConnectionCount()).toBe(0);
    });
  });

  describe('isUserConnected', () => {
    it('should return true for connected user', () => {
      tracker.addConnection('user1');
      tracker.updateConnectionState('user1', 'connected');
      expect(tracker.isUserConnected('user1')).toBe(true);
    });

    it('should return false for non-connected user', () => {
      tracker.addConnection('user1');
      expect(tracker.isUserConnected('user1')).toBe(false);
    });

    it('should return false for non-existent user', () => {
      expect(tracker.isUserConnected('user1')).toBe(false);
    });
  });
});
