import Database from 'better-sqlite3';
import path from 'path';

// Resolve the path to the sqlite file in the parent directory (Gitbased/projects.sqlite)
const dbPath = path.resolve(__dirname, '../../../projects.sqlite');

const db = new Database(dbPath, {
    fileMustExist: true,
    verbose: process.env.SQLITE_VERBOSE === '1' ? console.log : undefined,
});

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// The migration script has already created the projects table, the
// projects_fts FTS5 virtual table, and the synchronisation triggers
// (projects_ai, projects_au, projects_ad). We do NOT recreate them here
// to avoid column-mismatch or duplicate-trigger errors.
const ensureProjectsTableExists = () => {
    const table = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'projects'
    `).get();

    if (!table) {
        throw new Error(`SQLite database at ${dbPath} does not contain a projects table`);
    }
};

const initializeIndexes = () => {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_projects_visible_created_at
            ON projects(visible, createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_projects_visible_likes
            ON projects(visible, likes DESC);
        CREATE INDEX IF NOT EXISTS idx_projects_visible_downloads
            ON projects(visible, downloads DESC);
    `);
};

const initializeLikes = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_likes (
            repoName TEXT NOT NULL,
            userId TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (repoName, userId),
            FOREIGN KEY (repoName) REFERENCES projects(repoName) ON DELETE CASCADE
        );
    `);
};

ensureProjectsTableExists();
initializeIndexes();
initializeLikes();

console.log(`[db] Connected to ${dbPath}`);

export default db;
