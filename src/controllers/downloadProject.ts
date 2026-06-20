import { Request, Response } from "express";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { config } from "../config/gitConfig";

export const handleDownloadProject = async (req: Request, res: Response) => {
    try {
        const { repoName } = req.params;
        if (!repoName || typeof repoName !== "string") {
            res.status(400).json({ message: "Invalid repoName" });
            return;
        }

        const octokit = await getAuthenticatedOctokit();
        
        // Fetch the repository as a ZIP archive
        const response = await octokit.rest.repos.downloadZipballArchive({
            owner: config.org as string,
            repo: repoName,
            ref: "main" // Assuming default branch is main
        });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${repoName}.zip"`);
        
        // response.data is an ArrayBuffer
        res.send(Buffer.from(response.data as ArrayBuffer));

    } catch (error: any) {
        console.error("[handleDownloadProject]", error);
        if (error.status === 404) {
            res.status(404).json({ message: "Project not found on GitHub" });
            return;
        }
        res.status(500).json({ message: "Internal Server Error" });
    }
};
