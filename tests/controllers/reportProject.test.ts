import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleReportProject } from '../../src/controllers/reportProject';

jest.mock('../../src/utils/octokit');
jest.mock('../../src/utils/db', () => {
  const get = jest.fn();
  return { __esModule: true, default: { prepare: jest.fn(() => ({ get })) }, __get: get };
});

import { getAuthenticatedOctokit } from '../../src/utils/octokit';
import * as dbModule from '../../src/utils/db';

const mockGetOctokit = jest.mocked(getAuthenticatedOctokit);
const mockDbGet = (dbModule as unknown as { __get: jest.Mock }).__get;

describe('handleReportProject', () => {
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockResponse: Partial<Response>;
  let createIssue: jest.Mock<(arg: unknown) => Promise<unknown>>;

  const call = (body: Record<string, unknown>) =>
    handleReportProject({ body } as Partial<Request> as Request, mockResponse as Response);

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus } as unknown as Partial<Response>;

    createIssue = jest.fn<(arg: unknown) => Promise<unknown>>().mockResolvedValue({});
    mockGetOctokit.mockResolvedValue({ rest: { issues: { create: createIssue } } } as never);
    mockDbGet.mockReturnValue({ 1: 1 });
  });

  it('creates a moderation issue for an existing project', async () => {
    await call({ repoName: 'my-project', description: 'Inappropriate content' });

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(createIssue).toHaveBeenCalledTimes(1);
    const arg = createIssue.mock.calls[0][0] as { title: string; body: string };
    expect(arg.title).toBe('Report: Project my-project');
    expect(arg.body).toContain('Inappropriate content');
  });

  it('uses a default reason when no description is given', async () => {
    await call({ repoName: 'my-project' });

    expect(mockStatus).toHaveBeenCalledWith(200);
    const arg = createIssue.mock.calls[0][0] as { body: string };
    expect(arg.body).toContain('No reason provided.');
  });

  it('rejects a non-string description', async () => {
    await call({ repoName: 'my-project', description: { a: 1 } });

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('rejects a description longer than 1000 characters', async () => {
    await call({ repoName: 'my-project', description: 'x'.repeat(1001) });

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('accepts a description of exactly 1000 characters', async () => {
    await call({ repoName: 'my-project', description: 'x'.repeat(1000) });

    expect(mockStatus).toHaveBeenCalledWith(200);
  });

  it.each([undefined, '', 42, 'x](http://example.com)', 'a b'])(
    'rejects invalid repoName %p',
    async (repoName) => {
      await call({ repoName });

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(createIssue).not.toHaveBeenCalled();
    }
  );

  it('returns 404 when the project does not exist', async () => {
    mockDbGet.mockReturnValue(undefined);

    await call({ repoName: 'does-not-exist', description: 'spam' });

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('neutralizes @mentions in the description', async () => {
    await call({ repoName: 'my-project', description: 'ping @octocat and @org/team' });

    const arg = createIssue.mock.calls[0][0] as { body: string };
    expect(arg.body).not.toMatch(/@(?!​)/);
    expect(arg.body).toContain('@​octocat');
  });

  it('returns 500 when the GitHub call fails', async () => {
    createIssue.mockRejectedValue(new Error('boom'));

    await call({ repoName: 'my-project' });

    expect(mockStatus).toHaveBeenCalledWith(500);
  });
});
