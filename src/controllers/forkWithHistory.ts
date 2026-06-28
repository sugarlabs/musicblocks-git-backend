import { Request, Response } from 'express';
import { forkWithHistory } from '../services/forkWithHistory';
import db from '../utils/db';
import crypto from 'crypto';

/**
 * POST /forkHistory
 *
 * Creates a new repository that is a full git-history clone of an existing
 * project. Slower than /fork but preserves the complete commit timeline.
 * A SQLite row is inserted with visible=0 so the fork can be published later.
 *
 * Body:
 *   sourceRepo   {string} - repoName of the project to fork
 *   creatorName  {string} - display name for the fork owner (optional)
 */
export const handleForkWithHistory = async (req: Request, res: Response) => {
    const { sourceRepo, creatorName = '' } = req.body;

    if (!sourceRepo) {
        res.status(400).json({ error: 'Missing required parameters.' });
        return;
    }

    try {
        // ── Copy original project's metadata for the SQLite row and GitHub metaData.json ──
        const original = db.prepare(`
            SELECT theme, projectName FROM projects WHERE repoName = ?
        `).get(sourceRepo) as { theme: string; projectName: string } | undefined;

        const safeCreatorName = typeof creatorName === 'string' ? creatorName : '';
        const forkedProjectName = original?.projectName ? `Fork of ${original.projectName}` : `Fork of ${sourceRepo}`;

        const result = await forkWithHistory(sourceRepo, safeCreatorName, forkedProjectName);
        const { repoName, key, projectData, description } = result;

        const now = new Date().toISOString();
        const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

        try {
            db.prepare(`
                INSERT OR IGNORE INTO projects
                    (repoName, projectName, description, theme, creatorName,
                     createdAt, updatedAt, likes, downloads,
                     hasThumbnail, isMigrated, visible, hashedKey, isMusicBlocks)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 1)
            `).run(
                repoName,
                original?.projectName ? `Fork of ${original.projectName}` : `Fork of ${sourceRepo}`,
                description || `Fork with history of ${sourceRepo}`,
                original?.theme || 'default',
                typeof creatorName === 'string' ? creatorName : '',
                now,
                now,
                hashedKey
            );
        } catch (dbErr) {
            console.error('[handleForkWithHistory] SQLite insert failed (repo still created):', dbErr);
        }

        res.json({ success: true, repoName, key, projectData, description });
    } catch (error) {
        console.error('Fork with history error:', error);
        res.status(500).json({ error: 'Failed to fork with history.' });
    }
};
