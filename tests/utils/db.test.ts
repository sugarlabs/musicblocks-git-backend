import Database from 'better-sqlite3';

// db.ts opens SQLITE_PATH on import; keep it in memory.
process.env.SQLITE_PATH = ':memory:';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbModule = require('../../src/utils/db') as typeof import('../../src/utils/db');
const db = dbModule.default;
const { ensureProjectColumns, PROJECT_COLUMN_DEFAULTS } = dbModule;

import { PUBLIC_PROJECT_COLUMNS } from '../../src/services/projectColumns';

const columnsOf = (database: Database.Database): string[] =>
  (database.prepare('PRAGMA table_info(projects)').all() as { name: string }[]).map(c => c.name);

describe('db', () => {
  it('creates a projects table with every column the API reads and writes on a fresh database', () => {
    const columns = columnsOf(db);
    const required = PUBLIC_PROJECT_COLUMNS.split(',').map(c => c.trim()).filter(Boolean);
    for (const column of [...required, 'hashedKey']) {
      expect(columns).toContain(column);
    }
  });

  it('accepts the row POST /create inserts on a fresh database', () => {
    expect(() => db.prepare(`
      INSERT OR REPLACE INTO projects
          (repoName, projectName, description, theme, creatorName,
           createdAt, updatedAt, likes, downloads,
           hasThumbnail, isMigrated, visible, hashedKey, isMusicBlocks)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, ?, 1)
    `).run('fresh-repo', 'Fresh', 'desc', 'piano', 'alice', 'now', 'now', 0, 'hash')).not.toThrow();

    const row = db.prepare('SELECT projectName, theme, creatorName, visible FROM projects WHERE repoName = ?')
      .get('fresh-repo');
    expect(row).toEqual({ projectName: 'Fresh', theme: 'piano', creatorName: 'alice', visible: 0 });
  });

  it('adds the missing columns to a table created by the earlier minimal schema', () => {
    const old = new Database(':memory:');
    old.exec(`
      CREATE TABLE projects (
        repoName TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', likes INTEGER NOT NULL DEFAULT 0,
        downloads INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')), updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        githubUrl TEXT NOT NULL DEFAULT '', planetId TEXT, hashedKey TEXT NOT NULL DEFAULT ''
      );
      INSERT INTO projects (repoName) VALUES ('existing');
    `);

    ensureProjectColumns(old);

    const columns = columnsOf(old);
    for (const column of Object.keys(PROJECT_COLUMN_DEFAULTS)) {
      expect(columns).toContain(column);
    }
    expect(old.prepare('SELECT theme, isMusicBlocks FROM projects WHERE repoName = ?').get('existing'))
      .toEqual({ theme: 'default', isMusicBlocks: 1 });
    old.close();
  });

  it('leaves a table that already has the columns unchanged', () => {
    const before = columnsOf(db);
    ensureProjectColumns(db);
    expect(columnsOf(db)).toEqual(before);
  });
});
