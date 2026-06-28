import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

/**
 * Fetches projectData.json and returns a string that decodeTB() can consume.
 *
 * Two storage formats exist on GitHub:
 *
 *   A) Migrated projects (legacy MySQL data):
 *        projectData.json = raw MB project JSON array/object
 *        e.g. [[0, ["start", {...}], ...], [1, ...], ...]
 *        → We encode it so decodeTB() can handle it:
 *           Buffer.from(encodeURIComponent(JSON.stringify(raw))).toString("base64")
 *
 *   B) Newly published projects (via POST /create):
 *        projectData.json = JSON.stringify(encodeTB(xmlString))
 *        = a JSON-encoded base64+URI-encoded string, e.g. "\"dGVzdA==\""
 *        → JSON.parse() strips the outer quotes, leaving the raw base64 str.
 *
 * decodeTB() on the frontend does:  decodeURIComponent(atob(str))
 * So this function always returns the base64+URI-encoded string.
 *
 * @param repoName - The repository name inside the GitHub org.
 * @returns base64+URI-encoded project string, ready for decodeTB().
 */
export const getProjectData = async (repoName: string): Promise<string> => {
    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner: config.org,
        repo: repoName,
        path: "projectData.json",
        headers: {
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    // Decode GitHub's own base64 layer to get the plain file text.
    const fileText = Buffer.from(response.data.content, "base64").toString();

    // Parse the file content to understand which format it is.
    const parsed: unknown = JSON.parse(fileText);

    if (typeof parsed === "string") {
        // Format B: newly published project.
        // parsed is already the base64+URI-encoded string from encodeTB().
        return parsed;
    } else {
        // Format A: migrated project — raw JSON data (array or object).
        // Encode it the same way encodeTB() does so decodeTB() can handle it.
        return Buffer.from(encodeURIComponent(JSON.stringify(parsed))).toString("base64");
    }
};
