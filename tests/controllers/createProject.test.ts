import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleCreateProject } from '../../src/controllers/createProject';
import { createRepo } from '../../src/services/createRepo';
import { createMetaData, generateKey, hashKey } from '../../src/utils/hash';
import { getRepoName } from '../../src/utils/getRepoName';

const mockDbRun = jest.fn();

jest.mock('../../src/services/createRepo');
jest.mock('../../src/utils/hash');
jest.mock('../../src/utils/getRepoName');
jest.mock('../../src/utils/db', () => ({
  __esModule: true,
  default: {
    prepare: jest.fn(() => ({ run: mockDbRun }))
  }
}));

const mockCreateRepo = jest.mocked(createRepo);
const mockGenerateKey = jest.mocked(generateKey);
const mockHashKey = jest.mocked(hashKey);
const mockCreateMetaData = jest.mocked(createMetaData);
const mockGetRepoName = jest.mocked(getRepoName);

describe('handleCreateProject', () => {
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

    mockGenerateKey.mockReturnValue('test-key-123')
    mockHashKey.mockReturnValue('hashed-key-456');
    mockCreateMetaData.mockImplementation((hash: string, theme: string, projectName = '', creatorName = '') => ({
      projectName,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      theme: theme,
      originalCreator: creatorName || 'anonymous',
      isMigrated: false,
      isMusicBlocks: true,
      hashedKey: hash
    }));
    mockCreateRepo.mockResolvedValue('https://github.com/org/test-repo');
    mockGetRepoName.mockReturnValue('test-repo');
  });

  describe('successful project creation', () => {
    it('should create a project with valid input', async () => {
      mockRequest = {
        body: {
          repoName: 'my-music-project',
          theme: 'piano',
          description: 'A piano music project',
          projectData: { notes: ['C', 'D', 'E'] }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'my-music-project',
        { notes: ['C', 'D', 'E'] },
        expect.objectContaining({
          projectName: 'my-music-project',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          theme: 'piano',
          originalCreator: 'anonymous',
          isMigrated: false,
          isMusicBlocks: true,
          hashedKey: 'hashed-key-456'
        }),
        'A piano music project',
        'piano',
        undefined
      );

      expect(mockGenerateKey).toHaveBeenCalled();
      expect(mockHashKey).toHaveBeenCalledWith('test-key-123');
      expect(mockCreateMetaData).toHaveBeenCalledWith('hashed-key-456', 'piano', 'my-music-project', '');
      expect(mockGetRepoName).toHaveBeenCalledWith('https://github.com/org/test-repo');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        key: 'test-key-123',
        repository: 'test-repo'
      });
      expect(mockDbRun).toHaveBeenCalledWith(
        'test-repo',
        'my-music-project',
        'A piano music project',
        'piano',
        '',
        expect.any(String),
        expect.any(String),
        0,
        'hashed-key-456'
      );
    });

    it('should handle multiple themes separated by commas', async () => {
      mockRequest = {
        body: {
          repoName: 'multi-theme-project',
          theme: 'piano,guitar,drums',
          description: 'Multi-instrument project',
          projectData: { instruments: ['piano', 'guitar'] }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'multi-theme-project',
        { instruments: ['piano', 'guitar'] },
        expect.any(Object),
        'Multi-instrument project',
        'piano,guitar,drums',
        undefined
      );
    });

    it('should replace spaces with hyphens in repo name', async () => {
      mockRequest = {
        body: {
          repoName: 'My Music Project',
          theme: 'jazz',
          description: 'Jazz music project',
          projectData: { genre: 'jazz' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'My-Music-Project',
        { genre: 'jazz' },
        expect.any(Object),
        'Jazz music project',
        'jazz',
        undefined
      );
    });
  });

  describe('default values handling', () => {
    it('should use default values when repoName and theme are missing', async () => {
      mockRequest = {
        body: {
          projectData: { notes: ['A', 'B', 'C'] }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/),
        { notes: ['A', 'B', 'C'] },
        expect.any(Object),
        'Music Blocks project',
        'default',
        undefined
      );
    });

    it('should use default description when not provided', async () => {
      mockRequest = {
        body: {
          repoName: 'test-project',
          theme: 'rock',
          projectData: { genre: 'rock' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'test-project',
        { genre: 'rock' },
        expect.any(Object),
        'Music Blocks project',
        'rock',
        undefined
      );
    });
  });

  describe('error handling', () => {
    it('should return 400 when projectData is missing', async () => {
      mockRequest = {
        body: {
          repoName: 'test-project',
          theme: 'classical'
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'projectData is required' });
    });

    it('should return 500 when createRepo throws an error', async () => {
      mockRequest = {
        body: {
          repoName: 'test-project',
          theme: 'blues',
          description: 'Blues project',
          projectData: { genre: 'blues' }
        }
      };

      const error = new Error('GitHub API error');
      mockCreateRepo.mockRejectedValue(error);

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create project' });
    });

    it('should handle createRepo errors gracefully', async () => {
      mockRequest = {
        body: {
          repoName: 'test-project',
          theme: 'jazz',
          description: 'Jazz project',
          projectData: { genre: 'jazz' }
        }
      };

      const error = new Error('Network error');
      mockCreateRepo.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith('[handleCreateProject]', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create project' });

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string repoName', async () => {
      mockRequest = {
        body: {
          repoName: '',
          theme: 'electronic',
          projectData: { genre: 'electronic' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/),
        { genre: 'electronic' },
        expect.any(Object),
        'Music Blocks project',
        'electronic',
        undefined
      );
    });

    it('should handle empty string theme', async () => {
      mockRequest = {
        body: {
          repoName: 'test-project',
          theme: '',
          projectData: { genre: 'pop' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'test-project',
        { genre: 'pop' },
        expect.any(Object),
        'Music Blocks project',
        'default',
        undefined
      );
    });

    it('should handle null values in body', async () => {
      mockRequest = {
        body: {
          repoName: null,
          theme: null,
          description: null,
          projectData: { genre: 'folk' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/),
        { genre: 'folk' },
        expect.any(Object),
        'Music Blocks project',
        'default',
        undefined
      );
    });
  });

  describe('input validation', () => {
    it('should handle undefined values in body', async () => {
      mockRequest = {
        body: {
          repoName: undefined,
          theme: undefined,
          description: undefined,
          projectData: { genre: 'rock' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/),
        { genre: 'rock' },
        expect.any(Object),
        'Music Blocks project',
        'default',
        undefined
      );
    });

    it('should handle whitespace-only repoName', async () => {
      mockRequest = {
        body: {
          repoName: '   ',
          theme: 'jazz',
          projectData: { genre: 'jazz' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/),
        { genre: 'jazz' },
        expect.any(Object),
        'Music Blocks project',
        'jazz',
        undefined
      );
    });
  });
});
