import { generateKey, hashKey, createMetaData } from "../utils/hash";
import { config } from "../config/gitConfig";
import simpleGit from "simple-git";
import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { getInstallationToken } from "./getToken";
import os from "os";

export const forkWithHistory = async (
  originalRepo: string,
  creatorName: string = "",
  projectName: string = ""
): Promise<{
  repoName: string;
  key: string;
  success: boolean;
  projectData: Record<string, unknown>;
  description: string;
}> => {
  const uuid = uuidv4();
  const uniqueRepoName = `${originalRepo}-fork-${uuid}`;

  // Use a temp dir inside the OS temp directory (never inside the project tree)
  const tempDir = path.join(os.tmpdir(), `mb-fork-${uuidv4()}`);
  fs.ensureDirSync(tempDir);

  try {
    // ── Step 1: Clone the source repo (public, no auth needed) ────────────────
    const publicSourceUrl = `https://github.com/${config.org}/${originalRepo}.git`;
    const git = simpleGit();
    await git.clone(publicSourceUrl, tempDir, ["--depth", "1"]);

    const repoGit = simpleGit(tempDir);

    // ── Step 2: Create the destination repo via GitHub App ────────────────────
    const octokit = await getAuthenticatedOctokit();
    await octokit.request("POST /orgs/{org}/repos", {
      org: config.org,
      name: uniqueRepoName,
      description: `Fork with history of ${originalRepo}`,
      private: false,
    });

    // ── Step 3: Update metaData.json with a fresh ownership key ───────────────
    const key = generateKey();
    const hashedKey = hashKey(key);

    const metaDataPath = path.join(tempDir, "metaData.json");
    const existingMeta = fs.existsSync(metaDataPath)
      ? JSON.parse(fs.readFileSync(metaDataPath, "utf-8"))
      : { theme: "default" };

    const newMeta = {
      ...createMetaData(hashedKey, existingMeta.theme || "default", projectName, creatorName),
      forkedFrom: `https://github.com/${config.org}/${originalRepo}`,
    };

    fs.writeFileSync(metaDataPath, JSON.stringify(newMeta, null, 2));

    const projectDataPath = path.join(tempDir, "projectData.json");
    const projectData = fs.existsSync(projectDataPath)
      ? JSON.parse(fs.readFileSync(projectDataPath, "utf-8"))
      : {};

    // ── Step 4: Commit the updated metaData, push via installation token ───────
    // The token goes into the remote URL as x-access-token (not a PAT, expires 1hr).
    // simple-git does NOT expose remote URLs in shell argv — the creds travel
    // through git's built-in credential path only.
    const token = await getInstallationToken();
    const authedPushUrl = `https://x-access-token:${token}@github.com/${config.org}/${uniqueRepoName}.git`;

    await repoGit.addConfig("user.name", "Musicblocks Bot");
    await repoGit.addConfig("user.email", "bot@musicblocks.org");
    await repoGit.add("metaData.json");
    await repoGit.commit("Update metaData.json with new hashedKey");
    await repoGit.removeRemote("origin");
    await repoGit.addRemote("origin", authedPushUrl);
    await repoGit.push("origin", "main", ["--set-upstream"]);

    // ── Step 5: Get description from the original repo ────────────────────────
    const response = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: config.org,
      repo: originalRepo,
    });
    const description = response.data.description || "";

    return {
      repoName: uniqueRepoName,
      key,
      success: true,
      projectData,
      description,
    };
  } catch (err) {
    console.error("Fork with history failed:", err);
    throw err;
  } finally {
    fs.removeSync(tempDir);
  }
};
