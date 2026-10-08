# Step 5 Preview code review: free, solid on small PRs, unreliable on big ones

Published October 8, 2026 · route and catalog checked October 8, 2026 · applies to pgup-ai/jbot-review-action v0

**Step 5 Preview is a reasonable free reviewer for small and medium pull requests, and the wrong choice for large ones.** We ran it as J-Bot Review’s model on nine pull requests. On the six production changes it finished, 4 to 13 files each, it found 8 of 31 known issues and tied DeepSeek V4.1 Flash on the two where we could compare. Its median finished review took 16 minutes, and it was slower than DeepSeek on two of the three pull requests where we have a DeepSeek time. It failed both pull requests of 20 files and more.

> **StepFun · released Sep 16, 2026 · 1M context · free on OpenCode Zen**
>
> OpenCode Zen serves the model as `opencode/step-5-preview-free` at $0 per token, for a limited time. OpenCode’s announcement on October 8, 2026 put the free window at one week. Models.dev lists a 1,000,000-token context, 65,536 output tokens, and text, image and video input.

**In this guide**

- [Setup in three steps](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#setup)
- [What OpenCode lists](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#model)
- [A public pull request against DeepSeek V4.1 Flash](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#public-pr)
- [Eight production pull requests](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#production)
- [Why the large pull requests failed](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#large-prs)
- [When to use it](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#when)
- [What this test can’t tell you](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#limits)
- [FAQ](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions#faq)

## Set up Step 5 Preview code review in three steps

1. **Create an OpenCode API key.** Sign in at [opencode.ai](https://opencode.ai), then save the key as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. J-Bot sends new models `low` effort by default, so the workflow sets `high`, the level we tested on production code.
3. **Open a pull request.** J-Bot reads the base…head diff and posts diff-anchored findings with a verdict. A second session checks blocking findings before they post.

`.github/workflows/jbot-review.yml`

```yaml
name: J-Bot Code Review
on:
  pull_request: { types: [opened, reopened, ready_for_review, synchronize] }

concurrency:
  group: jbot-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
  issues: write
  checks: read

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: pgup-ai/jbot-review-action@v0
        with:
          model: opencode/step-5-preview-free
          model-options: '{"reasoningEffort":"high"}'
          # Large pull requests: give each review more time than the 30-minute default.
          # time-budget-minutes: 45
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

No J-Bot update is needed. The OpenCode build J-Bot pins, 2.0.24, ships without an entry for this model, but it reads the models.dev catalog when it starts, so the id resolved on our first run.

## What OpenCode lists for Step 5 Preview

**Model id** (OpenCode Zen)

`model: opencode/step-5-preview-free`
`opencode-api-key`

**Price** (Limited time)

Free input, output and cached reads in the Zen pricing table. OpenCode’s October 8 announcement said one week.

**Limits** (Models.dev)

1,000,000-token context and 65,536 output tokens. Text, image and video in, text out. Tool calling and reasoning effort `low`, `medium` or `high`.

**Data** (Zen docs)

OpenCode says the provider follows a zero-retention policy and does not train on your data.

Sources: the [OpenCode Zen documentation](https://opencode.ai/docs/zen/) (model list, pricing and privacy) and the [models.dev](https://models.dev/) catalog entry, both checked October 8, 2026. Free windows end, so check the pricing table before you depend on it.

## A public pull request against DeepSeek V4.1 Flash

We started with [pull request #286](https://github.com/pgup-ai/jbot-review/pull/286) in J-Bot Review’s own repository: 9 files on one review page. We ran it at low effort with verification off, the settings we had used for DeepSeek V4.1 Flash on the same change a day earlier. That DeepSeek run used an older J-Bot build (`e824bd4`, against `0906459` for Step 5).

Scroll horizontally to see every column.

| Model | Date | Time | Cost | Tool calls (main / rules) | Real bug found | Known issues |
| --- | --- | --- | --- | --- | --- | --- |
| Step 5 Preview · low | Oct 8 | 8.2 min | $0 | 37 / 17 | Yes | 0 / 2 |
| DeepSeek V4.1 Flash · low | Oct 7 | 4.4 min | $0.082 | 49 / 20 | Yes | 0 / 2 |

Both models found the same real bug. A telemetry helper had gained a workspace parameter that three backend call sites did not pass. Step 5’s write-up named all three call sites. Neither model found the two known issues, shell-parsing bugs fixed later in [\#287](https://github.com/pgup-ai/jbot-review/pull/287). Step 5 made fewer tool calls and still took 1.9 times as long on this pull request.

## Eight production pull requests

Next we ran eight pull requests from a private TypeScript monorepo. An earlier audit had written an answer key for each one, 44 known issues in total. Each review ran once, at high effort, with one review pass, verification off and J-Bot’s default 30-minute budget. A script matched findings to the key by keyword, and we read every finding it did not match by hand. We label the pull requests A to H.

Scroll horizontally to see every column.

| Pull request | Files | Review pages | Time | Known issues found |
| --- | --- | --- | --- | --- |
| A | 4 | 2 | 17.7 min | 3 of 7 |
| B | 8 | 1 | 10.0 min | 1 of 5 |
| C | 8 | 1 | 14.6 min | 1 of 3 |
| D | 9 | 3 | 13.5 min | 2 of 8 |
| E | 10 | 2 | 19.8 min | 0 of 2 |
| F | 13 | 2 | 19.8 min | 1 of 6 |
| G | 20 | 3 | Failed at 29.5 min | No review (3 in key) |
| H | 32 | 4 | Failed at 28.1 min | No review (10 in key) |

J-Bot splits a diff into budgeted review pages and posts only when every page finishes. The [raw numbers (JSON)](https://www.pgupai.com/assets/data/step-5-preview-benchmark-20261008.json) include the DeepSeek reference runs.

Scroll horizontally to see the whole chart.

Review time against files changed. Every pull request up to 13 files finished inside 20 minutes. Both larger ones ran into the 30-minute budget and posted nothing.

On the six pull requests it finished, Step 5 found 8 of 31 known issues. The median review took 16 minutes.

We have DeepSeek V4.1 Flash runs on two of them, A and B, from September 26. DeepSeek found 3 and 1, a total of 4, in 9.2 and 12.0 minutes. Step 5 also found 4, in 17.7 and 10.0 minutes. B is the one pull request where Step 5 was faster. Those DeepSeek runs used older J-Bot code, so read the tie as a rough match.

## Why the large pull requests failed

Each failure came from a single review page. On G, 20 files over three pages, one page returned an empty response, and its retry used up the rest of the budget. On H, 32 files over four pages, one page ended with a partial result.

J-Bot will not post a review that skips part of the diff. When a page fails after its retry, the whole run fails and nothing posts. That rule protects you from a review that looks complete and isn’t. With a slow model it also means one stuck page costs the entire review. This result decides how to use Step 5. A model that handles 13 files and stalls at 20 can’t be the default for a repository that opens large pull requests.

## When to use Step 5 Preview

- **Small and medium pull requests, while it’s free.** Up to about 13 files it finished every review and found roughly what DeepSeek V4.1 Flash found, at no cost.
- **Not for large pull requests.** Both of ours failed. If you try it on changes that size anyway, raise `time-budget-minutes` to 45 or more. We have not yet rerun G and H with a longer budget.
- **Not as a default in a model pool.** A pool picks a model per pull request, so Step 5 would eventually draw a large change and fail it. Keep it as an explicit choice for repositories whose pull requests stay small.
- **Not when review speed matters.** Only three pull requests have a DeepSeek V4.1 Flash time, all from older J-Bot code. Step 5 was 1.9 times slower on #286 and on A, and faster on B. For faster free reviews, see the [free model comparison](https://www.pgupai.com/guides/free-ai-models-code-review).

## What this test can’t tell you

Each pull request ran once. Flash-class models swing by about two known issues between identical runs, so a single row can mislead in either direction. Eight production pull requests from one repository are a screen, not a benchmark.

The DeepSeek comparison is thin. On A and B it crosses a J-Bot code change, and we did not run DeepSeek on C through H. The public pull request ran at low effort and the production ones at high, so the two tables don’t combine.

The production repository is private, so we can’t publish those diffs or findings. The public run can be checked against [\#286](https://github.com/pgup-ai/jbot-review/pull/286), [\#287](https://github.com/pgup-ai/jbot-review/pull/287) and [\#293](https://github.com/pgup-ai/jbot-review/pull/293), which fixed the telemetry bug.

## Where the diff goes

- **To OpenCode and its model provider.** The review runs read-only on your GitHub Actions runner, and J-Bot sends the diff to OpenCode Zen. OpenCode’s Zen documentation says this model’s provider follows a zero-retention policy and does not use your data for training. That is OpenCode’s commitment, not J-Bot’s.
- **The key stays in the server process.** Each review session’s shell gets an allowlisted environment, so a tool call inside the review can’t read `OPENCODE_API_KEY`.
- **Fork pull requests can’t read the key.** GitHub doesn’t pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is Step 5 Preview free?

On OpenCode Zen, yes, for a limited time. OpenCode lists `opencode/step-5-preview-free` at $0 for input, output and cached reads. OpenCode’s announcement on 2026-10-08 said the free window lasts a week, so check the Zen pricing table before you rely on it.

### Is Step 5 Preview good for code review?

On small and medium pull requests, yes. It found 8 of 31 known issues on six production pull requests of 4 to 13 files, and tied DeepSeek V4.1 Flash on the two where we have a DeepSeek run. It failed both pull requests of 20 and 32 files, so it is not a good default for repositories that open large changes.

### How fast is Step 5 Preview at code review?

The six production reviews it finished took 10.0 to 19.8 minutes, with a median of 16. Only three pull requests have a DeepSeek V4.1 Flash time, all on older J-Bot code: Step 5 took 8.2 minutes against 4.4 on a 9-file public pull request and 17.7 against 9.2 on A, and 10.0 against 12.0 on B. Both large pull requests ran into J-Bot’s 30-minute budget.

### Do I need to update J-Bot Review to use Step 5 Preview?

No. The OpenCode build J-Bot pins, 2.0.24, reads the models.dev catalog when it starts, so the new model id resolved on the first run. Set `model: opencode/step-5-preview-free` and pass an OpenCode API key.

### Does OpenCode keep my code when I use Step 5 Preview?

OpenCode’s Zen documentation says Step 5 Preview Free’s provider follows a zero-retention policy and does not use your data for model training. That is OpenCode’s statement, not a J-Bot guarantee. Read the Zen privacy section before sending private code.

## Related

- **Guide** — [DeepSeek V4.1 Flash](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-github-actions): The comparison model, with review times by pull request size.
- **Guide** — [Which free model to use](https://www.pgupai.com/guides/free-ai-models-code-review): The other $0 routes, with measured speed and quotas.
- **Method** — [How we evaluate reviewers](https://www.pgupai.com/guides/evaluate-ai-code-review): Known issues, repetitions and what a small screen can show.

---

_Markdown representation of [https://www.pgupai.com/guides/step-5-preview-code-review-github-actions](https://www.pgupai.com/guides/step-5-preview-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
