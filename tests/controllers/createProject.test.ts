import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleCreateProject } from '../../src/controllers/createProject';
import { createRepo } from '../../src/services/createRepo';
import { createMetaData, generateKey, hashKey } from '../../src/utils/hash';
import { getRepoName } from '../../src/utils/getRepoName';
import db from '../../src/utils/db';

jest.mock('../../src/services/createRepo');
jest.mock('../../src/utils/hash');
jest.mock('../../src/utils/getRepoName');
jest.mock('../../src/utils/db', () => ({
  __esModule: true,
  default: { prepare: jest.fn() },
}));

const mockCreateRepo = jest.mocked(createRepo);
const mockGenerateKey = jest.mocked(generateKey);
const mockHashKey = jest.mocked(hashKey);
const mockCreateMetaData = jest.mocked(createMetaData);
const mockGetRepoName = jest.mocked(getRepoName);
const mockPrepare = jest.mocked(db.prepare);

// A sanitised ISO timestamp, the default repo name (`:` is replaced by `-`).
const TIMESTAMP_NAME = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/;

describe('handleCreateProject', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.MockedFunction<Response['status']>;
  let mockJson: jest.MockedFunction<Response['json']>;
  let mockRun: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStatus = jest.fn().mockReturnThis() as jest.MockedFunction<Response['status']>;
    mockJson = jest.fn().mockReturnThis() as jest.MockedFunction<Response['json']>;

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    } as Partial<Response>;

    mockRun = jest.fn();
    mockPrepare.mockReturnValue({ run: mockRun } as never);

    mockGenerateKey.mockReturnValue('test-key-123');
    mockHashKey.mockReturnValue('hashed-key-456');
    mockCreateMetaData.mockImplementation((hash: string, theme: string, projectName?: string, creatorName?: string) => ({
      projectName: projectName || '',
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

      expect(mockGenerateKey).toHaveBeenCalled();
      expect(mockHashKey).toHaveBeenCalledWith('test-key-123');
      expect(mockCreateMetaData).toHaveBeenCalledWith('hashed-key-456', 'piano', 'my-music-project', '');
      expect(mockCreateRepo).toHaveBeenCalledWith(
        'my-music-project',
        { notes: ['C', 'D', 'E'] },
        expect.objectContaining({ theme: 'piano', hashedKey: 'hashed-key-456' }),
        'A piano music project',
        'piano',
        undefined
      );
      expect(mockGetRepoName).toHaveBeenCalledWith('https://github.com/org/test-repo');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        key: 'test-key-123',
        repository: 'test-repo'
      });
    });

    it('should store an unpublished SQLite row for the new repository', async () => {
      mockRequest = {
        body: {
          repoName: 'my-music-project',
          projectName: 'My Music Project',
          theme: 'piano',
          description: 'A piano music project',
          creatorName: 'alice',
          projectData: { notes: ['C'] }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO projects'));
      const args = mockRun.mock.calls[0];
      expect(args[0]).toBe('test-repo');
      expect(args[1]).toBe('My Music Project');
      expect(args[2]).toBe('A piano music project');
      expect(args[3]).toBe('piano');
      expect(args[4]).toBe('alice');
      expect(args[args.length - 1]).toBe('hashed-key-456');
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

    it('should replace characters GitHub does not allow in repo names with hyphens', async () => {
      mockRequest = {
        body: {
          repoName: 'My Music Project!',
          theme: 'jazz',
          description: 'Jazz music project',
          projectData: { genre: 'jazz' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'My-Music-Project-',
        { genre: 'jazz' },
        expect.any(Object),
        'Jazz music project',
        'jazz',
        undefined
      );
    });

    it('should pass a PNG data URL thumbnail through and ignore anything else', async () => {
      const png = 'data:image/png;base64,iVBORw0KGgo=';
      mockRequest = { body: { repoName: 'thumb', projectData: { a: 1 }, thumbnail: png } };
      await handleCreateProject(mockRequest as Request, mockResponse as Response);
      expect(mockCreateRepo.mock.calls[0][5]).toBe(png);

      mockRequest = { body: { repoName: 'thumb', projectData: { a: 1 }, thumbnail: 'https://example.com/x.png' } };
      await handleCreateProject(mockRequest as Request, mockResponse as Response);
      expect(mockCreateRepo.mock.calls[1][5]).toBeUndefined();
    });
  });

  describe('default values handling', () => {
    it('should use default values when repoName and theme are missing', async () => {
      mockRequest = {
        body: {
          projectData: { tempo: 120 }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        expect.stringMatching(TIMESTAMP_NAME),
        { tempo: 120 },
        expect.any(Object),
        'Music Blocks project',
        'default',
        undefined
      );
    });

    it('should use default description when not provided', async () => {
      mockRequest = {
        body: {
          repoName: 'no-description',
          theme: 'rock',
          projectData: { genre: 'rock' }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo).toHaveBeenCalledWith(
        'no-description',
        { genre: 'rock' },
        expect.any(Object),
        'Music Blocks project',
        'rock',
        undefined
      );
    });

    it('should default projectName to the repo name', async () => {
      mockRequest = { body: { repoName: 'my-song', projectData: { a: 1 } } };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateMetaData).toHaveBeenCalledWith('hashed-key-456', 'default', 'my-song', '');
    });
  });

  describe('error handling', () => {
    it('should return 400 when projectData is missing', async () => {
      mockRequest = {
        body: {
          repoName: 'no-data',
          theme: 'piano'
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ message: 'projectData is required' });
      expect(mockCreateRepo).not.toHaveBeenCalled();
    });

    it('should return 500 without the error details when createRepo throws', async () => {
      mockCreateRepo.mockRejectedValue(new Error('GitHub API error'));
      mockRequest = {
        body: {
          repoName: 'failing-project',
          projectData: { a: 1 }
        }
      };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create project' });
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('should return 500 when the SQLite insert fails', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('SQLITE_ERROR');
      });
      mockRequest = { body: { repoName: 'db-fails', projectData: { a: 1 } } };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create project' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string repoName', async () => {
      mockRequest = { body: { repoName: '', theme: 'piano', projectData: { a: 1 } } };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo.mock.calls[0][0]).toMatch(TIMESTAMP_NAME);
    });

    it('should handle whitespace-only repoName', async () => {
      mockRequest = { body: { repoName: '   ', theme: 'jazz', projectData: { genre: 'jazz' } } };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo.mock.calls[0][0]).toMatch(TIMESTAMP_NAME);
    });

    it('should handle empty string theme', async () => {
      mockRequest = { body: { repoName: 'empty-theme', theme: '', projectData: { a: 1 } } };

      await handleCreateProject(mockRequest as Request, mockResponse as Response);

      expect(mockCreateRepo.mock.calls[0][4]).toBe('default');
    });

    it('should handle null and undefined values in body', async () => {
      for (const value of [null, undefined]) {
        mockCreateRepo.mockClear();
        mockRequest = {
          body: { repoName: value, theme: value, description: value, projectData: { genre: 'folk' } }
        };

        await handleCreateProject(mockRequest as Request, mockResponse as Response);

        expect(mockCreateRepo).toHaveBeenCalledWith(
          expect.stringMatching(TIMESTAMP_NAME),
          { genre: 'folk' },
          expect.any(Object),
          'Music Blocks project',
          'default',
          undefined
        );
      }
    });
  });
});
