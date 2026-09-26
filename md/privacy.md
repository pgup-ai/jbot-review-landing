# Privacy

This page covers two separate things that are easy to confuse: **what this website does with your data**, and **where your code goes when you run J-Bot Review**. Website analytics are optional. On the standard GitHub Action path, your code never reaches PGUP AI.

Last updated September 26, 2026

## What this website collects

We use **PostHog US Cloud** to understand which pages and links are useful. We use cookieless analytics by default. You can turn it off through **Analytics preferences** in the footer. A previously saved decline still keeps analytics off.

- **Usage events:** page views, page exits to estimate visit duration, and selected setup, contact, GitHub, and Marketplace link clicks.
- **Traffic context:** page paths, referring websites, permitted campaign tags, browser and device information. PostHog processes your IP address when receiving requests to generate a daily identifier, then discards the IP from cookieless events. Geographic breakdowns may be unavailable in this mode.
- **Daily identifiers:** PostHog uses a server-generated hash of request information with a rotating daily salt. Its cookieless SDK does not store analytics identifiers in cookies, local storage, or session storage. We cannot reliably recognize the same visitor across days and do not send names or email addresses.
- **No session replay or form capture:** we disable recordings, automatic interaction capture, heatmaps, and surveys. There are currently no accounts or enquiry forms on this site.
- **No visitor identification service:** RB2B, advertising pixels, and third-party person-resolution tools are not installed.

We strip URL fragments and non-campaign query parameters from analytics URLs. Please do not put personal data in campaign tags or website URLs.

## Your analytics choices

Use **Analytics preferences** in the footer to turn cookieless analytics off or back on at any time. We store your choice in your browser as `pgup_analytics_choice`, including when you decline, so we can remember it. If browser storage is unavailable, your choice applies only to the current page.

Turning analytics off stops future event collection. It does not delete events already received. We also keep analytics off when your browser sends Global Privacy Control or Do Not Track. Clearing your browser's site data removes the stored preference, so cookieless analytics resumes unless your browser sends a privacy signal. Older versions used analytics storage after consent; clearing site data also removes those old identifiers, which this version does not use.

## Who sees a request anyway

Serving a web page is not free of third parties, these services process requests:

- **Vercel** hosts this site. Like any web host, its edge network processes the request in order to answer it and keeps standard operational logs — IP address, user agent, requested path, timestamp — under [Vercel's privacy policy](https://vercel.com/legal/privacy-policy). PGUP AI does not use those logs to build a profile of you.
- **Google Fonts** serves the three typefaces this site uses. Your browser fetches them from `fonts.googleapis.com` and `fonts.gstatic.com`, which discloses your IP address and user agent to Google under [Google's privacy policy](https://policies.google.com/privacy). If that matters to you, blocking those two hosts degrades the site to system fonts and nothing else breaks.

**PostHog** receives cookieless analytics unless you opt out or send a browser privacy signal, under [PostHog’s privacy policy](https://posthog.com/privacy). The project uses US hosting. We use this data to improve the site, not to identify unnamed visitors for sales outreach.

Content negotiation on this site is stateless. Asking for the Markdown representation of a page with `Accept: text/markdown` is handled per request and stores nothing about you.

## Where your code goes when you run J-Bot Review

This is the part that matters most, and it is a property of the software rather than of this website.

On the standard Action path, **PGUP AI never receives your code**. The reviewer is a container action that GitHub runs on your own runner. It reads your checkout read-only. The pull-request diff and the context the agent requests go to **the model provider whose key you configured**, under your own account and that provider's data-retention terms. There is no third-party reviewer service in the loop, and no J-Bot server that your diff passes through.

One opt-in setting adds a second recipient. The experimental `jev` preset sends the diffs around changed functions and up to 24 candidate excerpts to TypeSafe, which ranks them by relevance, with at most 30,000 bytes per request. It stays off unless you turn it on, and the [Jev guide](https://www.pgupai.com/guides/jev-relevance-ranking-code-review) explains what it does.

Two consequences follow from that:

- **Your provider's terms are the ones that apply** to your code, not ours. That includes free model routes — some are explicitly feedback routes with no published zero-retention wording, and the guides say so where that is the case.
- **Fork pull requests cannot spend your key.** On `pull_request` events GitHub strips secrets from fork pull requests.

> **Optional routes differ**
>
> Two optional, private-beta routes have a different topology and are documented separately. The [ACP gateway](https://www.pgupai.com/guides/local-agent-code-review) keeps an agent's provider credential on a companion machine you control, but the gateway relays and journals review prompts, diffs, reasoning, tool activity, and findings — so run it inside a trust boundary you control. The hosted GitHub App stores the model keys you add, encrypted at rest. Neither is the standard path, and neither is enabled unless you choose it.

## Your rights

There is no site account or mailing list. For questions about analytics data, or to request access or deletion, [get in touch](https://www.pgupai.com/contact) and it will be dealt with.

## Changes to this page

We update this page when our data practices change. Changes are visible in the [public commit history](https://github.com/pgup-ai/jbot-review-landing) of the repository that contains it. The date at the top of this page is the last time it changed.

## Related

- **About** — [About the project](https://www.pgupai.com/about): Who builds J-Bot Review and why it runs in your CI.
- **Contact** — [Get in touch](https://www.pgupai.com/contact): The public channel, and how to report a security issue.
- **Guide** — [ACP gateway topology](https://www.pgupai.com/guides/local-agent-code-review): Where credentials, clones, and journal data live on the optional route.

---

_Markdown representation of [https://www.pgupai.com/privacy](https://www.pgupai.com/privacy). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
