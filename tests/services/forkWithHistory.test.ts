import { jest } from '@jest/globals';
import { forkWithHistory } from '../../src/services/forkWithHistory';

jest.mock('../../src/config/gitConfig', () => ({
  config: {
    org: 'test-org'
  }
}));

jest.mock('../../src/utils/octokit', () => ({
  getAuthenticatedOctokit: jest.fn()
}));

jest.mock('../../src/utils/hash', () => ({
  generateKey: jest.fn(),
  hashKey: jest.fn(),
  createMetaData: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  removeSync: jest.fn()
}));

jest.mock('../../src/services/getToken', () => ({
  getInstallationToken: jest.fn()
}));

import { execSync } from 'child_process';
import fs from 'fs-extra';
import { v4 as uuidV4 } from 'uuid';
import { getAuthenticatedOctokit } from '../../src/utils/octokit';
import { generateKey, hashKey, createMetaData } from '../../src/utils/hash';
import { getInstallationToken } from '../../src/services/getToken';

const mockExecSync = jest.mocked(execSync);
const mockFs = jest.mocked(fs);
const mockUuid = jest.mocked(uuidV4);
const mockGetAuthOctokit = jest.mocked(getAuthenticatedOctokit);
const mockGenerateKey = jest.mocked(generateKey);
const mockHashKey = jest.mocked(hashKey);
const mockCreateMetaData = jest.mocked(createMetaData);
const mockGetInstallationToken = jest.mocked(getInstallationToken);

