// Copyright (c) 2026 Music Blocks Contributors
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed WITHOUT ANY WARRANTY. See
// <https://www.gnu.org/licenses/> for the full license.

import { jest } from '@jest/globals';
import db from '../../src/utils/db';
import { getAllRepositories } from '../../src/services/getAllRepos';

jest.mock('../../src/utils/db', () => {
  const Database = jest.requireActual<typeof import('better-sqlite3')>('better-sqlite3');
  return { __esModule: true, default: new Database(':memory:') };
});

describe('gallery topic filtering', () => {
  const pagination = { page: 1, limit: 24, offset: 0 };

  beforeAll(() => {
    db.exec(`CREATE TABLE projects (
      repoName TEXT PRIMARY KEY, projectName TEXT, planetId TEXT, description TEXT,
      theme TEXT, creatorName TEXT, createdAt TEXT, updatedAt TEXT,
      likes INTEGER DEFAULT 0, downloads INTEGER DEFAULT 0,
      hasThumbnail INTEGER DEFAULT 0, isMigrated INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1, isMusicBlocks INTEGER DEFAULT 1
    )`);
  });

  beforeEach(() => {
    db.exec('DELETE FROM projects');
    const insert = db.prepare(`INSERT INTO projects
      (repoName, projectName, theme, createdAt, updatedAt, likes, downloads, visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    [
      ['ordered', 'Alpha', 'music,math', '2026-01-01', '2026-01-01', 3, 1, 1],
      ['reversed', 'Bravo', 'math,music', '2026-01-02', '2026-01-02', 1, 3, 1],
      ['separated', 'Charlie', 'music,art,math', '2026-01-03', '2026-01-03', 2, 2, 1],
      ['partial', 'Delta', 'music,mathematics', '2026-01-04', '2026-01-04', 9, 9, 1],
      ['hidden', 'Hidden', 'music,math', '2026-01-05', '2026-01-05', 10, 10, 0],
      ['untagged', 'Untagged', null, '2026-01-06', '2026-01-06', 0, 0, 1]
    ].forEach(row => insert.run(...row));
  });

  afterAll(() => db.close());

  it.each(['music,math', 'math,music', ' MUSIC , Math ', 'music,,math,', 'music,math,music'])(
    'requires every selected tag independently for %s',
    async topic => {
      const result = await getAllRepositories(pagination, 'projectName', topic);
      expect(result.data).toEqual([
        expect.objectContaining({ repoName: 'ordered' }),
        expect.objectContaining({ repoName: 'reversed' }),
        expect.objectContaining({ repoName: 'separated' })
      ]);
      expect(result.meta).toEqual({ page: 1, limit: 24, total: 3, totalPages: 1 });
    }
  );

  it('keeps single-tag matches and excludes unpublished projects', async () => {
    const result = await getAllRepositories(pagination, 'projectName', 'math');
    expect(result.data).toHaveLength(3);
    expect(result.meta.total).toBe(3);
  });

  it('requires all three selected tags', async () => {
    const result = await getAllRepositories(pagination, 'createdAt', 'math,music,art');
    expect(result.data).toEqual([expect.objectContaining({ repoName: 'separated' })]);
  });

  it.each([undefined, '', ' , , '])('leaves the public list unfiltered for %s', async topic => {
    const result = await getAllRepositories(pagination, 'projectName', topic);
    expect(result.data).toHaveLength(5);
    expect(result.meta.total).toBe(5);
  });

  it('uses the same tag conditions for rows and pagination totals', async () => {
    const first = await getAllRepositories({ page: 1, limit: 2, offset: 0 }, 'projectName', 'math,music');
    const second = await getAllRepositories({ page: 2, limit: 2, offset: 2 }, 'projectName', 'math,music');
    expect(first.data).toEqual([
      expect.objectContaining({ repoName: 'ordered' }),
      expect.objectContaining({ repoName: 'reversed' })
    ]);
    expect(second.data).toEqual([expect.objectContaining({ repoName: 'separated' })]);
    expect(first.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(second.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it.each([
    ['createdAt', 'separated'], ['likes', 'ordered'], ['downloads', 'reversed'],
    ['projectName', 'ordered'], ['invalid-sort', 'separated']
  ])('preserves %s sorting', async (sort, firstRepo) => {
    const result = await getAllRepositories(pagination, sort, 'music,math');
    expect(result.data[0]).toEqual(expect.objectContaining({ repoName: firstRepo }));
  });

  it.each(['100%', 'a_b', 'a\\b', "quote' OR 1=1 --"])(
    'matches the literal topic %s without interpreting SQL syntax or wildcards',
    async topic => {
      db.prepare(`INSERT INTO projects(repoName, projectName, theme, visible)
        VALUES ('literal', 'Literal', ?, 1)`).run(`music,${topic}`);
      const result = await getAllRepositories(pagination, 'projectName', `music,${topic}`);
      expect(result.data).toEqual([expect.objectContaining({ repoName: 'literal' })]);
      expect(result.meta.total).toBe(1);
    }
  );
});
