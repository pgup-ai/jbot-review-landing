Engineering notes · Experiment

# How do you get better code reviews from free AI models?

Published September 26, 2026

Give the model more room to think, then give it a second look. On a fixed set of real pull requests, raising Space Bunny’s reasoning effort from low to high took it from 2.5 to 6.5 of 27 known issues. In a separate test, a second review pass on each page doubled what it found, from 4.5 to 9.0 issues per run. Prompt changes, extra context and comment filters didn’t move the count.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI, with the model you choose. The cheapest way to run it is on a free model, so we spent a week of experiments on what makes free models review better. Below is what held up, what didn’t, and the research we checked it against.

**In this article**

- [The problem is recall](https://www.pgupai.com/guides/free-model-code-review-quality#recall)
- [Reasoning effort was the lever that worked](https://www.pgupai.com/guides/free-model-code-review-quality#effort)
- [Asking for more didn’t work](https://www.pgupai.com/guides/free-model-code-review-quality#prompts)
- [A second pass pays, at high effort](https://www.pgupai.com/guides/free-model-code-review-quality#second-pass)
- [More context didn’t help](https://www.pgupai.com/guides/free-model-code-review-quality#context)
- [Filters can’t tell good comments from bad](https://www.pgupai.com/guides/free-model-code-review-quality#filters)
- [What we’d do with a free model](https://www.pgupai.com/guides/free-model-code-review-quality#what-to-do)
- [FAQ](https://www.pgupai.com/guides/free-model-code-review-quality#faq)

**2.5 → 6.5** — known issues of 27, low versus high reasoning effort

**4.5 → 9.0** — known issues per run with a second pass on each page

**84%** — of J-Bot Review’s posted comments that developers acted on

**0.56** — AUC for a comment filter, where 0.5 is a coin flip

## The problem is recall

On one busy production repository, developers acted on 86% of the AI review comments that reached their pull requests, and on 84% of J-Bot Review’s. That’s close to the 73.8% resolution rate [Cihan et al. (2024)](https://arxiv.org/abs/2412.18531) reported for an LLM reviewer across 4,335 industrial pull requests.

The same audit showed the gap. Counting every valid issue that a human or any reviewer raised on those pull requests, J-Bot Review had caught 17 of 82. What it posted was mostly right, but it missed most issues, so the work below goes after recall.

One caution about the labels. [Karakaya et al. (2026)](https://arxiv.org/abs/2604.24525) found that developers fix or ignore bot comments for reasons beyond comment quality, such as deadline pressure, and that LLM judges agreed with developer labels only 44 to 62% of the time. We score against issues developers accepted, and we treat those labels as imperfect.

## Reasoning effort was the lever that worked

We ran Space Bunny, a free model from an anonymous lab, on four pull requests with 27 known issues, two runs per setting:

| Reasoning effort | Known issues found, of 27 | Median review time |
| --- | --- | --- |
| Low | 2.5 | 68 s |
| Medium | 3.0 | 94 s |
| High | 6.5 | 251 s |

At low effort Space Bunny reasoned for about a thousand tokens per session and posted about one candidate finding, whatever we asked of it. At high effort it reasoned far longer and found more than twice as many issues. J-Bot Review now runs Space Bunny at high effort [by default](https://github.com/pgup-ai/jbot-review#readme), and verification runs one tier lower.

The result fits the test-time compute research. [Snell et al. (2024)](https://arxiv.org/abs/2408.03314) found that on some problems, a model given more compute at inference beats one 14 times its size. There are two catches. Review time went up 3.7 times, and effort didn’t help every model. Muse Spark 1.3 found 1.0 of 15 known issues at low effort and 0.5 at medium, on two pull requests.

## Asking for more didn’t work

| Change, at low effort | Known issues found, of 27 |
| --- | --- |
| None (control) | 2.5 |
| Tell the model recall matters more than precision | 2.5 |
| Split the diff across 8 review pages | 3.0 |
| Swap a focused lens pass for a second main pass | 2.0 |
| Give each page a checklist of the rules mapped to its files | 1.5 |
| Cap the team guidelines at 24 KB | 2.5 |

None of them moved it. A model reasoning at low effort posted about one finding per session no matter what the prompt said. We now treat prompt wording as a way to shape what a model reports, not how much it finds.

## A second pass pays, at high effort

At low effort, a second main pass added nothing (2.0 of 27, above). At high effort it doubled recall. We gave every page a second, independent review by the same model and merged the two sets of findings. Known issues went from 4.5 to 9.0 per run, across four pull requests and two runs each. The second pass won 6 of 8 pairs and tied the other 2, and review time went up 58%.

The two passes barely overlapped. In a calibration run on 12 pull requests with 54 known issues, two identical passes found 4 each, with none in common. Detections behaved like independent draws, so a second draw adds nearly its full count.

[Brown et al. (2024)](https://arxiv.org/abs/2407.21787) describe the same shape for code generation: the share of problems solved by at least one sample keeps rising as you draw more samples. The part that doesn’t carry over is voting. Self-consistency ([Wang et al., 2022](https://arxiv.org/abs/2203.11171)) keeps the answer most samples agree on, which suits a math problem with one right answer. Review findings rarely agree, so a vote would throw away most of what the second pass found. We merge by union and let the verifier judge each finding.

The second pass isn’t shipped yet. Merging by exact file and line let near-duplicates through, and one run posted 7 comments about the same cluster of lines.

## More context didn’t help

[Lu et al. (ICML 2025)](https://arxiv.org/abs/2505.17928) doubled defect detection in an industrial C++ reviewer by giving the model code slices that follow data and control flow through each changed function. We built a flow slice for TypeScript and used it in place of whole enclosing functions. Across four pull requests it found 5 known issues against the control’s 6, inside run-to-run noise, while reviews ran about 19% faster on 16% less reasoning. The speed-up reproduced. The recall gain didn’t.

We tried four more context changes: a short generated summary of the change, signature-only definitions, a leaner prompt with no context pack, and a second pass that saw only the diff. None beat the current [context pack](https://www.pgupai.com/guides/context-pack-ai-code-review). One looked like a win, 7 known issues against 4 over eight paired reviews, and a confirmation round erased it. Pooled over 12 paired reviews, the control found 8 and the change 9. With about one known issue per pass per review, a four-review round can only detect effects of roughly double. We no longer trust a single round.

## Filters can’t tell good comments from bad

If most posted comments are right, a filter could remove the rest. We tested one. An off-the-shelf relevance model, used zero-shot, scored 300 real review comments that developers had either acted on or declined, each with its diff hunk. Its scores separated the two groups with an AUC of 0.56, where 0.5 is a coin flip. It rated about 77% of both groups as supported by the code. A keyword heuristic did no better, at 0.54.

The reasons developers declined comments explain why: the fix was handled elsewhere or the claim was wrong (33), the behavior was by design (30), the comment was unclear (29), or the issue wasn’t worth fixing (18). Most of that lives outside the hunk, so a filter that reads only the comment and the hunk can’t judge it.

Verification works because the verifier can read the repository. We tested softening its default stance, which assumes each finding is wrong until the code proves it right. A neutral verifier confirmed the same 8 of 9 known issues, plus 2 extra findings that were both false. OpenAI’s CriticGPT work reported the same tension in trained critics, between catching more bugs and producing hallucinated bugs and nitpicks ([McAleese et al., 2024](https://arxiv.org/abs/2407.00215)). We kept the skeptical verifier.

## What we’d do with a free model

1. **Pick a model that reasons, and let it.** High effort is J-Bot Review’s default for Space Bunny. For other models, set `model-options`. The option below restates Space Bunny’s default.
2. **Check that the model posts anything.** Some free models return empty reviews at low effort. If yours has posted nothing after a week of pull requests, raise its effort or switch models.
3. **Keep the verifier skeptical.** Don’t swap it for a filter that can’t see the repository.
4. **Budget the time.** High effort took Space Bunny from about a minute per review to about four. The default 30-minute `time-budget-minutes` covers that.

`.github/workflows/jbot-review.yml · review step`

```yaml
      - uses: pgup-ai/jbot-review-action@v0
        with:
          model: opencode/space-bunny-free
          model-options: '{"reasoningEffort":"high"}'
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

The pull requests in these tests come from private repositories, so the raw logs stay private. The defaults they led to are in the [J-Bot Review README](https://github.com/pgup-ai/jbot-review#readme).

## FAQ

### Can a free AI model do useful code review?

Yes, within limits. At high reasoning effort, the free Space Bunny model found 6.5 of 27 known issues on our test pull requests at about four minutes per review, and developers acted on 84% of the comments J-Bot Review posted in production. Free routes have daily quotas, and some free models return empty reviews at low effort.

### Does reasoning effort matter for AI code review?

It was the biggest lever we found. Space Bunny found 2.5 of 27 known issues at low effort, 3.0 at medium and 6.5 at high, while the median review time rose from 68 to 251 seconds. It didn’t help every model. Muse Spark 1.3 found no more at medium than at low.

### Should you run an AI code reviewer twice on the same pull request?

At high effort, yes, if you merge the findings instead of voting on them. A second independent pass per page took known issues from 4.5 to 9.0 per run, because the two passes rarely found the same issues. Expect about 58% more review time, and deduplicate near-identical findings.

### Can an LLM filter out bad AI code review comments?

Not from the comment and the diff alone. A zero-shot relevance model separated comments developers acted on from the ones they declined with an AUC of 0.56, barely better than chance. Most declines depended on context outside the hunk, such as a fix made elsewhere or behavior that was intentional. A verifier that can read the repository did better.

## References

- Snell, Lee, Xu and Kumar. [Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters](https://arxiv.org/abs/2408.03314). arXiv:2408.03314, 2024.
- Brown, Juravsky, Ehrlich, Clark, Le, Ré and Mirhoseini. [Large Language Monkeys: Scaling Inference Compute with Repeated Sampling](https://arxiv.org/abs/2407.21787). arXiv:2407.21787, 2024.
- Wang et al. [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171). arXiv:2203.11171, 2022.
- Lu, Jiang, Li, Fang, Zhang, Yang and Zuo. [Towards Practical Defect-Focused Automated Code Review](https://arxiv.org/abs/2505.17928). ICML 2025, arXiv:2505.17928.
- McAleese, Pokorny, Ceron Uribe, Nitishinskaya, Trebacz and Leike. [LLM Critics Help Catch LLM Bugs](https://arxiv.org/abs/2407.00215). arXiv:2407.00215, 2024.
- Cihan et al. [Automated Code Review In Practice](https://arxiv.org/abs/2412.18531). ICSE SEIP 2025, arXiv:2412.18531.
- Karakaya, Torun, Uçar and Tüzün. [Understanding the Limits of Automated Evaluation for Code Review Bots in Practice](https://arxiv.org/abs/2604.24525). arXiv:2604.24525, 2026.

## Related

- **Guide** — [Which free model to use](https://www.pgupai.com/guides/free-ai-models-code-review): Free models for code review, where they’re $0, and the quotas you’ll hit.
- **Guide** — [Space Bunny code review](https://www.pgupai.com/guides/space-bunny-code-review-github-actions): Setup, exact model ids and the effort trade-off.
- **Engineering** — [Repository maps](https://www.pgupai.com/guides/repository-map-ai-code-review): A map of every file didn’t save the reviewer any lookups.

---

_Markdown representation of [https://www.pgupai.com/guides/free-model-code-review-quality](https://www.pgupai.com/guides/free-model-code-review-quality). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
