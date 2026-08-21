ACP gateway · private beta

# Run pull-request reviews with a coding agent on your machine

Published July 27, 2026

**J-Bot Review can route a GitHub Actions review through a companion running Codex, Cursor, Devin, or Kilo on a machine you control.** The agent’s provider credential stays on that machine; GitHub Actions stores gateway routing credentials instead. Review prompts and transcripts pass through—and are journaled by—the gateway you operate.

> **Private-beta boundary**
>
> This is an advanced, self-managed route, not the default Marketplace setup. Today it is for operators comfortable running the J-Bot gateway and companion from source. The standard Action remains the one-workflow, no-server path.

## How the ACP gateway route works

GitHub Actions still starts the review and posts the result. Instead of launching the coding agent in the Action container, it drives an Agent Client Protocol (ACP) session through a gateway to your companion. ACP is the agent interface; J-Bot’s authentication, endpoint routing, journaling, and companion process are the transport around it.

GitHub Actions sends a review through a user-operated gateway to a companion, which runs the coding agent against its model provider

The repository itself is not stored by the gateway. For a routed review, the companion makes a temporary clone of the committed pull-request ref, runs the agent there, and removes the workspace when the session ends.

## What ACP does—and what J-Bot adds

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/get-started/introduction) standardizes communication between a client and a coding agent: session setup, prompts, streaming updates, tool calls, and permission requests. It is the agent interface, not J-Bot’s deployment or security boundary.

J-Bot adds the gateway route around that interface: authenticating the Action and companion, selecting an endpoint, journaling ACP frames, managing the companion session, cloning the pull-request ref, and enforcing a read-only review policy.

## Standard Action vs. local-agent route

| Question | Standard Action | Local-agent route |
| --- | --- | --- |
| Where the agent runs | GitHub Actions runner | Your companion machine |
| Provider credential | GitHub repository secret | Companion machine only |
| J-Bot server | None | Your gateway relays the session |
| Repository checkout | Runner | Runner plus a temporary companion clone |
| Best fit | Fastest installation; no service to operate | Keep agent credentials out of CI; use a companion you control |

The homepage’s “zero servers” and “checkout stays on your runner” claims describe the standard Action. Choosing the companion route changes that topology deliberately.

## Where credentials and review data live

| Location | Credentials | Code and review data |
| --- | --- | --- |
| GitHub Actions | GitHub token; gateway URL, client token, and endpoint id | Runner checkout, pull-request context, prompt and diff sent to the gateway |
| Gateway | Client bearer token and separate companion endpoint tokens | Relays and journals ACP frames: prompts, diffs, reasoning, tool activity, permission decisions, and findings |
| Companion | Agent/provider credential; endpoint token; Git credentials for private repositories | Temporary repository clone and the running agent process |
| Agent provider | Used by the agent on the companion | Receives the model context the coding agent normally sends |

> **Not credentialless**
>
> **The agent’s provider credential does not enter GitHub Actions or the gateway.** Routing credentials still exist, and a private-repository clone requires Git authentication on the companion.

## Supported agents in the private beta

| Agent | Authentication on the companion | Current note |
| --- | --- | --- |
| Codex | Local `~/.codex` authentication | Uses the companion’s Codex setup |
| Cursor | `CURSOR_API_KEY` on the companion | The key stays off the runner, but Cursor does not use ambient login here |
| Devin | Local Devin credentials | Uses the companion’s existing Devin authentication |
| Kilo | Local Kilo auth file | Default companion agent when none is specified |

Cline, Command Code, Grok Build, Qoder, and model-API providers remain available through the standard Action path; setting gateway variables does not route them to the companion.

## Security boundaries

