import db from '../utils/db';
import { Pagination } from '../utils/pagination';
import { PUBLIC_PROJECT_COLUMNS } from './projectColumns';

const buildFtsQuery = (queryStr: string): string => {
    const terms = queryStr
        .trim()
        .split(/\s+/)
        .map((term) => term.replace(/"/g, '""').replace(/[^\p{L}\p{N}_-]/gu, ''))
        .filter(Boolean)
        .slice(0, 8);

    return terms.map((term) => `"${term}"*`).join(' ');
};

const publicColumns = PUBLIC_PROJECT_COLUMNS
    .split(',')
    .map((column) => `p.${column.trim()}`)
    .join(', ');

export const searchProjects = async (queryStr: string, pagination: Pagination) => {
    try {
        const { page, limit, offset } = pagination;
        const safeQuery = buildFtsQuery(queryStr);

        if (!safeQuery) {
            return {
                data: [],
                meta: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        // The FTS5 table columns are: repoName, projectName, description, creatorName, searchKeywords
        const query = `
            SELECT ${publicColumns}
            FROM projects_fts fts
            JOIN projects p ON fts.rowid = p.rowid
            WHERE projects_fts MATCH ? AND p.visible = 1
            ORDER BY rank
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT count(*) as total
            FROM projects_fts fts
            JOIN projects p ON fts.rowid = p.rowid
            WHERE projects_fts MATCH ? AND p.visible = 1
        `;

        try {
            const projects = db.prepare(query).all(safeQuery, limit, offset);
            const totalCount = db.prepare(countQuery).get(safeQuery) as { total: number };

            return {
                data: projects,
                meta: {
                    page,
                    limit,
                    total: totalCount.total,
                    totalPages: Math.ceil(totalCount.total / limit)
                }
            };
        } catch (ftsErr: any) {
            // FTS5 throws a parse error on certain edge-case inputs (e.g. lone
            // dashes or operators) that survive the character filter. Return
            // empty results rather than a 500 so the frontend degrades cleanly.
            if (
                typeof ftsErr?.message === 'string' &&
                (ftsErr.message.includes('fts5') || ftsErr.message.includes('malformed'))
            ) {
                console.warn('[search] FTS5 parse error for query:', safeQuery, ftsErr.message);
                return {
                    data: [],
                    meta: { page, limit, total: 0, totalPages: 0 }
                };
            }
            throw ftsErr;
        }
    } catch (error) {
        console.error("Error searching projects:", error);
        throw error;
    }
};
