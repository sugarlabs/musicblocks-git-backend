import { Request, Response } from 'express';
import { forkRepo } from '../services/forkRepo';
import db from '../utils/db';

/**
 * POST /fork
 *
 * Creates a new repository that is a copy of an existing project.
 * The forked repo gets a fresh ownership key so the new owner can edit it.
 * A SQLite row is inserted with visible=0 — the fork stays private until
 * the student explicitly calls POST /publish.
 *
 * Body:
 *   repositoryName {string} - repoName of the project to fork
 *   creatorName    {string} - display name for the fork owner (optional)
 *
 * Responses:
 *   200  { repoName, key, projectData, description } - fork created
 *   400  { error }  - missing repositoryName
 *   500  { error }  - GitHub API or other server error
 */
export const handleForkProject = async (req: Request, res: Response) => {
    const { repositoryName, creatorName = '' } = req.body;

    if (!repositoryName || typeof repositoryName !== 'string') {
        res.status(400).json({ error: "repositoryName is required" });
        return;
    }

    try {
        // ── Copy original project's metadata for the SQLite row and GitHub metaData.json ──
        const original = db.prepare(`
            SELECT theme, projectName FROM projects WHERE repoName = ?
        `).get(repositoryName) as { theme: string; projectName: string } | undefined;

        const safeCreatorName = typeof creatorName === 'string' ? creatorName : '';
        const forkedProjectName = original?.projectName ? `Fork of ${original.projectName}` : `Fork of ${repositoryName}`;

        const { repoName, key, projectData, description } = await forkRepo(repositoryName, safeCreatorName, forkedProjectName);

        const now = new Date().toISOString();

        try {
            db.prepare(`
                INSERT OR IGNORE INTO projects
                    (repoName, projectName, description, theme, creatorName,
                     createdAt, updatedAt, likes, downloads,
                     hasThumbnail, isMigrated, visible, hashedKey, isMusicBlocks)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 1)
            `).run(
                repoName,
                original?.projectName ? `Fork of ${original.projectName}` : `Fork of ${repositoryName}`,
                description || `Fork of ${repositoryName}`,
                original?.theme || 'default',
                typeof creatorName === 'string' ? creatorName : '',
                now,
                now,
                // hashedKey is not returned by forkRepo — derive it from key
                require('crypto').createHash('sha256').update(key).digest('hex')
            );
        } catch (dbErr) {
            console.error('[handleForkProject] SQLite insert failed (repo still created on GitHub):', dbErr);
        }

        res.json({ repoName, key, projectData, description });
    } catch (err) {
        console.error("[handleForkProject]", err);
        res.status(500).json({ error: "Could not fork repository" });
    }
};
