import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { textOf, parseFragment } from '../lib/markdown.mjs';
import { contentPages, urlPathFor, markdownPathFor, ORIGIN, NOT_FOUND_PAGE } from '../scripts/build-markdown.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const TRUST_PAGES = ['about.html', 'contact.html', 'privacy.html'];

/** Visible text of a page's <main>, the way a reader or crawler sees it. */
function mainText(file) {
  const main = read(file).match(/<main[^>]*>([\s\S]*?)<\/main>/);
  assert.ok(main, `${file} has no <main>`);
  return textOf(parseFragment(main[1])).replace(/\s+/g, ' ').trim();
}

// --- Trust anchor pages (audit item 4) -------------------------------------

test('the trust anchor pages exist', () => {
  for (const file of TRUST_PAGES) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `missing ${file}`);
  }
});

test('each trust anchor page carries well over the 500-character minimum', () => {
  for (const file of TRUST_PAGES) {
    const length = mainText(file).length;
    assert.ok(length >= 500, `${file} has only ${length} characters of content`);
  }
});

test('each trust anchor page has a title, description, canonical, and h1', () => {
  for (const file of TRUST_PAGES) {
    const html = read(file);
    assert.match(html, /<title>[^<]{10,}<\/title>/, `${file} title`);
    assert.match(html, /<meta name="description" content="[^"]{50,}"/, `${file} description`);
    assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}${urlPathFor(file)}" />`), `${file} canonical`);
    assert.match(html, /<h1>[^<]+<\/h1>/, `${file} h1`);
  }
});

test('the trust anchor pages are reachable from the site footers', () => {
  for (const file of contentPages(ROOT)) {
    if (file === NOT_FOUND_PAGE) continue;
    const footer = read(file).match(/<footer[\s\S]*?<\/footer>/);
    assert.ok(footer, `${file} has no footer`);
    assert.match(footer[0], /href="\/about"/, `${file} footer is missing /about`);
    assert.match(footer[0], /href="\/privacy"/, `${file} footer is missing /privacy`);
  }
});

test('/contact points only at channels that actually exist', () => {
  const html = read('contact.html');
  assert.match(html, /https:\/\/x\.com\/j1ngb0/, 'the public channel must be listed');
  // Issues and Discussions are disabled org-wide; linking a tracker would dead-end.
  assert.doesNotMatch(html, /github\.com\/pgup-ai\/[\w-]+\/issues/, 'must not link a disabled issue tracker');
  assert.doesNotMatch(html, /github\.com\/pgup-ai\/[\w-]+\/discussions/, 'must not link disabled discussions');
});

test('/privacy states the third parties the site actually loads', () => {
  const text = mainText('privacy.html');
  assert.match(text, /Vercel/);
  assert.match(text, /Google Fonts/);
  // The claims below must stay true of the built site.
  const home = read('index.html');
  assert.doesNotMatch(home, /googletagmanager|google-analytics|plausible\.io|\/_vercel\/insights/, 'site claims no analytics');
  assert.doesNotMatch(home, /localStorage|sessionStorage|document\.cookie/, 'site claims no cookies or storage');
});

test('the 404 page is a real page and asks not to be indexed', () => {
  const html = read(NOT_FOUND_PAGE);
  assert.match(html, /<meta name="robots" content="noindex, follow" \/>/);
  assert.doesNotMatch(html, /<link rel="canonical"/, 'an error page has no canonical URL');
  const text = mainText(NOT_FOUND_PAGE);
  assert.match(text, /404/);
  for (const target of ['/guides', '/llms.txt', '/sitemap.xml']) {
    assert.match(html, new RegExp(`href="${target.replace('.', '\\.')}"`), `404 should link ${target}`);
  }
});

// --- Organization schema (audit item 5) ------------------------------------

function graph() {
  const block = read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return JSON.parse(block[1])['@graph'];
}

test('every JSON-LD block on every page parses', () => {
  for (const file of [...contentPages(ROOT), NOT_FOUND_PAGE]) {
    for (const [, body] of read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(body), `${file} has malformed JSON-LD`);
    }
  }
});

test('Organization schema carries both contactPoint and address', () => {
  const org = graph().find((node) => node['@type'] === 'Organization');
  assert.ok(org, 'no Organization node');

  assert.ok(Array.isArray(org.contactPoint) && org.contactPoint.length > 0, 'contactPoint missing');
  for (const point of org.contactPoint) {
    assert.equal(point['@type'], 'ContactPoint');
    assert.ok(point.contactType, 'contactPoint needs a contactType');
    assert.ok(point.email || point.telephone || point.url, 'contactPoint needs a reachable channel');
  }

  assert.equal(org.address?.['@type'], 'PostalAddress');
  assert.equal(org.address.addressCountry, 'CA');
});

