Engineering notes · Experiment

# DeepSeek V4.1 Flash experiment results and methodology

By [PGUP AI](https://www.pgupai.com/about) · Published October 3, 2026

The data behind our DeepSeek V4.1 Flash code-review experiments: 36 valid repeated reviews, separate exploratory screens and one excluded slim-compliance attempt. They support comparisons within each study, not a pooled model benchmark.

[Download the sanitized JSON results](https://www.pgupai.com/assets/data/deepseek-review-experiments-20261003.json) or read the [experiment narrative](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization). The source PRs are private. We publish anonymous case labels, review settings and measurements. Repository identities, exact diff sizes, code, finding details, prompts and internal report identifiers are omitted. You can check the arithmetic, but you can’t independently verify the findings from this export.

## Study definitions and controls

All rows below use direct DeepSeek V4.1 Flash, low reasoning and at most 10 concurrent sessions. Full reviews ran sequentially, in local dry-run mode. Native includes existing context packs, compliance and the normal supplied-evidence-first verifier with repository fallback. Zero-candidate runs naturally have nothing to verify.

- **Search context:** three frozen cases × two arms × three repetitions. Main-only source augmentation with eight attempts per main session.
- **Search recognition:** fresh case C controls after fixing eligibility for searches prefixed by a literal change-directory command. Other augmentation limits remain.
- **Compliance ablation:** six fresh case B reviews, native versus compliance disabled. Main receives its normal scheduling notice to inspect omitted guidance when applicable. Neither arm detected the reference concern identified before the experiment.
- **Slim compliance:** fresh case C controls; scoped-rule removal after native pagination and code-context assembly. No search augmentation and no new lookup caps.

Scroll the table horizontally to see every column.

| Case | Size group | Main / compliance pages |
| --- | --- | --- |
| A | Small | 1 / 1 |
| B | Small | 1 / 1 |
| C | Large | 4 / 4 |

Elapsed times below cover the review pipeline, excluding small process startup and teardown overhead. Phases can overlap. Costs are estimated USD from saved SDK/provider usage. Provider cache state was not reset. Local shell behavior and dry-run prior-thread handling limit transfer to GitHub CI timings.

## Every valid repeated run

N = native. T = main-only search context in the first two studies, slim compliance in the third, or compliance disabled in the ablation. M/C counts are raw main/compliance candidates before filtering. Published means the pipeline would publish in dry-run mode; no comments were sent, and this count is not a count of independently confirmed bugs.

### Main-only search context

Scroll the table horizontally to see every column.

| Case / pair / arm | Review seconds | Model tool calls | M / C candidates | Would publish | Est. USD |
| --- | --- | --- | --- | --- | --- |
| A / 1 / N | 143.592 | 60 | 0 / 0 | 0 | $0.0592 |
| A / 1 / T | 167.749 | 80 | 0 / 0 | 0 | $0.0659 |
| B / 1 / T | 253.832 | 73 | 0 / 0 | 0 | $0.0842 |
| B / 1 / N | 514.775 | 97 | 2 / 1 | 1 | $0.1470 |
| C / 1 / N | 438.188 | 287 | 2 / 2 | 1 | $0.3506 |
| C / 1 / T | 480.160 | 285 | 3 / 1 | 4 | $0.3415 |
| C / 2 / T | 678.609 | 323 | 3 / 3 | 2 | $0.4101 |
| C / 2 / N | 619.606 | 329 | 2 / 1 | 3 | $0.3805 |
| A / 2 / T | 184.978 | 69 | 0 / 2 | 2 | $0.0748 |
| A / 2 / N | 136.166 | 65 | 0 / 0 | 0 | $0.0596 |
| B / 2 / N | 352.312 | 76 | 1 / 0 | 0 | $0.0867 |
| B / 2 / T | 411.064 | 84 | 0 / 0 | 0 | $0.0992 |
| B / 3 / T | 255.417 | 76 | 1 / 0 | 0 | $0.1022 |
| B / 3 / N | 248.571 | 65 | 0 / 0 | 0 | $0.0782 |
| C / 3 / N | 434.826 | 280 | 2 / 3 | 5 | $0.3622 |
| C / 3 / T | 691.786 | 380 | 2 / 2 | 2 | $0.4447 |
| A / 3 / N | 191.046 | 67 | 0 / 2 | 2 | $0.0699 |
| A / 3 / T | 150.391 | 71 | 0 / 1 | 1 | $0.0611 |

### Corrected search recognition

Scroll the table horizontally to see every column.

| Case / pair / arm | Review seconds | Model tool calls | M / C candidates | Would publish | Est. USD |
| --- | --- | --- | --- | --- | --- |
| C / 1 / N | 342.220 | 274 | 1 / 1 | 2 | $0.3541 |
| C / 1 / T | 498.579 | 356 | 0 / 4 | 4 | $0.3988 |
| C / 2 / T | 567.584 | 274 | 1 / 0 | 1 | $0.3611 |
| C / 2 / N | 379.109 | 337 | 1 / 2 | 3 | $0.4038 |
| C / 3 / N | 431.750 | 371 | 0 / 2 | 1 | $0.4160 |
| C / 3 / T | 419.816 | 244 | 3 / 1 | 4 | $0.3354 |

### Slim compliance

Scroll the table horizontally to see every column.

| Case / pair / arm | Review seconds | Model tool calls | M / C candidates | Would publish | Est. USD |
| --- | --- | --- | --- | --- | --- |
| C / 1 / N | 346.334 | 322 | 1 / 1 | 2 | $0.3821 |
| C / 1 / T | 387.311 | 335 | 1 / 1 | 1 | $0.3897 |
| C / 2 / T | 425.003 | 299 | 0 / 4 | 3 | $0.3800 |
| C / 2 / N | 581.479 | 410 | 1 / 2 | 3 | $0.4725 |
| C / 3 / N | 366.937 | 326 | 0 / 1 | 1 | $0.3797 |
| C / 3 / T | 340.796 | 298 | 3 / 1 | 4 | $0.3393 |

### Compliance-off ablation · not adopted

Verification stayed enabled but had no candidates to check. The quality reference was missed in all six runs.

Scroll the table horizontally to see every column.

| Case / pair / arm | Review seconds | Model tool calls | M / C candidates | Would publish | Est. USD |
| --- | --- | --- | --- | --- | --- |
| B / 1 / N | 465.736 | 92 | 0 / 0 | 0 | $0.1140 |
| B / 1 / T | 155.451 | 33 | 0 / 0 | 0 | $0.0328 |
| B / 2 / T | 530.167 | 58 | 0 / 0 | 0 | $0.0769 |
| B / 2 / N | 311.073 | 132 | 0 / 0 | 0 | $0.1257 |
| B / 3 / N | 184.255 | 65 | 0 / 0 | 0 | $0.0768 |
| B / 3 / T | 196.104 | 39 | 0 / 0 | 0 | $0.0425 |

## Exploratory pass-placement and shard screens

One observation per configuration on case C. These are separate from the repeated comparisons. The main-only screen has the earlier eight-attempt augmentation allowance; newer auxiliary and all-stage screens remove attempt, match-count and source-count caps, while byte budgets and collection deadlines remain. Do not infer a placement-only causal effect across those variants.

Scroll the table horizontally to see every column.

| Configuration | Main / compliance pages | Seconds | Model tool calls | Est. USD |
| --- | --- | --- | --- | --- |
| Native | 4 / 4 | 585.3 | 260 | $0.3425 |
| Treatment: main only (capped) | 4 / 4 | 393.4 | 314 | $0.3984 |
| Treatment: compliance | 4 / 4 | 368.6 | 273 | $0.3689 |
| Treatment: compliance + verification | 4 / 4 | 512.4 | 309 | $0.3871 |
| Treatment: main + compliance + verification | 4 / 4 | 343.4 | 272 | $0.3646 |
| Native: 1 shard | 1 / 1 | 378.6 | 119 | $0.1454 |
| Native: 3 shards | 3 / 3 | 403.3 | 284 | $0.3320 |

Augmented screens also perform controller source loads outside the model tool-call counter. The all-stage screen used 178 extra source loads and 272 model tool calls, versus 260 model tool calls for its native observation. Its 343.4-second review did not demonstrate equivalent finding coverage. The shard setting changes both main and compliance grouping, so it is a whole-pipeline comparison.

## What the final slim-compliance quality counts mean

Scroll the table horizontally to see every column.

| Across three runs per arm | Native | Slim |
| --- | --- | --- |
| Distinct supported concerns detected | 3 | 4 |
| Supported finding occurrences that would publish | 4 | 4 |
| Unsupported occurrences that would publish | 2 | 2 |
| Unresolved occurrences that would publish | 0 | 2 |
| Reference concern detected | 2 / 3 | 0 / 3 |

Only one supported concern was shared between arms. One assessor checked findings against source with knowledge of earlier results. The counts describe those assessments, not full recall or independent blind grades. The rule for the reference concern in the last row was present in both arms.

## Excluded, historical and untested work

The original second native attempt in the slim study took 503.665 seconds and cost an estimated $0.3983. It wrote an untracked diff cache, violating the predeclared clean-fixture condition. Tracked source was unchanged. We preserved the failure, restored the fixture and retried with identical source and configuration. Six valid slim-study runs cost $2.3434; including that attempt, $2.7416. The JSON retains its reason, time and cost.

Earlier staged-hybrid runs used OpenCode Go, including a concurrency-three setup. Later gateway attempts included quota failures. A superseded direct-API pilot used one page, while the requested automatic grouping produced four. The original GitHub job also used a different auxiliary model and prior-thread behavior. Those records informed the investigation but are not numerical controls in this public matched table.

An offline contribution audit covered 24 earlier completed reviews; it added no paid runs. It found useful compliance-only concerns on the large case. A six-run skip-compliance ablation produced no findings in either arm and missed the predefined reference concern every time. It reduced cost but did not establish quality parity; we abandoned that direction in favor of keeping the pass. The slim study’s single-page case B was a byte-identical no-op in preflight and was not rerun. Dynamic compliance depth and LLM-directed effort were not tested.

Settings were fixed within each comparison. The reviewer changed between studies, so their native runs shouldn’t be pooled into one baseline.

For the interpretation, read [the DeepSeek optimization case study](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization). For the evaluation method, read [how to evaluate AI code review](https://www.pgupai.com/guides/evaluate-ai-code-review).

---

_Markdown representation of [https://www.pgupai.com/guides/deepseek-v4-1-flash-experiment-results](https://www.pgupai.com/guides/deepseek-v4-1-flash-experiment-results). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
