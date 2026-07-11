import { resolveRepoName } from "../utils/resolveRepoName";
import { Request, Response } from "express";
import db from "../utils/db";

/**
 * GET /thumbnail/:repoName
 *
 * Serves a project thumbnail from SQLite with:
 *  - ETag-based conditional GET (304 Not Modified for cache hits)
 *  - Long-lived Cache-Control (1 hour public, 24 h immutable if ETag matches)
 *  - MIME type sniffed from the PNG/JPEG magic bytes
 *  - Graceful 404 when hasThumbnail = 0 or blob is absent
 *
 * Schema join (migration pipeline layout):
 *   projects  →  project_thumbnails (via planetId = planet_id)
 *             →  thumbnails        (via sha256_hash)
 *
 * The backend's db.ts runs CREATE TABLE IF NOT EXISTS for both tables so
 * they exist even on a fresh database. When the full EC2 SQLite is loaded
 * the rows will already be there; on a dev-only database the join returns
 * nothing and we fall through to 404.
 */

/** Detect MIME type from the first 4 magic bytes of an image buffer. */
function detectMimeType(buf: Buffer): string {
    // PNG: 0x89 0x50 0x4E 0x47
    if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return 'image/png';
    }
    // JPEG: 0xFF 0xD8
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
        return 'image/jpeg';
    }
    // WebP: "RIFF" at 0 and "WEBP" at 8
    if (buf.length >= 12 &&
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
        return 'image/webp';
    }
    // GIF
    if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
        return 'image/gif';
    }
    return 'application/octet-stream';
}

/**
 * Prepared statement: join projects → project_thumbnails → thumbnails
 * using planetId to look up the blob. This matches the migration pipeline
 * schema where project_thumbnails.planet_id = projects.planetId.
 */
const getThumbnailStmt = db.prepare<[string], { png_data: Buffer; sha256_hash: string }>(`
    SELECT t.png_data, pt.sha256_hash
    FROM projects p
    JOIN project_thumbnails pt ON pt.planet_id = p.planetId
    JOIN thumbnails t          ON t.sha256_hash = pt.sha256_hash
    WHERE p.repoName = ?
`);

export const handleGetThumbnail = (req: Request, res: Response): void => {
    try {
        const { repoName: rawRepoName } = req.params;
    const repoName = resolveRepoName(rawRepoName);
        if (!repoName || typeof repoName !== "string") {
            res.status(400).json({ message: "Invalid repoName" });
            return;
        }

        const row = getThumbnailStmt.get(repoName);

        if (!row || !row.png_data) {
            // No thumbnail available — 404 lets the frontend swap in a placeholder.
            res.status(404).json({ message: "Thumbnail not found" });
            return;
        }

        const etag = `"${row.sha256_hash.slice(0, 16)}"`;

        // Conditional GET — return 304 if the client already has this version
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
            res.status(304).end();
            return;
        }

        const mimeType = detectMimeType(row.png_data);

        res.setHeader('Content-Type', mimeType);
        res.setHeader('ETag', etag);
        // 1 hour in shared caches; browsers can reuse until ETag changes
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
        res.setHeader('Content-Length', row.png_data.length.toString());
        res.status(200).send(row.png_data);

    } catch (error) {
        console.error("[handleGetThumbnail]", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
