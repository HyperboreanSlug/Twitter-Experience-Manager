/**
 * @module notifmute
 * @description Mute like + retweet/repost rows on /notifications. Mute toggles only.
 * @see docs/modules/notifmute.md
 */
    const NotifMute = {
        firstShow: true,
        watching: false,
        observer: null,
        _pollTimer: null,
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
            'others retweeted your'
        ],

        onShow() {
            try { Core.store.set('notifFocusMode', false); } catch (_) { }
            if (this.firstShow) {
                this.render();
                this.firstShow = false;
            }
            this.refreshStats();
            this._setWatchUi(this.watching);
        },

        _filters() {
            // Explicit true defaults — do not inherit a false from legacy focus experiments
            // unless the user actually set notifMuteLikes / notifMuteRetweets
            let muteLikes = Core.store.get('notifMuteLikes', null);
            if (muteLikes === null) {
                const legacy = Core.store.get('likeMuteEnabled', null);
                muteLikes = legacy === null ? true : !!legacy;
            }
            let muteRetweets = Core.store.get('notifMuteRetweets', null);
            if (muteRetweets === null) muteRetweets = true;

            return {
                muteLikes: !!muteLikes,
                muteRetweets: !!muteRetweets,
                autoStart: Core.store.get('likeMuteAutoStart', true) !== false
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
                Client-side only: hides <em>like</em> and <em>retweet/repost</em> notification rows.
                Replies, follows, quotes, and everything else stay visible.
              </div>

              <div class="tem-section">
                <h4>Notification mute</h4>
                <p>Works on <code>/notifications</code>. Only rows that match mute rules are hidden.</p>
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
                <p class="tem-note" id="tem-n-debug">—</p>
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

            const bindToggle = (id, key) => {
                const el = UI.el(id);
                if (!el) return;
                el.onchange = () => {
                    Core.store.set(key, el.checked);
                    if (key === 'notifMuteLikes') Core.store.set('likeMuteEnabled', el.checked);
                    if (this.watching) this.rescanAfterToggle();
                };
            };
            bindToggle('tem-n-mute-likes', 'notifMuteLikes');
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
                // Never persist empty pattern lists (would break filtering)
                Core.store.set('likeMutePatterns', likes.length ? likes : this.defaultLikePatterns);
                Core.store.set('retweetMutePatterns', rts.length ? rts : this.defaultRetweetPatterns);
                if (!likes.length) UI.el('tem-n-patterns').value = this.defaultLikePatterns.join('\n');
                if (!rts.length) UI.el('tem-n-rt-patterns').value = this.defaultRetweetPatterns.join('\n');
                this.setStatus('idle', 'Patterns saved');
                if (this.watching) this.rescanAfterToggle();
            };
            UI.el('tem-n-reset').onclick = () => {
                Core.store.set('likeMutePatterns', this.defaultLikePatterns);
                Core.store.set('retweetMutePatterns', this.defaultRetweetPatterns);
                UI.el('tem-n-patterns').value = this.defaultLikePatterns.join('\n');
                UI.el('tem-n-rt-patterns').value = this.defaultRetweetPatterns.join('\n');
                this.setStatus('idle', 'Patterns reset');
                if (this.watching) this.rescanAfterToggle();
            };

            this.refreshStats();
            this._setWatchUi(this.watching);
            if (this.watching) this.setStatus('run', 'Watching notifications…');
        },

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

        _setDebug(text) {
            const el = UI.el('tem-n-debug');
            if (el) el.textContent = text || '—';
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

        startWatch() {
            if (this.watching) return;
            this.watching = true;
            this._setWatchUi(true);
            this.setStatus('run', 'Watching notifications…');
            this.refreshStats();

            // Always observe document — primaryColumn is replaced on SPA navigations
            if (this.observer) {
                try { this.observer.disconnect(); } catch (_) { }
            }
            this.observer = new MutationObserver(() => this.scheduleScan());
            try {
                this.observer.observe(document.documentElement || document.body, {
                    childList: true,
                    subtree: true
                });
            } catch (e) {
                console.warn('[TEM NotifMute] observer failed', e);
            }

            // Backup poll: catches soft-nav to /notifications and virtualized lists
            if (this._pollTimer) clearInterval(this._pollTimer);
            this._pollTimer = setInterval(() => {
                if (!this.watching) return;
                if ((location.pathname || '').toLowerCase().indexOf('/notifications') === -1) return;
                this.scheduleScan();
            }, 1500);

            this.scanDom(true);
        },

        stopWatch() {
            this.watching = false;
            this._scanScheduled = false;
            if (this.observer) {
                try { this.observer.disconnect(); } catch (_) { }
                this.observer = null;
            }
            if (this._pollTimer) {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
            }
            this._setWatchUi(false);
            this.setStatus('idle', 'Stopped');
            this.refreshStats();
        },

        scheduleScan() {
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
            return String(text || '')
                .toLowerCase()
                .replace(/[\u200b-\u200d\ufeff]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        },

        _patternList(key, defaults) {
            let list = Core.store.get(key, null);
            if (!Array.isArray(list) || !list.length) list = defaults;
            return list.map(p => String(p).toLowerCase()).filter(Boolean);
        },

        /**
         * Collect notification row roots. Prefer explicit notification articles;
         * fall back to cellInnerDiv in the main column.
         */
        _cells() {
            const col = document.querySelector('[data-testid="primaryColumn"]') || document;
            let list = col.querySelectorAll('div[data-testid="cellInnerDiv"]');
            if (!list.length) {
                list = col.querySelectorAll('[data-testid="notification"], article');
            }
            return list;
        },

        /**
         * Richer text than textContent alone — X often puts the phrase in aria-label.
         */
        _cellText(cell) {
            if (!cell) return '';
            const chunks = [];
            try {
                const labeled = cell.querySelectorAll('[aria-label]');
                for (let i = 0; i < labeled.length && i < 40; i++) {
                    const a = labeled[i].getAttribute('aria-label');
                    if (a && a.length > 2 && a.length < 400) chunks.push(a);
                }
            } catch (_) { }
            chunks.push(cell.innerText || '');
            chunks.push(cell.textContent || '');
            return chunks.join(' \n ');
        },

        isLikeNotification(text) {
            const t = this._norm(text);
            if (!t) return false;
            if (/\b(reposted|retweeted)\s+your\b/.test(t) && !/\bliked\b/.test(t)) return false;

            // Strong heuristics first (survive empty/corrupt pattern lists)
            if (/\bliked your\b/.test(t)) return true;
            if (/\bliked\s+\d+\s+of\s+your\b/.test(t)) return true;
            if (/\bliked a (post|reply|repost|retweet|quote|photo|video)\b/.test(t) && /\byou\b/.test(t)) return true;
            if (/\bliked\b.{0,48}\bof\s+your\s+(posts?|replies?|reposts?|retweets?|quotes?|photos?|videos?)\b/.test(t)) return true;
            if (/\bothers liked your\b/.test(t) || /\bother liked your\b/.test(t)) return true;

            const hasLikeVerb = /\b(liked|likes)\b/.test(t) ||
                t.indexOf('gefällt') !== -1 ||
                t.indexOf('aimé') !== -1 ||
                t.indexOf('gusto') !== -1 ||
                t.indexOf('curtiu') !== -1;

            const patterns = this._patternList('likeMutePatterns', this.defaultLikePatterns);
            for (let i = 0; i < patterns.length; i++) {
                const p = patterns[i];
                if (!p || t.indexOf(p) === -1) continue;
                // "of your posts" alone is too broad without a like verb
                if (p.indexOf('of your') === 0 && !hasLikeVerb) continue;
                return true;
            }
            return false;
        },

        isRetweetNotification(text) {
            const t = this._norm(text);
            if (!t) return false;
            if (/\bquoted\b/.test(t)) return false;
            if (/\bliked\b/.test(t) && !/\b(reposted|retweeted)\b/.test(t)) return false;

            if (/\b(reposted|retweeted)\s+your\b/.test(t)) return true;
            if (/\b(reposted|retweeted)\s+\d+\s+of\s+your\b/.test(t)) return true;
            if (/\b(reposted|retweeted)\b.{0,48}\bof\s+your\s+(posts?|replies?|tweets?)\b/.test(t)) return true;
            if (/\b(reposted|retweeted)\b/.test(t) && /\byour (post|reply|tweet|repost)\b/.test(t)) return true;

            const patterns = this._patternList('retweetMutePatterns', this.defaultRetweetPatterns);
            for (let i = 0; i < patterns.length; i++) {
                if (patterns[i] && t.indexOf(patterns[i]) !== -1) return true;
            }
            return false;
        },

        /**
         * @returns {'like'|'retweet'|null} null = do not hide
         */
        matchMuteKind(text) {
            if (this.isLikeNotification(text)) return 'like';
            if (this.isRetweetNotification(text)) return 'retweet';
            return null;
        },

        shouldHide(kind) {
            if (!kind) return false;
            const f = this._filters();
            if (kind === 'like') return f.muteLikes;
            if (kind === 'retweet') return f.muteRetweets;
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

                const path = (location.pathname || '').toLowerCase();
                const onNotifs = path.indexOf('/notifications') !== -1;

                // Auto scans only on notifications; manual "scan once" can force elsewhere
                if (!onNotifs) {
                    if (force) this.setStatus('pause', 'Open /notifications to mute');
                    this._setDebug(onNotifs ? '' : 'Not on /notifications — idle');
                    return;
                }
                if (!anyFilter) {
                    if (force) this.setStatus('pause', 'Enable mute likes and/or retweets');
                    this._setDebug('No mute toggles on');
                    return;
                }

                let newly = 0;
                let seen = 0;
                let likes = 0;
                let rts = 0;
                const cells = this._cells();
                for (let i = 0; i < cells.length; i++) {
                    const cell = cells[i];
                    // Skip TEM UI if it somehow appears in column
                    if (cell.closest && cell.closest('#tem-panel')) continue;
                    if (cell.getAttribute('data-tem-like-hidden') === '1') {
                        seen++;
                        continue;
                    }

                    const text = this._cellText(cell);
                    if (!this._norm(text)) continue;
                    seen++;

                    const kind = this.matchMuteKind(text);
                    if (!kind || !this.shouldHide(kind)) continue;

                    if (kind === 'like') likes++;
                    if (kind === 'retweet') rts++;

                    cell.setAttribute('data-tem-like-hidden', '1');
                    cell.setAttribute('data-tem-notif-kind', kind);
                    cell.style.setProperty('display', 'none', 'important');
                    newly++;
                    this.hiddenThisSession++;
                }

                this.refreshStats();
                this._setDebug(
                    'cells~' + cells.length +
                    ' scanned~' + seen +
                    ' hid+' + newly +
                    ' (likes+' + likes + ' rt+' + rts + ')' +
                    ' muteL=' + f.muteLikes + ' muteRT=' + f.muteRetweets
                );

                if (force || newly) {
                    this.setStatus(this.watching ? 'run' : 'idle',
                        newly ? ('Hid ' + newly + ' (likes ' + likes + ', reposts ' + rts + ')') :
                            (this.watching ? 'Watching… no new matches' : 'No matching rows'));
                } else if (this.watching) {
                    this.setStatus('run', 'Watching notifications…');
                }
            } catch (err) {
                console.warn('[TEM NotifMute] scanDom error', err);
                this.setStatus('stop', 'Scan error: ' + (err && err.message ? err.message : err));
            } finally {
                this._scanning = false;
            }
        },

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
