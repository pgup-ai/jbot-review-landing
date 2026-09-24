Engineering notes · Making AI code review faster · Part 5 of 5

# How much faster did context packs make J-Bot Review?

Published September 24, 2026

In A/B tests on eight real pull requests, context packs cut the number of model turns in a J-Bot Review run by 30 to 35%, and by 45% on the pull requests with known issues. We measured packs in turns, because gateway load swung wall time between rounds. Two follow-up changes then cut the median review on four pull requests, one from 110 to 86 seconds and the other, in a later round, from 85 to 60. The share of known issues the reviewer posted stayed within run-to-run noise.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you bring. This is the last of five parts. If you’re starting here, the earlier parts cover [what was slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow), [what we tried first](https://www.pgupai.com/guides/ai-code-review-speed-experiments), [how context packs work](https://www.pgupai.com/guides/context-pack-ai-code-review), and [how the reviewer now finds your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines).

**In this article**

- [The A/B tests](https://www.pgupai.com/guides/faster-ai-code-review-results#scoreboard)
- [Did accuracy hold?](https://www.pgupai.com/guides/faster-ai-code-review-results#accuracy)
- [In production](https://www.pgupai.com/guides/faster-ai-code-review-results#production)
- [The model route still matters most](https://www.pgupai.com/guides/faster-ai-code-review-results#biggest-lever)
- [What we haven’t measured yet](https://www.pgupai.com/guides/faster-ai-code-review-results#not-yet)
- [FAQ](https://www.pgupai.com/guides/faster-ai-code-review-results#faq)

**−30 to −35%** — model turns per review with context packs, 8 PRs × 2 runs

**−45%** — turns on the 4 PRs with known issues

**110 → 86 s** — median review, tool-free lens and two-step verification

**85 → 60 s** — median review after leaving exploration to the model

## The A/B tests

Each row is a separate A/B test on real pull requests from a private production repository, run through OpenCode with a free model unless the row says otherwise. “Known issues” are problems developers accepted and fixed on those pull requests, and we count one as caught only when the review actually posted it.

| Change | Test | Before → after | Known issues posted |
| --- | --- | --- | --- |
| Context packs | 8 PRs × 2 runs | Turns −30 to −35%; cached input −37% | 54% → 44% on the 4 PRs with known issues, pooled across several rounds (24 to 32 reviews per arm, each ±9 to 10 points) |
| Tool-free lens passes and two-step verification | 4 PRs × 1 run | 110 → 86 s median; 117 → 83 turns; 274 → 158 tool calls | 1 → 2 of 4 |
| Leaving exploration to the model | 4 PRs × 1 run | 85 → 60 s median; 99 → 58 turns; 152 → 50 tool calls | 2 → 2 of 4 |
| Serving packs that hit the read cap | Replay of a production review | A 49.6 KB pack served instead of discarded; without it, that review took 81 turns and 92 tool calls | Not measured |
| Ranked guideline sections and parent rules | 2 PRs × 1 run | The rule behind a known issue reached the prompt | 1 → 2 of 2 |

Turn counts are totals across every model request in a review, from the main pages to verification. Wall-clock times are medians across the pull requests in each test.

## Did accuracy hold?

We can’t tell yet. The turn test ran each of eight pull requests twice, which is too few reviews to judge accuracy. So for accuracy we pooled several rounds on the four pull requests with known issues, 24 to 32 reviews per arm. The context-pack arm posted 44% of the known issues and the old default posted 54%. Each arm is uncertain by about 9 to 10 points, so the gap is within run-to-run noise. These samples can’t show a loss, and they can’t rule one out either. A full benchmark run, which we haven’t done, is what would settle it.

The smaller follow-up tests held or improved, going from 1 to 2 of 4, 2 to 2 of 4, and 1 to 2 of 2.

The same check kept prompts that told the model to skip lookups from shipping, since they lost the issues that need a lookup. [Part 2](https://www.pgupai.com/guides/ai-code-review-speed-experiments) has those numbers.

## In production

The baseline is the one from [Part 1](https://www.pgupai.com/guides/why-ai-code-review-is-slow). On one busy private repository in September 2026, only 80 of 195 pushes got a review posted for their commit, and those waited a median of 11.1 minutes from push to posted review, with the slowest 10% at 25.6 minutes or more.

Around the time context packs shipped, we also took the slowest model route out of that repository’s rotation, so these two production reviews reflect both changes:

- A 7-file frontend pull request, reviewed in 98 seconds with about 3,500 reasoning tokens across the whole review.
- A 31-file backend pull request, reviewed in 73 seconds.

Those are review run times. Push-to-posted time adds queueing, starting the CI job and pulling the reviewer’s container image, so the two measures aren’t directly comparable, and we haven’t re-measured push-to-posted across a full day since the change.

## The model route still matters most

As in Part 1, the model route mattered more than anything we changed in the reviewer. With its tools turned off, one reasoning model still wrote 48,493 tokens of hidden reasoning to produce a 421-token answer, and that single pass took 16.7 minutes. A pass like that has no round trips for a pack to cut.

If your reviews feel slow, test two or three model routes on your own pull requests before you tune anything else. J-Bot Review defaults its main review to low reasoning effort on most providers, and Part 1 has what that did, including a model that reasoned more on that setting.

## What we haven’t measured yet

Our project rules call for a larger benchmark before a default changes, and we didn’t run one. We changed this default on the A/B evidence above and said so in the [pull request](https://github.com/pgup-ai/jbot-review/pull/241). The 11.1-minute push-to-posted baseline still needs a matching number from a full day of production after the change. And the right settings differ by model. Packs help models that look things up and matter less for models that verify everything themselves, so per-model tuning is next.

## FAQ

### How do you measure whether a faster review is still accurate?

We replay real pull requests whose issues developers accepted and fixed, and count how many of those issues the review posts. We checked the speed changes against that count, except one replay that only measured the pack itself. Changes that cut turns but lost issues, such as prompts telling the model to skip lookups, didn’t ship.

### How long does a J-Bot Review run take now?

It depends mostly on the model route. Two production reviews after these changes took 98 seconds for a 7-file pull request and 73 seconds for a 31-file one, on a rotation that no longer included the slowest route. The same reviewer can take many minutes on a slow reasoning route.

### Does a faster review mean a shallower one?

We haven’t seen that, but our samples are small. The main review keeps its repository tools and decides what else to read, and context packs hand it the predictable lookups first. In the largest test the known-issue rate went from 54% to 44%, a gap within run-to-run noise that a full benchmark would need to settle.

### What does J-Bot Review cost?

J-Bot Review is open source and $0 per seat. It runs in your own GitHub Actions, so you pay the model provider you bring, which can be a free route, plus your normal CI minutes.

**Series: Making AI code review faster**

1. [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow)
2. [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments)
3. [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review)
4. [Making the reviewer read your rules](https://www.pgupai.com/guides/ai-code-review-team-guidelines)
5. The results

## Related

- **Part 1** — [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow): The production baseline and where the time went.
- **Part 3** — [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review): How a pack hands the reviewer code before its first turn.
- **Setup** — [Add J-Bot Review to your repo](https://www.pgupai.com/#setup): Runs on your own runner with the model you choose.

---

_Markdown representation of [https://www.pgupai.com/guides/faster-ai-code-review-results](https://www.pgupai.com/guides/faster-ai-code-review-results). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
