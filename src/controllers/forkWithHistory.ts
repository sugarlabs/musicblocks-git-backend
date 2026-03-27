import { Request, Response } from 'express';
import { forkWithHistory } from '../services/forkWithHistory';

export const handleForkWithHistory = async (req: Request, res: Response) => {
  const { sourceRepo } = req.body;

  if (!sourceRepo) {
    res.status(400).json({ error: 'Missing required parameters.' });
    return;
  }

  try {
    const { repoName, key, projectData, description } = await forkWithHistory(sourceRepo);
    res.json({ success: true, repoName, key, projectData, description });
  } catch (error) {
    console.error('Fork error:', error);
    res.status(500).json({ error: 'Failed to fork with history.' });
  }
};
