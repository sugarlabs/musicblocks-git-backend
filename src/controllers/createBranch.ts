import { Request, Response } from 'express';
import { createBranch } from '../services/createBranch';

export const handleCreateBranch = async (req: Request, res: Response): Promise<void> => {
    const { repoName, branchName, branchedFrom = 'main' } = req.body;

    if (!repoName || !branchName) {
        res.status(400).json({ error: "Missing required fields: repoName, branchName" });
        return;
    }

    try {
        const result = await createBranch(repoName, branchName, branchedFrom);
        if (!result) {
            res.status(500).json({ error: "Failed to create branch" });
            return;
        }
        res.json({ success: true, branch: result });
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ error: "Could not create branch" });
    }
};