import { Request, Response } from 'express';
import { createRepo } from '../services/createRepo';
import { createMetaData, generateKey, hashKey } from '../utils/hash';
import { getRepoName } from '../utils/getRepoName';
import db from '../utils/db';

/**
 * POST /create
 *
 * Creates a new Music Blocks project repository in the GitHub org and
 * returns the repo name and a secret owner key.
 *
 * Body:
 *   projectData  {object} - the Music Blocks project JSON (required)
 *   projectName  {string} - human-readable project name (optional; defaults to repoName)
 *   repoName     {string} - desired repo name (optional; defaults to ISO timestamp)
 *   theme        {string} - comma-separated topic tags (optional; defaults to 'default')
 *   description  {string} - repo description (optional)
 *   creatorName  {string} - student display name (optional)
 *
 * Responses:
 *   200  { success, key, repository }  - repo created; `key` must be saved by the client
 *   400  { message }  - missing projectData
 *   500  { error }    - GitHub API or other server error
 */
export const handleCreateProject = async (req: Request, res: Response) => {
    let { repoName, theme, description, projectName, creatorName } = req.body;
    const { projectData, thumbnail, ProjectImage } = req.body;

    if (!projectData) {
        res.status(400).json({ message: "projectData is required" });
        return;
    }

    // Sanitise optional fields with sensible defaults
    if (!repoName || typeof repoName !== 'string' || repoName.trim() === '') {
        repoName = new Date().toISOString();
    }
    if (!theme || typeof theme !== 'string' || theme.trim() === '') {
        theme = 'default';
    }
    if (!description || typeof description !== 'string') {
        description = "Music Blocks project";
    }
    if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
        projectName = repoName;
    }
    if (!creatorName || typeof creatorName !== 'string') {
        creatorName = '';
    }

    const key = generateKey();
    const hashedKey = hashKey(key);
    const metadata = createMetaData(hashedKey, theme, projectName, creatorName);
    const sanitisedName = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
    const now = new Date().toISOString();
    const rawThumbnail = typeof thumbnail === 'string' ? thumbnail : ProjectImage;
    const thumbnailDataUrl = typeof rawThumbnail === 'string' && /^data:image\/png;base64,/.test(rawThumbnail)
        ? rawThumbnail
        : undefined;
    const hasThumbnail = thumbnailDataUrl ? 1 : 0;

    try {
        const repoUrl = await createRepo(sanitisedName, projectData, metadata, description, theme, thumbnailDataUrl);
        const repository = getRepoName(repoUrl);

        // ── Insert SQLite row (visible=0 until student calls /publish) ──────────
        // `createRepo` already ensures `repository` is unique on GitHub (UUID suffix
        // appended on conflict), so INSERT OR REPLACE is safe: it creates a new row
        // normally, and overwrites any stale SQLite entry if one somehow exists.
        db.prepare(`
            INSERT OR REPLACE INTO projects
                (repoName, projectName, description, theme, creatorName,
                 createdAt, updatedAt, likes, downloads,
                 hasThumbnail, isMigrated, visible, hashedKey, isMusicBlocks)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, ?, 1)
        `).run(
            repository,
            projectName.trim(),
            description,
            theme,
            creatorName,
            now,
            now,
            hasThumbnail,
            hashedKey
        );

        res.json({ success: true, key, repository });
    } catch (err) {
        console.error("[handleCreateProject]", err);
        res.status(500).json({ error: 'Failed to create project' });
    }
};
