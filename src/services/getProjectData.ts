import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

/**
 * Fetches the raw content of projectData.json from a project repository.
 *
 * Returns the parsed project JSON on success. Throws (rather than returning
 * an Error object) so callers get consistent error handling via try/catch.
 *
 * @param repoName - The repository name inside the GitHub org.
 * @returns `{ success: true, projectData: object }` or throws on failure.
 */
export const getProjectData = async (repoName: string) => {
    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner: config.org,
        repo: repoName,
        path: "projectData.json",
        headers: {
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });
    const content = Buffer.from(response.data.content, "base64").toString();
    return {
        success: true,
        projectData: JSON.parse(content),
    };
};
