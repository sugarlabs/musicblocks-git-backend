import { resolveRepoName } from "../utils/resolveRepoName";
import { Request, Response } from "express";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { config } from "../config/gitConfig";
import db from "../utils/db";

const MAX_DESCRIPTION_LENGTH = 1000;
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Put a zero-width space after every "@" so GitHub does not turn user text
 * into a mention that notifies the named account.
 */
const neutralizeMentions = (text: string): string => text.replace(/@/g, "@​");

export const handleReportProject = async (req: Request, res: Response) => {
    try {
        const { repoName: rawRepoName, description: rawDescription } = req.body;
        const repoName = resolveRepoName(rawRepoName);
        if (!repoName || typeof repoName !== "string" || !REPO_NAME_PATTERN.test(repoName)) {
            res.status(400).json({ message: "Invalid repoName" });
            return;
        }

        if (rawDescription !== undefined && rawDescription !== null) {
            if (typeof rawDescription !== "string") {
                res.status(400).json({ message: "description must be a string" });
                return;
            }
            if (rawDescription.trim().length > MAX_DESCRIPTION_LENGTH) {
                res.status(400).json({
                    message: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
                });
                return;
            }
        }
        const description = typeof rawDescription === "string" ? rawDescription.trim() : "";

        const project = db.prepare("SELECT 1 FROM projects WHERE repoName = ?").get(repoName);
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }

        const octokit = await getAuthenticatedOctokit();
        
        // Create an issue in a central moderation repository instead of the individual repo
        // This makes it easy for admins to see all reports in one place.
        const moderationRepo = process.env.MODERATION_REPO || "mb-moderation";

        const githubLink = `https://github.com/${config.org}/${repoName}`;
        const musicblocksLink = `https://musicblocks.sugarlabs.org/index.html?id=${encodeURIComponent(repoName)}&run=True`;

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
                `${description ? neutralizeMentions(description) : "No reason provided."}`
            ].join("\n"),
            labels: ["report", "moderation"]
        });

        res.status(200).json({ message: "Project reported successfully" });

    } catch (error) {
        console.error("[handleReportProject]", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
