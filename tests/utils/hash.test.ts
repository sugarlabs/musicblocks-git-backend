import { jest } from '@jest/globals';
import { generateKey, hashKey, createMetaData } from '../../src/utils/hash';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHash: jest.fn(),
}));

import crypto from 'crypto';

const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('Hash Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate a random key using crypto.randomBytes', () => {
      const mockRandomBytes = Buffer.from('test-random-bytes-32-chars-long');
      (mockCrypto.randomBytes as unknown as jest.MockedFunction<() => Buffer>).mockReturnValue(mockRandomBytes);

      const result = generateKey();

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe('746573742d72616e646f6d2d62797465732d33322d63686172732d6c6f6e67');
    });

    it('should return a hex string', () => {
      const mockRandomBytes = Buffer.from('abcdef1234567890abcdef1234567890', 'hex');
      (mockCrypto.randomBytes as unknown as jest.MockedFunction<() => Buffer>).mockReturnValue(mockRandomBytes);

      const result = generateKey();

      expect(result).toBe('abcdef1234567890abcdef1234567890');
    });

    it('should handle different random values', () => {
      const mockRandomBytes1 = Buffer.from('11111111111111111111111111111111', 'hex');
      const mockRandomBytes2 = Buffer.from('22222222222222222222222222222222', 'hex');
      
      (mockCrypto.randomBytes as unknown as jest.MockedFunction<() => Buffer>)
        .mockReturnValueOnce(mockRandomBytes1)
        .mockReturnValueOnce(mockRandomBytes2);

      const result1 = generateKey();
      const result2 = generateKey();

      expect(result1).toBe('11111111111111111111111111111111');
      expect(result2).toBe('22222222222222222222222222222222');
      expect(result1).not.toBe(result2);
    });
  });

  describe('hashKey', () => {
    it('should hash a key using SHA-256', () => {
      const mockHash = { update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-result'),
      };
      mockCrypto.createHash.mockReturnValue(mockHash as never);

      const result = hashKey('test-key');

      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith('test-key');
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(result).toBe('hashed-result');
    });

    it('should hash different keys correctly', () => {
      const mockHash1 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash1'),
      };
      const mockHash2 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash2'),
      };

      mockCrypto.createHash
        .mockReturnValueOnce(mockHash1 as never)
        .mockReturnValueOnce(mockHash2 as never);

      const result1 = hashKey('key1');
      const result2 = hashKey('key2');

      expect(result1).toBe('hash1');
      expect(result2).toBe('hash2');
      expect(mockHash1.update).toHaveBeenCalledWith('key1');
      expect(mockHash2.update).toHaveBeenCalledWith('key2');
    });

    it('should handle empty string keys', () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('empty-hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHash as never);

      const result = hashKey('');

      expect(mockHash.update).toHaveBeenCalledWith('');
      expect(result).toBe('empty-hash');
    });

    it('should handle special characters in keys', () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('special-hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHash as never);

      const specialKey = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = hashKey(specialKey);

      expect(mockHash.update).toHaveBeenCalledWith(specialKey);
      expect(result).toBe('special-hash');
    });
  });

  describe('createMetaData', () => {
    it('should create metadata with current timestamp and provided values', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as never);

      const result = createMetaData('test-hash', 'piano');

      expect(result).toEqual({
        createdAt: '2024-01-01T12:00:00.000Z',
        theme: 'piano',
        hashedKey: 'test-hash'
      });

      jest.restoreAllMocks();
    });

    it('should handle different themes', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as never);

      const result1 = createMetaData('hash1', 'guitar');
      const result2 = createMetaData('hash2', 'drums');

      expect(result1.theme).toBe('guitar');
      expect(result2.theme).toBe('drums');
      expect(result1.hashedKey).toBe('hash1');
      expect(result2.hashedKey).toBe('hash2');

      jest.restoreAllMocks();
    });

    it('should handle empty theme strings', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as never);

      const result = createMetaData('test-hash', '');

      expect(result).toEqual({
        createdAt: '2024-01-01T12:00:00.000Z',
        theme: '',
        hashedKey: 'test-hash'
      });

      jest.restoreAllMocks();
    });

    it('should handle special characters in theme', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as never);

      const specialTheme = 'rock & roll!';
      const result = createMetaData('test-hash', specialTheme);

      expect(result).toEqual({
        createdAt: '2024-01-01T12:00:00.000Z',
        theme: 'rock & roll!',
        hashedKey: 'test-hash'
      });

      jest.restoreAllMocks();
    });

    it('should use current time when called multiple times', () => {
      const mockDate1 = new Date('2024-01-01T12:00:00.000Z');
      const mockDate2 = new Date('2024-01-01T12:01:00.000Z');
      
      jest.spyOn(global, 'Date')
        .mockImplementationOnce(() => mockDate1 as never)
        .mockImplementationOnce(() => mockDate2 as never);

      const result1 = createMetaData('hash1', 'theme1');
      const result2 = createMetaData('hash2', 'theme2');

      expect(result1.createdAt).toBe('2024-01-01T12:00:00.000Z');
      expect(result2.createdAt).toBe('2024-01-01T12:01:00.000Z');

      jest.restoreAllMocks();
    });
  });

  describe('integration tests', () => {
    it('should work together in a typical workflow', () => {
      const mockRandomBytes = Buffer.from('test-random-bytes-32-chars-long');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-key-result'),
      };
      const mockDate = new Date('2024-01-01T12:00:00.000Z');

      (mockCrypto.randomBytes as unknown as jest.MockedFunction<() => Buffer>).mockReturnValue(mockRandomBytes);
      mockCrypto.createHash.mockReturnValue(mockHash as never);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as never);

      const key = generateKey();
      const hashedKey = hashKey(key);
      const metadata = createMetaData(hashedKey, 'jazz');

      expect(key).toBe('746573742d72616e646f6d2d62797465732d33322d63686172732d6c6f6e67');
      expect(hashedKey).toBe('hashed-key-result');
      expect(metadata).toEqual({
        createdAt: '2024-01-01T12:00:00.000Z',
        theme: 'jazz',
        hashedKey: 'hashed-key-result'
      });

      jest.restoreAllMocks();
    });
  });
});
