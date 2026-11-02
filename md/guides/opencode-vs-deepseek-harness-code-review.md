Engineering notes · Experiment

# We swapped opencode for DeepSeek Harness on DeepSeek models. Here's what we measured.

By [PGUP AI](https://www.pgupai.com/about) · Published November 1, 2026

J-Bot Review runs its code review sessions on the opencode server. We swapped in DeepSeek Harness (dsh), DeepSeek's own agent runtime, and kept everything else fixed, including the model. On DeepSeek V4.1 Flash, dsh found about twice as many known issues for the same money. It was also slower, and its read-only sandbox left more open than the name suggests.

## Key results

- dsh found 5 or 6 of 12 known issues per screen on two internal pull requests. opencode found 3 or 4. Both ran the same jbot code.
- With PTC tool calling, dsh main review sessions took 15 to 29% longer than opencode. Native tool mode found one more issue than PTC but was slower, up to about twice opencode's time.
- Cost per pull request was about the same, roughly $0.06 to $0.12. Both figures are estimates at DeepSeek V4.1 Flash list prices. The opencode runs used a version that still logged list-price cost, and jbot prices dsh sessions at the same rates. OpenCode Go itself bills by subscription.
- Two other models, MiMo V2.6 Flash and Muse, found nothing extra on dsh. We only route DeepSeek models to it.
- dsh's read-only mode blocks writes. Reads and network access stay open, so we only use it on repositories with trusted pull request authors.

**In this article**

- [The setup](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#setup)
- [A first screen we didn't trust](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#first-screen)
- [The rerun](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#rerun)
- [PTC versus native tool calls](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#ptc)
- [What read-only means in dsh](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#sandbox)
- [What we shipped](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#shipping)
- [Limits](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#limits)
- [FAQ](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review#faq)

## The setup

An agent harness is the code that runs the model's loop. It decides which tools the model sees, how tool results come back, and when a session ends. J-Bot normally drives the [opencode](https://opencode.ai) server, which gives the model read, grep and a short allowlist of shell commands. [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) runs headless, one child process per review session, with its own tools and an OS sandbox. On Linux the sandbox is Landlock or bwrap. On macOS it is Seatbelt.

Both harnesses called DeepSeek V4.1 Flash through OpenCode Go at low reasoning effort, the setting our production reviews use. Prompts, the diff, the guidelines and the finding pipeline came from jbot in both cases. The harness was the only thing we changed.

We tested on two internal pull requests from one production repository, called A and B here. Developers and earlier reviews had identified 7 issues in A and 5 in B. A finding counts if it names the right file and the same problem. Each arm got one review per pull request, with verification off so the counts show what the reviewer raised.

## A first screen we didn't trust

Our first try, in September, said dsh doubled recall and took about 1.7 times as long.

Scroll the table horizontally to see every column.

| Arm | Known issues found | Minutes, A / B |
| --- | --- | --- |
| opencode | 3 of 12 | 6.3 / 6.9 |
| dsh | 6 of 12 | 10.5 / 11.8 |
| dsh with subagents | 4 of 12 | 9.1 / 5.7 |

That screen had a problem. It ran at high reasoning effort, and production runs at low. Higher effort makes DeepSeek slower on its own, so we couldn't tell how much of the slowdown was dsh. dsh also used 2 to 2.7 times opencode's tokens. On MiMo V2.6 Flash and Muse it found nothing extra and wasn't faster. We dropped the idea.

## The rerun

A month later DeepSeek Harness had shipped nine prereleases, so we tried again. This time we used production effort. We turned off the dsh features a one-shot review never uses, including web access, skills and plan mode. We also turned on PTC tool calling. When dsh still came out ahead, we reran opencode on the exact same jbot commit to rule out code changes.

Scroll the table horizontally to see every column.

| Arm | A found | B found | Total | Main session, A / B |
| --- | --- | --- | --- | --- |
| opencode | 2 of 7 | 1 of 5 | 3 of 12 | 298 s / 172 s |
| dsh, PTC | 3 of 7 | 2 of 5 | 5 of 12 | 343 s / 221 s |
| dsh, native tools | 4 of 7 | 2 of 5 | 6 of 12 | 344 s / 352 s |

opencode found 3 of 12, the same as on newer code two weeks earlier. The gap comes from the harness. Over four screens dsh found 6, 6, 5 and 6 known issues. opencode found 3, 4, 3 and 3. The PTC run caught a priority-1 bug that opencode only finds at medium effort. The native run missed it and caught two other real bugs instead.

The slowdown shrank too. At high effort dsh took about 1.7 times as long. At low effort its PTC main sessions took 15 to 29% longer. Native mode took up to about twice as long on pull request B, 352 seconds against 172. Most of the original gap was the effort setting.

We also tried subagents. The model never called one in any session, so we turned them off.

## PTC versus native tool calls

In PTC mode the model sees a single tool, `run_code`. It writes a short TypeScript program that calls the other tools through a generated SDK. The idea is that one program can do several reads in a single turn.

DeepSeek mostly didn't do that. Programs averaged 1.0 to 1.6 tool calls, usually one shell command. PTC sessions still made 2 to 3 times fewer tool calls than native ones. On pull request B, the native main session ran 69 shell commands and the PTC session ran 25 programs. We expected native mode to win on speed, since every `run_code` starts a new sandboxed Node process. It didn't, so we kept PTC.

## What read-only means in dsh

We tested the sandbox before relying on it. A session tried to create a file through Node and through bash, and both attempts failed with "operation not permitted". The environment inside `run_code` was empty, so the provider key wasn't in the tool's own environment.

An automated security review then found the gap. dsh's sandbox modes control file writes. They don't limit reads outside the repository, and they don't block the network. On Linux any process can read the environment of other processes owned by the same user through `/proc`. On macOS, `ps` shows the same thing. The jbot process that starts dsh holds the Action's inputs, including the GitHub token and provider keys. A prompt injection in a reviewed pull request could try to read them and send them out.

We didn't confirm this end to end. The model refused our first probe as credential harvesting, and our own tooling blocked the second as data exfiltration. From jbot's side we couldn't restrict reads or block the network. Filtering shell commands wouldn't help either, because a `run_code` program can read files directly. opencode avoids the problem because jbot lets its sessions run only a short list of shell commands.

We documented the risk and made it easy to opt out. Repositories that review pull requests from people they don't trust should set `sdk-engine: opencode`.

## What we shipped

- **DeepSeek only.** Catalogued `opencode/` and `opencode-go/` DeepSeek models run on dsh by default, except `-free` ones. Every other model stays on opencode. The default suits repositories whose pull request authors you trust. If yours reviews pull requests from outside contributors, set `sdk-engine: opencode`.
- **PTC with a trimmed profile.** Web access, skills, subagents, goals, plan mode, MCP and instruction files are off.
- **Automatic fallback.** If the dsh binary is missing, the sandbox doesn't work or the startup check fails, the review runs on opencode and logs the reason. `sdk-engine: opencode` turns dsh off.
- **A smaller image.** A full dsh install is about 850 MB. We removed packages the headless profile never loads and replaced 49 identical copies of one dependency with links, which brought it to about 140 MB. The image smoke test starts dsh under the real review profile, so a bad prune fails the build.
- **Estimated cost.** dsh doesn't report spend, so jbot prices each session from the model catalog's list rates. We needed that sooner than expected. The same change moved opencode to 2.2.5, and since 2.2.0 opencode logs the cost the provider reports, which is $0 for OpenCode Go subscription models.

We skipped our full review-quality benchmark for this change and said so in the pull request. The screens above are the evidence.

## Limits

- This is two pull requests from one repository, with one run per arm per screen. Repeat runs of one configuration vary by about 30% in time and by a couple of issues in recall.
- Known issues come from developers and earlier reviews. A real finding outside that list doesn't count.
- We tested one model route, DeepSeek V4.1 Flash on OpenCode Go. Two other models showed no gain, and we haven't tried the rest.
- dsh has no stable release yet. We pin the prerelease 0.2.1-rc.5.
- We confirmed the sandbox on macOS. On Linux, dsh passed its sandbox check on GitHub-hosted runners. We haven't tried other CI providers.

For how we measure review quality, see [how to evaluate AI code review](https://www.pgupai.com/guides/evaluate-ai-code-review). For our other DeepSeek experiments, see [the DeepSeek optimization case study](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization).

## FAQ

### What is DeepSeek Harness (dsh)?

DeepSeek Harness is DeepSeek's open-source agent runtime. It runs a model in a tool-calling loop with shell, file search and subagent tools, inside an OS sandbox. Its headless mode runs one task per process. J-Bot Review uses that mode in place of the opencode server for DeepSeek models.

### Is DeepSeek Harness better than opencode for AI code review?

For DeepSeek V4.1 Flash in our tests, it found more known issues. Across four screens on two pull requests it found 5 or 6 of 12, and opencode found 3 or 4. Cost was about the same. With PTC tool calls, main review sessions took 15 to 29% longer. Native tool mode was slower, up to about twice opencode's time. MiMo V2.6 Flash and Muse found nothing extra on it, so we only route DeepSeek models to dsh.

### What is PTC tool calling in DeepSeek Harness?

PTC stands for programmatic tool calling. The model sees one tool, run_code, and writes a short TypeScript program that calls the other tools through a generated SDK. In our runs PTC sessions made 2 to 3 times fewer tool calls than native tool mode, even though most programs made only one or two calls.

### Is DeepSeek Harness's read-only sandbox safe for reviewing untrusted pull requests?

Not by itself. Its read-only mode blocks file writes. It does not block reads outside the repository or network access. A prompt injection in a reviewed pull request could make a session read secrets the runner's user can see, such as a process environment holding a GitHub token, and send them somewhere. We accept that only for repositories whose pull request authors we trust.

### Why does OpenCode report $0 cost for OpenCode Go models?

Starting with OpenCode 2.2.0, sessions record the cost the provider reports. OpenCode Go is a subscription, so the provider reports $0. Version 2.1.4 and earlier logged an estimate at list price. J-Bot now estimates DeepSeek Harness costs from its own model catalog's list prices.

---

_Markdown representation of [https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review](https://www.pgupai.com/guides/opencode-vs-deepseek-harness-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
