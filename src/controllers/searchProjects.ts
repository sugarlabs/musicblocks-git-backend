import { Request, Response } from "express";
import { searchRepositories } from "../services/searchRepos";

export const handleSearchProjects = async (req: Request, res: Response) => {
  const { query, theme } = req.query;

  if (!query) {
    res.status(400).json({ message: "query parameter is required" });
    return;
  }

  try {
    const results = await searchRepositories(
      String(query),
      theme ? String(theme) : undefined
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Failed to search repositories" });
  }
};