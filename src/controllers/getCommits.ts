import { Request, Response } from "express";
import { getCommitHistory } from "../services/getCommitHistory";

export const handleGetCommits = async (req: Request, res: Response) => {
  try {
    const repoName = req.query.repoName;
    if (!repoName || typeof repoName != "string" || repoName == undefined) {
      res.status(400).json({ message: "no reponame" });
      return;
    }
    const response = await getCommitHistory(repoName);
    res.status(200).json(response);
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
    return;
  }
};
