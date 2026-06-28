import { Request, Response } from "express";
import { getAllRepositories } from "../services/getAllRepos";
import { parsePagination } from "../utils/pagination";

const getQueryString = (value: unknown): string | undefined => {
    return typeof value === 'string' ? value : undefined;
};

export const handleGetProjects = async (req: Request, res: Response) => {
  try {
      const pagination = parsePagination(req.query.page, req.query.limit);
      const sort = getQueryString(req.query.sort) || 'createdAt';
      const topic = getQueryString(req.query.topic);

      const repositories = await getAllRepositories(pagination, sort, topic);
      res.status(200).json(repositories);
  } catch (err) {
      res.status(500).json({ error: "Failed to fetch repositories" });
  }
};
