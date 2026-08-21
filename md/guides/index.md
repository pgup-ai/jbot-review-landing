# Guides

Setup and architecture guides for an **agentic PR reviewer you control** — with a direct model API, gateway, CLI subscription, or optional local-agent companion. Released paths include exact configuration; private-beta guides state the trust boundaries and current limits.

- **CLI subscriptions** — [PR review with the CLI subscription you already pay for](https://www.pgupai.com/guides/cli-subscription-code-review): Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Kilo, Command Code, Grok Build, Qoder — the per-CLI provider values, secrets, and where each credential comes from. (Updated Jul 11, 2026)
- **Codex** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Reuse your ChatGPT Plus/Pro seat: codex login once, one CODEX_AUTH_JSON secret, and Codex reviews every PR read-only. (Updated Jul 4, 2026)
- **Claude** — [Claude code review in GitHub Actions](https://www.pgupai.com/guides/claude-code-review-github-actions): One workflow file plus your ANTHROPIC_API_KEY: Claude reviews every PR on your own runner, with findings verified before they post. (Updated Jul 4, 2026)
- **Cursor** — [Cursor code review in GitHub Actions](https://www.pgupai.com/guides/cursor-code-review-github-actions): One crsr\_… API key from your Cursor dashboard, and the Cursor CLI reviews every PR in read-only plan mode. (Updated Jul 4, 2026)
- **Cline** — [Cline code review in GitHub Actions](https://www.pgupai.com/guides/cline-code-review-github-actions): cline auth once, one secret — works on your subscription (cline-pass) or pay-as-you-go credits. (Updated Jul 4, 2026)
- **Kilo** — [Kilo code review in GitHub Actions](https://www.pgupai.com/guides/kilo-code-review-github-actions): Defaults to Kilo's free gateway model — the cheapest way to trial the whole pipeline end to end. (Updated Jul 4, 2026)
- **Devin** — [Devin code review in GitHub Actions](https://www.pgupai.com/guides/devin-code-review-github-actions): Copy the windsurf_api_key value from devin auth login into one secret, and your Devin seat reviews every PR. (Updated Jul 4, 2026)
- **Command Code** — [Command Code review in GitHub Actions](https://www.pgupai.com/guides/command-code-review-github-actions): One user\_… access key from ~/.commandcode/auth.json, and your Command Code seat reviews every PR. (Updated Jul 4, 2026)
- **Grok Build** — [Grok Build code review in GitHub Actions](https://www.pgupai.com/guides/grok-code-review-github-actions): grok login --device-auth once, one GROK_AUTH_JSON secret — your Grok account reviews every PR, with an xAI API key as the fallback. (Updated Jul 10, 2026)
- **Kimi K3** — [Kimi K3 code review in GitHub Actions](https://www.pgupai.com/guides/kimi-code-review-github-actions): Moonshot's K3 was reviewing PRs here the day it launched — OpenCode Go or OpenRouter, with the honest quota math. (Updated Jul 17, 2026)
- **Poolside · free preview** — [Laguna S 2.1 code review in GitHub Actions](https://www.pgupai.com/guides/poolside-code-review-github-actions): Verified direct Poolside setup, plus the free OpenCode and OpenRouter routes—with the exact provider, model, and secret names. (Updated Jul 22, 2026)
- **inclusionAI · free** — [Ling 3.0 Flash code review in GitHub Actions](https://www.pgupai.com/guides/ling-3-0-flash-code-review-github-actions): Four free routes—OpenCode, Kilo, OpenRouter, and Command Code—with the exact model and secret names. (Published Jul 23, 2026)
- **DeepSeek · official 0731** — [DeepSeek V4 Flash code review in GitHub Actions](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions): Six advertised $0 routes—including Cline and OpenRouter—with exact setup, snapshot and availability caveats, and official 0731 benchmarks. (Updated Aug 1, 2026)
- **OpenAI-compatible** — [Any OpenAI-compatible API, no CLI required](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions): A LiteLLM proxy, self-hosted vLLM or Ollama, or a hosted API with no CLI — three inputs: base URL, key, explicit model. (Updated Jul 18, 2026)
- **ACP gateway · private beta** — [Keep agent credentials on your machine](https://www.pgupai.com/guides/local-agent-code-review): Route Codex, Cursor, Devin, or Kilo through J-Bot’s ACP gateway to a companion you control. See where credentials, repository clones, and journal data live. (Published Jul 27, 2026)
- **Meta · free route** — [Muse Spark 1.2 code review in GitHub Actions](https://www.pgupai.com/guides/muse-spark-code-review-github-actions): A $0 contributor route on OpenCode with a 1M-token context window, what its feedback terms mean for private code, and how to pin review egress to an IP you control. (Published Aug 20, 2026)

## More resources

- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.
- **Example** — [See a real review](https://www.pgupai.com/#proof): A verified blocking finding, on a real diff.
- **Compare** — [CodeRabbit alternative](https://www.pgupai.com/compare/coderabbit-alternative): Per-seat SaaS vs $0/seat in your CI, side by side.
- **Compare** — [Greptile alternative](https://www.pgupai.com/compare/greptile-alternative): Credits and indexing vs your own runner, side by side.
- **Compare** — [Qodo alternative](https://www.pgupai.com/compare/qodo-alternative): Platform and credits vs your own CI — and where PR-Agent fits.
- **Compare** — [Cubic alternative](https://www.pgupai.com/compare/cubic-alternative): Reviewed-line metering vs no metering at all, side by side.

---

_Markdown representation of [https://www.pgupai.com/guides](https://www.pgupai.com/guides). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
