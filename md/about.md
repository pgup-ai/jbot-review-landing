# About J-Bot Review

J-Bot Review is an **open-source (MIT) agentic pull-request reviewer** built by **PGUP AI**. It runs as a single GitHub Action inside your own CI, reviews with a model you already pay for, and posts diff-anchored findings back on the pull request. There is no reviewer SaaS in the loop and no per-seat bill.

Last updated August 21, 2026

## Who makes it

PGUP AI is a small independent software project based in Canada. It publishes its work under the [pgup-ai](https://github.com/pgup-ai) organisation on GitHub. J-Bot Review is the project's main public release: the Action that users install lives at [pgup-ai/jbot-review-action](https://github.com/pgup-ai/jbot-review-action) and is listed on the [GitHub Actions Marketplace](https://github.com/marketplace/actions/j-bot-code-review). The code is MIT licensed, so you can read it, fork it, and run it without asking anyone.

## Why it exists

Most AI code reviewers are hosted services. You pay per seat, and your diff leaves your infrastructure for a vendor's. J-Bot Review takes the opposite position: the reviewer is a container action that GitHub runs on **your** runner, reading your checkout read-only. The only place your diff goes is the model provider whose key you configured, under your own account and its retention terms.

That has a practical consequence for cost. The action adds no charge of its own — you pay your model provider, or nothing at all if you use a provider's free model route or reuse a coding-agent subscription you already hold, plus your normal CI minutes.

## How it works

- **One workflow file, one secret.** The standard path is a single YAML file in `.github/workflows` plus one repository secret.
- **Bring your own model.** More than 30 backends are supported: direct model APIs and gateways, coding-agent CLI subscriptions, or any OpenAI-compatible endpoint you run yourself. You switch with one repository variable.
- **Findings are verified before they post.** A second model re-checks every blocking finding; refuted findings are dropped and uncertain ones are demoted, so what lands on the pull request is signal rather than a wall of nits.
- **It reads your house rules.** The reviewer discovers `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, and Cursor rules, and reviews against them.
- **Least-privilege by default.** `contents: read`, with write scopes only for pull-request comments and reactions.

## Track record

The maintainers run J-Bot Review on their own work. As of the August 20, 2026 snapshot, it had completed **3,008 successful pull-request-triggered reviews** across **8,185 files** and **2,241,518 diff lines** (756 unique pull requests, deduplicated) in two private production repositories since June 2026. That is first-party dogfooding, not a customer adoption figure, and it is stated that way deliberately.

## What is released and what is not

> **Status**
>
> The **GitHub Action is the released path** and is what this site documents in detail. Two other routes exist and are described honestly as **private beta**: an optional [ACP gateway](https://www.pgupai.com/guides/local-agent-code-review) that runs a coding agent on a companion machine you control, and a hosted GitHub App that runs the same reviewer from a dashboard. The Action is not being replaced by either.

## How we write about the product

Provider support, model availability, free routes, and pricing move quickly, and this site tries not to outrun them. Claims are checked against the action's source before publishing, guides carry the date they were verified, and routes that were read from a provider's catalogue but not yet exercised end to end say so. Where a free tier depends on a provider's terms — including data-retention terms that may not suit private code — the guide says that too.

## Read more

- **Guides** — [Setup guides](https://www.pgupai.com/guides): Every provider and setup path, with exact configuration.
- **Agents** — [llms.txt fact sheet](https://www.pgupai.com/llms.txt): The machine-readable summary, including when to use this project.
- **Contact** — [Get in touch](https://www.pgupai.com/contact): Where to reach the maintainers, and what to expect.
- **Privacy** — [Privacy](https://www.pgupai.com/privacy): What this site collects, and where your code goes.

---

_Markdown representation of [https://www.pgupai.com/about](https://www.pgupai.com/about). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
