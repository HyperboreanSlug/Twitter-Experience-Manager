/**
 * @module boot
 * @see docs/modules/bootstrap.md
 */
    function temBoot() {
        if (!document.body && !document.documentElement) {
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

        // Auto-start modules (persisted prefs). Defer so X's SPA shell settles.
        setTimeout(function () {
            try {
                if (Core.store.get('geoAutoStart', false)) GeoGuard.startWatch();
            } catch (_) { }
            try {
                if (Core.store.get('likeMuteAutoStart', true)) NotifMute.startWatch();
            } catch (_) { }
        }, 1200);

        console.log(
            '%c✦ Twitter Experience Manager v' + Core.version + ' ready. @' + (Core.username || '?') +
            ' (Violentmonkey / Tampermonkey / console)',
            'color:#7856ff;font-weight:bold;font-size:14px'
        );
    }

    temBoot();
