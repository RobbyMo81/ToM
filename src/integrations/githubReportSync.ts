import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type AppConfig } from "../core/config";

interface RepoPayload {
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
}

interface CommitPayload {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
    };
  };
  html_url: string;
}

export interface GitHubSyncResult {
  outputFile: string;
  repoFullName: string;
  commitsIncluded: number;
  syncedAt: string;
}

function buildHeaders(config: AppConfig): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tom-brain-github-sync",
  };

  if (config.githubSync.token) {
    headers.Authorization = `Bearer ${config.githubSync.token}`;
  }

  return headers;
}

function formatReport(repo: RepoPayload, commits: CommitPayload[], syncedAt: string): string {
  const commitLines = commits
    .map((commit) => {
      const firstLine = commit.commit.message.split("\n")[0];
      const shortSha = commit.sha.slice(0, 7);
      return `- ${shortSha} | ${commit.commit.author.name} | ${commit.commit.author.date}\n  - ${firstLine}\n  - ${commit.html_url}`;
    })
    .join("\n\n");

  return [
    "# GitHub Sync Report",
    "",
    `- synced_at: ${syncedAt}`,
    `- repo: ${repo.full_name}`,
    `- url: ${repo.html_url}`,
    `- default_branch: ${repo.default_branch}`,
    `- stars: ${repo.stargazers_count}`,
    `- forks: ${repo.forks_count}`,
    `- open_issues: ${repo.open_issues_count}`,
    `- pushed_at: ${repo.pushed_at}`,
    `- updated_at: ${repo.updated_at}`,
    "",
    "## Description",
    "",
    repo.description ?? "(none)",
    "",
    "## Latest Commits",
    "",
    commitLines || "- No commits returned.",
    "",
  ].join("\n");
}

async function fetchJson<T>(url: string, headers: HeadersInit): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub sync failed (${response.status}): ${details}`);
  }
  return (await response.json()) as T;
}

export async function syncGitHubReport(config: AppConfig): Promise<GitHubSyncResult> {
  const { owner, repo, apiBaseUrl, outputFile } = config.githubSync;
  const headers = buildHeaders(config);
  const syncedAt = new Date().toISOString();

  const repoUrl = `${apiBaseUrl}/repos/${owner}/${repo}`;
  const commitsUrl = `${apiBaseUrl}/repos/${owner}/${repo}/commits?per_page=5`;

  const [repoPayload, commitsPayload] = await Promise.all([
    fetchJson<RepoPayload>(repoUrl, headers),
    fetchJson<CommitPayload[]>(commitsUrl, headers),
  ]);

  const report = formatReport(repoPayload, commitsPayload, syncedAt);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, report, "utf8");

  return {
    outputFile,
    repoFullName: repoPayload.full_name,
    commitsIncluded: commitsPayload.length,
    syncedAt,
  };
}
