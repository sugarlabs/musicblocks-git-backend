import { Request, Response } from "express";
import { getProjectDetails } from "../services/getProjectDetails";

export const handleGetProjectDetails = async (req: Request, res: Response) => {
    try {
        const { repoName } = req.params;
        if (!repoName) {
             res.status(400).json({ error: "Missing repoName parameter" });
             return;
        }

        const project = await getProjectDetails(repoName);
        
        if (!project) {
             res.status(404).json({ error: "Project not found" });
             return;
        }
        
        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch project details" });
    }
};
