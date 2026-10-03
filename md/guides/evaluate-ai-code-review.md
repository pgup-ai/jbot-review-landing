Engineering notes · Methodology

# How to evaluate AI code review: accuracy, speed and cost

By [PGUP AI](https://www.pgupai.com/about) · Published October 3, 2026

Run both reviewers on the same frozen pull requests. Check what they found against the code, then compare the time and cost of the complete review. In our experiments, fewer tool calls and faster single runs weren’t enough to justify changing the default.

This guide is for engineers comparing tools or changing a review pipeline. It grew out of our [DeepSeek V4.1 Flash optimization experiments](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-optimization), where promising single runs did not hold up in repeated comparisons. The examples below come from that study; the evaluation method works for other models and tools too.

**In this guide**

- [Define a useful finding](https://www.pgupai.com/guides/evaluate-ai-code-review#quality)
- [Freeze the comparison](https://www.pgupai.com/guides/evaluate-ai-code-review#controls)
- [Measure accuracy and missed bugs](https://www.pgupai.com/guides/evaluate-ai-code-review#accuracy)
- [Measure speed and cost](https://www.pgupai.com/guides/evaluate-ai-code-review#performance)
- [Repeat before adopting](https://www.pgupai.com/guides/evaluate-ai-code-review#repeat)
- [Use the evaluation worksheet](https://www.pgupai.com/guides/evaluate-ai-code-review#worksheet)

## What counts as a useful AI code review finding?

Start with a claim a maintainer could check: an affected code path, a concrete trigger, a consequence and evidence. Record whether it is introduced by the change, already present at the base revision, contradicted by source, or still unresolved.

Keep runtime defects separate from test gaps, maintainability concerns and cosmetic suggestions. A valid test improvement is useful, but it should not silently replace a missed runtime bug in an aggregate score. Deduplicate comments about the same underlying concern before counting them.

In our final compliance experiment, one arm found three distinct supported concerns and the other found four. Only one concern was shared. The four-finding arm missed a reference concern caught twice by native. A higher count hid that loss.

## Freeze the comparison

For a pipeline experiment, change one intended variable and record the rest. For a comparison between products, each product may use its own native workflow; describe those differences and compare complete outputs rather than claiming to isolate a model effect.

- **Source:** freeze the base and head revisions, full diff, policy documents and prior-comment state. Include routine changes, cross-file changes and sensitive paths relevant to your team.
- **Execution:** record provider, model version or alias and date, reasoning settings, time limits, concurrency, grouping and retry behavior.
- **Passes:** state whether main review, guideline compliance, supplementary passes and finding verification run. A shard setting may change more than the main pass.
- **Delivery:** confirm every mandatory diff page completes and that the intended treatment actually reaches the model.

Check a new retrieval hook offline before buying more runs. Ours initially missed searches prefixed by a change-directory command. We retained the zero-packet runs as results for that implementation, then evaluated the fix with fresh native controls. Removing those runs after seeing their results would have favored the treatment.

A frozen diff alone does not freeze the service. Provider load and cache state can still change. Alternate the order of the two arms, avoid competing full-review processes when measuring isolated latency, and record conditions you cannot control. Test production throughput separately if shared queue contention is part of the question.

## Check accuracy against the code

**Review the source, not just the verifier’s verdict.** Preserve candidates, verification outcomes and final publication decisions separately. Verification can reject a valid concern or accept an unsupported one. Both happened in our experiments.

Where possible, hide the arm or vendor from whoever judges the findings. Have them record the code evidence and resolve disagreements. Different wording can describe the same defect; unresolved claims should stay unresolved.

Scroll the table horizontally to see every column.

| Measure | Meaning | Boundary |
| --- | --- | --- |
| Publication precision | Supported published findings ÷ (supported + unsupported published findings), after deduplication. | Report unresolved findings and adjudication coverage separately; do not silently drop them to improve the rate. |
| Reference recall | Reference defects detected ÷ relevant defects in a predefined reference set. | This is recall on that set. A union of model outputs is not a complete inventory of real bugs. |
| False-positive burden | Unsupported published findings per PR, plus human time spent dismissing them. | Precision’s complement is a false-discovery proportion, not automatically a statistical false-positive rate. |
| Severity and concern coverage | Which runtime, test and maintainability concerns each arm detects and publishes. | Several small suggestions do not compensate automatically for one serious missed defect. |

An empty result can mean a clean change, a missed bug or an incomplete review. Check completion and known references before deciding. A run with no candidates may need no verification call even when verification is enabled.

Our study had neither blind adjudication nor a complete bug inventory. We reported which concerns each arm caught, without claiming an overall recall percentage.

## Measure the whole review

Time the complete review, including verification and relevant recovery. Also record queue delay and process overhead if developers experience them. Preserve per-phase times to diagnose the result, but do not add them when phases overlap.

Count model tool calls and controller work separately. Moving a read into an orchestrator can make model-call counts look excellent while leaving total retrieval work unchanged. Track model turns, tool failures, added context, uncached input, cache reads and output usage where your telemetry supports them. Keep reasoning-token accounting consistent with the provider so it is not counted twice.

Costs should include billed retries and failed attempts. Label estimates separately from invoices and record the pricing basis. Cost per supported finding can be informative, but report cost per PR and severity too; do not report zero cost per finding when a run found nothing.

In our slim-compliance study, median compliance calls fell from 144 to 119. Median compliance time rose from 232.2 to 258.7 seconds. Fewer calls were an observed result; faster review was not a consistent consequence.

## How many runs do you need before changing the default?

We started with three repetitions per condition. That was enough to see promising results reverse, but too little to establish equivalent quality or a general speedup. The sample you need depends on the variation and the cost of getting the decision wrong.

Show individual paired results, medians, ranges and failures. A ratio of arm medians is not the same calculation as the median paired change. If the result is close to normal variation, use a larger, representative sample and a predefined quality tolerance before making an adoption claim. Keep fresh holdout PRs separate from the cases used to tune prompts.

Choose exclusion rules before inspecting outcomes. A timeout is usually part of reliability performance, not a result to erase. If a fixture is contaminated, retain the incident, explain the retry, and account for its cost. Our final study excluded one native attempt under its predeclared cleanliness rule and reran it without changing reviewer settings.

Write the adoption rule before you run the comparison. Ours was the same useful quality in less time, or better quality for an acceptable increase in time. An inconclusive result didn’t qualify.

## A practical AI code review evaluation worksheet

[Download the CSV worksheet](https://www.pgupai.com/assets/data/ai-code-review-evaluation-worksheet.csv). Use one row per run and a separate concern sheet for source assessments. Keep source revisions and raw traces private if they contain proprietary code. Publish sanitized measurements and describe what an outside reader can verify.

1. Select representative PR snapshots and build a reference concern set before showing it to the reviewer.
2. Freeze configurations and write the intended difference, exclusion rules and adoption criteria.
3. Run matched comparisons in alternating order; verify complete diff delivery and treatment delivery.
4. Assess the union of findings against source, ideally with independent blinded reviewers, and map each candidate to one underlying concern.
5. Compare concern coverage and unsupported publications first, then full-review time, cost and diagnostic metrics.
6. Try the surviving change on fresh PRs before changing the default.

The [worked results appendix](https://www.pgupai.com/guides/deepseek-v4-1-flash-experiment-results) shows where our own study meets this method and where it falls short. To run J-Bot on your repository, start with the [setup instructions](https://www.pgupai.com/#setup) or the [Action reference](https://github.com/pgup-ai/jbot-review-action#readme). Judge J-Bot by the same standard.

---

_Markdown representation of [https://www.pgupai.com/guides/evaluate-ai-code-review](https://www.pgupai.com/guides/evaluate-ai-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
