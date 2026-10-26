import { jest } from '@jest/globals';
import { getCommitHistory } from '../../src/services/getCommitHistory';

jest.mock('../../src/config/gitConfig', () => ({
  config: {
    org: 'test-org',
  },
}));

jest.mock('../../src/utils/octokit', () => ({
  getAuthenticatedOctokit: jest.fn(),
}));

import { getAuthenticatedOctokit } from '../../src/utils/octokit';

const mockGetAuthenticatedOctokit = jest.mocked(getAuthenticatedOctokit);

describe('getCommitHistory service', () => {
  let mockOctokit: {
    request: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOctokit = {
      request: jest.fn(),
    };
    mockGetAuthenticatedOctokit.mockResolvedValue(mockOctokit as never);
  });

  it('should fetch commits and return response.data array', async () => {
    const mockCommitsData = [
      {
        sha: 'commit-sha-1',
        commit: {
          message: 'Initial commit',
          author: { name: 'Student', date: '2026-01-01T00:00:00Z' },
        },
      },
      {
        sha: 'commit-sha-2',
        commit: {
          message: 'Add new note blocks',
          author: { name: 'Student', date: '2026-01-02T00:00:00Z' },
        },
      },
    ];

    const mockOctokitResponse = {
      status: 200,
      url: 'https://api.github.com/repos/test-org/my-project/commits',
      headers: { 'content-type': 'application/json' },
      data: mockCommitsData,
    };

    mockOctokit.request.mockResolvedValueOnce(mockOctokitResponse);

    const result = await getCommitHistory('my-project');

    expect(mockGetAuthenticatedOctokit).toHaveBeenCalledTimes(1);
    expect(mockOctokit.request).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/commits',
      {
        owner: 'test-org',
        repo: 'my-project',
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    // Crucial assertion: result must be the array, not the wrapper object
    expect(result).toEqual(mockCommitsData);
    expect(result).not.toHaveProperty('status');
    expect(result).not.toHaveProperty('headers');
  });

  it('should propagate errors thrown by octokit.request', async () => {
    const apiError = new Error('GitHub API rate limit exceeded');
    mockOctokit.request.mockRejectedValueOnce(apiError);

    await expect(getCommitHistory('my-project')).rejects.toThrow('GitHub API rate limit exceeded');
  });
});
