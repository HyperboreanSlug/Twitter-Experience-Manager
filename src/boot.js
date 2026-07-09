/**
 * @module boot
 * @see docs/modules/bootstrap.md
 */
    Core.init();
    UI.build();
    Followers.render();
    Followers.firstShow = false;
    GeoGuard.render();
    GeoGuard.firstShow = false;
    About.render();
    UI.switchTab('followers');

    if (Core.store.get('geoAutoStart', false)) {
        // Defer so the first paint settles
        setTimeout(() => { try { GeoGuard.startWatch(); } catch (_) { } }, 1500);
    }

    console.log(
        '%c✦ Twitter Experience Manager v' + Core.version + ' ready. @' + (Core.username || '?'),
        'color:#7856ff;font-weight:bold;font-size:14px'
    );
