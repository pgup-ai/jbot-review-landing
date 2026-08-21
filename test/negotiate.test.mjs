import test from 'node:test';
import assert from 'node:assert/strict';
import { negotiate, EMPTY_ACCEPT_IS_UNCONSTRAINED } from '../lib/negotiate.mjs';

const BOTH = ['text/html', 'text/markdown'];
const MD_ONLY = ['text/markdown'];

/**
 * The published conformance vectors from
 * https://acceptmarkdown.com/guides/accept-parsing ("Test vectors").
 * `null` for the expected value means "answer 406".
 */
const SPEC_VECTORS = [
  { accept: 'text/markdown', produces: BOTH, expected: 'text/markdown' },
  { accept: 'text/markdown, text/html;q=0.8', produces: BOTH, expected: 'text/markdown' },
  { accept: 'text/html', produces: BOTH, expected: 'text/html' },
  { accept: 'text/markdown;q=0, text/html', produces: BOTH, expected: 'text/html' },
  { accept: 'text/markdown;q=0', produces: MD_ONLY, expected: null },
  { accept: null, produces: BOTH, expected: 'text/html' },
  { accept: '*/*', produces: BOTH, expected: 'text/html' },
];

test('matches every published acceptmarkdown.com test vector', () => {
  for (const { accept, produces, expected } of SPEC_VECTORS) {
    assert.equal(
      negotiate(accept, produces),
      expected,
      `Accept: ${accept === null ? '(absent)' : accept}`,
    );
  }
});

test('a real Chrome Accept header still gets HTML', () => {
  const chrome =
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
  assert.equal(negotiate(chrome, BOTH), 'text/html');
});

test('honours q-value ordering rather than header order', () => {
  assert.equal(negotiate('text/markdown;q=0.3, text/html;q=0.7', BOTH), 'text/html');
});

test('breaks q-value ties by specificity, not by position', () => {
  // Both score q=1, but text/markdown is an exact match and */* is not.
  assert.equal(negotiate('*/*, text/markdown', BOTH), 'text/markdown');
  // text/* matches both candidates equally, so server preference decides.
  assert.equal(negotiate('text/*', BOTH), 'text/html');
});

test('a more specific q=0 overrides a broader wildcard', () => {
  // "anything text, but explicitly not markdown"
  assert.equal(negotiate('text/*, text/markdown;q=0', BOTH), 'text/html');
});

test('takes the highest q among duplicate ranges rather than 406ing', () => {
  assert.equal(negotiate('text/html;q=0, text/html;q=1', ['text/html']), 'text/html');
  assert.equal(negotiate('text/markdown;q=1, text/markdown;q=0', BOTH), 'text/markdown');
});

test('returns null (406) only when nothing is acceptable', () => {
  assert.equal(negotiate('application/pdf', BOTH), null);
  assert.equal(negotiate('*/*;q=0', BOTH), null);
  // One acceptable representation, however grudging, must not 406.
  assert.equal(negotiate('application/pdf, text/html;q=0.1', BOTH), 'text/html');
});

test('tolerates whitespace, casing, and junk entries', () => {
  assert.equal(negotiate('  TEXT/MARKDOWN ;  Q=0.9 , text/html;q=0.1', BOTH), 'text/markdown');
  assert.equal(negotiate('garbage,,text/markdown', BOTH), 'text/markdown');
  assert.equal(negotiate('text/markdown;q=notanumber', BOTH), 'text/markdown');
});

test('clamps out-of-range q values instead of trusting them', () => {
  assert.equal(negotiate('text/markdown;q=5, text/html;q=1', BOTH), 'text/html');
  assert.equal(negotiate('text/markdown;q=-1, text/html', BOTH), 'text/html');
});

test('an empty Accept serves the default rather than 406', () => {
  assert.equal(EMPTY_ACCEPT_IS_UNCONSTRAINED, true, 'policy changed — update these expectations');
  assert.equal(negotiate('', BOTH), 'text/html');
  assert.equal(negotiate('   ', BOTH), 'text/html');
});
