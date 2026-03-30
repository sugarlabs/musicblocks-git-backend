import { Request, Response } from 'express';
import { deleteRepo } from '../services/deleteRepo';

export const handleDeleteProject = async (req: Request, res: Response): Promise<void> => {
    const { repoName } = req.body;

    if (!repoName) {
        res.status(400).json({ error: 'repoName is required' });
        return;
    }

    try {
        const result = await deleteRepo(repoName);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
};