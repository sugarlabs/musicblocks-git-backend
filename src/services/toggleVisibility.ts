import { timingSafeEqual } from "crypto";
import { hashKey } from "../utils/hash";
import db from "../utils/db";

export class VisibilityError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "VisibilityError";
    }
}

const safeEqual = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

/**
 * Verify project ownership against the hashedKey stored in SQLite (same source
 * as /publish), then change only the project's `visible` flag. No GitHub call.
 */
export const toggleProjectVisibility = (repoName: string, key: string, visible: boolean): void => {
    const row = db
        .prepare("SELECT hashedKey FROM projects WHERE repoName = ?")
        .get(repoName) as { hashedKey: string } | undefined;
    if (!row) throw new VisibilityError(404, "Project not found");

    if (!row.hashedKey || !safeEqual(hashKey(key), row.hashedKey)) {
        throw new VisibilityError(403, "Invalid key — permission denied");
    }

    try {
        db.prepare("UPDATE projects SET visible = ? WHERE repoName = ?").run(visible ? 1 : 0, repoName);
    } catch {
        throw new VisibilityError(500, "Failed to update project visibility");
    }
};
