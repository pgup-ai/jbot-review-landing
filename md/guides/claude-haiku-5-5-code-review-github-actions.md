# Claude Haiku 5.5 code review: benchmark, pricing and reasoning effort

Published October 7, 2026, the day Haiku 5.5 launched · prices checked October 7, 2026 · applies to pgup-ai/jbot-review-action v0

**Claude Haiku 5.5 can review pull requests well, but only when it is allowed to think.** We ran it as J-Bot Review’s code reviewer at all five reasoning effort levels on the same 9-file pull request. At high effort it found two real bugs for $0.046 in under three minutes, about half what DeepSeek V4.1 Flash cost on the same change. At max it found three, including one of the two known issues a follow-up pull request fixed, for $1.25. At low effort it barely opened a file.

> **Released Oct 7, 2026 · 1M context · 128K output**
>
> Anthropic lists Haiku 5.5 at $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100,000 tokens. Longer prompts cost five times as much. It supports five effort levels, from `low` to `max`, and defaults to `medium`.

**In this guide**

- [Setup in three steps](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#setup)
- [Three routes and model ids](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#routes)
- [Haiku 5.5 API pricing](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#pricing)
- [Benchmark: five effort levels on one pull request](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#benchmark)
- [What each effort level found](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#findings)
- [The effort setting that never arrived](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#effort-bug)
- [Which effort to choose](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#which-effort)
- [What this test can’t tell you](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#limits)
- [FAQ](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions#faq)

## Set up Claude Haiku 5.5 code review in three steps

1. **Create an Anthropic API key.** Save it as the repository secret `ANTHROPIC_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. J-Bot reviews with Haiku 5.5 at `xhigh` unless you set `model-options`.
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
          model: anthropic/claude-haiku-5-5
          # Default effort is xhigh. Uncomment for high; J-Bot sends it to Claude as effort:
          # model-options: '{"reasoningEffort":"high"}'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Three routes, three exact model ids

The first segment of the id selects the provider. All three routes send Haiku 5.5 the effort you choose.

**Anthropic** (Direct API · tested)

`model: anthropic/claude-haiku-5-5`
`anthropic-api-key`

**OpenCode Zen** (Gateway · pay as you go)

`model: opencode/claude-haiku-5-5`
`opencode-api-key`

**OpenCode Go** (Gateway · Go plan)

`model: opencode-go/claude-haiku-5-5`
`opencode-api-key`

We ran the benchmark on the direct Anthropic route. Haiku 5.5 is also sold through Amazon Bedrock, Google Cloud and Microsoft Foundry, which J-Bot does not call directly.

## Claude Haiku 5.5 API pricing

Other Claude models from 4.6 on charge one rate across the whole 1M-token window. Haiku 5.5 charges by prompt length instead. Anthropic’s pricing page lists these rates, checked October 7, 2026:

Scroll horizontally to see every column.

| Price per million tokens | Prompts up to 100K tokens | Prompts over 100K tokens |
| --- | --- | --- |
| Input | $0.10 | $0.50 |
| Output | $0.50 | $2.50 |
| 5-minute cache write | $0.125 | $0.625 |
| 1-hour cache write | $0.20 | $1.00 |
| Cache read | $0.01 | $0.05 |
| Batch input / output | $0.05 / $0.25 | $0.25 / $1.25 |

A code review resends the same growing conversation on every turn, so prompt caching carries most of the input. In our runs nearly all input tokens were cache reads or writes, which is why a review at high effort cost less than five cents.

## Haiku 5.5 benchmark: five effort levels on one pull request

We reviewed [pull request #286](https://github.com/pgup-ai/jbot-review/pull/286) in J-Bot Review’s own public repository: 9 files that change how the reviewer tracks which files a model reads. Two of its bugs were fixed in a follow-up, [\#287](https://github.com/pgup-ai/jbot-review/pull/287), so we used those two as known issues. Every run used the same reviewer build, ten concurrent sessions and no verification pass. Haiku ran on the direct Anthropic API. DeepSeek V4.1 Flash ran on DeepSeek’s own API at low effort, J-Bot’s default for that model, as the comparison.

Scroll horizontally to see every column.

| Setting | Runs | Time | Cost | Tool calls (main / rules) | Reasoning tokens | Bugs | Rule findings | Known issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 · low | 1 | 29 s | $0.015 | 0 / 1 | 5K | 1 | 0 | 0 / 2 |
| Haiku 5.5 · medium (default) | 2 | 79 s, 92 s | $0.022, $0.028 | 3 / 0, 8 / 1 | 15K, 17K | 0, 1 | 0, 1 | 0 / 2 |
| Haiku 5.5 · high | 1 | 163 s | $0.046 | 7 / 6 | 33K | 2 | 1 | 0 / 2 |
| Haiku 5.5 · xhigh | 1 | 438 s | $0.330 | 32 / 8 | 95K | 2 | 1 | 0 / 2 |
| Haiku 5.5 · max | 1 | 751 s | $1.248 | 45 / 37 | 164K | 3 | 1 | 1 / 2 |
| DeepSeek V4.1 Flash · low | 1 | 265 s | $0.082 | 49 / 20 | 50K | 1 | 0 | 0 / 2 |

Tool calls are for the main review and the rule-compliance pass. Bugs are defects we reproduced against the code or that a later pull request fixed. Rule findings are valid violations of the repository’s written rules. The [raw numbers (JSON)](https://www.pgupai.com/assets/data/claude-haiku-5-5-effort-benchmark-20261007.json) include the per-pass cost split.

Scroll horizontally to see the whole chart.

Cost per review against confirmed bugs. High effort sits at the bend. Going from high to xhigh multiplied the cost by seven and found no new bug. Only max found a third.

## What each effort level found

- **Low.** The main review made no tool calls and answered from the embedded diff. It still found the bug that every setting found. Three of J-Bot’s backends computed file identities without the workspace path, so one file read two ways counted twice.
- **Medium.** Two runs, three and eight tool calls. One found nothing real. The other found the same telemetry bug and a valid rule finding. A new helper duplicated an existing path resolver, which the repository’s “reuse before adding” rule forbids.
- **High.** Seven tool calls. It found the telemetry bug, a valid rule finding about a restated prompt rule, and a second bug nobody had reported: a single-quoted span inside double quotes, such as `cat "'$x'"`, hid a `$` from the parser’s expansion guard. We reproduced it on the current code.
- **Xhigh.** 32 tool calls and three times high’s reasoning. Same two bugs, the duplicated-resolver rule finding, and two low-value notes.
- **Max.** 45 tool calls in the main review and 37 in the rule pass. It found one of the two known issues with its exact trigger: `grep x a && cat b; cat c` dropped the read of `c`. It also found that a quoted `||` in a grep pattern cut the pattern short. Both are now fixed in [\#287](https://github.com/pgup-ai/jbot-review/pull/287) and [\#293](https://github.com/pgup-ai/jbot-review/pull/293).

No setting found the second known issue, a wrapped `cd` that left later paths unknown. DeepSeek V4.1 Flash found the telemetry bug and nothing else.

## The effort setting that never arrived

Our first two runs were meant to be low and high. They came back with nearly the same reasoning token counts, 15K and 17K. Low and high should be much further apart, so we read the requests.

J-Bot passed effort as `reasoningEffort`, the option name OpenAI-compatible providers use. OpenCode, the runtime J-Bot drives, sends Claude models to Anthropic’s Messages API, and its Anthropic adapter only reads an option named `effort`. The adapter drops anything else without an error. We pointed OpenCode at a local server that records request bodies. With `reasoningEffort` set to low, the request carried adaptive thinking and no effort at all. With `effort` set to max, it carried `output_config: {"effort": "max"}`.

So those two runs used Anthropic’s default, which its effort documentation names as medium for Haiku 5.5. They are the medium rows above. [\#294](https://github.com/pgup-ai/jbot-review/pull/294) fixed this in J-Bot. You still write `reasoningEffort`, and J-Bot now sends it to Claude as `effort` on all three Claude routes. Keep the J-Bot name: its effort rules, such as running the verifier one level lower, work on `reasoningEffort`. The published Action image includes the fix.

## Which effort to choose for Claude Haiku 5.5

- **High, when cost matters.** It found as many bugs as xhigh for about a seventh of the cost, and finished faster than DeepSeek V4.1 Flash. Set `model-options: '{"reasoningEffort":"high"}'`.
- **Xhigh, the J-Bot default.** It made 32 tool calls to high’s 7, so it reads much more of the repository. On this pull request the extra reading found no extra bug. The verifier runs one step lower, at high, and the rule-compliance pass runs at low.
- **Max, for changes where a missed bug is expensive.** It was the only setting that found a known issue. At $1.25 and 12.5 minutes on 9 files, it is a release-branch setting, not an every-push one.
- **Not low.** It saves cents and skips the investigation that code review needs. Anthropic positions Haiku for fast, high-volume tasks like classification and routing. Code review is not one of them unless the effort goes up.

## What this test can’t tell you

This is one pull request with one review per setting, two at medium. Recall varies between identical runs. In earlier tests DeepSeek V4.1 Flash found these same known issues in one of two repetitions. Read the table as a screen, not a ranking.

In these runs the rule-compliance pass ran at the same effort as the main review, because the J-Bot build predated [\#294](https://github.com/pgup-ai/jbot-review/pull/294). Current J-Bot runs that pass at low, so its share of the cost, $0.58 of max’s $1.25, would be smaller today. Costs are what OpenCode reported at list prices. DeepSeek ran at its J-Bot default of low effort, not at a matched level.

The changed code is public, so you can check every finding against [\#286](https://github.com/pgup-ai/jbot-review/pull/286), [\#287](https://github.com/pgup-ai/jbot-review/pull/287) and [\#293](https://github.com/pgup-ai/jbot-review/pull/293). The one bug still open, the quote-handling gap, affects only how J-Bot records which files a model read. It never runs the command.

## Where the diff goes

- **Only to the provider you configure.** The review runs read-only on your GitHub Actions runner, and J-Bot sends the diff to Anthropic or to OpenCode, depending on the route.
- **The key stays in the server process.** Each review session’s shell gets an allowlisted environment, so a tool call inside the review can’t read `ANTHROPIC_API_KEY`.
- **Fork pull requests can’t read the key.** GitHub doesn’t pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is Claude Haiku 5.5 good for code review?

Yes, at high effort or above. On a 9-file pull request, Haiku 5.5 at high effort found two real bugs and one rule violation for $0.046 in 163 seconds. At low effort it made no tool calls in its main review and found one bug. At max it found three bugs, including one of the two known issues, for $1.25.

### How much does Claude Haiku 5.5 cost per code review?

In our runs, between $0.015 at low effort and $1.25 at max, on a 9-file pull request. High effort cost $0.046 and xhigh $0.33. Anthropic lists Haiku 5.5 at $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100,000 tokens, and $0.50 and $2.50 above that.

### Which reasoning effort should I use for Claude Haiku 5.5?

Use high if cost matters and xhigh or max for reviews where a missed bug is expensive. J-Bot Review defaults Haiku 5.5 to xhigh. In our test, high found the same two bugs as xhigh for about a seventh of the cost, and only max found a known issue.

### What is Claude Haiku 5.5’s default reasoning effort?

Medium. Anthropic’s effort documentation says Claude Haiku 5.5 defaults to medium, and that sending medium behaves exactly like omitting the effort parameter. The model also supports low, high, xhigh and max, with adaptive thinking on by default.

### Is Claude Haiku 5.5 better than DeepSeek V4.1 Flash for code review?

On our one-PR test, Haiku 5.5 at high effort found two bugs for $0.046 in 163 seconds, and DeepSeek V4.1 Flash at low effort found one for $0.082 in 265 seconds. Both found the same telemetry bug. One pull request is not enough to rank the models.

### Can I use a Claude Pro or Max subscription instead of an API key?

No. J-Bot Review runs Claude through an Anthropic API key or an OpenCode gateway key. A Claude Pro or Max seat is not a supported CI credential today.

## Related

- **Guide** — [Claude code review](https://www.pgupai.com/guides/claude-code-review-github-actions): Any Claude model with your Anthropic API key.
- **Guide** — [DeepSeek V4.1 Flash](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-github-actions): The comparison model, with review times by pull request size.
- **Method** — [How we evaluate reviewers](https://www.pgupai.com/guides/evaluate-ai-code-review): Known issues, repetitions and what a small screen can show.

---

_Markdown representation of [https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions](https://www.pgupai.com/guides/claude-haiku-5-5-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
