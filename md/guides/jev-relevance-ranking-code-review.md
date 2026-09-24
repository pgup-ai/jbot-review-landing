Engineering notes · Integrations

# How does Jev help AI code review?

Published September 24, 2026

It picks which callers of the changed code the reviewer sees first. When a pull request changes a function that other files use, J-Bot Review can find many places that mention it, and only a few fit in the prompt. Jev, a relevance model from TypeSafe, reads each candidate and scores how likely it is to matter for the change. The best few go to the reviewer. Each call took about 0.2 seconds and cost under $0.0004.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you choose. Jev is available as the opt-in `jev` preset. On the pull request with the most candidates, it cut estimated review cost 16% and caught a known bug in one of five runs, where ten runs without it never did. On a smaller pull request it gained nothing, and the same candidates in plain order did better on average, which is why it isn’t the default.

**In this article**

- [What Jev is](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#what-jev-is)
- [Adding it took one HTTPS call](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#integration)
- [How it helps a review](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#how-it-helps)
- [Results](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#results)
- [Lessons for adding a relevance model](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#lessons)
- [Where else it could help](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#next)
- [How to turn it on](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#try-it)
- [FAQ](https://www.pgupai.com/guides/jev-relevance-ranking-code-review#faq)

## What Jev is

Jev is a relevance model from TypeSafe, which calls it its flagship model. Instead of chatting with it, you send it some material and a set of yes-or-no questions, and it answers each one with a number between 0 and 1, its estimate that the answer is yes. TypeSafe calls that number a noul.

That suits ranking. Ask the same question about 20 pieces of code, sort by score, and keep the top few. Input costs $0.042 per million tokens and output is free, according to TypeSafe’s [model page](https://docs.typesafe.ai/models). J-Bot Review pins version `jev-1.13.0`.

## Adding it took one HTTPS call

There’s no SDK to install. J-Bot Review sends one POST request to TypeSafe’s API with the diff around each changed function, the candidate excerpts, and one question per excerpt. The question asks whether the excerpt contains a concrete use or test of the changed function whose behavior the change could affect. An import, a declaration or a bare mention of the name counts as no.

Jev returns one score per excerpt. J-Bot Review keeps the excerpts that score 0.5 or higher, takes the top four, and adds them to the reviewer’s prompt, up to 6,000 bytes, with a note naming anything it left out.

Most of the integration work went into the limits around that call:

- A request covers at most 24 excerpts from 12 files and can’t exceed 30,000 bytes.
- Collecting and scoring share a five-second deadline, with no retries.
- A missing key, a timeout or a malformed answer leaves the review as it would have been without Jev.
- The TypeSafe key stays in J-Bot Review’s own process. The model sessions that read your code never see it.

## How it helps a review

Jev judges one narrow thing, whether each candidate is relevant to the change. J-Bot Review’s own code finds the candidates, reads the files and enforces the limits, and the reviewer model, then a separate verifier, decide whether there’s a bug. No score can remove a finding or a file from the review.

On a small test repository we built, the pull request changed `invoiceTotal` to return cents instead of dollars. One unchanged file still multiplied that result by 100 before charging, which would overcharge by 100×. Six other files mentioned `invoiceTotal` only in metadata strings. Jev put the payment code through and left the name mentions out, so the reviewer got a 913-byte excerpt containing the payment code.

Reviews caught that bug with or without Jev. A test this small shows Jev can pick the right code, and nothing about whether that makes reviews better, so we moved on to real pull requests.

The same ranking can choose evidence for the verifier, the step that tries to disprove each finding before it’s posted. On a test repository where 15 excerpts competed for four slots, Jev swapped in two files that addressed the claims being checked more directly than the ones plain ordering picked. That was a research test. The `jev` preset never sends verifier evidence to Jev.

## Results

We tested Jev five ways, each time against the same run without it. In four of the five we also ran a second control that sent the same candidates in their original order, so ranking was the only difference. The first three rows are whole reviews on DeepSeek V4 Flash through OpenCode. The last two time only the verification step, on Muse Spark through Command Code.

| Test | What we measured | What it tells us |
| --- | --- | --- |
| A small test pull request, 8 candidates, 3 runs per arm | Jev passed along the one caller that mattered. Median review 29.4 s against 25.9 s without it; the means were within 0.1 s. | Picked the right caller, no speed change |
| [PR #128](https://github.com/pgup-ai/jbot-review/pull/128) from J-Bot Review’s history, 18 candidates, 5 runs per arm | Estimated cost −16.0%, cheaper in 5 of 5 runs. Mean time −15.8%, but faster in only 2 of 5. Main-review turns 10.2 → 7.4. A known bug found in 1 of 5 runs, against 0 of 10 without Jev. | Cheaper in all 5 runs, faster in 2 |
| [PR #148](https://github.com/pgup-ai/jbot-review/pull/148), 4 candidates, 5 runs per arm | Mean time 12.7% lower than with no extra evidence, but 12.7% higher than the same candidates in plain order. Median almost unchanged, 41.2 s against 41.8 s. | Plain order was faster on average |
| Evidence for the verifier, 15 excerpts competing for 4 slots, 3 runs per arm | Mean verification 40.7 s, against 58.6 s with no extra evidence and 52.1 s in plain order. Same turn counts as plain order in every pair. | More relevant picks, speedup unproven |
| Evidence for the verifier when all 9 excerpts fit, 3 runs per arm | Jev’s 0.5 cutoff kept 1, 3 and 1 of the 9. Mean 40.4 s, against 24.6 s for sending all nine. | Slower than sending all nine |

Jev itself was never the slow part. In the real-PR test, each Jev call added 171 to 281 milliseconds, and all ten calls together cost $0.0025, against $0.86 for all 30 reviews. The swings came from the reviewer model: how much it explored, how long verification took, and in one run an unsupported comment that took 128 seconds of verification.

Jev stays an opt-in preset. On PR #128 it was cheaper in all five runs but faster in only two, and one bug caught in five runs is too thin to count as better recall. The audits have every run: the [real-PR comparison](https://github.com/pgup-ai/jbot-review/blob/main/docs/audits/2026-09-19-jev-real-pr-comparison.md), the [verifier comparison](https://github.com/pgup-ai/jbot-review/blob/main/docs/audits/2026-09-21-jev-handoff.md) and the [packing follow-up](https://github.com/pgup-ai/jbot-review/blob/main/docs/audits/2026-09-21-handoff-packing.md).

## Lessons for adding a relevance model

- **Rank only when there’s a choice to make.** If every candidate fits, a cutoff can only remove evidence. It’s what slowed the last test in the table.
- **Test against plain ordering too.** A fair test also sends the same candidates unranked, and on PR #148 that version was faster on average.
- **Keep scores away from verdicts.** J-Bot Review uses the score to choose evidence and never to drop a finding.
- **Ask literal questions about one thing at a time.** TypeSafe’s [notes on Jev’s limits](https://docs.typesafe.ai/model-jaggedness/jev-1.13) say it reads questions literally and loses accuracy as unrelated text piles up. So each question names a single candidate, the request carries only the changed code and the excerpts, and the question tells Jev to ignore any instructions written inside the code.

## Where else it could help

Other parts of a review also have more candidates than room. We haven’t built or measured any of these yet:

- **Trimming a context pack that overflows.** Packs stop at 64 KiB and list what they leave out. A score could decide which callers make the cut. [Part 3](https://www.pgupai.com/guides/context-pack-ai-code-review) of our speed series explains packs.
- **Choosing guideline sections.** A lens pass gets 8 KB of your rules, picked today by matching words from the changed paths. A score could ask directly whether each rule applies to the change. [Part 4](https://www.pgupai.com/guides/ai-code-review-team-guidelines) covers how sections are picked now.
- **Spotting repeat comments.** Before posting, J-Bot Review checks whether a finding repeats an earlier review comment. A yes-or-no score could help catch a reworded repeat.
- **Pointing at the right tests.** Scoring test files against a diff could show the reviewer which tests exercise the change.
- **Triage outside review.** Routing issues, labeling pull requests by risk and sorting alerts all come down to asking one yes-or-no question about many items.

Each of these would need the same test we ran here, with plain ordering as a control and caught issues tracked alongside time and cost.

## How to turn it on

Jev runs only in the opt-in `jev` preset. Get an API key from TypeSafe, save it as a repository secret, and add two environment variables to the J-Bot Review step in your workflow:

`.github/workflows/jbot-review.yml`

```yaml
- uses: pgup-ai/jbot-review-action@v0
  env:
    JBOT_REVIEW_EXPERIMENT: jev
    TYPESAFE_API_KEY: ${{ secrets.TYPESAFE_API_KEY }}
  with:
    # your existing inputs
```

Presets don’t stack, so `jev` replaces the default `context-pack` preset, and those reviews run without context packs. We’d try it on one repository first. J-Bot Review logs every Jev call with candidate counts, scores, timing and estimated cost, so you can compare runs with and without it. To try it locally, put the key in your `.env` and run `JBOT_REVIEW_EXPERIMENT=jev npm run review:local -- --base origin/main`.

Only the `jev` preset sends code to TypeSafe: the diffs around the changed functions and the candidate excerpts, never more than 30,000 bytes per request. Every other preset makes no Jev call.

## FAQ

### What is Jev?

A relevance model from TypeSafe. You send it material and yes-or-no questions, and it returns a score from 0 to 1 for each question, its estimate that the answer is yes. J-Bot Review uses those scores to choose which callers of changed code the reviewer sees.

### Does J-Bot Review send my code to TypeSafe?

Only if you turn on the `jev` preset. Then J-Bot Review sends the diffs around the changed functions and up to 24 candidate excerpts, never more than 30,000 bytes per request. The default preset and every other preset make no Jev call.

### Is Jev on by default?

No. It’s the opt-in `jev` preset. On the pull request with the most candidates it cut estimated cost 16%, but it wasn’t reliably faster, and on a smaller pull request plain ordering was faster on average, so context packs stay the default.

### How much does Jev add to a review?

About 0.2 seconds per call in our tests. Each call cost between $0.00008 and $0.00038 at TypeSafe’s published input price, and output tokens are free.

## Related

- **Speed series** — [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments): Jev was one of 23 ideas we tested, and all 23 are there, including the 15 we rejected.
- **Speed series** — [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review): The default preset, which hands the reviewer code before its first turn.
- **Source** — [The Jev real-PR comparison](https://github.com/pgup-ai/jbot-review/blob/main/docs/audits/2026-09-19-jev-real-pr-comparison.md): 30 randomized reviews, per-run numbers and the adjudication.

---

_Markdown representation of [https://www.pgupai.com/guides/jev-relevance-ranking-code-review](https://www.pgupai.com/guides/jev-relevance-ranking-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
