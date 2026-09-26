Engineering notes · Experiment

# Does a repository map help an AI code reviewer?

Published September 26, 2026

Not in our tests. We gave J-Bot Review a 12.5 KB map of the repository’s tracked files and counted tool calls on two free models. The map didn’t cut them, and neither model listed folders much in the first place. Most of their reads went to files the pull request had already changed, the files the reviewer was already looking at.

J-Bot Review is an open-source agentic PR reviewer that runs as a GitHub Action in your own CI. A map of the repository is a common idea for coding agents, so we tested whether one would save our reviewer its lookups. It also raised a second question. When the context budget runs out, is the reviewer dropping the right things?

**In this article**

- [Why we expected a map to help](https://www.pgupai.com/guides/repository-map-ai-code-review#why-a-map)
- [The test](https://www.pgupai.com/guides/repository-map-ai-code-review#the-test)
- [What happened](https://www.pgupai.com/guides/repository-map-ai-code-review#results)
- [The reviewer wasn’t lost. It was re-reading](https://www.pgupai.com/guides/repository-map-ai-code-review#rereads)
- [What to drop when the budget runs out](https://www.pgupai.com/guides/repository-map-ai-code-review#dropping)
- [What we think is going on](https://www.pgupai.com/guides/repository-map-ai-code-review#readings)
- [FAQ](https://www.pgupai.com/guides/repository-map-ai-code-review#faq)

**0–3** — folder listings per Muse review, with or without the map

**75–82%** — of file reads went to files the pull request changed

**+37%** — input tokens with the map, on Muse Spark 1.3

**27%** — of main-review pages drop some context to fit their budget

## Why we expected a map to help

In [Part 1 of our speed series](https://www.pgupai.com/guides/why-ai-code-review-is-slow), 11.9% of the reviewer’s tool calls in production listed folders. That’s the lookup a map should remove. Research systems lean on the same idea. Agentless, which fixes GitHub issues without an agent loop, starts by giving the model “a concise representation of the repository’s file and directory structure, similar to the Linux tree command” and asking which files to change ([Xia et al., 2024](https://arxiv.org/abs/2407.01489)). The Aider coding assistant sends a [map of the repository’s files and key symbols](https://aider.chat/docs/repomap.html) with its requests.

J-Bot Review already sends a partial map. Each review page gets a [context pack](https://www.pgupai.com/guides/context-pack-ai-code-review), and its last section lists the folders that hold the changed files and their parent folders, one level deep and up to 40 names per folder. Because that section comes last, it’s the first one cut when a page runs short of room.

## The test

We took two pull requests from a production TypeScript monorepo with 4,611 tracked files. One changes 4 files and the other 8. Both have issues that developers had already accepted, so we could check that a review still caught them.

The map arm added a 12.5 KB tree to every main-review page. Folders on the path to a changed file were listed in full. Every other folder collapsed to a name and a file count, like `apps/ (2601)`, and the tree opened the collapsed folders nearest the change first until it reached its byte budget.

We ran it on two free models through Cline’s free tier, Gemini 3.8 Flash and Muse Spark 1.3, with the Cline CLI reading the checkout, as it does in J-Bot Review today. Each arm ran once per pull request. Verification and the guideline pass were off, so only the main review varied. One run per arm is a screen, not proof. We’ve seen the same page swing from 8 to 27 tool calls between runs.

## What happened

On Muse Spark 1.3, summed over both pull requests:

| Setup | Tool calls | Turns | Input tokens | Known issues found |
| --- | --- | --- | --- | --- |
| Control | 20 | 21 | 754K | 0 |
| With the map | 24 | 22 | 1,036K | 0 |

Gemini 3.8 Flash split. On the first pull request, one page went from 20 tool calls to 11 with the map, and the other went from 8 to 27. On the second, the control run spent 34 calls on web searches and page fetches and then hit Cline’s daily free limit, so there was nothing clean to compare.

Muse listed folders zero to three times per review, map or no map. Outside the one Gemini run that went off into web searches, Gemini did the same. On Gemini, both arms read about 1.1 files per read call. A map can’t get a model to batch reads it doesn’t batch anyway.

## The reviewer wasn’t lost. It was re-reading

On Muse, depending on the setup, 75 to 82% of all file reads went to files the pull request had changed. A typical session read a changed file whole, then read it again in slices: lines 91 to 425, then 165 to 342, then 243 to 280.

That’s the opposite of being lost. The reviewer knows exactly which file matters, and it wants more of that file than the diff shows. A diff hunk carries three lines of context on each side, and the context pack adds the enclosing definition of each change, up to 150 lines. The models still went back for the whole file.

This is where our result and Agentless part ways. A bug-fixing agent starts from an issue report and has to find the file, so a tree of the repository is what it needs first. A reviewer starts from the diff. The files are already chosen, and the work left is understanding them.

SWE-agent’s authors found that the interface an agent uses to read and search files, such as a windowed file viewer and search commands built for the model, changed how many tasks it solved ([Yang et al., 2024](https://arxiv.org/abs/2405.15793)). Our reviewers worked the same way, one window of a changed file at a time.

## What to drop when the budget runs out

If the reviewer has a limited context budget, is it dropping the right things? Across 804 earlier experiment logs, 466 of 1,725 main-review pages (27%) had to leave some pack items out.

The pack fills in a fixed order: the code around each change, then the definitions that code uses, callers of the changed functions, other pages’ changes to files this page imports, and finally the folder listings. An item that doesn’t fit is skipped, and smaller items further down can still use the room left.

Our two test pull requests fit whole, so we capped every pack at 12 KB to force a choice and compared three orders on Muse Spark 1.3:

| Order, pack capped at 12 KB | Tool calls | Turns | Input tokens | Known issues found |
| --- | --- | --- | --- | --- |
| Current order | 17 | 19 | 653K | 1 |
| Folder listings first | 25 | 26 | 961K | 0 |
| Callers first | 42 | 38 | 1,738K | 0 |

The current order came out cheapest, and it was the only arm to post a known issue. Moving the folder listings up bought nothing. Moving callers up cost the most, and one of its runs went on 11 web lookups. Whatever the model doesn’t see of the changed code, it goes and reads, so the code around the change belongs at the front.

The capped current order also used fewer calls than the uncapped control, 17 against 20. That’s inside run-to-run noise, but it hints that a smaller pack doesn’t cost the reviewer much.

Position in the prompt matters too. [Liu et al. (2023)](https://arxiv.org/abs/2307.03172) found that language models use information at the start and end of a long context better than information in the middle. That’s one more reason not to pad the prompt with material the model doesn’t reach for.

## What we think is going on

These are our readings of the data, not results:

- **Reviewers search, they don’t browse.** On Gemini, code searches were about half of all tool calls. A model that wants a symbol searches for it by name, and a folder tree answers a question it wasn’t asking.
- **The diff is narrower than the model wants.** Three lines of context rarely hold a whole function, so the models fetch the rest. Sending small changed files whole, instead of letting the model fetch and page through them, is our next test.
- **Everything in the prompt is paid for on every turn.** Each tool turn resends the whole prompt, so the map’s 12.5 KB cost Muse 37% more input tokens across a review. On a free tier, that uses up the daily quota sooner.

We changed nothing. The folder listing stays last in the pack, and the pack order stays as it is. The pull requests come from a private repository, so the raw logs stay private and the experiment code isn’t merged. The reviewer and its context pack are open source in the [J-Bot Review repository](https://github.com/pgup-ai/jbot-review).

## FAQ

### Should you give an AI code reviewer a map of the repository?

Not to save tool calls, in our tests. A 12.5 KB map of every tracked file didn’t reduce tool calls on Gemini 3.8 Flash or Muse Spark 1.3, and it added 37% to Muse’s input tokens. Muse listed folders zero to three times per review with or without it. Maps help agents that have to find the right file, like bug fixers. A reviewer already knows which files changed.

### Why does an AI code reviewer re-read files that are already in the diff?

Because the diff shows too little of them. A hunk has three lines of context on each side, and the model wants the whole function or file before it judges a change. In our Muse tests 75 to 82% of file reads went to changed files, usually one full read followed by several range reads of the same file.

### What should an AI code reviewer keep when its context budget is tight?

The code around each change first, then the definitions it uses. With the context pack capped at 12 KB, that order used 17 tool calls across two pull requests. Putting folder listings first used 25 calls, and putting callers first used 42.

### Does Aider-style repository mapping apply to code review?

Less than it does to editing. Aider and Agentless send a map so the model can pick which files to open. In code review the changed files are given, so a map mostly repeats what the diff already says about where to look.

## References

- Xia, Deng, Dunn and Zhang. [Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/abs/2407.01489). arXiv:2407.01489, 2024.
- Yang, Jimenez, Wettig, Lieret, Yao, Narasimhan and Press. [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793). arXiv:2405.15793, 2024.
- Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni and Liang. [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172). arXiv:2307.03172, 2023.
- Aider. [Repository map](https://aider.chat/docs/repomap.html) documentation.

## Related

- **Engineering** — [Context packs](https://www.pgupai.com/guides/context-pack-ai-code-review): What the reviewer gets before its first turn, and in what order.
- **Engineering** — [Better reviews from free models](https://www.pgupai.com/guides/free-model-code-review-quality): Reasoning effort and a second pass moved recall. Prompts and filters didn’t.
- **Engineering** — [Why AI code review is slow](https://www.pgupai.com/guides/why-ai-code-review-is-slow): Where the reviewer’s time went in production.

---

_Markdown representation of [https://www.pgupai.com/guides/repository-map-ai-code-review](https://www.pgupai.com/guides/repository-map-ai-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
