import { Request, Response } from 'express';
import { getTutorials, getTutorialByStep } from '../services/getTutorials';

export const handleGetTutorials = async (req: Request, res: Response) => {
  const { step } = req.query;

  if (step) {
    const tutorial = getTutorialByStep(Number(step));
    if (!tutorial) {
      res.status(404).json({ message: `Tutorial step ${step} not found` });
      return;
    }
    res.status(200).json(tutorial);
    return;
  }

  const allTutorials = getTutorials();
  res.status(200).json(allTutorials);
};