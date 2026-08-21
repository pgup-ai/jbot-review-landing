import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import middleware, { canonicalPath, markdownTwinFor, config } from '../middleware.ts';
import { ROUTES, NOT_FOUND_MARKDOWN } from '../lib/routes.mjs';
import { contentPages, urlPathFor, NOT_FOUND_PAGE } from '../scripts/build-markdown.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ORIGIN = 'https://www.pgupai.com';

/** Serve /md/*.md from disk so the middleware can be exercised offline. */
const realFetch = globalThis.fetch;
before(() => {
  globalThis.fetch = async (input) => {
    const target = new URL(input instanceof Request ? input.url : String(input));
    const file = path.join(ROOT, target.pathname.replace(/^\//, ''));
    if (!fs.existsSync(file)) return new Response('not found', { status: 404 });
    return new Response(fs.readFileSync(file, 'utf8'), { status: 200 });
  };
});
after(() => { globalThis.fetch = realFetch; });

const request = (pathname, accept, method = 'GET') =>
  new Request(`${ORIGIN}${pathname}`, {
    method,
    headers: accept === undefined ? {} : { accept },
  });

// --- Path normalisation ----------------------------------------------------

test('normalises paths to the clean URL used as the route key', () => {
  assert.equal(canonicalPath('/'), '/');
  assert.equal(canonicalPath('/index'), '/');
  assert.equal(canonicalPath('/index.html'), '/');
  assert.equal(canonicalPath('/guides/'), '/guides');
  assert.equal(canonicalPath('/guides/index'), '/guides');
  assert.equal(canonicalPath('/guides/index.html'), '/guides');
  assert.equal(canonicalPath('/guides//claude-code-review-github-actions'), '/guides/claude-code-review-github-actions');
  assert.equal(canonicalPath('/about.html'), '/about');
});

test('resolves the Markdown twin for every generated route', () => {
  for (const [url, twin] of Object.entries(ROUTES)) {
    assert.equal(markdownTwinFor(url), twin);
  }
  assert.equal(markdownTwinFor('/no-such-page'), null);
});

// --- Negotiated responses --------------------------------------------------

test('serves Markdown at the same URL for Accept: text/markdown', async () => {
  const response = await middleware(request('/', 'text/markdown'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  const body = await response.text();
  assert.match(body, /^#|^\*\*/m);
  assert.ok(body.includes('J-Bot'), 'markdown body should carry the page content');
});

test('sets Vary: Accept on every negotiated response', async () => {
  for (const accept of ['text/markdown', 'application/pdf', 'text/markdown, text/html;q=0.1']) {
    const response = await middleware(request('/guides', accept));
    if (response) assert.match(response.headers.get('vary'), /\bAccept\b/, `Accept: ${accept}`);
  }
});

test('leaves HTML requests untouched so the static file is served', async () => {
  const browser = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
  assert.equal(await middleware(request('/', browser)), undefined);
  assert.equal(await middleware(request('/guides', 'text/html')), undefined);
  assert.equal(await middleware(request('/', undefined)), undefined);
  assert.equal(await middleware(request('/', '*/*')), undefined);
});

test('answers 406 when the client accepts nothing this site produces', async () => {
  const response = await middleware(request('/', 'application/pdf'));
  assert.equal(response.status, 406);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  const body = await response.text();
  assert.match(body, /text\/html/);
  assert.match(body, /text\/markdown/);
  assert.match(body, /You requested: application\/pdf/);
});

test('does not cache a 406, since the same URL answers 200 for another client', async () => {
  const response = await middleware(request('/', 'application/pdf'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('honours q=0 rather than substring-matching the Accept header', async () => {
  // "anything but markdown" must still get HTML, not a Markdown body.
  assert.equal(await middleware(request('/', 'text/markdown;q=0, text/html')), undefined);
  // Markdown ranked above HTML wins.
  const response = await middleware(request('/', 'text/markdown, text/html;q=0.8'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
});

test('points agents back at the HTML representation via a canonical Link header', async () => {
  const response = await middleware(request('/guides/claude-code-review-github-actions', 'text/markdown'));
  assert.equal(
    response.headers.get('link'),
    `<${ORIGIN}/guides/claude-code-review-github-actions>; rel="canonical"`,
  );
});

// --- 404 behaviour ---------------------------------------------------------

test('answers a Markdown 404 with recovery links for an unknown path', async () => {
  const response = await middleware(request('/no-such-page', 'text/markdown'));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  const body = await response.text();
  assert.match(body, /^# 404/);
  assert.ok(body.includes('/no-such-page'), 'should name the path that was missed');
  assert.ok(body.includes(`${ORIGIN}/sitemap.xml`), 'should point at the sitemap');
  assert.ok(body.includes(`${ORIGIN}/llms.txt`), 'should point at llms.txt');
  assert.ok(body.includes(`${ORIGIN}/guides`), 'should point at the guides index');
});

test('lets unknown paths fall through to the static 404 page for browsers', async () => {
  assert.equal(await middleware(request('/no-such-page', 'text/html')), undefined);
  assert.equal(await middleware(request('/no-such-page', undefined)), undefined);
});

// --- Robustness ------------------------------------------------------------

test('HEAD returns the negotiated headers without a body', async () => {
  const response = await middleware(request('/', 'text/markdown', 'HEAD'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(await response.text(), '');
});

test('ignores non-GET methods entirely', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    assert.equal(await middleware(request('/', 'text/markdown', method)), undefined, method);
  }
});

test('falls back to HTML when the Markdown twin cannot be fetched', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => new Response('gone', { status: 500 });
  try {
    assert.equal(await middleware(request('/', 'text/markdown')), undefined);
  } finally {
    globalThis.fetch = saved;
  }
});

test('fails open to static serving if anything throws', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network down'); };
  try {
    assert.equal(await middleware(request('/', 'text/markdown')), undefined);
  } finally {
    globalThis.fetch = saved;
  }
});

// --- Route-table integrity -------------------------------------------------

test('the generated route table covers every content page except the error page', () => {
  const expected = contentPages(ROOT)
    .filter((file) => file !== NOT_FOUND_PAGE)
    .map((file) => urlPathFor(file))
    .sort();
  assert.deepEqual(Object.keys(ROUTES).sort(), expected);
});

test('every route points at a Markdown file that exists', () => {
  for (const twin of [...Object.values(ROUTES), NOT_FOUND_MARKDOWN]) {
    assert.ok(fs.existsSync(path.join(ROOT, twin.replace(/^\//, ''))), `missing ${twin}`);
  }
});

test('the matcher excludes assets, twins, and extensioned files', () => {
  const pattern = new RegExp(`^${config.matcher[0]}$`);
  for (const excluded of ['/assets/logo.png', '/md/index.md', '/robots.txt', '/sitemap.xml', '/llms.txt', '/x']) {
    assert.equal(pattern.test(excluded), false, `${excluded} should not reach the middleware`);
  }
  for (const included of ['/', '/guides', '/guides/claude-code-review-github-actions', '/about', '/no-such-page']) {
    assert.equal(pattern.test(included), true, `${included} should reach the middleware`);
  }
});

test('serves each route its own non-empty Markdown twin', async () => {
  for (const [url, twin] of Object.entries(ROUTES)) {
    const response = await middleware(request(url, 'text/markdown'));
    assert.equal(response.status, 200, url);
    const body = await response.text();
    assert.ok(body.length > 400, `${url} served a suspiciously short body`);
    assert.equal(body, fs.readFileSync(path.join(ROOT, twin.slice(1)), 'utf8'), `${url} served the wrong twin`);
  }
});
