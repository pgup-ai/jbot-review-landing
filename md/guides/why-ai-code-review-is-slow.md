Engineering notes · Making AI code review faster · Part 1 of 5

# Why is AI code review slow?

Published September 24, 2026

Mostly because the model works one step at a time, and every step is a full round trip. When we traced J-Bot Review in production, two-thirds of the main review’s turns went to looking code up, and those turns took 61% of the model’s time. On the one backend that reports tool time separately, running the tools took 1.8% of the session. Nearly all the rest was the model deciding what to do next.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you choose. We spent five weeks making it faster, and this series is the write-up. We had guessed the tools were slow. The time was going to a model doing its lookups one at a time, and a handful of bugs were discarding work or hiding code from the reviewer without raising an error.

**In this article**

- [How slow it was](https://www.pgupai.com/guides/why-ai-code-review-is-slow#how-slow)
- [Where the time went](https://www.pgupai.com/guides/why-ai-code-review-is-slow#where-time-went)
- [The model route mattered most](https://www.pgupai.com/guides/why-ai-code-review-is-slow#model-route)
- [Failures that raised no error](https://www.pgupai.com/guides/why-ai-code-review-is-slow#quietly-missing)
- [How we found it](https://www.pgupai.com/guides/why-ai-code-review-is-slow#how-we-found-it)
- [FAQ](https://www.pgupai.com/guides/why-ai-code-review-is-slow#faq)

**11.1 min** — median from push to posted review, for the 80 of 195 pushes that got one

**67%** — of main-review turns were only lookups

**1.8%** — of session time spent running tools, on the backend that measures it

**41%** — of review runs were cancelled by a newer push

## How slow it was

We took one busy private repository and measured a day of it in September 2026: 195 pushes. Only 80 of them ever got a review posted for that exact commit. For those 80, the median time from push to posted review was 11.1 minutes, and the slowest tenth took 25.6 minutes or longer.

Developers didn’t wait that long. They pushed again after a median of 6.9 minutes, and because that repository’s workflow cancels a running review when a new push lands, 41% of review runs were cancelled before they finished. Of the runs that weren’t cancelled, one in five failed anyway, mostly on model-plan quotas and time limits. That left 115 of the 195 pushes without a review of their own.

## Where the time went

### It wasn’t the tools

On the backend that reports tool time separately, file reads and searches took 1.8% of session time. In one full review we profiled, the tools ran for 196 milliseconds in total, out of 323 seconds.

The rest is the model reading, reasoning and picking its next move. On one backend we audited, 94 to 99% of the output tokens were hidden reasoning. A typical focused pass produced 415 characters of visible answer out of 3,962 output tokens.

### Most turns were lookups

A main review averaged about 15 turns in a row and 26 tool calls. We sorted 3,387 of those calls by what they did:

- 33.8% re-read a file the pull request had already changed
- 19.5% searched for a symbol from the diff
- 15.9% read an unchanged file linked to the diff
- 11.9% listed folders

Two-thirds of main-review turns were nothing but lookups like these, and they took 61% of the main review’s model time. Many of them could be predicted from the diff. Handing the model those lookups before its first turn is the idea behind context packs, which [Part 3](https://www.pgupai.com/guides/context-pack-ai-code-review) covers.

### Size didn’t predict time

We had assumed big pull requests were the slow ones, but size and review time barely moved together. The correlation was 0.03. How much the model reasoned was a far better predictor, at 0.50.

### Everyone waited for the slowest pass

A single review runs several model sessions: the main review, focused lens passes, a guideline check, and a verification step that tries to disprove each finding before it’s posted. The main review often finished first and then sat there. In one run, 322.9 of 617.8 seconds went to waiting on side passes. On small pull requests, verification alone took 20.0 seconds after a 22.5-second main review, because it re-read about 48,000 tokens it couldn’t get from cache.

## The model route mattered most

Which model a run landed on, and through which provider, mattered more than any code change we made:

- The slowest route’s main reviews took a median of 1,060 seconds. The fastest took 54 seconds, but about 80% of its main reviews came back empty.
- On the same set of test pull requests, one free model finished in about 50 seconds and another took about 24 minutes.
- Dropping reasoning effort to low cut the median review from 63.6 to 37.7 seconds. Measured pair by pair, the median change was −29.8%, and it held in 21 of 24 pairs. On another model the same setting made it reason 36% more, so there’s no single right setting.

## Failures that raised no error

None of these raised an error. From the outside, each looked like a finished review:

- The code index couldn’t parse TypeScript decorators. On one repository 1,282 of 4,014 TypeScript files failed, so services and controllers had no caller evidence at all. We found it during the context-pack work.
- One backend’s file reader returned only the first 48 KiB of a file, with no way to page or search. As far as the model knew, a helper deep in a large file didn’t exist.
- A tentative finding kept its tentative label even after the verifier confirmed it, so the publishing step held it back. After the fix, a real defect was posted in 3 of 3 runs instead of 0 of 3.
- J-Bot Review cut off side passes still running 300 seconds after the main review and discarded their work, 345 to 450 seconds of model time each.
- A serious bug slipped through because the unchanged file that called the changed code never made it into the review. The diff arrived whole, and the reviewer never opened the caller.
- Guideline files stopped at 24 KB, so long documents lost everything past that point. [Part 4](https://www.pgupai.com/guides/ai-code-review-team-guidelines) is about that one.
- The steps that resolve fixed review threads and summarize new commits were cut off the moment the main review finished, 9 seconds after they started, and then the run waited 7 more minutes for other passes anyway. We caught that one while J-Bot Review was reviewing its own pull request.

## How we found it

Every review writes telemetry for each session: turns, tool calls, tokens, how much of the output was reasoning, and time. Parsing 145 production review attempts and their 336 side-pass sessions showed which ones finished and why the rest didn’t. We also replayed 54 production runs offline to test early versions of the pack, and ran A/B tests on real pull requests whose issues developers had already accepted, scoring each speed change on time, turns and caught issues together.

Our earlier speed tests had used small synthetic pull requests that finished in 20 to 60 seconds. They couldn’t show the two things that mattered most in production: which model route a run happened to draw, and how many attempts were wasted or cancelled. We tried 23 ideas next, and [Part 2](https://www.pgupai.com/guides/ai-code-review-speed-experiments) scores every one.

## FAQ

### Why does AI code review take minutes when a chatbot answers in seconds?

A chat answer is usually one turn. A review takes many. In our data a main review averaged about 15 turns in a row and 26 tool calls, and each turn waits for the model to read, reason and pick its next step. Several review passes run too, and the slowest one decides when the review is done.

### Does a bigger pull request take longer to review?

Not in our data. The correlation between pull-request size and review time was 0.03. How much the model reasoned was a much better predictor, at 0.50.

### What is a turn in an AI code review?

One request to the model and its reply. When the reviewer asks to read a file, the model stops, the file gets read, and a new turn starts with its contents. Turns happen one after another, so a 15-turn review pays for 15 round trips.

### Is the model or the reviewer the slow part?

Both. The model route decides how fast each turn goes. On the same test pull requests, one free model finished in about 50 seconds and another took about 24 minutes. The reviewer’s design decides how many turns the model needs, and that’s the part context packs changed.

**Series: Making AI code review faster**

1. Why AI code review is slow
2. [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments)
3. [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review)
4. [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines)
5. [The results](https://www.pgupai.com/guides/faster-ai-code-review-results)

## Related

- **Part 2** — [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments): The 23 ideas we tried before context packs, and what each one measured.
- **Part 5** — [The results](https://www.pgupai.com/guides/faster-ai-code-review-results): Turns, time and caught issues after the changes.
- **Setup** — [Add J-Bot Review to your repo](https://www.pgupai.com/#setup): One workflow file, your own runner, the model you choose.

---

_Markdown representation of [https://www.pgupai.com/guides/why-ai-code-review-is-slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
