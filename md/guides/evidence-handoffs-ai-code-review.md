Engineering notes · Review quality

# Where evidence gets lost in AI code review

By [PGUP AI](https://www.pgupai.com/about) · October 4, 2026 · 11 merged PRs

J-Bot Review sometimes found a real concern that its verifier could not confirm. We traced those failures through evidence collection, model reasoning and the handoff between review stages.

In these selected tests, Jev ranking showed no clear ordering advantage, and grouped context missed targets the current collector found. More investigation time helped one verifier case. The fixes we shipped preserve relevant context between stages and enforce one total step allowance; a general increase in bug detection remains unproven.

[Watch the evidence journey video (MP4)](https://www.pgupai.com/assets/video/evidence-journey-20261004-v2.mp4).

A 1:47 visual account of the changes and experiments. Music and on-screen text; no narration. [Read the text version](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#video-transcript) or [download the MP4](https://www.pgupai.com/assets/video/evidence-journey-20261004-v2.mp4).

The video covers [PRs #272–#282](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#changes). The delivery and step-accounting fixes in [PR #282](https://github.com/pgup-ai/jbot-review/pull/282) are enabled in the default preset. The additional state-retrieval and proof policies remain opt-in. A running installation needs a build containing those changes.

**In this note**

- [The missing link between a state and its producer](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#missing-link)
- [What ranking and grouping changed](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#retrieval)
- [When more investigation helped](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#limits)
- [Two runtime defects in the handoff](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#handoff)
- [Why we rejected a better-looking result](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#proof)
- [What shipped](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#changes)
- [How we tested, and what remains open](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review#method)

## The verifier was missing part of the argument

J-Bot reviews a pull request in stages. The first reviewer receives the diff and a context pack: selected surrounding code, definitions and callers. It can use read-only repository tools to investigate further. A separate verification stage checks the candidates before they become review comments.

In one historical case, the first reviewer identified a guard that might allow a prohibited operation. The verifier read the guard but could not establish that the problematic state was reachable. It returned “uncertain.” The code that produced that state existed elsewhere in the repository. The investigation had stopped before connecting it.

Consider a fictional example that illustrates the reasoning task, without reproducing a private application’s workflow:

1. **Starting state** A record has an active restriction.
2. **State change** An update changes the record’s status.
3. **Guard** A check reads only the new status.
4. **Effect** An operation ignores the restriction.

A list of enum values would not establish this path. Neither would comparing two guard expressions. The verifier needed to connect the state-producing write, the selection rule and the downstream operation. A fresh verifier also needed access to the useful context collected by the first reviewer.

We measured source delivery, discovery and confirmation separately. More code in the prompt did not necessarily mean more issues found or correctly verified.

## Ranking did not solve missing evidence

The [study data (JSON)](https://www.pgupai.com/assets/data/review-evidence-studies-20261004.json) records the comparison arms, counts and decisions below. Each study has its own baseline and scoring rules.

We first explored whether the problem was selection or ordering. Jev, TypeSafe’s relevance model, can rank candidate excerpts before the review model sees them. That is useful machinery when more candidates are available than the prompt can hold. It cannot select a definition the collector never found.

Our [earlier Jev experiments](https://www.pgupai.com/guides/jev-relevance-ranking-code-review) had mixed results. In a later isolated ordering study, we compared the original order, Jev-ranked evidence placed last, and a shuffled control. Across 36 completed runs—four cases, three arms and three repetitions—no arm retained a predefined target at medium or higher severity (P0–P2), the study’s primary scoring threshold.

Four runs retained exact target findings at low severity (P3): two with the original order, one with Jev and one with shuffled order. All four matched the same concern. Jev also produced a borderline P3 target mention and some other source-supported concerns. These low-severity detections earned no primary credit. The study did not establish an ordering advantage.

We also tried “grouped contracts”: collecting a function together with its callers, guards and dependent behavior. The idea was to keep relationships visible rather than presenting disconnected excerpts. An early standalone screen looked promising. It did not carry over to the tool-enabled reviewer.

The comparison used DeepSeek V4.1 Flash through its direct API and ran 16 reviews: two collectors, two repetitions, three historical cases and one clean fixture. The current collector discovered two of 12 known-concern opportunities; the grouped collector discovered none. A concern tested twice contributes two opportunities. Grouping also took longer on average in that batch. We kept the current collector.

The failure was more specific than “the model needs context.” Long functions could still be represented by their opening and closing lines, leaving a decisive branch out of the middle. Tools sometimes recovered those lines. Even after reading relevant code, the model often did not connect it into a concrete failure case.

## Removing limits helped one investigation, not overall detection

Next we removed collection-distance and count limits, along with the verifier’s model-step cap. This did not make the entire system unlimited: prompt-byte budgets and run deadlines remained. The collector could find much more code than would fit in the context pack.

Across the full-review diagnostic, each arm confirmed one of 12 known-concern opportunities at any severity. Mean historical review time was 397 seconds with the limits and 379 seconds without them. That small difference did not establish a repeatable speed improvement. Broader collection frequently displaced the small definitions needed to finish an argument.

A focused replay gave a different answer. For the missed guard described above, two six-step verifier trials both ended without confirmation. Two uncapped trials both confirmed it, each after 21 model turns. The longer investigations traced the missing state transition. False controls stayed rejected.

That result justified testing the verifier’s allowance more carefully. It did not justify removing every limit. We later separated extra retrieval from the optional proof requirement and compared six and eight steps on two cases with the proof gate off:

Scroll horizontally to see every column.

| Configuration | Known concerns recovered | Combined replay time |
| --- | --- | --- |
| Default context, six steps | 2 / 3 | 88 seconds |
| Extra retrieval, six steps | 1 / 3 | 83 seconds |
| Extra retrieval, eight steps | 2 / 3 | 100 seconds |

This was one run per configuration per case, using frozen candidates, direct DeepSeek and low reasoning effort. It tested verification, not fresh discovery. Both false controls were rejected by every configuration. Eight steps matched default recovery and took longer in this pilot; we kept six as the default. A step is a model turn and can contain several tool calls.

## The handoff exposed two runtime defects

The API is stateless, but the review runtime maintains a session by sending prior messages and tool results with subsequent requests. A fresh verifier needs the relevant evidence passed explicitly.

We prototyped a revision-scoped ledger of successful source reads and supplied it alongside the original main pack. The larger handoff increased prompt size roughly fivefold. Across six comparable sessions, mean time rose from 30.8 to 48.5 seconds, without an overall quality win. One attempt also exposed a conflict at the step limit.

On the final allowed turn, the runtime instructed the model to produce a prose summary. Our verifier expected structured JSON. Recovery then forked the session and received a fresh step allowance. An apparent six-step verification had actually taken nine steps. We rejected that attempt from the fixed-budget comparison and stopped the batch.

Controlled tests showed that the native adapters preserved prior reasoning and tool results on the paths we checked. They also reproduced the final-turn conflict. We fixed the existing runtime:

- Both verification passes retain relevant main-page packs and cited rules within their budgets. Duplicates and omissions are handled explicitly.
- The capped final turn asks for the required verdict format.
- Recovery consumes only the remaining steps from the original allowance. Unknown accounting does not grant extra investigation.
- Each corrected finding is checked against its own delivered evidence. One source failure does not discard every other verdict in the batch.

These fixes shipped in [PR #282](https://github.com/pgup-ai/jbot-review/pull/282). They ensure that verification receives the intended context and stays within its total step allowance. The bulk-read prototype was not shipped, and these runtime fixes do not establish a general detection gain.

## Better source delivery still left an investigation gap

We then added retrieval for the code that creates a claimed state: writers, preparation guards, imported mappings, related methods and registered exception handlers. A dependency-focused revision improved targeted delivery checks from two of five source landmarks to all five in one case, and from zero of two to both in another.

The verdicts did not improve. In one replay, the verifier found the location of a needed downstream method, spent its remaining investigative turns elsewhere, and finished without reading the method body. In another, supplying the registered error handler moved the unresolved question to the concurrency scenario that could produce the error.

We also tested a proof requirement: a consequential confirmation should cite the trigger, state producer, guard and effect. Checking file paths, lines and quotes can establish that a citation matches the revision. It cannot establish that the cited lines form a valid causal argument.

A later trial appeared to raise confirmations from two of three concerns to three of three. On inspection, the additional confirmation relied on a test that manually created the state. It had not demonstrated an application path that could create it. The broader traversal also displaced useful source excerpts. We rejected the apparent gain and reverted that candidate change.

Retrieval and proof policy are now separate opt-ins: `state-evidence` adds source retrieval; `state-proof` adds the proof requirement as well. Producer indexing supports JavaScript and TypeScript. When citations are valid but a producer cannot be indexed, validation is reported as unavailable rather than silently treated as a disproved concern. A valid source quote remains insufficient by itself.

## What changed for users

The research ran alongside smaller fixes with clearer acceptance criteria. A source-index limit had left large changed files without context packs. Raising it from 256 KiB to 1 MiB made packs available on all four pages in one screen, instead of two. DeepSeek’s tool calls fell from 234 to 160 in that single comparison; finding quality was mixed. The larger index shipped, with prompt excerpt budgets unchanged.

Uncertain concerns are also easier to inspect. A collapsed section in the GitHub review preserves hypotheses and source links separately from confirmed inline findings and severity counts. The video shows that actual interface.

The video covers these eleven merged PRs, including the accompanying packaging and maintenance work:

Scroll horizontally to see every column.

| PR | Change |
| --- | --- |
| [\#272](https://github.com/pgup-ai/jbot-review/pull/272) | Remove the unproven pi engine and unused binary; harden Cline file reads against a symlink-swap race. |
| [\#273](https://github.com/pgup-ai/jbot-review/pull/273) | Index larger source files while preserving excerpt budgets. |
| [\#274](https://github.com/pgup-ai/jbot-review/pull/274) | Add optional evidence traces that distinguish new, supplied and repeated source reads. |
| [\#275](https://github.com/pgup-ai/jbot-review/pull/275), [\#276](https://github.com/pgup-ai/jbot-review/pull/276) | Update security dependencies; correct timeout diagnostics and flaky tests. |
| [\#277](https://github.com/pgup-ai/jbot-review/pull/277), [\#279](https://github.com/pgup-ai/jbot-review/pull/279) | Add a focused OpenCode image, then align its supported provider routes and update CLI pins. |
| [\#278](https://github.com/pgup-ai/jbot-review/pull/278) | Show unverified concerns in a collapsed review section. |
| [\#280](https://github.com/pgup-ai/jbot-review/pull/280), [\#281](https://github.com/pgup-ai/jbot-review/pull/281) | Simplify setup documentation and sanitize current public material; ship updated Git without its build dependencies. |
| [\#282](https://github.com/pgup-ai/jbot-review/pull/282) | Fix verifier context transfer, per-finding isolation and total step accounting; add optional state retrieval and proof checks. |

The context-pack preset and six-step verification allowance remain the defaults. Jev, state retrieval and the proof policy remain experimental. Raw evidence tracing is opt-in and can contain prompts and complete tool output; it is not a sanitized usage log.

## What these experiments can tell us

The historical cases were selected because they contained known concerns. Several were reused to diagnose failures. They are development cases, not untouched holdouts, and their results should not be read as a model leaderboard or a production accuracy estimate.

The later historical studies pinned repository revisions in independent Git databases, excluded future-fix objects and reference answers, and checked the fixtures before and after inference. Native tools were isolated from other checkouts and study artifacts. Earlier standalone, contaminated or protocol-invalid attempts are not evidence for the tool-enabled comparisons reported here.

The grouped, cap and later verifier studies used DeepSeek’s own API with OpenCode providing the session and tool runtime. The ordering study used the earlier OpenCode route. These are separate comparisons. We did not pool their runs into a single baseline. Low effort was held fixed in the direct studies; a medium/high or complexity-adaptive effort policy remains unproven here.

Most quality judgments came from source inspection by one operator. The private code and raw traces are not published. The [sanitized study summary](https://www.pgupai.com/assets/data/review-evidence-studies-20261004.json) records the counts, scopes and decisions used in this note, but it does not let an external reader independently reproduce the finding judgments. Our [earlier results appendix](https://www.pgupai.com/guides/deepseek-v4-1-flash-experiment-results) covers different search-context and compliance experiments.

We still have three problems to measure separately: discovering the issue, judging its severity, and preserving it through verification. One known concern was rated P3 at discovery. Better evidence transfer would not, on its own, correct that judgment.

The next experiment should test compact causal chains on fresh cases and score legitimate detections, false confirmations and time separately. The question is whether the reviewer can find the missing premise and use it correctly. Extra context bytes and a “confirmed” label are not enough to answer it.

## Related work

- [Earlier Jev relevance-ranking experiments](https://www.pgupai.com/guides/jev-relevance-ranking-code-review)
- [How context packs are assembled](https://www.pgupai.com/guides/context-pack-ai-code-review)
- [Search-context, sharding and compliance experiments](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization)
- [Our evaluation method and worksheet](https://www.pgupai.com/guides/evaluate-ai-code-review)

## Video text version

### Open chapter descriptions

### 0:00 · Better evidence

Follow the evidence through eleven merged PRs: what changed, what the experiments showed, and which questions remain open.

### 0:06 · Less friction

Clearer setup, direct-provider support in the OpenCode image, leaner packaging, safer reads, dependency updates, accurate timeout labels and less flaky testing. Packaging size is not a review-speed benchmark.

### 0:12 · Larger-file indexing

Source index cap: 256 KiB to 1 MiB. One selected PR: context on 2 of 4 pages before, 4 of 4 after; DeepSeek tool calls 234 to 160. One run per arm, discovery only; quality mixed.

### 0:20 · Unverified concerns

The actual GitHub interface expands a collapsed concern. Unresolved hypotheses and source links remain separate from confirmed inline findings and severity counts.

### 0:30 · Four explanations

We tested too little context, wrong evidence order, too little investigation time, and lost connections between review stages.

### 0:34 · Jev ordering

Original, Jev-last and shuffled order in 36 isolated runs retained no predefined target at P0–P2. Four runs retained exact target findings at P3, all matching the same concern, with one additional borderline P3 mention. There was no demonstrated ordering advantage.

### 0:42 · Grouped contracts

Related callers, guards and effects were bundled together. Sixteen direct-DeepSeek tool-enabled reviews: current collector discovered 2 of 12 known opportunities; grouped discovered 0 of 12. Grouping stayed off.

### 0:50 · Removing caps

Full-review confirmations were 1 of 12 in each arm; mean historical times 397 versus 379 seconds. One focused verifier case improved from 0 of 2 confirmations with six steps to 2 of 2 without the step cap, taking 21 turns each. Byte budgets and deadlines remained.

### 0:59 · Six versus eight

Two-case frozen verifier replay: default/six recovered 2 of 3 in 88 seconds; retrieval/six 1 of 3 in 83 seconds; retrieval/eight 2 of 3 in 100 seconds. All arms rejected both false controls. Default stayed six.

### 1:08 · Evidence handoff

The first reviewer passes relevant, revision-consistent context and rules to a fresh verifier. The verifier investigates missing premises independently. Bulk read transfer was experimental.

### 1:16 · Causal proof

A trigger, a state-producing path, a guard and an effect must connect. An apparent 3-of-3 confirmation result was rejected because the additional confirmation used manually prepared test state rather than an established application transition. The candidate change was reverted.

### 1:24 · Runtime reliability

Corrections use their own evidence, source failures are isolated, and recovery shares the total six-step allowance with the final verdict. Tracing distinguishes new evidence from repeated reads and remains opt-in.

### 1:32 · Release status

PRs 272 through 281 are merged. PR 282 is also merged, with evidence transfer and accounting fixes enabled in the default preset on main. State retrieval and proof policy remain opt-in. General bug-detection and severity gains are unproven.

### 1:40 · Next test

Find the missing link, build complete causal chains, test fresh cases and measure legitimate catches.

---

_Markdown representation of [https://www.pgupai.com/guides/evidence-handoffs-ai-code-review](https://www.pgupai.com/guides/evidence-handoffs-ai-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
