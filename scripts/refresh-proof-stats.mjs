#!/usr/bin/env node
// Refresh the usage numbers behind the landing page's social-proof stat band.
//
// Counts J-Bot Code Review workflow runs in the two first-party repos it
// dogfoods on, dedupes them to unique pull requests, and sums each PR's
// diff stats exactly once (additions + deletions + changed_files from the
// pulls API). Per-PR responses are cached in local/proof-stats-cache.json
// (gitignored) so re-runs only pay for new PRs.
//
// A "review" is a workflow run with conclusion=success and
// event=pull_request. Everything else (skipped, failure, cancelled,
// issue_comment-triggered, etc.) is excluded and reported.
//
// Usage:  node scripts/refresh-proof-stats.mjs
// Needs:  gh CLI authenticated with read access to both repos.
//
// The numbers this prints are pasted into index.html by hand — the site is
// static and the repos are private, so nothing is fetched at page load.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_PATH = join(ROOT, "local", "proof-stats-cache.json");

const SOURCES = [
  { repo: "integral-xyz/fms", workflowId: 291509931 },
  { repo: "integral-xyz/fms-frontend", workflowId: 291435248 },
];

// The runs API returns at most 1000 results per filtered query, so windows
// must each stay below that. A week of runs is comfortably under it today;
// the assertion below catches the day that stops being true.
const WINDOW_DAYS = 7;
const EARLIEST = "2026-06-01"; // both workflows were created 2026-06-08

async function gh(path) {
  // execFile (no shell): path segments are passed as argv, never interpolated.
  const { stdout } = await execFileAsync("gh", ["api", path], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function* windows(fromISO) {
  const from = new Date(fromISO + "T00:00:00Z");
  const now = new Date();
  for (let a = from; a < now; ) {
    const b = new Date(a.getTime() + WINDOW_DAYS * 86400_000);
    yield `${a.toISOString().slice(0, 10)}..${b.toISOString().slice(0, 10)}`;
    a = b;
  }
}

async function listSuccessfulPrRuns(repo, workflowId) {
  // Keyed by run id: `created=A..B` date ranges are inclusive on both ends,
  // so consecutive windows overlap by one day and would double-count runs
  // created on the boundary date.
  const runs = new Map();
  for (const created of windows(EARLIEST)) {
    const base =
      `repos/${repo}/actions/workflows/${workflowId}/runs` +
      `?status=success&event=pull_request&created=${created}&per_page=100`;
    let total = null;
    for (let page = 1; ; page++) {
      const res = await gh(`${base}&page=${page}`);
      total ??= res.total_count;
      if (total > 1000)
        throw new Error(
          `${repo} window ${created} has ${total} runs — shrink WINDOW_DAYS to stay under the API's 1000-result cap`,
        );
      if (res.workflow_runs.length === 0) break;
      for (const run of res.workflow_runs) runs.set(run.id, run);
      if (runs.size % 500 < 100) process.stderr.write(`  ${repo}: ~${runs.size} runs...\n`);
    }
  }
  return [...runs.values()];
}

// run.pull_requests can be empty (fork PRs, deleted branches). Fall back to
// resolving the head branch through the pulls API before giving up.
async function resolvePrNumber(repo, run, unresolved) {
  if (run.pull_requests?.length) return run.pull_requests[0].number;
  const org = repo.split("/")[0];
  const prs = await gh(
    `repos/${repo}/pulls?state=all&head=${org}:${encodeURIComponent(run.head_branch)}&per_page=1`,
  );
  if (prs.length) return prs[0].number;
  unresolved.push({ runId: run.id, head_branch: run.head_branch, created_at: run.created_at });
  return null;
}

function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let k; (k = i++) < items.length; ) out[k] = await fn(items[k], k);
    }),
  );
  return out;
}

const cache = loadCache();
const report = { generated_at: new Date().toISOString(), sources: [], totals: null };

for (const { repo, workflowId } of SOURCES) {
  process.stderr.write(`Scanning ${repo}...\n`);
  const allRuns = await gh(
    `repos/${repo}/actions/workflows/${workflowId}/runs?per_page=1`,
  );
  const runs = await listSuccessfulPrRuns(repo, workflowId);

  const unresolved = [];
  const prNumbers = new Set();
  await mapPool(runs, 6, async (run) => {
    const n = await resolvePrNumber(repo, run, unresolved);
    if (n !== null) prNumbers.add(n);
  });

  process.stderr.write(`  ${repo}: ${prNumbers.size} unique PRs, fetching diff stats...\n`);
  const prStats = await mapPool([...prNumbers], 6, async (n) => {
    const key = `${repo}#${n}`;
    if (!cache[key]) {
      const pr = await gh(`repos/${repo}/pulls/${n}`);
      cache[key] = {
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        state: pr.state,
        merged_at: pr.merged_at,
      };
    }
    return cache[key];
  });

  const sum = (k) => prStats.reduce((a, p) => a + p[k], 0);
  report.sources.push({
    repo,
    total_workflow_runs: allRuns.total_count,
    reviews: runs.length, // success + pull_request only
    excluded_runs: allRuns.total_count - runs.length,
    excluded_reason:
      "conclusion != success (skipped/failure/cancelled) or event != pull_request (issue_comment, push, etc.)",
    unique_prs: prNumbers.size,
    runs_with_unresolvable_pr: unresolved.length,
    unresolvable_detail: unresolved,
    files_reviewed: sum("changed_files"),
    lines_reviewed: sum("additions") + sum("deletions"),
  });
}

const t = (k) => report.sources.reduce((a, s) => a + s[k], 0);
report.totals = {
  reviews: t("reviews"),
  unique_prs: t("unique_prs"),
  files_reviewed: t("files_reviewed"),
  lines_reviewed: t("lines_reviewed"),
  excluded_runs: t("excluded_runs"),
  runs_with_unresolvable_pr: t("runs_with_unresolvable_pr"),
};

mkdirSync(dirname(CACHE_PATH), { recursive: true });
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
console.log(JSON.stringify(report, null, 2));
