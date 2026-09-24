Engineering notes · Making AI code review faster · Part 3 of 5

# What is a context pack in AI code review?

Published September 24, 2026

A context pack is a bundle of code that J-Bot Review puts in front of its AI reviewer before the review starts. It holds the code around each change, the definitions the change relies on, the places that call the changed code, related changes elsewhere in the pull request, and a map of the folders. The reviewer used to fetch each of these itself, one request at a time. Now it starts with them.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you choose. Context packs became its default on September 23, 2026, after a month of experiments. The idea is simple. Four details decided whether it helped, and most of this page is about those.

**In this article**

- [The scavenger hunt](https://www.pgupai.com/guides/context-pack-ai-code-review#scavenger-hunt)
- [What goes in a pack](https://www.pgupai.com/guides/context-pack-ai-code-review#whats-in-a-pack)
- [Four details that made it work](https://www.pgupai.com/guides/context-pack-ai-code-review#what-made-it-work)
- [Packs in the checks after the review](https://www.pgupai.com/guides/context-pack-ai-code-review#other-passes)
- [Where a pack doesn’t help](https://www.pgupai.com/guides/context-pack-ai-code-review#limits)
- [FAQ](https://www.pgupai.com/guides/context-pack-ai-code-review#faq)

## The scavenger hunt

Picture asking a colleague to review a change and handing over only the edited lines. They’ll open the files around the edit, check what a helper returns, and search for everyone who calls the function you changed. Each of those is a trip.

An AI reviewer works the same way, except every trip is a full round trip to the model. It asks for a file, waits, reads it, and then decides what to look at next. In J-Bot Review’s production telemetry, 67% of the main review’s turns did nothing but look things up, and those turns took 61% of the model’s time. [Part 1](https://www.pgupai.com/guides/why-ai-code-review-is-slow) covers how we measured that.

Most of those lookups are predictable from the diff. A context pack answers them up front.

## What goes in a pack

| Part | What it holds | The question it answers |
| --- | --- | --- |
| Surrounding code | The lines around each change | What does the rest of this function do? |
| Definitions | Functions, types and constants the change uses, followed through imports and path aliases | What does this helper actually return? |
| Callers | Code elsewhere that imports and calls the changed symbols | What breaks if this changes? |
| Related changes | Diffs of other changed files that this part of the PR imports | Did the other half of this change land? |
| Directory map | The folders around the changed files, with changed files marked | Where does this file sit? |

J-Bot Review splits a large pull request into pages that each fit the model’s input, and each page gets its own pack, capped at 64 KiB. The pack lists what it left out, and the prompt reminds the model that a caller missing from the pack doesn’t mean there isn’t one. J-Bot Review builds the pack from the checked-out repository before the first model turn, with no outside search service.

## Four details that made it work

### 1. Number the lines

A third of the main review’s tool calls, 33.8% of 3,387, re-read a file the diff had already shown. Findings have to point at exact lines, and the diff didn’t carry line numbers. That’s one reason the model kept going back to the file. Page diffs now number each line of the new code and flag lines where only whitespace changed, so a re-indented block doesn’t read as new code.

### 2. Say what’s in the pack, then let the model decide

We tried the blunt version first and told the model not to look things up. Turns fell by about half. Those reviews also posted only 1 or 2 of 8 known issues, against 4 to 6 without the instruction, and the ones they lost were exactly the issues that need a lookup.

The version that shipped describes what the pack holds and leaves the rest to the model. We compared it with the older, instruction-heavy wording on four pull requests. The median review took 60 seconds instead of 85, and across the four reviews the model took 58 turns instead of 99 and made 50 tool calls instead of 152. Both versions posted 2 of the 4 known issues. That’s a big drop for cutting instructions out of a prompt, and some of it is noise, since a pass whose prompt didn’t change also made fewer calls in the same round.

### 3. Serve what you have

Once packs reached production, we found them being thrown away. The builder stops reading at 64 files or 2 MiB per page, and any read it refused marked the whole pack incomplete, which sent the page back to a review without a pack. Two 30-file pull requests refused 48 and 50 reads. A 7-file pull request refused 18, and without its pack the review took 81 turns and 92 tool calls. None of the refused reads were the pull request’s own files.

Now J-Bot Review drops a pack only when a changed file’s own code is missing. Otherwise it serves the pack and lists what it couldn’t read.

### 4. Parse the code you’re reviewing

The code index behind callers and definitions couldn’t parse TypeScript decorators. On one production repository, 1,282 of 4,014 TypeScript files failed, so services and controllers quietly had no caller evidence at all. The fix tries legacy decorators first and modern ones second. A later check, by which point the repository had grown to 4,022 TypeScript files, parsed every one.

## Packs in the checks after the review

J-Bot Review runs more than one pass. The main review looks for bugs across the whole change. Focused lens passes each look for one kind of problem, such as changes that contradict each other. A compliance pass checks your written rules, and a verification step tries to disprove each finding before it’s posted.

On the OpenCode backend, with a model that supports tools, two of those passes now start from packs:

- **Lens passes run with tools off.** They read the pack and the numbered diff and answer in one turn. Their prompt tells them tools are unavailable, so they don’t spend turns reaching for them.
- **Verification starts with one tool-free check.** It gets the packs for the findings’ files, and a confirmation backed by quoted code is final. Every other finding gets a re-check with tools, capped at six turns.

On four pull requests with a free model, one run each, the median review went from 110 to 86 seconds. Across the four reviews, turns fell from 117 to 83 and tool calls from 274 to 158, and the reviews posted 2 of the 4 known issues instead of 1. One run per pull request is a thin sample, but every number moved the same way.

## Where a pack doesn’t help

Some models check everything themselves no matter what you hand them. DeepSeek V4.1 Flash made about 200 tool calls per review with or without a pack. Its turns fell 8% and its cost rose 16%, because the pack was just more to read.

Other models spend most of their time thinking. With an earlier version of the pack, MiMo V2.6 Flash took 21% fewer turns, and its wall time didn’t budge. Its time goes to reasoning, and a pack doesn’t shorten that.

And a busy gateway can swamp everything. The same code under the same settings produced median review times from 41 to 66 seconds across rounds as gateway load changed. That’s why we count turns as the pack’s direct effect and take wall time with a grain of salt. [Part 5](https://www.pgupai.com/guides/faster-ai-code-review-results) puts the numbers together, including what changed in production.

## FAQ

### Is a context pack the same as RAG?

Not quite. Retrieval-augmented generation usually searches an index for text that resembles a question. A context pack follows the code’s own structure: the lines around each change, the definitions it imports, and the call sites of the changed symbols. J-Bot Review builds it from the checked-out repository before the review starts, with no outside search service.

### Can the reviewer still read files that aren’t in the pack?

Yes. The main review keeps its read-only repository tools and decides for itself what else to open. On the OpenCode backend, the focused lens passes and the first verification check run with tools off, and any finding that check can’t settle gets a re-check with tools.

### Does a context pack send more of my code to the model provider?

Somewhat more. Each review page can carry up to 64 KiB of pack, and it goes to the model provider you configured. Nothing else changes. J-Bot Review runs in your own CI, and your code leaves the runner only for the model you bring.

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
