import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

export const getAllRepositories = async (page: number) => {
  const octokit = await getAuthenticatedOctokit();
  try {
    const repositories = await octokit.request("GET /orgs/{org}/repos", {
      org: config.org,
      direction: 'desc',
      per_page: 50,
      page,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github.mercy-preview+json",
      },
    });
    return repositories;
  } catch (error) {
    console.log(error);
    return;
  }
};
