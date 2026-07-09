// ==UserScript==
// @name         Twitter Experience Manager
// @namespace    https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @version      1.0.0
// @description  Modular X/Twitter usability toolkit: track followers, sort following by following-count, and filter/block timeline accounts by self-reported region (South Asia focus). Console paste or Greasemonkey.
// @author       HyperboreanSlug
// @license      MIT
// @match        https://x.com/*
// @match        https://mobile.x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * Twitter Experience Manager
 * ==========================
 * Usability-focused companion to Tweepcred Manager. Same dual-mode packaging
 * (console paste + persistent userscript) and modular src/ layout.
 *
 *   • Followers – snapshot followers; sort Following by following-count
 *   • Geo Guard – watch the Home timeline and auto-block (or log) accounts
 *                 whose public profile location matches South Asia / India rules
 *
 * ⚠ Automating X is against its Terms of Service and can get accounts locked.
 *   Region matching uses self-reported profile text only — false positives
 *   and false negatives are expected. Use dry-run first. Use at your own risk.
 */
