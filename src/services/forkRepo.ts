import { config } from "../config/gitConfig";
import { generateKey, hashKey, createMetaData } from "../utils/hash";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { v4 as uuidv4 } from "uuid";

export const forkRepo = async (
    originalRepo: string,
    creatorName: string = "",
    projectName: string = ""
): Promise<{ repoName: string; key: string; projectData: string, description: string }> => {
    const octokit = await getAuthenticatedOctokit();

    // Get original repo
    const getFile = async (path: string) => {
        const res = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            {
                owner: config.org,
                repo: originalRepo,
                path,
            }
        );
        const content = Buffer.from(res.data.content, "base64").toString();
        return JSON.parse(content);
    };

    const projectData = await getFile("projectData.json");
    const originalMeta = await getFile("metaData.json");

    // new metadata
    const key = generateKey();
    const hashedKey = hashKey(key);
    const forkMeta = {
        ...createMetaData(hashedKey, originalMeta.theme || "default", projectName, creatorName),
        forkedFrom: `https://github.com/${config.org}/${originalRepo}`,
    };
    const uniqueRepoName = `fork-${originalRepo}-${uuidv4()}`;

    // Create repo
    await octokit.request(`POST /orgs/{org}/repos`, {
        org: config.org,
        name: uniqueRepoName,
        description: `Fork of ${originalRepo}`,
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true,
    });

    //Write to new repo
    const files = [
        {
            path: "projectData.json",
            content: JSON.stringify(projectData, null),
        },
        {
            path: "metaData.json",
            content: JSON.stringify(forkMeta, null),
        },
    ];

    await Promise.all(
        files.map((file) =>
            octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
                owner: config.org,
                repo: uniqueRepoName,
                path: file.path,
                message: `Add ${file.path}`,
                content: Buffer.from(file.content).toString("base64"),
            })
        )
    );
    const response = await octokit.request("GET /repos/{owner}/{repo}", {
        owner: config.org,
        repo: originalRepo,
    });

    const description = response.data.description || "";

    // Encode projectData the same way getProjectData.ts does for Format A
    // (raw JSON object → base64+URI-encoded string) so the frontend's
    // decodeTB() can consume it directly.
    const encodedProjectData = Buffer
        .from(encodeURIComponent(JSON.stringify(projectData)))
        .toString("base64");

    return {
        repoName: uniqueRepoName,
        key,
        projectData: encodedProjectData,
        description,
    };
};
