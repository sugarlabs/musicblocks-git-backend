import { Request, Response } from 'express';
import { createPRFromFork } from '../services/pullRequestService';

export const handleCreatePR = async (req: Request, res: Response) => {
    const { forkRepo, updatedProjectData } = req.body;

    if (!forkRepo || !updatedProjectData) {
        res.status(400).json({ error: 'forkRepo and updatedProjectData are required.' });
        return;
    }

    try {
        const pr = await createPRFromFork({ forkRepo, updatedProjectData });
        res.json({ success: true, prUrl: pr.html_url });
        return;
    } catch (err) {
        console.error('Failed to create PR:', err);
        res.status(500).json({ error: 'Failed to create PR' });
        return;
    }
};
