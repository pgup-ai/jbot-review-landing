# Muse Spark 1.3 code review in GitHub Actions

Published August 20, 2026 · updated September 3, 2026 for Muse Spark 1.3 · applies to pgup-ai/jbot-review-action v0

**Meta's Muse Spark 1.3, released on 2026-09-02, can review pull requests at $0 through OpenCode's contributor route, with a 1,048,576-token context window, tool calling, and about 20% fewer tool calls per coding task than 1.2.** The model ids and prices below were read from the live model catalog on 2026-09-03, the day after release; the model has not yet been rerun end to end on a real J-Bot review. Still on 1.2? Its ids are [further down](https://www.pgupai.com/guides/muse-spark-code-review-github-actions#changes).

> **One OpenCode id · $0 · contributor terms**
>
> OpenCode lists Muse Spark 1.3 once, as a contributor route priced at zero; unlike 1.2 there is no metered 1.3 on OpenCode as of 2026-09-03. The contributor route is Meta's data-for-access tier, described below, so check its terms before you point it at private code. Standard-tier 1.3 lives on Kilo, OpenRouter, and Command Code.

## OpenCode setup in three steps

1. **Create an OpenCode API key.** Save it as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The `-contributor-free` suffix names the zero-cost contributor route, and the `opencode/` prefix selects the provider, so no separate `provider` input is needed.
3. **Open a pull request.** J-Bot reads the base…head diff and posts diff-anchored findings with a verdict. Blocking findings are checked by a second session before they post.

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
          model: opencode/muse-spark-1.3-contributor-free
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Five routes, five exact model ids

Pick the route where you already manage credentials. The first segment of each id selects the provider, so the Action's deprecated `provider` input can stay unset. Prices are the provider's list rates per million tokens, read from the live catalog on 2026-09-03; quotas and contributor eligibility remain provider-controlled. Kilo and OpenRouter also list `meta/muse-spark-1.3-contributor` at $0.10 / $0.20 under the same contributor terms as the OpenCode route. Command Code added 1.3 to its seat on release day, 2026-09-02, and J-Bot's Command Code model table was probed against it the same day.

**OpenCode** (Catalog listed · $0 / $0)

`model: opencode/muse-spark-1.3-contributor-free`
`opencode-api-key`

**OpenCode Go** (Catalog listed · $0.10 / $0.20)

`model: opencode-go/muse-spark-1.3-contributor`
`opencode-api-key`

**Kilo** (Catalog listed · $1.25 / $4.25)

`model: kilo/meta/muse-spark-1.3`
`kilo-auth`

**OpenRouter** (Catalog listed · $1.25 / $4.25)

`model: openrouter/meta/muse-spark-1.3`
`openrouter-api-key`

**Command Code** (Added 2026-09-02 · CLI seat)

`model: commandcode/meta/muse-spark-1.3`
`commandcode-access-key`

## What changed from 1.2

Meta released Muse Spark 1.3 on 2026-09-02, its fourth Muse Spark release in five months. The changes it describes map directly onto what a reviewer does.

- **Fewer tool calls, fewer tokens.** Meta reports about 20% fewer tool calls and about 25% fewer tokens per coding task than 1.2. J-Bot's review is a loop of file reads and self-checks, so fewer calls mean a shorter wall clock, and on a metered route fewer tokens mean a smaller bill.
- **Stronger prompt-injection resistance.** A pull request is untrusted input to the reviewer. Meta lists improved adversarial robustness and better calibration on irreversible actions among 1.3's agentic gains.
- **Longer-horizon agentic work.** Meta says 1.3 sustains multi-step tasks better and maps them out more reliably, which is what a multi-shard review of a large diff asks of a model.
- **Same window, same modes.** The context window stays at 1,048,576 tokens and the catalog output limit on the OpenCode route at 131,072. The reasoning modes 1.2 offered are available today; Meta's max reasoning mode is due after further safety testing. On Command Code the model rejects the effort flag, so J-Bot omits it.

Still on 1.2? OpenCode still lists `opencode/muse-spark-1.2-contributor-free` at $0 and the metered `opencode/muse-spark-1.2` at $1.25 / $4.25, and OpenCode Go lists `opencode-go/muse-spark-1.2-contributor` at $0.10 / $0.20. Change the version in the model id and the rest of this page applies.

## Why Muse Spark 1.3 fits review work

- **The context window holds the whole change.** The catalog lists 1,048,576 input tokens with up to 131,072 output tokens on the OpenCode routes. That holds a large base…head diff plus the surrounding files J-Bot reads for context, with no shard-by-shard truncation.
- **It calls tools.** Review is an agentic loop, not a single completion. J-Bot reads files and challenges its own blocking findings mid-session. The catalog advertises tool calling and reasoning on every Muse Spark 1.3 route listed above.
- **Caching cuts the metered routes.** Kilo and OpenRouter list cached input at $0.15 per million against $1.25 uncached. J-Bot keeps the expensive shared prefix stable across shards, so a multi-shard review reuses it.
- **J-Bot adds $0.** The Action is MIT-licensed, with no reviewer service and no per-seat fee. On the contributor route your remaining cost is normal GitHub Actions minutes.

## When the runner's egress is the problem

Some providers decide what a caller may reach based on the IP it arrives from, and a GitHub-hosted runner egresses from address ranges you do not pick. If your account is provisioned for a route your CI cannot reach, the optional `opencode-proxy-url` input sends OpenCode's traffic through a proxy you control: a static-IP egress your platform team already runs, or a host in a region your account is provisioned for.

`.github/workflows/jbot-review.yml · proxy input`

```yaml
      - uses: pgup-ai/jbot-review-action@v0
        with:
          model: opencode/muse-spark-1.3-contributor-free
          opencode-proxy-url: ${{ secrets.OPENCODE_PROXY_URL }}
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

A proxy that quietly breaks should not cost you a review, so the wiring is cautious:

- **Verified before it is trusted.** J-Bot performs an egress check through the proxy and requires a valid IP back. Only then does it inject the proxy environment and pin SDK sessions to OpenCode.
- **It fails open.** An absent secret is logged as information; a failed verification is logged as a warning. Either way J-Bot continues on the direct route and the review still runs.
- **Fork pull requests never use it.** The proxy is skipped for fork-head PRs, so the credential is not exposed to code you have not merged.
- **It is scoped to the OpenCode child.** No global proxy is exported, and loopback is excluded by default so the local SDK listener is never intercepted.
- **Use a dedicated low-privilege credential.** An authenticated proxy URL is inherited by OpenCode and the processes it spawns. Treat it as a CI-only secret, and rotate it like any other.

A proxy changes where your request appears to come from, not what you are entitled to. Check your provider's terms before using one to reach a route your account is not provisioned for.

## Where the diff goes

- **The $0 route is a contributor route.** OpenCode lists Muse Spark 1.3 Contributor Free for a limited time as heavily discounted pricing in exchange for permission to use your prompts and completions to train future Meta models. Meta's own model page marks the contributor tier as used to improve its products and the standard tier as not. Send private code through a standard route such as `kilo/meta/muse-spark-1.3` or `openrouter/meta/muse-spark-1.3`, and read the current terms first.
- **Your runner stays in control.** The review session runs headless on your GitHub Actions runner with read-only repository access.
- **The route determines the destination.** Each provider uses its corresponding account or authenticated CLI backend. J-Bot does not proxy the diff through a hosted reviewer service.
- **A configured proxy is one more hop.** If you set `opencode-proxy-url`, OpenCode's traffic transits a host you chose. Point it at infrastructure inside your own trust boundary.
- **Fork PRs cannot read the key.** GitHub does not pass repository secrets to `pull_request` workflows from forks.
- **Blocking findings are verified.** A second model session challenges each blocking finding before J-Bot posts it; nits are demoted.

## FAQ

### Is Muse Spark 1.3 free for pull-request review?

On one route. As of 2026-09-03 the live model catalog lists `opencode/muse-spark-1.3-contributor-free` at $0 input and $0 output. OpenCode Go lists `opencode-go/muse-spark-1.3-contributor` at $0.10 per million input and $0.20 output, and the standard `kilo/meta/muse-spark-1.3` and `openrouter/meta/muse-spark-1.3` cost $1.25 and $4.25. The zero-priced route is Meta's Contributor tier: OpenCode describes it as heavily discounted pricing in exchange for permission to use your prompts and completions to train future Meta models, published for a limited time. Keep private code on a standard route, which Meta lists as not used to improve its products. Free windows, quotas, and contributor eligibility remain provider-controlled. J-Bot adds no charge of its own.

### What model id does Muse Spark 1.3 use on each provider?

OpenCode uses `opencode/muse-spark-1.3-contributor-free` and lists no metered 1.3 route as of 2026-09-03. OpenCode Go uses `opencode-go/muse-spark-1.3-contributor`. Kilo uses `kilo/meta/muse-spark-1.3`, OpenRouter uses `openrouter/meta/muse-spark-1.3`, and Command Code, which added 1.3 on 2026-09-02, uses `commandcode/meta/muse-spark-1.3` through your seat. Kilo and OpenRouter also list a `-contributor` suffix at the discounted contributor rate. The first segment of each id selects the J-Bot provider; the Action's separate provider input is deprecated. Every spelling was read from the live model catalog on 2026-09-03.

### My runner cannot reach the model provider. What are my options?

Some providers gate access on the caller's egress IP, and GitHub-hosted runners egress from address ranges you do not choose. The optional `opencode-proxy-url` input routes OpenCode's traffic through a proxy you control, such as a static-IP egress your platform team already runs. J-Bot verifies the proxy before using it, skips it entirely on fork-head pull requests, and falls back to the direct route if verification fails, so the review still runs. Check your provider's terms before using a proxy to reach a route your account is not provisioned for.

### Has Muse Spark 1.3 been tested end to end with J-Bot?

Not yet. The model ids, prices, context window, and tool-calling support on this page were read from the live model catalog on 2026-09-03, the day after Meta released Muse Spark 1.3. Its predecessor has been: on 2026-08-21 J-Bot's paired review benchmark ran 48 reviews on `opencode/muse-spark-1.2-contributor-free` across a 12-case corpus with no failures. That benchmark has not been rerun on 1.3, so treat this page as catalog-backed until a real J-Bot review has run on it.

### What changed from Muse Spark 1.2 for code review?

Meta says 1.3 completes coding tasks with about 20% fewer tool calls and about 25% fewer tokens than 1.2, sustains longer-horizon agentic work better, and resists prompt injection more strongly. A reviewer reads files in a loop and treats the pull request as untrusted input, so fewer tool calls mean a faster review and injection resistance matters directly. The context window is unchanged at 1,048,576 tokens, and the OpenCode route's output limit stays at 131,072. Meta's max reasoning mode is not yet released; the reasoning modes 1.2 offered are available on 1.3 today.

## Related

- **Guide** — [DeepSeek V4 Flash code review](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions): Compare the $0 routes when the free contributor window is not open to you.
- **Guide** — [Command Code code review](https://www.pgupai.com/guides/command-code-review-github-actions): Run Muse Spark 1.3 through a seat you already pay for, with no per-token bill.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/muse-spark-code-review-github-actions](https://www.pgupai.com/guides/muse-spark-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
