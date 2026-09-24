Engineering notes · Making AI code review faster · Part 4 of 5

# Can an AI code reviewer follow your team’s coding guidelines?

Published September 24, 2026

Yes, if it can see them. Until late September 2026, J-Bot Review read each guideline file only up to its first 24 KB, and every review pass then took each file from the top. On one private repository with about 520 KB of applicable guidelines, the focused lens passes saw 1 to 4% of the largest domain documents. Rules further down a long document never reached a prompt.

J-Bot Review, an open-source agentic PR reviewer that runs in your own GitHub Actions, now loads guideline files whole and ranks each file’s sections by the files a pull request changes. On a pull request that added a database lock the team’s standards rule out, the reviewer went from missing the rule to quoting it.

**In this article**

- [What counts as a guideline](https://www.pgupai.com/guides/ai-code-review-team-guidelines#what-counts)
- [Why the reviewer doesn’t read everything](https://www.pgupai.com/guides/ai-code-review-team-guidelines#budgets)
- [What the budgets were cutting](https://www.pgupai.com/guides/ai-code-review-team-guidelines#what-was-cut)
- [What changed](https://www.pgupai.com/guides/ai-code-review-team-guidelines#what-changed)
- [The rule that was one heading up](https://www.pgupai.com/guides/ai-code-review-team-guidelines#one-heading-up)
- [What it costs](https://www.pgupai.com/guides/ai-code-review-team-guidelines#cost)
- [FAQ](https://www.pgupai.com/guides/ai-code-review-team-guidelines#faq)

## What counts as a guideline

J-Bot Review treats a repository’s written instructions as review rules. At the root that means `AGENTS.md`, `REVIEW.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `DESIGN.md`, `DECISIONS.md` and `TECHNICAL_STANDARDS.md`, plus Cursor and Windsurf rule files and `.github/copilot-instructions.md`. The same kinds of files inside the changed folders count too, and so do Markdown documents the top-level files link to.

A repository can also route rules by path. A `.pr-governance/review/rules-for-diff.yaml` file maps changed paths to specific numbered rules or document sections, and routed sections load ahead of everything else.

A dedicated guideline-compliance pass checks the change against these rules. The main review and the focused lens passes get a smaller excerpt.

## Why the reviewer doesn’t read everything

There’s too much of it, and more text makes the model worse. The guidelines that applied to one pull request on that private repository came to about 520 KB, and every review pass would carry all of it on every page of the review. We’d also seen what a flood of rules does. In an earlier investigation, a main review with a 149 KB prompt, 58% of it guidelines, missed four bugs that the same model caught when we gave it the change alone.

So each pass gets a byte budget: 96 KB for the compliance pass, 24 KB for the main review, and 8 KB for each lens pass.

## What the budgets were cutting

This came up almost by accident. We were debating whether a lens pass’s 8 KB was too small, so we measured what was actually in it.

Every guideline file stopped at 24 KB when it was loaded. The biggest documents on that repository ran from 47 to 81 KB, so their second halves never reached a review session. Then every budget took each file from the top. Files shared a budget in small rotating chunks starting at line one, which for a lens pass meant about 360 bytes of each document per round. That’s a title and part of an introduction.

On two real pull requests, the lens pass got 1% of a 47 KB invariants document and 4% of a 12 KB design document. The main review got 8% and 24% of the same two.

And the sessions almost never went back for the rest. Across 16 recorded reviews on one model, the main review opened a guideline file 4 times in 941 file reads. The compliance pass opened one in 8 of the 16 runs. The lens passes had no tools, so they couldn’t have.

None of this raised an error. The reviewer was checking code against the first pages of our rules, and from the outside it looked like it had all of them.

## What changed

We kept every per-pass budget the same size and changed what fills them:

- **Guideline files load whole.** Each file can be up to 128 KB, and all of them together up to 1 MB.
- **Sections are ranked by the change.** Each section scores on the changed folder and file names it mentions, weighted by how rare each word is across all sections. A match in a heading counts double. A word that shows up in more than a quarter of the sections is ignored, since it can’t tell them apart.
- **Short parent sections travel with their children.** When a `###` rule moves up, its `##` parent’s text comes along if it’s 2 KB or less, so the rule keeps its topic and defaults. The document’s `#` overview stays put, so small budgets don’t open on introductions again.
- **Routed sub-rules bring their defaults.** When the routing file cites rule 13.1, the reviewer also loads rule 13’s own lead-in, up to 2 KB.
- **The compliance pass sees what it skipped.** When its budget can’t hold every section, its note lists each file’s skipped section headings, so it can open the one that applies.

For a change to an agent runtime, for example, the compliance pass now gets the seam and contract sections written about that runtime. It used to get the opening sections of each document.

## The rule that was one heading up

One test pull request added a pessimistic database lock to a payment update. The team’s standards cover exactly this in rule 13, a parent section on concurrency that says not to add compare-and-set clauses or pessimistic locks. But the repository’s routing file pointed reviews of those paths at sub-rule 13.1, about threading version numbers, and not at rule 13 itself.

So no review session ever saw rule 13. The main review raised a concern near the lock, verification couldn’t confirm it, and it never got posted. With parent rules loaded, the main review and the compliance pass both quoted rule 13 and suggested keeping the existing conditional update. Verification confirmed the finding, and it was posted.

Across the two-PR check, the known issue was posted on both pull requests, against one of two before. That’s one run per pull request, a small sample.

## What it costs

Very little. Ranking took 14 to 39 milliseconds per review, and about 1.1 seconds with 3,000 changed files, the most GitHub lists for one pull request. Prompts didn’t grow, since the budgets are the same size.

A new ranking also doesn’t force a full re-review of an open pull request, because the check for changed rules hashes the rules themselves and ignores the order a diff puts them in. The one exception is the first review after upgrading. Loading whole files changes what gets hashed, so each open pull request gets one full review.

> **Tips for teams that write guidelines**
>
> - Name the module or folder in section headings. Heading matches count double.
> - Keep a numbered rule’s defaults in a short lead-in, under 2 KB, before its first sub-rule.
> - Route rules that must always apply to a path with `rules-for-diff.yaml`.

## FAQ

### Which files does J-Bot Review read as guidelines?

At the repository root: `AGENTS.md`, `REVIEW.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `DESIGN.md`, `DECISIONS.md`, `TECHNICAL_STANDARDS.md`, Cursor and Windsurf rule files, and `.github/copilot-instructions.md`. It also reads the same kinds of files inside changed folders, Markdown files the top-level ones link to, and sections routed by `.pr-governance/review/rules-for-diff.yaml`.

### Does J-Bot Review send all of my guidelines to the model?

No. Each review pass has a byte budget: 96 KB for the guideline-compliance pass, 24 KB for the main review, and 8 KB for each focused lens pass. What changed is which sections fill it. The ones that name the changed files now come first.

### How do I make sure a rule is always checked for certain files?

Route it. A `rules-for-diff.yaml` file under `.pr-governance/review` maps changed paths to numbered rules or document headings, and routed sections load ahead of general documents. Keep a numbered rule’s defaults in a short lead-in before its first sub-rule. A routed sub-rule now brings that lead-in along when it’s 2 KB or less.

### Why not give the reviewer a bigger guideline budget?

Because attention is limited. In an earlier investigation, a main review with a 149 KB prompt, 58% of it guidelines, missed four bugs that the same model found when given the change alone. So we pick better sections and keep the budgets where they are.

**Series: Making AI code review faster**

1. [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow)
2. [What we tried before context packs](https://www.pgupai.com/guides/ai-code-review-speed-experiments)
3. [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review)
4. Making the reviewer read your rules
5. [The results](https://www.pgupai.com/guides/faster-ai-code-review-results)

## Related

- **Part 3** — [Context packs: the fix that worked](https://www.pgupai.com/guides/context-pack-ai-code-review): The code bundle that replaced most of the reviewer’s lookups.
- **Part 5** — [The results](https://www.pgupai.com/guides/faster-ai-code-review-results): What the changes did to speed, turns, and caught issues.
- **Source** — [The guideline-ranking pull request](https://github.com/pgup-ai/jbot-review/pull/242): Whole-file loading, section ranking, and parent rules in the open-source repo.

---

_Markdown representation of [https://www.pgupai.com/guides/ai-code-review-team-guidelines](https://www.pgupai.com/guides/ai-code-review-team-guidelines). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
