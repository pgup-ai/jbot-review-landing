Engineering notes · OpenCode 2.0.5

# OpenCode V2 migration: lessons from an AI code reviewer

Published September 18, 2026

During our OpenCode V2 migration, a review’s reported token usage was about 100× too low. The review still returned findings. We were reading usage from the final assistant message, while V2 recorded a separate assistant message for each step.

We moved J-Bot Review, our open-source PR reviewer, to `@opencode/client` and `@opencode/cli` 2.0.5. It runs in GitHub Actions with a model you choose. This article covers its OpenCode backend; other backends have their own runtimes.

The migration changed how we load plugins, isolate the model’s shell, and finish a review. These observations are specific to 2.0.5.

**In this article**

- [Choosing the V2 packages](https://www.pgupai.com/guides/opencode-v2-migration#packages)
- [Keeping repository plugins and credentials out](https://www.pgupai.com/guides/opencode-v2-migration#isolation)
- [Waiting for a review and recovering at timeout](https://www.pgupai.com/guides/opencode-v2-migration#sessions)
- [Counting the whole turn](https://www.pgupai.com/guides/opencode-v2-migration#usage)
- [What we verified](https://www.pgupai.com/guides/opencode-v2-migration#validation)

## The package named “SDK” wasn’t the one we needed

Our V1 integration used `@opencode-ai/sdk` to start an OpenCode child process and talk to it over HTTP. In V2, the similarly named `@opencode/sdk` embeds the server in the calling process. We wanted to keep the child-process boundary.

| Package | Role in our migration |
| --- | --- |
| `@opencode-ai/sdk` | The V1 client and process-spawning helper we replaced. |
| `@opencode/client` | The V2 network client we adopted. |
| `@opencode/cli` | The V2 binary we spawn with `opencode serve`. |
| `@opencode/sdk` | The in-process host; outside the architecture we chose. |

We chose V2 for its session controls and server authentication. Several endpoints we needed were still experimental, and adopting them meant rewriting the session driver and plugin.

The new launcher starts a server on a loopback address with an OS-assigned port, reads its URL and generated password from the startup banner, and authenticates the client. A listening port isn’t enough for readiness: we also wait for the selected models to appear and for J-Bot’s plugin to report itself active. A review must not start with its enforcement plugin missing.

## Repository plugins load before the first model tool call

A PR reviewer reads code it hasn’t approved. Letting that checkout supply a startup plugin would let the repository execute code before the model’s tool permissions could help.

We kept project configuration disabled with `OPENCODE_DISABLE_PROJECT_CONFIG`. We also gave the server a J-Bot-owned `XDG_CONFIG_HOME` containing only our plugin, plus a data directory for each run. The operator’s global plugins and configuration stay out too.

The [integration test](https://github.com/pgup-ai/jbot-review/blob/770719210307238ce71abb2d3982c42d478e2a23/test/opencode-hermetic-config.test.ts) plants plugins in both the reviewed repository and an ambient global config directory. Each would write a marker file if loaded. With the real V2 binary, neither marker appears, J-Bot’s plugin is active, and an unauthenticated server request gets a 401.

Credentials need a separate check. The server needs provider keys to call a model; the shell tool doesn’t. We use `session.environment` to replace the shell’s inherited environment with an explicit allowlist. In the migration probes, the seeded environment-leak count was zero on both the free Zen route and the paid DeepSeek route we tested. That checks this path, not every possible way a secret could be exposed.

We also denied subagents. A child session could otherwise escape the parent session’s environment allowlist.

### Porting the read-only rules

V1’s per-prompt tool switches didn’t carry over. We moved to ordered permission rules on configuration and session creation, then used a V2 `context` hook to remove write, edit, patch, and delegation tools from model requests. Shell commands remain subject to the shell policy.

OpenCode’s [plugin migration documentation](https://opencode.ai/v2/docs/build/plugins/migrate-v1) explains the new registration model. Our [plugin implementation](https://github.com/pgup-ai/jbot-review/blob/770719210307238ce71abb2d3982c42d478e2a23/src/shared/opencode-plugin.ts) shows the additional restrictions for a reviewer. Those restrictions have to survive the migration in code; a read-only instruction in the prompt can’t substitute for them.

## A waiting HTTP request has its own deadline

V2 gave us `session.wait`, but a long-running review can outlast the HTTP client’s header timeout. We wait in slices of at most 240 seconds, below the 300-second Undici limit our driver accounts for, while keeping one deadline for the whole turn. A completed wait is followed by a check for the completed assistant message.

The timeout recovery path took more care. We already had a way to interrupt a review near its deadline and ask for the findings it had collected. On V2, that means interrupting the session, switching it to our `jbot-wrapup` agent, and requesting the final JSON in the same session.

The plugin removes every tool for that agent. Without that step, a request to finish could trigger another round of repository exploration. If the wrap-up misses its deadline or returns unusable output, the pass still fails.

Recovered findings carry a partial-coverage notice. The interrupted session’s result isn’t cached as a completed shard. Readers need to know when a review was cut short, even if it found something useful.

Our own review of the migration caught a bug here: wrap-up eligibility depended on a recorded outcome that some auxiliary sessions didn’t have. Those sessions could never wrap up. We changed the check to follow the session’s current agent. The [session driver](https://github.com/pgup-ai/jbot-review/blob/770719210307238ce71abb2d3982c42d478e2a23/src/shared/opencode-session.ts) contains the wait loop, agent switch, and deadline handling.

## The final answer didn’t contain the whole bill

The final assistant message gave us the findings text, but its token counters left out the earlier steps. We now collect the turn’s assistant messages and add their input, output, reasoning, cache, and cost fields. If the listing is incomplete, the log says usage is under-counted.

This is easy to miss in a smoke test that only asks whether valid JSON came back. Include a multi-step tool session when checking your own accounting.

### Checking that reasoning settings reached the provider

In our 2.0.5 probes, model settings and variants placed in config didn’t apply to catalog models as expected. We passed options per session through a file that the plugin reads, then applied them to the model request in the `context` hook.

To check the path, we deliberately sent an invalid reasoning-effort value to DeepSeek. The provider rejected that exact value. That gave us evidence it reached the provider; inspecting our own configuration object wouldn’t have established that.

## What we verified

We tested with the real V2 server and ran the reviewer against its own migration. That caught the broken wrap-up path described above, a lost reasoning-effort setting, and a temporary directory left behind after failed startup.

These checks gave us confidence in the integration. They don’t show that V2 finds more bugs or reviews code faster. Our small evaluation still produced false positives, and we didn’t run a broader comparison before the migration shipped. If you migrate, check your reviewer’s output on familiar code as well as testing its session lifecycle.

## Before you migrate

Start with a session that uses tools. Check which process owns credentials, plant a plugin in the checkout to test isolation, force a timeout, and reconcile usage across the turn. A successful final response won’t expose those failures for you.

## Related

- **Guide** — [Any OpenAI-compatible API](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions): Connect your own gateway or model server to J-Bot Review.
- **Architecture** — [Local-agent PR review](https://www.pgupai.com/guides/local-agent-code-review): Run a coding agent on a companion machine and see where credentials and code go.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Add the reviewer to your repository with the current workflow and key inputs.

---

_Markdown representation of [https://www.pgupai.com/guides/opencode-v2-migration](https://www.pgupai.com/guides/opencode-v2-migration). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
