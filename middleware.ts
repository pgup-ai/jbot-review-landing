/**
 * Markdown content negotiation for www.pgupai.com, per acceptmarkdown.com.
 *
 * `Vary: Accept` on the HTML variant comes from the `headers` rules in
 * vercel.json, not from here — this function never sees those responses.
 */
import { negotiate } from './lib/negotiate.mjs';
import { ROUTES, NOT_FOUND_MARKDOWN } from './lib/routes.mjs';

// Excludes /md/ so the twin subrequest below cannot re-enter this function.
export const config = {
  matcher: ['/((?!assets/|md/|_vercel/|x$|.*\\.[a-zA-Z0-9]+$).*)'],
};

/** Representations this site can serve, best first. HTML stays the default. */
const PRODUCES = ['text/html', 'text/markdown'];

const MARKDOWN_TYPE = 'text/markdown; charset=utf-8';

/** Normalise a request path to the clean URL used as the route-table key. */
export function canonicalPath(pathname) {
  let out = pathname.replace(/\/{2,}/g, '/');
  if (out.length > 1) out = out.replace(/\/+$/, '');
  out = out.replace(/\.html$/, '');
  if (out === '/index') return '/';
  if (out.endsWith('/index')) out = out.slice(0, -'/index'.length);
  return out || '/';
}

function markdownTwinFor(pathname) {
  return ROUTES[canonicalPath(pathname)] ?? null;
}

/** Neutralise a value echoed back to the client, whatever the body format. */
export function sanitize(value) {
  return value.replace(/[\u0000-\u001f\u007f`]/g, '').slice(0, 120);
}

/** Render an untrusted value as a code span it cannot break out of. */
const codeSpan = (value) => `\`${sanitize(value)}\``;

/** RFC 9110 recommends a 406 body listing what the resource can produce. */
function notAcceptable(accept, method) {
  const body =
    'This resource is available in:\n' +
    '- text/html\n' +
    '- text/markdown\n\n' +
    `You requested: ${sanitize(accept)}\n`;
  return new Response(method === 'HEAD' ? null : body, {
    status: 406,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // Cache-busting: the same URL answers 200 for a different Accept.
      'cache-control': 'no-store',
      vary: 'Accept, Accept-Encoding',
    },
  });
}

function notFoundMarkdown(pathname, origin) {
  return (
    '# 404 — Page not found\n\n' +
    `No page exists at ${codeSpan(pathname)} on this site.\n\n` +
    '## Where to look next\n\n' +
    `- [Home](${origin}/) — what J-Bot Review is and how to install it\n` +
    `- [Guides](${origin}/guides) — every provider and setup path\n` +
    `- [llms.txt](${origin}/llms.txt) — the machine-readable fact sheet, including when to use this project\n` +
    `- [sitemap.xml](${origin}/sitemap.xml) — every canonical URL on this site\n` +
    `- [Action repository](https://github.com/pgup-ai/jbot-review-action) — inputs, providers, and configuration\n\n` +
    'Every page here also serves Markdown to `Accept: text/markdown`.\n'
  );
}

/**
 * Vercel's deployment-protection cookie, which the twin subrequest needs to
 * get past the SSO wall on a protected preview. Only this cookie is ever
 * forwarded — never the caller's whole Cookie header.
 */
function protectionCookie(request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = /(?:^|;\s*)(_vercel_jwt=[^;]+)/.exec(cookie);
  return match ? match[1] : null;
}

/**
 * Status alone is not enough: an SSO interstitial, error page, or CDN notice
 * all answer 200 with HTML, which would then go out labelled text/markdown.
 */
function isNotMarkdown(response, body) {
  const type = response.headers.get('content-type') || '';
  if (/\bhtml\b/i.test(type)) return true;
  return /^\s*<(?:!|html|head|body)/i.test(body);
}

export default async function middleware(request) {
  try {
    const method = request.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') return undefined;

    const url = new URL(request.url);
    const accept = request.headers.get('accept');
    const chosen = negotiate(accept, PRODUCES);

    if (chosen === null) return notAcceptable(accept ?? '', method);

    // Returning undefined continues the chain, serving the static file as before.
    if (chosen !== 'text/markdown') return undefined;

    const twin = markdownTwinFor(url.pathname);
    if (!twin) {
      // 404 in the format the agent asked for, so it can recover.
      const body = notFoundMarkdown(canonicalPath(url.pathname), url.origin);
      return new Response(method === 'HEAD' ? null : body, {
        status: 404,
        headers: {
          'content-type': MARKDOWN_TYPE,
          'cache-control': 'public, max-age=0, must-revalidate',
          vary: 'Accept, Accept-Encoding',
        },
      });
    }

    // Vercel strips Content-Type from middleware-produced HEAD responses, and
    // that is the header acceptmarkdown.com's `curl -sI` check reads. Rewriting
    // hands the request to the static layer, which keeps it. Verified 2026-08-21.
    if (method === 'HEAD') {
      return new Response(null, {
        headers: { 'x-middleware-rewrite': new URL(twin, url.origin).toString() },
      });
    }

    const cookie = protectionCookie(request);
    const upstream = await fetch(new URL(twin, url.origin), {
      headers: cookie ? { cookie } : undefined,
    });
    if (!upstream.ok) return undefined;

    const markdown = await upstream.text();
    if (isNotMarkdown(upstream, markdown)) return undefined;

    return new Response(markdown, {
      status: 200,
      headers: {
        'content-type': MARKDOWN_TYPE,
        'cache-control': 'public, max-age=0, must-revalidate',
        vary: 'Accept, Accept-Encoding',
        link: `<${url.origin}${canonicalPath(url.pathname)}>; rel="canonical"`,
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return undefined; // Fail open: a bug here must never take the site down.
  }
}
