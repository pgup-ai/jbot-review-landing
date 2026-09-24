import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/analytics.js', import.meta.url), 'utf8');
const choiceKey = 'pgup_analytics_choice';

function harness({ stored, host = 'www.pgupai.com', signal = false, storageFails = false } = {}) {
  const storage = new Map(stored ? [[choiceKey, stored]] : []);
  const scripts = [];
  const events = [];
  const listeners = {};
  let config;
  let optedOut = false;
  let optOutCalls = 0;
  let panel;
  const element = () => ({
    dataset: {}, handlers: {}, children: new Map(), hidden: false,
    setAttribute() {}, focus() {}, remove() {}, contains() { return false; },
    addEventListener(name, callback) { this.handlers[name] = callback; },
    querySelector(selector) {
      if (!this.children.has(selector)) this.children.set(selector, element());
      return this.children.get(selector);
    },
  });
  const footer = { appendChild() {} };
  const document = {
    referrer: 'https://example.org/article?email=private@example.org#private',
    createElement: element,
    head: { appendChild(script) { scripts.push(script); } },
    body: { appendChild(el) { panel = el; } },
    querySelector() { return footer; },
    addEventListener(name, callback) { listeners[`document:${name}`] = callback; },
  };
  const ph = {
    init(token, options) { config = options; options.loaded(ph); },
    opt_in_capturing() { optedOut = false; },
    opt_out_capturing() { optedOut = true; optOutCalls++; },
    capture(name, properties) {
      if (optedOut) return;
      const result = config.before_send({ event: name, properties });
      if (result) events.push(result);
    },
  };
  const window = { addEventListener(name, callback) { listeners[name] = callback; } };
  const context = vm.createContext({
    URL, document, window,
    location: new URL(`https://${host}/guides?utm_source=launch&email=private@example.org#secret`),
    navigator: { globalPrivacyControl: signal },
    localStorage: {
      getItem(key) { if (storageFails) throw Error('blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (storageFails) throw Error('blocked'); storage.set(key, value); },
    },
  });
  vm.runInContext(source, context);
  return {
    scripts, events, panel, context,
    config: () => config,
    optOutCalls: () => optOutCalls,
    choose(value) {
      panel.handlers.click({ target: { closest: () => ({ dataset: { choice: value } }) } });
    },
    load() { window.posthog = ph; scripts.at(-1).onload(); },
    storageChoice(value) {
      if (value === null) storage.clear(); else storage.set(choiceKey, value);
      listeners.storage({ key: value === null ? null : choiceKey });
    },
    click(href) { listeners['document:click']({ target: { closest: () => ({ href }) } }); },
  };
}

test('no PostHog request before consent or after declining; acceptance captures once', () => {
  const h = harness();
  assert.equal(h.scripts.length, 0);
  h.choose('declined');
  assert.equal(h.scripts.length, 0);
  h.choose('accepted');
  assert.equal(h.scripts.length, 1);
  h.load();
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].event, '$pageview');
  assert.equal(h.events[0].properties.$current_url, 'https://www.pgupai.com/guides?utm_source=launch');
  assert.equal(h.events[0].properties.$referrer, 'https://example.org/article');
  assert.equal(h.events[0].properties.utm_source, 'launch');
  assert.equal(h.config().disable_session_recording, true);
  assert.equal(h.config().autocapture, false);
  assert.equal(h.config().capture_pageleave, true);
  h.choose('accepted');
  assert.equal(h.events.length, 1);
});

test('preview/local traffic and browser privacy signals never load PostHog', () => {
  for (const options of [{ host: 'localhost' }, { host: 'preview.vercel.app' }, { signal: true }]) {
    const h = harness({ stored: 'accepted', ...options });
    h.choose('accepted');
    assert.equal(h.scripts.length, 0);
  }
  const h = harness();
  h.context.navigator.doNotTrack = '1';
  h.choose('accepted');
  assert.equal(h.scripts.length, 0);
});

test('withdrawal during SDK download prevents initialization and capture', () => {
  const h = harness();
  h.choose('accepted');
  h.choose('declined');
  h.load();
  assert.equal(h.config(), undefined);
  assert.equal(h.events.length, 0);
  h.choose('accepted');
  assert.equal(h.events.length, 1);
});

test('withdrawal in another tab or clearing storage suppresses queued and future events', () => {
  const h = harness({ stored: 'accepted' });
  h.load();
  h.storageChoice('declined');
  assert.equal(h.optOutCalls(), 1);
  assert.equal(h.config().before_send({ event: '$pageview', properties: {} }), null);
  h.click('https://github.com/pgup-ai/jbot-review-action');
  assert.equal(h.events.length, 1);
  h.storageChoice('accepted');
  assert.equal(h.events.length, 2);
  h.storageChoice(null);
  assert.equal(h.optOutCalls(), 2);
});

test('storage failures do not break the page or bypass explicit consent', () => {
  const h = harness({ storageFails: true });
  assert.equal(h.scripts.length, 0);
  h.choose('accepted');
  h.load();
  assert.equal(h.events.length, 1);
});

test('URL and initial attribution sanitization excludes sensitive parameters and ad IDs', () => {
  const h = harness({ stored: 'accepted' });
  h.load();
  const event = h.config().before_send({ event: '$pageview', properties: {
    $current_url: 'https://www.pgupai.com/?token=secret&utm_source=docs#secret',
    utm_campaign: 'private@example.com', gclid: 'ad-id',
    $set_once: { $initial_current_url: 'https://www.pgupai.com/?email=private@example.com' },
  } });
  assert.equal(event.properties.$current_url, 'https://www.pgupai.com/?utm_source=docs');
  assert.equal(event.properties.$set_once.$initial_current_url, 'https://www.pgupai.com/');
  assert.equal(event.properties.utm_campaign, undefined);
  assert.equal(event.properties.gclid, undefined);
  assert.equal(event.properties.site_id, 'pgup');
});

test('only selected CTA links emit events and their URLs omit query strings', () => {
  const h = harness({ stored: 'accepted' });
  h.load();
  h.click('https://www.pgupai.com/#setup');
  h.click('https://github.com/marketplace/actions/j-bot-code-review?private=secret');
  h.click('https://www.pgupai.com/privacy');
  assert.equal(h.events.length, 3);
  assert.equal(h.events[1].properties.cta_id, 'setup');
  assert.equal(h.events[2].properties.cta_id, 'marketplace');
  assert.equal(h.events[2].properties.destination, 'https://github.com/marketplace/actions/j-bot-code-review');
});
