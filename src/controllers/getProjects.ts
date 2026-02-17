import { Request, Response } from "express";
import { getAllRepositories } from "../services/getAllRepos";

export const handleGetProjects = async (req: Request, res: Response) => {
  const { page } = req.query;
  if (!page) {
    res.status(400).json({ message: "mention page in the request" });
    return;
  }
  const repositories = await getAllRepositories(Number(page));
  res.status(200).json(repositories);
  return;
};
