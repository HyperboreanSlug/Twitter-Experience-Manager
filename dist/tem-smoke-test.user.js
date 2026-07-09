// ==UserScript==
// @name         TEM Smoke Test (X inject check)
// @namespace    https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @version      1.0.0
// @description  Minimal Violentmonkey inject test for x.com. If this fails, TEM cannot load either.
// @match        *://x.com/*
// @match        *://*.x.com/*
// @match        *://twitter.com/*
// @match        *://*.twitter.com/*
// @grant        GM_info
// @inject-into  content
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';
  try {
    console.log('[TEM smoke] injected OK', typeof GM_info !== 'undefined' ? GM_info.script.name : 'no GM_info');
    var el = document.createElement('div');
    el.id = 'tem-smoke';
    el.textContent = 'TEM smoke test: Violentmonkey inject works on this page.';
    el.setAttribute('style',
      'position:fixed;bottom:12px;left:12px;z-index:2147483647;background:#0f1419;color:#e7e9ea;' +
      'border:1px solid #1d9bf0;border-radius:12px;padding:10px 14px;font:13px system-ui,sans-serif;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.45)');
    (document.body || document.documentElement).appendChild(el);
    setTimeout(function () { try { el.remove(); } catch (e) {} }, 8000);
  } catch (err) {
    console.error('[TEM smoke] failed', err);
  }
})();
