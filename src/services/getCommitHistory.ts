import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

/**
 * Fetches the commit list for a project repo from GitHub.
 * Throws on error so the controller can return a proper HTTP error response.
 */
export const getCommitHistory = async (repoName: string) => {
    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
            owner: config.org,
            repo: repoName,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    );
    return response;
};
