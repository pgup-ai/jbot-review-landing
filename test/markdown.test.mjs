import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { htmlToMarkdown, decodeEntities, textOf, parseFragment } from '../lib/markdown.mjs';
import { contentPages, markdownPathFor, urlPathFor, build, ORIGIN } from '../scripts/build-markdown.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const wrap = (body) => `<main>${body}</main>`;
const convert = (body, context = { origin: ORIGIN }) => htmlToMarkdown(wrap(body), context);

test('converts headings, emphasis, and inline code', () => {
  assert.equal(convert('<h1>Title</h1>'), '# Title\n');
  assert.equal(convert('<h2 id="x">Section</h2>'), '## Section\n');
  assert.equal(convert('<p>a <b>bold</b> and <em>italic</em> word</p>'), 'a **bold** and _italic_ word\n');
  assert.equal(convert('<p>set <code>ANTHROPIC_API_KEY</code></p>'), 'set `ANTHROPIC_API_KEY`\n');
});

test('folds a <br> inside a heading instead of breaking it across lines', () => {
  assert.equal(convert('<h1>Code review<br>in your CI</h1>'), '# Code review in your CI\n');
});

test('keeps whitespace between adjacent inline elements', () => {
  const md = convert('<div><a href="/a">One</a>\n  <a href="/b">Two</a></div>');
  assert.equal(md.trim(), `[One](${ORIGIN}/a) [Two](${ORIGIN}/b)`);
});

test('resolves site-relative links against the canonical origin', () => {
  assert.match(convert('<p><a href="/guides">Guides</a></p>'), /\]\(https:\/\/www\.pgupai\.com\/guides\)/);
  assert.match(convert('<p><a href="https://example.com/x">Ext</a></p>'), /\]\(https:\/\/example\.com\/x\)/);
});

test('resolves in-page anchors against the page canonical', () => {
  const md = convert('<p><a href="#setup">Setup</a></p>', { origin: ORIGIN, canonical: `${ORIGIN}/guides` });
  assert.match(md, /\]\(https:\/\/www\.pgupai\.com\/guides#setup\)/);
});

test('renders ordered and unordered lists', () => {
  assert.equal(convert('<ul><li>one</li><li>two</li></ul>').trim(), '- one\n- two');
  assert.equal(convert('<ol><li>one</li><li>two</li></ol>').trim(), '1. one\n2. two');
});

test('renders a code card as a caption plus a fenced block with a language', () => {
  const md = convert(
    '<div class="code-card"><div class="code-head"><span class="file">deploy.yml</span>' +
      '<button>Copy</button></div><pre>name: x\n  run: y</pre></div>',
  );
  assert.equal(md.trim(), '`deploy.yml`\n\n```yaml\nname: x\n  run: y\n```');
});

test('reconstructs line breaks from block-styled .row spans inside <pre>', () => {
  const md = convert('<pre class="diff"><span class="row">line one</span><span class="row">line two</span></pre>');
  assert.equal(md.trim(), '```\nline one\nline two\n```');
});

test('renders a table with a header row', () => {
  const md = convert(
    '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
  );
  assert.equal(md.trim(), '| a | b |\n| --- | --- |\n| 1 | 2 |');
});

test('escapes pipes inside table cells so the row stays intact', () => {
  const md = convert('<table><tr><td>a|b</td><td>c</td></tr></table>');
  assert.match(md, /a\\\|b/);
});

test('renders a link card as one list item with its kicker and blurb', () => {
  const md = convert('<a class="rel-card" href="/guides"><span class="k2">Guide</span>All guides<p>Every setup path.</p></a>');
  assert.equal(md.trim(), `- **Guide** — [All guides](${ORIGIN}/guides): Every setup path.`);
});

test('groups a run of cards into a single list', () => {
  const md = convert(
    '<div class="related"><a class="rel-card" href="/a"><span class="k2">K</span>A<p>one</p></a>' +
      '<a class="rel-card" href="/b"><span class="k2">K</span>B<p>two</p></a></div>',
  );
  assert.equal(md.trim().split('\n').length, 2);
  assert.match(md, /^- \*\*K\*\* — \[A\]/m);
  assert.match(md, /^- \*\*K\*\* — \[B\]/m);
});

test('renders a callout as a blockquote with its label', () => {
  const md = convert('<div class="callout"><span class="tag">Note</span><p>Body text.</p></div>');
  assert.equal(md.trim(), '> **Note**\n>\n> Body text.');
});

test('pairs a stat value with its caption', () => {
  assert.equal(convert('<div><div class="n">$0</div><div class="l">per seat</div></div>').trim(), '**$0** — per seat');
});

test('joins a chip row with separators instead of gluing the labels', () => {
  const md = convert('<div class="chips"><span class="chip">Claude</span><span class="chip">OpenAI</span></div>');
  assert.equal(md.trim(), 'Claude · OpenAI');
});

test('parenthesises badge labels that sit flush against their text', () => {
  assert.equal(convert('<h3>Custom endpoints<span class="new-tag">new</span></h3>').trim(), '### Custom endpoints (new)');
});

test('uses the accessible name of a role="img" graphic', () => {
  const md = convert('<div role="img" aria-label="A connects to B"><span>A</span><span aria-hidden="true">→</span><span>B</span></div>');
  assert.equal(md.trim(), 'A connects to B');
});

test('drops decorative and hidden content', () => {
  assert.equal(convert('<p>keep<span aria-hidden="true">+</span></p>').trim(), 'keep');
  assert.equal(convert('<p>keep<svg><path d="M0 0"/></svg></p>').trim(), 'keep');
  assert.equal(convert('<p>keep<button>Copy</button></p>').trim(), 'keep');
  assert.equal(convert('<p>keep<img src="/a.png" alt=""></p>').trim(), 'keep');
});

test('drops breadcrumb navigation', () => {
  assert.equal(convert('<p class="crumbs"><a href="/">Home</a> / Guides</p><p>Body</p>').trim(), 'Body');
});

test('renders a details/summary pair as a heading plus answer', () => {
  const md = convert('<details><summary>Is it free?<span class="faq-mark" aria-hidden="true">+</span></summary><div class="faq-a"><p>Yes.</p></div></details>');
  assert.equal(md.trim(), '### Is it free?\n\nYes.');
});

test('decodes the entities these pages use', () => {
  assert.equal(decodeEntities('a &amp; b &mdash; c &hellip; &rarr; &#8212; &#x2713;'), 'a & b — c … → — ✓');
});

test('does not escape underscores inside words', () => {
  assert.equal(convert('<p>OPENCODE_API_KEY</p>').trim(), 'OPENCODE_API_KEY');
});

test('escapes characters that would otherwise start Markdown syntax', () => {
  assert.match(convert('<p>a [b] c</p>'), /a \\\[b\\\] c/);
  assert.match(convert('<p>2 * 3</p>'), /2 \\\* 3/);
});

test('textOf strips markup but keeps readable text', () => {
  const tree = parseFragment('<p>a <b>b</b><span aria-hidden="true">x</span></p>');
  assert.equal(textOf(tree).trim(), 'a b');
});

test('throws on a page without a <main> element', () => {
  assert.throws(() => htmlToMarkdown('<html><body><p>hi</p></body></html>'), /no <main>/);
});

test('throws rather than silently dropping an unknown element', () => {
  assert.throws(() => convert('<p>text <marquee>?</marquee></p>'), /unhandled inline element <marquee>/);
});

// --- Whole-site guards -----------------------------------------------------

test('every content page converts without hitting an unhandled element', () => {
  const pages = contentPages(ROOT);
  assert.ok(pages.length >= 22, `expected the full page set, saw ${pages.length}`);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.doesNotThrow(() => htmlToMarkdown(html, { origin: ORIGIN }), `${page} failed to convert`);
  }
});

