/**
 * @module follow
 * @see docs/modules/follow.md
 */
    /* ===================================================================== *
     *  Shared DOM helpers for the X follow-list (used by Unfollow + Dashboard)*
     *  Ported verbatim from the Mass-Unfollow project so behaviour matches.  *
     * ===================================================================== */
    const Follow = {
        txt(el) {
            if (!el) return '';
            return String(el.innerText || el.textContent || '').trim().toLowerCase();
        },

        isMutual(cell) {
            const NEEDLES = ['follows you'];
            if (cell.querySelector('[data-testid="userFollowIndicator"]')) return true;
            const labeled = cell.querySelectorAll('[aria-label]');
            for (let i = 0; i < labeled.length; i++) {
                const label = (labeled[i].getAttribute('aria-label') || '').toLowerCase();
                for (let j = 0; j < NEEDLES.length; j++) {
                    if (label.indexOf(NEEDLES[j]) !== -1) return true;
                }
            }
            const combined = (cell.innerText || '').toLowerCase() + ' ' + (cell.textContent || '').toLowerCase();
            for (let j = 0; j < NEEDLES.length; j++) {
                if (combined.indexOf(NEEDLES[j]) !== -1) return true;
            }
            return false;
        },

        isPrivate(cell) {
            const svgs = cell.querySelectorAll('svg');
            for (let i = 0; i < svgs.length; i++) {
                const label = (svgs[i].getAttribute('aria-label') || '').toLowerCase();
                if (label.indexOf('protected') !== -1 || label.indexOf('private') !== -1 || label.indexOf('locked') !== -1) return true;
            }
            const labeled = cell.querySelectorAll('[aria-label]');
            for (let i = 0; i < labeled.length; i++) {
                const label = (labeled[i].getAttribute('aria-label') || '').toLowerCase();
                if (label.indexOf('protected') !== -1 || label.indexOf('private') !== -1 || label.indexOf('locked') !== -1) return true;
            }
            return false;
        },

        getUsername(cell) {
            const link = cell.querySelector('a[href^="/"][role="link"], a[href^="/"]:not([href*="status"]):not([href*="intent"])');
            return link ? (link.getAttribute('href').split('/')[1] || 'unknown') : 'unknown';
        },

        findUnfollowButton(cell) {
            const byTestId = cell.querySelector('[data-testid$="-unfollow"]');
            if (byTestId) return byTestId;
            const btns = cell.querySelectorAll('div[role="button"], button');
            for (let i = 0; i < btns.length; i++) {
                const t = (btns[i].innerText || btns[i].textContent || '').trim().toLowerCase();
                if (t.length > 25) continue;
                if (t.indexOf('following') !== -1 || t.indexOf('unfollow') !== -1) return btns[i];
            }
            return null;
        },

        async waitConfirm(timeout) {
            timeout = timeout || 7000;
            const start = Date.now();
            while (Date.now() - start < timeout) {
                let btn = document.querySelector('[data-testid="confirmationSheetConfirm"]') ||
                    document.querySelector('div[role="button"][data-testid*="unfollow"]') ||
                    document.querySelector('button[data-testid*="unfollow"]');
                if (!btn) {
                    const buttons = document.querySelectorAll('button');
                    for (let i = 0; i < buttons.length; i++) {
                        if (this.txt(buttons[i]).indexOf('unfollow') !== -1) { btn = buttons[i]; break; }
                    }
                }
                if (btn) return btn;
                await Core.sleep(300);
            }
            return null;
        }
    };
