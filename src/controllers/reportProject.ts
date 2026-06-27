import { Request, Response } from "express";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { config } from "../config/gitConfig";

export const handleReportProject = async (req: Request, res: Response) => {
    try {
        const { repoName, description } = req.body;
        if (!repoName || typeof repoName !== "string") {
            res.status(400).json({ message: "Invalid repoName" });
            return;
        }

        const octokit = await getAuthenticatedOctokit();
        
        // Create an issue in a central moderation repository instead of the individual repo
        // This makes it easy for admins to see all reports in one place.
        const moderationRepo = process.env.MODERATION_REPO || "mb-moderation";

        const githubLink = `https://github.com/${config.org}/${repoName}`;
        const musicblocksLink = `https://musicblocks.sugarlabs.org/?id=${encodeURIComponent(repoName)}`;

        await octokit.rest.issues.create({
            owner: config.org as string,
            repo: moderationRepo,
            title: `Report: Project ${repoName}`,
            body: [
                `A user has reported the project **${repoName}**.`,
                ``,
                `## Project Links`,
                `- 🐙 **GitHub repo:** [${repoName}](${githubLink})`,
                `- 🎵 **Open in Music Blocks:** [${repoName}](${musicblocksLink})`,
                ``,
                `## Reason provided`,
                `${description || "No reason provided."}`
            ].join("\n"),
            labels: ["report", "moderation"]
        });

        res.status(200).json({ message: "Project reported successfully" });

    } catch (error) {
        console.error("[handleReportProject]", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
