/**
 * @module boot
 * @see docs/modules/bootstrap.md
 */
    function temBoot() {
        try {
            if (!document.documentElement) {
                setTimeout(temBoot, 50);
                return;
            }
            Core.init();
            UI.build();
            Followers.render();
            Followers.firstShow = false;
            GeoGuard.render();
            GeoGuard.firstShow = false;
            NotifMute.render();
            NotifMute.firstShow = false;
            About.render();
            UI.switchTab('followers');

            setTimeout(function () {
                try {
                    if (Core.store.get('geoAutoStart', false)) GeoGuard.startWatch();
                } catch (e1) {
                    try { console.warn('[TEM] geo autostart failed', e1); } catch (_) { }
                }
                try {
                    if (Core.store.get('likeMuteAutoStart', true)) NotifMute.startWatch();
                } catch (e2) {
                    try { console.warn('[TEM] notif autostart failed', e2); } catch (_) { }
                }
            }, 1200);

            try {
                console.log(
                    '%c[TEM] Twitter Experience Manager v' + Core.version + ' ready @' + (Core.username || '?'),
                    'color:#7856ff;font-weight:bold;font-size:13px'
                );
            } catch (_) { }
        } catch (err) {
            try {
                console.error('[TEM] BOOT FAILED', err);
            } catch (_) { }
            try {
                // Visible failure so Violentmonkey inject success is obvious vs runtime crash
                var banner = document.createElement('div');
                banner.id = 'tem-boot-error';
                banner.setAttribute('style',
                    'position:fixed;top:8px;left:8px;right:8px;z-index:2147483647;' +
                    'background:#3d1114;color:#ffb4b4;border:1px solid #f4212e;border-radius:12px;' +
                    'padding:12px 14px;font:13px/1.4 system-ui,sans-serif');
                banner.textContent = 'Twitter Experience Manager failed to start: ' +
                    (err && err.message ? err.message : String(err));
                (document.body || document.documentElement).appendChild(banner);
            } catch (_) { }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', temBoot, { once: true });
    } else {
        temBoot();
    }
