import { config } from "../config/gitConfig";
import { getAuthenticatedOctokit } from "../utils/octokit";

const getRepoStats = async (octokit: any, repoName: string) => {
  const repo = await octokit.request("GET /repos/{owner}/{repo}", {
    owner: config.org,
    repo: repoName,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });

  const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner: config.org,
    repo: repoName,
    per_page: 100,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });

  return {
    name: repoName,
    commits: commits.data.length,
    forks: repo.data.forks_count,
    lastUpdated: repo.data.updated_at,
    description: repo.data.description || '',
    topics: repo.data.topics?.length || 0,
  };
};

const calculateScore = (stats: any): number => {
  let score = 0;
  score += stats.commits * 3;
  score += stats.forks * 3;
  score += stats.topics;
  score += stats.description.length > 0 ? 1 : 0;
  return score;
};

export const compareProjects = async (repo1: string, repo2: string) => {
  const octokit = await getAuthenticatedOctokit();

  const [stats1, stats2] = await Promise.all([
    getRepoStats(octokit, repo1),
    getRepoStats(octokit, repo2),
  ]);

  const score1 = calculateScore(stats1);
  const score2 = calculateScore(stats2);

  const winner =
    score1 > score2
      ? { name: repo1, reason: "More commits, forks and activity" }
      : score2 > score1
      ? { name: repo2, reason: "More commits, forks and activity" }
      : { name: "tie", reason: "Both projects are equally awesome!" };

  return {
    repo1: { ...stats1, score: score1 },
    repo2: { ...stats2, score: score2 },
    winner,
  };
};