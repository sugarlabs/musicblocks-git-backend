import db from './db';

/**
 * Resolves a project identifier to its GitHub repository name.
 * 
 * If the identifier is a legacy numeric planetId (e.g. "1584361992611043"),
 * it looks up the corresponding new repoName in SQLite.
 * Otherwise, it assumes the identifier is already a repoName.
 */
export const resolveRepoName = (identifier: any): any => {
    if (typeof identifier === 'string' && /^\d+$/.test(identifier)) {
        try {
            const row = db.prepare('SELECT repoName FROM projects WHERE planetId = ?').get(identifier) as { repoName: string } | undefined;
            if (row) {
                return row.repoName;
            }
        } catch (err) {
            console.error('[resolveRepoName] SQLite lookup failed:', err);
        }
    }
    return identifier;
};
