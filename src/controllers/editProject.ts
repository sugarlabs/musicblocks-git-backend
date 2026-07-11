import { resolveRepoName } from "../utils/resolveRepoName";
import { Request, Response } from "express";
import { updateProjectDataFile } from "../services/updateRepo";
import db from "../utils/db";

/**
 * PUT /edit
 *
 * Updates the projectData.json file inside a project's GitHub repository.
 * Requires verifyOwner middleware to have already confirmed the caller's key.
 * Also updates `updatedAt` in SQLite so the browse/sort index stays in sync.
 *
 * Body:
 *   repoName     {string} - repository name in the org
 *   projectData  {object} - new project data to write
 *   commitMessage {string} - git commit message (required)
 *
 * Responses:
 *   200  { message }  - project updated successfully
 *   400  { message }  - missing commitMessage
 *   500  { error }    - GitHub API or other server error
 */
export const handleEditProject = async (req: Request, res: Response) => {
    const { repoName: rawRepoName, projectData, commitMessage  } = req.body;
    const repoName = resolveRepoName(rawRepoName);

    if (!commitMessage) {
        res.status(400).json({ message: "commitMessage is required" });
        return;
    }

    if (!repoName || typeof repoName !== 'string') {
        res.status(400).json({ message: "repoName is required" });
        return;
    }

    try {
        await updateProjectDataFile(repoName, projectData, commitMessage);

        // ── Keep SQLite in sync: bump updatedAt ───────────────────────────────
        try {
            db.prepare(`UPDATE projects SET updatedAt = ? WHERE repoName = ?`)
                .run(new Date().toISOString(), repoName);
        } catch (dbErr) {
            console.error('[handleEditProject] SQLite updatedAt sync failed:', dbErr);
        }

        res.status(200).json({ message: "Project updated successfully" });
    } catch (error) {
        console.error("[handleEditProject] Error updating project:", error);
        res.status(500).json({ error: "Failed to update project" });
    }
};
