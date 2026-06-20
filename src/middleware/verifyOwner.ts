import { NextFunction, Request, Response, } from "express";
import { config } from "../config/gitConfig";
import { hashKey } from "../utils/hash";
import { getAuthenticatedOctokit } from "../utils/octokit";

export const verifyOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { repoName, key } = req.body;
    if (!repoName || !key) {
        res.status(400).json({ error: "Missing key or RepoName" });
        return;
    }
    try {
        const octokit = await getAuthenticatedOctokit();
        const { data: metaFile } = await octokit.request(
            `GET /repos/{owner}/{repo}/contents/metaData.json`, {
            owner: config.org,
            repo: repoName
        }
        )
        const decoded = Buffer.from(metaFile.content, 'base64').toString();
        const metadata = JSON.parse(decoded);
        const incomingHash = hashKey(key);
        if (incomingHash != metadata.hashedKey) {
            res.status(403).json({ error: "Invalid key, permission denied" });
            return;
        }
        res.locals.metaSha = metaFile.sha;
        next();
    } catch (error) {
        console.error("[verifyOwner] Error verifying project owner:", error);
        res.status(404).json({ error: 'metaData.json not found or repo invalid' });
        return;
    }
}