- **Provider authentication stays on the companion.** It is loaded into the agent process locally and is not sent as an ACP frame.
- **Write requests have a deny floor.** The companion answers agent permission requests using J-Bot’s read-only review policy; the remote client cannot grant a write.
- **The companion connects outbound.** It attaches to the configured gateway endpoint, so the companion itself does not need an inbound public port.
- **Private repositories need a second Git trust decision.** The companion clones the pull-request ref using its own ambient Git authentication.
- **The gateway is sensitive infrastructure.** Its journal contains prompt, diff, reasoning, and tool-output content. Files are permission-restricted, but automatic retention and pruning are not part of the beta.
- **The provider still receives model context.** “Local agent” describes where the agent process and credential live; it does not imply a local model or an offline review.

## What an operator runs

1. **A gateway behind TLS.** The current server is a single Node process with filesystem journals. It can run behind Caddy, cloudflared, or another reverse proxy.
2. **A companion on the agent machine.** It advertises the agents it can serve, enforces a session limit, and maintains an outbound connection to its endpoint.
3. **A thin-client review workflow.** The workflow supplies the gateway URL and client token, selects an endpoint, and identifies the repository, head ref, and base commit for the companion clone.

The implementation README carries the current environment variables and source-run commands. Because packaging is still being hardened, treat that document—not copied snippets on third-party sites—as the source of truth: [ACP gateway setup in the J-Bot repository →](https://github.com/pgup-ai/jbot-review#acp-gateway)

## Current limits

- **Source-managed installation.** There is not yet a standalone companion installer or a general Marketplace setup flow.
- **Operator-managed trust boundary.** This is not a hosted signup or multi-tenant gateway service.
- **Manual retention.** Journals remain on disk until the operator removes them; set an operational deletion policy appropriate for the repository.
- **Committed code only.** The companion reviews the supplied repository ref, not uncommitted files on the runner.
- **Companion availability matters.** The selected endpoint must be online, offer the requested agent, and have a free session slot.
- **Four remote agents today.** Only Codex, Cursor, Devin, and Kilo use this route.

## When to choose this route

- Your security policy avoids placing long-lived provider or agent credentials in CI.
- You already operate a trusted machine with the coding agent configured.
- You want the companion’s read-only enforcement and a journal you can inspect on infrastructure you control.
- You accept operating the gateway, companion availability, Git access, and journal retention.

If the simplest reliable setup matters more, use the [standard GitHub Action](https://www.pgupai.com/#setup). It remains the default path: one workflow, no J-Bot server, and the checkout stays on the runner.

## FAQ

### Does local-agent routing require no credentials?

No. It keeps the agent’s provider credential on the companion instead of putting it in GitHub Actions or the gateway. The workflow still needs gateway routing credentials, the companion needs its endpoint credential, and private repositories require Git access on the companion.

### Does the repository stay only on the GitHub Actions runner?

No. The standard Action path keeps the checkout on the runner, but a companion-routed review creates a temporary clone on the companion so the local agent can inspect the committed ref. The gateway does not clone the repository.

### What does the gateway retain?

The gateway journals ACP session frames, including review prompts, diffs, agent reasoning, tool activity, permission decisions, and findings. Credentials are materialized on the companion and do not cross the ACP session. Automatic retention and pruning are not part of the private beta, so operators must manage the journal directory.

### Which coding agents can use the ACP gateway?

The private-beta route supports Codex, Cursor, Devin, and Kilo. Other J-Bot providers continue to run through the standard Action path and ignore the ACP gateway settings.

## Related documentation

- **Standard path** — [CLI subscription review](https://www.pgupai.com/guides/cli-subscription-code-review): Put the CLI credential in Actions and run the whole review on the runner.
- **Implementation** — [ACP gateway README](https://github.com/pgup-ai/jbot-review#acp-gateway): Current environment variables, commands, and verification steps.
- **Protocol** — [Agent Client Protocol](https://agentclientprotocol.com/get-started/introduction): The standard client-agent interface behind the routed review session.
- **Output** — [See a real J-Bot review](https://www.pgupai.com/#proof): Verified, diff-anchored findings on a live pull request.

---

_Markdown representation of [https://www.pgupai.com/guides/local-agent-code-review](https://www.pgupai.com/guides/local-agent-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
