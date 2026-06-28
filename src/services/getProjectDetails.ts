import db from '../utils/db';
import { PUBLIC_PROJECT_COLUMNS } from './projectColumns';

export const getProjectDetails = async (repoName: string) => {
    try {
        const query = `SELECT ${PUBLIC_PROJECT_COLUMNS} FROM projects WHERE repoName = ? AND visible = 1`;
        const project = db.prepare(query).get(repoName);
        return project || null;
    } catch (error) {
        console.error(`Error fetching project details for ${repoName}:`, error);
        throw error;
    }
};
