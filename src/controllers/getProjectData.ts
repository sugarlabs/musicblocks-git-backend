import { Request, Response } from "express";
import { getProjectData } from "../services/getProjectData";

export const handleGetProjectData = async(req:Request,res:Response) => {
    try {
        const { repoName } = req.query;
        if(!repoName || typeof repoName !== "string"){
            res.status(400).json({ message: "repoName query parameter is required" });
            return;
        }
        const response = await getProjectData(repoName);
        // Send the raw project string as `content` — the frontend's
        // ServerInterface.downloadProject reads res.content and passes it to
        // ProjectStorage.decodeTB(), which expects the raw XML/JSON project string.
        res.status(200).json({ content: response });

    } catch (error) {
        console.error('[handleGetProjectData]', error);
        res.status(500).json({ error: "Failed to fetch project data" });
    }
}