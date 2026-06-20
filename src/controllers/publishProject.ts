import { Request, Response } from "express";
import db from "../utils/db";

export const handlePublishProject = (req: Request, res: Response) => {
    try {
        const { repoName } = req.body;
        if (!repoName || typeof repoName !== "string") {
            res.status(400).json({ message: "Invalid repoName" });
            return;
        }

        // Set visible = 1 in SQLite projects table
        const info = db.prepare(`UPDATE projects SET visible = 1 WHERE repoName = ?`).run(repoName);

        if (info.changes === 0) {
            res.status(404).json({ message: "Project not found in SQLite database" });
            return;
        }

        res.status(200).json({ message: "Project published successfully" });

    } catch (error) {
        console.error("[handlePublishProject]", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
