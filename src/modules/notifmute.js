/**
 * @module notifmute
 * @description Mute like + retweet/repost rows on /notifications. No focus mode.
 * @see docs/modules/notifmute.md
 */
    const NotifMute = {
        firstShow: true,
        watching: false,
        observer: null,
        hiddenThisSession: 0,
        _scanScheduled: false,
        _scanning: false,

        defaultLikePatterns: [
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
            'of your posts',
            'of your post',
            'of your replies',
            'of your reply',
            'of your reposts',
            'of your retweets',
            'of your quotes',
            'of your photos',
            'of your videos',
            'others liked your',
            'other liked your',
            'gefällt dein',
            'a aimé votre',
            'le gusto tu',
            'curtiu seu'
        ],

        defaultRetweetPatterns: [
            'reposted your',
            'retweeted your',
            'reposted your post',
            'retweeted your post',
            'reposted your reply',
            'retweeted your reply',
            'reposted your quote',
            'reposted your posts',
            'reposted one of your',
            'retweeted one of your',
            'others reposted your',
            'others retweeted your',
            'reposted posts you',
            'retweeted posts you'
        ],

        onShow() {
            // Migrate: force-disable legacy focus mode so old installs stop over-hiding
            try { Core.store.set('notifFocusMode', false); } catch (_) { }

            if (this.firstShow) {
                this.render();
                this.firstShow = false;
            }
            this.refreshStats();
            this._setWatchUi(this.watching);
        },

        _filters() {
            return {
                muteLikes: Core.store.get('notifMuteLikes', Core.store.get('likeMuteEnabled', true)),
                muteRetweets: Core.store.get('notifMuteRetweets', true),
                autoStart: Core.store.get('likeMuteAutoStart', true)
            };
        },

        render() {
            const pane = UI.el('tem-pane-notifs');
            if (!pane) return;

            try { Core.store.set('notifFocusMode', false); } catch (_) { }

            const f = this._filters();
            const likePatterns = (Core.store.get('likeMutePatterns', this.defaultLikePatterns) || this.defaultLikePatterns).join('\n');
            const rtPatterns = (Core.store.get('retweetMutePatterns', this.defaultRetweetPatterns) || this.defaultRetweetPatterns).join('\n');

            pane.innerHTML = `
              <div class="tem-warn-box">
                Client-side only: hides <em>like</em> and <em>retweet/repost</em> rows in the DOM.
                Replies, follows, quotes, and other types stay visible.
              </div>

              <div class="tem-section">
                <h4>Notification mute</h4>
                <p>On the notifications page, hide the types you mute. Nothing else is filtered.</p>
                <div class="tem-stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-hidden">0</div><div class="tem-stat-l">Hidden (session)</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-state">Off</div><div class="tem-stat-l">Watcher</div></div>
                </div>
                <div class="tem-now" id="tem-n-path" title="Current path">Path: –</div>

                <label class="tem-check"><input type="checkbox" id="tem-n-mute-likes" ${f.muteLikes ? 'checked' : ''}> Mute <strong>likes</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-mute-rt" ${f.muteRetweets ? 'checked' : ''}> Mute <strong>retweets / reposts</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-autostart" ${f.autoStart ? 'checked' : ''}> Auto-start watcher when script loads</label>

                <div class="tem-btns">
                  <button class="tem-btn tem-btn-primary" id="tem-n-start" type="button">Start watcher</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-n-stop" type="button" disabled>Stop</button>
                </div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-n-scan" type="button">Scan once</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-n-unhide" type="button">Unhide page</button>
                </div>
                <div class="tem-status idle" id="tem-n-status">Idle</div>
                <p class="tem-note">Tip: open Notifications → All for best results.</p>
              </div>

              <div class="tem-section">
                <h4>Like patterns (advanced)</h4>
                <textarea id="tem-n-patterns" class="tem-input" rows="5">${Core.escapeHtml(likePatterns)}</textarea>
                <h4 class="tem-subhead">Retweet / repost patterns</h4>
                <textarea id="tem-n-rt-patterns" class="tem-input" rows="4">${Core.escapeHtml(rtPatterns)}</textarea>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-n-save" type="button">Save patterns</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-n-reset" type="button">Reset defaults</button>
                </div>
              </div>
              <div class="tem-foot">Notif mute · v${Core.version}</div>`;

            const bindToggle = (id, key, legacyKey) => {
                const el = UI.el(id);
                if (!el) return;
                el.onchange = () => {
                    Core.store.set(key, el.checked);
                    if (legacyKey) Core.store.set(legacyKey, el.checked);
                    if (this.watching) this.rescanAfterToggle();
                };
            };
            bindToggle('tem-n-mute-likes', 'notifMuteLikes', 'likeMuteEnabled');
            bindToggle('tem-n-mute-rt', 'notifMuteRetweets');
            bindToggle('tem-n-autostart', 'likeMuteAutoStart');

            UI.el('tem-n-start').onclick = () => this.startWatch();
            UI.el('tem-n-stop').onclick = () => this.stopWatch();
            UI.el('tem-n-scan').onclick = () => this.scanDom(true);
            UI.el('tem-n-unhide').onclick = () => this.unhideAll();
            UI.el('tem-n-save').onclick = () => {
                const likes = String(UI.el('tem-n-patterns').value || '')
                    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                const rts = String(UI.el('tem-n-rt-patterns').value || '')
                    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                Core.store.set('likeMutePatterns', likes);
                Core.store.set('retweetMutePatterns', rts);
                this.setStatus('idle', 'Patterns saved');
                if (this.watching) this.rescanAfterToggle();
            };
            UI.el('tem-n-reset').onclick = () => {
                Core.store.set('likeMutePatterns', this.defaultLikePatterns);
                Core.store.set('retweetMutePatterns', this.defaultRetweetPatterns);
                UI.el('tem-n-patterns').value = this.defaultLikePatterns.join('\n');
                UI.el('tem-n-rt-patterns').value = this.defaultRetweetPatterns.join('\n');
                this.setStatus('idle', 'Patterns reset');
            };

            this.refreshStats();
            this._setWatchUi(this.watching);
            if (this.watching) this.setStatus('run', 'Watching notifications…');
        },

        /** Unhide then rescan without stacking observer callbacks mid-flight */
        rescanAfterToggle() {
            this.unhideAll(true);
            this.scanDom(true);
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
                    const path = (location.pathname || '/').split('?')[0] || '/';
                    p.textContent = 'Path: ' + path;
                    p.title = path;
                    p.style.display = 'block';
                    p.style.overflow = 'hidden';
                    p.style.textOverflow = 'ellipsis';
                    p.style.whiteSpace = 'nowrap';
                    p.style.fontFamily = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
                    p.style.fontSize = '12px';
                } catch (_) {
                    p.textContent = 'Path: –';
                }
            }
        },

        _setWatchUi(on) {
            const start = UI.el('tem-n-start');
            const stop = UI.el('tem-n-stop');
            if (start) start.disabled = on;
            if (stop) stop.disabled = !on;
        },

        _observeRoot() {
            return document.querySelector('[data-testid="primaryColumn"]') ||
                document.body ||
                document.documentElement;
        },

        startWatch() {
            if (this.watching) return;
            this.watching = true;
            this._setWatchUi(true);
            this.setStatus('run', 'Watching notifications…');
            this.refreshStats();
            this.scanDom(true);

            if (this.observer) {
                try { this.observer.disconnect(); } catch (_) { }
            }
            this.observer = new MutationObserver(() => this.scheduleScan());
            try {
                const root = this._observeRoot();
                this.observer.observe(root, { childList: true, subtree: true });
            } catch (e) {
                console.warn('[TEM NotifMute] observer failed', e);
            }
        },

        stopWatch() {
            this.watching = false;
            this._scanScheduled = false;
            if (this.observer) {
                try { this.observer.disconnect(); } catch (_) { }
                this.observer = null;
            }
            this._setWatchUi(false);
            this.setStatus('idle', 'Stopped');
            this.refreshStats();
        },

        scheduleScan() {
            // Prevent re-entry / observer storms while scanDom mutates the DOM
            if (!this.watching || this._scanning || this._scanScheduled) return;
            this._scanScheduled = true;
            const run = () => {
                this._scanScheduled = false;
                if (this.watching && !this._scanning) this.scanDom(false);
            };
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
            else setTimeout(run, 50);
        },

        _norm(text) {
            return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
        },

        _patternList(key, defaults) {
            const list = Core.store.get(key, defaults) || defaults;
            return list.map(p => String(p).toLowerCase()).filter(Boolean);
        },

        /** Prefer main timeline column so sidebar/cells are not mis-hidden */
        _cells() {
            const root = document.querySelector('[data-testid="primaryColumn"]') || document;
            const primary = root.querySelectorAll('[data-testid="cellInnerDiv"]');
            if (primary.length) return primary;
            return root.querySelectorAll('article, [data-testid="notification"]');
        },

        /**
         * @returns {'like'|'retweet'|'other'}
         */
        classify(text) {
            const t = this._norm(text);
            if (!t) return 'other';

            // Quotes are not retweets — leave visible unless they are also likes (unlikely)
            if (/\bquoted your\b/.test(t) || /\bquoted a (post|reply|tweet)\b/.test(t)) {
                return 'other';
            }

            if (this.isLikeNotification(t)) return 'like';
            if (this.isRetweetNotification(t)) return 'retweet';
            return 'other';
        },

        isLikeNotification(text) {
            const t = this._norm(text);
            if (!t) return false;

            // Avoid matching pure repost rows that mention "like" in chrome
            if (/\b(reposted|retweeted)\s+your\b/.test(t) && !/\bliked\b/.test(t)) return false;

            const hasLikeVerb = /\b(liked|likes)\b/.test(t) ||
                t.indexOf('gefällt') !== -1 ||
                t.indexOf('aimé') !== -1 ||
                t.indexOf('gusto') !== -1 ||
                t.indexOf('curtiu') !== -1;

            const patterns = this._patternList('likeMutePatterns', this.defaultLikePatterns);
            for (let i = 0; i < patterns.length; i++) {
                const p = patterns[i];
                if (t.indexOf(p) === -1) continue;
                if (/^of your /.test(p) && !hasLikeVerb) continue;
                return true;
            }

            if (/\bliked your\b/.test(t)) return true;
            if (/\bliked a (post|reply|repost|retweet|quote|photo|video)\b/.test(t) && /\byou\b/.test(t)) {
                return true;
            }
            if (/\bliked\s+\d+\s+of\s+your\b/.test(t)) return true;
            if (/\bliked\b[\s\S]{0,40}\bof\s+your\s+(posts?|replies?|reposts?|retweets?|quotes?|photos?|videos?)\b/.test(t)) {
                return true;
            }
            if (/\bliked\b/.test(t) && /\bof your (posts?|replies?|reposts?|retweets?|quotes?|photos?|videos?)\b/.test(t)) {
                return true;
            }
            return false;
        },

        isRetweetNotification(text) {
            const t = this._norm(text);
            if (!t) return false;

            // Never treat quote or like rows as retweets
            if (/\bquoted\b/.test(t)) return false;
            if (/\bliked\b/.test(t) && !/\b(reposted|retweeted)\b/.test(t)) return false;

            const patterns = this._patternList('retweetMutePatterns', this.defaultRetweetPatterns);
            for (let i = 0; i < patterns.length; i++) {
                if (t.indexOf(patterns[i]) !== -1) return true;
            }

            if (/\b(reposted|retweeted)\s+your\b/.test(t)) return true;
            if (/\b(reposted|retweeted)\s+\d+\s+of\s+your\b/.test(t)) return true;
            if (/\b(reposted|retweeted)\b[\s\S]{0,40}\bof\s+your\s+(posts?|replies?|tweets?)\b/.test(t)) {
                return true;
            }
            if (/\b(reposted|retweeted)\b/.test(t) && /\byour (post|reply|tweet|repost)\b/.test(t)) {
                return true;
            }
            return false;
        },

        shouldHide(kind) {
            const f = this._filters();
            if (kind === 'like' && f.muteLikes) return true;
            if (kind === 'retweet' && f.muteRetweets) return true;
            return false;
        },

        /**
         * @param {boolean} force
         */
        scanDom(force) {
            if (this._scanning) return;
            this._scanning = true;
            try {
                this.refreshStats();
                const f = this._filters();
                const anyFilter = f.muteLikes || f.muteRetweets;
                if (!anyFilter && !force) return;

                const path = (location.pathname || '').toLowerCase();
                const onNotifs = path.indexOf('/notifications') !== -1;
                if (!onNotifs && !force) {
                    if (force) this.setStatus('pause', 'Open /notifications to mute');
                    return;
                }
                if (!anyFilter) {
                    if (force) this.setStatus('pause', 'Enable mute likes and/or retweets');
                    return;
                }

                let newly = 0;
                const cells = this._cells();
                for (let i = 0; i < cells.length; i++) {
                    const cell = cells[i];
                    if (cell.getAttribute('data-tem-like-hidden') === '1') continue;

                    const text = cell.textContent || '';
                    if (!this._norm(text)) continue;

                    const kind = this.classify(text);
                    if (!this.shouldHide(kind)) continue;

                    cell.setAttribute('data-tem-like-hidden', '1');
                    cell.setAttribute('data-tem-notif-kind', kind);
                    cell.style.setProperty('display', 'none', 'important');
                    newly++;
                    this.hiddenThisSession++;
                }
                this.refreshStats();
                if (force || newly) {
                    this.setStatus(this.watching ? 'run' : 'idle',
                        newly ? ('Hid ' + newly + ' notification(s)') : 'No new rows to hide');
                }
            } finally {
                this._scanning = false;
            }
        },

        /**
         * @param {boolean} [silent]
         */
        unhideAll(silent) {
            const nodes = document.querySelectorAll('[data-tem-like-hidden="1"]');
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                el.removeAttribute('data-tem-like-hidden');
                el.removeAttribute('data-tem-notif-kind');
                el.style.removeProperty('display');
            }
            if (!silent) this.setStatus('idle', 'Unhid ' + nodes.length + ' row(s)');
        }
    };
