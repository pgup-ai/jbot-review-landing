# Kimi K3 code review in GitHub Actions

Updated July 17, 2026 · applies to pgup-ai/jbot-review-action v0

**Moonshot shipped Kimi K3 on July 16, 2026 — and it could review pull requests here the same day.** No action update to wait for: J-Bot Review is an open-source (MIT) GitHub Action that reviews with whatever model your gateway carries, and OpenCode Go listed `kimi-k3` at launch. One secret, one workflow file, and J-Bot adds **$0** of its own.

> **Why day one works**
>
> Hosted reviewers put new models behind their own rollout, and some don't expose model choice at all. A bring-your-own-model reviewer has nothing to roll out — the moment your gateway lists an id, your PRs can use it. K3's id appeared on OpenCode Go on launch day; this page's setup was verified against it on July 17.

## Setup in three steps

1. **Get the key.** Subscribe to [OpenCode Go](https://opencode.ai/docs/go/) ($10/month, $5 the first month) and create an API key. Save it as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml` — the model pin is the only Kimi-specific line.
3. **Open a pull request.** K3 reads the full base…head diff and posts diff-anchored findings with a verdict; blocking findings are verified by a second session before they post, nits demoted.

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
  issues: write        # PR reactions use the issues API
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
          provider: opencode-go
          model: kimi-k3          # verified working 2026-07-17
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What K3 review actually costs

- **OpenCode Go is flat-rate, not unlimited.** $10/month buys dollar-denominated usage windows — $12 per 5 hours, $30 per week, $60 per month — and K3 draws them down faster than most models: OpenCode's own estimate is **~140 K3 requests per 5-hour window**, versus ~1,350 for Kimi K2.7 Code. A team merging a handful of large PRs per day fits; a monorepo firehose should pin K2.7 Code (`model: kimi-k2.7-code`) and save K3 for `aux-model` verification duty.
- **API rates, for comparison:** $3 per million input tokens — $0.30 on cache hits — and $15 per million output, with a 1M-token context. Moonshot reports >90% cache-hit rates in coding workloads, and the action's prompt caching leans into exactly that: parallel shards and re-reviews share an identical prompt prefix.
- **Expect slower sessions than K2.x.** K3 runs at maximum thinking effort by default. The action's session deadlines measure model time (not queue time), but budget wall-clock accordingly on big diffs.
- **J-Bot's own line item is $0** — MIT-licensed action, no reviewer service, no per-seat charge. You pay the gateway plus normal CI minutes.

## Other roads to K3

- **OpenRouter:** `provider: openrouter`, `model: moonshotai/kimi-k3`, with `openrouter-api-key`. Same $3/$15 rates today. One thing to know: as of July 17 OpenRouter serves K3 through a single upstream (Moonshot first-party), so there's no provider failover — and no `:free` variant exists.
- **Your own Moonshot API key:** the action is adding a direct Kimi provider (`provider: kimi` with a `kimi-api-key` secret) — check the [action README](https://github.com/pgup-ai/jbot-review-action#readme) for the shipped input names. Mind Moonshot's tiers: the $1 starter tier caps you at 1 concurrent request and 3 RPM, which stalls CI review; from the $10 cumulative tier (50 concurrent, 200 RPM) it runs comfortably.
- **Cline:** K3 landed in Cline on launch day as pay-per-use. Cline Pass — the flat plan behind `provider: cline-pass` — still lists K2.7 Code as its top included Kimi model as of July 17; if your Pass account shows K3 in its picker, the same provider drives it.
- **Nothing is free yet.** OpenCode Zen's [$0 free band](https://www.pgupai.com/#top) doesn't carry K3, and no free endpoint exists anywhere we could verify. Moonshot promises open weights by July 27 — free third-party hosts tend to follow weights, and this page will be updated when they do.

## Day one, on a real diff

Within an hour of wiring it up on July 17 we handed K3 a planted regression: a pagination helper where `Math.ceil` quietly became `Math.floor` behind a new zero-guard. It flagged the dropped last page with a concrete counterexample (`total=10, perPage=3` → 4 pages, not 3) and judged the guard itself fine — the exact shape of finding you want posted on a PR, and nothing you'd mistake for a lint rule.

On Moonshot's own launch charts K3 leads Program Bench (77.8) and SWE Marathon (42.0) and posts 88.3 on Terminal-Bench 2.1 — while Moonshot's own assessment has it still trailing Claude Fable 5 and GPT-5.6 Sol overall. For review work specifically, the 1M-token context and cache-friendly pricing weigh as much as leaderboard position: big diffs fit whole, and repeat prompts get the $0.30 input rate.

## Where the diff goes

- **Your runner, read-only.** The review session runs headless on your GitHub Actions runner with `contents: read`; write scopes exist only to post comments and reactions.
- **One recipient.** The diff goes to the gateway you configured on your own key — here, OpenCode's endpoint — and to no reviewer service, because there isn't one in the loop.
- **Fork PRs can't leak the key.** GitHub strips secrets from `pull_request` events on fork PRs, so outside contributors never see `OPENCODE_API_KEY`.
- **Findings are checked before they post.** A second model session adversarially verifies every blocking finding; nits are demoted so the PR gets signal, not noise.

## FAQ

### Is Kimi K3 free to use for PR review?

Not today. As of 2026-07-17 there is no free K3 endpoint anywhere — OpenCode Zen's free band doesn't carry it and OpenRouter has no `:free` variant. The flat-rate path is OpenCode Go ($10/month, $5 the first month); API rates are $3 per million input tokens ($0.30 on cache hits) and $15 per million output. Moonshot has promised open weights by July 27, 2026, and free third-party hosts usually follow weights.

### What exactly do I set for provider and model?

`provider: opencode-go` with `model: kimi-k3` — the pair verified working on launch-plus-one day (2026-07-17). On OpenRouter it's `provider: openrouter` with `model: moonshotai/kimi-k3`. If you prefix the model as `provider/model`, the prefix must match the provider you set.

### Does K3 work with a Cline subscription?

Cline carried K3 from launch day as a pay-per-use provider. Cline Pass — the flat subscription — still lists Kimi K2.7 Code as its top included Kimi model on the published plan page (checked 2026-07-17). If your Pass plan shows K3 in its model list, `provider: cline-pass` drives it the same way; otherwise K3 in Cline bills per token.

### When do K3's open weights land, and under what license?

Moonshot's launch post promises full weights by July 27, 2026. The license is unannounced — K2 shipped under a modified MIT, but don't assume it carries over. Expect cheaper and free third-party endpoints once weights are public; the cost notes on this page will be updated when that happens.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Devin, Cline, Kilo, Command Code, Grok Build, Qoder — reuse the seat you pay for.
- **Guide** — [Kilo code review in GitHub Actions](https://www.pgupai.com/guides/kilo-code-review-github-actions): Free gateway default — trial the same pipeline at $0 while K3 has no free tier.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/kimi-code-review-github-actions](https://www.pgupai.com/guides/kimi-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
