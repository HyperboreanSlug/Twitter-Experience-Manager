/**
 * @module bootstrap
 * @see docs/modules/bootstrap.md
 *
 * Violentmonkey notes:
 * - @grant none + @inject-into page → page context (session cookies / fetch work).
 * - No GM_* APIs so console paste and VM share the same bundle.
 * - SPA: modules re-scan DOM via MutationObserver after client navigations.
 */
(function () {
    'use strict';

    if (window.__temRunning) {
        const existing = document.getElementById('tem-panel');
        if (existing) {
            existing.classList.remove('tem-min');
            try {
                existing.animate([{ outline: '2px solid #1d9bf0' }, { outline: '2px solid transparent' }], { duration: 800 });
            } catch (_) { /* animate optional */ }
        }
        console.warn('[Twitter Experience Manager] Already running — re-using the open panel.');
        return;
    }
    window.__temRunning = true;
