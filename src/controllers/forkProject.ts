import { Request, Response } from 'express';
import { forkRepo } from '../services/forkRepo';

export const handleForkProject = async (req: Request, res: Response) => {
    const { repositoryName } = req.body;

    if (!repositoryName) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    try {
        const { repoName, key, projectData } = await forkRepo(repositoryName);
        res.json({ repoName, key, projectData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fork repository" });
    }
};
