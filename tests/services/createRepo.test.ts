import { jest } from '@jest/globals';
import { createRepo } from '../../src/services/createRepo';

jest.mock('../../src/config/gitConfig', () => ({
  config: {
    org: 'test-org'
  }
}));

jest.mock('../../src/utils/octokit', () => ({
  getAuthenticatedOctokit: jest.fn()
}));

jest.mock('../../src/utils/sanitizeTopics', () => ({
  sanitizeTopics: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn()
}));

import { getAuthenticatedOctokit } from '../../src/utils/octokit';
import { sanitizeTopics } from '../../src/utils/sanitizeTopics';
import { v4 as uuidV4 } from 'uuid';

const mockGetAuthenticatedOctokit = jest.mocked(getAuthenticatedOctokit);
const mockSanitizeTopics = jest.mocked(sanitizeTopics);
const mockUuidV4 = jest.mocked(uuidV4);

describe('createRepo', () => {
  let mockOctokit: {
    request: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOctokit = {
      request: jest.fn()
    };
    
    mockGetAuthenticatedOctokit.mockResolvedValue(mockOctokit as never);
    mockSanitizeTopics.mockImplementation((topics: string[]) => 
      topics.map(topic => topic.toLowerCase().replace(/\s+/g, '-'))
    );
    mockUuidV4.mockImplementation(() => 'test-uuid-123');
  });

  describe('successful repository creation', () => {
    it('should create a repository with valid input', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/my-project'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse) 
        .mockResolvedValueOnce({}) 
        .mockResolvedValueOnce({}) 
        .mockResolvedValueOnce({}); 

      const result = await createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      );

      expect(result).toBe('https://github.com/test-org/my-project');
      expect(mockSanitizeTopics).toHaveBeenCalledWith(['piano']);
      
      expect(mockOctokit.request).toHaveBeenNthCalledWith(1, 'POST /orgs/{org}/repos', {
        org: 'test-org',
        name: 'my-project',
        description: 'A piano project',
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      expect(mockOctokit.request).toHaveBeenNthCalledWith(2, 'PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: 'test-org',
        repo: 'my-project',
        path: 'projectData.json',
        message: 'Add projectData.json',
        content: expect.any(String), 
      });

      expect(mockOctokit.request).toHaveBeenNthCalledWith(3, 'PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: 'test-org',
        repo: 'my-project',
        path: 'metaData.json',
        message: 'Add metaData.json',
        content: expect.any(String), 
      });

      expect(mockOctokit.request).toHaveBeenNthCalledWith(4, 'PUT /repos/{owner}/{repo}/topics', {
        owner: 'test-org',
        repo: 'my-project',
        names: ['piano'],
        headers: {
          Accept: "application/vnd.github.mercy-preview+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    });

    it('should handle multiple themes correctly', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/multi-theme-project'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      mockSanitizeTopics.mockReturnValue(['piano', 'guitar', 'drums']);

      const result = await createRepo(
        'multi-theme-project',
        { instruments: ['piano', 'guitar'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano,guitar,drums', hashedKey: 'hash123' },
        'Multi-instrument project',
        'piano,guitar,drums'
      );

      expect(result).toBe('https://github.com/test-org/multi-theme-project');
      expect(mockSanitizeTopics).toHaveBeenCalledWith(['piano', 'guitar', 'drums']);
      
      expect(mockOctokit.request).toHaveBeenNthCalledWith(4, 'PUT /repos/{owner}/{repo}/topics', {
        owner: 'test-org',
        repo: 'multi-theme-project',
        names: ['piano', 'guitar', 'drums'],
        headers: {
          Accept: "application/vnd.github.mercy-preview+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    });
  });

  describe('repository name conflicts', () => {
    it('should handle name conflict by appending UUID', async () => {
      const nameConflictError = {
        status: 422,
        message: 'name already exists'
      };

      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/my-project-test-uuid-123'
        }
      };

      mockOctokit.request
        .mockRejectedValueOnce(nameConflictError) 
        .mockResolvedValueOnce(mockRepoResponse) 
        .mockResolvedValueOnce({}) 
        .mockResolvedValueOnce({}) 
        .mockResolvedValueOnce({}); 

      const result = await createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      );

      expect(result).toBe('https://github.com/test-org/my-project-test-uuid-123');
      
      expect(mockOctokit.request).toHaveBeenNthCalledWith(1, 'POST /orgs/{org}/repos', {
        org: 'test-org',
        name: 'my-project',
        description: 'A piano project',
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      expect(mockOctokit.request).toHaveBeenNthCalledWith(2, 'POST /orgs/{org}/repos', {
        org: 'test-org',
        name: 'my-project-test-uuid-123',
        description: 'A piano project',
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        headers: {
          "X-Github-Api-Version": "2022-11-28",
        },
      });

      expect(mockUuidV4).toHaveBeenCalled();
    });

    it('should handle name conflict with different error message', async () => {
      const differentError = {
        status: 422,
        message: 'Repository name is invalid'
      };

      mockOctokit.request.mockRejectedValueOnce(differentError);

      await expect(createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      )).rejects.toEqual(differentError);

      expect(mockOctokit.request).toHaveBeenCalledTimes(1);
      expect(mockUuidV4).not.toHaveBeenCalled();
    });

    it('should handle name conflict with different status code', async () => {
      const differentStatusError = {
        status: 400,
        message: 'name already exists'
      };

      mockOctokit.request.mockRejectedValueOnce(differentStatusError);

      await expect(createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      )).rejects.toEqual(differentStatusError);

      expect(mockOctokit.request).toHaveBeenCalledTimes(1);
      expect(mockUuidV4).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when repo creation fails with non-conflict error', async () => {
      const error = new Error('Network error');
      mockOctokit.request.mockRejectedValueOnce(error);

      await expect(createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      )).rejects.toThrow('Network error');

      expect(mockOctokit.request).toHaveBeenCalledTimes(1);
    });

    it('should throw error when file creation fails', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/my-project'
        }
      };

      const fileError = new Error('File creation failed');

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse) 
        .mockRejectedValueOnce(fileError); 

      await expect(createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      )).rejects.toThrow('File creation failed');

      expect(mockOctokit.request).toHaveBeenCalledTimes(3);
    });

    it('should throw error when topics update fails', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/my-project'
        }
      };

      const topicsError = new Error('Topics update failed');

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse) 
        .mockResolvedValueOnce({}) 
        .mockResolvedValueOnce({}) 
        .mockRejectedValueOnce(topicsError); 

      await expect(createRepo(
        'my-project',
        { notes: ['C', 'D', 'E'] },
        { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' },
        'A piano project',
        'piano'
      )).rejects.toThrow('Topics update failed');

      expect(mockOctokit.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('file content handling', () => {
    it('should create files with correct content and encoding', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/my-project'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const projectData = { notes: ['C', 'D', 'E'], tempo: 120 };
      const metadata = { createdAt: '2024-01-01T00:00:00.000Z', theme: 'piano', hashedKey: 'hash123' };

      await createRepo('my-project', projectData, metadata, 'A piano project', 'piano');

      const projectDataCall = mockOctokit.request.mock.calls[1];
      expect(projectDataCall[0]).toBe('PUT /repos/{owner}/{repo}/contents/{path}');
      expect(projectDataCall[1]).toHaveProperty('path', 'projectData.json');
      expect(projectDataCall[1]).toHaveProperty('content');
      expect(typeof (projectDataCall[1] as Record<string, unknown>).content).toBe('string');

      const metaDataCall = mockOctokit.request.mock.calls[2];
      expect(metaDataCall[0]).toBe('PUT /repos/{owner}/{repo}/contents/{path}');
      expect(metaDataCall[1]).toHaveProperty('path', 'metaData.json');
      expect(metaDataCall[1]).toHaveProperty('content');
      expect(typeof (metaDataCall[1] as Record<string, unknown>).content).toBe('string');
    });

    it('should handle complex project data structures', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/complex-project'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const complexProjectData = {
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

      await createRepo('complex-project', complexProjectData, {}, 'Complex project', 'piano');

      expect(mockOctokit.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project data', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/empty-project'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await createRepo('empty-project', {}, {}, 'Empty project', 'default');

      expect(result).toBe('https://github.com/test-org/empty-project');
    });

    it('should handle empty theme array', async () => {
      const mockRepoResponse = {
        data: {
          html_url: 'https://github.com/test-org/no-theme-project'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      mockSanitizeTopics.mockReturnValue([]);

      const result = await createRepo('no-theme-project', { notes: ['C'] }, {}, 'No theme project', '');

      expect(result).toBe('https://github.com/test-org/no-theme-project');
      
      expect(mockOctokit.request).toHaveBeenNthCalledWith(4, 'PUT /repos/{owner}/{repo}/topics', {
        owner: 'test-org',
        repo: 'no-theme-project',
        names: [],
        headers: {
          Accept: "application/vnd.github.mercy-preview+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    });

    it('should handle very long project names', async () => {
      const longName = 'a'.repeat(100);
      const mockRepoResponse = {
        data: {
          html_url: `https://github.com/test-org/${longName}`
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce(mockRepoResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await createRepo(longName, { notes: ['C'] }, {}, 'Long name project', 'piano');

      expect(result).toBe(`https://github.com/test-org/${longName}`);
    });
  });
});
