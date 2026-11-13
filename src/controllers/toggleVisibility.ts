import { Request, Response } from "express";
import { toggleProjectVisibility, VisibilityError } from "../services/toggleVisibility";

export const handleToggleVisibility = async (req: Request, res: Response): Promise<void> => {
    const { repoName, key, visible } = req.body ?? {};
    if (typeof repoName !== "string" || !repoName.trim()) {
        res.status(400).json({ error: "repoName is required" });
        return;
    }
    if (typeof key !== "string" || !key) {
        res.status(400).json({ error: "key is required" });
        return;
    }
    if (typeof visible !== "boolean") {
        res.status(400).json({ error: "visible must be a boolean" });
        return;
    }

    try {
        await toggleProjectVisibility(repoName.trim(), key, visible);
        res.status(200).json({ success: true, visible });
    } catch (error) {
        if (error instanceof VisibilityError) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error("[handleToggleVisibility]", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
