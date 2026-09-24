Engineering notes · Making AI code review faster · Part 3 of 5

# What is a context pack in AI code review?

Published September 24, 2026

A context pack is a bundle of code that J-Bot Review puts in front of its AI reviewer before the review starts. It holds the code around each change, the definitions the change relies on, the places that call the changed code, related changes elsewhere in the pull request, and a map of the folders. The reviewer used to fetch each of these itself, one request at a time. Now it starts with them.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you choose. Context packs became its default on September 23, 2026, after a month of experiments. This article covers what goes in a pack and the four details that made it work.

**In this article**

- [A briefing packet instead of a scavenger hunt](https://www.pgupai.com/guides/context-pack-ai-code-review#analogy)
- [What goes in a pack](https://www.pgupai.com/guides/context-pack-ai-code-review#whats-in-a-pack)
- [Four details that made it work](https://www.pgupai.com/guides/context-pack-ai-code-review#what-made-it-work)
- [The same idea in the checks after the review](https://www.pgupai.com/guides/context-pack-ai-code-review#other-passes)
- [Where a pack does not help](https://www.pgupai.com/guides/context-pack-ai-code-review#limits)
- [FAQ](https://www.pgupai.com/guides/context-pack-ai-code-review#faq)

## A briefing packet instead of a scavenger hunt

Picture asking a colleague to review a change and handing over only the edited lines. They open the files around the edit, look up what a helper returns, and search for everyone who calls the function you changed. Each of those is a trip.

An AI reviewer works the same way, except that every trip is a full round trip to the model. It asks for a file, waits for it, reads it, and then decides what to look at next. In J-Bot Review's production telemetry, those trips were most of the work: **67% of the main review's turns only looked things up, and they used 61% of the model's time**. [Part 1](https://www.pgupai.com/guides/why-ai-code-review-is-slow) covers how we measured that.

Most of those lookups are predictable. A context pack answers them before they are asked.

## What goes in a pack

| Part | What it holds | The question it answers |
| --- | --- | --- |
| Surrounding code | The lines around each change | What does the rest of this function do? |
| Definitions | Functions, types and constants the change uses, followed through imports and path aliases | What does this helper actually return? |
| Callers | Code elsewhere that imports and calls the changed symbols | What breaks if this changes? |
| Related changes | Diffs of other changed files that this part of the PR imports | Did the other half of this change land? |
| Directory map | The folders around the changed files, with changed files marked | Where does this file sit? |

Large pull requests are split into pages so that each page fits the model's input. Each page gets its own pack, capped at 64 KiB. The pack lists what it left out, and it states that a caller missing from the pack is not proof that no caller exists. It is built from the checked-out repository before the first model turn, with no outside search service.

## Four details that made it work

### 1. Number the lines

A third of the main review's tool calls re-read a file that the diff had already shown: 33.8% of 3,387 calls. Findings must point at exact lines, and the diff did not carry line numbers. Page diffs now number every line and mark lines where only whitespace changed, so a re-indented block no longer reads as new code.

### 2. Say what is in the pack, then let the model decide

Our first instinct was to tell the model not to look things up. Turns fell by about half, but those reviews posted 1 or 2 of 8 known issues, against 4 to 6 without the instruction. The issues that need a lookup were the ones lost.

The version that shipped describes the pack and leaves the rest to the model. Compared with the older, instruction-heavy wording on four pull requests, the median review took 60 seconds instead of 85. Across the four reviews, the model took 58 turns instead of 99 and made 50 tool calls instead of 152. Both versions posted 2 of the 4 known issues. Part of that gap is run-to-run noise, since a pass whose prompt did not change also made fewer calls.

### 3. Serve what you have

The first production runs showed packs being thrown away. The builder stops reading at 64 files or 2 MiB per page, and any refused read marked the whole pack incomplete, which sent the page back to the old path. Two 30-file pull requests refused 48 and 50 reads. A 7-file pull request refused 18, and its review took 81 turns and 92 tool calls without a pack. None of the refused reads were the pull request's own files.

Now a pack is dropped only when a changed file's own code is missing. Anything else is served, with the unread items listed.

### 4. Parse the code you are reviewing

The code index behind callers and definitions could not parse TypeScript decorators. On one production repository, 1,282 of 4,014 TypeScript files failed to parse, so services and controllers silently had no caller evidence. Trying legacy decorators first and modern ones second parsed all 4,022 files in a later check.

> **Key takeaways**
>
> - Hand the reviewer the code it predictably needs, and do not forbid it from looking further.
> - Number the diff, list what is missing, and serve a partial pack rather than none.
> - Measure turns and known issues together. Either one alone misleads.

## The same idea in the checks after the review

J-Bot Review runs more than one pass. A main review looks for bugs across the whole change. Focused lens passes look for one kind of problem, such as changes that break each other. A compliance pass checks your written rules, and a verification step tries to disprove each finding before it is posted.

On the OpenCode backend, with a model that supports tools, two of those passes now start from packs:

- **Lens passes run with tools off.** They read the pack and the numbered diff and answer in one turn, with no tool calls. The prompt tells them tools are unavailable.
- **Verification starts with one tool-free check.** It gets the packs for the findings' files, and a confirmation backed by quoted code is final. Every other finding gets a re-check with tools, capped at six turns.

On four pull requests with a free model, one run each, the median review went from 110 to 86 seconds. Across the four reviews, turns fell from 117 to 83 and tool calls from 274 to 158. The known issues posted went from 1 of 4 to 2 of 4.

## Where a pack does not help

- **Models that check everything themselves.** DeepSeek V4.1 Flash made about 200 tool calls per review with or without a pack. Turns fell 8% and cost rose 16%, because the pack became extra reading.
- **Models whose time goes to thinking.** With an earlier version of the pack, MiMo V2.6 Flash took 21% fewer turns, but its wall time did not improve. It spent the saved time reasoning in its first turn.
- **Busy gateways.** The same code under the same settings produced median review times from 41 to 66 seconds across rounds, as gateway load changed. That is why we report turns as the pack's direct effect and treat wall time with care.

[Part 5](https://www.pgupai.com/guides/faster-ai-code-review-results) puts the numbers together, including what changed in production.

## FAQ

### Is a context pack the same as RAG?

Not quite. Retrieval-augmented generation usually searches an index for text that resembles a question. A context pack follows the code’s own structure instead: the lines around each change, the definitions it imports, and the call sites of the changed symbols. J-Bot Review builds it from the checked-out repository before the review starts, with no outside search service.

### Can the reviewer still read files that are not in the pack?

Yes. The main review keeps its read-only repository tools and decides for itself what else to open. Only the focused lens passes on the OpenCode backend run with tools off, and their prompt says so.

### Does a context pack send more of my code to the model provider?

It puts more of your repository into each review prompt, so the provider you configured receives more code per review, up to 64 KiB of pack per review page. Nothing else changes: J-Bot Review runs in your own CI, and code leaves your runner only for the model you bring.

### Is the context pack on by default?

Yes. It became J-Bot Review’s default review preset on September 23, 2026, in [pull request #241](https://github.com/pgup-ai/jbot-review/pull/241), and its production fixes followed in [\#242](https://github.com/pgup-ai/jbot-review/pull/242).

**Series: Making AI code review faster**

1. [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow)
2. [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments)
3. Context packs: the fix that worked
4. [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines)
5. [The results](https://www.pgupai.com/guides/faster-ai-code-review-results)

## Related

- **Part 2** — [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments): The ideas that looked good, and the data that ruled them out.
- **Part 4** — [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines): Guideline files were cut at 24 KB. How the reviewer now finds the rules that matter.
- **Source** — [The context-pack pull request](https://github.com/pgup-ai/jbot-review/pull/241): The implementation, prompts, and A/B tables behind this article.

---

_Markdown representation of [https://www.pgupai.com/guides/context-pack-ai-code-review](https://www.pgupai.com/guides/context-pack-ai-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
