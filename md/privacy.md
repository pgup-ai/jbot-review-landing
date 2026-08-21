# Privacy

This page covers two separate things that are easy to confuse: **what this website does with your data**, and **where your code goes when you run J-Bot Review**. The short version is that this site collects nothing, and your code never reaches PGUP AI.

Last updated August 21, 2026

## What this website collects

**Nothing.** www.pgupai.com is a set of static HTML files. It has:

- **No analytics.** There is no Google Analytics, no Plausible, no Vercel Analytics, and no telemetry pixel of any kind.
- **No cookies.** The site sets none. There is nothing to consent to, which is why you have never seen a banner here.
- **No local storage.** Nothing is written to `localStorage` or `sessionStorage`.
- **No accounts, forms, or sign-ups.** There is no field on this site in which you could type personal data.
- **No advertising or tracking networks.** No third-party ad, retargeting, or fingerprinting script is loaded.

## Who sees a request anyway

Serving a web page is not free of third parties, so here are the two that exist:

- **Vercel** hosts this site. Like any web host, its edge network processes the request in order to answer it and keeps standard operational logs — IP address, user agent, requested path, timestamp — under [Vercel's privacy policy](https://vercel.com/legal/privacy-policy). PGUP AI does not use those logs to build a profile of you.
- **Google Fonts** serves the three typefaces this site uses. Your browser fetches them from `fonts.googleapis.com` and `fonts.gstatic.com`, which discloses your IP address and user agent to Google under [Google's privacy policy](https://policies.google.com/privacy). If that matters to you, blocking those two hosts degrades the site to system fonts and nothing else breaks.

Content negotiation on this site is stateless. Asking for the Markdown representation of a page with `Accept: text/markdown` is handled per request and stores nothing about you.

## Where your code goes when you run J-Bot Review

This is the part that matters most, and it is a property of the software rather than of this website.

On the standard Action path, **PGUP AI never receives your code**. The reviewer is a container action that GitHub runs on your own runner. It reads your checkout read-only. The pull-request diff and the context the agent requests go to **the model provider whose key you configured**, under your own account and that provider's data-retention terms. There is no third-party reviewer service in the loop, and no J-Bot server that your diff passes through.

Two consequences follow from that:

- **Your provider's terms are the ones that apply** to your code, not ours. That includes free model routes — some are explicitly feedback routes with no published zero-retention wording, and the guides say so where that is the case.
- **Fork pull requests cannot spend your key.** On `pull_request` events GitHub strips secrets from fork pull requests.

> **Optional routes differ**
>
> Two optional, private-beta routes have a different topology and are documented separately. The [ACP gateway](https://www.pgupai.com/guides/local-agent-code-review) keeps an agent's provider credential on a companion machine you control, but the gateway relays and journals review prompts, diffs, reasoning, tool activity, and findings — so run it inside a trust boundary you control. The hosted GitHub App stores the model keys you add, encrypted at rest. Neither is the standard path, and neither is enabled unless you choose it.

## Your rights

Because this site holds no personal data about you, there is no account to delete, no profile to export, and no mailing list to leave. If you believe PGUP AI holds data about you and you want it removed, [get in touch](https://www.pgupai.com/contact) and it will be dealt with.

## Changes to this page

If this site ever starts collecting something — analytics, for example — this page will be updated before that happens, and the change will be visible in the [public commit history](https://github.com/pgup-ai/jbot-review-landing) of the repository that contains it. The date at the top of this page is the last time it changed.

## Related

- **About** — [About the project](https://www.pgupai.com/about): Who builds J-Bot Review and why it runs in your CI.
- **Contact** — [Get in touch](https://www.pgupai.com/contact): The public channel, and how to report a security issue.
- **Guide** — [ACP gateway topology](https://www.pgupai.com/guides/local-agent-code-review): Where credentials, clones, and journal data live on the optional route.

---

_Markdown representation of [https://www.pgupai.com/privacy](https://www.pgupai.com/privacy). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
