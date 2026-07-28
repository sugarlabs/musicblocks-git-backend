import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";
import { v4 as uuidv4 } from "uuid";
import { sanitizeTopics } from "../utils/sanitizeTopics";

export const createRepo = async (
  repoName: string,
  projectData: object,
  metaData: object,
  description: string,
  theme: string,
  thumbnailDataUrl?: string
): Promise<string> => {
  const octokit = await getAuthenticatedOctokit();
  let uniqueRepoName = repoName;
  const projectDesc = description;
  let themeArray = theme.split(',');
  themeArray = sanitizeTopics(themeArray);

  let repo;
  try {
    //create repo
    repo = await octokit.request(`POST /orgs/{org}/repos`, {
      org: config.org,
      name: uniqueRepoName,
      description: projectDesc,
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (err: any) {
    // unique repo name if name already exist
    let isNameTaken = false;
    if (err && err.status === 422) {
      if (err.response && err.response.data && Array.isArray(err.response.data.errors)) {
        isNameTaken = err.response.data.errors.some((e: any) => e.message && e.message.includes("name already exists"));
      } else if (err.message && err.message.includes("name already exists")) {
        isNameTaken = true;
      }
    }

    if (isNameTaken) {
      uniqueRepoName = `${repoName}-${uuidv4()}`;
      repo = await octokit.request(`POST /orgs/{org}/repos`, {
        org: config.org,
        name: uniqueRepoName,
        description,
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        headers: {
          "X-Github-Api-Version": "2022-11-28",
        },
      });
    } else {
      throw err;
    }
  }

  //writing files to repo
  const owner = config.org;
  const filesToCreate: Array<{ path: string; content: string; encoded?: boolean }> = [
    {
      path: "projectData.json",
      content: JSON.stringify(projectData, null),
    },
    {
      path: `metaData.json`,
      content: JSON.stringify(metaData, null),
    },
  ];

  const thumbnailMatch = typeof thumbnailDataUrl === "string"
    ? thumbnailDataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)
    : null;
  if (thumbnailMatch) {
    filesToCreate.push({
      path: "thumbnail.png",
      content: thumbnailMatch[1],
      encoded: true,
    });
  }

  await Promise.all(
    filesToCreate.map((file) =>
      octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo: uniqueRepoName,
        path: file.path,
        message: `Add ${file.path}`,
        content: file.encoded ? file.content : Buffer.from(file.content).toString("base64"),
      })
    )
  );
  await octokit.request("PUT /repos/{owner}/{repo}/topics", {
    owner: config.org,
    repo: uniqueRepoName,
    names: themeArray,
    headers: {
      Accept: "application/vnd.github.mercy-preview+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return repo.data.html_url;
};
