/**
 * A small HTML → Markdown converter for this site's hand-written pages.
 *
 * This is deliberately NOT a general-purpose converter. It understands the
 * tag vocabulary these pages actually use, and throws on anything outside it
 * so a new construct surfaces as a failing test rather than as silently
 * dropped content. `test/markdown.test.mjs` asserts the vocabulary hasn't
 * grown beyond what is handled here.
 */

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Dropped entirely, children and all: chrome, icons, and interactive affordances. */
const DROP = new Set(['script', 'style', 'svg', 'button', 'noscript', 'template', 'form']);

const BLOCK_WRAPPER = new Set(['main', 'article', 'section', 'div', 'header', 'footer', 'aside', 'nav']);

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  hellip: '…', mdash: '—', ndash: '–', middot: '·', bull: '•',
  rarr: '→', larr: '←', harr: '↔', times: '×', copy: '©', reg: '®',
  trade: '™', deg: '°', plusmn: '±', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  check: '✓', dagger: '†', sect: '§', para: '¶', euro: '€', pound: '£',
};

export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      // fromCodePoint throws above 0x10FFFF, which would abort the build.
      const valid = Number.isInteger(code) && code >= 0 && code <= 0x10ffff;
      return valid ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function parseAttributes(source) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const value = match[2] === undefined
      ? ''
      : match[2].replace(/^["']|["']$/g, '');
    attrs[match[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
}

/** Parse an HTML fragment into a tree of {tag, attrs, children} and strings. */
export function parseFragment(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;

  let cursor = 0;
  let match;
  while ((match = re.exec(html)) !== null) {
    if (match.index > cursor) {
      stack[stack.length - 1].children.push(html.slice(cursor, match.index));
    }
    cursor = re.lastIndex;

    if (match[0].startsWith('<!--')) continue;

    const closing = match[1];
    if (closing) {
      const tag = closing.toLowerCase();
      // Unwind to the matching open tag; ignore strays.
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const tag = match[2].toLowerCase();
    const node = { tag, attrs: parseAttributes(match[3] || ''), children: [] };
    stack[stack.length - 1].children.push(node);
    if (!VOID.has(tag) && !match[4]) stack.push(node);
  }

  if (cursor < html.length) {
    stack[stack.length - 1].children.push(html.slice(cursor));
  }
  return root;
}

function isHidden(node) {
  if (node.attrs['aria-hidden'] === 'true') return true;
  if (node.attrs.hidden !== undefined && node.attrs.hidden !== 'false') return true;
  const cls = node.attrs.class || '';
  return /\bvisually-hidden\b|\bsr-only\b/.test(cls);
}

function hasClass(node, name) {
  return new RegExp(`\\b${name}\\b`).test(node.attrs.class || '');
}

/**
 * Escape only the characters that would actually change how Markdown parses.
 *
 * Notably `_` is left alone inside words: CommonMark does not treat intraword
 * underscores as emphasis, and escaping them turns `ANTHROPIC_API_KEY` into
 * unreadable noise.
 */
function escapeText(text) {
  return text
    .replace(/([\\`*[\]<])/g, '\\$1')
    // Underscores only matter at a word boundary.
    .replace(/(^|[^\w\\])_|_(?=[^\w]|$)/g, (m) => m.replace('_', '\\_'))
    // `>` and `#` only start a block when they lead a line.
    .replace(/(^|\n)([ \t]*)([>#])/g, '$1$2\\$3');
}

function collapse(text) {
  return text.replace(/\s+/g, ' ');
}

export function textOf(node) {
  if (typeof node === 'string') return decodeEntities(node);
  if (DROP.has(node.tag) || isHidden(node)) return '';
  if (node.tag === 'br') return '\n';
  return node.children.map(textOf).join('');
}

function renderInline(nodes, context) {
  let out = '';
  for (const node of nodes) {
    if (typeof node === 'string') {
      out += escapeText(collapse(decodeEntities(node)));
      continue;
    }
    if (DROP.has(node.tag) || isHidden(node)) continue;

    // A graphic's accessible name is its content for a text reader.
    if (node.attrs.role === 'img' && node.attrs['aria-label']) {
      out += escapeText(collapse(node.attrs['aria-label']).trim());
      continue;
    }
    // Badge labels ("free models", "new") sit flush against the text they
    // annotate; parenthesising keeps them readable once styling is gone.
    if (['ftag', 'ptag', 'new-tag', 'verified'].some((c) => hasClass(node, c))) {
      const badge = collapse(textOf(node)).trim();
      if (badge) out += `${/\s$/.test(out) ? '' : ' '}(${escapeText(badge)})`;
      continue;
    }

    const inner = () => renderInline(node.children, context);
    switch (node.tag) {
      case 'b':
      case 'strong': {
        const body = inner().trim();
        out += body ? `**${body}**` : '';
        break;
      }
      case 'em':
      case 'i': {
        const body = inner().trim();
        out += body ? `_${body}_` : '';
        break;
      }
      case 's':
      case 'del': {
        const body = inner().trim();
        out += body ? `~~${body}~~` : '';
        break;
      }
      case 'code':
      case 'kbd':
      case 'samp': {
        // Inline code is literal: never escape, but widen the fence if the
        // content itself contains a backtick.
        const body = collapse(textOf(node)).trim();
        if (!body) break;
        const fence = '`'.repeat(Math.max(...[...body.matchAll(/`+/g)].map((m) => m[0].length), 0) + 1);
        const pad = body.startsWith('`') || body.endsWith('`') ? ' ' : '';
        out += `${fence}${pad}${body}${pad}${fence}`;
        break;
      }
      case 'a': {
        const body = inner().trim();
        const href = node.attrs.href || '';
        if (!body) break;
        out += href ? `[${body}](${resolveHref(href, context)})` : body;
        break;
      }
      case 'img': {
        const alt = collapse(node.attrs.alt || '').trim();
        // Decorative images carry an empty alt; they add nothing for a reader.
        if (!alt) break;
        out += `![${escapeText(alt)}](${resolveHref(node.attrs.src || '', context)})`;
        break;
      }
      case 'br':
        out += '\n';
        break;
      case 'span':
      case 'small':
      case 'sup':
      case 'sub':
      case 'time':
      case 'abbr':
      case 'label':
      case 'q':
      case 'cite':
      case 'mark':
      case 'u':
      case 'var':
        out += inner();
        break;
      default:
        throw new Error(`markdown: unhandled inline element <${node.tag}>`);
    }
  }
  return out;
}

function resolveHref(href, context) {
  if (!href) return href;
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
    return href.startsWith('#') && context.canonical ? `${context.canonical}${href}` : href;
  }
  if (href.startsWith('/') && context.origin) return `${context.origin}${href}`;
  return href;
}

function renderListItems(node, context, ordered, depth) {
  const lines = [];
  let index = 0;
  for (const child of node.children) {
    if (typeof child === 'string') continue;
    if (child.tag !== 'li') continue;
    if (isHidden(child)) continue;
    index += 1;
    const marker = ordered ? `${index}. ` : '- ';
    const indent = '  '.repeat(depth);
    const body = renderBlocks(child.children, context, depth + 1).trim();
    if (!body) continue;
    const [first, ...rest] = body.split('\n');
    lines.push(`${indent}${marker}${first}`);
    for (const line of rest) {
      lines.push(line ? `${indent}${' '.repeat(marker.length)}${line}` : '');
    }
  }
  return lines.join('\n');
}

function renderTable(node, context) {
  const rows = [];
  const walk = (n) => {
    if (typeof n === 'string') return;
    if (n.tag === 'tr') {
      const cells = n.children
        .filter((c) => typeof c !== 'string' && (c.tag === 'th' || c.tag === 'td'))
        .map((c) => ({
          header: c.tag === 'th',
          text: renderInline(c.children, context).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim(),
        }));
      if (cells.length) rows.push(cells);
      return;
    }
    n.children.forEach(walk);
  };
  walk(node);
  if (!rows.length) return '';

  const width = Math.max(...rows.map((r) => r.length));
  const pad = (cells) => {
    const copy = cells.map((c) => c.text);
    while (copy.length < width) copy.push('');
    return `| ${copy.join(' | ')} |`;
  };

  const headerRow = rows[0].every((c) => c.header) ? rows.shift() : null;
  const out = [];
  out.push(pad(headerRow ?? Array.from({ length: width }, () => ({ text: '' }))));
  out.push(`| ${Array.from({ length: width }, () => '---').join(' | ')} |`);
  for (const row of rows) out.push(pad(row));
  return out.join('\n');
}

function renderCodeBlock(node, lang = '') {
  if (!lang && hasClass(node, 'diff')) lang = 'diff';
  // <pre> content is literal: strip the syntax-highlighting spans, keep text.
  // Diff mocks put each line in a block-styled .row span with no newline
  // between them, so reconstruct the line breaks from that structure.
  const rows = node.children.filter((c) => typeof c !== 'string' && hasClass(c, 'row'));
  let text = rows.length
    ? rows.map((row) => textOf(row).replace(/\s+$/, '')).join('\n')
    : textOf(node).replace(/^\n/, '').replace(/\s+$/, '');
  const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`{3,}/g)].map((m) => m[0].length + 1)));
  return `${fence}${lang}\n${text}\n${fence}`;
}

/** Fence language for a code block, inferred from its filename caption. */
const LANG_BY_EXTENSION = {
  yml: 'yaml', yaml: 'yaml', json: 'json', sh: 'bash', bash: 'bash',
  toml: 'toml', md: 'markdown', js: 'javascript', mjs: 'javascript',
  ts: 'typescript', py: 'python', env: 'ini', txt: '',
};

function languageFor(filename) {
  // Captions may append a qualifier, e.g. "jbot-review.yml · proxy input".
  const [first = ''] = (filename || '').trim().split(/\s+/);
  const ext = /\.([a-z0-9]+)$/i.exec(first);
  return ext ? (LANG_BY_EXTENSION[ext[1].toLowerCase()] ?? '') : '';
}

function findNode(node, predicate) {
  if (typeof node === 'string') return null;
  for (const child of node.children) {
    if (typeof child === 'string') continue;
    if (predicate(child)) return child;
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

/** Block-level tags that cannot appear inside a Markdown inline run. */
const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'pre',
  'table', 'details', 'blockquote', 'hr', 'dl', 'figure',
]);

/** True when a subtree contains block content (so it cannot render inline). */
function containsBlock(node) {
  if (typeof node === 'string') return false;
  if (DROP.has(node.tag)) return false;
  return node.children.some(
    (child) => typeof child !== 'string' && (BLOCK_TAGS.has(child.tag) || containsBlock(child)),
  );
}

/**
 * These pages use link "cards" — an <a> wrapping a kicker label, a title, and
 * a description paragraph. Rendered as a single Markdown list item so the
 * label, destination, and blurb survive as one readable unit.
 */
function isCardLink(node) {
  return typeof node !== 'string' && node.tag === 'a' && containsBlock(node);
}

function renderCard(node, context) {
  let kicker = '';
  const titleParts = [];
  const descriptions = [];

  const walk = (child) => {
    if (typeof child === 'string') {
      if (child.trim()) titleParts.push(child);
      return;
    }
    if (DROP.has(child.tag) || isHidden(child) || child.tag === 'img') return;
    if (!kicker && child.tag === 'span' && (hasClass(child, 'k2') || hasClass(child, 'tag'))) {
      kicker = collapse(textOf(child)).trim();
      return;
    }
    // A card's date stamp reads as metadata, not as part of its title.
    if (child.tag === 'span' && hasClass(child, 'date')) {
      const stamp = collapse(textOf(child)).trim();
      if (stamp) descriptions.push(`(${stamp})`);
      return;
    }
    if (BLOCK_TAGS.has(child.tag)) {
      if (/^h[1-6]$/.test(child.tag)) {
        // Unwrap the heading: a card title is inline content, not a section.
        titleParts.push(...child.children);
        return;
      }
      const text = renderInline(child.children, context).trim();
      if (text) descriptions.push(text);
      return;
    }
    if (containsBlock(child)) {
      child.children.forEach(walk);
      return;
    }
    titleParts.push(child);
  };
  node.children.forEach(walk);

  const title = renderInline(titleParts, context).trim();
  const href = resolveHref(node.attrs.href || '', context);
  if (!title) return '';

  const link = href ? `[${title}](${href})` : title;
  const lead = kicker ? `**${escapeText(kicker)}** — ${link}` : link;
  const blurb = descriptions.join(' ');
  return `- ${blurb ? `${lead}: ${blurb}` : lead}`;
}

function renderBlocks(nodes, context, depth = 0) {
  const blocks = [];
  const inlineRun = [];

  const flushInline = () => {
    if (!inlineRun.length) return;
    const text = renderInline(inlineRun, context).trim();
    inlineRun.length = 0;
    if (text) blocks.push(text);
  };

  for (const node of nodes) {
    if (typeof node === 'string') {
      // Whitespace between two inline elements is a real word separator —
      // dropping it glues adjacent links together.
      if (node.trim() || inlineRun.length) inlineRun.push(node);
      continue;
    }
    if (DROP.has(node.tag) || isHidden(node)) continue;

    switch (node.tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        flushInline();
        const level = Number(node.tag[1]);
        // A Markdown heading is single-line: fold any <br> into a space.
        const text = renderInline(node.children, context).replace(/\s*\n\s*/g, ' ').trim();
        if (text) blocks.push(`${'#'.repeat(level)} ${text}`);
        break;
      }
      case 'p': {
        flushInline();
        // Breadcrumb trails are navigation chrome, not content.
        if (hasClass(node, 'crumbs')) break;
        const text = renderInline(node.children, context).trim();
        if (text) blocks.push(text);
        break;
      }
      case 'ul':
      case 'ol': {
        flushInline();
        const list = renderListItems(node, context, node.tag === 'ol', depth);
        if (list) blocks.push(list);
        break;
      }
      case 'pre': {
        flushInline();
        const code = renderCodeBlock(node);
        if (code) blocks.push(code);
        break;
      }
      case 'table': {
        flushInline();
        const table = renderTable(node, context);
        if (table) blocks.push(table);
        break;
      }
      case 'details': {
        flushInline();
        const summary = node.children.find((c) => typeof c !== 'string' && c.tag === 'summary');
        const rest = node.children.filter((c) => c !== summary);
        if (summary) {
          const question = renderInline(summary.children, context).trim();
          if (question) blocks.push(`### ${question}`);
        }
        const body = renderBlocks(rest, context, depth).trim();
        if (body) blocks.push(body);
        break;
      }
      case 'blockquote': {
        flushInline();
        const body = renderBlocks(node.children, context, depth).trim();
        if (body) blocks.push(body.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
        break;
      }
      case 'hr': {
        flushInline();
        blocks.push('---');
        break;
      }
      case 'dl':
      case 'figure':
      case 'figcaption':
      case 'li':
      case 'summary': {
        flushInline();
        const body = renderBlocks(node.children, context, depth).trim();
        if (body) blocks.push(body);
        break;
      }
      default: {
        if (node.attrs.role === 'img' && node.attrs['aria-label']) {
          flushInline();
          blocks.push(escapeText(collapse(node.attrs['aria-label']).trim()));
          break;
        }
        if (isCardLink(node)) {
          flushInline();
          const card = renderCard(node, context);
          if (card) {
            // Merge with an immediately preceding card run so a grid of cards
            // renders as one tight Markdown list.
            const previous = blocks[blocks.length - 1];
            if (previous && /^- /.test(previous) && !previous.includes('\n\n')) {
              blocks[blocks.length - 1] = `${previous}\n${card}`;
            } else {
              blocks.push(card);
            }
          }
          break;
        }
        if (BLOCK_WRAPPER.has(node.tag) && hasClass(node, 'chips')) {
          flushInline();
          const chips = node.children
            .filter((c) => typeof c !== 'string' && !isHidden(c))
            .map((c) => collapse(renderInline([c], context)).trim())
            .filter(Boolean);
          if (chips.length) blocks.push(chips.join(' · '));
          break;
        }
        if (BLOCK_WRAPPER.has(node.tag)) {
          // Stat bands pair a big number (.n) with its caption (.l).
          // Direct children only — a deep search would swallow whole sections.
          const kids = node.children.filter((c) => typeof c !== 'string');
          const value = kids.find((c) => hasClass(c, 'n'));
          const label = kids.find((c) => hasClass(c, 'l'));
          if (value && label) {
            flushInline();
            const stat = collapse(renderInline(value.children, context)).trim();
            const caption = collapse(renderInline(label.children, context)).trim();
            if (stat) blocks.push(caption ? `**${stat}** — ${caption}` : `**${stat}**`);
            break;
          }
        }
        if (BLOCK_WRAPPER.has(node.tag) && hasClass(node, 'code-card')) {
          flushInline();
          const caption = findNode(node, (n) => hasClass(n, 'file'));
          const pre = findNode(node, (n) => n.tag === 'pre');
          const filename = caption ? collapse(textOf(caption)).trim() : '';
          if (filename) blocks.push(`\`${filename}\``);
          if (pre) blocks.push(renderCodeBlock(pre, languageFor(filename)));
          break;
        }
        if (BLOCK_WRAPPER.has(node.tag) && hasClass(node, 'callout')) {
          flushInline();
          const label = findNode(node, (n) => n.tag === 'span' && hasClass(n, 'tag'));
          const rest = label
            ? { ...node, children: node.children.filter((c) => c !== label) }
            : node;
          const lines = [];
          if (label) lines.push(`**${collapse(textOf(label)).trim()}**`, '');
          const body = renderBlocks(rest.children, context, depth).trim();
          if (body) lines.push(body);
          const quoted = lines.join('\n').split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n');
          if (quoted.trim() !== '>') blocks.push(quoted);
          break;
        }
        if (BLOCK_WRAPPER.has(node.tag)) {
          flushInline();
          const body = renderBlocks(node.children, context, depth).trim();
          if (body) blocks.push(body);
          break;
        }
        // Anything else is inline; renderInline throws on genuinely unknown tags.
        inlineRun.push(node);
      }
    }
  }

  flushInline();
  return blocks.join('\n\n');
}

/**
 * Convert one page's `<main>` element into a Markdown document.
 * `context` takes `{ origin, canonical }`, used to absolutise links.
 */
export function htmlToMarkdown(html, context = {}) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!main) throw new Error('markdown: page has no <main> element');
  const tree = parseFragment(main[1]);
  const body = renderBlocks(tree.children, context).trim();
  return `${body}\n`;
}
