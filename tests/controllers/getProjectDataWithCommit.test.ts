import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleGetProjectDataWithCommit } from '../../src/controllers/getProjectDataWithCommit';

jest.mock('../../src/services/getProjectDataAtCommit');

import { getProjectDataAtCommit } from '../../src/services/getProjectDataAtCommit';

const mockGetProjectDataAtCommit = jest.mocked(getProjectDataAtCommit);

describe('handleGetProjectDataWithCommit', () => {
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
    it('should return project data for a valid repoName and sha', async () => {
      const projectData = { notes: ['C', 'D', 'E'] };
      mockGetProjectDataAtCommit.mockResolvedValue({
        success: true,
        projectData,
        sha: 'abc123',
      });

      mockRequest = {
        query: {
          repoName: 'my-repo',
          sha: 'abc123',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectDataAtCommit).toHaveBeenCalledWith('my-repo', 'abc123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(projectData);
    });

    it('should return project data with complex structure', async () => {
      const projectData = {
        tracks: [{ name: 'Piano', notes: ['C4', 'D4'] }],
        settings: { tempo: 120 },
      };
      mockGetProjectDataAtCommit.mockResolvedValue({
        success: true,
        projectData,
        sha: 'def456',
      });

      mockRequest = {
        query: {
          repoName: 'complex-project',
          sha: 'def456',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(projectData);
    });
  });

  describe('input validation', () => {
    it('should return 400 when repoName is missing', async () => {
      mockRequest = {
        query: {
          sha: 'abc123',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Pass a valid reponame' });
      expect(mockGetProjectDataAtCommit).not.toHaveBeenCalled();
    });

    it('should return 400 when sha is missing', async () => {
      mockRequest = {
        query: {
          repoName: 'my-repo',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Pass a valid reponame' });
      expect(mockGetProjectDataAtCommit).not.toHaveBeenCalled();
    });

    it('should return 400 when both repoName and sha are missing', async () => {
      mockRequest = {
        query: {},
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Pass a valid reponame' });
      expect(mockGetProjectDataAtCommit).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is not a string (array)', async () => {
      mockRequest = {
        query: {
          repoName: ['repo1', 'repo2'] as unknown as string,
          sha: 'abc123',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Pass a valid reponame' });
    });
  });

  describe('error handling', () => {
    it('should return 500 when service throws an error', async () => {
      mockGetProjectDataAtCommit.mockRejectedValue(new Error('GitHub API error'));

      mockRequest = {
        query: {
          repoName: 'my-repo',
          sha: 'abc123',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Internal error' });
    });

    it('should log the error when service throws', async () => {
      const error = new Error('File not found at commit');
      mockGetProjectDataAtCommit.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockRequest = {
        query: {
          repoName: 'my-repo',
          sha: 'invalid-sha',
        },
      } as Partial<Request>;

      await handleGetProjectDataWithCommit(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });
  });
});
