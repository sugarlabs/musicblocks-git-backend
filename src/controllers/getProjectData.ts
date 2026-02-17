import { Request, Response } from "express";
import { getProjectData } from "../services/getProjectData";

export const handleGetProjectData = async (req: Request, res: Response) => {
    try {
        const { repoName } = req.query;
        if (!repoName || repoName == undefined || typeof repoName != "string") {
            res.status(400).json({ message: "No response" });
            return;
        }
        const response = await getProjectData(repoName);
        res.status(200).json({ content: response });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
        return;
    }
}