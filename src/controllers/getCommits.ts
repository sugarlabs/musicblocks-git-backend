import { Request, Response } from "express";
import { getCommitHistory } from "../services/getCommitHistory";

export const handleGetCommits = async (req: Request, res: Response) => {
  try {
    const repoName = req.query.repoName;
    if (!repoName || typeof repoName !== "string") {
      res.status(400).json({ message: "repoName query parameter is required" });
      return;
    }
    const response = await getCommitHistory(repoName);
    res.status(200).json(response);
  } catch (error) {
    console.error('[handleGetCommits]', error);
    res.status(500).json({ error: "Failed to fetch commit history" });
  }
};
