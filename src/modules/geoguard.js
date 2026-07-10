/**
 * @module geoguard
 * @description Timeline watcher: soft region hide + optional auto-block (self-reported location).
 * Persistent exportable match DB + optional sync to Indian-Account-Tracker (token never leaves browser).
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
        // Local match database (localStorage tem:geoDb) — exportable, uncapped
        dbSchemaVersion: 1,

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
            const listUrl = Core.store.get('geoListUrl', '');
            const syncRepo = Core.store.get('geoSyncRepo', '');
            const syncPath = Core.store.get('geoSyncPath', 'data/accounts.json');
            const syncBranch = Core.store.get('geoSyncBranch', 'main');
            const syncSource = Core.store.get('geoSyncSource', 'tem');
            // Sync is OFF by default — user must opt in
            const syncEnabled = Core.store.get('geoSyncEnabled', false);

            pane.innerHTML = `
              <div class="tem-warn-box">
                Matches <strong>self-reported</strong> profile location (and optional bio) text only —
                not IP, passport, or ethnicity. Expect false positives/negatives.
                Prefer <strong>soft hide</strong> (client-side) over live block (ToS risk).
              </div>

              <div class="tem-section">
                <h4>Timeline Geo Guard</h4>
                <p>Looks up authors on the timeline. Matching accounts can be <strong>soft-hidden</strong> (DOM only) and/or blocked.</p>
                <div class="tem-stats tem-stats-4">
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
                  <button class="tem-btn tem-btn-primary" id="tem-g-start" type="button">Start watching</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-stop" type="button" disabled>Stop</button>
                </div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-unhide" type="button">Unhide soft-hidden</button>
                </div>
                <div class="tem-status idle" id="tem-g-status">Idle</div>
                <div class="tem-now" id="tem-g-now" style="display:none"></div>
              </div>

              <div class="tem-section">
                <h4>Match database</h4>
                <p>Persistent list of matched accounts in this browser. Export for backup or to merge into <strong>Indian-Account-Tracker</strong>.</p>
                <div class="tem-stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-db-n">0</div><div class="tem-stat-l">DB accounts</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-db-upd">–</div><div class="tem-stat-l">DB updated</div></div>
                </div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-primary" id="tem-g-db-export" type="button">Export full DB</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-db-export-pub" type="button">Export public</button>
                </div>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-db-export-csv" type="button">Export CSV</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-db-import" type="button">Import / merge</button>
                </div>
                <input type="file" id="tem-g-db-file" accept="application/json,.json" style="display:none">
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-danger" id="tem-g-db-clear" type="button">Clear local DB</button>
                </div>
                <p class="tem-note">Public export strips location/bio and never includes tokens or your session. Safe to share for multi-install merge.</p>
              </div>

              <div class="tem-section">
                <h4>List host &amp; sync</h4>
                <p>Optional remote list pull/push. <strong>Disabled by default</strong> — enable only if you want to sync.</p>
                <label class="tem-check"><input type="checkbox" id="tem-g-sync-enabled" ${syncEnabled ? 'checked' : ''}> Enable list sync (off by default)</label>
                <label class="tem-label" for="tem-g-list-url">Public list URL (pull)</label>
                <input id="tem-g-list-url" class="tem-input" type="url" value="${Core.escapeHtml(listUrl)}" placeholder="https://raw.githubusercontent.com/…/accounts.json" ${syncEnabled ? '' : 'disabled'}>
                <label class="tem-label" for="tem-g-sync-source">Source tag (this install)</label>
                <input id="tem-g-sync-source" class="tem-input" type="text" value="${Core.escapeHtml(syncSource)}" placeholder="tem-home" ${syncEnabled ? '' : 'disabled'}>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-primary" id="tem-g-sync-pull" type="button" ${syncEnabled ? '' : 'disabled'}>Pull &amp; merge</button>
                </div>

                <h4 class="tem-subhead">GitHub push (browser login)</h4>
                <label class="tem-label" for="tem-g-sync-repo">Repo (owner/name)</label>
                <input id="tem-g-sync-repo" class="tem-input" type="text" value="${Core.escapeHtml(syncRepo)}" placeholder="yourname/Indian-Account-Tracker" ${syncEnabled ? '' : 'disabled'}>
                <label class="tem-label" for="tem-g-sync-path">File path</label>
                <input id="tem-g-sync-path" class="tem-input" type="text" value="${Core.escapeHtml(syncPath)}" placeholder="data/accounts.json" ${syncEnabled ? '' : 'disabled'}>
                <label class="tem-label" for="tem-g-sync-branch">Branch</label>
                <input id="tem-g-sync-branch" class="tem-input" type="text" value="${Core.escapeHtml(syncBranch)}" placeholder="main" ${syncEnabled ? '' : 'disabled'}>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-ghost" id="tem-g-sync-save" type="button">Save settings</button>
                  <button class="tem-btn tem-btn-primary" id="tem-g-sync-push" type="button" ${syncEnabled ? '' : 'disabled'}>Push merge</button>
                </div>
                <div class="tem-status idle" id="tem-g-sync-status">${syncEnabled ? 'Sync enabled · pull/push ready' : 'Sync disabled (default)'}</div>
                <p class="tem-note">Push needs Violentmonkey/Tampermonkey and a github.com login with write access. No PAT stored.</p>
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
                  <button class="tem-btn tem-btn-ghost" id="tem-g-export" type="button">Export session log</button>
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

            UI.el('tem-g-db-export').onclick = () => this.exportDb({ publicOnly: false });
            UI.el('tem-g-db-export-pub').onclick = () => this.exportDb({ publicOnly: true });
            UI.el('tem-g-db-export-csv').onclick = () => this.exportDbCsv();
            UI.el('tem-g-db-import').onclick = () => UI.el('tem-g-db-file').click();
            UI.el('tem-g-db-file').onchange = (e) => this.importDbFile(e.target.files && e.target.files[0]);
            UI.el('tem-g-db-clear').onclick = () => {
                if (!confirm('Clear the entire local match database? Remote hosts are unchanged until you push or re-publish.')) return;
                this.clearDb();
            };

            UI.el('tem-g-sync-enabled').onchange = () => {
                const on = UI.el('tem-g-sync-enabled').checked;
                Core.store.set('geoSyncEnabled', on);
                this._setSyncControlsEnabled(on);
                this.setSyncStatus('idle', on ? 'Sync enabled · pull/push ready' : 'Sync disabled (default)');
            };
            UI.el('tem-g-sync-save').onclick = () => this.saveSyncSettings();
            UI.el('tem-g-sync-pull').onclick = () => this.syncPullMerge();
            UI.el('tem-g-sync-push').onclick = () => this.syncPushMerge();

            this._setSyncControlsEnabled(syncEnabled);
            this.refreshStats();
            this.refreshDbStats();
            this._paintLog();
            if (this.watching) this._setWatchUi(true);
        },

        _setSyncControlsEnabled(on) {
            const ids = [
                'tem-g-list-url', 'tem-g-sync-source', 'tem-g-sync-pull',
                'tem-g-sync-repo', 'tem-g-sync-path', 'tem-g-sync-branch', 'tem-g-sync-push'
            ];
            for (let i = 0; i < ids.length; i++) {
                const el = UI.el(ids[i]);
                if (el) el.disabled = !on;
            }
            // Save remains available so enable flag + fields can be persisted
            const save = UI.el('tem-g-sync-save');
            if (save) save.disabled = false;
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
            const db = soft ? this.loadDb() : null;

            const articles = document.querySelectorAll('article[data-testid="tweet"]');
            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];
                const h = this.authorFromArticle(article);
                if (!h) continue;
                const key = h.toLowerCase();
                // Session match or persistent DB hit → soft-hide without re-queue
                if (soft && (this.matchedHandles.has(key) || (db && db.accounts[key]))) {
                    if (db && db.accounts[key]) this.matchedHandles.add(key);
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
                    const inLoc = location.includes(n.toLowerCase());
                    return {
                        match: true,
                        reason: 'needle "' + n + '" in ' + (inLoc ? 'location' : 'bio'),
                        reasonCode: inLoc ? 'needle_location' : 'needle_bio',
                        reasonNeedle: n
                    };
                }
            }

            // Optional script signal: Devanagari in location (common for India/Nepal)
            if (/[\u0900-\u097F]/.test(profile.location || '')) {
                return {
                    match: true,
                    reason: 'Devanagari script in location',
                    reasonCode: 'devanagari',
                    reasonNeedle: null
                };
            }
            return { match: false, reason: null, reasonCode: null, reasonNeedle: null };
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

            const { match, reason, reasonCode, reasonNeedle } = this.matchRegion(profile);
            if (!match) {
                this.setNow('@' + handle + ' — no match (' + (profile.location || 'empty loc') + ')');
                return;
            }

            this.matchedThisSession++;
            this.matchedHandles.add(key);
            this.refreshStats();
            this.log('MATCH', { handle, reason, location: profile.location });
            this.dbUpsertMatch({
                handle: profile.screenName || handle,
                userId: profile.id || null,
                reason,
                reasonCode,
                reasonNeedle,
                location: profile.location || '',
                blocked: false
            });

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
                this.dbUpsertMatch({
                    handle: profile.screenName || handle,
                    userId: profile.id || null,
                    reason,
                    reasonCode,
                    reasonNeedle,
                    location: profile.location || '',
                    blocked: true
                });
                const hist = Core.store.get('geoBlockHistory', []);
                hist.push({ at: new Date().toISOString(), handle, reason, location: profile.location });
                Core.store.set('geoBlockHistory', hist.slice(-1000));
            } else {
                this.log('Block failed', { handle });
            }
        },

        // ---- Persistent match database ---------------------------------------

        _emptyDb() {
            return {
                schemaVersion: this.dbSchemaVersion,
                updatedAt: null,
                accounts: {}
            };
        },

        loadDb() {
            const db = Core.store.get('geoDb', null);
            if (!db || typeof db !== 'object' || !db.accounts || typeof db.accounts !== 'object') {
                return this._emptyDb();
            }
            return db;
        },

        saveDb(db) {
            db.updatedAt = new Date().toISOString();
            db.schemaVersion = this.dbSchemaVersion;
            try {
                Core.store.set('geoDb', db);
            } catch (e) {
                console.warn('[TEM GeoGuard] geoDb save failed (storage full?)', e);
                this.log('DB save failed — localStorage may be full');
            }
            this.refreshDbStats();
            return db;
        },

        dbUpsertMatch(rec) {
            const handle = String(rec.handle || '').replace(/^@/, '').trim();
            if (!handle) return;
            const key = handle.toLowerCase();
            const db = this.loadDb();
            const now = new Date().toISOString();
            const prev = db.accounts[key];
            const source = String(Core.store.get('geoSyncSource', 'tem') || 'tem').slice(0, 64);
            const sources = new Set((prev && prev.sources) || []);
            sources.add(source);
            db.accounts[key] = {
                handle: handle,
                userId: rec.userId != null ? String(rec.userId) : (prev && prev.userId) || null,
                reasonCode: rec.reasonCode || (prev && prev.reasonCode) || 'unknown',
                reasonNeedle: rec.reasonNeedle != null ? rec.reasonNeedle : (prev && prev.reasonNeedle) || null,
                reason: rec.reason || (prev && prev.reason) || '',
                // Local-only enrichment (stripped from public/tracker export)
                location: rec.location != null ? String(rec.location).slice(0, 200) : (prev && prev.location) || '',
                firstSeen: (prev && prev.firstSeen) || now,
                lastSeen: now,
                hits: ((prev && prev.hits) || 0) + 1,
                blocked: !!(rec.blocked || (prev && prev.blocked)),
                sources: [...sources].slice(0, 32)
            };
            this.saveDb(db);
        },

        /**
         * Merge foreign account records into local DB (union by handle / userId).
         * @returns {{ added: number, updated: number, total: number }}
         */
        dbMergeAccounts(list, opts) {
            opts = opts || {};
            const db = this.loadDb();
            let added = 0;
            let updated = 0;
            const rows = Array.isArray(list) ? list : [];
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                if (!r) continue;
                const handle = String(r.handle || r.screenName || r.screen_name || '')
                    .replace(/^@/, '').trim();
                if (!handle) continue;
                const key = handle.toLowerCase();
                const prev = db.accounts[key];
                const sources = new Set((prev && prev.sources) || []);
                const incomingSources = r.sources || (r.source ? [r.source] : []);
                for (let s = 0; s < incomingSources.length; s++) {
                    if (incomingSources[s]) sources.add(String(incomingSources[s]).slice(0, 64));
                }
                if (opts.sourceTag) sources.add(String(opts.sourceTag).slice(0, 64));

                const next = {
                    handle: handle,
                    userId: r.userId != null ? String(r.userId) : (r.id != null ? String(r.id) : (prev && prev.userId) || null),
                    reasonCode: r.reasonCode || (prev && prev.reasonCode) || 'unknown',
                    reasonNeedle: r.reasonNeedle != null ? r.reasonNeedle : (prev && prev.reasonNeedle) || null,
                    reason: r.reason || (prev && prev.reason) || '',
                    location: opts.publicOnly
                        ? ((prev && prev.location) || '')
                        : (r.location != null ? String(r.location).slice(0, 200) : (prev && prev.location) || ''),
                    firstSeen: this._minIso((prev && prev.firstSeen), r.firstSeen) || new Date().toISOString(),
                    lastSeen: this._maxIso((prev && prev.lastSeen), r.lastSeen) || new Date().toISOString(),
                    hits: Math.max((prev && prev.hits) || 0, r.hits || 0) + (opts.countAsHit ? 1 : 0),
                    blocked: !!(r.blocked || (prev && prev.blocked)),
                    sources: [...sources].slice(0, 32)
                };
                if (!prev) added++;
                else updated++;
                db.accounts[key] = next;
            }
            this.saveDb(db);
            return { added, updated, total: Object.keys(db.accounts).length };
        },

        _minIso(a, b) {
            if (!a) return b || null;
            if (!b) return a;
            return a < b ? a : b;
        },

        _maxIso(a, b) {
            if (!a) return b || null;
            if (!b) return a;
            return a > b ? a : b;
        },

        /**
         * Serialize DB for export.
         * publicOnly: strip location, reason free-text, never include secrets/operator.
         */
        serializeDb(opts) {
            opts = opts || {};
            const publicOnly = !!opts.publicOnly;
            const db = this.loadDb();
            const accounts = Object.keys(db.accounts).map(k => db.accounts[k]).sort((a, b) =>
                String(a.handle).localeCompare(String(b.handle))
            );
            const pubAccounts = accounts.map(a => {
                if (publicOnly) {
                    return {
                        handle: a.handle,
                        userId: a.userId || null,
                        reasonCode: a.reasonCode || 'unknown',
                        reasonNeedle: a.reasonNeedle || null,
                        firstSeen: a.firstSeen || null,
                        lastSeen: a.lastSeen || null,
                        hits: a.hits || 1,
                        sources: a.sources || []
                    };
                }
                return {
                    handle: a.handle,
                    userId: a.userId || null,
                    reasonCode: a.reasonCode || 'unknown',
                    reasonNeedle: a.reasonNeedle || null,
                    reason: a.reason || '',
                    location: a.location || '',
                    firstSeen: a.firstSeen || null,
                    lastSeen: a.lastSeen || null,
                    hits: a.hits || 1,
                    blocked: !!a.blocked,
                    sources: a.sources || []
                };
            });
            return {
                schemaVersion: this.dbSchemaVersion,
                kind: publicOnly ? 'indian-account-tracker-public' : 'tem-geodb-full',
                updatedAt: db.updatedAt || new Date().toISOString(),
                count: pubAccounts.length,
                // Explicitly no tokens, cookies, operator identity, bios, or raw API payloads
                accounts: pubAccounts
            };
        },

        exportDb(opts) {
            const payload = this.serializeDb(opts);
            const name = (opts && opts.publicOnly)
                ? 'indian-account-tracker-export.json'
                : 'tem-geodb-full.json';
            this._downloadJson(name, payload);
            this.log('Exported DB (' + payload.count + ' accounts' +
                ((opts && opts.publicOnly) ? ', public' : ', full') + ')');
        },

        exportDbCsv() {
            const payload = this.serializeDb({ publicOnly: false });
            const header = 'handle,userId,reasonCode,reasonNeedle,location,firstSeen,lastSeen,hits,blocked,sources';
            const lines = payload.accounts.map(a => [
                a.handle,
                a.userId || '',
                a.reasonCode || '',
                JSON.stringify(a.reasonNeedle || ''),
                JSON.stringify(a.location || ''),
                a.firstSeen || '',
                a.lastSeen || '',
                a.hits || 0,
                a.blocked ? 1 : 0,
                JSON.stringify((a.sources || []).join('|'))
            ].join(','));
            this._downloadText('tem-geodb.csv', [header, ...lines].join('\n'), 'text/csv');
        },

        async importDbFile(file) {
            if (!file) return;
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const list = Array.isArray(json) ? json
                    : (json.accounts
                        ? (Array.isArray(json.accounts) ? json.accounts : Object.values(json.accounts))
                        : []);
                const r = this.dbMergeAccounts(list, { sourceTag: 'import' });
                this.log('Imported / merged DB', r);
                this.setNow('DB merge: +' + r.added + ' new, ' + r.updated + ' updated, ' + r.total + ' total');
                this.setStatus('idle', 'DB import done (' + r.total + ')');
            } catch (e) {
                console.warn('[TEM GeoGuard] import failed', e);
                this.setStatus('stop', 'DB import failed');
                alert('Could not import JSON: ' + (e && e.message ? e.message : e));
            }
        },

        clearDb() {
            Core.store.set('geoDb', this._emptyDb());
            this.refreshDbStats();
            this.log('Local match DB cleared');
            this.setNow('Local DB cleared');
        },

        refreshDbStats() {
            const db = this.loadDb();
            const n = UI.el('tem-g-db-n');
            const u = UI.el('tem-g-db-upd');
            if (n) n.textContent = String(Object.keys(db.accounts || {}).length);
            if (u) {
                if (!db.updatedAt) u.textContent = '–';
                else {
                    try {
                        u.textContent = new Date(db.updatedAt).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric'
                        });
                    } catch (_) { u.textContent = '–'; }
                }
            }
        },

        // ---- List host sync (no hardcoded secrets; GitHub push = browser session) ----

        saveSyncSettings() {
            const enabled = !!(UI.el('tem-g-sync-enabled') && UI.el('tem-g-sync-enabled').checked);
            const listUrl = (UI.el('tem-g-list-url') && UI.el('tem-g-list-url').value || '').trim();
            const repo = (UI.el('tem-g-sync-repo') && UI.el('tem-g-sync-repo').value || '').trim();
            const path = (UI.el('tem-g-sync-path') && UI.el('tem-g-sync-path').value || '').trim();
            const branch = (UI.el('tem-g-sync-branch') && UI.el('tem-g-sync-branch').value || 'main').trim();
            const source = (UI.el('tem-g-sync-source') && UI.el('tem-g-sync-source').value || 'tem').trim();

            if (listUrl && !/^https:\/\//i.test(listUrl)) {
                this.setSyncStatus('stop', 'List URL must be https://');
                return;
            }

            Core.store.set('geoSyncEnabled', enabled);
            Core.store.set('geoListUrl', listUrl);
            Core.store.set('geoSyncRepo', repo);
            Core.store.set('geoSyncPath', path || 'data/accounts.json');
            Core.store.set('geoSyncBranch', branch || 'main');
            Core.store.set('geoSyncSource', source || 'tem');
            // Drop any legacy stored PATs from older versions
            try { localStorage.removeItem('tem:geoWriteSecret'); } catch (_) { }
            try { localStorage.removeItem('tem:geoSyncToken'); } catch (_) { }

            this._setSyncControlsEnabled(enabled);
            if (!enabled) {
                this.setSyncStatus('idle', 'Saved · sync disabled (default)');
                return;
            }
            const bits = [];
            if (listUrl) bits.push('pull URL');
            if (repo) bits.push('repo ' + repo);
            this.setSyncStatus('idle', 'Saved · sync on' + (bits.length ? ' · ' + bits.join(' · ') : ''));
        },

        _syncIsEnabled() {
            return !!Core.store.get('geoSyncEnabled', false);
        },

        setSyncStatus(kind, text) {
            const el = UI.el('tem-g-sync-status');
            if (!el) return;
            el.className = 'tem-status ' + kind;
            el.textContent = text;
        },

        /**
         * Cross-origin request with browser cookies (GitHub session).
         * Uses GM_xmlhttpRequest when available (userscript); never embeds secrets.
         */
        _gmRequest(opts) {
            const method = (opts.method || 'GET').toUpperCase();
            const url = opts.url;
            const headers = opts.headers || {};
            const data = opts.data;
            const gm = (typeof GM_xmlhttpRequest === 'function')
                ? GM_xmlhttpRequest
                : (typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest.bind(GM) : null);

            if (gm) {
                return new Promise((resolve, reject) => {
                    gm({
                        method: method,
                        url: url,
                        headers: headers,
                        data: data,
                        anonymous: false,
                        timeout: opts.timeout || 45000,
                        onload: (res) => {
                            resolve({
                                status: res.status,
                                ok: res.status >= 200 && res.status < 300,
                                text: res.responseText || '',
                                finalUrl: res.finalUrl || url
                            });
                        },
                        onerror: () => reject(new Error('Network error requesting ' + url)),
                        ontimeout: () => reject(new Error('Timeout requesting ' + url))
                    });
                });
            }

            // Console paste fallback (no cookie cross-origin to github.com)
            return fetch(url, {
                method: method,
                headers: headers,
                body: data,
                credentials: 'include',
                mode: 'cors'
            }).then(async (res) => ({
                status: res.status,
                ok: res.ok,
                text: await res.text(),
                finalUrl: res.url
            }));
        },

        async _fetchPublicJson(url) {
            if (!url || !/^https:\/\//i.test(url)) {
                throw new Error('Need an https:// public list URL');
            }
            let text = '';
            try {
                const res = await this._gmRequest({
                    method: 'GET',
                    url: url,
                    headers: { Accept: 'application/json,text/plain,*/*' }
                });
                if (!res.ok) throw new Error('GET ' + res.status);
                text = res.text;
            } catch (_) {
                const res = await fetch(url, {
                    method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-cache',
                    headers: { Accept: 'application/json,text/plain,*/*' }
                });
                if (!res.ok) throw new Error('GET ' + res.status + ' from list URL');
                text = await res.text();
            }
            if (/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(text)) {
                throw new Error('Remote JSON looks like it contains a token — refusing to merge');
            }
            try {
                return JSON.parse(text);
            } catch (_) {
                throw new Error('List URL did not return JSON');
            }
        },

        _accountsFromTrackerJson(json) {
            if (!json) return [];
            if (Array.isArray(json)) return json;
            if (Array.isArray(json.accounts)) return json.accounts;
            if (json.accounts && typeof json.accounts === 'object') return Object.values(json.accounts);
            return [];
        },

        buildTrackerPayload(mergedList) {
            const accounts = (mergedList || []).map(a => ({
                handle: a.handle,
                userId: a.userId || null,
                reasonCode: a.reasonCode || 'unknown',
                reasonNeedle: a.reasonNeedle || null,
                firstSeen: a.firstSeen || null,
                lastSeen: a.lastSeen || null,
                hits: a.hits || 1,
                sources: a.sources || []
            })).sort((a, b) => String(a.handle).localeCompare(String(b.handle)));
            return {
                schemaVersion: this.dbSchemaVersion,
                kind: 'indian-account-tracker-public',
                updatedAt: new Date().toISOString(),
                count: accounts.length,
                accounts: accounts
            };
        },

        _unionPublicLists(remoteList, localPubAccounts) {
            const byKey = {};
            for (const a of remoteList || []) {
                const h = String(a.handle || '').replace(/^@/, '').toLowerCase();
                if (h) byKey[h] = a;
            }
            for (const a of localPubAccounts || []) {
                const h = String(a.handle || '').toLowerCase();
                if (!h) continue;
                const prev = byKey[h];
                if (!prev) {
                    byKey[h] = a;
                    continue;
                }
                const sources = new Set([...(prev.sources || []), ...(a.sources || [])]);
                byKey[h] = {
                    handle: a.handle || prev.handle,
                    userId: a.userId || prev.userId || null,
                    reasonCode: a.reasonCode || prev.reasonCode || 'unknown',
                    reasonNeedle: a.reasonNeedle != null ? a.reasonNeedle : prev.reasonNeedle || null,
                    firstSeen: this._minIso(prev.firstSeen, a.firstSeen),
                    lastSeen: this._maxIso(prev.lastSeen, a.lastSeen),
                    hits: Math.max(prev.hits || 0, a.hits || 0),
                    sources: [...sources].slice(0, 32)
                };
            }
            return this.buildTrackerPayload(Object.values(byKey));
        },

        async syncPullMerge() {
            if (!this._syncIsEnabled()) {
                this.setSyncStatus('pause', 'Sync is disabled — enable the checkbox first');
                return;
            }
            const listUrl = Core.store.get('geoListUrl', '');
            if (!listUrl) {
                this.setSyncStatus('stop', 'Set a public list URL and Save');
                return;
            }
            this.setSyncStatus('run', 'Pulling public list…');
            try {
                const json = await this._fetchPublicJson(listUrl);
                const list = this._accountsFromTrackerJson(json);
                const r = this.dbMergeAccounts(list, {
                    sourceTag: 'pull',
                    publicOnly: true
                });
                this.setSyncStatus('idle', 'Pulled & merged: +' + r.added + ' new, ' + r.total + ' total');
                this.log('Sync pull OK', { added: r.added, total: r.total });
            } catch (e) {
                console.warn('[TEM GeoGuard] sync pull', e);
                this.setSyncStatus('stop', 'Pull failed: ' + (e && e.message ? e.message : e));
            }
        },

        /**
         * Commit public list via GitHub web session (cookies), no PAT.
         * Opens the file edit page, scrapes CSRF, POSTs tree-save.
         */
        async _ghSessionCommit(repo, branch, filePath, content, message) {
            const path = String(filePath || '').replace(/^\/+/, '');
            const editUrl = 'https://github.com/' + repo + '/edit/' + encodeURIComponent(branch) + '/' + path;
            const editRes = await this._gmRequest({
                method: 'GET',
                url: editUrl,
                headers: {
                    Accept: 'text/html',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const html = editRes.text || '';
            if (editRes.status === 404) {
                throw new Error('File or repo not found (create data/accounts.json on GitHub first)');
            }
            if (/\/login|Sign in to GitHub|password.*session/i.test(editRes.finalUrl + html) &&
                !/name="authenticity_token"/i.test(html)) {
                throw new Error('Not logged into GitHub in this browser — open github.com and sign in');
            }
            if (!editRes.ok && editRes.status !== 200) {
                throw new Error('GitHub edit page HTTP ' + editRes.status);
            }

            const csrf =
                (html.match(/name="authenticity_token"\s+value="([^"]+)"/i) || [])[1] ||
                (html.match(/name="authenticity_token"[^>]*value="([^"]+)"/i) || [])[1] ||
                (html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i) || [])[1];
            if (!csrf) {
                throw new Error('Could not read GitHub CSRF — log into github.com, then retry');
            }

            const parts = path.split('/');
            const filename = parts.pop() || 'accounts.json';
            const dir = parts.join('/');
            const saveUrl = 'https://github.com/' + repo + '/tree-save/' +
                encodeURIComponent(branch) + (dir ? '/' + dir : '');

            const form = new URLSearchParams();
            form.set('authenticity_token', csrf);
            form.set('message', message || ('chore: merge public accounts'));
            form.set('description', '');
            form.set('filename', filename);
            form.set('new_filename', filename);
            form.set('value', content);
            form.set('commit', '1');
            form.set('quick_pull', '0');

            const saveRes = await this._gmRequest({
                method: 'POST',
                url: saveUrl,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'text/html,application/xhtml+xml',
                    'X-Requested-With': 'XMLHttpRequest',
                    Referer: editUrl
                },
                data: form.toString()
            });

            if (saveRes.status === 302 || saveRes.ok || saveRes.status === 200 || saveRes.status === 201) {
                return true;
            }
            // GitHub sometimes returns 422/400 with HTML error
            if (/something went wrong|Unprocessable|not found/i.test(saveRes.text || '')) {
                throw new Error('GitHub rejected the commit (check write access on ' + repo + ')');
            }
            if (saveRes.status === 401 || saveRes.status === 403) {
                throw new Error('GitHub session lacks write access — log in as a collaborator');
            }
            // Soft success: redirected away from edit
            if (saveRes.finalUrl && /\/blob\/|\/commit\//.test(saveRes.finalUrl)) return true;
            if (saveRes.status >= 200 && saveRes.status < 400) return true;
            throw new Error('GitHub commit failed HTTP ' + saveRes.status);
        },

        async syncPushMerge() {
            if (!this._syncIsEnabled()) {
                this.setSyncStatus('pause', 'Sync is disabled — enable the checkbox first');
                return;
            }
            const repo = Core.store.get('geoSyncRepo', '');
            const path = Core.store.get('geoSyncPath', 'data/accounts.json') || 'data/accounts.json';
            const branch = Core.store.get('geoSyncBranch', 'main') || 'main';

            if (!/^[^/]+\/[^/]+$/.test(repo)) {
                this.setSyncStatus('stop', 'Set GitHub repo as owner/name and Save');
                return;
            }

            const hasGm = typeof GM_xmlhttpRequest === 'function' ||
                (typeof GM !== 'undefined' && GM.xmlHttpRequest);
            if (!hasGm) {
                this.setSyncStatus('stop', 'Install as userscript (Violentmonkey) for GitHub session push');
                return;
            }

            this.setSyncStatus('run', 'Merging + pushing via GitHub login…');
            try {
                let remoteList = [];
                const listUrl = Core.store.get('geoListUrl', '');
                if (listUrl) {
                    try {
                        remoteList = this._accountsFromTrackerJson(await this._fetchPublicJson(listUrl));
                    } catch (e1) {
                        this.log('Push: public pull skipped', { err: String(e1 && e1.message || e1) });
                    }
                }

                // Also try raw github content (session-aware) as remote baseline
                try {
                    const rawUrl = 'https://raw.githubusercontent.com/' + repo + '/' +
                        encodeURIComponent(branch) + '/' + path.replace(/^\//, '');
                    const raw = await this._gmRequest({ method: 'GET', url: rawUrl });
                    if (raw.ok && raw.text) {
                        try {
                            remoteList = this._accountsFromTrackerJson(JSON.parse(raw.text));
                        } catch (_) { /* ignore */ }
                    }
                } catch (_) { /* ignore */ }

                this.dbMergeAccounts(remoteList, { sourceTag: 'remote', publicOnly: true });
                const localPub = this.serializeDb({ publicOnly: true });
                const payload = this._unionPublicLists(remoteList, localPub.accounts);
                const body = JSON.stringify(payload, null, 2) + '\n';
                const msg = 'chore: merge public accounts (' + payload.count + ')';

                await this._ghSessionCommit(repo, branch, path, body, msg);
                this.setSyncStatus('idle', 'Pushed ' + payload.count + ' → ' + repo);
                this.log('Sync push OK', { count: payload.count, repo: repo, via: 'browser-session' });
            } catch (e) {
                console.warn('[TEM GeoGuard] sync push', e);
                this.setSyncStatus('stop', 'Push failed: ' + (e && e.message ? e.message : e));
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
                history: Core.store.get('geoBlockHistory', []),
                // Session log export intentionally omits token and full geoDb (use Export DB)
                dbCount: Object.keys(this.loadDb().accounts || {}).length
            };
            this._downloadJson('tem-geoguard-session-log.json', payload);
        },

        _downloadJson(filename, obj) {
            this._downloadText(filename, JSON.stringify(obj, null, 2), 'application/json');
        },

        _downloadText(filename, text, mime) {
            const blob = new Blob([text], { type: mime });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
    };
