Engineering notes · Making AI code review faster · Part 5 of 5

# How much faster did context packs make J-Bot Review?

Published September 24, 2026

In A/B tests on eight real pull requests, context packs cut the number of model turns in a J-Bot Review run by 30 to 35%, and by 45% on the pull requests with known issues. Two follow-up changes then cut the median review on four pull requests from 110 to 86 seconds, and in a later round from 85 to 60. The share of known issues the reviewer posted stayed within run-to-run noise.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you bring. This is the last of five parts. If you’re starting here, the earlier parts cover [what was slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow), [what we tried first](https://www.pgupai.com/guides/ai-code-review-speed-experiments), [how context packs work](https://www.pgupai.com/guides/context-pack-ai-code-review), and [how the reviewer now finds your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines).

**In this article**

- [The scoreboard](https://www.pgupai.com/guides/faster-ai-code-review-results#scoreboard)
- [Did accuracy hold?](https://www.pgupai.com/guides/faster-ai-code-review-results#accuracy)
- [In production](https://www.pgupai.com/guides/faster-ai-code-review-results#production)
- [The biggest lever was the model route](https://www.pgupai.com/guides/faster-ai-code-review-results#biggest-lever)
- [What we haven’t measured yet](https://www.pgupai.com/guides/faster-ai-code-review-results#not-yet)
- [FAQ](https://www.pgupai.com/guides/faster-ai-code-review-results#faq)

**−30 to −35%** — model turns per review with context packs, 8 PRs × 2 runs

**−45%** — turns on the 4 PRs with known issues

**110 → 86 s** — median review, tool-free lens and two-step verification

**85 → 60 s** — median review after leaving exploration to the model

## The scoreboard

Each row is a separate A/B test on real pull requests from a private production repository, run through OpenCode with a free model unless the row says otherwise. “Known issues” are problems developers accepted and fixed on those pull requests, and we count one as caught only when the review actually posted it.

| Change | Test | Before → after | Known issues posted |
| --- | --- | --- | --- |
| Context packs | 8 PRs × 2 runs | Turns −30 to −35%; cached input −37% | 54% → 44% on the 4 PRs with known issues, pooled across several rounds (24 to 32 reviews per arm, each ±9 to 10 points) |
| Tool-free lens passes and two-step verification | 4 PRs × 1 run | 110 → 86 s median; 117 → 83 turns; 274 → 158 tool calls | 1 → 2 of 4 |
| Leaving exploration to the model | 4 PRs × 1 run | 85 → 60 s median; 99 → 58 turns; 152 → 50 tool calls | 2 → 2 of 4 |
| Serving packs that hit the read cap | Replay of a production review | A 49.6 KB pack served instead of discarded; without it, that review took 81 turns and 92 tool calls | Not measured |
| Ranked guideline sections and parent rules | 2 PRs × 1 run | The rule behind a known issue reached the prompt | 1 → 2 of 2 |

Turn counts are totals across every model request in the review: the main pages, the rules check, and verification. Wall-clock times are medians across the pull requests in each test.

## Did accuracy hold?

As far as samples this size can show, yes. The turn test ran each of eight pull requests twice, which is too few reviews to judge accuracy. So for accuracy we pooled several rounds on the four pull requests with known issues, 24 to 32 reviews per arm. The context-pack arm posted 44% of the known issues and the old default posted 54%. Each arm is uncertain by about 9 to 10 points, so the gap is within run-to-run noise. It’s still a 10-point gap, and we’re watching it.

The smaller follow-up tests held or improved, going from 1 to 2 of 4, 2 to 2 of 4, and 1 to 2 of 2.

The accuracy check also ruled things out. Prompts that told the model to skip lookups cut turns by about half and lost the issues that need a lookup, so they didn’t ship. [Part 2](https://www.pgupai.com/guides/ai-code-review-speed-experiments) lists those experiments.

## In production

Before the change, on one busy private repository over about a day in September 2026, the median time from a push to a posted review was 11.1 minutes, and the slowest 10% took 25.6 minutes or more. Developers pushed again after a median of 6.9 minutes, and a newer push cancelled 41% of review runs before they finished.

Here are two production reviews since context packs shipped. Around the same time we also took the slowest model route out of that repository’s rotation, so the two changes are mixed together:

- A 7-file frontend pull request, reviewed in 98 seconds with about 3,500 reasoning tokens across the whole review.
- A 31-file backend pull request, reviewed in 73 seconds.

Those are review run times. Push-to-posted time also includes queueing and starting the CI job, including pulling the reviewer’s container image, so the two measures aren’t directly comparable. We haven’t re-measured push-to-posted across a full day since the change.

## The biggest lever was the model route

Nothing we changed in the reviewer moved latency as much as the choice of model and route:

- Across production runs, the median main review took 54 seconds on one route and 1,060 seconds on another.
- On the same test pull requests, one free model finished reviews in about 50 seconds while another took about 24 minutes.
- One reasoning model, with its tools turned off, still wrote 48,493 tokens of hidden reasoning to produce a 421-token answer.

That last pass took 16.7 minutes without a single tool call. Cutting round trips only helps if the model doesn’t spend the time thinking instead. If your reviews feel slow, test two or three model routes on your own pull requests before you tune anything else. J-Bot Review defaults its main review to low reasoning effort on most providers, which cut one model’s median review from 63.6 to 37.7 seconds in our tests.

## What we haven’t measured yet

A few things are still open. Our project rules call for a larger benchmark before a default changes. We changed this one on the A/B evidence above and said so in the [pull request](https://github.com/pgup-ai/jbot-review/pull/241). The 11.1-minute push-to-posted baseline still needs a matching number from a full day of production after the change. And the right settings differ by model. Packs help models that look things up and matter less for models that verify everything themselves, so per-model tuning is next.

## FAQ

### How do you measure whether a faster review is still accurate?

We replay real pull requests whose issues developers accepted and fixed, and count how many of those issues the review posts. We checked every speed change against that count. Changes that cut turns but lost issues, such as prompts telling the model to skip lookups, didn’t ship.

### How long does a J-Bot Review run take now?

It depends mostly on the model route. In production after these changes, a 7-file pull request was reviewed in 98 seconds and a 31-file pull request in 73 seconds. The same reviewer can take many minutes on a slow reasoning route.

### Does a faster review mean a shallower one?

Not in our tests. The main review keeps its repository tools and decides what else to read. Context packs hand it the predictable lookups up front, and it can still make any others it wants. Across the A/B tests, the share of known issues posted stayed within run-to-run noise.

### What does J-Bot Review cost?

J-Bot Review is open source and $0 per seat. It runs in your own GitHub Actions, and you pay only the model provider you bring, which can be a free route.

**Series: Making AI code review faster**

1. [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow)
2. [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments)
3. [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review)
4. [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines)
5. The results

## Related

- **Part 1** — [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow): Where the time went, and how we measured it.
- **Part 3** — [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review): What goes in a pack and the details that made it work.
- **Setup** — [Add J-Bot Review to your repo](https://www.pgupai.com/#setup): One workflow file, your own runner, the model you choose.

---

_Markdown representation of [https://www.pgupai.com/guides/faster-ai-code-review-results](https://www.pgupai.com/guides/faster-ai-code-review-results). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
