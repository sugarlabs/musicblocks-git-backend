import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

/**
 * Upserts thumbnail.png in a GitHub repo.
 *
 * GitHub's Contents API requires the existing file's SHA to perform an update.
 * This function fetches the current SHA (if the file exists), then writes the
 * new content — creating or overwriting as appropriate.
 *
 * @param repoName         - repository slug in the org
 * @param thumbnailDataUrl - full data URL, e.g. "data:image/png;base64,iVBO..."
 */
export async function updateThumbnailFile(
    repoName: string,
    thumbnailDataUrl: string
): Promise<void> {
    // Validate: must be an image data URL
    const match = thumbnailDataUrl.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\n]+)$/);
    if (!match) {
        throw new Error(`[updateThumbnailFile] Invalid thumbnail data URL for repo: ${repoName}`);
    }

    const base64Content = match[2].replace(/\n/g, "");
    const octokit = await getAuthenticatedOctokit();

    // Try to fetch the current file SHA (required by GitHub API to overwrite)
    let existingSha: string | undefined;
    try {
        const existing = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            {
                owner: config.org,
                repo: repoName,
                path: "thumbnail.png",
                headers: { "X-GitHub-Api-Version": "2022-11-28" },
            }
        );
        const file = existing.data as { sha?: string };
        existingSha = file.sha;
    } catch (err: any) {
        if (err?.status !== 404) {
            throw err;
        }
        // 404 = file doesn't exist yet, we'll create it below
    }

    // PUT the new thumbnail (create or overwrite)
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: config.org,
        repo: repoName,
        path: "thumbnail.png",
        message: "Update thumbnail.png",
        content: base64Content,
        ...(existingSha ? { sha: existingSha } : {}),
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
}
