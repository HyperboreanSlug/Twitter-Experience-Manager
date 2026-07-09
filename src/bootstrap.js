/**
 * @module bootstrap
 * @see docs/modules/bootstrap.md
 */
(function () {
    'use strict';

    try {
        // Optional: prove injection in VM console
        if (typeof console !== 'undefined' && console.log) {
            console.log('[TEM] bootstrap start', typeof GM_info !== 'undefined' ? 'GM sandbox' : 'page/console');
        }
    } catch (_) { }

    if (window.__temRunning) {
        var existing = document.getElementById('tem-panel');
        if (existing) {
            existing.classList.remove('tem-min');
            try {
                existing.animate(
                    [{ outline: '2px solid #1d9bf0' }, { outline: '2px solid transparent' }],
                    { duration: 800 }
                );
            } catch (_) { }
        }
        try { console.warn('[TEM] Already running - reusing panel'); } catch (_) { }
        return;
    }
    window.__temRunning = true;
