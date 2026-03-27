import { Request, Response } from "express";
import { compareProjects } from "../services/compareProjects";

export const handleCompareProjects = async (req: Request, res: Response) => {
  const { repo1, repo2 } = req.query;

  if (!repo1 || !repo2) {
    res.status(400).json({ message: "repo1 and repo2 are required" });
    return;
  }

  try {
    const result = await compareProjects(String(repo1), String(repo2));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to compare projects" });
  }
};
