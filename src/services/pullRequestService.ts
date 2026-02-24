import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { parseGitHubRepoUrl } from "../utils/parseGithubUrl";

export const createPRFromFork = async ({ forkRepo, updatedProjectData, }: { forkRepo: string; updatedProjectData: object; }) => {
    if (process.env.TEST_MODE === 'true') {
    // Simulate a PR creation response
    return { html_url: 'https://github.com/fake/fake-repo/pull/123' };
  }
    const octokit = await getAuthenticatedOctokit();
    const org = config.org;

    const { data: metaFile } = await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        {
            owner: org,
            repo: forkRepo,
            path: 'metaData.json',
            ref: 'main',
        }
    );
    const metadata = JSON.parse(Buffer.from(metaFile.content, 'base64').toString('utf-8'));
    const forkedFromUrl = metadata.forkedFrom;
    if(!forkedFromUrl){
        throw new Error('This repository is not a fork, Cannot create a PR to base repo');
    }
    const parsed = parseGitHubRepoUrl(forkedFromUrl);
    if (!parsed) throw new Error('Invalid forkedFrom URL in metadata');
    const baseRepo = parsed.repo;

    const { data: mainRef } = await octokit.request(
        'GET /repos/{owner}/{repo}/git/ref/heads/main',
        {
            owner: org,
            repo: baseRepo,
        }
    );
    const mainSha = mainRef.object.sha;

    const newBranch = `pr-from-fork-${Date.now()}`;
    await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: org,
        repo: baseRepo,
        ref: `refs/heads/${newBranch}`,
        sha: mainSha,
    });

    let sha: string | undefined;
    try {
        const { data: baseFile } = await octokit.request(
            'GET /repos/{owner}/{repo}/contents/{path}',
            {
                owner: org,
                repo: baseRepo,
                path: 'projectData.json',
                ref: newBranch,
            }
        );
        sha = baseFile.sha;
    } catch (err) {
        if (err) throw err;
    }

    const newContent = Buffer.from(JSON.stringify(updatedProjectData)).toString('base64');

    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: org,
        repo: baseRepo,
        path: 'projectData.json',
        message: 'Update projectData.json from fork',
        content: newContent,
        branch: newBranch,
        ...(sha ? { sha } : {}),
    });

    const pr = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: org,
        repo: baseRepo,
        title: 'Update projectData.json from fork',
        head: newBranch,
        base: 'main',
        body: `Automated PR to update projectData.json from fork ${forkRepo}`,
    });

    return pr.data;
};