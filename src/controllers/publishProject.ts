import { Request, Response } from "express";
import { hashKey } from "../utils/hash";
import db from "../utils/db";
import { updateThumbnailFile } from "../services/updateThumbnail";

/**
 * POST /publish
 *
 * Sets visible=1 for a project in SQLite, making it appear on the Global Planet.
 * Verifies ownership via the hashedKey stored at create/fork time.
 * Optionally updates projectName, description, tags, and thumbnail.
 *
 * The thumbnail sent here is the CANONICAL image — it is whatever the student
 * has on their canvas at the moment they click Publish, overwriting anything
 * that was written to GitHub at create time (which may have been a blank canvas).
 *
 * Body:
 *   repoName    {string} - the repo slug
 *   key         {string} - plain-text ownership key returned by POST /create or POST /fork
 *   projectName {string} - optional: display name to set
 *   description {string} - optional: project description
 *   tags        {string[]} - optional: tag array
 *   thumbnail   {string} - optional: base64 PNG data URL (e.g. "data:image/png;base64,...")
 *
 * Responses:
 *   200  { message }  - published successfully
 *   400  { error }    - missing fields
 *   403  { error }    - invalid key
 *   404  { error }    - project not found in SQLite
 *   500  { error }    - internal server error
 */
export const handlePublishProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { repoName, key, projectName, description, tags, thumbnail } = req.body;

        if (!repoName || typeof repoName !== "string") {
            res.status(400).json({ error: "repoName is required" });
            return;
        }
        if (!key || typeof key !== "string") {
            res.status(400).json({ error: "key is required" });
            return;
        }

        // Look up the project row — we need hashedKey for ownership verification.
        const row = db
            .prepare(`SELECT hashedKey FROM projects WHERE repoName = ?`)
            .get(repoName) as { hashedKey: string } | undefined;

        if (!row) {
            res.status(404).json({ error: "Project not found" });
            return;
        }

        // Verify ownership: hash the incoming key and compare to what we stored.
        const incomingHash = hashKey(key);
        if (incomingHash !== row.hashedKey) {
            res.status(403).json({ error: "Invalid key — permission denied" });
            return;
        }

        const now = new Date().toISOString();

        // ── Write the canonical thumbnail to GitHub ───────────────────────────
        // The thumbnail sent at publish time is the source of truth — it is
        // whatever was on the student's canvas when they clicked Publish,
        // overwriting any placeholder written at repo-creation time.
        let hasThumbnail: number | null = null;
        const isValidThumbnail =
            typeof thumbnail === "string" &&
            /^data:image\/(png|jpeg|webp|gif);base64,/.test(thumbnail);

        if (isValidThumbnail) {
            try {
                await updateThumbnailFile(repoName, thumbnail);
                hasThumbnail = 1;
                console.log(`[handlePublishProject] thumbnail.png written to GitHub for ${repoName}`);
            } catch (thumbErr) {
                // Non-fatal: log and continue — the project still gets published.
                console.error(`[handlePublishProject] Failed to write thumbnail for ${repoName}:`, thumbErr);
            }
        }

        // Build a dynamic SET clause for whatever fields the client sent.
        // Always set visible=1 and updatedAt; optionally update name, description, theme, hasThumbnail.
        const setClauses: string[] = ["visible = 1", "updatedAt = ?"];
        const runArgs: unknown[] = [now];

        if (projectName && typeof projectName === "string" && projectName.trim()) {
            setClauses.push("projectName = ?");
            runArgs.push(projectName.trim());
        }
        if (description && typeof description === "string") {
            setClauses.push("description = ?");
            runArgs.push(description.trim());
        }
        if (tags && Array.isArray(tags) && tags.length > 0) {
            setClauses.push("theme = ?");
            runArgs.push(tags.join(","));
        }
        if (hasThumbnail !== null) {
            setClauses.push("hasThumbnail = ?");
            runArgs.push(hasThumbnail);
        }

        runArgs.push(repoName);
        db.prepare(`UPDATE projects SET ${setClauses.join(", ")} WHERE repoName = ?`)
            .run(...runArgs);

        res.status(200).json({ message: "Project published successfully" });
    } catch (error) {
        console.error("[handlePublishProject]", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
