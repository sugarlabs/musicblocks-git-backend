import Database from 'better-sqlite3';
import path from 'path';

// SQLITE_PATH env var overrides for production (e.g. Sunjammer).
// Locally it falls back to Gitbased/projects.sqlite (the sibling folder).
const dbPath = process.env.SQLITE_PATH
    || path.resolve(__dirname, '../../../projects.sqlite');

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

const initializeThumbnails = () => {
    // Two-table schema produced by the Python thumbnail migration pipeline.
    // thumbnails stores one row per unique PNG blob (deduplicated by sha256).
    // project_thumbnails maps planet_id → sha256_hash (classification = 'real'
    // means a real blob is present; blank/placeholder rows have sha256_hash = NULL).
    // Using CREATE TABLE IF NOT EXISTS so this is safe on a fully-migrated DB.
    db.exec(`
        CREATE TABLE IF NOT EXISTS thumbnails (
            sha256_hash          TEXT PRIMARY KEY,
            png_data             BLOB NOT NULL,
            width                INTEGER,
            height               INTEGER,
            file_size            INTEGER NOT NULL,
            first_seen_planet_id TEXT,
            created_at           TEXT DEFAULT (datetime('now')),
            updated_at           TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS project_thumbnails (
            planet_id      TEXT PRIMARY KEY,
            sha256_hash    TEXT,
            classification TEXT NOT NULL CHECK(classification IN ('real','blank','placeholder')),
            classified_at  TEXT DEFAULT (datetime('now')),
            updated_at     TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (sha256_hash) REFERENCES thumbnails(sha256_hash) ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_project_thumbnails_hash
            ON project_thumbnails(sha256_hash);
    `);
};

ensureProjectsTableExists();
initializeIndexes();
initializeLikes();
initializeThumbnails();

console.log(`[db] Connected to ${dbPath}`);

export default db;