describe('forkWithHistory', () => {
  let mockOctokit: {
    request: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOctokit = {
      request: jest.fn()
    };

    mockGetAuthOctokit.mockResolvedValue(mockOctokit as never);
    mockGetInstallationToken.mockResolvedValue('ghs_FAKE_TOKEN' as never);

    mockUuid
      .mockReturnValueOnce('uuid-1' as never)
      .mockReturnValueOnce('uuid-2' as never);

    mockGenerateKey.mockReturnValue('raw-key');
    mockHashKey.mockReturnValue('hashed-key');
    mockCreateMetaData.mockReturnValue({ hashedKey: 'hashed-key', theme: 'default' } as never);

    mockFs.existsSync.mockReturnValue(true as never);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ theme: 'default' }) as never);

    mockExecSync.mockImplementation(((cmd: unknown): string => {
      const c = String(cmd);
      if (c.includes('git --version')) return 'git version 2.39.0';
      if (c.includes('rev-parse --abbrev-ref')) return 'main';
      return '';
    }) as never);
  });

  describe('successful repository fork', () => {
    it('should fork a repository and return correct metadata', async () => {
      const mockDescriptionResponse = {
        data: {
          description: 'Original description'
        }
      };

      mockOctokit.request
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(mockDescriptionResponse);

      const result = await forkWithHistory('original-repo');

      expect(result).toEqual({
        repoName: 'original-repo-fork-uuid-1',
        key: 'raw-key',
        success: true,
        projectData: { theme: 'default' },
        description: 'Original description'
      });

      expect(mockOctokit.request).toHaveBeenNthCalledWith(1, 'POST /orgs/{org}/repos', {
        org: 'test-org',
        name: 'original-repo-fork-uuid-1',
        description: 'Fork with history of original-repo',
        private: false
      });

      expect(mockFs.ensureDirSync).toHaveBeenCalledWith(expect.stringContaining('clone-uuid-2'));
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('metaData.json'),
        expect.any(String)
      );

      // Verify the essential git commands were executed
      const calls = mockExecSync.mock.calls.map(call => String(call[0]));
      expect(calls).toEqual(expect.arrayContaining([
        expect.stringContaining(`git clone https://github.com/test-org/original-repo.git`),
        expect.stringContaining(`git config user.name "Musicblocks Bot"`),
        expect.stringContaining(`git config user.email "bot@musicblocks.org"`),
        expect.stringContaining(`git add metaData.json`),
        expect.stringContaining(`git commit -m "Update metaData.json with new hashedKey"`),
        expect.stringContaining(`git remote remove origin`),
        expect.stringContaining(`git remote add origin https://github.com/test-org/original-repo-fork-uuid-1.git`),
        expect.stringContaining(`git rev-parse --abbrev-ref HEAD`),
        expect.stringContaining(`git push -u origin main`)
      ]));
    });

    it('should clean up the temporary directory on success', async () => {
      mockOctokit.request.mockResolvedValue({ data: {} });

      await forkWithHistory('original-repo');

      expect(mockFs.removeSync).toHaveBeenCalledTimes(1);
      expect(mockFs.removeSync).toHaveBeenCalledWith(expect.stringContaining('tmp/clone-uuid-2'));
    });
  });

  describe('git version compatibility', () => {
    it('should throw an error if git version is below 2.32', async () => {
      mockExecSync.mockImplementation(((cmd: unknown): string => {
        const c = String(cmd);
        if (c.includes('git --version')) return 'git version 2.30.0';
        return '';
      }) as never);

      await expect(forkWithHistory('original-repo')).rejects.toThrow(
        /Git >= 2\.32 is required/
      );

      expect(mockOctokit.request).not.toHaveBeenCalled();
    });

    it('should throw an error if git version cannot be parsed', async () => {
      mockExecSync.mockImplementation(((cmd: unknown): string => {
        const c = String(cmd);
        if (c.includes('git --version')) return 'unknown version output';
        return '';
      }) as never);

      await expect(forkWithHistory('original-repo')).rejects.toThrow(
        /Cannot parse git version/
      );

      expect(mockOctokit.request).not.toHaveBeenCalled();
    });

    it('should proceed if git version is exactly 2.32', async () => {
      mockExecSync.mockImplementation(((cmd: unknown): string => {
        const c = String(cmd);
        if (c.includes('git --version')) return 'git version 2.32.0';
        if (c.includes('rev-parse --abbrev-ref')) return 'main';
        return '';
      }) as never);

      mockOctokit.request.mockResolvedValue({ data: {} });

      const result = await forkWithHistory('original-repo');
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should clean up the temporary directory on failure', async () => {
      mockExecSync.mockImplementation(((cmd: unknown): string => {
        const c = String(cmd);
        if (c.includes('git --version')) return 'git version 2.39.0';
        if (c.includes('git clone')) throw new Error('Failed to clone repository');
        return '';
      }) as never);

      await expect(forkWithHistory('original-repo')).rejects.toThrow('Failed to clone repository');

      expect(mockFs.removeSync).toHaveBeenCalledTimes(1);
      expect(mockFs.removeSync).toHaveBeenCalledWith(expect.stringContaining('tmp/clone-uuid-2'));
    });

    it('should throw the error when octokit request fails', async () => {
      const networkError = new Error('Network timeout');
      mockOctokit.request.mockRejectedValueOnce(networkError);

      await expect(forkWithHistory('original-repo')).rejects.toThrow('Network timeout');

      expect(mockFs.removeSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('security and token handling', () => {
    it('should explicitly set stdio: "pipe" on ALL execSync calls', async () => {
      mockOctokit.request.mockResolvedValue({ data: {} });

      await forkWithHistory('original-repo');

      const allCallsOpts = mockExecSync.mock.calls.map(call => call[1] as Record<string, unknown>);
      allCallsOpts.forEach(opts => {
        expect(opts).toBeDefined();
        expect(opts.stdio).toBe('pipe');
      });
    });

    it('should not leak tokens into command arguments or URL', async () => {
      mockOctokit.request.mockResolvedValue({ data: {} });

      await forkWithHistory('original-repo');

      const allCmds = mockExecSync.mock.calls.map(call => String(call[0])).join('\n');
      expect(allCmds).not.toContain('ghs_FAKE_TOKEN');
      expect(allCmds).not.toMatch(/https:\/\/[^@]+@github\.com/);
      expect(allCmds).not.toContain('http.extraHeader'); // Should not exist directly in ANY command string
    });

    it('should securely inject token via environment variables only in git push', async () => {
      mockOctokit.request.mockResolvedValue({ data: {} });

      await forkWithHistory('original-repo');

      const pushCall = mockExecSync.mock.calls.find(call => String(call[0]).includes('git push'));
      expect(pushCall).toBeDefined();

      const pushOpts = pushCall![1] as { env?: Record<string, string> };
      expect(pushOpts).toBeDefined();
      expect(pushOpts.env).toBeDefined();

      expect(pushOpts.env!['GIT_CONFIG_COUNT']).toBe('1');
      expect(pushOpts.env!['GIT_CONFIG_KEY_0']).toBe('http.extraHeader');
      expect(pushOpts.env!['GIT_CONFIG_VALUE_0']).toBe('Authorization: Bearer ghs_FAKE_TOKEN');

      // Double-check the token is not leaked into the actual command
      expect(String(pushCall![0])).not.toContain('ghs_FAKE_TOKEN');
    });
  });

  describe('dynamic branch detection', () => {
    it('should use the branch detected from rev-parse instead of hardcoding main', async () => {
      mockExecSync.mockImplementation(((cmd: unknown): string => {
        const c = String(cmd);
        if (c.includes('git --version')) return 'git version 2.39.0';
        if (c.includes('rev-parse --abbrev-ref')) return 'development-branch';
        return '';
      }) as never);

      mockOctokit.request.mockResolvedValue({ data: {} });

      await forkWithHistory('original-repo');

      const pushCall = mockExecSync.mock.calls.find(call => String(call[0]).includes('git push'));
      expect(pushCall).toBeDefined();
      expect(String(pushCall![0])).toContain('git push -u origin development-branch');
    });
  });
});
