import { Request, Response } from 'express';
import { createRepo } from '../services/createRepo';
import { createMetaData, generateKey, hashKey } from '../utils/hash';
import { getRepoName } from '../utils/getRepoName';

/**
 * POST /create
 *
 * Creates a new Music Blocks project repository in the GitHub org and
 * returns the repo name and a secret owner key.
 *
 * Body:
 *   projectData  {object} - the Music Blocks project JSON (required)
 *   repoName     {string} - desired repo name (optional; defaults to ISO timestamp)
 *   theme        {string} - comma-separated topic tags (optional; defaults to 'default')
 *   description  {string} - repo description (optional)
 *
 * Responses:
 *   200  { success, key, repository }  - repo created; `key` must be saved by the client
 *   400  { message }  - missing projectData
 *   500  { error }    - GitHub API or other server error
 */
export const handleCreateProject = async (req: Request, res: Response) => {
    let { repoName, theme, description } = req.body;
    const { projectData } = req.body;

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

    const key = generateKey();
    const hashedKey = hashKey(key);
    const metadata = createMetaData(hashedKey, theme);
    const sanitisedName = repoName.trim().replaceAll(' ', '_');

    try {
        const repoUrl = await createRepo(sanitisedName, projectData, metadata, description, theme);
        const repository = getRepoName(repoUrl);
        res.json({ success: true, key, repository });
    } catch (err) {
        console.error("[handleCreateProject]", err);
        res.status(500).json({ error: 'Failed to create project' });
    }
};
