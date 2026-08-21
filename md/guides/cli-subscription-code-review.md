# Automated PR review with a CLI subscription you already pay for

Updated July 11, 2026 · applies to pgup-ai/jbot-review-action v0

**Yes — the coding-agent seat you already pay for can review your pull requests.** If you subscribe to **Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Kilo, Command Code, Grok Build, or Qoder**, J-Bot Review — an open-source (MIT) GitHub Action — runs that CLI inside your own GitHub Actions and posts diff-anchored, verified review comments on every PR. One workflow file, one repo secret, **$0 added** by J-Bot.

Hosted AI reviewers (CodeRabbit, Greptile, and similar) charge roughly $40 per seat per month and run your code through their own servers. None of them can reuse a CLI subscription; as far as we know, J-Bot Review is the only PR reviewer that can.

## The base workflow (one file)

Commit this as `.github/workflows/jbot-review.yml`. The `provider` line and one secret change per CLI — the table below has every combination.

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
          provider: codex                              # ← pick yours from the table
          codex-auth: ${{ secrets.CODEX_AUTH_JSON }}  # ← and its matching secret
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Per-CLI setup: provider, secret, and where the credential comes from

Each subscription maps to a `provider` value plus one action input, fed from a repository secret (_Settings → Secrets and variables → Actions_). Use the credential from the same account or local CLI setup you already use.

| CLI seat | provider: | Action input | Credential source |
| --- | --- | --- | --- |
| [Codex (ChatGPT Plus/Pro)](https://www.pgupai.com/guides/codex-code-review-github-actions) | `codex` | `codex-auth` | contents of `~/.codex/auth.json` after `codex login` |
| [Cursor](https://www.pgupai.com/guides/cursor-code-review-github-actions) | `cursor` | `cursor-api-key` | API key (`crsr_…`) from the Cursor dashboard → Integrations |
| [Cline — subscription](https://www.pgupai.com/guides/cline-code-review-github-actions) | `cline-pass` | `cline-auth` | contents of `~/.cline/data/settings/providers.json` after `cline auth` |
| [Cline — pay-as-you-go](https://www.pgupai.com/guides/cline-code-review-github-actions) | `cline` | `cline-auth` | same file as above |
| [Devin](https://www.pgupai.com/guides/devin-code-review-github-actions) | `devin` | `devin-windsurf-api-key` | `windsurf_api_key` value from `~/.local/share/devin/credentials.toml` after `devin auth login` |
| [Command Code](https://www.pgupai.com/guides/command-code-review-github-actions) | `commandcode` | `commandcode-access-key` | `apiKey` value (`user_…`) from `~/.commandcode/auth.json` |
| [Kilo](https://www.pgupai.com/guides/kilo-code-review-github-actions) | `kilo` | `kilo-auth` | contents of `~/.local/share/kilo/auth.json` after `kilo auth login` |
| [Grok Build](https://www.pgupai.com/guides/grok-code-review-github-actions) | `grok` | `grok-auth` | contents of `~/.grok/auth.json` after `grok login --device-auth` (or `xai-api-key` as fallback) |
| Qoder | `qoder` | `qoder-token` | Personal Access Token from Qoder Integrations |

### Notes that save you a debugging session

- **Codex** runs read-only (`codex exec --sandbox read-only`). The secret is the whole `auth.json` file content, not a key inside it. Full setup: [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions).
- **Cursor** authenticates straight from `CURSOR_API_KEY` and runs in read-only plan mode (`cursor-agent --mode plan`).
- **Cline** has two billing modes as separate providers sharing one secret. Pin models as `cline/<type>/<model>` or `cline-pass/<model>`, or omit `model` for each mode's default.
- **Devin** and **Command Code** want a key _value_ copied out of the credential file — `windsurf_api_key` (`devin-session-token$…`) and `apiKey` (`user_…`) respectively — not the whole file, unlike Codex, Cline, Kilo, and Grok Build.
- **Kilo** defaults to its free gateway model — a $0 way to trial the whole pipeline.
- **Grok Build** prefers account auth: the `xai-api-key` fallback is used only when `grok-auth` is absent, so an expired login fails loudly instead of silently billing your API key. `provider: grok` is deliberately separate from `provider: xai`, which keeps calling the xAI API directly.
- **Qoder** uses a Personal Access Token from Qoder Integrations. Set `provider: qoder` and pass it through `qoder-token`.
- These are credentials on _your_ account: store them as repo **secrets** (never variables), and check your plan's terms for CI/automation use.
- On `pull_request` events GitHub strips secrets from fork PRs, so outside contributors can't exfiltrate your seat.

> **What about Claude?**
>
> Claude models are fully supported — through your own **Anthropic API key** (`provider: anthropic`) or an OpenCode gateway. A Claude Pro/Max _subscription seat_ is not a supported CI credential today. Setup: [Claude code review in GitHub Actions →](https://www.pgupai.com/guides/claude-code-review-github-actions)

## What you get on every PR

- **Diff-anchored findings** across the full base…head diff, posted as normal review comments with a verdict.
- **Verified before posting:** a second session adversarially re-checks every blocking finding; refuted ones are dropped, uncertain ones demoted to advisory. Nits are demoted so the PR gets signal, not noise.
- **Your house rules:** it discovers `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, and Cursor rules, and reviews against them.
- **Current-docs checks:** when a PR touches an external API or SDK, Context7 verifies the change against live documentation.
- **Read-only:** the runner checkout is never written to; least-privilege permissions are the default.

## Cost & privacy

- **$0 added by J-Bot** — MIT-licensed action, no reviewer SaaS account, no per-seat bill. You pay normal CI minutes.
- **No new data recipient:** the diff goes only to the CLI's own backend under your account — the same vendor your editor already sends code to.
- **Tunable spend:** defaults are one review pass with verification on; raise `review-passes` for recall or set `min-severity` to trim output. Doc-only PRs skip the model entirely.

## FAQ

### Which CLI subscriptions can review my pull requests?

Codex (a ChatGPT Plus or Pro seat, via `codex login`), Cursor, Devin, Cline (subscription or pay-as-you-go), Kilo, Command Code, Grok Build (`grok login` account auth, with an xAI API key as fallback), and Qoder (Personal Access Token). Each maps to a `provider` value and one repo secret in the J-Bot Review action. Claude is supported through your own Anthropic API key or an OpenCode gateway instead — a Claude Pro/Max seat is not a supported CI credential today.

### Does J-Bot Review add any cost on top of my subscription?

No. The action is MIT-licensed open source and adds no per-seat or per-review charge. Reviews run on your own GitHub Actions runner against the seat you already pay for, so the only added cost is normal CI minutes.

### Is my code sent anywhere new?

No new party is involved. The action reads your checkout read-only on your runner, and the diff goes only to the CLI's own backend under your account — the same vendor your editor already sends code to. There is no third-party reviewer service in the loop.

### Can the verification pass run on a different provider than the main review?

Yes. Set `aux-provider` and `aux-model` to run auxiliary sessions (finding verification, guideline compliance) on a second backend — for example, review on your CLI seat and verify on a free OpenCode Zen model. CLI backends and OpenCode-backed providers use separate credentials, so pass both keys.

## Related

- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Guide** — [Claude code review in GitHub Actions](https://www.pgupai.com/guides/claude-code-review-github-actions): Your Anthropic key, your runner — setup in three steps.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/cli-subscription-code-review](https://www.pgupai.com/guides/cli-subscription-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
