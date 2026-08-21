# Muse Spark 1.2 code review in GitHub Actions

Published August 20, 2026 · applies to pgup-ai/jbot-review-action v0

**Meta's Muse Spark 1.2 can review pull requests at $0 through OpenCode's contributor route, with a 1,048,576-token context window and tool calling.** The model ids and prices below were read from the live model catalog on 2026-08-20; the model shipped on 2026-08-05 and has not yet been rerun end to end on a real J-Bot review.

> **Two OpenCode ids · one of them $0**
>
> OpenCode lists Muse Spark 1.2 twice: a metered route and a contributor route priced at zero. They differ by one suffix, so copy the exact id rather than letting model selection stay implicit. The zero-priced route is a feedback route, described below, so check its terms before you point it at private code.

## OpenCode setup in three steps

1. **Create an OpenCode API key.** Save it as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The `-contributor-free` suffix pins the zero-cost route instead of the metered one.
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
          provider: opencode
          model: muse-spark-1.2-contributor-free
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Five routes, five exact model ids

Pick the route where you already manage credentials. Prices are the provider's list rates per million tokens, read from the live catalog on 2026-08-20; quotas and contributor eligibility remain provider-controlled.

**OpenCode**Catalog listed · $0 / $0

`provider: opencode`
`model: muse-spark-1.2-contributor-free`
`opencode-api-key`

**OpenCode**Catalog listed · $1.25 / $4.25

`provider: opencode`
`model: muse-spark-1.2`
`opencode-api-key`

**OpenCode Go**Catalog listed · $0.10 / $0.20

`provider: opencode-go`
`model: muse-spark-1.2-contributor`
`opencode-api-key`

**Kilo**Catalog listed · $1.25 / $4.25

`provider: kilo`
`model: kilo/meta/muse-spark-1.2`
`kilo-auth`

**OpenRouter**Catalog listed · $1.25 / $4.25

`provider: openrouter`
`model: meta/muse-spark-1.2`
`openrouter-api-key`

## Why Muse Spark 1.2 fits review work

- **The context window holds the whole change.** The catalog lists 1,048,576 input tokens with up to 131,072 output tokens on the OpenCode routes. That holds a large base…head diff plus the surrounding files J-Bot reads for context, with no shard-by-shard truncation.
- **It calls tools.** Review is an agentic loop, not a single completion. J-Bot reads files and challenges its own blocking findings mid-session. The catalog advertises tool calling and reasoning on every Muse Spark 1.2 route listed above.
- **Caching cuts the metered route.** The paid OpenCode route lists cached input at $0.15 per million against $1.25 uncached. J-Bot keeps the expensive shared prefix stable across shards, so a multi-shard review reuses it.
- **J-Bot adds $0.** The Action is MIT-licensed, with no reviewer service and no per-seat fee. On the contributor route your remaining cost is normal GitHub Actions minutes.

## When the runner's egress is the problem

Some providers decide what a caller may reach based on the IP it arrives from, and a GitHub-hosted runner egresses from address ranges you do not pick. If your account is provisioned for a route your CI cannot reach, the optional `opencode-proxy-url` input sends OpenCode's traffic through a proxy you control: a static-IP egress your platform team already runs, or a host in a region your account is provisioned for.

`.github/workflows/jbot-review.yml · proxy input`

```
      - uses: pgup-ai/jbot-review-action@v0
        with:
          provider: opencode
          model: muse-spark-1.2-contributor-free
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

- **The $0 route is a feedback route.** OpenCode publishes Muse Spark 1.2 Contributor Free for a limited time and says the team is using it to "collect feedback and improve the model". It carries none of the zero-retention wording OpenCode gives its Ox Alpha Free listing. Send private code through the metered `muse-spark-1.2` route or another provider, and read the current terms first.
- **Your runner stays in control.** The review session runs headless on your GitHub Actions runner with read-only repository access.
- **The route determines the destination.** Each provider uses its corresponding account or authenticated CLI backend. J-Bot does not proxy the diff through a hosted reviewer service.
- **A configured proxy is one more hop.** If you set `opencode-proxy-url`, OpenCode's traffic transits a host you chose. Point it at infrastructure inside your own trust boundary.
- **Fork PRs cannot read the key.** GitHub does not pass repository secrets to `pull_request` workflows from forks.
- **Blocking findings are verified.** A second model session challenges each blocking finding before J-Bot posts it; nits are demoted.

## FAQ

### Is Muse Spark 1.2 free for pull-request review?

On one route. As of 2026-08-20 the live model catalog lists `opencode/muse-spark-1.2-contributor-free` at $0 input and $0 output. The standard `opencode/muse-spark-1.2` route is priced at $1.25 per million input and $4.25 per million output, and `opencode-go/muse-spark-1.2-contributor` at $0.10 and $0.20. The zero-priced route is a feedback route. OpenCode publishes it for a limited time to collect feedback and improve the model, and gives it none of the zero-retention wording it publishes for Ox Alpha Free, so keep private code on the metered `muse-spark-1.2` route. Free windows, quotas, and eligibility for a contributor route remain provider-controlled. J-Bot adds no charge of its own.

### What model id does Muse Spark 1.2 use on each provider?

OpenCode uses `muse-spark-1.2-contributor-free` for the $0 route and `muse-spark-1.2` for the paid one. OpenCode Go uses `muse-spark-1.2-contributor`. Kilo uses `kilo/meta/muse-spark-1.2` and OpenRouter uses `meta/muse-spark-1.2`. All five spellings were read from the live model catalog on 2026-08-20.

### My runner cannot reach the model provider. What are my options?

Some providers gate access on the caller's egress IP, and GitHub-hosted runners egress from address ranges you do not choose. The optional `opencode-proxy-url` input routes OpenCode's traffic through a proxy you control, such as a static-IP egress your platform team already runs. J-Bot verifies the proxy before using it, skips it entirely on fork-head pull requests, and falls back to the direct route if verification fails, so the review still runs. Check your provider's terms before using a proxy to reach a route your account is not provisioned for.

### Has the Muse Spark 1.2 route been tested end to end with J-Bot?

Not yet. The model ids, prices, context window, and tool-calling support on this page were read from the live model catalog on 2026-08-20. Muse Spark 1.2 was released on 2026-08-05 and has not been rerun end to end on a real J-Bot review, unlike the [Poolside](https://www.pgupai.com/guides/poolside-code-review-github-actions) and [Command Code](https://www.pgupai.com/guides/command-code-review-github-actions) routes documented elsewhere on this site.

## Related

- **Guide** — [DeepSeek V4 Flash code review](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions): Compare the $0 routes when the free contributor window is not open to you.
- **Guide** — [Ling 3.0 Flash code review](https://www.pgupai.com/guides/ling-3-0-flash-code-review-github-actions): Another free route, with four providers and four exact model ids.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/muse-spark-code-review-github-actions](https://www.pgupai.com/guides/muse-spark-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
