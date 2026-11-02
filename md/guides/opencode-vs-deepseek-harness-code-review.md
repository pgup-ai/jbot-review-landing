Engineering notes · Experiment

# We swapped opencode for DeepSeek Harness on DeepSeek models. Here’s what we measured.

By [PGUP AI](https://www.pgupai.com/about) · Published November 1, 2026

J-Bot Review runs its AI code review sessions on the opencode server. We ran the same reviews on DeepSeek Harness (dsh), DeepSeek’s own agent runtime, with the same DeepSeek V4.1 Flash model. dsh found about twice as many known issues at about the same cost, but its main review sessions were slower, and its “read-only” sandbox turned out to leave secrets readable.

## Key results

- **Recall:** on two internal pull requests with 12 known issues, dsh found 5 to 6 per screen against opencode’s 3, with the same jbot code on both sides.
- **Speed:** dsh main review sessions took 15 to 29% longer with PTC tool calling. Native tool mode was as slow or slower.
- **Cost:** about the same per pull request, roughly $0.06 to $0.12.
- **Model scope:** the gain showed up only on DeepSeek. MiMo V2.6 Flash and Muse found no more issues on dsh, so only opencode and opencode-go DeepSeek models run on it.
- **Security:** dsh’s read-only mode blocks writes, not reads or network access. We accept that only for repositories whose pull request authors are trusted.

**In this article**

- [What we compared](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#setup)
- [The first screen, and what was wrong with it](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#first-screen)
- [Rerunning it properly](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#rerun)
- [PTC versus native tool calls](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#ptc)
- [What the read-only sandbox doesn’t cover](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#sandbox)
- [What we shipped](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#shipping)
- [Limits of this test](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#limits)
- [FAQ](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#faq)

## What we compared

An agent harness is the loop around the model: the tools it can call, how results come back, how sessions start and stop. J-Bot Review normally drives the [opencode](https://opencode.ai) server, which hands the model read, grep and a short allowlist of shell commands. [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) runs headless as one child process per review session, with its own tools and an OS sandbox (Landlock or bwrap on Linux, Seatbelt on macOS).

Both harnesses called the same model through the same route: DeepSeek V4.1 Flash on OpenCode Go, at low reasoning effort, which is what our production reviews use. Prompts, the diff, guidelines and the finding pipeline were jbot’s in both cases. Only the harness changed.

The test set is two internal pull requests from one production repository, labelled A and B here. Their developers and earlier reviews had identified 7 and 5 issues respectively, 12 in total. A finding counts when it names the right file and the same concern. We ran one review per pull request per arm, with verification off so the counts reflect what the reviewer raised.

## The first screen, and what was wrong with it

Our first attempt, in September, looked like a clear win for recall and a clear loss for speed.

Scroll the table horizontally to see every column.

| Arm | Known issues found | Minutes, A / B |
| --- | --- | --- |
| opencode | 3 of 12 | 6.3 / 6.9 |
| dsh | 6 of 12 | 10.5 / 11.8 |
| dsh with subagents | 4 of 12 | 9.1 / 5.7 |

Two things made it hard to trust. That screen ran at high reasoning effort, not the low effort production uses, and higher effort alone makes DeepSeek slower. dsh also used 2 to 2.7 times opencode’s tokens. On two other models, MiMo V2.6 Flash and Muse, dsh found nothing extra and wasn’t faster, so we dropped it.

## Rerunning it properly

A month later DeepSeek Harness had shipped nine prereleases, so we ran it again with the confounders removed: production effort, a trimmed headless profile with web, skills, plan mode and other unused services turned off, and PTC tool calling. When dsh still won, we reran opencode on the exact same jbot code, so the harness was the only difference.

Scroll the table horizontally to see every column.

| Arm | A found | B found | Total | Main session, A / B |
| --- | --- | --- | --- | --- |
| opencode | 2 of 7 | 1 of 5 | 3 of 12 | 298 s / 172 s |
| dsh, PTC | 3 of 7 | 2 of 5 | 5 of 12 | 343 s / 221 s |
| dsh, native tools | 4 of 7 | 2 of 5 | 6 of 12 | 344 s / 352 s |

opencode scored the same 3 of 12 it had two weeks earlier on newer code, so the gain isn’t a code difference. Across four dsh screens it found 6, 6, 5 and 6 known issues against opencode’s 3, 4, 3 and 3. The PTC run caught a priority-1 bug that opencode found only at medium effort. The native run missed that one but caught two other real bugs.

The slowdown also shrank. At high effort dsh took 1.5 to 2 times as long; at low effort, main sessions took 15 to 29% longer. Most of the original gap was the effort setting, not the harness.

Subagents never helped. Across every session in the rerun, the model didn’t call one, so they’re off.

## PTC versus native tool calls

In PTC mode the model sees one tool, `run_code`, and writes a short TypeScript program that calls the other tools through a generated SDK. The pitch is batching: several reads in one turn instead of one per turn.

DeepSeek mostly didn’t batch. Each program made about 1.0 to 1.6 tool calls on average, and usually a single shell command. Even so, PTC sessions made 2 to 3 times fewer tool calls than native mode. On pull request B the native main session ran 69 shell commands; the PTC one ran 25 programs. We expected native mode to be faster because each `run_code` starts a fresh sandboxed Node process. It wasn’t, so we kept PTC.

## What the read-only sandbox doesn’t cover

We checked the sandbox before trusting it. Writes are blocked: a test session’s attempts to create a file through Node and through bash both failed with “operation not permitted”. The environment inside `run_code` was empty, so the provider key wasn’t sitting in the tool’s own environment.

An automated security review then pointed out what “read-only” leaves open. dsh’s sandbox modes govern file effects only. Reads outside the repository and network access are allowed. On Linux a process can read other same-user processes’ environments from `/proc`, and on macOS through `ps`. The jbot process above dsh holds the Action’s inputs, including the GitHub token and provider keys. A prompt injection in a reviewed pull request could therefore try to read those and send them out.

We didn’t confirm this live. The model refused one probe as credential harvesting, and our own tooling blocked another as exfiltration. We couldn’t restrict reads or block the network from jbot’s side, and filtering shell commands doesn’t help when a `run_code` program can read files directly. opencode is safer here because jbot only allows a short list of shell commands.

So the risk is documented and opt-out. Repositories that review pull requests from untrusted authors should set `sdk-engine: opencode`.

## What we shipped

- **DeepSeek only.** Catalogued `opencode/` and `opencode-go/` DeepSeek models run on dsh, except `-free` ones. Every other model stays on opencode.
- **PTC and a trimmed profile.** Web, skills, subagents, goals, plan mode, MCP and instruction files are off.
- **Automatic fallback.** Without a dsh binary, a working sandbox or a passing startup check, the review runs on opencode and logs why. `sdk-engine: opencode` turns dsh off entirely.
- **A smaller image.** The full dsh install is about 850 MB. Removing packages its headless profile never loads, and linking 49 identical copies of one dependency, brought it to about 140 MB. The image’s smoke test starts dsh under the real review profile, so a bad prune fails the build.
- **Estimated cost.** dsh doesn’t report spend, so jbot prices each session from its model catalog’s list rates. That mattered more than expected: we bumped opencode to 2.2.5 in the same change, and since 2.2.0 opencode records the provider-reported cost, which is $0 for OpenCode Go’s subscription models.

We skipped our full review-quality benchmark for this change and said so in the pull request. The evidence is the screens above.

## Limits of this test

- Two pull requests from one repository, one run per arm per screen. Identical runs of the same configuration vary by about ±30% in time, and recall moves by a couple of issues.
- Known issues come from developers and earlier reviews, so a finding outside that list isn’t counted even when it’s real.
- One model route: DeepSeek V4.1 Flash on OpenCode Go. Two other models showed no gain, and others weren’t tested.
- dsh has no stable release yet, so we pin an exact prerelease, 0.2.1-rc.5.
- We confirmed the sandbox on macOS; on Linux, dsh passed its sandbox check on GitHub-hosted runners. Other CI providers are untested.

For how we measure review quality, read [how to evaluate AI code review](https://www.pgupai.com/guides/evaluate-ai-code-review). For other DeepSeek experiments, read [the DeepSeek optimization case study](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization).

## FAQ

### What is DeepSeek Harness (dsh)?

DeepSeek Harness is DeepSeek’s open-source agent runtime. It runs a model in a loop with tools such as shell, file search and subagents, under an OS sandbox, and has a headless mode for one-shot jobs. J-Bot Review uses that headless mode as an alternative to the opencode server for DeepSeek models.

### Is DeepSeek Harness better than opencode for AI code review?

For DeepSeek models in our tests, it found more known issues: 5 to 6 of 12 against opencode’s 3, across four screens on two pull requests with the same jbot code. Main review sessions were 15 to 29% slower at about the same cost. On MiMo V2.6 Flash and Muse it found no more issues, so we only route DeepSeek models to it.

### What is PTC tool calling in DeepSeek Harness?

PTC (programmatic tool calling) shows the model a single run_code tool. The model writes a short TypeScript program that calls the other tools through a generated SDK. In our runs, PTC sessions made 2 to 3 times fewer tool calls than native tool mode, even though each program usually made only one or two calls.

### Is DeepSeek Harness’s read-only sandbox safe for reviewing untrusted pull requests?

Not on its own. Its read-only mode blocks file writes, but reads outside the repository and network access stay open. A prompt injection in a reviewed pull request could make a session read secrets visible to the runner’s user, such as process environments holding a GitHub token, and send them out. We accept that only for repositories whose pull request authors are trusted.

### Why does OpenCode report $0 cost for OpenCode Go models?

Since OpenCode 2.2.0, sessions record the cost the provider reports. OpenCode Go is a subscription, so it reports $0. OpenCode 2.1.4 and earlier logged a list-price estimate. J-Bot now estimates DeepSeek Harness costs from its model catalog’s list prices instead.

---

_Markdown representation of [https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
