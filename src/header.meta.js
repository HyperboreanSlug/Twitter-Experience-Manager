// ==UserScript==
// @name         Twitter Experience Manager
// @namespace    https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @version      1.1.0
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
// @inject-into  page
// @run-at       document-idle
// @noframes
// @compatible   violentmonkey
// @compatible   tampermonkey
// @compatible   greasemonkey
// ==/UserScript==

/*
 * Twitter Experience Manager
 * ==========================
 * Dual-mode: console paste + persistent userscript (Violentmonkey / Tampermonkey /
 * Greasemonkey). @grant none + @inject-into page so fetch/cookies match the page.
 *
 *   • Followers  – snapshot followers; sort Following by following-count
 *   • Geo Guard  – soft-hide (and optionally block) timeline posts by region needles
 *   • Notifs     – hide “liked your post” style notification rows
 *
 * ⚠ Automating X is against its Terms of Service. Region matching uses
 *   self-reported profile text only. Prefer soft-hide over live block.
 */
