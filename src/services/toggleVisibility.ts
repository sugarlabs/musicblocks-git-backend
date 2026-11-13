import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { hashKey } from "../utils/hash";
import db from "../utils/db";

export class VisibilityError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "VisibilityError";
    }
}

/** Verify project ownership from GitHub metadata, then change only its SQLite visibility. */
export const toggleProjectVisibility = async (repoName: string, key: string, visible: boolean): Promise<void> => {
    const row = db.prepare("SELECT repoName FROM projects WHERE repoName = ?").get(repoName);
    if (!row) throw new VisibilityError(404, "Project not found");

    let metadata: { hashedKey?: string };
    try {
        const octokit = await getAuthenticatedOctokit();
        const { data: metaFile } = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/metaData.json",
            { owner: config.org, repo: repoName }
        );
        metadata = JSON.parse(Buffer.from(metaFile.content, "base64").toString("utf8"));
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) throw new VisibilityError(404, "Project metadata not found on GitHub");
        throw new VisibilityError(502, "Failed to verify project ownership with GitHub");
    }

    if (!metadata.hashedKey || hashKey(key) !== metadata.hashedKey) {
        throw new VisibilityError(403, "Invalid key — permission denied");
    }

    try {
        db.prepare("UPDATE projects SET visible = ? WHERE repoName = ?").run(visible ? 1 : 0, repoName);
    } catch {
        throw new VisibilityError(500, "Failed to update project visibility");
    }
};
