Engineering notes · Making AI code review faster · Part 5 of 5

# How much faster did context packs make J-Bot Review?

Published September 24, 2026

In A/B tests on eight real pull requests, context packs cut the number of model turns in a J-Bot Review run by 30 to 35%, and by 45% on the pull requests with known issues. Two follow-up changes cut the median review on four pull requests from 110 to 86 seconds, then, in a separate round, from 85 to 60 seconds. The share of known issues the reviewer posted stayed within run-to-run noise.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you bring. This is the last part of a five-part series. The earlier parts cover [what was slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow), [what we tried first](https://www.pgupai.com/guides/ai-code-review-speed-experiments), [how context packs work](https://www.pgupai.com/guides/context-pack-ai-code-review), and [how the reviewer now finds your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines).

**In this article**

- [The scoreboard](https://www.pgupai.com/guides/faster-ai-code-review-results#scoreboard)
- [Did accuracy hold?](https://www.pgupai.com/guides/faster-ai-code-review-results#accuracy)
- [In production](https://www.pgupai.com/guides/faster-ai-code-review-results#production)
- [The biggest lever was the model route](https://www.pgupai.com/guides/faster-ai-code-review-results#biggest-lever)
- [What we have not measured yet](https://www.pgupai.com/guides/faster-ai-code-review-results#not-yet)
- [FAQ](https://www.pgupai.com/guides/faster-ai-code-review-results#faq)

**−30 to −35%** — model turns per review with context packs, 8 PRs × 2 runs

**−45%** — turns on the 4 PRs with known issues

**110 → 86 s** — median review, tool-free lens and two-step verification

**85 → 60 s** — median review after leaving exploration to the model

## The scoreboard

Each row is a separate A/B test on real pull requests from a private production repository, run through OpenCode with a free model unless noted. “Known issues” are problems that developers accepted and fixed on those pull requests. A test counts one when the review posted it.

| Change | Test | Before → after | Known issues posted |
| --- | --- | --- | --- |
| Context packs | 8 PRs × 2 runs | Turns −30 to −35%; cached input −37% | 54% → 44% pooled over 24 to 32 reviews per arm, each ±9 to 10 points |
| Tool-free lens passes and two-step verification | 4 PRs × 1 run | 110 → 86 s median; 117 → 83 turns; 274 → 158 tool calls | 1 → 2 of 4 |
| Leaving exploration to the model | 4 PRs × 1 run | 85 → 60 s median; 99 → 58 turns; 152 → 50 tool calls | 2 → 2 of 4 |
| Serving packs that hit the read cap | Replay of a production review | A 49.6 KB pack served instead of discarded; without it, that review took 81 turns and 92 tool calls | Not measured |
| Ranked guideline sections and parent rules | 2 PRs × 1 run | The rule behind a known issue reached the prompt | 1 → 2 of 2 |

The turn counts are totals across every model request in the review: the main pages, the rules check, and verification. Wall-clock times are medians across the pull requests in each test.

## Did accuracy hold?

As far as samples this size can show, yes. The largest test pooled 24 to 32 reviews per arm on the four pull requests with known issues. The context-pack arm posted 44% of the known issues and the old default posted 54%, with each arm uncertain by about 9 to 10 points, so the gap is within run-to-run noise. The smaller follow-up tests moved the other way: 1 to 2 of 4, 2 to 2 of 4, and 1 to 2 of 2.

The accuracy check also ruled things out. Prompts that told the model to skip lookups cut turns by about half and lost the issues that need a lookup, so they did not ship. [Part 2](https://www.pgupai.com/guides/ai-code-review-speed-experiments) lists those experiments.

## In production

Before the change, on one busy private repository over about a day in September 2026, the median time from a push to a posted review was 11.1 minutes, and the slowest 10% took 25.6 minutes or more. Developers pushed again after a median of 6.9 minutes, and 41% of review runs were cancelled by a newer push before they finished.

After context packs shipped, and after we also removed the slowest model route from that repository’s rotation, two production reviews show where things stand:

- A 7-file frontend pull request: reviewed in 98 seconds, using about 3,500 reasoning tokens across the whole review.
- A 31-file backend pull request: reviewed in 73 seconds.

Those are review run times. Push-to-posted time also includes queueing and starting the CI job, including pulling the reviewer’s container image, so the two measures are not directly comparable. We have not re-measured push-to-posted across a full day since the change.

## The biggest lever was the model route

Nothing we changed in the reviewer moved latency as much as the choice of model and route:

- Across production runs, the median main review took 54 seconds on one route and 1,060 seconds on another.
- On the same test pull requests, one free model finished reviews in about 50 seconds while another took about 24 minutes.
- With its tools turned off, one reasoning model still wrote 48,493 tokens of hidden reasoning to produce a 421-token answer. That single pass took 16.7 minutes.

Turning tools off removes round trips. It does not stop a model from deliberating. If reviews feel slow, test two or three model routes on your own pull requests before tuning anything else. J-Bot Review also runs its main review at low reasoning effort by default.

> **Key takeaways**
>
> - Context packs cut turns by 30 to 45% with no measurable loss in caught issues.
> - Wall time improved most when fewer lookups combined with a fast model route.
> - Measure speed and caught issues together, on your own pull requests.

## What we have not measured yet

- **A full benchmark run.** Our project rules call for a larger benchmark before a default changes. We changed the default on the A/B evidence above and said so in the [pull request](https://github.com/pgup-ai/jbot-review/pull/241).
- **Push-to-posted over a full day.** The 11.1-minute baseline needs a matching after measurement.
- **Per-model tuning.** Packs help models that look things up and matter less for models that verify everything themselves. The right settings differ by model.

## FAQ

### How do you measure whether a faster review is still accurate?

We replay real pull requests whose issues developers accepted and fixed, and count how many of those issues the review posts. Every speed change was checked against that count. Changes that cut turns but lost issues, such as prompts telling the model to skip lookups, did not ship.

### How long does a J-Bot Review run take now?

It depends mostly on the model route. In production after these changes, a 7-file pull request was reviewed in 98 seconds and a 31-file pull request in 73 seconds. The same reviewer can take many minutes on a slow reasoning route.

### Does a faster review mean a shallower one?

Not in our tests. The main review keeps its repository tools and decides what else to read; context packs remove predictable lookups rather than forbidding them. Across the A/B tests, the share of known issues posted stayed within run-to-run noise.

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
