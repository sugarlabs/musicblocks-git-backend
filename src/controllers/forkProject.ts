import { Request, Response } from 'express';
import { forkRepo } from '../services/forkRepo';

/**
 * POST /fork
 *
 * Creates a new repository that is a copy of an existing project.
 * The forked repo gets a fresh ownership key so the new owner can edit it.
 *
 * Body:
 *   repositoryName {string} - repoName of the project to fork
 *
 * Responses:
 *   200  { repoName, key, projectData, description } - fork created
 *   400  { error }  - missing repositoryName
 *   500  { error }  - GitHub API or other server error
 */
export const handleForkProject = async (req: Request, res: Response) => {
    const { repositoryName } = req.body;

    if (!repositoryName || typeof repositoryName !== 'string') {
        res.status(400).json({ error: "repositoryName is required" });
        return; // ← must return to prevent fall-through to forkRepo
    }

    try {
        const { repoName, key, projectData, description } = await forkRepo(repositoryName);
        res.json({ repoName, key, projectData, description });
    } catch (err) {
        console.error("[handleForkProject]", err);
        res.status(500).json({ error: "Could not fork repository" });
    }
};
