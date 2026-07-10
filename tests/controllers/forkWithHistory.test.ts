import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleForkWithHistory } from '../../src/controllers/forkWithHistory';

jest.mock('../../src/services/forkWithHistory');

import { forkWithHistory } from '../../src/services/forkWithHistory';

const mockForkWithHistory = jest.mocked(forkWithHistory);

describe('handleForkWithHistory', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.MockedFunction<Response['status']>;
  let mockJson: jest.MockedFunction<Response['json']>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStatus = jest.fn().mockReturnThis() as jest.MockedFunction<Response['status']>;
    mockJson = jest.fn().mockReturnThis() as jest.MockedFunction<Response['json']>;

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    } as Partial<Response>;
  });

  describe('successful fork with history', () => {
    it('should fork a project with history and return success', async () => {
      const forkResult = {
        repoName: 'my-repo-fork-uuid',
        key: 'key-123',
        success: true,
        projectData: { notes: ['C', 'D'] },
        description: 'A music project',
      };
      mockForkWithHistory.mockResolvedValue(forkResult);

      mockRequest = {
        body: {
          sourceRepo: 'my-repo',
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockForkWithHistory).toHaveBeenCalledWith('my-repo');
      expect(mockJson).toHaveBeenCalledWith({ success: true, repoUrl: forkResult });
    });

    it('should pass sourceRepo directly to forkWithHistory service', async () => {
      const forkResult = {
        repoName: 'test-repo-fork-uuid',
        key: 'key-456',
        success: true,
        projectData: { instruments: ['piano'] },
        description: 'Test project',
      };
      mockForkWithHistory.mockResolvedValue(forkResult);

      mockRequest = {
        body: {
          sourceRepo: 'test-repo',
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockForkWithHistory).toHaveBeenCalledWith('test-repo');
    });
  });

  describe('input validation', () => {
    it('should return 400 when sourceRepo is missing', async () => {
      mockRequest = {
        body: {},
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required parameters.' });
    });

    it('should return 400 when sourceRepo is undefined', async () => {
      mockRequest = {
        body: {
          sourceRepo: undefined,
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required parameters.' });
    });

    it('should return 400 when sourceRepo is empty string', async () => {
      mockRequest = {
        body: {
          sourceRepo: '',
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required parameters.' });
    });
  });

  describe('error handling', () => {
    it('should return 500 when forkWithHistory throws an error', async () => {
      mockForkWithHistory.mockRejectedValue(new Error('Clone failed'));

      mockRequest = {
        body: {
          sourceRepo: 'my-repo',
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fork with history.' });
    });

    it('should log the error when forkWithHistory throws', async () => {
      const error = new Error('Git push failed');
      mockForkWithHistory.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockRequest = {
        body: {
          sourceRepo: 'my-repo',
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith('Fork error:', error);
      consoleSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      mockForkWithHistory.mockRejectedValue(new Error('Network timeout'));

      mockRequest = {
        body: {
          sourceRepo: 'my-repo',
        },
      };

      await handleForkWithHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fork with history.' });
    });
  });
});
