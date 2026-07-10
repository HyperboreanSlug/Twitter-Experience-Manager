/**
 * @module notifmute
 * @description Filter X /notifications rows: mute likes/retweets; keep replies, follows, quotes.
 * @see docs/modules/notifmute.md
 */
    const NotifMute = {
        firstShow: true,
        watching: false,
        observer: null,
        hiddenThisSession: 0,
        _scanScheduled: false,

        // Extra like substrings (also used by classify). User-editable in UI.
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
            'reposted a post',
            'retweeted a post',
            'reposted your post',
            'retweeted your post',
            'reposted your reply',
            'retweeted your reply',
            'reposted your quote',
            'reposted  your',
            'reposted your posts',
            'reposted one of your',
            'retweeted one of your',
            'reposted this',
            // group copy
            'others reposted',
            'others retweeted',
            'reposted posts you',
            'retweeted posts you'
        ],

        onShow() {
            if (this.firstShow) {
                this.render();
                this.firstShow = false;
            }
            this.refreshStats();
            this._setWatchUi(this.watching);
        },

        _filters() {
            return {
                // Mute (hide) these kinds when enabled
                muteLikes: Core.store.get('notifMuteLikes', Core.store.get('likeMuteEnabled', true)),
                muteRetweets: Core.store.get('notifMuteRetweets', true),
                // Focus: only keep selected kinds; hide the rest
                focusMode: Core.store.get('notifFocusMode', true),
                keepReplies: Core.store.get('notifKeepReplies', true),
                keepFollows: Core.store.get('notifKeepFollows', true),
                keepQuotes: Core.store.get('notifKeepQuotes', true),
                autoStart: Core.store.get('likeMuteAutoStart', true)
            };
        },

        render() {
            const pane = UI.el('tem-pane-notifs');
            if (!pane) return;

            const f = this._filters();
            const likePatterns = (Core.store.get('likeMutePatterns', this.defaultLikePatterns) || this.defaultLikePatterns).join('\n');
            const rtPatterns = (Core.store.get('retweetMutePatterns', this.defaultRetweetPatterns) || this.defaultRetweetPatterns).join('\n');

            pane.innerHTML = `
              <div class="tem-warn-box">
                Client-side only: hides notification <em>rows in the DOM</em>. Does not change X account settings.
              </div>

              <div class="tem-section">
                <h4>Notification filter</h4>
                <p>On the notifications page, hide noise and keep the types you care about.</p>
                <div class="tem-stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-hidden">0</div><div class="tem-stat-l">Hidden (session)</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-n-state">Off</div><div class="tem-stat-l">Watcher</div></div>
                </div>
                <div class="tem-now" id="tem-n-path" title="Current path">Path: –</div>

                <h4 class="tem-subhead">Mute (hide)</h4>
                <label class="tem-check"><input type="checkbox" id="tem-n-mute-likes" ${f.muteLikes ? 'checked' : ''}> Mute <strong>likes</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-mute-rt" ${f.muteRetweets ? 'checked' : ''}> Mute <strong>retweets / reposts</strong></label>

                <h4 class="tem-subhead">Keep only (focus)</h4>
                <label class="tem-check"><input type="checkbox" id="tem-n-focus" ${f.focusMode ? 'checked' : ''}> <strong>Focus mode</strong> — hide everything except the types below</label>
                <label class="tem-check"><input type="checkbox" id="tem-n-keep-replies" ${f.keepReplies ? 'checked' : ''}> Keep <strong>replies</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-keep-follows" ${f.keepFollows ? 'checked' : ''}> Keep <strong>new followers</strong></label>
                <label class="tem-check"><input type="checkbox" id="tem-n-keep-quotes" ${f.keepQuotes ? 'checked' : ''}> Keep <strong>quote tweets</strong></label>

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
                <p class="tem-note">Tip: open Notifications → All. Focus mode + mute likes/retweets is the recommended default.</p>
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
              <div class="tem-foot">Notif filter · v${Core.version}</div>`;

            const bindToggle = (id, key, legacyKey) => {
                const el = UI.el(id);
                if (!el) return;
                el.onchange = () => {
                    Core.store.set(key, el.checked);
                    if (legacyKey) Core.store.set(legacyKey, el.checked);
                    if (this.watching) {
                        this.unhideAll(true);
                        this.scanDom(true);
                    }
                };
            };
            bindToggle('tem-n-mute-likes', 'notifMuteLikes', 'likeMuteEnabled');
            bindToggle('tem-n-mute-rt', 'notifMuteRetweets');
            bindToggle('tem-n-focus', 'notifFocusMode');
            bindToggle('tem-n-keep-replies', 'notifKeepReplies');
            bindToggle('tem-n-keep-follows', 'notifKeepFollows');
            bindToggle('tem-n-keep-quotes', 'notifKeepQuotes');
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
                if (this.watching) {
                    this.unhideAll(true);
                    this.scanDom(true);
                }
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

        _norm(text) {
            return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
        },

        _patternList(key, defaults) {
            const list = Core.store.get(key, defaults) || defaults;
            return list.map(p => String(p).toLowerCase()).filter(Boolean);
        },

        _cells() {
            const primary = document.querySelectorAll('[data-testid="cellInnerDiv"]');
            if (primary.length) return primary;
            return document.querySelectorAll('article, [data-testid="notification"]');
        },

        /**
         * Classify a notification cell into a kind.
         * Order matters: quote before retweet/reply when ambiguous.
         * @returns {'like'|'retweet'|'quote'|'reply'|'follow'|'mention'|'other'}
         */
        classify(text) {
            const t = this._norm(text);
            if (!t) return 'other';

            // Quote tweets first (X: “quoted your post”)
            if (/\bquoted your\b/.test(t) ||
                /\bquoted a (post|reply|tweet)\b/.test(t) ||
                /\bquote[- ]?tweeted your\b/.test(t) ||
                t.indexOf('quoted your post') !== -1 ||
                t.indexOf('quoted your reply') !== -1) {
                return 'quote';
            }

            // Likes
            if (this.isLikeNotification(t)) return 'like';

            // Retweets / reposts
            if (this.isRetweetNotification(t)) return 'retweet';

            // Follows
            if (/\bfollowed you\b/.test(t) ||
                /\bstarted following you\b/.test(t) ||
                /\bfollowed you and\b/.test(t) ||
                t.indexOf('followed you') !== -1 ||
                /\bis following you\b/.test(t)) {
                return 'follow';
            }

            // Replies
            if (/\breplied to your\b/.test(t) ||
                /\breplied to you\b/.test(t) ||
                /\breplied to a (post|tweet|reply) you\b/.test(t) ||
                t.indexOf('replied to your') !== -1) {
                return 'reply';
            }

            // Mentions (optional “other” unless you expand keep list)
            if (/\bmentioned you\b/.test(t) || t.indexOf('mentioned you') !== -1) {
                return 'mention';
            }

            return 'other';
        },

        isLikeNotification(text) {
            const t = this._norm(text);
            if (!t) return false;

            const hasLikeVerb = /\b(liked|like|likes)\b/.test(t) ||
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

            // Don't treat quote as retweet
            if (/\bquoted\b/.test(t)) return false;

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
            // “X reposted” without “your” sometimes still about your content in context
            if (/\breposted your\b/.test(t) || /\bretweeted your\b/.test(t)) return true;
            return false;
        },

        /**
         * @param {string} kind
         * @returns {boolean} true → hide row
         */
        shouldHide(kind) {
            const f = this._filters();

            if (kind === 'like' && f.muteLikes) return true;
            if (kind === 'retweet' && f.muteRetweets) return true;

            if (f.focusMode) {
                if (kind === 'reply' && f.keepReplies) return false;
                if (kind === 'follow' && f.keepFollows) return false;
                if (kind === 'quote' && f.keepQuotes) return false;
                // Focus: hide everything not explicitly kept
                // (likes/retweets already muted above; if mute off, still hide under focus)
                return true;
            }

            return false;
        },

        /**
         * @param {boolean} force
         */
        scanDom(force) {
            this.refreshStats();
            const f = this._filters();
            const anyFilter = f.muteLikes || f.muteRetweets || f.focusMode;
            if (!anyFilter && !force) return;

            const path = (location.pathname || '').toLowerCase();
            const onNotifs = path.indexOf('/notifications') !== -1;
            if (!onNotifs && !force) {
                if (force) this.setStatus('pause', 'Open /notifications to filter');
                return;
            }
            if (!anyFilter) {
                if (force) this.setStatus('pause', 'No mute/focus filters enabled');
                return;
            }

            let newly = 0;
            const cells = this._cells();
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                if (cell.getAttribute('data-tem-like-hidden') === '1') continue;

                const text = cell.textContent || '';
                // Skip empty / chrome-only cells
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
