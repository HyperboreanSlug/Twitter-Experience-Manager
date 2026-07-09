/**
 * @module geoguard
 * @description Timeline watcher: soft region hide + optional auto-block (self-reported location).
 * @see docs/modules/geoguard.md
 */
    const GeoGuard = {
        firstShow: true,
        watching: false,
        observer: null,
        queue: [],
        processing: false,
        seen: new Set(),            // handles already evaluated this session
        matchedHandles: new Set(),  // lowercased handles that matched region
        blockedThisSession: 0,
        matchedThisSession: 0,
        hiddenThisSession: 0,
        scannedThisSession: 0,
        logLines: [],
        profileCache: {},           // handle -> profile + match meta
        delayMs: 1100,
        _scanScheduled: false,

        // Default South Asia / India location needles (case-insensitive substring).
        // Editable in the UI; stored in localStorage.
        defaultNeedles: [
            // India
            'india', 'bharat', 'hindustan', 'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru',
            'hyderabad', 'chennai', 'kolkata', 'calcutta', 'pune', 'ahmedabad', 'jaipur', 'lucknow',
            'kanpur', 'nagpur', 'indore', 'bhopal', 'patna', 'ranchi', 'surat', 'vadodara',
            'kochi', 'cochin', 'trivandrum', 'thiruvananthapuram', 'mysore', 'mysuru', 'gurgaon',
            'gurugram', 'noida', 'ghaziabad', 'faridabad', 'chandigarh', 'amritsar', 'ludhiana',
            'varanasi', 'agra', 'goa', 'kerala', 'tamil nadu', 'karnataka', 'maharashtra',
            'gujarat', 'rajasthan', 'punjab, india', 'west bengal', 'uttar pradesh', 'bihar',
            'odisha', 'orissa', 'telangana', 'andhra', 'assam', 'jharkhand', 'chhattisgarh',
            'madhya pradesh', 'haryana', 'uttarakhand', 'himachal', 'jammu', 'kashmir',
            // Broader South Asia
            'pakistan', 'karachi', 'lahore', 'islamabad', 'rawalpindi', 'peshawar', 'multan',
            'bangladesh', 'dhaka', 'chittagong', 'chattogram',
            'sri lanka', 'colombo', 'kandy',
            'nepal', 'kathmandu',
            'bhutan', 'thimphu',
            'maldives', 'male, maldives',
            'afghanistan', 'kabul',
            'south asia', 'southasian', 'desi'
        ],

        onShow() {
            if (this.firstShow) {
                this.render();
                this.firstShow = false;
            }
            this.refreshStats();
        },

        render() {
            const pane = UI.el('tem-pane-geoguard');
            if (!pane) return;

            const needles = Core.store.get('geoNeedles', this.defaultNeedles).join('\n');
            const whitelist = (Core.store.get('geoWhitelist', []) || []).join('\n');
            const dryRun = Core.store.get('geoDryRun', true);
            const softHide = Core.store.get('geoSoftHide', true);
            const autoStart = Core.store.get('geoAutoStart', false);
            const useBio = Core.store.get('geoUseBio', false);

            pane.innerHTML = `
              <div class="tem-warn-box">
                Matches <strong>self-reported</strong> profile location (and optional bio) text only —
                not IP, passport, or ethnicity. Expect false positives/negatives.
                Prefer <strong>soft hide</strong> (client-side) over live block (ToS risk).
              </div>

              <div class="tem-section">
                <h4>Timeline Geo Guard</h4>
                <p>Looks up authors on the timeline. Matching accounts can be <strong>soft-hidden</strong> (DOM only) and/or blocked.</p>
                <div class="tem-stats" style="grid-template-columns:repeat(4,1fr)">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-scanned">0</div><div class="tem-stat-l">Scanned</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-matched">0</div><div class="tem-stat-l">Matched</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-hidden">0</div><div class="tem-stat-l">Hidden</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-blocked">0</div><div class="tem-stat-l">Blocked</div></div>
                </div>
                <label class="tem-check"><input type="checkbox" id="tem-g-soft" ${softHide ? 'checked' : ''}> <strong>Soft hide</strong> matching posts (recommended; reversible in-session)</label>
                <label class="tem-check"><input type="checkbox" id="tem-g-dry" ${dryRun ? 'checked' : ''}> Do not live-block (log only for block path)</label>
                <label class="tem-check"><input type="checkbox" id="tem-g-bio" ${useBio ? 'checked' : ''}> Also match bio / description text</label>
                <label class="tem-check"><input type="checkbox" id="tem-g-autostart" ${autoStart ? 'checked' : ''}> Auto-start watch when script loads</label>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-primary" id="tem-g-start" type="button">Start watching timeline</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-stop" type="button" disabled>Stop</button>
                </div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-unhide" type="button">Unhide soft-hidden posts</button>
                </div>
                <div class="tem-status idle" id="tem-g-status">Idle</div>
                <div class="tem-now" id="tem-g-now" style="display:none"></div>
              </div>

              <div class="tem-section">
                <h4>Region needles (one per line)</h4>
                <p>Case-insensitive substrings tested against profile location${useBio ? ' and bio' : ''}.</p>
                <textarea id="tem-g-needles" class="tem-input" rows="8">${Core.escapeHtml(needles)}</textarea>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-save-needles" type="button">Save needles</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-reset-needles" type="button">Reset defaults</button>
                </div>
              </div>

              <div class="tem-section">
                <h4>Whitelist (never hide / block)</h4>
                <textarea id="tem-g-whitelist" class="tem-input" rows="3" placeholder="@friend&#10;@org">${Core.escapeHtml(whitelist)}</textarea>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-save-wl" type="button">Save whitelist</button>
                </div>
              </div>

              <div class="tem-section">
                <h4>Session log</h4>
                <div class="tem-log" id="tem-g-log"></div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-export" type="button">Export log JSON</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-clear" type="button">Clear session</button>
                </div>
              </div>
              <div class="tem-foot">Geo Guard · v${Core.version}</div>`;

            UI.el('tem-g-start').onclick = () => this.startWatch();
            UI.el('tem-g-stop').onclick = () => this.stopWatch();
            UI.el('tem-g-soft').onchange = () => Core.store.set('geoSoftHide', UI.el('tem-g-soft').checked);
            UI.el('tem-g-dry').onchange = () => Core.store.set('geoDryRun', UI.el('tem-g-dry').checked);
            UI.el('tem-g-bio').onchange = () => Core.store.set('geoUseBio', UI.el('tem-g-bio').checked);
            UI.el('tem-g-autostart').onchange = () => Core.store.set('geoAutoStart', UI.el('tem-g-autostart').checked);
            UI.el('tem-g-unhide').onclick = () => this.unhideAll();
            UI.el('tem-g-save-needles').onclick = () => {
                const list = this._parseLines(UI.el('tem-g-needles').value);
                Core.store.set('geoNeedles', list);
                this.log('Saved ' + list.length + ' needles');
            };
            UI.el('tem-g-reset-needles').onclick = () => {
                Core.store.set('geoNeedles', this.defaultNeedles);
                UI.el('tem-g-needles').value = this.defaultNeedles.join('\n');
                this.log('Needles reset to defaults');
            };
            UI.el('tem-g-save-wl').onclick = () => {
                const list = this._parseLines(UI.el('tem-g-whitelist').value).map(h => h.replace(/^@/, '').toLowerCase());
                Core.store.set('geoWhitelist', list);
                this.log('Whitelist saved (' + list.length + ')');
            };
            UI.el('tem-g-export').onclick = () => this.exportLog();
            UI.el('tem-g-clear').onclick = () => {
                this.seen.clear();
                this.matchedHandles.clear();
                this.logLines = [];
                this.blockedThisSession = 0;
                this.matchedThisSession = 0;
                this.hiddenThisSession = 0;
                this.scannedThisSession = 0;
                this.refreshStats();
                this._paintLog();
            };
            this.refreshStats();
            this._paintLog();
            if (this.watching) this._setWatchUi(true);
        },

        _parseLines(text) {
            return String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        },

        setStatus(kind, text) {
            const el = UI.el('tem-g-status');
            if (!el) return;
            el.className = 'tem-status ' + kind;
            el.textContent = text;
        },

        setNow(text) {
            const el = UI.el('tem-g-now');
            if (!el) return;
            if (!text) { el.style.display = 'none'; return; }
            el.style.display = 'block';
            el.textContent = text;
        },

        refreshStats() {
            const s = UI.el('tem-g-scanned');
            const m = UI.el('tem-g-matched');
            const h = UI.el('tem-g-hidden');
            const b = UI.el('tem-g-blocked');
            if (s) s.textContent = String(this.scannedThisSession);
            if (m) m.textContent = String(this.matchedThisSession);
            if (h) h.textContent = String(this.hiddenThisSession);
            if (b) b.textContent = String(this.blockedThisSession);
        },

        log(msg, data) {
            const line = { at: new Date().toISOString(), msg, ...(data || {}) };
            this.logLines.push(line);
            if (this.logLines.length > 500) this.logLines.shift();
            console.log('[TEM GeoGuard]', msg, data || '');
            this._paintLog();
        },

        _paintLog() {
            const el = UI.el('tem-g-log');
            if (!el) return;
            const recent = this.logLines.slice(-80).reverse();
            el.innerHTML = recent.map(l =>
                `<div>${Core.escapeHtml(l.at.slice(11, 19))} ${Core.escapeHtml(l.msg)}${l.handle ? ' @' + Core.escapeHtml(l.handle) : ''}${l.reason ? ' — ' + Core.escapeHtml(l.reason) : ''}</div>`
            ).join('') || '<div class="tem-note">No events yet.</div>';
        },

        startWatch() {
            if (this.watching) return;
            this.watching = true;
            this._setWatchUi(true);
            const soft = Core.store.get('geoSoftHide', true);
            const dry = Core.store.get('geoDryRun', true);
            this.setStatus('run', 'Watching timeline…');
            this.log('Watch started' +
                (soft ? ' · soft-hide ON' : ' · soft-hide OFF') +
                (dry ? ' · no live-block' : ' · LIVE BLOCK'));

            this.scanDom();

            this.observer = new MutationObserver(() => {
                if (!this.watching) return;
                this.scheduleScan();
            });
            try {
                this.observer.observe(document.body || document.documentElement, {
                    childList: true, subtree: true
                });
            } catch (e) {
                console.warn('[TEM GeoGuard] observer failed', e);
            }
            this._pump();
        },

        stopWatch() {
            this.watching = false;
            if (this.observer) {
                try { this.observer.disconnect(); } catch (_) { }
                this.observer = null;
            }
            this._setWatchUi(false);
            this.setStatus('idle', 'Stopped');
            this.setNow('');
            this.log('Watch stopped');
        },

        scheduleScan() {
            if (this._scanScheduled) return;
            this._scanScheduled = true;
            const run = () => {
                this._scanScheduled = false;
                if (this.watching) this.scanDom();
            };
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
            else setTimeout(run, 50);
        },

        _setWatchUi(on) {
            const start = UI.el('tem-g-start');
            const stop = UI.el('tem-g-stop');
            if (start) start.disabled = on;
            if (stop) stop.disabled = !on;
        },

        /**
         * Author handle from a tweet article (primary User-Name link).
         */
        authorFromArticle(article) {
            const nameBlock = article.querySelector('[data-testid="User-Name"]');
            if (!nameBlock) return null;
            const links = nameBlock.querySelectorAll('a[href^="/"]');
            for (let i = 0; i < links.length; i++) {
                const href = links[i].getAttribute('href') || '';
                const m = href.match(/^\/([A-Za-z0-9_]{1,15})(?:\/|$|\?)/);
                if (m && !/^(home|explore|search|i|settings|messages|notifications|compose)$/i.test(m[1])) {
                    return m[1];
                }
            }
            return null;
        },

        /**
         * Soft-hide: hide the cell wrapper when possible so virtualized list gaps collapse better.
         */
        hideArticle(article, handle, reason) {
            if (!article || article.getAttribute('data-tem-geo-hidden') === '1') return false;
            const target = article.closest('[data-testid="cellInnerDiv"]') || article;
            target.setAttribute('data-tem-geo-hidden', '1');
            if (handle) target.setAttribute('data-tem-geo-handle', handle);
            if (reason) target.setAttribute('data-tem-geo-reason', reason);
            target.style.setProperty('display', 'none', 'important');
            this.hiddenThisSession++;
            return true;
        },

        hideArticlesForHandle(handle, reason) {
            if (!Core.store.get('geoSoftHide', true)) return 0;
            const key = String(handle || '').toLowerCase();
            let n = 0;
            const articles = document.querySelectorAll('article[data-testid="tweet"]');
            for (let i = 0; i < articles.length; i++) {
                const a = articles[i];
                const h = this.authorFromArticle(a);
                if (!h || h.toLowerCase() !== key) continue;
                if (this.hideArticle(a, h, reason)) n++;
            }
            if (n) this.refreshStats();
            return n;
        },

        unhideAll() {
            const nodes = document.querySelectorAll('[data-tem-geo-hidden="1"]');
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                el.removeAttribute('data-tem-geo-hidden');
                el.removeAttribute('data-tem-geo-handle');
                el.removeAttribute('data-tem-geo-reason');
                el.style.removeProperty('display');
            }
            this.log('Unhid ' + nodes.length + ' soft-hidden node(s)');
            this.setNow('Unhid ' + nodes.length + ' post(s). Matched handles stay cached until Clear session.');
        },

        /**
         * Extract author handles from visible tweets / UserCells; re-apply soft hides.
         */
        scanDom() {
            const handles = new Set();
            const soft = Core.store.get('geoSoftHide', true);

            const articles = document.querySelectorAll('article[data-testid="tweet"]');
            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];
                const h = this.authorFromArticle(article);
                if (!h) continue;
                const key = h.toLowerCase();
                if (soft && this.matchedHandles.has(key)) {
                    this.hideArticle(article, h, 'cached match');
                }
                handles.add(h);
            }

            // Who-to-follow / sidebar cells
            document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
                const h = Follow.getUsername(cell);
                if (h && h !== 'unknown') handles.add(h);
            });

            for (const h of handles) {
                const key = h.toLowerCase();
                if (this.seen.has(key)) continue;
                if (Core.username && key === Core.username.toLowerCase()) continue;
                this.seen.add(key);
                this.queue.push(h);
            }
            this.refreshStats();
        },

        async _pump() {
            if (this.processing) return;
            this.processing = true;
            try {
                while (this.watching) {
                    if (!this.queue.length) {
                        await Core.sleep(400);
                        continue;
                    }
                    const handle = this.queue.shift();
                    await this.evaluateHandle(handle);
                    await Core.sleep(this.delayMs + Core.rand(0, 350));
                }
            } finally {
                this.processing = false;
            }
        },

        matchRegion(profile) {
            const needles = Core.store.get('geoNeedles', this.defaultNeedles).map(n => String(n).toLowerCase());
            const useBio = Core.store.get('geoUseBio', false);
            const location = (profile.location || '').toLowerCase();
            const bio = useBio ? (profile.description || '').toLowerCase() : '';
            const hay = location + (useBio ? '\n' + bio : '');

            for (const n of needles) {
                if (!n) continue;
                if (hay.includes(n.toLowerCase())) {
                    return { match: true, reason: `needle "${n}" in ${location.includes(n.toLowerCase()) ? 'location' : 'bio'}` };
                }
            }

            // Optional script signal: Devanagari in location (common for India/Nepal)
            if (/[\u0900-\u097F]/.test(profile.location || '')) {
                return { match: true, reason: 'Devanagari script in location' };
            }
            return { match: false, reason: null };
        },

        async evaluateHandle(handle) {
            const key = handle.toLowerCase();
            const wl = new Set((Core.store.get('geoWhitelist', []) || []).map(h => String(h).replace(/^@/, '').toLowerCase()));
            if (wl.has(key)) {
                this.log('Skip whitelist', { handle });
                return;
            }

            this.setNow('Checking @' + handle);
            let profile = this.profileCache[key];
            if (!profile) {
                const fetched = await Core.fetchUserByScreenName(handle);
                if (!fetched) {
                    this.log('Lookup failed', { handle });
                    return;
                }
                profile = fetched;
                this.profileCache[key] = profile;
            }

            this.scannedThisSession++;
            this.refreshStats();

            const { match, reason } = this.matchRegion(profile);
            if (!match) {
                this.setNow('@' + handle + ' — no match (' + (profile.location || 'empty loc') + ')');
                return;
            }

            this.matchedThisSession++;
            this.matchedHandles.add(key);
            this.refreshStats();
            this.log('MATCH', { handle, reason, location: profile.location });

            // Soft hide: client-side only (works even when live-block is disabled)
            if (Core.store.get('geoSoftHide', true)) {
                const n = this.hideArticlesForHandle(handle, reason);
                this.setNow('Soft-hid @' + handle + (n ? ' (' + n + ' post(s))' : '') + ' — ' + reason);
                this.log('SOFT-HIDE', { handle, reason, posts: n });
            }

            const dry = Core.store.get('geoDryRun', true);
            if (dry) {
                if (!Core.store.get('geoSoftHide', true)) {
                    this.setNow('Match @' + handle + ' (no hide, no block) — ' + reason);
                }
                return;
            }

            this.setNow('Blocking @' + handle + '…');
            const ok = await Core.blockUser(profile.id || handle);
            if (ok) {
                this.blockedThisSession++;
                this.refreshStats();
                this.log('BLOCKED', { handle, reason, location: profile.location });
                const hist = Core.store.get('geoBlockHistory', []);
                hist.push({ at: new Date().toISOString(), handle, reason, location: profile.location });
                Core.store.set('geoBlockHistory', hist.slice(-1000));
            } else {
                this.log('Block failed', { handle });
            }
        },

        exportLog() {
            const payload = {
                at: new Date().toISOString(),
                scanned: this.scannedThisSession,
                matched: this.matchedThisSession,
                hidden: this.hiddenThisSession,
                blocked: this.blockedThisSession,
                matchedHandles: [...this.matchedHandles],
                lines: this.logLines,
                history: Core.store.get('geoBlockHistory', [])
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'tem-geoguard-log.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
    };
