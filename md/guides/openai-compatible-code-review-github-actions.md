# Use any OpenAI-compatible API for code review in GitHub Actions

Updated July 18, 2026 · applies to pgup-ai/jbot-review-action v0

**If it speaks the OpenAI chat-completions protocol, it can review your pull requests.** `provider: openai-compatible` points J-Bot Review — an open-source (MIT) GitHub Action — at an endpoint you name instead of one it knows: a LiteLLM proxy your platform team already runs, a vLLM or Ollama server on your own hardware, or a hosted API that never shipped a CLI. Three inputs — a base URL, an API key, and an explicit model — and J-Bot adds **$0** of its own.

> **The one hard requirement**
>
> J-Bot reviews agentically — the session lists files, reads context, greps callers, and files findings through OpenAI-style **tool calls**. Plain chat completion isn't enough: the endpoint must pass the `tools` parameter through, and the model you pin must know how to use it. Every endpoint on this page is discussed against that bar.

## Setup in three steps

1. **Save the endpoint settings.** In _Settings → Secrets and variables → Actions_, store the base URL as the repository variable `JBOT_OPENAI_COMPATIBLE_BASE_URL` (absolute `http(s)://`, including any version path like `/v1`) and the key as the secret `JBOT_OPENAI_COMPATIBLE_API_KEY`.
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The model is required and exact — J-Bot never guesses one for a generic endpoint.
3. **Open a pull request.** The session reads the full base…head diff on your runner and posts diff-anchored findings; blocking findings are verified by a second session before they post, nits demoted.

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
          provider: openai-compatible
          model: openai-compatible/my-served-model   # the exact id your endpoint serves
          openai-compatible-base-url: ${{ vars.JBOT_OPENAI_COMPATIBLE_BASE_URL }}
          openai-compatible-api-key: ${{ secrets.JBOT_OPENAI_COMPATIBLE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## The three things your endpoint must do

- **Serve OpenAI-shaped `chat/completions`.** J-Bot drives the endpoint through the `@ai-sdk/openai-compatible` provider inside its OpenCode engine — the same request shape the OpenAI SDK sends when you swap `base_url`.
- **Pass tool calls through.** See the callout above. Proxies usually forward `tools` untouched; self-hosted servers often need a flag (vLLM's tool-call parser, for example); a few hosted APIs drop the parameter entirely — those are listed under [what doesn't work](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions#non-options).
- **Tell you the model id.** `model` takes the form `openai-compatible/<endpoint-model-id>`, where the id is exactly what the endpoint exposes — its `/v1/models` list is the source of truth. There is no default and no probing.

## A LiteLLM proxy — the endpoint your company may already run

LiteLLM's open-source proxy is how many platform teams put one OpenAI-format URL in front of every provider they've approved — with budgets, logging, and virtual keys (`sk-…`) per team. If that describes your org, PR review becomes a consumer of infrastructure you already govern: no new vendor, no new data-processing review, model choice stays with the platform team.

- **Base URL:** your proxy origin — LiteLLM answers the OpenAI paths with or without a `/v1` suffix.
- **Key:** a virtual key scoped to CI, so review spend shows up as its own line in the proxy's budget tracking.
- **Model:** whatever alias the proxy config maps — often a clean name like `openai-compatible/team-code-model`. Tool-call fidelity is that of the provider behind the alias, so point CI at an alias backed by a tool-capable model.

## Self-hosted vLLM — and the network reality

vLLM serves an OpenAI-compatible API out of the box (`vllm serve <model>`, default port 8000). Two flags matter for review work: enable tool calling with `--enable-auto-tool-choice --tool-call-parser <name>` — the parser name is per model family in vLLM's docs — and consider `--served-model-name code-review` to give CI a stable, slash-free id that survives model swaps.

> **Reachability, stated plainly**
>
> A GitHub-_hosted_ runner has no route into your LAN. To review against in-network inference you need one of: a **self-hosted runner** on that network, a **tunnel** (Tailscale, cloudflared) joined during the job, or the endpoint exposed publicly **behind authentication**. J-Bot validates that the base URL is absolute http(s) and then treats it like any other endpoint — the networking is yours to arrange. Most guides skip this paragraph; it is the actual work.

**Ollama** exposes the same shape at `http://<host>:11434/v1` and accepts `tools` on models that carry the capability, though its OpenAI layer documents gaps (notably `tool_choice`). **llama.cpp's** server does OpenAI-style tool calls only with `--jinja` and a compatible chat template. **LM Studio** documents tool use on its local server too, but it's a desktop app — fine for trying the loop on your own machine, not a team CI target. In every case the model, not just the server, must be tool-capable: a 7B quant that mangles JSON arguments will fail reviews in ways that look like J-Bot bugs and aren't.

## Hosted APIs without a CLI

The same three inputs cover hosted providers that publish an OpenAI-compatible base URL. Documented starting points, checked July 2026:

| Endpoint | Documented base URL | Worth knowing |
| --- | --- | --- |
| Groq | `https://api.groq.com/openai/v1` | First-party OpenAI-compatibility and tool-use docs; a free tier exists but its per-minute token cap suits small diffs only. |
| SambaNova | `https://api.sambanova.ai/v1` | Function calling documented on a named model list; free-tier daily token budget is roughly one medium review. |
| Mistral | `https://api.mistral.ai/v1` | OpenAI-shaped rather than officially OpenAI-compatible, and stricter than most about tool-call id format — run a test PR before adopting. |

If your provider is one J-Bot already knows natively — OpenRouter, Fireworks, Together, Cerebras, Nvidia, and the rest of the [built-in list](https://www.pgupai.com/#faq) — prefer its native provider id: you keep model catalogs, provider-tuned options, and prompt caching. `openai-compatible` is the door for everyone else, including services launched after this page was written.

## What doesn't work, and why

- **Perplexity.** Its chat-completions API has no `tools` parameter at all (checked July 2026) — it's built for search answering, and no agentic loop can run over it.
- **Straico.** The v2 OpenAI-compatible API doesn't document tool calling; treat it as absent.
- **Portkey and other header-authenticated gateways.** Portkey expects its own `x-portkey-*` headers alongside provider auth; J-Bot sends only a bearer key against a base URL, so those gateways don't fit this path today.
- **Anything whose model can't call tools.** The request will go through and the review will still fail — see the requirement callout up top.

## Cost and caching notes

- **J-Bot's own line item is $0** — MIT-licensed action, no reviewer service, no per-seat charge. You pay your endpoint's rates plus normal CI minutes; on your own GPUs, the marginal cost of a review is electricity.
- **Prompt caching is off on this provider, on purpose.** Arbitrary endpoints reject provider-specific cache options, so J-Bot doesn't send them for `openai-compatible` — budget input tokens at list price. If cache discounts matter, that's another reason to use a native provider id where one exists.
- **The verifier can differ from the reviewer.** `aux-model` accepts the same form, so a cheap endpoint model can draft while a stronger one verifies — or the reverse.

## Where the diff goes

- **Your runner, read-only.** The session runs headless with `contents: read`; write scopes exist only to post comments and reactions.
- **One recipient, chosen by you.** The diff goes to the base URL you configured and nowhere else — there is no reviewer service in the loop. Against in-network inference, it never leaves your infrastructure at all.
- **Fork PRs can't leak the key.** GitHub strips secrets from `pull_request` events on fork PRs, so outside contributors never see it.
- **Findings are checked before they post.** A second session adversarially verifies every blocking finding; nits are demoted so the PR gets signal, not noise.

## FAQ

### Do I need a CLI for the provider I want to use?

No — that is the point of this path. J-Bot's CLI backends exist to reuse coding-agent subscriptions ([Codex, Cursor, Devin and friends](https://www.pgupai.com/guides/cli-subscription-code-review)). `provider: openai-compatible` covers everything else: if the service publishes an OpenAI-compatible base URL and an API key, it can review pull requests with no CLI installed anywhere.

### Why does the model need tool calling?

J-Bot runs an agentic review, not a one-shot prompt: the session lists files, reads context around the diff, greps for callers, and files findings through OpenAI-style tool calls. An endpoint that only does plain chat completions — or a model served without a tool-call parser — cannot drive that loop. Check the endpoint's function-calling documentation for the specific model you plan to pin.

### Can the review reach an endpoint inside our VPN?

Only if the runner can. GitHub-hosted runners have no route into a private network, so an internal LiteLLM proxy or vLLM box needs one of: a self-hosted runner on the same network, a tunnel such as Tailscale or cloudflared joined during the job, or the endpoint exposed behind authentication. The base URL must be absolute http(s) — J-Bot validates it before the session starts.

### Is there a default model for openai-compatible?

No. A generic endpoint has no safe provider-wide default, so `model` is required, in the form `openai-compatible/<endpoint-model-id>`, where the id is exactly what the endpoint serves — check its `/v1/models` list. The credentials are namespaced too: `JBOT_OPENAI_COMPATIBLE_API_KEY` and `JBOT_OPENAI_COMPATIBLE_BASE_URL` never fall back to `OPENAI_API_KEY` or `OPENAI_BASE_URL`.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): The other path: reuse the Codex, Cursor, Devin, Cline, Kilo, Command Code, Grok Build, or Qoder seat you pay for.
- **Guide** — [Kimi K3 code review in GitHub Actions](https://www.pgupai.com/guides/kimi-code-review-github-actions): What day-one model access looks like when the gateway is a native provider.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob — including the openai-compatible worked example.

---

_Markdown representation of [https://www.pgupai.com/guides/openai-compatible-code-review-github-actions](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
