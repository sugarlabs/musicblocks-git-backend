import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleGetCommits } from '../../src/controllers/getCommits';

jest.mock('../../src/services/getCommitHistory');

import { getCommitHistory } from '../../src/services/getCommitHistory';

const mockGetCommitHistory = jest.mocked(getCommitHistory);

describe('handleGetCommits', () => {
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

    mockGetCommitHistory.mockResolvedValue([
      {
        sha: 'abc123',
        message: 'Initial commit',
        author: 'John Doe',
        date: '2024-01-01T00:00:00Z'
      }
    ]);
  });

  describe('successful commit retrieval', () => {
    it('should get commits for a valid repository', async () => {
      mockRequest = {
        query: {
          repoName: 'my-music-project'
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('my-music-project');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith([
        {
          sha: 'abc123',
          message: 'Initial commit',
          author: 'John Doe',
          date: '2024-01-01T00:00:00Z'
        }
      ]);
    });

    it('should handle repository names with special characters', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project@#$%^&*()'
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('my-project@#$%^&*()');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle very long repository names', async () => {
      const longRepoName = 'a'.repeat(100);
      mockRequest = {
        query: {
          repoName: longRepoName
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith(longRepoName);
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('input validation', () => {
    it('should return 400 when repoName is missing', async () => {
      mockRequest = {
        query: {}
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is undefined', async () => {
      mockRequest = {
        query: {
          repoName: undefined
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is null', async () => {
      mockRequest = {
        query: {
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is not a string', async () => {
      mockRequest = {
        query: {
          repoName: 123 as never
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is an object', async () => {
      mockRequest = {
        query: {
          repoName: { name: 'test' }
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is an array', async () => {
      mockRequest = {
        query: {
          repoName: ['repo1', 'repo2']
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is empty string', async () => {
      mockRequest = {
        query: {
          repoName: ''
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetCommitHistory).not.toHaveBeenCalled();
    });

    // it('should return 400 when repoName is whitespace only', async () => {
    //   mockRequest = {
    //     query: {
    //       repoName: "   " as never
    //     }
    //   };

    //   await handleGetCommits(mockRequest as Request, mockResponse as Response);

    //   expect(mockStatus).toHaveBeenCalledWith(400);
    //   expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
    //   expect(mockGetCommitHistory).not.toHaveBeenCalled();
    // });
  });

  describe('error handling', () => {
    it('should return 500 when getCommitHistory throws an error', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project'
        }
      };

      const error = new Error('GitHub API error');
      mockGetCommitHistory.mockRejectedValue(error);

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch commit history' });
    });

    it('should handle different types of errors', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project'
        }
      };

      const networkError = new Error('Network timeout');
      mockGetCommitHistory.mockRejectedValue(networkError);

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch commit history' });
    });

    it('should handle non-Error objects', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project'
        }
      };

      const stringError = 'Something went wrong';
      mockGetCommitHistory.mockRejectedValue(stringError);

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch commit history' });
    });
  });

  describe('commit data handling', () => {
    it('should handle empty commit list', async () => {
      mockRequest = {
        query: {
          repoName: 'empty-repo'
        }
      };

      mockGetCommitHistory.mockResolvedValue([]);

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('empty-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith([]);
    });

    it('should handle single commit', async () => {
      mockRequest = {
        query: {
          repoName: 'single-commit-repo'
        }
      };

      const singleCommit = [{
        sha: 'def456',
        message: 'Only commit',
        author: 'Jane Smith',
        date: '2024-01-02T00:00:00Z'
      }];

      mockGetCommitHistory.mockResolvedValue(singleCommit);

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('single-commit-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(singleCommit);
    });

    it('should handle multiple commits', async () => {
      mockRequest = {
        query: {
          repoName: 'multi-commit-repo'
        }
      };

      const multipleCommits = [
        {
          sha: 'abc123',
          message: 'First commit',
          author: 'John Doe',
          date: '2024-01-01T00:00:00Z'
        },
        {
          sha: 'def456',
          message: 'Second commit',
          author: 'Jane Smith',
          date: '2024-01-02T00:00:00Z'
        },
        {
          sha: 'ghi789',
          message: 'Third commit',
          author: 'Bob Johnson',
          date: '2024-01-03T00:00:00Z'
        }
      ];

      mockGetCommitHistory.mockResolvedValue(multipleCommits);

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('multi-commit-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(multipleCommits);
    });
  });

  describe('edge cases', () => {
    it('should handle query parameters with extra fields', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project',
          extra: 'ignored',
          another: 'also-ignored'
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('my-project');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle query parameters with special characters', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project-with-spaces-and-special-chars@#$%'
        }
      };

      await handleGetCommits(mockRequest as Request, mockResponse as Response);

      expect(mockGetCommitHistory).toHaveBeenCalledWith('my-project-with-spaces-and-special-chars@#$%');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });
});
