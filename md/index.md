Bring your own model — $0 per seat, not ~~$40/mo~~

# Code review that runs inside your own CI.

An open-source agentic PR reviewer as a single GitHub Action. It runs on your runner, reviews with the model you already pay for, and posts diff-anchored findings back — no SaaS, no per-seat bill.

[Add to your repo](https://www.pgupai.com/#setup) [View source](https://github.com/pgup-ai/jbot-review-action)

[On GitHub Marketplace · **MIT licensed**](https://github.com/marketplace/actions/j-bot-code-review)

**$0** — per seat

**1 file** — to install

**30+** — providers & CLIs

**3,000+** — [reviews run](https://www.pgupai.com/#proof)

`.github/workflows/jbot-review.yml`

```yaml
name: J-Bot Code Review
on:
  pull_request: { types: [opened, synchronize, reopened] }

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: pgup-ai/jbot-review-action@v0
        with:
          provider: ${{ vars.JBOT_REVIEW_PROVIDER || 'opencode' }}
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Bring a model key or reuse a coding subscription

### Model APIs & gateways

OpenCode Zen (free models) · OpenCode Go · Claude · OpenAI · Gemini · DeepSeek · Z.ai · Qwen · Kimi (K3 · day one) · MiniMax · MiMo · Grok · Nvidia · OpenRouter · Poolside (direct API) · Fireworks · Cohere · Together · Baseten · Cerebras · Vercel · + more

### CLI subscriptions

Codex · Cursor · Devin · Cline · Kilo · Grok Build · Command Code · Qoder

### Custom endpoints (new)

LiteLLM · vLLM · Ollama · + any OpenAI-compatible

### Or start at $0 — free models

Muse Spark 1.2 · DeepSeek V4 Flash · Laguna S 2.1 · Ling 3.0 Flash · MiMo v2.5

**Muse Spark 1.2:** OpenCode lists a contributor route at $0 alongside the metered one. It is a feedback route with no published zero-retention terms, so keep private code on the metered route. [Exact model ids →](https://www.pgupai.com/guides/muse-spark-code-review-github-actions)

**DeepSeek V4 Flash:** official 0731 is free through OpenCode and InferX. Cline, OpenRouter, Kenari, and UnoRouter also list $0 routes; snapshots and availability vary. [Compare routes →](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions)

ACP gateway · private beta

### Keep provider credentials on your machine.

Route a J-Bot review through its ACP gateway to a companion running Codex, Cursor, Devin, or Kilo on a machine you control. Your GitHub workflow uses gateway routing credentials—not the agent’s provider credential.

[See how ACP gateway reviews work →](https://www.pgupai.com/guides/local-agent-code-review)

GitHub Actions connects through your gateway to your companion

See a real review

## Diff-anchored findings. Verified before they post.

A second model checks every blocking finding first — so what lands on your PR is signal, not a wall of nits.

jbot-review bot · reviewed 2 files · 40s ago

src/auth/session.ts

```diff
@@ -41,7 +41,9 @@ export async function createSession(
-  const token = jwt.sign(payload, SECRET)
+  const token = jwt.sign(payload, SECRET, {
+    algorithm: req.headers['x-alg'] || 'HS256'
+  })
```

● Blocking security · verified

**Attacker-controlled JWT algorithm.** The signing algorithm is read from a request header, so a caller can force `none` or swap to a key-confusion attack. Pin the algorithm server-side:

```
jwt.sign(payload, SECRET, { algorithm: 'HS256' })
```

Needs changes before approval 1 blocking · 2 nits demoted

Full base…head diff, sharded for speed · nits demoted, false positives dropped

[See a real J-Bot review on a live pull request →](https://github.com/pgup-ai/jbot-review/pull/78#pullrequestreview-4619619627)

**3,000+** — reviews run

**8,100+** — files reviewed

**2.2M+** — diff lines reviewed

From our internal repos · Since June 2026

How it works

## One file of setup. Zero servers to run.

A Docker container action. GitHub runs it on your runner, reviews your checkout read-only, and posts back. The diff goes only to the model you bring — never a third-party reviewer.

01

### Add the workflow

Commit one YAML file to .github/workflows and add an OpenCode gateway key or CLI credential as a repo secret.

secrets: OPENCODE_API_KEY

02

### It runs in your CI

On each PR, Actions starts your selected backend in the container and reviews the full diff with least-privilege permissions.

contents: read · pull-requests: write

03

### Verified reviews post

A second model verifies each blocking finding, then diff-anchored comments and a verdict land on the PR.

good to go from jbot-review

Features

## Enterprise-grade review. Zero lock-in.

### Your key, your runner

Bring the gateway key or CLI credential as a repo secret. The diff goes only to the model you chose, on your own account.

### No added J-Bot bill

Use a provider's free model route, reuse a CLI seat, or pick a provider model on your own account. J-Bot adds no per-review bill.

### Native to GitHub CI

A standard container action in your own CI. No SaaS account and no third-party reviewer in the loop.

### Tune depth and cost

Start with the defaults, then adjust shards, review passes, and finding verification as your repositories grow.

### Reads your house rules

Discovers AGENTS.md, REVIEW.md, .coderabbit.yaml, greptile.json and Cursor rules, then reviews against them.

### Checks current docs

When a PR touches an external API or SDK, Context7 verifies the change against live documentation.

Ownership & cost

## A reviewer you own, not a service you rent.

### Hosted SaaS reviewers

rented

~$40 / mo · per seat

Your code is uploaded to the reviewer’s own servers and model.

Per-seat pricing that scales with your team, not your usage.

Locked to the models the vendor chose for you.

Closed pipeline you cannot read, audit, or fork.

### J-Bot Review

owned

$0 / seat · any team size

Runs in your runner. The diff goes only to the model you pick, on your own key.

Can be free with your provider’s free models, or reuse a CLI seat you already pay for.

Any provider, model, or supported CLI. Swap with one repo variable.

Open action you can pin, audit, and self-host anywhere.

Full comparisons: [CodeRabbit](https://www.pgupai.com/compare/coderabbit-alternative) · [Greptile](https://www.pgupai.com/compare/greptile-alternative) · [Qodo](https://www.pgupai.com/compare/qodo-alternative) · [Cubic](https://www.pgupai.com/compare/cubic-alternative)

GitHub App · private beta

## The same reviewer, managed for you.

The Action stays the no-server way to run J-Bot Review. The GitHub App runs the same reviewer from a dashboard instead: install it on a repo, add your own model keys — encrypted at rest, shown as last-4 only — and pull requests get reviewed with no workflow file to maintain. Reviews execute on ephemeral GitHub Actions runners.

Dashboard config: primary + verification model, a severity gate, PR triggers — or comment `@jbot review`

Per-run review history — duration, cost, tokens — with retry

Usage and quota meters per key

Schematic preview of the J-Bot Review dashboard: review configuration and review history panes

FAQ

## Questions, answered.

### Can I use my Claude, Codex, or Cursor subscription for automated code review?

Yes for Codex (a ChatGPT Plus/Pro seat), Cursor, Devin, Cline, Kilo, Command Code, Grok Build, and Qoder: J-Bot Review drives those coding-agent CLIs inside your own GitHub Actions, so a seat you already pay for reviews every pull request. Claude runs through your own Anthropic API key or an OpenCode gateway instead — a Claude Pro/Max seat is not a supported CI credential today. See the [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review) for per-CLI setup.

### Can J-Bot review a pull request without storing my agent credential in GitHub Actions?

Yes, through the optional private-beta [ACP gateway route](https://www.pgupai.com/guides/local-agent-code-review) for Codex, Cursor, Devin, and Kilo. A companion on a machine you control runs the agent and keeps its provider credential there. GitHub Actions uses gateway routing credentials instead. For private repositories, the companion also needs Git access to create a temporary clone. The gateway relays and journals review prompts and agent transcripts, so run it inside a trust boundary you control.

### My CI runner cannot reach a model provider. Can J-Bot route around that?

Sometimes. Some providers decide what a caller may reach from the IP it arrives on, and GitHub-hosted runners egress from address ranges you do not choose. The optional `opencode-proxy-url` input routes OpenCode's traffic through a proxy you control, such as a static-IP egress your platform team already runs. J-Bot verifies the proxy before trusting it, scopes it to the OpenCode process rather than exporting it globally, skips it entirely on fork-head pull requests, and falls back to the direct route if verification fails, so a broken proxy never costs you a review. Use a dedicated low-privilege credential, and check your provider's terms before using a proxy to reach a route your account is not provisioned for. Full detail in the [Muse Spark guide](https://www.pgupai.com/guides/muse-spark-code-review-github-actions#egress).

### Is J-Bot Review free?

The action itself is MIT-licensed open source and adds no per-seat or per-review charge. You pay only for the model you bring — with a provider's free model route or a CLI seat you already pay for, J-Bot adds $0 on top of your normal CI minutes.

### Is J-Bot Review production-ready? What does v0.2.0 mean?

It is ready to run on real pull requests, with one caveat: it is still a pre-1.0 project. `v0.2.0` was the first public Marketplace release, and the `@v0` tag receives ongoing v0 updates. J-Bot posts comment reviews and merge guidance; it does not approve, merge, or replace your branch protections. Keep human review in the loop while you tune it for your repositories.

### What does an average J-Bot Review cost?

J-Bot itself costs $0. The model cost depends on the provider, model, diff size, and review settings, so there is no honest one-number average. A run can add $0 with a provider's free model route or a supported CLI seat you already pay for; paid API routes are billed at the provider's rates. When a backend exposes usage, the Action logs its token and cost totals after the review.

### Does J-Bot Review support monorepos and very large diffs?

Yes. J-Bot reads repository-level guidance plus directory-scoped files such as `AGENTS.md` and `REVIEW.md`, so packages in a monorepo can carry their own rules. For large diffs, set `review-shards: 0` to split changed files across up to four parallel review sessions. Results are merged, and a failed main shard aborts the review instead of posting partial coverage as complete. Provider context and concurrency limits still apply.

### Does J-Bot Review support GitLab or Bitbucket?

Not today. The packaged integration is GitHub-only because it runs in GitHub Actions and posts through GitHub's pull-request review APIs. GitLab merge requests and Bitbucket pull requests are not supported yet.

### Does my code get uploaded to a third-party service?

Run as the Action, there is no J-Bot server and no hosted reviewer in the loop, and the checkout never leaves your runner. What does leave is the diff, sent only to the model provider you configure, on your own key.

### Is there a hosted or GitHub App version of J-Bot Review?

Currently in private beta. The GitHub App runs the same reviewer from a dashboard instead of a workflow file: add your own model keys (encrypted at rest), configure models, a severity gate, and triggers, and see review history and per-key usage meters. Reviews execute on ephemeral GitHub Actions runners. The Action remains the no-server option and is not being replaced.

### How is J-Bot Review different from CodeRabbit or Greptile?

Hosted reviewers run your code through their own servers and charge per seat (about $40 per month). J-Bot Review is an open-source GitHub Action that runs in your CI with any model you choose, at $0 per seat. It also reads existing `.coderabbit.yaml` and `greptile.json` rule files, so switching keeps your house rules. Full comparisons: [CodeRabbit](https://www.pgupai.com/compare/coderabbit-alternative) · [Greptile](https://www.pgupai.com/compare/greptile-alternative) · [Qodo](https://www.pgupai.com/compare/qodo-alternative) · [Cubic](https://www.pgupai.com/compare/cubic-alternative).

### Which models and providers does J-Bot Review support?

30+ backends. Direct model APIs and gateways cover Poolside, OpenCode Zen free models, OpenCode Go, Claude, OpenAI, Gemini, DeepSeek, Grok, Qwen, Kimi, MiniMax, OpenRouter, Fireworks, Cohere, Together, and more. Poolside is a first-class direct API backend: set `provider: poolside` with `poolside-api-key`; it defaults to `poolside/laguna-s-2.1`, [verified end to end on a real code review](https://www.pgupai.com/guides/poolside-code-review-github-actions). CLI subscription backends cover Codex, Cursor, Devin, Cline, Kilo, Command Code, Grok Build, and Qoder. If your provider isn't listed, set `provider: openai-compatible` for a [LiteLLM proxy, self-hosted vLLM or Ollama server, or internal AI gateway](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions), with a base URL, API key, and explicit model.

### Does it work with private repositories?

Yes. It is a standard container action: if your repository runs GitHub Actions, it can run J-Bot Review. Default permissions are least-privilege — `contents: read`, `pull-requests: write` — and your code never leaves the runner except to the model you configured.

## Put it on your next pull request.

One YAML file, one secret, and an agentic reviewer is reading every PR — on your runner, with $0 added by J-Bot.

`- uses: pgup-ai/jbot-review-action@v0`

[Read the docs on GitHub →](https://github.com/pgup-ai/jbot-review-action#readme)

---

_Markdown representation of [https://www.pgupai.com/](https://www.pgupai.com/). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
