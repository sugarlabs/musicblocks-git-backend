import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleForkProject } from '../../src/controllers/forkProject';

jest.mock('../../src/services/forkRepo');

import { forkRepo } from '../../src/services/forkRepo';

const mockForkRepo = jest.mocked(forkRepo);

describe('handleForkProject', () => {
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

  describe('successful fork', () => {
    it('should fork a project with valid repositoryName', async () => {
      const forkResult = {
        repoName: 'fork-my-project-uuid',
        key: 'generated-key-123',
        projectData: '{"notes":["C","D"]}',
        description: 'A music project',
      };
      mockForkRepo.mockResolvedValue(forkResult);

      mockRequest = {
        body: {
          repositoryName: 'my-project',
        },
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(mockForkRepo).toHaveBeenCalledWith('my-project');
      expect(mockJson).toHaveBeenCalledWith({
        repoName: 'fork-my-project-uuid',
        key: 'generated-key-123',
        projectData: '{"notes":["C","D"]}',
      });
    });

    it('should return correct fork data structure', async () => {
      const forkResult = {
        repoName: 'fork-test-repo-uuid',
        key: 'key-456',
        projectData: '{"instruments":["piano"]}',
        description: 'Test project',
      };
      mockForkRepo.mockResolvedValue(forkResult);

      mockRequest = {
        body: {
          repositoryName: 'test-repo',
        },
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        repoName: 'fork-test-repo-uuid',
        key: 'key-456',
        projectData: '{"instruments":["piano"]}',
      });
    });
  });

  describe('input validation', () => {
    it('should return 400 when repositoryName is missing', async () => {
      mockRequest = {
        body: {},
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 when repositoryName is undefined', async () => {
      mockRequest = {
        body: {
          repositoryName: undefined,
        },
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });
  });

  describe('error handling', () => {
    it('should return 500 when forkRepo throws an error', async () => {
      mockForkRepo.mockRejectedValue(new Error('GitHub API error'));

      mockRequest = {
        body: {
          repositoryName: 'my-project',
        },
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Could not fork repository' });
    });

    it('should log the error when forkRepo throws', async () => {
      const error = new Error('Network error');
      mockForkRepo.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockRequest = {
        body: {
          repositoryName: 'my-project',
        },
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });

    it('should handle non-Error thrown values', async () => {
      mockForkRepo.mockRejectedValue('unexpected string error');

      mockRequest = {
        body: {
          repositoryName: 'my-project',
        },
      };

      await handleForkProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Could not fork repository' });
    });
  });
});
