import db from '../utils/db';
import { Pagination } from '../utils/pagination';
import { PUBLIC_PROJECT_COLUMNS } from './projectColumns';

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const getAllRepositories = async (pagination: Pagination, sort: string = 'createdAt', topic?: string) => {
  try {
    const { page, limit, offset } = pagination;
    
    let query = `SELECT ${PUBLIC_PROJECT_COLUMNS} FROM projects WHERE visible = 1`;
    let countQuery = `SELECT count(*) as total FROM projects WHERE visible = 1`;
    const params: any[] = [];
    
    if (topic) {
        query += ` AND LOWER(',' || COALESCE(theme, '') || ',') LIKE ? ESCAPE '\\'`;
        countQuery += ` AND LOWER(',' || COALESCE(theme, '') || ',') LIKE ? ESCAPE '\\'`;
        params.push(`%,${escapeLike(topic.trim().toLowerCase())},%`);
    }
    
    // Validate sort to prevent SQL injection
    const allowedSorts = ['createdAt', 'likes', 'downloads', 'projectName'];
    const orderBy = allowedSorts.includes(sort) ? sort : 'createdAt';
    const direction = orderBy === 'projectName' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${orderBy} ${direction} LIMIT ? OFFSET ?`;
    
    const projects = db.prepare(query).all(...params, limit, offset);
    const totalCount = db.prepare(countQuery).get(...params) as { total: number };
    
    return {
        data: projects,
        meta: {
            page,
            limit,
            total: totalCount.total,
            totalPages: Math.ceil(totalCount.total / limit)
        }
    };
  } catch (error) {
    console.error("Error fetching repositories from DB:", error);
    throw error;
  }
};
