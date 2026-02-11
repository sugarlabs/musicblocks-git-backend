import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleCreatePR } from '../../src/controllers/pullRequest';

jest.mock('../../src/services/pullRequestService');

import { createPRFromFork } from '../../src/services/pullRequestService';

const mockCreatePRFromFork = jest.mocked(createPRFromFork);

describe('handleCreatePR', () => {
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

  describe('successful PR creation', () => {
    it('should create a PR with valid input', async () => {
      const prResult = {
        html_url: 'https://github.com/org/repo/pull/1',
        number: 1,
        title: 'Update projectData.json from fork',
      };
      mockCreatePRFromFork.mockResolvedValue(prResult as never);

      mockRequest = {
        body: {
          forkRepo: 'fork-my-repo-uuid',
          updatedProjectData: { notes: ['C', 'D', 'E'] },
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockCreatePRFromFork).toHaveBeenCalledWith({
        forkRepo: 'fork-my-repo-uuid',
        updatedProjectData: { notes: ['C', 'D', 'E'] },
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        prUrl: 'https://github.com/org/repo/pull/1',
      });
    });

    it('should pass complex project data to service', async () => {
      const updatedProjectData = {
        tracks: [
          { name: 'Piano', notes: ['C4', 'D4', 'E4'] },
          { name: 'Bass', notes: ['C2', 'G2'] },
        ],
        settings: { tempo: 140 },
      };
      const prResult = {
        html_url: 'https://github.com/org/repo/pull/2',
        number: 2,
        title: 'Update projectData.json from fork',
      };
      mockCreatePRFromFork.mockResolvedValue(prResult as never);

      mockRequest = {
        body: {
          forkRepo: 'fork-complex-repo-uuid',
          updatedProjectData,
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockCreatePRFromFork).toHaveBeenCalledWith({
        forkRepo: 'fork-complex-repo-uuid',
        updatedProjectData,
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        prUrl: 'https://github.com/org/repo/pull/2',
      });
    });
  });

  describe('input validation', () => {
    it('should return 400 when forkRepo is missing', async () => {
      mockRequest = {
        body: {
          updatedProjectData: { notes: ['C'] },
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'forkRepo and updatedProjectData are required.',
      });
    });

    it('should return 400 when updatedProjectData is missing', async () => {
      mockRequest = {
        body: {
          forkRepo: 'fork-my-repo-uuid',
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'forkRepo and updatedProjectData are required.',
      });
    });

    it('should return 400 when both fields are missing', async () => {
      mockRequest = {
        body: {},
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'forkRepo and updatedProjectData are required.',
      });
    });
  });

  describe('error handling', () => {
    it('should return 500 when createPRFromFork throws an error', async () => {
      mockCreatePRFromFork.mockRejectedValue(new Error('GitHub API error'));

      mockRequest = {
        body: {
          forkRepo: 'fork-my-repo-uuid',
          updatedProjectData: { notes: ['C'] },
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create PR' });
    });

    it('should log the error when createPRFromFork throws', async () => {
      const error = new Error('Invalid forkedFrom URL');
      mockCreatePRFromFork.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockRequest = {
        body: {
          forkRepo: 'fork-my-repo-uuid',
          updatedProjectData: { notes: ['C'] },
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to create PR:', error);
      consoleSpy.mockRestore();
    });

    it('should handle non-fork repository error', async () => {
      mockCreatePRFromFork.mockRejectedValue(
        new Error('This repository is not a fork, Cannot create a PR to base repo')
      );

      mockRequest = {
        body: {
          forkRepo: 'not-a-fork-repo',
          updatedProjectData: { notes: ['C'] },
        },
      };

      await handleCreatePR(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create PR' });
    });
  });
});
