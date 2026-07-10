/**
 * @module notifmute
 * @description Hide “liked your post” (and similar) rows on X notifications.
 * @see docs/modules/notifmute.md
 */
    const NotifMute = {
        firstShow: true,
        watching: false,
        observer: null,
        hiddenThisSession: 0,
        _scanScheduled: false,

        // English + a few common UI strings. Case-insensitive; tested against
        // cell textContent. Extend via localStorage tem:likeMutePatterns.
        defaultPatterns: [
            'liked your post',
            'liked your posts',
            'liked your reply',
            'liked your repost',
            'liked your retweet',
            'liked your quote',
            'liked a post you',
            'liked a reply you',
            'liked posts you were mentioned in',
            'liked a photo you',
            'liked a video you',
            // Grouped / alternate copy
            'others liked your',
            'other liked your',
            // Non-English fragments (optional coverage)
            'gefällt dein',           // de
            'a aimé votre',          // fr
            'le gusto tu',           // es (ascii)
            'curtiu seu'             // pt
        ],

        onShow() {
            if (this.firstShow) {
                this.render();
                this.firstShow = false;
            }
            this.refreshStats();
            this._setWatchUi(this.watching);
        },

        render() {
            const pane = UI.el('tem-pane-notifs');
            if (!pane) return;

            const enabled = Core.store.get('likeMuteEnabled', true);
            const autoStart = Core.store.get('likeMuteAutoStart', true);
            const patterns = (Core.store.get('likeMutePatterns', this.defaultPatterns) || this.defaultPatterns).join('\n');

            pane.innerHTML = `
              <div class="tem-warn-box">
                Client-side only: hides notification <em>rows in the DOM</em> that look like
                “liked your post”. Does not change X notification settings on the server.
                Selectors can break when X redesigns the page.
              </div>

              <div class="tem-section">
                <h4>Mute like notifications</h4>
                <p>On <code>/notifications</code>, collapse rows about likes so replies and follows stay visible.</p>
                <div class="tem-stats">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-hidden">0</div><div class="tem-stat-l">Hidden (session)</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-state">Off</div><div class="tem-stat-l">Watcher</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-path">–</div><div class="tem-stat-l">Path</div></div>
                </div>
                <label class="tem-check"><input type="checkbox" id="tem-n-enabled" ${enabled ? 'checked' : ''}> Enable like-mute when watching</label>
                <label class="tem-check"><input type="checkbox" id="tem-n-autostart" ${autoStart ? 'checked' : ''}> Auto-start watcher when script loads</label>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-primary" id="tem-n-start" type="button">Start watcher</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-n-stop" type="button" disabled>Stop</button>
                </div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-n-scan" type="button">Scan once</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-n-unhide" type="button">Unhide page</button>
                </div>
                <div class="tem-status idle" id="tem-n-status">Idle</div>
                <p class="tem-note">Tip: open Notifications (All or Verified) then start the watcher. Works best on the All tab.</p>
              </div>

              <div class="tem-section">
                <h4>Match patterns (one per line)</h4>
                <p>Case-insensitive substrings against each notification cell’s text.</p>
                <textarea id="tem-n-patterns" class="tem-input" rows="8">${Core.escapeHtml(patterns)}</textarea>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-n-save" type="button">Save patterns</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-n-reset" type="button">Reset defaults</button>
                </div>
              </div>
              <div class="tem-foot">Notif mute · v${Core.version}</div>`;

            UI.el('tem-n-enabled').onchange = () => {
                Core.store.set('likeMuteEnabled', UI.el('tem-n-enabled').checked);
                if (this.watching) this.scanDom();
            };
            UI.el('tem-n-autostart').onchange = () =>
                Core.store.set('likeMuteAutoStart', UI.el('tem-n-autostart').checked);
            UI.el('tem-n-start').onclick = () => this.startWatch();
            UI.el('tem-n-stop').onclick = () => this.stopWatch();
            UI.el('tem-n-scan').onclick = () => this.scanDom(true);
            UI.el('tem-n-unhide').onclick = () => this.unhideAll();
            UI.el('tem-n-save').onclick = () => {
                const list = String(UI.el('tem-n-patterns').value || '')
                    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                Core.store.set('likeMutePatterns', list);
                this.setStatus('idle', 'Patterns saved (' + list.length + ')');
                if (this.watching) this.scanDom(true);
            };
            UI.el('tem-n-reset').onclick = () => {
                Core.store.set('likeMutePatterns', this.defaultPatterns);
                UI.el('tem-n-patterns').value = this.defaultPatterns.join('\n');
                this.setStatus('idle', 'Patterns reset');
            };

            this.refreshStats();
            this._setWatchUi(this.watching);
            if (this.watching) this.setStatus('run', 'Watching notifications…');
        },

        setStatus(kind, text) {
            const el = UI.el('tem-n-status');
            if (!el) return;
            el.className = 'tem-status ' + kind;
            el.textContent = text;
        },

        refreshStats() {
            const h = UI.el('tem-n-hidden');
            const s = UI.el('tem-n-state');
            const p = UI.el('tem-n-path');
            if (h) h.textContent = String(this.hiddenThisSession);
            if (s) s.textContent = this.watching ? 'On' : 'Off';
            if (p) {
                try {
                    const path = (location.pathname || '/').split('?')[0];
                    p.textContent = path.length > 14 ? path.slice(0, 12) + '…' : path;
                } catch (_) { p.textContent = '–'; }
            }
        },

        _setWatchUi(on) {
            const start = UI.el('tem-n-start');
            const stop = UI.el('tem-n-stop');
            if (start) start.disabled = on;
            if (stop) stop.disabled = !on;
        },

        startWatch() {
            if (this.watching) return;
            this.watching = true;
            this._setWatchUi(true);
            this.setStatus('run', 'Watching notifications…');
            this.refreshStats();
            this.scanDom(true);

            this.observer = new MutationObserver(() => this.scheduleScan());
            try {
                this.observer.observe(document.body || document.documentElement, {
                    childList: true, subtree: true
                });
            } catch (e) {
                console.warn('[TEM NotifMute] observer failed', e);
            }
        },

        stopWatch() {
            this.watching = false;
            if (this.observer) {
                try { this.observer.disconnect(); } catch (_) { }
                this.observer = null;
            }
            this._setWatchUi(false);
            this.setStatus('idle', 'Stopped');
            this.refreshStats();
        },

        scheduleScan() {
            if (this._scanScheduled) return;
            this._scanScheduled = true;
            const run = () => {
                this._scanScheduled = false;
                if (this.watching) this.scanDom(false);
            };
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
            else setTimeout(run, 50);
        },

        _patterns() {
            const list = Core.store.get('likeMutePatterns', this.defaultPatterns) || this.defaultPatterns;
            return list.map(p => String(p).toLowerCase()).filter(Boolean);
        },

        /**
         * Find notification cells. X uses cellInnerDiv wrappers; fall back to articles.
         */
        _cells() {
            const primary = document.querySelectorAll('[data-testid="cellInnerDiv"]');
            if (primary.length) return primary;
            return document.querySelectorAll('article, [data-testid="notification"]');
        },

        isLikeNotification(text) {
            const t = String(text || '').toLowerCase().replace(/\s+/g, ' ');
            if (!t) return false;
            // Prefer like matches; skip pure follow/reply if they don't also say liked
            const patterns = this._patterns();
            for (let i = 0; i < patterns.length; i++) {
                if (t.indexOf(patterns[i]) !== -1) return true;
            }
            // Heuristic: “… liked your …” without needing full phrase list
            if (/\bliked your\b/.test(t)) return true;
            if (/\bliked a (post|reply|repost|retweet|quote|photo|video)\b/.test(t) && /\byou\b/.test(t)) return true;
            return false;
        },

        /**
         * @param {boolean} force  update status text even if disabled
         */
        scanDom(force) {
            this.refreshStats();
            const enabled = Core.store.get('likeMuteEnabled', true);
            if (!enabled && !force) return;

            // Only act on notifications routes (still allow manual "scan once")
            const path = (location.pathname || '').toLowerCase();
            const onNotifs = path.indexOf('/notifications') !== -1;
            if (!onNotifs && !force) {
                if (force) this.setStatus('pause', 'Open /notifications to mute likes');
                return;
            }
            if (!enabled) {
                if (force) this.setStatus('pause', 'Like-mute disabled in settings');
                return;
            }

            let newly = 0;
            const cells = this._cells();
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                if (cell.getAttribute('data-tem-like-hidden') === '1') continue;
                // Prefer the notification “head” text; full cell is fine as fallback
                const text = cell.textContent || '';
                if (!this.isLikeNotification(text)) continue;

                // Don't hide if it also looks like a primary reply thread starter with only "liked" in nested UI chrome
                // (keep simple: pattern match is enough)

                cell.setAttribute('data-tem-like-hidden', '1');
                cell.style.setProperty('display', 'none', 'important');
                newly++;
                this.hiddenThisSession++;
            }
            this.refreshStats();
            if (force || newly) {
                this.setStatus(this.watching ? 'run' : 'idle',
                    newly ? ('Hid ' + newly + ' like notification(s)') : 'No new like rows');
            }
        },

        unhideAll() {
            const nodes = document.querySelectorAll('[data-tem-like-hidden="1"]');
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                el.removeAttribute('data-tem-like-hidden');
                el.style.removeProperty('display');
            }
            this.setStatus('idle', 'Unhid ' + nodes.length + ' row(s)');
        }
    };
