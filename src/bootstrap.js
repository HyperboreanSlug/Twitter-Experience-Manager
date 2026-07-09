/**
 * @module bootstrap
 * @see docs/modules/bootstrap.md
 *
 * Violentmonkey: use @inject-into content (X CSP blocks page injection).
 * No GM_* APIs — same bundle for console paste and userscript managers.
 */
(function () {
    'use strict';

    // Prefer the real page window when a sandbox wrapper exists (some managers).
    var root = typeof unsafeWindow !== 'undefined' && unsafeWindow ? unsafeWindow : window;

    if (root.__temRunning) {
        var existing = document.getElementById('tem-panel');
        if (existing) {
            existing.classList.remove('tem-min');
            try {
                existing.animate(
                    [{ outline: '2px solid #1d9bf0' }, { outline: '2px solid transparent' }],
                    { duration: 800 }
                );
            } catch (_) { /* animate optional */ }
        }
        console.warn('[Twitter Experience Manager] Already running — re-using the open panel.');
        return;
    }
    root.__temRunning = true;
    // Keep a copy on the content-script window too (close button / re-run guard).
    try { window.__temRunning = true; } catch (_) { }
