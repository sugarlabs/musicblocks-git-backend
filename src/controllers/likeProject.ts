import { Request, Response } from "express";
import { getLikeCount, likeProject } from "../services/likeProject";

export const handleLikeProject = async (req: Request, res: Response) => {
    try {
        const { repoName, userId, like } = req.body;

        if (
            typeof repoName !== 'string' ||
            typeof userId !== 'string' ||
            typeof like !== 'boolean' ||
            repoName.trim() === '' ||
            userId.trim() === ''
        ) {
            res.status(400).json({ error: "repoName, userId, and boolean like are required" });
            return;
        }

        const result = likeProject({
            repoName: repoName.trim(),
            userId: userId.trim(),
            like,
        });

        if (!result) {
            res.status(404).json({ error: "Project not found" });
            return;
        }

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to update like" });
    }
};

export const handleGetLikeCount = async (req: Request, res: Response) => {
    try {
        const { repoName } = req.params;
        const result = getLikeCount(repoName);

        if (!result) {
            res.status(404).json({ error: "Project not found" });
            return;
        }

        res.status(200).json({ repoName, likes: result.likes });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch likes" });
    }
};
