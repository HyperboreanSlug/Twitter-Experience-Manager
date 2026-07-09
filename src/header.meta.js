// ==UserScript==
// @name         Twitter Experience Manager
// @namespace    https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @version      1.1.1
// @description  X usability toolkit: follower tracker, soft region hide, optional geo block, mute like-notifications. Console paste or userscript.
// @author       HyperboreanSlug
// @license      MIT
// @homepageURL  https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @supportURL   https://github.com/HyperboreanSlug/Twitter-Experience-Manager/issues
// @downloadURL  https://raw.githubusercontent.com/HyperboreanSlug/Twitter-Experience-Manager/main/dist/twitter-experience-manager.user.js
// @updateURL    https://raw.githubusercontent.com/HyperboreanSlug/Twitter-Experience-Manager/main/dist/twitter-experience-manager.user.js
// @match        https://x.com/*
// @match        https://mobile.x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @grant        none
// @inject-into  content
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * Twitter Experience Manager
 * ==========================
 * Dual-mode: console paste + Violentmonkey / Tampermonkey / Greasemonkey.
 *
 * Injection: @inject-into content (NOT page). X.com's CSP blocks page-context
 * injection and Violentmonkey reports "could not inject script" if @inject-into
 * page is used. Content context still has full DOM + same-origin fetch/cookies
 * with @grant none.
 *
 *   • Followers  – snapshot followers; sort Following by following-count
 *   • Geo Guard  – soft-hide (and optionally block) timeline posts by region needles
 *   • Notifs     – hide "liked your post" style notification rows
 *
 * Automating X is against its Terms of Service. Prefer soft-hide over live block.
 */
