import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleCreateBranch } from '../../src/controllers/createBranch';

jest.mock('../../src/services/createBranch');

import { createBranch } from '../../src/services/createBranch';

const mockCreateBranch = jest.mocked(createBranch);

describe('handleCreateBranch', () => {
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

  describe('successful branch creation', () => {
    it('should create a branch with valid input', async () => {
      const branchResult = {
        branchName: 'feature-x',
        sha: 'abc123',
        url: 'https://api.github.com/repos/org/repo/git/refs/heads/feature-x',
      };
      mockCreateBranch.mockResolvedValue(branchResult);

      mockRequest = {
        body: {
          repoName: 'my-repo',
          branchName: 'feature-x',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockCreateBranch).toHaveBeenCalledWith('my-repo', 'feature-x', 'main');
      expect(mockJson).toHaveBeenCalledWith({ success: true, branch: branchResult });
    });

    it('should use provided branchedFrom parameter', async () => {
      const branchResult = {
        branchName: 'hotfix',
        sha: 'def456',
        url: 'https://api.github.com/repos/org/repo/git/refs/heads/hotfix',
      };
      mockCreateBranch.mockResolvedValue(branchResult);

      mockRequest = {
        body: {
          repoName: 'my-repo',
          branchName: 'hotfix',
          branchedFrom: 'develop',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockCreateBranch).toHaveBeenCalledWith('my-repo', 'hotfix', 'develop');
      expect(mockJson).toHaveBeenCalledWith({ success: true, branch: branchResult });
    });

    it('should default branchedFrom to main when not provided', async () => {
      const branchResult = {
        branchName: 'new-branch',
        sha: 'ghi789',
        url: 'https://api.github.com/repos/org/repo/git/refs/heads/new-branch',
      };
      mockCreateBranch.mockResolvedValue(branchResult);

      mockRequest = {
        body: {
          repoName: 'my-repo',
          branchName: 'new-branch',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockCreateBranch).toHaveBeenCalledWith('my-repo', 'new-branch', 'main');
    });
  });

  describe('input validation', () => {
    it('should return 400 when repoName is missing', async () => {
      mockRequest = {
        body: {
          branchName: 'feature-x',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing required fields: repoName, branchName',
      });
      expect(mockCreateBranch).not.toHaveBeenCalled();
    });

    it('should return 400 when branchName is missing', async () => {
      mockRequest = {
        body: {
          repoName: 'my-repo',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing required fields: repoName, branchName',
      });
      expect(mockCreateBranch).not.toHaveBeenCalled();
    });

    it('should return 400 when both repoName and branchName are missing', async () => {
      mockRequest = {
        body: {},
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing required fields: repoName, branchName',
      });
      expect(mockCreateBranch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 500 when createBranch returns falsy result', async () => {
      mockCreateBranch.mockResolvedValue(undefined as never);

      mockRequest = {
        body: {
          repoName: 'my-repo',
          branchName: 'feature-x',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create branch' });
    });

    it('should return 500 when createBranch throws an error', async () => {
      mockCreateBranch.mockRejectedValue(new Error('GitHub API error'));

      mockRequest = {
        body: {
          repoName: 'my-repo',
          branchName: 'feature-x',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Could not create branch' });
    });

    it('should log the error when createBranch throws', async () => {
      const error = new Error('Network failure');
      mockCreateBranch.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockRequest = {
        body: {
          repoName: 'my-repo',
          branchName: 'feature-x',
        },
      };

      await handleCreateBranch(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith('Error creating branch:', error);
      consoleSpy.mockRestore();
    });
  });
});
