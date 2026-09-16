import { Request, Response } from "express";
import db from "../utils/db";

type ThemeRow = { theme: string | null };

const toTagName = (topic: string): string =>
    topic.charAt(0).toUpperCase() + topic.slice(1);

export const handleGetTagManifest = (_req: Request, res: Response): void => {
    try {
        const rows = db
            .prepare(
                `SELECT theme FROM projects
                 WHERE visible = 1
                   AND theme IS NOT NULL
                   AND TRIM(theme) <> ''`
            )
            .all() as ThemeRow[];

        const topicCounts: Record<string, number> = {};
        for (const row of rows) {
            for (const rawTopic of String(row.theme || "").split(",")) {
                const topic = rawTopic.trim().toLowerCase();
                if (topic) {
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                }
            }
        }

        const manifest: Record<string, {
            TagName: string;
            IsTagUserAddable: "1";
            IsDisplayTag: "0" | "1";
            usageCount: number;
        }> = {};

        Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([topic, count], index) => {
                manifest[topic] = {
                    TagName: toTagName(topic),
                    IsTagUserAddable: "1",
                    IsDisplayTag: index < 8 ? "1" : "0",
                    usageCount: count,
                };
            });

        res.status(200).json({ success: true, data: manifest });
    } catch (error) {
        console.error("[handleGetTagManifest]", error);
        res.status(500).json({ error: "Failed to fetch tag manifest" });
    }
};