test('the trust anchor pages declare the schema types agents look for', () => {
  const types = {
    'about.html': 'AboutPage',
    'contact.html': 'ContactPage',
    'privacy.html': 'WebPage',
  };
  for (const [file, expected] of Object.entries(types)) {
    const block = read(file).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const nodes = JSON.parse(block[1])['@graph'];
    assert.ok(nodes.some((n) => n['@type'] === expected), `${file} should declare ${expected}`);
    assert.ok(nodes.some((n) => n['@type'] === 'BreadcrumbList'), `${file} should declare a BreadcrumbList`);
  }
});

// --- Machine-readable surfaces (audit item 3) ------------------------------

test('llms.txt has a when-to-use section with concrete jobs', () => {
  const llms = read('llms.txt');
  assert.match(llms, /^## When to use this$/m);
  assert.match(llms, /^### When not to use it$/m);
  assert.match(llms, /^### How an agent should call this project$/m);

  const section = llms.split('## When to use this')[1].split('\n## Docs')[0];
  const bullets = section.split('\n').filter((l) => l.startsWith('- '));
  assert.ok(bullets.length >= 8, `expected concrete use cases, found ${bullets.length}`);
  assert.match(section, /text\/markdown/, 'should tell agents about content negotiation');
});

test('llms.txt links the trust anchor pages', () => {
  const llms = read('llms.txt');
  for (const page of ['/about', '/contact', '/privacy']) {
    assert.ok(llms.includes(`${ORIGIN}${page}`), `llms.txt is missing ${page}`);
  }
});

test('sitemap.xml lists exactly the canonical pages, and stays well formed', () => {
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const expected = contentPages(ROOT)
    .filter((file) => file !== NOT_FOUND_PAGE)
    .map((file) => `${ORIGIN}${urlPathFor(file) === '/' ? '/' : urlPathFor(file)}`);

  assert.deepEqual([...locs].sort(), [...expected].sort());
  assert.equal(locs.length, new Set(locs).size, 'sitemap has duplicate URLs');
  for (const [, lastmod] of xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) {
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `bad lastmod: ${lastmod}`);
  }
});

test('robots.txt stays open to crawlers and points at the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /Sitemap: https:\/\/www\.pgupai\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /^Disallow: \/$/m, 'must not block the whole site');
});

// --- Deployment configuration ----------------------------------------------

test('vercel.json is valid and wires the middleware entrypoint', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.proxy.entrypoint, 'middleware.ts');
  assert.ok(fs.existsSync(path.join(ROOT, config.proxy.entrypoint)), 'entrypoint file must exist');
  assert.equal(config.cleanUrls, true, 'clean URLs are what the route table assumes');
});

test('vercel.json sets Vary: Accept on every content-negotiated page shape', () => {
  const config = JSON.parse(read('vercel.json'));
  const varyRules = config.headers.filter((rule) =>
    rule.headers.some((h) => h.key === 'Vary' && /\bAccept\b(?!-)/.test(h.value)));
  const sources = varyRules.map((rule) => rule.source);
  for (const source of ['/', '/guides/:slug+', '/compare/:slug+']) {
    assert.ok(sources.includes(source), `no Vary rule for ${source}`);
  }
  assert.match(sources.join(' '), /about\|contact\|privacy/, 'trust pages need a Vary rule');
});

test('the Markdown store is served as Markdown and kept out of the index', () => {
  const config = JSON.parse(read('vercel.json'));
  const rule = config.headers.find((r) => r.source.startsWith('/md/'));
  assert.ok(rule, 'no header rule for /md/');
  const values = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
  assert.equal(values['Content-Type'], 'text/markdown; charset=utf-8');
  assert.equal(values['X-Robots-Tag'], 'noindex');
});

test('deploy excludes tooling but keeps what the middleware imports', () => {
  const ignore = read('.vercelignore');
  assert.match(ignore, /^scripts\/$/m);
  assert.match(ignore, /^test\/$/m);
  assert.doesNotMatch(ignore, /^lib\/$/m, 'middleware.ts imports lib/');
  assert.doesNotMatch(ignore, /^md\/$/m, 'middleware.ts fetches md/');
});

test('every page advertises its Markdown representation', () => {
  for (const file of contentPages(ROOT)) {
    if (file === NOT_FOUND_PAGE) continue;
    const html = read(file);
    assert.ok(
      html.includes(`<link rel="alternate" type="text/markdown" href="/${markdownPathFor(file)}"`),
      `${file} does not advertise /${markdownPathFor(file)}`,
    );
  }
});
