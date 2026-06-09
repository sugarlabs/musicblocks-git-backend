import { Request, Response } from "express";
import { searchProjects } from "../services/searchProjects";
import { parsePagination } from "../utils/pagination";

const getQueryString = (value: unknown): string | undefined => {
    return typeof value === 'string' ? value : undefined;
};

export const handleSearchProjects = async (req: Request, res: Response) => {
    try {
        const query = getQueryString(req.query.q);
        if (!query || query.length > 100) {
             res.status(400).json({ error: "Missing 'q' parameter for search" });
             return;
        }

        const pagination = parsePagination(req.query.page, req.query.limit);

        const results = await searchProjects(query, pagination);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: "Failed to search projects" });
    }
};
