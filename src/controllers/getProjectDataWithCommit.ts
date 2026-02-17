import { Request, Response } from "express";
import { getProjectDataAtCommit } from "../services/getProjectDataAtCommit";

export const handleGetProjectDataWithCommit = async (req: Request, res: Response) => {
    try {
        const { repoName, sha } = req.query;
        if (typeof repoName != "string" || typeof sha != "string") {
            res.status(400).json({ message: "Pass a valid reponame" });
            return;
        }
        const result = await getProjectDataAtCommit(repoName, sha);
        res.status(200).json(result.projectData);
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal error" });
        return;
    }
}