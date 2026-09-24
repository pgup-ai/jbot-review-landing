/* Shared, consent-gated analytics for the static site. No build step required. */
(function () {
  'use strict';
  var TOKEN = 'phc_nx4JaPniM3iFeyJbqskSL2mxjYHkCYJypnxjsWwmTanm'; // Public ingestion token, not an account credential.
  var CHOICE_KEY = 'pgup_analytics_choice';
  var production = location.protocol === 'https:' && /^(www\.)?pgupai\.com$/.test(location.hostname);
  var choice = readChoice();
  var loading = false;
  var initialized = false;
  var settingsOpened = false;
  var campaigns = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function readChoice() {
    try { return localStorage.getItem(CHOICE_KEY); } catch (_) { return null; }
  }
  function privacySignal() {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  }
  function allowed() { return production && choice === 'accepted' && !privacySignal(); }
  function campaignValue(value) {
    return value && /^[a-zA-Z0-9._~ -]{1,100}$/.test(value) ? value : null;
  }
  function cleanURL(value, includeCampaigns) {
    try {
      var url = new URL(value);
      if (!/^https?:$/.test(url.protocol)) return '';
      var safe = new URL(url.origin + url.pathname);
      if (includeCampaigns) campaigns.forEach(function (key) {
        var value = campaignValue(url.searchParams.get(key));
        if (value) safe.searchParams.set(key, value);
      });
      return safe.href;
    } catch (_) { return ''; }
  }
  function cleanProperties(properties) {
    Object.keys(properties).forEach(function (key) {
      if (/current_url|referrer|pathname/i.test(key) && typeof properties[key] === 'string') {
        if (/pathname/i.test(key)) properties[key] = properties[key].split(/[?#]/)[0];
        else properties[key] = cleanURL(properties[key], /current_url/i.test(key));
      } else if (/^(\$initial_)?utm_/.test(key)) {
        var value = campaignValue(properties[key]);
        if (value) properties[key] = value;
        else delete properties[key];
      } else if (/^(\$initial_)?(gclid|fbclid|msclkid|dclid|gbraid|wbraid|gad_source|mc_cid|twclid|li_fat_id|ttclid)$/.test(key)) {
        delete properties[key];
      } else if (properties[key] && typeof properties[key] === 'object' && !Array.isArray(properties[key])) {
        cleanProperties(properties[key]);
      }
    });
  }
  function beforeSend(event) {
    if (!allowed()) return null;
    cleanProperties(event.properties);
    event.properties.site_id = 'pgup';
    return event;
  }
  function pageview() {
    if (!allowed() || !initialized) return;
    var properties = {
      $current_url: cleanURL(location.href, true),
      $referrer: cleanURL(document.referrer, false),
      $referring_domain: document.referrer ? (function () {
        try { return new URL(document.referrer).hostname; } catch (_) { return '$direct'; }
      })() : '$direct'
    };
    var url = new URL(location.href);
    campaigns.forEach(function (key) {
      var value = campaignValue(url.searchParams.get(key));
      if (value) properties[key] = value;
    });
    window.posthog.capture('$pageview', properties);
  }
  function initialize() {
    if (!allowed() || initialized) return;
    window.posthog.init(TOKEN, {
      api_host: 'https://us.i.posthog.com',
      ui_host: 'https://us.posthog.com',
      defaults: '2026-05-30',
      persistence: 'localStorage',
      person_profiles: 'never',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_performance: false,
      rageclick: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_feature_flags: true,
      save_campaign_params: false,
      save_referrer: false,
      respect_dnt: true,
      before_send: beforeSend,
      loaded: function (ph) {
        initialized = true;
        if (!allowed()) { ph.opt_out_capturing(); return; }
        ph.opt_in_capturing({ captureEventName: false });
        pageview();
      }
    });
  }
  function start() {
    if (!allowed()) return;
    if (initialized) {
      window.posthog.opt_in_capturing({ captureEventName: false });
      pageview();
      return;
    }
    if (window.posthog && typeof window.posthog.init === 'function') { initialize(); return; }
    if (loading) return;
    loading = true;
    var script = document.createElement('script');
    script.src = 'https://us-assets.i.posthog.com/static/array.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = function () { loading = false; if (window.posthog) initialize(); };
    script.onerror = function () { loading = false; script.remove(); };
    document.head.appendChild(script);
  }

  var panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Analytics preferences');
  panel.innerHTML = '<p><strong>Help improve J-Bot Review</strong><br>Allow optional page-view, visit-duration, and link-click analytics? No session recordings. <a href="/privacy#analytics-controls">Privacy details</a></p><p class="analytics-signal" hidden>Your browser requests no tracking. Analytics remain off.</p><div class="analytics-actions"><button type="button" data-choice="declined">Decline analytics</button><button type="button" data-choice="accepted">Allow analytics</button><button type="button" data-choice="close" hidden>Close</button></div>';
  document.body.appendChild(panel);
  var settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Analytics preferences';
  settings.setAttribute('aria-expanded', 'false');
  (document.querySelector('footer') || document.body).appendChild(settings);

  function showPanel(show) {
    panel.hidden = !show;
    settings.setAttribute('aria-expanded', String(show));
    panel.querySelector('[data-choice="accepted"]').disabled = privacySignal();
    panel.querySelector('.analytics-signal').hidden = !privacySignal();
    panel.querySelector('[data-choice="close"]').hidden = !choice;
  }
  function applyChoice(value) {
    var previous = choice;
    choice = value;
    try { localStorage.setItem(CHOICE_KEY, choice); } catch (_) { /* Still apply for this page. */ }
    if (choice === 'accepted' && previous !== choice) start();
    if (choice !== 'accepted' && initialized) window.posthog.opt_out_capturing();
    showPanel(false);
    if (settingsOpened) settings.focus();
  }
  settings.addEventListener('click', function () {
    settingsOpened = true;
    showPanel(true);
    panel.querySelector('[data-choice="declined"]').focus();
  });
  panel.addEventListener('click', function (event) {
    var button = event.target.closest('[data-choice]');
    if (!button) return;
    if (button.dataset.choice === 'close') { showPanel(false); settings.focus(); return; }
    applyChoice(button.dataset.choice);
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== CHOICE_KEY && event.key !== null) return;
    var previous = choice;
    choice = readChoice();
    if (allowed() && previous !== choice) start();
    else if (!allowed() && initialized) window.posthog.opt_out_capturing();
    showPanel(!choice && !privacySignal());
  });
  document.addEventListener('click', function (event) {
    if (!allowed() || !initialized) return;
    var link = event.target.closest('a[href]');
    if (!link || panel.contains(link)) return;
    var url = new URL(link.href, location.href);
    var cta;
    if (url.origin === location.origin && url.hash === '#setup') cta = 'setup';
    else if (url.origin === location.origin && /^\/contact(?:\.html)?$/.test(url.pathname)) cta = 'contact';
    else if (url.hostname === 'github.com') cta = url.pathname.indexOf('/marketplace/') === 0 ? 'marketplace' : 'github';
    if (cta) window.posthog.capture('cta_clicked', { cta_id: cta, destination: url.origin + url.pathname });
  });
  showPanel(!choice && !privacySignal());
  start();
})();
