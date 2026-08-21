/**
 * RFC 9110 Accept-header content negotiation.
 *
 * Implements the ranking rules published at
 * https://acceptmarkdown.com/guides/accept-parsing :
 *
 *   1. Sort by q descending.
 *   2. Break ties by specificity: `text/markdown` > `text/*` > `*​/*`.
 *   3. Respect `q=0` — it means "don't send me this", never "no preference".
 *
 * Deliberately dependency-free: this module is bundled into Vercel Edge
 * Middleware, which has no node_modules at runtime.
 */

/**
 * Policy: how to treat `Accept:` sent with an empty value.
 *
 * A strict reading makes an empty list "nothing is acceptable" → 406.
 * We serve the default instead: this is a marketing site whose whole job is
 * being crawled and cited, and 406-ing an odd crawler costs more than the
 * strictness buys. acceptmarkdown.com's own guidance is that 406 should be
 * rare and "a spec-correct default is better than 406".
 *
 * Flip to `false` for the strict reading; the behaviour is covered by tests.
 */
export const EMPTY_ACCEPT_IS_UNCONSTRAINED = true;

/** Specificity ranks, higher wins a q-value tie. */
const EXACT = 3;
const SUBTYPE_WILDCARD = 2;
const FULL_WILDCARD = 1;
const NO_MATCH = 0;

/**
 * Parse an Accept header into ranked entries.
 *
 * @param {string} header raw Accept field value
 * @returns {{type: string, subtype: string, q: number}[]}
 */
export function parseAccept(header) {
  const entries = [];
  for (const raw of String(header).split(',')) {
    const parts = raw.trim().split(';');
    const media = parts.shift().trim().toLowerCase();
    if (!media || !media.includes('/')) continue;

    const [type, subtype] = media.split('/', 2);
    if (!type || !subtype) continue;

    // Default q is 1 when the parameter is absent (RFC 9110 §12.4.2).
    let q = 1;
    for (const param of parts) {
      const eq = param.indexOf('=');
      if (eq === -1) continue;
      if (param.slice(0, eq).trim().toLowerCase() !== 'q') continue;
      const parsed = Number.parseFloat(param.slice(eq + 1).trim());
      q = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 1;
    }
    entries.push({ type, subtype, q });
  }
  return entries;
}

/**
 * How specifically an Accept entry matches a concrete media type.
 *
 * @returns {number} one of NO_MATCH | FULL_WILDCARD | SUBTYPE_WILDCARD | EXACT
 */
function specificity(entry, type, subtype) {
  if (entry.type === type && entry.subtype === subtype) return EXACT;
  if (entry.type === type && entry.subtype === '*') return SUBTYPE_WILDCARD;
  if (entry.type === '*' && entry.subtype === '*') return FULL_WILDCARD;
  return NO_MATCH;
}

/**
 * Choose the representation to serve.
 *
 * `produces` is ordered by server preference: the first entry wins q-value
 * ties, so `['text/html', 'text/markdown']` keeps HTML the default for
 * browsers sending `*​/*`.
 *
 * @param {string|null|undefined} header raw Accept field value, or null when absent
 * @param {string[]} produces media types this resource can serve, best first
 * @returns {string|null} the chosen media type, or null when the client
 *   accepts none of them (the caller should answer 406)
 */
export function negotiate(header, produces) {
  // An absent Accept header means "no constraint" — serve the default.
  // An *empty* header is a different case; see EMPTY_ACCEPT_IS_UNCONSTRAINED.
  if (header === null || header === undefined) return produces[0] ?? null;
  if (String(header).trim() === '') {
    return EMPTY_ACCEPT_IS_UNCONSTRAINED ? (produces[0] ?? null) : null;
  }

  const entries = parseAccept(header);
  if (entries.length === 0) {
    return EMPTY_ACCEPT_IS_UNCONSTRAINED ? (produces[0] ?? null) : null;
  }

  let best = null;
  let bestQ = 0;
  let bestSpecificity = NO_MATCH;

  for (const candidate of produces) {
    const [type, subtype] = candidate.toLowerCase().split('/', 2);

    // Among the entries that match this candidate, the most specific one
    // decides its q — `text/markdown;q=0, text/*` must score markdown at 0.
    let matchQ = 0;
    let matchSpecificity = NO_MATCH;
    for (const entry of entries) {
      const rank = specificity(entry, type, subtype);
      if (rank > matchSpecificity) {
        matchSpecificity = rank;
        matchQ = entry.q;
      }
    }

    if (matchSpecificity === NO_MATCH || matchQ === 0) continue;
    // Strictly greater keeps `produces` order as the tie-breaker.
    if (matchQ > bestQ || (matchQ === bestQ && matchSpecificity > bestSpecificity)) {
      best = candidate;
      bestQ = matchQ;
      bestSpecificity = matchSpecificity;
    }
  }

  return best;
}
