import { describe, it, expect } from 'vitest';
import { RoomCodeGenerator } from './RoomCodeGenerator';

describe('RoomCodeGenerator', () => {
  describe('generate', () => {
    it('should generate a 6-character room code', () => {
      const code = RoomCodeGenerator.generate();
      expect(code).toHaveLength(6);
    });

    it('should generate codes with only uppercase letters and numbers', () => {
      const code = RoomCodeGenerator.generate();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(RoomCodeGenerator.generate());
      }
      // With 36^6 possible combinations, 100 codes should all be unique
      expect(codes.size).toBe(100);
    });
  });

  describe('isValid', () => {
    it('should return true for valid room codes', () => {
      expect(RoomCodeGenerator.isValid('ABC123')).toBe(true);
      expect(RoomCodeGenerator.isValid('ZZZZZ9')).toBe(true);
      expect(RoomCodeGenerator.isValid('000000')).toBe(true);
    });

    it('should return false for invalid room codes', () => {
      expect(RoomCodeGenerator.isValid('')).toBe(false);
      expect(RoomCodeGenerator.isValid('abc123')).toBe(false); // lowercase
      expect(RoomCodeGenerator.isValid('ABC12')).toBe(false); // too short
      expect(RoomCodeGenerator.isValid('ABC1234')).toBe(false); // too long
      expect(RoomCodeGenerator.isValid('ABC-12')).toBe(false); // special char
    });

    it('should return false for null or undefined', () => {
      expect(RoomCodeGenerator.isValid(null as any)).toBe(false);
      expect(RoomCodeGenerator.isValid(undefined as any)).toBe(false);
    });
  });
});
