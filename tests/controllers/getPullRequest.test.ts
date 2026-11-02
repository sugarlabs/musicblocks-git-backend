import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleGetOpenPullRequests } from '../../src/controllers/getPullRequest';

jest.mock('../../src/services/getPullReq');

import { getOpenPullRequestsWithProjectData } from '../../src/services/getPullReq';

const mockGetOpenPullRequestsWithProjectData = jest.mocked(getOpenPullRequestsWithProjectData);

describe('handleGetOpenPullRequests', () => {
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

  describe('successful retrieval', () => {
    it('should return pull requests with project data for a valid repo', async () => {
      const prData = [
        {
          pr: { number: 1, title: 'Update notes' },
          projectData: { notes: ['C', 'D'] },
        },
      ];
      mockGetOpenPullRequestsWithProjectData.mockResolvedValue(prData as never);

      mockRequest = {
        body: {
          repo: 'my-repo',
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockGetOpenPullRequestsWithProjectData).toHaveBeenCalledWith('my-repo');
      expect(mockJson).toHaveBeenCalledWith(prData);
    });

    it('should handle empty pull request list', async () => {
      mockGetOpenPullRequestsWithProjectData.mockResolvedValue([] as never);

      mockRequest = {
        body: {
          repo: 'empty-repo',
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith([]);
    });

    it('should handle multiple pull requests', async () => {
      const prData = [
        { pr: { number: 1, title: 'PR 1' }, projectData: { notes: ['C'] } },
        { pr: { number: 2, title: 'PR 2' }, projectData: null },
        { pr: { number: 3, title: 'PR 3' }, projectData: { notes: ['E', 'F'] } },
      ];
      mockGetOpenPullRequestsWithProjectData.mockResolvedValue(prData as never);

      mockRequest = {
        body: {
          repo: 'multi-pr-repo',
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(prData);
    });
  });

  describe('input validation', () => {
    it('should return 400 when repo is missing', async () => {
      mockRequest = {
        body: {},
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: "Missing or invalid 'repo' query parameter.",
      });
    });

    it('should return 400 when repo is not a string (number)', async () => {
      mockRequest = {
        body: {
          repo: 123,
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: "Missing or invalid 'repo' query parameter.",
      });
    });

    it('should return 400 when repo is null', async () => {
      mockRequest = {
        body: {
          repo: null,
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: "Missing or invalid 'repo' query parameter.",
      });
    });
  });

  describe('error handling', () => {
    it('should return 500 when service throws an error', async () => {
      mockGetOpenPullRequestsWithProjectData.mockRejectedValue(
        new Error('GitHub API error')
      );

      mockRequest = {
        body: {
          repo: 'my-repo',
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch pull requests.' });
    });

    it('should log the error when service throws', async () => {
      const error = new Error('Network failure');
      mockGetOpenPullRequestsWithProjectData.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockRequest = {
        body: {
          repo: 'my-repo',
        },
      };

      await handleGetOpenPullRequests(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });
  });
});
