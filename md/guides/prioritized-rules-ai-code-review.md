Engineering notes · Experiment

# Do fewer, prioritized rules make an AI code reviewer faster?

Published September 26, 2026

Short answer: no. We trimmed the rules our AI code reviewer reads by 40% and put the critical ones first. Review time didn’t move beyond run-to-run noise, and the main review caught 4 known bugs instead of 6.

The idea sounded obvious. A reviewer carrying 24 KB of house rules has to wade through style notes to find the invariants that matter, so give it less to read and point it at what counts. We expected a modest speedup, somewhere around 10 to 20%. We didn’t get one.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI. It reads your team’s written rules, such as AGENTS.md, REVIEW.md and the docs they link to. The dedicated guideline-compliance pass gets up to 96 KB of them, and the main review gets 24 KB, starting with the sections that name the changed files ([how that works](https://www.pgupai.com/guides/ai-code-review-team-guidelines)). This test only touched the main review’s 24 KB.

**In this article**

- [What we changed](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#the-idea)
- [How we tested it](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#the-test)
- [Did it get faster?](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#results)
- [Why shorter rules didn’t save time](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#why-not-faster)
- [What the research says about rule count](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#research)
- [What we’d do instead](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#readings)
- [FAQ](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#faq)

**24.5 → 14.6 KB** — rule text sent to the main review

**0.96×** — review time with prioritized rules, 95% interval 0.70 to 1.32

**+51–79%** — more reasoning tokens on Space Bunny

**6 → 4** — of 13 known bugs caught by the main review

## What we changed

Normally the main review gets 24 KB of rule sections, ordered by how closely each one names the changed files. We swapped that for three tiers, ranked by relevance times priority:

- **Full text** for the top sections, up to 10 KB.
- **One line each** for the next ones, up to 4 KB. That’s the section title plus its first sentence.
- **A count** of the rest, with a note that the compliance pass still checks every rule.

Priority came from keywords in the document name and section title. Invariant, security, money, transaction and migration doubled a section’s weight. Style, comment, naming and formatting halved it. The block told the model to check the full-text rules against the change and to cite a one-liner only for a clear violation.

We had to guess priority because the repository never states it rule by rule. It has a doc of invariants, a doc of coding standards and a list of blockers in its review rubric, and that’s it. The keywords guessed wrong at least once. A section about moving old code to a new API scored as critical because its title has the word migration in it.

## How we tested it

We reused the two pull requests from our [repository-map test](https://www.pgupai.com/guides/repository-map-ai-code-review). They come from a production TypeScript monorepo, one touching 4 files and the other 8, and developers had already accepted 13 issues in them. That gave us a way to check whether a review still caught what it should.

Four models ran through OpenCode at high reasoning effort: Space Bunny, Muse Spark 1.3, LongCat 2.5 Preview and DeepSeek V4.1 Flash. Each setup ran once per pull request, 16 reviews in all. Verification was off, so we scored raw findings, and the compliance pass was identical in both setups. DeepSeek cost $0.57 for its four reviews. The other models had no per-token cost.

One run each is a quick screen, not a verdict. Review times wander a lot from run to run, and that turns out to matter.

## Did it get faster?

Totals for both pull requests:

| Model | Main-review time, before → after | Reasoning tokens | Known bugs caught by the main review |
| --- | --- | --- | --- |
| Space Bunny | 296 s → 413 s | 32K → 55K | 3 → 2 |
| Muse Spark 1.3 | 396 s → 287 s | 30K → 22K | 1 → 0 |
| DeepSeek V4.1 Flash | 1,265 s → 1,168 s | 163K → 161K | 2 → 2 |

No pattern. Space Bunny got slower on both pull requests, Muse Spark got faster on both, and DeepSeek went one each way. Pair every run with its twin and the prioritized version took 0.96 times as long, with a 95% interval from 0.70 to 1.32. In plain terms, we can’t tell it apart from zero. A single review swings about 40% between identical runs, so spotting a real 15% gain would take roughly 47 pairs of pull requests.

Quality moved the wrong way, if it moved at all. Across every pass both setups caught 8 known bugs. In the main review, the only pass we changed, prioritized rules caught 4 against 6. Too few runs to be sure, but not encouraging.

We left LongCat 2.5 Preview out of the table. It posted nothing in any of its four runs, took 6 to 29 minutes each, and one run hit the time limit.

## Why shorter rules didn’t save time

The rules just weren’t where the time went. They made up a quarter to a third of each page’s first prompt, and after the first turn the provider serves that prompt from cache. One study of prompt caching on OpenAI, Anthropic and Google found it cut API cost by 41 to 80% but time to first token by only 13 to 31% ([Lumer et al., 2026](https://arxiv.org/abs/2601.06007)). The minutes go into reasoning and tool calls.

We had a hint of this already. In our [speed experiments](https://www.pgupai.com/guides/ai-code-review-speed-experiments), loading only the rule sections mapped to the changed files took the rules from 24.6 KB to 13.5 KB, and the review still took about 33 seconds.

The wording probably hurt. Space Bunny burned 79% more reasoning tokens on one pull request and 51% more on the other. Studying models that follow many instructions at once, Harada et al. watched DeepSeek R1 “explicitly check each given instruction one by one” ([2025](https://arxiv.org/abs/2509.21051)). Head a block “rules to check against this diff” and a reasoning model will do exactly that, rule by rule.

## What the research says about rule count

We read the recent papers before and after running this. Four findings bear on it:

- **More instructions do hurt, but slowly at this scale.** On a benchmark of up to 500 simultaneous instructions, the best models hit only 68% accuracy at 500, and the authors note a trade-off between accuracy and latency ([Jaroslawicz et al., 2025](https://arxiv.org/abs/2507.11538)). A review’s few dozen rule sections sits far below that.
- **Similar-looking rules confuse models.** On RuleArena, models struggled to pick the rules that applied and mixed up similar but distinct ones ([Zhou et al., 2024](https://arxiv.org/abs/2412.08972)). Distracting context cut reasoning models’ scores by up to 80%, and prompting or context engineering didn’t fix it ([Lee et al., 2026](https://arxiv.org/abs/2601.07226)).
- **Conditional rules are the ones that slip.** In AgentIF, built from 707 real agent instructions, more than 30% of errors came from misjudging whether a conditional rule applied ([Qi et al., 2025](https://arxiv.org/abs/2505.16944)). Most code review rules are conditional, and those are the ones a keyword ranking pushes down.
- **One-line summaries throw away the useful part.** The ACE authors call it brevity bias. Condensed context drops domain detail, and their detailed playbooks beat concise ones by 10.6% on agent tasks ([Zhang et al., 2025](https://arxiv.org/abs/2510.04618)). A one-liner tells the model a rule exists, not what it asks for.

The closest study to ours looked at AGENTS.md files for coding agents. They didn’t generally raise success rates, and they pushed inference cost up by more than 20% ([Gloaguen et al., 2026](https://arxiv.org/abs/2602.11988)). So even deleting the rules outright would save something like that, which is still inside our noise.

## What we’d do instead

This is our read of the data, not a result:

- **Relevance ranking already does the useful part.** The main review’s 24 KB starts with the sections that name the changed files. Priority tiers on top mostly shuffled text around.
- **Telling a model what matters makes it do more work.** Our speed experiments showed the same thing. Everything that worked removed turns, and nothing worked by instructing the model.
- **Learn priority from outcomes, not titles.** ByteDance’s production reviewer keeps a taxonomy of review rules and tunes it from feedback on its comments, reaching 75.0% precision ([Sun et al., 2025](https://arxiv.org/abs/2501.15134)). Which rules developers actually act on is a better signal than which words a heading uses.

So we changed nothing. The main review keeps its 24 KB ranked slice and the compliance pass keeps its 96 KB. If you want a faster AI reviewer, reasoning effort, model choice and the number of tool calls matter far more, as we found in [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow). The pull requests are from a private repository, so the logs stay private and the experiment code isn’t merged. The reviewer itself is open source in the [J-Bot Review repository](https://github.com/pgup-ai/jbot-review).

## FAQ

### Do fewer rules make an AI code reviewer faster?

Not in our tests. Cutting the main review’s rules by 40% and ranking them by priority left review time at 0.96 times the original, with a 95% interval of 0.70 to 1.32, which is within run-to-run noise. An earlier test that loaded only the rule sections mapped to the changed files also left review time unchanged.

### Does a long AGENTS.md slow down coding agents?

Somewhat, and mostly in cost. One study found AGENTS.md files raised coding agents’ inference cost by more than 20% without generally raising success rates. With prompt caching, a fixed block of rules is cheap after the first turn, so in our tests the time went into reasoning and tool calls, not into reading the rules.

### Why can prioritizing rules make a reasoning model slower?

Because it tends to act on the list. Reasoning models such as DeepSeek R1 have been observed checking each given instruction one by one. When we headed the top rules as rules to check, Space Bunny used 51% and 79% more reasoning tokens on our two pull requests.

### Should an AI code reviewer rank repository rules at all?

By relevance, yes. J-Bot Review fills each pass’s budget with the sections that name the changed files first. By a guessed priority, no: keyword priority misfired, and the main review caught 4 known bugs instead of 6. How often developers act on a rule’s comments is a better signal than its title.

### How many rules can an AI code reviewer follow?

More than a typical review sends. On a benchmark of up to 500 simultaneous instructions, the best models still reached 68% at 500. Rules that look alike but don’t apply, and conditional rules, cause more trouble than the count. Conditional rules caused more than 30% of errors in the AgentIF benchmark.

## References

- Jaroslawicz, Whiting, Shah and Maamari. [How Many Instructions Can LLMs Follow at Once?](https://arxiv.org/abs/2507.11538) arXiv:2507.11538, 2025.
- Harada, Yamazaki, Taniguchi, Marrese-Taylor, Kojima, Iwasawa and Matsuo. [When Instructions Multiply: Measuring and Estimating LLM Capabilities of Multiple Instructions Following](https://arxiv.org/abs/2509.21051). arXiv:2509.21051, 2025.
- Qi, Peng, Wang, Xin, Liu, Xu, Hou and Li. [AgentIF: Benchmarking Instruction Following of Large Language Models in Agentic Scenarios](https://arxiv.org/abs/2505.16944). arXiv:2505.16944, 2025.
- Zhou, Hua, Pan, Cheng, Wu, Yu and Wang. [RuleArena: A Benchmark for Rule-Guided Reasoning with LLMs in Real-World Scenarios](https://arxiv.org/abs/2412.08972). arXiv:2412.08972, 2024.
- Lee, Jo, Seo, Lee and Seo. [Lost in the Noise: How Reasoning Models Fail with Contextual Distractors](https://arxiv.org/abs/2601.07226). arXiv:2601.07226, 2026.
- Zhang et al. [Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models](https://arxiv.org/abs/2510.04618). arXiv:2510.04618, 2025.
- Lumer, Nizar, Jangiti, Frank, Gulati, Phadate and Subbiah. [Don’t Break the Cache: An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks](https://arxiv.org/abs/2601.06007). arXiv:2601.06007, 2026.
- Gloaguen, Mündler, Müller, Raychev and Vechev. [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) arXiv:2602.11988, 2026.
- Sun et al. [BitsAI-CR: Automated Code Review via LLM in Practice](https://arxiv.org/abs/2501.15134). arXiv:2501.15134, 2025.

## Related

- **Engineering** — [Guidelines the reviewer can see](https://www.pgupai.com/guides/ai-code-review-team-guidelines): How rule files load and which sections fill each pass’s budget.
- **Engineering** — [23 speed experiments](https://www.pgupai.com/guides/ai-code-review-speed-experiments): What cut review time on real pull requests, and what didn’t.
- **Engineering** — [Repository maps](https://www.pgupai.com/guides/repository-map-ai-code-review): A map of every file cut no tool calls. Most reads went to changed files.

---

_Markdown representation of [https://www.pgupai.com/guides/prioritized-rules-ai-code-review](https://www.pgupai.com/guides/prioritized-rules-ai-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
