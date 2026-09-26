# Space Bunny code review in GitHub Actions

Published September 26, 2026 · routes and prices checked September 26, 2026 · applies to pgup-ai/jbot-review-action v0

**Space Bunny is an anonymous model with a 1M-token context window, listed at $0 on OpenCode Zen, OpenCode Go, Kilo, OpenRouter, Cline and Command Code since 2026-09-23.** It’s the free model we’d start J-Bot Review on today. At the default high reasoning effort it found 6.5 of 27 known issues on our test pull requests, with a median review time of 251 seconds.

> **Anonymous lab · $0 on six gateways · no stated data policy**
>
> None of the catalogs that list Space Bunny name the lab behind it or say what happens to your prompts. That makes it a good default for open-source code and a poor one for private code, at least until someone publishes terms.

## OpenCode setup in three steps

1. **Create an OpenCode API key.** Save it as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The `opencode/` prefix selects the provider, and J-Bot already runs Space Bunny at high reasoning effort on this route, so nothing else needs setting.
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
          model: opencode/space-bunny-free
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Six routes, six exact model ids

Pick the route where you already manage credentials. The first segment of each id selects the provider. Prices are per million tokens from each live catalog on 2026-09-26, and quotas stay under each provider’s control.

**OpenCode Zen** (Catalog · $0 / $0)

`model: opencode/space-bunny-free`
`opencode-api-key`

**OpenCode Go** (Catalog · $0 / $0)

`model: opencode-go/space-bunny-free`
`opencode-api-key`

**Kilo** (Catalog · $0 / $0)

`model: kilo/stealth/space-bunny-alpha`
`kilo-auth`

**OpenRouter** (Catalog · $0 / $0)

`model: openrouter/stealth/space-bunny-alpha`
`openrouter-api-key`

**Cline** (Free tier · daily cap)

`model: cline/stealth/space-bunny-alpha`
`cline-auth`

**Command Code** (Free · plan caps checked)

`model: commandcode/stealth/space-bunny-alpha`
`commandcode-access-key`

J-Bot’s high-effort default for Space Bunny covers the two OpenCode routes and Command Code. On OpenRouter it runs at the global `low` default unless you set `model-options`. Kilo and Cline run through their own CLIs, which don’t take J-Bot’s effort option. Space Bunny is free on Command Code, but J-Bot still checks your plan’s 5-hour and weekly caps before each run and stops if every key is exhausted.

## Reasoning effort is the setting that matters

We ran Space Bunny on four pull requests from a production TypeScript monorepo, with 27 issues that developers had already accepted, two runs per setting:

- **Low:** 2.5 known issues, 68 s median review. Space Bunny reasoned for about a thousand tokens per session and posted about one finding.
- **Medium:** 3.0 known issues, 94 s.
- **High:** 6.5 known issues, 251 s.

High effort found more than twice as many issues for 3.7 times the wall time, so J-Bot made it the default on OpenCode and Command Code. Verification runs one tier lower, at medium. If you’d rather have a review in about a minute and accept fewer findings, set low effort yourself:

`.github/workflows/jbot-review.yml · faster, fewer findings`

```yaml
      - uses: pgup-ai/jbot-review-action@v0
        with:
          model: opencode/space-bunny-free
          model-options: '{"reasoningEffort":"low"}'
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Why effort helps, and what else we tested, is in [How do you get better code reviews from free AI models?](https://www.pgupai.com/guides/free-model-code-review-quality)

## What we know about Space Bunny

- **Context.** OpenCode lists a 1,048,576-token window with up to 524,288 tokens of input per request and 524,288 of output. OpenRouter and Kilo list 1,000,000.
- **Tools and reasoning.** Every catalog marks tool calling and adjustable reasoning. OpenRouter describes it as a model with fast inference, strong coding and native multimodal input.
- **Speed.** At low effort it was the fastest free model we’ve run in J-Bot. On the same test pull requests it finished in about 50 seconds where MiMo V2.6 Flash’s free route took about 24 minutes.
- **Origin.** Unknown. The catalogs call it a stealth or anonymous model, and none names a lab or a release plan.

## Where the diff goes

- **An unnamed lab serves the model.** No listing states a retention or training policy. Treat anything you send as possibly kept and used, and keep private code on a route whose terms you’ve read.
- **Cline’s free tier adds its own terms.** Cline’s documentation says free-model usage may be used to improve model performance and quality.
- **Your runner stays in control.** The review runs headless on your GitHub Actions runner with read-only repository access, and J-Bot sends the diff only to the provider you configure.
- **Fork pull requests can’t read the key.** GitHub doesn’t pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is Space Bunny free for code review?

Yes, as of 2026-09-26. OpenCode Zen and OpenCode Go list `space-bunny-free` at $0, Kilo and OpenRouter list `stealth/space-bunny-alpha` at $0, Cline offers it in its free tier with a daily cap, and Command Code offers it free on its plans. J-Bot Review adds no charge, so your remaining cost is GitHub Actions minutes.

### Who makes Space Bunny?

No catalog says. OpenCode, OpenRouter, Kilo, Cline and Command Code list it as a stealth or anonymous model, first listed on 2026-09-23, and none names the lab or a data policy.

### Which reasoning effort should Space Bunny use for code review?

High, unless you need speed more than findings. On four test pull requests it found 6.5 of 27 known issues at high effort against 2.5 at low, with the median review rising from 68 to 251 seconds. J-Bot uses high by default on OpenCode and Command Code. On OpenRouter, set `model-options` to high yourself.

### Which Space Bunny route should I use?

OpenCode Zen if you want the simplest setup: one API key, the high-effort default, and a $0 price. Add Kilo or OpenRouter as extra entries in a comma-separated model pool, so a rerun can move to another gateway when one hits its free limit.

## Related

- **Guide** — [Which free model to use](https://www.pgupai.com/guides/free-ai-models-code-review): Space Bunny against the other free models, with quotas.
- **Engineering** — [Better reviews from free models](https://www.pgupai.com/guides/free-model-code-review-quality): Effort and a second pass moved recall. Prompts and filters didn’t.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/space-bunny-code-review-github-actions](https://www.pgupai.com/guides/space-bunny-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