test('no generated Markdown leaks raw HTML tags', () => {
  for (const page of contentPages(ROOT)) {
    const md = fs.readFileSync(path.join(ROOT, markdownPathFor(page)), 'utf8');
    const stripped = md.replace(/```[\s\S]*?```/g, '');
    assert.doesNotMatch(stripped, /<\/?(div|span|p|a|h[1-6]|ul|ol|li|table|svg|button)\b/i, `${page} leaked HTML`);
    assert.doesNotMatch(stripped, /&(amp|lt|gt|quot|nbsp|hellip|mdash|rarr);/, `${page} leaked an entity`);
  }
});

test('every page has a committed, up-to-date Markdown twin', () => {
  const stale = build({ check: true, root: ROOT }).filter((r) => r.stale);
  assert.deepEqual(stale, [], 'run: node scripts/build-markdown.mjs');
});

test('every twin carries a heading, real content, and the canonical footer', () => {
  for (const page of contentPages(ROOT)) {
    const md = fs.readFileSync(path.join(ROOT, markdownPathFor(page)), 'utf8');
    const canonical = `${ORIGIN}${urlPathFor(page)}`;
    assert.match(md, /^#{1,2} .+/m, `${markdownPathFor(page)} has no heading`);
    assert.ok(md.length > 400, `${markdownPathFor(page)} is suspiciously short`);
    assert.ok(md.includes(canonical), `${markdownPathFor(page)} is missing its canonical URL`);
    assert.ok(md.includes(`${ORIGIN}/llms.txt`), `${markdownPathFor(page)} is missing the llms.txt pointer`);
  }
});

test('URL mapping matches the clean URLs vercel.json serves', () => {
  assert.equal(urlPathFor('index.html'), '/');
  assert.equal(urlPathFor('guides/index.html'), '/guides');
  assert.equal(urlPathFor('guides/claude-code-review-github-actions.html'), '/guides/claude-code-review-github-actions');
  assert.equal(urlPathFor('about.html'), '/about');
  assert.equal(markdownPathFor('guides/index.html'), 'md/guides/index.md');
});
