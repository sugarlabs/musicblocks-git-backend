import { Request, Response } from 'express';
import { migratePlanetProject } from '../services/migratePlanet';

export const handleMigratePlanet = async (req: Request, res: Response) => {
  const { planetProjectUrl, repoName, description } = req.body;

  if (!planetProjectUrl) {
    res.status(400).json({ message: 'planetProjectUrl is required' });
    return;
  }

  try {
    const result = await migratePlanetProject(
      planetProjectUrl,
      repoName,
      description
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to migrate Planet project' });
  }
};