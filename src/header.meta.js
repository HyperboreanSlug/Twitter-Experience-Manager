// ==UserScript==
// @name         Twitter Experience Manager
// @namespace    https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @version      1.1.2
// @description  X usability toolkit: follower tracker, soft region hide, geo filter, mute like-notifications.
// @author       HyperboreanSlug
// @license      MIT
// @homepageURL  https://github.com/HyperboreanSlug/Twitter-Experience-Manager
// @supportURL   https://github.com/HyperboreanSlug/Twitter-Experience-Manager/issues
// @downloadURL  https://raw.githubusercontent.com/HyperboreanSlug/Twitter-Experience-Manager/main/dist/twitter-experience-manager.user.js
// @updateURL    https://raw.githubusercontent.com/HyperboreanSlug/Twitter-Experience-Manager/main/dist/twitter-experience-manager.user.js
// @match        *://x.com/*
// @match        *://*.x.com/*
// @match        *://twitter.com/*
// @match        *://*.twitter.com/*
// @match        https://x.com/*
// @match        https://mobile.x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @icon         https://www.google.com/s2/favicons?domain=x.com
// @grant        GM_info
// @inject-into  content
// @run-at       document-end
// ==/UserScript==

/*
 * Twitter Experience Manager
 *
 * Violentmonkey on X.com:
 *   - X CSP blocks page-context injection ("Could not inject some scripts").
 *   - @grant GM_info forces the userscript sandbox (content world), not page.
 *   - @inject-into content is the CSP-safe mode.
 *   - Do NOT use @grant none alone on X (often tries page context).
 *
 * Console paste still works (metadata is comments; GM_info may be undefined).
 */
