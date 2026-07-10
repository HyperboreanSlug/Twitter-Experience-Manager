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
            // Lazy UI: do not pre-render heavy panes (Geo region tree, etc.) at boot
            // First open of each tab builds its DOM via onShow/firstShow
            try {
                console.log(
                    '%c[TEM] Twitter Experience Manager v' + Core.version + ' ready @' + (Core.username || '?'),
                    'color:#7856ff;font-weight:bold;font-size:13px'
                );
            } catch (_) { }

            // No auto-start watchers — user opts in. Prevents background lag on every X page.
        } catch (err) {
            try {
                console.error('[TEM] BOOT FAILED', err);
            } catch (_) { }
            try {
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
