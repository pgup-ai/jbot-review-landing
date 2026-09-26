Guide · Free models · Checked September 26, 2026

# Which free AI model is best for code review?

Published September 26, 2026 · routes and prices checked September 26, 2026

Space Bunny, as of September 2026. Five gateways list it at $0. At J-Bot Review’s default high reasoning effort it found 6.5 of 27 known issues on our test pull requests in about four minutes per review, and at low effort it finishes in about a minute. The other free models each have a catch. Muse Spark 1.3’s $0 route lets Meta train on your prompts, DeepSeek V4.1 Flash is thorough but slow, and MiMo V2.6 Flash’s free route was the slowest model we ran.

J-Bot Review is an open-source AI code reviewer that runs as a GitHub Action in your own CI, with the model you choose. J-Bot itself costs nothing, so on a free model your only bill is GitHub Actions minutes. Every number below comes from our own test runs, and the sample behind each one is stated. Free routes change often, so check the date.

**In this guide**

- [The free models, compared](https://www.pgupai.com/guides/free-ai-models-code-review#compared)
- [Free isn’t unlimited](https://www.pgupai.com/guides/free-ai-models-code-review#quotas)
- [A free setup that survives a quota](https://www.pgupai.com/guides/free-ai-models-code-review#pool)
- [Where your code goes on a free route](https://www.pgupai.com/guides/free-ai-models-code-review#privacy)
- [Free models that didn’t work](https://www.pgupai.com/guides/free-ai-models-code-review#didnt-work)
- [FAQ](https://www.pgupai.com/guides/free-ai-models-code-review#faq)

## The free models, compared

| Model | $0 routes | What we saw in J-Bot Review |
| --- | --- | --- |
| [Space Bunny](https://www.pgupai.com/guides/space-bunny-code-review-github-actions) | OpenCode Zen, OpenCode Go, Kilo, OpenRouter, Cline | 6.5 of 27 known issues at high effort, 251 s median review. 2.5 at low effort, 68 s. |
| [Muse Spark 1.3](https://www.pgupai.com/guides/muse-spark-code-review-github-actions) | OpenCode Zen and Cline, contributor terms | Fast, but its main review often posted nothing at low effort: 1.0 of 15 known issues on two pull requests, and no better at medium. |
| [DeepSeek V4.1 Flash](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-github-actions) | Cline | Thorough and slow. On OpenCode Go, about 200 tool calls and 17 to 20 minutes per review. |
| [MiMo V2.6 Flash](https://www.pgupai.com/guides/mimo-v2-6-flash-code-review-github-actions) | OpenCode Zen, Cline | About 24 minutes per review on the free OpenCode route, where Space Bunny took under a minute. It re-read the same files over and over, and each turn took about 40 seconds. 2 of 4 reviews ran out of time. |
| Gemini 3.8 Flash | Cline | Reviewed a 12-file change in 460 s, reading the checkout. Hit Cline’s daily cap after 363 requests. |

The $0 routes are the ones each provider’s catalog priced at zero on September 26, 2026. Known issues are problems developers had already accepted on real pull requests from a production TypeScript monorepo. The model rows don’t share one test set, so compare within a row more than across rows. Speed depends as much on the route as on the model. DeepSeek V4.1 Flash took about six minutes a review through one provider and 17 through another.

## Free isn’t unlimited

Every free route has a cap, and most don’t publish it. Here’s what we measured or found documented:

- **Cline’s free tier caps each model per day.** Cline doesn’t publish the size. We hit Gemini 3.8 Flash’s cap after 363 requests and 15.0 million tokens, 11.9 million of them cached, in 75 minutes of testing. The error named its reset, “Daily free limit reached on model google/gemini-3.8-flash. Try again in 22h 45m”, which landed exactly 24 hours after our first request. Cline’s docs say free models work only in its IDE extension and CLI, not through its API.
- **OpenRouter limits its `:free` model ids.** Its documentation allows 20 requests per minute and 50 per day, or 1,000 per day once an account has bought $10 of credits. Space Bunny’s $0 listing uses a plain id, and OpenRouter doesn’t publish separate limits for it.
- **OpenCode Zen throttles a busy free model.** Eight reviews at once on one free model returned “Rate limit exceeded” for more than 25 minutes, and the provider scheduled its retries 15 minutes out. J-Bot Review now stops a rate-limited session instead of waiting, retries the main review once, and then fails the run.
- **Command Code counts plan caps.** Its CLI catalog marks Space Bunny free, but J-Bot Review checks your plan’s 5-hour and weekly caps before a run and stops if every key is exhausted.

Tools multiply requests. A review that reads only the diff embedded in its prompt makes 2 to 4 model requests. In our tests, a review that also read files and searched the repository made 30 to 135. A daily cap that covers dozens of one-shot reviews covers only a handful of tool-using ones. Cline reviews in J-Bot now read the checkout, so on Cline’s free tier plan for the higher number.

## A free setup that survives a quota

A comma-separated `model` is a pool. The first attempt of a workflow run picks one entry by hashing the pull request’s head commit, and each rerun moves to the next entry. Listing the same free model on three gateways means a rerun can step around a gateway that has hit its limit:

`.github/workflows/jbot-review.yml · review step`

```yaml
      - uses: pgup-ai/jbot-review-action@v0
        with:
          model: opencode/space-bunny-free,kilo/stealth/space-bunny-alpha,openrouter/stealth/space-bunny-alpha
          model-options: '{"reasoningEffort":"high"}'
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          kilo-auth: ${{ secrets.KILO_AUTH_CONTENT }}
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

J-Bot Review defaults Space Bunny to high effort on OpenCode, but not on OpenRouter, so the pool sets it for every entry. Kilo runs through its own CLI, which ignores the option. Every provider in a pool needs its key, and J-Bot resolves all of them before the review starts, so a missing one fails the run up front. The pool doesn’t switch models within a run. A capped route fails that attempt, and the rerun picks the next entry.

## Where your code goes on a free route

- **Muse Spark 1.3’s $0 route is a contributor route.** OpenCode describes it as discounted pricing in exchange for permission to use your prompts and completions to train future Meta models.
- **Space Bunny is anonymous.** None of the catalogs that list it name the lab behind it or state a retention policy.
- **Cline’s free models may learn from you.** Cline’s documentation says free-model usage may be used to improve model performance and quality.
- **Open weights don’t make a route private.** MiMo V2.6 Flash and DeepSeek V4.1 Flash have open weights, but a hosted free route runs under the gateway’s own policy.

Our rule is to treat a $0 route as a data exchange unless its terms say otherwise, and keep private code on routes whose terms you’ve read. J-Bot Review sends the diff only to the provider you configure. It has no hosted reviewer service of its own.

## Free models that didn’t work

- **Qwen3.8 27B (free) through Cline.** Cline forwards `qwen/qwen3.8-27b:free` to OpenRouter’s free variant, which one host serves. Most requests came back 429, “temporarily rate-limited upstream”. The ones that got through failed with 400 errors, because that host couldn’t compile the schemas of Cline’s built-in tools.
- **Pixel Canary.** Cline and Command Code list it as free. On Command Code it streamed slowly with multi-minute silences, made no tool calls and timed out after 24.5 minutes. It did the same on Cline.

## FAQ

### What is the best free AI model for code review?

Space Bunny, in our September 2026 tests. It’s $0 on OpenCode Zen, OpenCode Go, Kilo, OpenRouter and Cline, and at high reasoning effort it found 6.5 of 27 known issues on real pull requests in about four minutes per review. Muse Spark 1.3 is fast but often posted nothing, DeepSeek V4.1 Flash is thorough but takes 17 to 20 minutes, and MiMo V2.6 Flash’s free route was the slowest we ran.

### Is free AI code review really free?

The model and J-Bot Review can both cost $0, and you pay for GitHub Actions minutes. Free routes have quotas: Cline caps each free model per day, OpenRouter limits its :free ids to 50 or 1,000 requests a day, and OpenCode Zen throttles a busy free model. Many free routes also use your prompts to improve models, which is the real price.

### How many pull requests can a free model review per day?

It depends on the quota and on whether the reviewer uses tools. We hit Cline’s daily cap on Gemini 3.8 Flash after 363 requests. A one-shot review takes 2 to 4 requests and a tool-using review 30 to 135, so the same cap covers dozens of one-shot reviews or a handful of tool-using ones.

### Is it safe to send private code to a free AI model?

Only if the route’s terms say your data isn’t used for training. Muse Spark 1.3’s $0 route lets Meta train on prompts, Cline says free-model usage may improve models, and Space Bunny’s listings name no lab or retention policy. Put private code on a route whose data policy you’ve read.

## Sources

- Live catalogs checked September 26, 2026: [models.dev](https://models.dev), [OpenRouter’s model API](https://openrouter.ai/api/v1/models) and [Cline’s free-model feed](https://api.cline.bot/api/v1/ai/cline/recommended-models).
- Cline, [Free models](https://docs.cline.bot/getting-started/free-models). OpenRouter, [API rate limits](https://openrouter.ai/docs/api-reference/limits).
- J-Bot Review, [README](https://github.com/pgup-ai/jbot-review#readme): model pools and the `model`, `model-options` and `time-budget-minutes` inputs.

## Related

- **Engineering** — [Better reviews from free models](https://www.pgupai.com/guides/free-model-code-review-quality): What raised recall on free models, and what didn’t.
- **Guide** — [Space Bunny code review](https://www.pgupai.com/guides/space-bunny-code-review-github-actions): Setup and exact model ids for all six routes.
- **Guide** — [Kilo code review](https://www.pgupai.com/guides/kilo-code-review-github-actions): A free gateway default for trying the pipeline at $0.

---

_Markdown representation of [https://www.pgupai.com/guides/free-ai-models-code-review](https://www.pgupai.com/guides/free-ai-models-code-review). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
