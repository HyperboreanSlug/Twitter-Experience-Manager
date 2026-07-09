/**
 * @module bootstrap
 * @see docs/modules/bootstrap.md
 */
(function () {
    'use strict';

    if (window.__temRunning) {
        const existing = document.getElementById('tem-panel');
        if (existing) {
            existing.classList.remove('tem-min');
            existing.animate?.([{ outline: '2px solid #1d9bf0' }, { outline: '2px solid transparent' }], { duration: 800 });
        }
        console.warn('[Twitter Experience Manager] Already running — re-using the open panel.');
        return;
    }
    window.__temRunning = true;
