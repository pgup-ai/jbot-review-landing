Engineering notes · Making AI code review faster · Part 1 of 5

# Why is AI code review slow?

Published September 24, 2026

Mostly because the model works one step at a time, and every step is a full round trip. In J-Bot Review’s production telemetry, two-thirds of the main review’s turns did nothing but look code up, and those turns took 61% of the model’s time. Running the tools themselves took 1.8% of the session. The rest was the model deciding what to do next.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you choose. This series covers how we made it faster. Before we could fix anything we had to measure it, and some of what we found was not slow at all but quietly missing.

**In this article**

- [How slow it was](https://www.pgupai.com/guides/why-ai-code-review-is-slow#how-slow)
- [Where the time went](https://www.pgupai.com/guides/why-ai-code-review-is-slow#where-time-went)
- [The model route mattered most](https://www.pgupai.com/guides/why-ai-code-review-is-slow#model-route)
- [What was quietly missing](https://www.pgupai.com/guides/why-ai-code-review-is-slow#quietly-missing)
- [How we found it](https://www.pgupai.com/guides/why-ai-code-review-is-slow#how-we-found-it)
- [FAQ](https://www.pgupai.com/guides/why-ai-code-review-is-slow#faq)

**11.1 min** — median from push to posted review on a busy private repository

**67%** — of main-review turns were only lookups

**1.8%** — of session time spent running tools

**20×** — spread in median main-review time between model routes

## How slow it was

We measured one busy private repository over about a day in September 2026: 195 pushes. The median time from a push to a posted review was 11.1 minutes, and the slowest 10% took 25.6 minutes or more.

That was often longer than the developer was willing to wait. People pushed again after a median of 6.9 minutes. That repository’s workflow cancels a running review when a new push arrives, so 41% of review runs never finished. Of the runs that reached a verdict, 20% failed, mostly on model-plan quotas and time limits.

## Where the time went

### The model is the clock

On the backend that reports tool time separately, running tools such as file reads and searches took 1.8% of session time in production. In one full review we profiled, all tool work added up to 196 milliseconds out of 323 seconds. The rest was the model generating: reading what it had, reasoning, and choosing the next step.

Most of that generation is invisible. On one backend we audited, 94 to 99% of the model’s output tokens were hidden reasoning that never appeared in the review. One focused pass produced 415 visible characters from 3,962 output tokens.

### Most turns were lookups

A main review averaged about 15 sequential turns and 26 tool calls. Of 3,387 tool calls we classified:

- 33.8% re-read a file the pull request had changed,
- 19.5% searched for a symbol from the diff,
- 15.9% read an unchanged file linked to the diff, and
- 11.9% listed folders.

Grouped into turns, 67% of turns did nothing but these lookups, and they took 61% of the main review’s model time. Each one waited for a full model round trip. That finding became the design for context packs, covered in [Part 3](https://www.pgupai.com/guides/context-pack-ai-code-review).

### Size did not predict time

A bigger pull request did not take reliably longer. The correlation between a pull request’s size and its review time was 0.03, close to none. The amount of reasoning the model did correlated at 0.50.

### The review waited on its slowest side pass

A review is several model sessions: the main review, focused lens passes, a guideline check, and a verification step that tries to disprove each finding. The main review often finished first and then waited. In one run, 322.9 of 617.8 seconds went to waiting for side passes. On small pull requests, verification alone ran 20.0 seconds after a 22.5-second main review, re-reading about 48,000 tokens it could not reuse from cache.

## The model route mattered most

The same reviewer, on the same kind of pull request, ran at very different speeds depending on the model and the provider route it used:

- Median main-review time ranged from 54 seconds on one route to 1,060 seconds on another.
- On a fixed set of test pull requests, one free model finished in about 50 seconds while another took about 24 minutes.
- Lowering reasoning effort cut the median review from 63.6 to 37.7 seconds. The paired change was −29.8%, and the lower setting was faster in 21 of 24 pairs. On a different model the same setting raised reasoning by 36%, so it has to be tuned per model.

Fast is not the same as useful, either. One model finished its main reviews in a median of 12 seconds, and 13 of 14 came back with nothing.

## What was quietly missing

The slowest part of this work was finding problems that raised no error. Each one looked like a finished review from the outside:

- **Code the index could not parse.** 1,282 of 4,014 TypeScript files failed to parse because of decorators, so services and controllers had no caller evidence.
- **A reader that stopped at 48 KiB.** One backend’s file reader returned only the first 48 KiB of a file, with no way to page or search, so a helper deep in a large file was invisible.
- **Confirmed findings that never posted.** Tentative findings kept their tentative label after the verifier confirmed them, so the publishing step withheld them. After the fix, a true defect was posted in 3 of 3 runs instead of 0 of 3.
- **Finished work thrown away.** A side pass still running 300 seconds after the main review was cut off, and its work was discarded: 345 to 450 seconds of model time per case.
- **The one file nobody opened.** A serious bug was missed because the unchanged file that called the changed code never entered the review. Nothing had been truncated; nobody looked there.
- **Rules below the fold.** Guideline files were cut at 24 KB, so long documents lost their second halves. [Part 4](https://www.pgupai.com/guides/ai-code-review-team-guidelines) covers the fix.
- **Bookkeeping cut short.** The steps that resolve fixed review threads and summarize new commits were stopped 9 seconds after they started, while the run went on waiting 7 more minutes for other passes.

> **Key takeaways**
>
> - AI review time is model time. Tools and machines were a rounding error.
> - Two-thirds of the turns were lookups that could be predicted in advance.
> - Model route choice moved review time more than any code change.
> - Check for work that silently goes missing, not just work that is slow.

## How we found it

No single test showed all of this. Several kinds of evidence together did:

- **Session telemetry.** Every review records its turns, tool calls, tokens, reasoning share and time per session.
- **Production logs.** We parsed 145 production review attempts with 336 side-pass sessions to see which ones finished, and why the others did not.
- **Replays.** We replayed 54 production runs offline to count which lookups a pack could have answered.
- **A/B tests with an answer key.** We ran real pull requests whose issues developers had accepted, with each change on and off, and counted time, turns and caught issues together.
- **Dogfooding.** J-Bot Review reviews its own pull requests. Several of the silent failures above first showed up in those runs.

Earlier speed tests had used small synthetic pull requests that finished in 20 to 60 seconds. They missed the two biggest factors: which model route a run drew, and the attempts that were wasted or cancelled. [Part 2](https://www.pgupai.com/guides/ai-code-review-speed-experiments) covers the 21 fixes we tried next.

## FAQ

### Why does AI code review take minutes when a chatbot answers in seconds?

A chat answer is usually one turn. A code review is dozens: in our data, a main review averaged about 15 sequential turns and 26 tool calls, and every turn waits for the model to read, reason and decide what to look at next. Several review passes also run, and the slowest one sets the finish time.

### Does a bigger pull request take longer to review?

Not reliably. In our production data, the correlation between pull-request size and review time was 0.03. The amount of reasoning the model did was a much better predictor, at 0.50.

### What is a turn in an AI code review?

A turn is one request to the model and its reply. When the reviewer asks to read a file, the model stops, the file is read, and a new turn starts with the file’s contents. Turns run one after another, so a review with 15 turns pays for 15 full round trips.

### Is the model or the reviewer the slow part?

Both matter, in different ways. The model route set the pace: median main-review time ranged from 54 seconds to 1,060 seconds between routes. The reviewer’s design set how many turns the model needed, and that is what context packs changed.

**Series: Making AI code review faster**

1. Why AI code review is slow
2. [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments)
3. [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review)
4. [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines)
5. [The results](https://www.pgupai.com/guides/faster-ai-code-review-results)

## Related

- **Part 2** — [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments): The ideas that looked good, and the data that ruled them out.
- **Part 5** — [The results](https://www.pgupai.com/guides/faster-ai-code-review-results): What the changes did to speed, turns, and caught issues.
- **Setup** — [Add J-Bot Review to your repo](https://www.pgupai.com/#setup): One workflow file, your own runner, the model you choose.

---

_Markdown representation of [https://www.pgupai.com/guides/why-ai-code-review-is-slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
