import Database from "better-sqlite3";
import { hashKey } from "../../src/utils/hash";

let mockDb: Database.Database;
jest.mock("../../src/utils/db", () => ({
  __esModule: true,
  get default() { return mockDb; },
}));

import { toggleProjectVisibility, VisibilityError } from "../../src/services/toggleVisibility";

const visibleOf = (repo: string) =>
  (mockDb.prepare("SELECT visible FROM projects WHERE repoName = ?").get(repo) as { visible: number }).visible;

describe("toggleProjectVisibility", () => {
  beforeEach(() => {
    mockDb = new Database(":memory:");
    mockDb.exec("CREATE TABLE projects (repoName TEXT PRIMARY KEY, visible INTEGER NOT NULL DEFAULT 1, hashedKey TEXT NOT NULL DEFAULT '')");
    mockDb.prepare("INSERT INTO projects (repoName, visible, hashedKey) VALUES (?, 1, ?)").run("song", hashKey("owner-key"));
    mockDb.prepare("INSERT INTO projects (repoName, visible, hashedKey) VALUES (?, 1, '')").run("nokey");
  });
  afterEach(() => mockDb.close());

  it("sets visible to 0 with a valid key", () => {
    toggleProjectVisibility("song", "owner-key", false);
    expect(visibleOf("song")).toBe(0);
  });

  it("sets visible back to 1 with a valid key", () => {
    toggleProjectVisibility("song", "owner-key", false);
    toggleProjectVisibility("song", "owner-key", true);
    expect(visibleOf("song")).toBe(1);
  });

  it("throws 403 and leaves visibility unchanged for a wrong key", () => {
    expect(() => toggleProjectVisibility("song", "wrong", false)).toThrow(VisibilityError);
    try { toggleProjectVisibility("song", "wrong", false); } catch (e) { expect((e as VisibilityError).status).toBe(403); }
    expect(visibleOf("song")).toBe(1);
  });

  it("throws 403 when the stored hashedKey is empty", () => {
    try { toggleProjectVisibility("nokey", "", false); fail("expected throw"); }
    catch (e) { expect((e as VisibilityError).status).toBe(403); }
    expect(visibleOf("nokey")).toBe(1);
  });

  it("throws 404 for an unknown project", () => {
    try { toggleProjectVisibility("missing", "owner-key", false); fail("expected throw"); }
    catch (e) { expect((e as VisibilityError).status).toBe(404); }
  });
});
