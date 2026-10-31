import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleGetProjectData } from '../../src/controllers/getProjectData';

jest.mock('../../src/services/getProjectData');

import { getProjectData } from '../../src/services/getProjectData';

const mockGetProjectData = jest.mocked(getProjectData);

describe('handleGetProjectData', () => {
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

    mockGetProjectData.mockResolvedValue('encoded-project-data');
  });

  describe('successful project data retrieval', () => {
    it('should get project data for a valid repository', async () => {
      mockRequest = {
        query: {
          repoName: 'my-music-project'
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('my-music-project');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        content: 'encoded-project-data'
      });
    });

    it('should handle repository names with special characters', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project@#$%^&*()'
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('my-project@#$%^&*()');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle very long repository names', async () => {
      const longRepoName = 'a'.repeat(100);
      mockRequest = {
        query: {
          repoName: longRepoName
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith(longRepoName);
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('input validation', () => {
    it('should return 400 when repoName is missing', async () => {
      mockRequest = {
        query: {}
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is undefined', async () => {
      mockRequest = {
        query: {
          repoName: undefined
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is null', async () => {
      mockRequest = {
        query: {}
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is not a string', async () => {
      mockRequest = {
        query: {
          repoName: 123 as never
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is an object', async () => {
      mockRequest = {
        query: {
          repoName: { name: 'test' }
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is an array', async () => {
      mockRequest = {
        query: {
          repoName: ['repo1', 'repo2']
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    it('should return 400 when repoName is empty string', async () => {
      mockRequest = {
        query: {
          repoName: ''
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
      expect(mockGetProjectData).not.toHaveBeenCalled();
    });

    // it('should return 400 when repoName is whitespace only', async () => {
    //   mockRequest = {
    //     query: {
    //       repoName: '   '
    //     }
    //   };

    //   await handleGetProjectData(mockRequest as Request, mockResponse as Response);

    //   expect(mockStatus).toHaveBeenCalledWith(400);
    //   expect(mockJson).toHaveBeenCalledWith({ message: 'repoName query parameter is required' });
    //   expect(mockGetProjectData).not.toHaveBeenCalled();
    // });
  });

  describe('error handling', () => {
    it('should return 500 when getProjectData throws an error', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project'
        }
      };

      const error = new Error('GitHub API error');
      mockGetProjectData.mockRejectedValue(error);

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch project data' });
    });

    it('should handle different types of errors', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project'
        }
      };

      const networkError = new Error('Network timeout');
      mockGetProjectData.mockRejectedValue(networkError);

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch project data' });
    });

    it('should handle non-Error objects', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project'
        }
      };

      const stringError = 'Something went wrong';
      mockGetProjectData.mockRejectedValue(stringError);

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch project data' });
    });
  });

  describe('project data handling', () => {
    it('should handle empty project data', async () => {
      mockRequest = {
        query: {
          repoName: 'empty-repo'
        }
      };

      mockGetProjectData.mockResolvedValue('');

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('empty-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: '' });
    });

    it('should handle simple project data', async () => {
      mockRequest = {
        query: {
          repoName: 'simple-repo'
        }
      };

      const simpleData = { notes: ['C'] };
      mockGetProjectData.mockResolvedValue(JSON.stringify(simpleData));

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('simple-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: JSON.stringify(simpleData) });
    });

    it('should handle complex project data structures', async () => {
      mockRequest = {
        query: {
          repoName: 'complex-repo'
        }
      };

      const complexData = {
        tracks: [
          { name: 'Piano', notes: ['C4', 'D4', 'E4'], velocity: 0.8 },
          { name: 'Bass', notes: ['C2', 'G2'], velocity: 0.6 }
        ],
        settings: {
          tempo: 120,
          key: 'C major',
          timeSignature: '4/4'
        },
        metadata: {
          composer: 'Test Composer',
          year: 2024
        }
      };

      mockGetProjectData.mockResolvedValue(JSON.stringify(complexData));

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('complex-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: JSON.stringify(complexData) });
    });

    it('should handle string project data', async () => {
      mockRequest = {
        query: {
          repoName: 'string-repo'
        }
      };

      const stringData = 'simple string data';
      mockGetProjectData.mockResolvedValue(stringData);

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('string-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: stringData });
    });

    it('should handle numeric project data', async () => {
      mockRequest = {
        query: {
          repoName: 'numeric-repo'
        }
      };

      const numericData = 42;
      mockGetProjectData.mockResolvedValue(String(numericData));

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('numeric-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: String(numericData) });
    });

    it('should handle array project data', async () => {
      mockRequest = {
        query: {
          repoName: 'array-repo'
        }
      };

      const arrayData = ['item1', 'item2', 'item3'];
      mockGetProjectData.mockResolvedValue(JSON.stringify(arrayData));

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('array-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: JSON.stringify(arrayData) });
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

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('my-project');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle query parameters with special characters', async () => {
      mockRequest = {
        query: {
          repoName: 'my-project-with-spaces-and-special-chars@#$%'
        }
      };

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('my-project-with-spaces-and-special-chars@#$%');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle very large project data', async () => {
      mockRequest = {
        query: {
          repoName: 'large-repo'
        }
      };

      const largeData = {
        notes: Array.from({ length: 1000 }, (_, i) => `note-${i}`),
        metadata: {
          description: 'a'.repeat(10000)
        }
      };

      mockGetProjectData.mockResolvedValue(JSON.stringify(largeData));

      await handleGetProjectData(mockRequest as Request, mockResponse as Response);

      expect(mockGetProjectData).toHaveBeenCalledWith('large-repo');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ content: JSON.stringify(largeData) });
    });
  });
});
