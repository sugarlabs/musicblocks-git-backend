import db from '../utils/db';

interface LikeProjectInput {
    repoName: string;
    userId: string;
    like: boolean;
}

// NOTE: All db.prepare() calls are intentionally kept INSIDE the transaction
// function body. If they were at module level they would be compiled at import
// time — before db.ts has run initializeLikes() to create the project_likes
// table — and would crash the server with "no such table: project_likes".
export const likeProject = db.transaction(({ repoName, userId, like }: LikeProjectInput) => {
    const project = db.prepare(`
        SELECT likes
        FROM projects
        WHERE repoName = ? AND visible = 1
    `).get(repoName) as { likes: number } | undefined;

    if (!project) {
        return null;
    }

    let actuallyChanged = false;

    if (like) {
        const result = db.prepare(`
            INSERT OR IGNORE INTO project_likes (repoName, userId)
            VALUES (?, ?)
        `).run(repoName, userId);

        if (result.changes > 0) {
            actuallyChanged = true;
            db.prepare(`
                UPDATE projects SET likes = likes + 1 WHERE repoName = ?
            `).run(repoName);
        }
    } else {
        const result = db.prepare(`
            DELETE FROM project_likes WHERE repoName = ? AND userId = ?
        `).run(repoName, userId);

        if (result.changes > 0) {
            actuallyChanged = true;
            db.prepare(`
                UPDATE projects
                SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END
                WHERE repoName = ?
            `).run(repoName);
        }
    }

    const updated = db.prepare(`
        SELECT likes FROM projects WHERE repoName = ? AND visible = 1
    `).get(repoName) as { likes: number };

    return {
        repoName,
        // `liked` reflects what ACTUALLY happened in the DB, not just the
        // requested action. If the user already liked/unliked, this is false.
        liked: like ? actuallyChanged : !actuallyChanged,
        likes: updated.likes,
    };
});

export const getLikeCount = (repoName: string) => {
    const project = db.prepare(`
        SELECT likes FROM projects WHERE repoName = ? AND visible = 1
    `).get(repoName) as { likes: number } | undefined;
    return project || null;
};
