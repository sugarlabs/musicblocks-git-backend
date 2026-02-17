import { Request, Response } from 'express';
import { forkWithHistory } from '../services/forkWithHistory';

export const handleForkWithHistory = async (req: Request, res: Response) => {
  const { sourceRepo } = req.body;

  if (!sourceRepo) {
    res.status(400).json({ error: 'Missing required parameters.' });
    return;
  }

  try {
    const forkUrl = await forkWithHistory(sourceRepo);
    res.json({ success: true, repoUrl: forkUrl });
    return;
  } catch (error) {
    console.error('Fork error:', error);
    res.status(500).json({ error: 'Failed to fork with history.' });
    return;
  }
};
