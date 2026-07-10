/**
 * @module notifmute
 * @description Mute like + retweet rows on /notifications.
 * Virtual-list safe: collapse shell only (never display:none children — that
 * empties innerText and caused hide→unhide→rehide flicker).
 * @see docs/modules/notifmute.md
 */
    const NotifMute = {
        firstShow: true,
        watching: false,
        _tickTimer: null,
        hiddenThisSession: 0,
        _scanning: false,
        /** Slow tick only — never MutationObserver */
        tickMs: 2500,
        _filterGen: 1,

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
                autoStart: !!Core.store.get('likeMuteAutoStart', false)
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
                Hides like and repost rows only. Collapse shell only (no child
                <code>display:none</code> — that caused hide/unhide flicker).
              </div>

              <div class="tem-section">
                <h4>Notification mute</h4>
                <p>On <code>/notifications</code>, mute likes and/or retweets. Everything else stays.</p>
                <div class="tem-stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-hidden">0</div><div class="tem-stat-l">Hidden (session)</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-state">Off</div><div class="tem-stat-l">Watcher</div></div>
                </div>
                <div class="tem-now" id="tem-n-path">Path: –</div>

                <label class="tem-check"><input type="checkbox" id="tem-n-mute-likes" ${f.muteLikes ? 'checked' : ''}> Mute <strong>likes</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-mute-rt" ${f.muteRetweets ? 'checked' : ''}> Mute <strong>retweets / reposts</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-autostart" ${f.autoStart ? 'checked' : ''}> Auto-start (keep off for performance)</label>

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
                <textarea id="tem-n-patterns" class="tem-input" rows="4">${Core.escapeHtml(likePatterns)}</textarea>
                <h4 class="tem-subhead">Retweet patterns</h4>
                <textarea id="tem-n-rt-patterns" class="tem-input" rows="3">${Core.escapeHtml(rtPatterns)}</textarea>
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
            if (this.watching) this.setStatus('run', 'Watching…');
        },

        rescanAfterToggle() {
            // Bump gen so fingerprints re-evaluate without mass unhide thrash
            this._filterGen++;
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
                    p.textContent = 'Path: ' + ((location.pathname || '/').split('?')[0] || '/');
                } catch (_) { p.textContent = 'Path: –'; }
            }
        },

        _setWatchUi(on) {
            const start = UI.el('tem-n-start');
            const stop = UI.el('tem-n-stop');
            if (start) start.disabled = on;
            if (stop) stop.disabled = !on;
        },

        _onNotifsPath() {
            return (location.pathname || '').toLowerCase().indexOf('/notifications') !== -1;
        },

        startWatch() {
            if (this.watching) return;
            this.watching = true;
            this._setWatchUi(true);
            this.setStatus('run', 'Watching…');
            this.refreshStats();

            if (this._tickTimer) clearInterval(this._tickTimer);
            this._tickTimer = setInterval(() => {
                if (!this.watching || this._scanning) return;
                if (!this._onNotifsPath()) {
                    this._setDebug('Idle (open /notifications)');
                    return;
                }
                this.scanDom(false);
            }, this.tickMs);

            if (this._onNotifsPath()) this.scanDom(true);
            else this._setDebug('Open /notifications, then Start (or wait for tick)');
        },

        stopWatch() {
            this.watching = false;
            if (this._tickTimer) {
                clearInterval(this._tickTimer);
                this._tickTimer = null;
            }
            this._setWatchUi(false);
            this.setStatus('idle', 'Stopped');
            this.refreshStats();
        },

        _norm(text) {
            return String(text || '')
                .toLowerCase()
                // strip zero-width / directional marks X injects between words
                .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        },

        /** Drop relative clocks so “2m”→“3m” does not thrash fingerprints. */
        _stableForFp(text) {
            return this._norm(text)
                .replace(/\b\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?|secs?|mins?|hrs?|[smhdwy])\b/gi, ' ')
                .replace(/\b(just now|yesterday|today|now|ago)\b/gi, ' ')
                .replace(/\d{1,2}:\d{2}(?::\d{2})?\s*(am|pm)?/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 160);
        },

        _fingerprint(text) {
            const t = this._stableForFp(text);
            let h = this._filterGen * 31;
            for (let i = 0; i < t.length; i++) h = ((h << 5) - h + t.charCodeAt(i)) | 0;
            return String(h);
        },

        _patternList(key, defaults) {
            let list = Core.store.get(key, null);
            if (!Array.isArray(list) || !list.length) list = defaults;
            return list.map(p => String(p).toLowerCase()).filter(Boolean);
        },

        _cells() {
            const col = document.querySelector('[data-testid="primaryColumn"]');
            if (!col) return [];
            // Live NodeList → array of up to 35 visible rows
            const list = col.querySelectorAll('[data-testid="cellInnerDiv"]');
            const out = [];
            const n = Math.min(list.length, 35);
            for (let i = 0; i < n; i++) out.push(list[i]);
            return out;
        },

        /**
         * Build match text. Prefer textContent (works when shell is collapsed).
         * Never use innerText alone — display:none / collapse drops it and
         * caused mute rows to unhide on the next tick.
         */
        _cellText(cell) {
            if (!cell) return '';
            const parts = [];
            try {
                const ctx = cell.querySelector('[data-testid="socialContext"]');
                if (ctx) parts.push(ctx.textContent || '');
            } catch (_) { }
            try {
                const labels = cell.querySelectorAll('[aria-label]');
                const max = Math.min(labels.length, 12);
                for (let i = 0; i < max; i++) {
                    const a = labels[i].getAttribute('aria-label');
                    if (!a || a.length < 3 || a.length > 280) continue;
                    // skip pure timestamps / media chrome
                    if (/^\d/.test(a) && a.length < 12) continue;
                    parts.push(a);
                }
            } catch (_) { }
            // textContent keeps muted/collapsed subtree readable for matching
            parts.push(cell.textContent || '');
            return parts.join(' · ').slice(0, 1200);
        },

        /**
         * Broad but safe like detection. Uses includes() first (no \b issues with emoji).
         */
        isLikeNotification(text) {
            const t = this._norm(text);
            if (!t) return false;

            // Exclude pure repost rows
            const hasRepost = t.indexOf('reposted') !== -1 || t.indexOf('retweeted') !== -1;
            const hasLiked = t.indexOf('liked') !== -1 ||
                t.indexOf('like your') !== -1 ||
                t.indexOf('gefällt') !== -1 ||
                t.indexOf('aimé') !== -1 ||
                t.indexOf('curtiu') !== -1 ||
                t.indexOf('le gusto') !== -1;

            if (!hasLiked) {
                // custom patterns may still match
            } else {
                if (hasRepost && t.indexOf('liked') === -1) return false;

                // Core English shapes used by X
                if (t.indexOf('liked your') !== -1) return true;
                if (t.indexOf('liked a post') !== -1 && t.indexOf('you') !== -1) return true;
                if (t.indexOf('liked a reply') !== -1 && t.indexOf('you') !== -1) return true;
                if (t.indexOf('liked a repost') !== -1 && t.indexOf('you') !== -1) return true;
                if (t.indexOf('liked a photo') !== -1 && t.indexOf('you') !== -1) return true;
                if (t.indexOf('liked a video') !== -1 && t.indexOf('you') !== -1) return true;
                if (t.indexOf('liked') !== -1 && t.indexOf('of your') !== -1) return true;
                if (t.indexOf('liked') !== -1 && t.indexOf('your post') !== -1) return true;
                if (t.indexOf('liked') !== -1 && t.indexOf('your reply') !== -1) return true;
                if (t.indexOf('liked') !== -1 && t.indexOf('your posts') !== -1) return true;
                if (t.indexOf('others liked') !== -1) return true;
                // “User liked” + short cell often still a like notif
                if (/\bliked\b/.test(t) && (t.indexOf('post') !== -1 || t.indexOf('reply') !== -1 || t.indexOf('posts') !== -1)) {
                    // avoid “you liked” on someone else's activity if ever shown
                    if (t.indexOf('you liked') === 0) return false;
                    return true;
                }
            }

            const patterns = this._patternList('likeMutePatterns', this.defaultLikePatterns);
            for (let i = 0; i < patterns.length; i++) {
                const p = patterns[i];
                if (!p || t.indexOf(p) === -1) continue;
                if (p.indexOf('of your') === 0 && t.indexOf('liked') === -1) continue;
                return true;
            }
            return false;
        },

        isRetweetNotification(text) {
            const t = this._norm(text);
            if (!t) return false;
            if (t.indexOf('quoted') !== -1) return false;
            if (t.indexOf('liked') !== -1 && t.indexOf('reposted') === -1 && t.indexOf('retweeted') === -1) {
                return false;
            }

            if (t.indexOf('reposted your') !== -1) return true;
            if (t.indexOf('retweeted your') !== -1) return true;
            if (t.indexOf('reposted') !== -1 && t.indexOf('of your') !== -1) return true;
            if (t.indexOf('retweeted') !== -1 && t.indexOf('of your') !== -1) return true;
            if (t.indexOf('reposted') !== -1 && t.indexOf('your post') !== -1) return true;
            if (t.indexOf('retweeted') !== -1 && t.indexOf('your post') !== -1) return true;

            const patterns = this._patternList('retweetMutePatterns', this.defaultRetweetPatterns);
            for (let i = 0; i < patterns.length; i++) {
                if (patterns[i] && t.indexOf(patterns[i]) !== -1) return true;
            }
            return false;
        },

        matchMuteKind(text) {
            // Order: like first (a row is rarely both)
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
         * Collapse shell only. Do NOT display:none children — that blanks
         * innerText and made the next scan unhide then re-hide (status flicker).
         * CSS [data-tem-like-hidden] also applies; inline reinforces.
         */
        _hideCell(cell, kind) {
            if (!cell) return;
            cell.setAttribute('data-tem-like-hidden', '1');
            cell.setAttribute('data-tem-notif-kind', kind || '');
            cell.style.setProperty('max-height', '0', 'important');
            cell.style.setProperty('min-height', '0', 'important');
            cell.style.setProperty('height', '0', 'important');
            cell.style.setProperty('overflow', 'hidden', 'important');
            cell.style.setProperty('opacity', '0', 'important');
            cell.style.setProperty('margin', '0', 'important');
            cell.style.setProperty('padding', '0', 'important');
            cell.style.setProperty('border', '0', 'important');
            cell.style.setProperty('pointer-events', 'none', 'important');
            // Clear legacy child display:none from older TEM versions
            const kids = cell.children;
            for (let i = 0; i < kids.length; i++) {
                if (kids[i].style && kids[i].style.display === 'none') {
                    kids[i].style.removeProperty('display');
                }
            }
        },

        _showCell(cell) {
            if (!cell) return;
            cell.removeAttribute('data-tem-like-hidden');
            cell.removeAttribute('data-tem-notif-kind');
            cell.style.removeProperty('max-height');
            cell.style.removeProperty('min-height');
            cell.style.removeProperty('height');
            cell.style.removeProperty('overflow');
            cell.style.removeProperty('opacity');
            cell.style.removeProperty('margin');
            cell.style.removeProperty('padding');
            cell.style.removeProperty('border');
            cell.style.removeProperty('pointer-events');
            cell.style.removeProperty('display');
            const kids = cell.children;
            for (let i = 0; i < kids.length; i++) {
                kids[i].style.removeProperty('display');
            }
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
                const onNotifs = this._onNotifsPath();

                if (!onNotifs) {
                    if (force) this.setStatus('pause', 'Open /notifications to mute');
                    this._setDebug('Not on /notifications');
                    return;
                }
                if (!anyFilter) {
                    if (force) this.setStatus('pause', 'Turn on mute likes and/or retweets');
                    this._setDebug('No mute toggles enabled');
                    return;
                }

                let newly = 0;
                let likes = 0;
                let rts = 0;
                let checked = 0;
                let kept = 0;
                const cells = this._cells();
                const gen = String(this._filterGen);

                for (let i = 0; i < cells.length; i++) {
                    const cell = cells[i];
                    if (!cell || (cell.closest && cell.closest('#tem-panel'))) continue;

                    const wasHidden = cell.getAttribute('data-tem-like-hidden') === '1';
                    const text = this._cellText(cell);
                    const norm = this._norm(text);
                    const fp = this._fingerprint(text) + ':' + gen;

                    // Same content + same filter gen → leave alone (recycle-safe)
                    if (!force && cell.getAttribute('data-tem-fp') === fp) {
                        if (wasHidden) kept++;
                        continue;
                    }

                    // Sticky hide: weak/empty text after collapse must not unhide
                    if (wasHidden && norm.length < 12) {
                        cell.setAttribute('data-tem-fp', fp);
                        kept++;
                        continue;
                    }

                    cell.setAttribute('data-tem-fp', fp);
                    checked++;

                    const kind = this.matchMuteKind(text);
                    const hide = kind && this.shouldHide(kind);

                    if (hide) {
                        this._hideCell(cell, kind);
                        if (!wasHidden) {
                            newly++;
                            this.hiddenThisSession++;
                            if (kind === 'like') likes++;
                            if (kind === 'retweet') rts++;
                        } else {
                            kept++;
                        }
                    } else if (wasHidden) {
                        // Only unhide when we confidently have non-mute content
                        // (virtual-list recycled the shell to a different row)
                        if (norm.length >= 12) this._showCell(cell);
                        else kept++;
                    }
                }

                this.refreshStats();
                this._setDebug(
                    'rows ' + cells.length +
                    ' · chk ' + checked +
                    ' · new +' + newly +
                    ' · kept ' + kept +
                    ' · tot ' + this.hiddenThisSession +
                    ' (♥' + likes + ' ↻' + rts + ')' +
                    ' · L=' + f.muteLikes + ' RT=' + f.muteRetweets
                );

                if (force || newly) {
                    this.setStatus(this.watching ? 'run' : 'idle',
                        newly
                            ? ('Hid +' + newly + ' this pass · session ' + this.hiddenThisSession)
                            : ('Stable · session ' + this.hiddenThisSession));
                } else if (this.watching) {
                    this.setStatus('run', 'Watching · session ' + this.hiddenThisSession);
                }
            } catch (err) {
                console.warn('[TEM NotifMute] scanDom', err);
                this.setStatus('stop', 'Scan error');
            } finally {
                this._scanning = false;
            }
        },

        unhideAll(silent) {
            const col = document.querySelector('[data-testid="primaryColumn"]') || document;
            const nodes = col.querySelectorAll('[data-tem-like-hidden="1"], [data-tem-fp]');
            for (let i = 0; i < nodes.length; i++) {
                this._showCell(nodes[i]);
                nodes[i].removeAttribute('data-tem-fp');
            }
            this._filterGen++;
            if (!silent) this.setStatus('idle', 'Unhid page');
        }
    };
