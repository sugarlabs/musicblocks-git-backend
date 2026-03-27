import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

export const searchRepositories = async (query: string, theme?: string) => {
  const octokit = await getAuthenticatedOctokit();

  let searchQuery = `org:${config.org} ${query} in:name`;
  if (theme) {
    searchQuery += ` topic:${theme}`;
  }

  const result = await octokit.request("GET /search/repositories", {
    q: searchQuery,
    per_page: 50,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return result.data;
};