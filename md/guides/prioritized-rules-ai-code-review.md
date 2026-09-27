Engineering notes · Experiment

# Do prioritized rules make an AI code reviewer faster?

Published September 26, 2026

Not in our tests. We ranked the repository rules our reviewer reads by how closely they relate to the change and how critical they are. The top rules went in whole, the next ones as one-line summaries, and the rule text shrank by about 40%. On three models the main review took about as long as before, and it found 4 known issues instead of 6.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI. It reviews against your team’s written rules, such as AGENTS.md, REVIEW.md and the documents they point to. Each review pass gets a byte budget for those rules: 96 KB for the guideline-compliance pass and 24 KB for the main review, filled with the sections that name the changed files first (see [Guidelines the reviewer can see](https://www.pgupai.com/guides/ai-code-review-team-guidelines)). We wanted to know whether the main review would go faster if it spent less attention on the rules that matter least.

**In this article**

- [What we changed](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#the-idea)
- [The test](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#the-test)
- [What happened](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#results)
- [Why it wasn’t faster](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#why-not-faster)
- [What the research says about rule count](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#research)
- [What we think is going on](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#readings)
- [FAQ](https://www.pgupai.com/guides/prioritized-rules-ai-code-review#faq)

**24.5 → 14.6 KB** — rule text in the main review, control against prioritized

**0.96×** — main-review time with prioritized rules (95% interval 0.70 to 1.32)

**+51–79%** — reasoning tokens on Space Bunny with prioritized rules

**6 → 4** — known issues found by the main review, of 13

## What we changed

The main review normally gets a 24 KB slice of the repository’s rules, ordered by how closely each section names the changed files. For the test we replaced that slice with three tiers, ranked by relevance times priority:

- **Full text**, up to 10 KB, for the highest-ranked sections.
- **One line each**, up to 4 KB, for the next ones: the section title and its first sentence.
- **A count** of everything else, with a note that the guideline-compliance pass still checks every rule.

Priority came from keywords in each document’s name and section title. Words like invariant, security, money, transaction and migration doubled a section’s weight. Words like style, comment, naming and formatting halved it. The block asked the model to check the full-text rules against the change and to cite a one-line rule only for a clear violation.

The repository didn’t mark which individual rules matter most. It had a document of invariants, a document of coding standards and a list of blockers in its review rubric, so the keywords had to guess. Sometimes they guessed wrong. A section about moving old code to a new API counted as critical because its title contains the word migration.

## The test

We used the same two pull requests as our [repository-map test](https://www.pgupai.com/guides/repository-map-ai-code-review), from a production TypeScript monorepo. One changes 4 files and the other 8. Between them they have 13 issues that developers had already accepted, so we could check whether a review still caught them.

Four models ran through OpenCode at high reasoning effort: Space Bunny, Muse Spark 1.3, LongCat 2.5 Preview and DeepSeek V4.1 Flash. Each arm ran once per pull request, 16 reviews in all. Verification was off, so we scored the reviewer’s raw findings, and the guideline-compliance pass ran unchanged in both arms. DeepSeek was metered and cost $0.57 for its four reviews. The other three models had no per-token cost.

One run per arm is a screen, not proof. Timing swings a lot between identical runs, and we come back to how much below.

## What happened

We summed main-review time and reasoning tokens over both pull requests.

| Model | Main-review time, control → prioritized | Reasoning tokens | Known issues found by the main review |
| --- | --- | --- | --- |
| Space Bunny | 296 s → 413 s | 32K → 55K | 3 → 2 |
| Muse Spark 1.3 | 396 s → 287 s | 30K → 22K | 1 → 0 |
| DeepSeek V4.1 Flash | 1,265 s → 1,168 s | 163K → 161K | 2 → 2 |

Each model went its own way. Prioritized rules made Space Bunny slower on both pull requests and Muse Spark faster on both, and DeepSeek split. Pairing each control run with its prioritized twin, the prioritized arm took 0.96 times as long on average, with a 95% interval from 0.70 to 1.32. That’s no measurable effect. A single review swings by about 40% between identical runs, and seeing a 15% change through that noise would take about 47 pairs of pull requests.

Counting every pass, both arms caught 8 known issues. Counting only the main review, the pass we changed, the prioritized arm caught 4 against 6. That’s too few to call, but it points the wrong way.

LongCat 2.5 Preview isn’t in the table. It posted no findings in any of its four runs, took 6 to 29 minutes each, and one run hit the time limit before finishing, so its timings say nothing about the rules.

## Why it wasn’t faster

The rules weren’t where the time went. In these runs they were a quarter to a third of each main-review page’s first prompt, and after the first turn the provider serves that prompt from its cache. A study of prompt caching across OpenAI, Anthropic and Google found it cut API cost by 41 to 80% but time to first token by only 13 to 31% ([Lumer et al., 2026](https://arxiv.org/abs/2601.06007)). The review’s time goes into reasoning and tool turns.

We’d seen this before. In our [speed experiments](https://www.pgupai.com/guides/ai-code-review-speed-experiments), loading only the rule sections mapped to the changed files cut the rules from 24.6 KB to 13.5 KB, and review time stayed at about 33 seconds.

The framing may have cost more than the cut saved. Space Bunny spent 79% more reasoning tokens on one pull request and 51% more on the other. Studying how models follow many instructions at once, Harada et al. saw DeepSeek R1 “explicitly check each given instruction one by one” ([2025](https://arxiv.org/abs/2509.21051)). A block headed “rules to check against this diff” invites exactly that.

## What the research says about rule count

We checked the idea against recent papers before and after the test. Four findings matter here:

- **Instruction following degrades with count, but slowly at our scale.** On a benchmark of up to 500 simultaneous instructions, the best models reached only 68% accuracy at 500, and the authors report trade-offs between accuracy and latency ([Jaroslawicz et al., 2025](https://arxiv.org/abs/2507.11538)). A review’s few dozen rule sections is far below that.
- **Rules that look alike confuse models.** On RuleArena, models struggled to pick the rules that applied and were often confused by similar but distinct regulations ([Zhou et al., 2024](https://arxiv.org/abs/2412.08972)). With distracting context, reasoning models dropped by up to 80%, and prompting or context engineering didn’t fix it ([Lee et al., 2026](https://arxiv.org/abs/2601.07226)).
- **The rules models miss are the conditional ones.** In AgentIF, built from 707 real agent instructions, more than 30% of errors came from misjudging whether a conditional rule applied ([Qi et al., 2025](https://arxiv.org/abs/2505.16944)). Code review rules are mostly conditional, and they’re the ones a keyword ranking tends to demote.
- **Summaries lose what makes a rule usable.** The authors of the ACE framework call it brevity bias. Condensing context drops domain detail, and their detailed, growing playbooks beat concise ones by 10.6% on agent tasks ([Zhang et al., 2025](https://arxiv.org/abs/2510.04618)). A one-line rule tells the model the rule exists, not what it requires.

The closest study to ours measured AGENTS.md files on coding agents. The files didn’t generally raise success rates, and they raised inference cost by more than 20% ([Gloaguen et al., 2026](https://arxiv.org/abs/2602.11988)). That’s about the most a trim of the rules could save, and it’s smaller than our run-to-run noise.

## What we think is going on

These are our readings of the data, not results:

- **Relevance ranking already did the useful part.** The main review’s 24 KB already leads with the sections that name the changed files. Priority tiers on top mostly moved text around.
- **Telling a model what matters makes it act on it.** Our speed experiments found the same pattern: every idea that worked removed turns, and none worked by telling the model what not to do.
- **Priority belongs in data, not keywords.** ByteDance’s production reviewer keeps a taxonomy of review rules and improves it through a feedback loop on how its comments land, reaching 75.0% precision ([Sun et al., 2025](https://arxiv.org/abs/2501.15134)). How often developers act on a rule’s comments is a better priority signal than the words in its title.

We changed nothing. The main review keeps its 24 KB ranked slice, and the compliance pass keeps its 96 KB. The pull requests come from a private repository, so the raw logs stay private and the experiment code isn’t merged. For speed, reasoning effort, the model and the number of tool turns matter far more, as [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow) shows. The reviewer is open source in the [J-Bot Review repository](https://github.com/pgup-ai/jbot-review).

## FAQ

### Does giving an AI code reviewer fewer rules make it faster?

Not by itself, in our tests. Cutting the main review’s rules by about 40%, with the most relevant and critical ones in full and the rest as one-line summaries, left review time about where it was: 0.96 times as long, with a 95% interval of 0.70 to 1.32. An earlier test that loaded only the rule sections mapped to the changed files also left review time unchanged.

### Why didn’t shorter rules speed up the review?

The rules weren’t where the time went. They were a quarter to a third of each page’s first prompt and came from the provider’s prompt cache after the first turn. The time went into reasoning and tool turns, and telling a reasoning model which rules to check can add reasoning. Space Bunny spent 51% and 79% more reasoning tokens with the prioritized rules.

### Should an AI code reviewer rank repository rules by priority?

By relevance, yes. J-Bot Review already fills each pass’s budget with the sections that name the changed files first. By guessed priority, no. In our tests keyword priority misfired, and the main review found 4 known issues instead of 6. How often developers act on a rule’s comments is a better signal than the words in its title.

### How many rules can an AI code reviewer follow?

More than a typical review sends. On a benchmark of up to 500 simultaneous instructions, the best models still reached 68% at 500. What hurts more is rules that look alike but don’t apply, and conditional rules, which caused more than 30% of errors in the AgentIF benchmark.

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
