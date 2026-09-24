Engineering notes · Making AI code review faster · Part 2 of 5

# What actually makes AI code review faster?

Published September 24, 2026

Taking work away from the model worked. Adding things to it mostly didn’t. Over five weeks we tried 23 ideas to make J-Bot Review faster. The ones that paid off either removed a whole model session or handed the model code it would otherwise have fetched one turn at a time. Smarter retrieval, caching and asking the model to be efficient either left the clock where it was or cost us bugs the reviewer should have caught.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI. [Part 1](https://www.pgupai.com/guides/why-ai-code-review-is-slow) showed where its time went. Here’s what we tried before context packs, grouped by the idea behind each attempt. Fifteen of the 23 didn’t make it.

**In this article**

- [How we judged each idea](https://www.pgupai.com/guides/ai-code-review-speed-experiments#how-we-judged)
- [Giving the model more evidence](https://www.pgupai.com/guides/ai-code-review-speed-experiments#more-evidence)
- [Making the machinery faster](https://www.pgupai.com/guides/ai-code-review-speed-experiments#faster-machinery)
- [Asking the model to do less](https://www.pgupai.com/guides/ai-code-review-speed-experiments#do-less)
- [Running fewer sessions](https://www.pgupai.com/guides/ai-code-review-speed-experiments#fewer-sessions)
- [Sending less](https://www.pgupai.com/guides/ai-code-review-speed-experiments#send-less)
- [What we kept](https://www.pgupai.com/guides/ai-code-review-speed-experiments#what-we-kept)
- [FAQ](https://www.pgupai.com/guides/ai-code-review-speed-experiments#faq)

## How we judged each idea

Each idea ran against the same pull requests with the change switched on and off, one to five times. We logged wall-clock time, model turns, tool calls, tokens and cost, and we checked whether the review still caught bugs we had planted or that developers had fixed. A faster review that missed bugs didn’t become a default.

Small samples fool you. On one set of pull requests, the exact same code refuted 47% of its findings in one round and 20% in the next. So anything that looked like a win got a rerun before we believed it.

## Giving the model more evidence

If the reviewer spends its time hunting for code, the obvious fix is to hunt for it first. We tried that six ways.

| Idea | What we measured | Outcome |
| --- | --- | --- |
| Rank callers with a hosted relevance model (Jev) and add the best ones | Faster than no evidence in 2 of 5 paired runs on one PR; caught a known bug 1 time in 5, against 0 in 5 without it | Kept as an opt-in preset |
| Collect import links and library-doc summaries before the review | Fewer tool calls, no reliable time saving; with ranking on, the verifier confirmed an unsupported concern in 3 of 3 trials | Rejected |
| Attach related files to every file the model reads | A narrow version cut tool calls 27.7% and turns 13.4%, but confirmed 12 of 15 required bugs against 15 of 15 | Kept as an opt-in preset |
| Give the verifier more surrounding code and callers | Verification took 81.9% longer; wrong confirmations went from 7 to 8 of 27 | Rejected |
| Offer a “fetch context for this line” tool | The model called it 0 times | Rejected and removed |
| Precompute a where-used index for every changed symbol | In simulation it could answer at most 30% of the model’s searches, at 20 to 325 KB per PR | Rejected before building |

None of it made reviews reliably faster. More text in the prompt meant more to read, and extra evidence for the verifier slowed it down without improving its verdicts. The retrieval tool stung the most. We built it and described it in the prompt, and across 36 reviews the model called it zero times. It kept using the plain file reads it already knew.

## Making the machinery faster

Next we went after the plumbing.

| Idea | What we measured | Outcome |
| --- | --- | --- |
| Cache file reads, parsed indexes and model-ranking calls | Setup fell from 501 to 211 ms; review time did not move. In a 323-second review, all tool work added up to 196 ms | Rejected |
| Use each coding agent’s own read and search tools | Fixed a capacity problem: one page instead of seven, prompts 501,783 to 192,290 bytes. Not a speed-up by itself | Shipped for Command Code and Pi |
| Share one prompt cache across all sessions of a run | The gateway reused a prompt prefix only inside one session, so nothing changed | Rejected |

The one that shipped fixed a capacity problem. None of them moved the clock, and a profile of one full review shows why. It took 323 seconds, and every tool call added together took 196 milliseconds. You could make tools free and nobody would notice.

## Asking the model to do less

Then we tried asking nicely.

| Idea | What we measured | Outcome |
| --- | --- | --- |
| Mid-session checkpoints: reassess, reuse evidence, batch reads | Median 22.0 s against 19.9 s without; more tool calls, not fewer | Rejected |
| A nudge to request every known read in one turn | About 1.9 tool calls per turn with and without it | Rejected |
| Tell the model not to look things up | Turns fell about 50%; known issues posted fell to 1 or 2 of 8, against 4 to 6 | Rejected |

The checkpoints and the batching nudge didn’t change what the model did. The blunt instruction did cut turns, by skipping exactly the lookups that find real bugs, so we dropped it.

## Running fewer sessions

A review is several model sessions: the main review, focused lens passes, a guideline check, and verification. Drop a session and all of its turns go with it.

| Idea | What we measured | Outcome |
| --- | --- | --- |
| Check guidelines inside the first lens pass instead of a separate session | 108.1 s to 83.7 s (−22.6%); both known bugs kept | Shipped |
| Reuse finished checks when a follow-up commit only touches docs | 48.6 s to 38.7 s (−20.3%); known bugs 6 of 6 in both arms | Kept as an opt-in preset |
| Hand the verifier the code the reviewer already read | Verification 18.0 s to 8.6 s; input tokens 45,490 to 17,538 | Shipped for Command Code |
| One guideline-compliance session per PR instead of one per page | Uncached input −20%, but it missed the issue that pass normally catches | Rejected |
| Merge the focused lens passes into one | Known issues posted fell to 1 of 4, against 4 of 4 | Rejected |
| Skip the interactions lens when no outside code calls the change | Would drop its checks for contradictions between hunks | Rejected |

This is where the clear wins were, with one condition. The session you drop can’t be doing work nobody else does. The single compliance session and the merged lens pass both failed that test.

## Sending less

Last, we tried shrinking the prompt.

| Idea | What we measured | Outcome |
| --- | --- | --- |
| Batch the diff reads for files too large for the prompt | Tool-output bytes −44.1%, total time flat (+0.6% mean) | Became the default, later replaced |
| Load only the guideline sections mapped to the changed files | Guidelines 24.6 KB to 13.5 KB; review time about the same, 33.4 against 33.8 s | Shipped |
| Ask the model contract questions about the change | 46.9 s against 33.4 s; recall did not improve | Rejected |
| Add code from a companion repository | 69.4 s against 33.4 s; recall did not improve | Rejected |
| Size each context pack to its page’s diff | Helped one slow reasoning model; another explored more, with 10% more turns | Rejected |

Diff batching still bugs us. It cut the bytes the model read by 44.1%, total time didn’t move, and it was the default for a while anyway.

## What we kept

The ideas that worked all removed turns the model would otherwise take one after another, and none of them told the model what not to do. Handing the verifier the code the reviewer had already read cut verification time roughly in half. Folding the guideline check into another pass removed a session outright.

Context packs do the same thing for the main review. They hand it the code it predictably looks up before the first turn and leave it free to go looking for more. [Part 3](https://www.pgupai.com/guides/context-pack-ai-code-review) explains how.

The numbers here come from the audit reports in J-Bot Review’s open-source repository, summarized in the [experiment-presets audit](https://github.com/pgup-ai/jbot-review/blob/main/docs/audits/2026-09-19-experiment-presets.md), and from the [context-pack pull request](https://github.com/pgup-ai/jbot-review/pull/241).

## FAQ

### What is the most effective way to speed up an AI code reviewer?

Pick a fast model route first. After that, remove work the model does in sequence: whole sessions it doesn’t need, and lookups you can hand it up front. In our tests, removing one session cut review time 22.6%, and handing the verifier code the reviewer had already read cut verification from 18.0 to 8.6 seconds.

### Does caching make AI code review faster?

Barely, in our tests. Caching cut setup from 501 to 211 milliseconds, but in a 323-second review all tool work added up to 196 milliseconds. Almost all the time went to the model generating its next step.

### Should you tell an AI code reviewer to make fewer tool calls?

We wouldn’t. Telling the model not to look things up cut its turns by about half, but reviews then posted 1 or 2 of 8 known issues instead of 4 to 6. A nudge to batch reads left calls per turn unchanged at about 1.9.

### Why not give the reviewer a search tool for context?

We did. A tool that returned definitions and callers for a given line was called 0 times across 36 reviews, so we removed it. The models kept using the file-reading and search tools they already knew.

**Series: Making AI code review faster**

1. [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow)
2. What we tried before context packs
3. [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review)
4. [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines)
5. [The results](https://www.pgupai.com/guides/faster-ai-code-review-results)

## Related

- **Part 1** — [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow): Where the time went, and how we measured it.
- **Part 3** — [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review): What goes in a pack and the details that made it work.
- **Source** — [The experiment-presets audit](https://github.com/pgup-ai/jbot-review/blob/main/docs/audits/2026-09-19-experiment-presets.md): Method, samples, and raw numbers behind the retrieval and caching experiments.

---

_Markdown representation of [https://www.pgupai.com/guides/ai-code-review-speed-experiments](https://www.pgupai.com/guides/ai-code-review-speed-experiments). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
