import db from '../utils/db';

interface LikeProjectInput {
    repoName: string;
    userId: string;
    like: boolean;
}

const getVisibleProject = db.prepare(`
    SELECT likes
    FROM projects
    WHERE repoName = ? AND visible = 1
`);

const insertLike = db.prepare(`
    INSERT OR IGNORE INTO project_likes (repoName, userId)
    VALUES (?, ?)
`);

const deleteLike = db.prepare(`
    DELETE FROM project_likes
    WHERE repoName = ? AND userId = ?
`);

const incrementLikes = db.prepare(`
    UPDATE projects
    SET likes = likes + 1
    WHERE repoName = ?
`);

const decrementLikes = db.prepare(`
    UPDATE projects
    SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END
    WHERE repoName = ?
`);

const getLikeCountStatement = db.prepare(`
    SELECT likes
    FROM projects
    WHERE repoName = ? AND visible = 1
`);

export const likeProject = db.transaction(({ repoName, userId, like }: LikeProjectInput) => {
    const project = getVisibleProject.get(repoName) as { likes: number } | undefined;
    if (!project) {
        return null;
    }

    if (like) {
        const result = insertLike.run(repoName, userId);
        if (result.changes > 0) {
            incrementLikes.run(repoName);
        }
    } else {
        const result = deleteLike.run(repoName, userId);
        if (result.changes > 0) {
            decrementLikes.run(repoName);
        }
    }

    const updated = getLikeCountStatement.get(repoName) as { likes: number };
    return {
        repoName,
        liked: like,
        likes: updated.likes,
    };
});

export const getLikeCount = (repoName: string) => {
    const project = getLikeCountStatement.get(repoName) as { likes: number } | undefined;
    return project || null;
};
