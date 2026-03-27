import { generateKey, hashKey, createMetaData } from "../utils/hash";
import { config } from "../config/gitConfig";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedOctokit } from "../utils/octokit";

export const forkWithHistory = async (
  originalRepo: string
): Promise<{
  repoName: string;
  key: string;
  success: boolean;
  projectData: Record<string, unknown>;
  description: string;
}> => {
  const uuid = uuidv4();
  const uniqueRepoName = `${originalRepo}-fork-${uuid}`;
  const forkedFromURL = `https://github.com/${config.org}/${originalRepo}.git`;
  const newRepoURL = `https://github.com/${config.org}/${uniqueRepoName}.git`;

  const tempDir = path.join("/tmp", `clone-${uuidv4()}`);
  fs.ensureDirSync(tempDir);

  try {
    // Guard: GIT_CONFIG_COUNT/KEY/VALUE env vars require Git >= 2.32.
    // Fail loudly here rather than silently failing to authenticate on push.
    const gitVersion = execSync("git --version", { stdio: "pipe" }).toString().trim();
    const versionMatch = gitVersion.match(/(\d+)\.(\d+)/);
    if (!versionMatch) throw new Error(`Cannot parse git version: ${gitVersion}`);
    const [major, minor] = [parseInt(versionMatch[1]), parseInt(versionMatch[2])];
    if (major < 2 || (major === 2 && minor < 32)) {
      throw new Error(
        `Git >= 2.32 is required for secure credential injection via env vars. Found: ${gitVersion}`
      );
    }

    // Clone using the public HTTPS URL — no token needed for a public repo.
    // stdio is set to 'pipe' so URLs and any sensitive output are not printed
    // to the server's stdout/stderr.
    execSync(`git clone ${forkedFromURL} ${tempDir}`, { stdio: "pipe" });

    const octokit = await getAuthenticatedOctokit();
    // Obtain the installation access token so we can use it as a git
    // credential without embedding it in any URL.
    const { getInstallationToken } = await import("./getToken");
    const installationToken = await getInstallationToken();

    await octokit.request("POST /orgs/{org}/repos", {
      org: config.org,
      name: uniqueRepoName,
      description: `Fork with history of ${originalRepo}`,
      private: false,
    });

    const key = generateKey();
    const hashedKey = hashKey(key);

    const metaDataPath = path.join(tempDir, "metaData.json");
    const existingMeta = fs.existsSync(metaDataPath)
      ? JSON.parse(fs.readFileSync(metaDataPath, "utf-8"))
      : { theme: "default" };

    const newMeta = {
      ...createMetaData(hashedKey, existingMeta.theme || "default"),
      forkedFrom: `https://github.com/${config.org}/${originalRepo}`,
    };

    fs.writeFileSync(metaDataPath, JSON.stringify(newMeta, null, 2));
    const projectDataPath = path.join(tempDir, "projectData.json");
    const projectData = fs.existsSync(projectDataPath)
      ? JSON.parse(fs.readFileSync(projectDataPath, "utf-8"))
      : {};
    execSync(`git config user.name "Musicblocks Bot"`, { cwd: tempDir, stdio: "pipe" });
    execSync(`git config user.email "bot@musicblocks.org"`, { cwd: tempDir, stdio: "pipe" });

    // The token is scoped to only the `git push` subprocess below via
    // GIT_CONFIG_* env vars. It never touches the shell command line,
    // on-disk git config, or the remote URL — so it won't appear in
    // `ps aux`, shell history, server logs, or git remote -v output.
    const authHeader = `Authorization: Bearer ${installationToken}`;

    execSync(`git add metaData.json`, { cwd: tempDir, stdio: "pipe" });
    execSync(`git commit -m "Update metaData.json with new hashedKey"`, {
      cwd: tempDir,
      stdio: "pipe",
    });

    execSync(`git remote remove origin`, { cwd: tempDir, stdio: "pipe" });
    execSync(`git remote add origin ${newRepoURL}`, { cwd: tempDir, stdio: "pipe" });

    // Detect the actual default branch instead of hard-coding 'main'.
    const defaultBranch = execSync(`git rev-parse --abbrev-ref HEAD`, { cwd: tempDir, stdio: "pipe" })
      .toString()
      .trim();

    // Use GIT_CONFIG_* env variables to inject the header only for this process.
    execSync(`git push -u origin ${defaultBranch}`, {
      cwd: tempDir,
      stdio: "pipe",
      env: {
        ...process.env,
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.extraHeader",
        GIT_CONFIG_VALUE_0: authHeader,
      },
    });
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
