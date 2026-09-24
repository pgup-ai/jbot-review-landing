Engineering notes · Making AI code review faster · Part 4 of 5

# Can an AI code reviewer follow your team’s coding guidelines?

Published September 24, 2026

Yes, when it can see them. Until this release, J-Bot Review read each guideline file only up to its first 24 KB, and every review pass then took each file from the top. On one private repository with about 520 KB of applicable guidelines, the pass that hunts for cross-file problems saw 1 to 4% of the largest domain documents. Rules further down a long document reached no prompt at all.

J-Bot Review, an open-source agentic PR reviewer that runs in your own GitHub Actions, now loads guideline files whole and ranks each file’s sections by the files a pull request changes. On a pull request that added a database lock the team’s standards rule out, the reviewer went from missing the rule to quoting it.

**In this article**

- [What counts as a guideline](https://www.pgupai.com/guides/ai-code-review-team-guidelines#what-counts)
- [Why the reviewer does not read everything](https://www.pgupai.com/guides/ai-code-review-team-guidelines#budgets)
- [What the budgets were cutting](https://www.pgupai.com/guides/ai-code-review-team-guidelines#what-was-cut)
- [What changed](https://www.pgupai.com/guides/ai-code-review-team-guidelines#what-changed)
- [The rule that was one heading up](https://www.pgupai.com/guides/ai-code-review-team-guidelines#one-heading-up)
- [What it costs](https://www.pgupai.com/guides/ai-code-review-team-guidelines#cost)
- [FAQ](https://www.pgupai.com/guides/ai-code-review-team-guidelines#faq)

## What counts as a guideline

J-Bot Review treats a repository’s written instructions as review rules. That includes `AGENTS.md`, `REVIEW.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `TECHNICAL_STANDARDS.md`, `.cursor/rules`, `.cursorrules`, `.windsurfrules` and `.github/copilot-instructions.md`. Nested `AGENTS.md`, `CLAUDE.md`, `REVIEW.md` and rule files inside the changed folders count too, and so do Markdown documents linked from the top-level files.

A repository can also route rules by path. A `.pr-governance/review/rules-for-diff.yaml` file maps changed paths to specific numbered rules or document sections, and routed sections load ahead of everything else.

A dedicated guideline-compliance pass checks the change against these rules. The main review and the focused lens passes get a smaller excerpt.

## Why the reviewer does not read everything

Two reasons: size and attention.

- **Size.** The guidelines that applied to one pull request on that private repository came to about 520 KB. Every review pass would carry that on every page of the review.
- **Attention.** In an earlier investigation, a main review with a 149 KB prompt, 58% of it guidelines, missed four bugs that the same model found when given the change alone. More text diluted its attention.

So each pass has a byte budget: 96 KB for the compliance pass, 24 KB for the main review, and 8 KB for each lens pass.

## What the budgets were cutting

The budgets were reasonable. What filled them was not.

- **Files were cut when they were loaded.** Every guideline file stopped at 24 KB. The largest documents on that repository ran from 47 to 81 KB, so their second halves reached no review session.
- **Every budget took every file from the top.** Files shared a budget in small rotating chunks, starting from their first line. For a lens pass that meant about 360 bytes of each document per round: mostly titles and introductions.
- **The share that arrived was small.** On two real pull requests, the lens pass received 1% of a 47 KB invariants document and 4% of a 12 KB design document. The main review received 8% and 24% of the same two documents.
- **Sessions rarely went back for the rest.** Across 16 recorded reviews on one model, the main review opened a guideline file 4 times in 941 file reads. The compliance pass opened one in 8 of 16 runs. The lens passes had no tools to try.

> **The short version**
>
> The reviewer can apply only the rules it can see. Most of ours were below the fold.

## What changed

- **Guideline files load whole**, up to 128 KB each and 1 MB in total. The per-pass budgets did not grow.
- **Sections are ranked by the change.** Each section scores on the changed folder and file names it mentions, weighted by how rare each word is across all sections. A match in a heading counts double, and a word found in more than a quarter of the sections is ignored because it cannot tell them apart.
- **Short parent sections travel with their children.** When a `###` rule moves up, its `##` parent’s text comes along if it is 2 KB or less, so a rule keeps its topic and defaults. The document’s `#` overview stays where it is, so small budgets do not open on introductions again.
- **Routed sub-rules bring their defaults.** When the routing file cites rule 13.1, the reviewer also loads rule 13’s own lead-in, up to 2 KB.
- **The compliance pass sees what it skipped.** When its budget cannot hold every section, its note lists each file’s skipped section headings, so it can open the one that applies.

For an agent-runtime change, for example, the compliance pass now receives the seam and contract sections written about that runtime, where it used to receive each document’s opening sections.

## The rule that was one heading up

One test pull request added a pessimistic database lock to a payment update. The team’s standards cover this in a parent section on concurrency: do not add compare-and-set clauses or pessimistic locks. The repository’s routing file pointed reviews of those paths at a sub-rule about threading version numbers, 13.1, and not at its parent, 13.

- **Before:** no review session saw the parent rule. The main review raised a concern near the lock, and verification left it unverified, so it was not posted.
- **After:** the main review and the compliance pass both quoted the rule and suggested keeping the existing conditional update. The finding was verified and posted.

Across the two-PR check, the known issue was posted on both pull requests, against one of two before. That is one run each: a clear signal, but not a benchmark.

## What it costs

- **Time:** ranking took 14 to 39 milliseconds per review. With 3,000 changed files, the most GitHub lists for one pull request, it took about 1.1 seconds.
- **Prompt size:** unchanged. The budgets are the same, and only what fills them changed.
- **Follow-up reviews:** a new ranking does not force a full re-review. The check for changed rules hashes the rules themselves, not the order a given diff put them in.

> **Tips for teams that write guidelines**
>
> - Name the module or folder in section headings. Heading matches count double.
> - Put a numbered rule’s defaults in its first 2 KB, before its sub-rules.
> - Route rules that must always apply to a path with `rules-for-diff.yaml`.

## FAQ

### Which files does J-Bot Review read as guidelines?

`AGENTS.md`, `REVIEW.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `TECHNICAL_STANDARDS.md`, `DESIGN.md`, `DECISIONS.md`, `.cursor/rules`, `.cursorrules`, `.windsurfrules` and `.github/copilot-instructions.md`, plus the same files inside changed folders, the Markdown files they link to, and sections routed by `.pr-governance/review/rules-for-diff.yaml`.

### Does J-Bot Review send all of my guidelines to the model?

No. Each review pass has a byte budget: 96 KB for the guideline-compliance pass, 24 KB for the main review, and 8 KB for each focused lens pass. What changed is which sections fill that budget: the ones that name the changed files come first.

### How do I make sure a rule is always checked for certain files?

Route it. A `rules-for-diff.yaml` file under `.pr-governance/review` maps changed paths to numbered rules or document headings, and routed sections load ahead of general documents. Keep a numbered rule’s defaults in the lead-in of its section: a routed sub-rule now brings that lead-in along when it is 2 KB or less.

### Why not give the reviewer a bigger guideline budget?

Because attention is limited. In an earlier investigation, a main review with a 149 KB prompt, 58% of it guidelines, missed four bugs that the same model found when given the change alone. Picking the right sections helped more than adding bytes.

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
