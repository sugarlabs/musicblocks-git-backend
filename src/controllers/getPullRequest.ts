import { Request, Response } from "express";
import { getOpenPullRequestsWithProjectData } from "../services/getPullReq";

export const handleGetOpenPullRequests = async (req: Request, res: Response) => {
    const { repo } = req.body;
    if (!repo || typeof repo !== "string") {
        res.status(400).json({ error: "Missing or invalid 'repo' query parameter." });
        return;
    }
    try {
        const prs = await getOpenPullRequestsWithProjectData(repo);
        res.json(prs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch pull requests." });
        console.log(err);
    }
};