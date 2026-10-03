Engineering notes · Experiment

# Can fewer tool calls improve DeepSeek V4.1 Flash code review?

By [PGUP AI](https://www.pgupai.com/about) · Published October 3, 2026

We tried to speed up DeepSeek V4.1 Flash code review by giving it more context and less reason to search the repository. It didn’t reliably help. The final experiment cut median compliance tool calls by 17.4%, but median review time rose 5.6%, and the findings changed. We kept the native pipeline.

The starting question was reasonable: we already supply the diff and surrounding code, so why does the model keep reading files? We tested extra context in search results, applied it at different review stages, changed parallel grouping, and trimmed compliance rules. Several single runs looked faster. The repeated comparisons were much less convincing.

The experiments changed how J-Bot Review supplies context and runs its review passes. [DeepSeek’s release notes](https://api-docs.deepseek.com/news/news260910/) identify V4.1 Flash as the model behind the API alias `deepseek-flash` at the time of these runs.

**In this article**

- [What “native” means](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#baseline)
- [Why the reviewer still explored](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#context)
- [The experiments and repeated results](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#experiments)
- [One shard versus three](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#shards)
- [The compliance-off ablation](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#ablation)
- [Slim compliance: fewer calls, different findings](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#compliance)
- [Small versus large pull requests](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#small-prs)
- [What we kept](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization#decision)

## The baseline and test setup

**Native already included context packs.** It supplied the diff and selected surrounding code, ran main review and a separate check against repository guidelines, then verified candidate findings. These experiments built on the existing [context-pack approach](https://www.pgupai.com/guides/context-pack-ai-code-review).

The repeated studies used direct DeepSeek V4.1 Flash throughout, low reasoning effort, automatic grouping and a maximum of 10 concurrent sessions. Full PR reviews ran one after another. We used two small PRs, A and B, and a larger PR, C. A and B used one main and one compliance page; C used four of each. Every review received its complete selected diff. We’ve omitted source details because the PRs are private.

We froze each PR snapshot and ran three repetitions per arm and case: 18 reviews for the size comparison, six after correcting search recognition, six for a compliance-off ablation, and six for slim compliance. Each study has its own native controls; we compare within those groups. The [results appendix](https://www.pgupai.com/guides/deepseek-v4-1-flash-experiment-results) contains all 36 valid repeated runs, the exploratory screens and the excluded attempt.

## Why did DeepSeek keep making repository tool calls?

A complete diff still leaves out unchanged code. A helper or caller outside the supplied excerpt can decide whether a suspected bug is real. Seeing a file mentioned in the prompt wasn’t enough to call a later read redundant.

Our search-context treatment appended source excerpts to search results, hoping to save the next file read. The model could still look up anything else it needed. In the repeated main-only studies, an eight-attempt allowance limited automatic augmentation, not the model’s own tool calls.

We also found a delivery bug in the experiment: a search prefixed with a literal change-directory command bypassed the hook. The slowest page in the large case received zero packets in all three initial treatment repetitions. We kept those runs in the results, fixed recognition, and ran fresh controls. The corrected page received 5, 5 and 4 packets, but still took longer than its native counterpart in all three pairs.

Fixing the hook got the excerpts into the prompt. It didn’t make that page faster.

## What held up after repeated runs

Early staged experiments moved retrieval into controller-driven batches. Later search-context experiments kept native sessions and enriched their search outputs. Those are different interventions. The older gateway runs also used different concurrency from the later direct-API runs. We did not treat their lower model-call counts as an equivalent reduction in total repository work: controller retrieval was outside that counter.

We screened augmentation on main only, compliance only, compliance plus verification, and all three stages. Some full reviews finished sooner, but the untouched main pass also varied substantially. Those single observations were leads for further testing, not proof that the changed stage caused the speedup.

Each median below comes from three runs. “Treatment faster” counts how often it beat its paired native run. Small case B shows why both matter: a lower median can still mean losing two of three pairs.

Scroll the table horizontally to see every column.

| Matched comparison | Median review time, native → treatment | Median total tool calls | Treatment faster |
| --- | --- | --- | --- |
| Search context · small A | 143.6 → 167.7 s | 65 → 71 | 1/3 |
| Search context · small B | 352.3 → 255.4 s | 76 → 76 | 1/3 |
| Search context · large C | 438.2 → 678.6 s | 287 → 323 | 0/3 |
| Corrected search recognition · C | 379.1 → 498.6 s | 337 → 274 | 1/3 |
| Slim compliance · C | 366.9 → 387.3 s | 326 → 299 | 2/3 |

On large case C, the initial main-only treatment was slower in all three pairs. After fixing search recognition, median total calls fell from 337 to 274, yet median time rose from 379.1 to 498.6 seconds. Main calls rose in two of three pairs and fell in the third; the median increased from 185 to 189. Call counts also varied in the unchanged auxiliary passes, so the overall reduction isn’t evidence of better main-stage retrieval.

## One shard versus three

More shards didn’t help in this single comparison. One shard finished in 378.6 seconds with 119 model tool calls; three finished in 403.3 seconds with 284 calls. Main wall time was almost identical: 340.9 versus 341.4 seconds.

This setting changed both main and compliance grouping, from one plus one page to three plus three. It also changed which supporting context fitted each page. It was not an isolated test of main parallelism. More retained comments included useful concerns and questionable claims, so this screen established neither a speed nor a quality winner.

## Removing compliance didn’t establish quality parity

An earlier six-run ablation on small case B switched compliance off while keeping native main review and verification. Calls and estimated cost fell in every pair, but review time improved in only one of three pairs. All six runs missed a reference concern we had identified in the source beforehand. Zero findings in both arms did not establish adequate recall or equivalent quality. We abandoned skipping compliance and moved to slimming it while keeping the pass enabled.

## Slim compliance cut calls, but changed the findings

For the final experiment, each compliance page received only the scoped rules selected for its files, plus the unchanged global and required rules. The prompt listed omissions, and the model could still read the full guidance. We kept pagination and code context fixed, so removing rules didn’t add room for extra code. Rule bytes fell 8.53%; one of the four pages was unchanged. Main review and verification stayed native.

Scroll the table horizontally to see every column.

| Metric · median of three | Native | Slim compliance |
| --- | --- | --- |
| Full review | 366.9 s | 387.3 s |
| Compliance | 232.2 s | 258.7 s |
| Compliance tool calls | 144 | 119 |
| Total tool calls | 326 | 299 |
| Estimated cost per review | $0.3821 | $0.3800 |

Compliance used fewer calls in all three pairs, but finished faster in only one. Whole-review times were 346.3 → 387.3, 581.5 → 425.0 and 366.9 → 340.8 seconds. The unusually slow second native run matters. We report all pairs rather than choosing the average or median that looks best.

Native found three distinct concerns supported by our source checks; slim found four. Only one was shared. A reference concern caught in two native runs was missed in every slim run, even though its rule remained in the prompt. Some of slim’s additional findings came from main review, whose prompt hadn’t changed. We couldn’t credit those to slimmer compliance.

Across the three runs, each arm would have published four findings supported by our source checks, counting repeated detections separately. Native would also have published two unsupported findings; slim, two unsupported and two unresolved findings. These were dry runs: nothing was posted to GitHub.

One assessor checked the source and knew the earlier findings. That limits the quality comparison: we didn’t have blind adjudication or a complete bug inventory. The private finding details aren’t included here.

## Should optimization depend on pull request size?

The size study gave us no basis for a small-PR or large-PR policy. The treatment was faster in only one of three pairs on each small case, and none on the large one.

For page-specific slim compliance, case B’s one-page input was byte-identical to native in preflight. We did not pay for a no-op rerun. The routing algorithm had nothing to trim on that case. We haven’t tested whether dependencies, applicable rules or page boundaries would be useful inputs to an adaptive policy.

## Why we kept native review

We kept native main review, native compliance and native verification on top of the existing context packs. We wanted the same useful findings sooner, or better findings at an acceptable time cost. None of these changes met that bar consistently enough to ship.

An audit of earlier runs also found useful concerns contributed only by compliance. We kept that pass. Dynamically changing its depth, or asking an LLM to choose the effort, would need a separate experiment.

Our earlier [context-pack results](https://www.pgupai.com/guides/faster-ai-code-review-results) concern different interventions and workloads. Those gains were already in the baseline we tested here.

One native attempt failed a predeclared cleanliness check after a shell command wrote an untracked diff cache. We preserved its record, restored the fixture and retried with unchanged source and settings. It is excluded from paired effects but included in reported spend. The final six valid runs cost an estimated $2.3434; the extra attempt added $0.3983. These are recorded provider-rate estimates, not current price quotes or invoices.

For your own reviewer, start with [our evaluation method and worksheet](https://www.pgupai.com/guides/evaluate-ai-code-review). To try the same model with J-Bot, follow the [DeepSeek V4.1 Flash setup guide](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-github-actions).

---

_Markdown representation of [https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
