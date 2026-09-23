import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleGetProjects } from '../../src/controllers/getProjects';

jest.mock('../../src/services/getAllRepos');

import { getAllRepositories } from '../../src/services/getAllRepos';

const mockGetAllRepositories = jest.mocked(getAllRepositories);

describe('handleGetProjects', () => {
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
    it('should return repositories for a valid page number', async () => {
      const repoData = {
        data: [
          { name: 'repo-1', description: 'First repo' },
          { name: 'repo-2', description: 'Second repo' },
        ],
      };
      mockGetAllRepositories.mockResolvedValue(repoData as never);

      mockRequest = {
        query: {
          page: '1',
        },
      } as Partial<Request>;

      await handleGetProjects(mockRequest as Request, mockResponse as Response);

      expect(mockGetAllRepositories).toHaveBeenCalledWith(1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(repoData);
    });

    it('should pass page number correctly when page is greater than 1', async () => {
      const repoData = { data: [] };
      mockGetAllRepositories.mockResolvedValue(repoData as never);

      mockRequest = {
        query: {
          page: '5',
        },
      } as Partial<Request>;

      await handleGetProjects(mockRequest as Request, mockResponse as Response);

      expect(mockGetAllRepositories).toHaveBeenCalledWith(5);
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle empty repository list', async () => {
      const repoData = { data: [] };
      mockGetAllRepositories.mockResolvedValue(repoData as never);

      mockRequest = {
        query: {
          page: '1',
        },
      } as Partial<Request>;

      await handleGetProjects(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(repoData);
    });
  });

  describe('input validation', () => {
    it('should return 400 when page is missing', async () => {
      mockRequest = {
        query: {},
      } as Partial<Request>;

      await handleGetProjects(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'mention page in the request' });
      expect(mockGetAllRepositories).not.toHaveBeenCalled();
    });

    it('should return 400 when page is undefined', async () => {
      mockRequest = {
        query: {
          page: undefined,
        },
      } as Partial<Request>;

      await handleGetProjects(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'mention page in the request' });
      expect(mockGetAllRepositories).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate error when getAllRepositories throws (no try-catch in controller)', async () => {
      mockGetAllRepositories.mockRejectedValue(new Error('GitHub API error'));

      mockRequest = {
        query: {
          page: '1',
        },
      } as Partial<Request>;

      await expect(
        handleGetProjects(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('GitHub API error');
    });
  });
});
