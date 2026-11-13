import { Request, Response } from "express";
import { handleToggleVisibility } from "../../src/controllers/toggleVisibility";
import { toggleProjectVisibility, VisibilityError } from "../../src/services/toggleVisibility";

jest.mock("../../src/services/toggleVisibility", () => ({
  toggleProjectVisibility: jest.fn(),
  VisibilityError: class VisibilityError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

const mockToggle = jest.mocked(toggleProjectVisibility);
const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
};

describe("handleToggleVisibility", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unpublishes an owned project and returns frontend-compatible success", async () => {
    const req = { body: { repoName: "song", key: "owner-key", visible: false } } as Request;
    const res = makeResponse();
    await handleToggleVisibility(req, res);
    expect(mockToggle).toHaveBeenCalledWith("song", "owner-key", false);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, visible: false });
  });

  it("republishes an owned project when visible is true", async () => {
    const req = { body: { repoName: "song", key: "owner-key", visible: true } } as Request;
    const res = makeResponse();
    await handleToggleVisibility(req, res);
    expect(mockToggle).toHaveBeenCalledWith("song", "owner-key", true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, visible: true });
  });

  it("rejects an invalid owner key", async () => {
    mockToggle.mockRejectedValueOnce(new VisibilityError(403, "Invalid key — permission denied"));
    const res = makeResponse();
    await handleToggleVisibility({ body: { repoName: "song", key: "bad", visible: false } } as Request, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid key — permission denied" });
  });

  it("returns 404 for an unknown project", async () => {
    mockToggle.mockRejectedValueOnce(new VisibilityError(404, "Project not found"));
    const res = makeResponse();
    await handleToggleVisibility({ body: { repoName: "missing", key: "owner-key", visible: false } } as Request, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects requests missing a required field", async () => {
    const res = makeResponse();
    await handleToggleVisibility({ body: { repoName: "song", key: "owner-key" } } as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "visible must be a boolean" });
    expect(mockToggle).not.toHaveBeenCalled();
  });
});
