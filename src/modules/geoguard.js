/**
 * @module geoguard
 * @description Timeline account watcher + region-based auto-block (self-reported location).
 * @see docs/modules/geoguard.md
 */
    const GeoGuard = {
        firstShow: true,
        watching: false,
        observer: null,
        queue: [],
        processing: false,
        seen: new Set(),       // handles already evaluated this session
        blockedThisSession: 0,
        matchedThisSession: 0,
        scannedThisSession: 0,
        logLines: [],
        profileCache: {},      // handle -> { location, description, match, reason }
        delayMs: 1100,

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
            '🇮🇳', 'in 🇮🇳',
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
            const autoStart = Core.store.get('geoAutoStart', false);
            const useBio = Core.store.get('geoUseBio', false);

            pane.innerHTML = `
              <div class="tem-warn-box">
                Matches <strong>self-reported</strong> profile location (and optional bio) text only —
                not IP, passport, or ethnicity. Expect false positives/negatives.
                Auto-block is against X ToS. Prefer <strong>dry-run</strong> first.
              </div>

              <div class="tem-section">
                <h4>Timeline Geo Guard</h4>
                <p>Watches Home (and any timeline with tweets), looks up authors, and blocks or logs accounts matching your region needles (default: India + South Asia).</p>
                <div class="tem-stats">
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-scanned">0</div><div class="tem-stat-l">Scanned</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-matched">0</div><div class="tem-stat-l">Matched</div></div>
                  <div class="tem-stat"><div class="tem-stat-v" id="tem-g-blocked">0</div><div class="tem-stat-l">Blocked</div></div>
                </div>
                <label class="tem-check"><input type="checkbox" id="tem-g-dry" ${dryRun ? 'checked' : ''}> Dry-run only (log matches, do not block)</label>
                <label class="tem-check"><input type="checkbox" id="tem-g-bio" ${useBio ? 'checked' : ''}> Also match bio / description text</label>
                <label class="tem-check"><input type="checkbox" id="tem-g-autostart" ${autoStart ? 'checked' : ''}> Auto-start watch when script loads</label>
                <div class="tem-btns">
                  <button class="tem-btn tem-btn-primary" id="tem-g-start" type="button">Start watching timeline</button>
                  <button class="tem-btn tem-btn-ghost" id="tem-g-stop" type="button" disabled>Stop</button>
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
                <h4>Whitelist (never block)</h4>
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
            UI.el('tem-g-dry').onchange = () => Core.store.set('geoDryRun', UI.el('tem-g-dry').checked);
            UI.el('tem-g-bio').onchange = () => Core.store.set('geoUseBio', UI.el('tem-g-bio').checked);
            UI.el('tem-g-autostart').onchange = () => Core.store.set('geoAutoStart', UI.el('tem-g-autostart').checked);
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
                this.logLines = [];
                this.blockedThisSession = 0;
                this.matchedThisSession = 0;
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
            const b = UI.el('tem-g-blocked');
            if (s) s.textContent = String(this.scannedThisSession);
            if (m) m.textContent = String(this.matchedThisSession);
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
            this.setStatus('run', 'Watching timeline…');
            this.log('Watch started' + (Core.store.get('geoDryRun', true) ? ' (dry-run)' : ' (LIVE BLOCK)'));

            // Seed current DOM
            this.scanDom();

            this.observer = new MutationObserver(() => {
                if (!this.watching) return;
                this.scanDom();
            });
            this.observer.observe(document.body, { childList: true, subtree: true });
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

        _setWatchUi(on) {
            const start = UI.el('tem-g-start');
            const stop = UI.el('tem-g-stop');
            if (start) start.disabled = on;
            if (stop) stop.disabled = !on;
        },

        /**
         * Extract author handles from visible tweets / UserCells.
         */
        scanDom() {
            const handles = new Set();

            // Tweet articles
            document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
                // Primary author link in User-Name
                const nameBlock = article.querySelector('[data-testid="User-Name"]');
                if (nameBlock) {
                    const links = nameBlock.querySelectorAll('a[href^="/"]');
                    for (const a of links) {
                        const href = a.getAttribute('href') || '';
                        const m = href.match(/^\/([A-Za-z0-9_]{1,15})(?:\/|$|\?)/);
                        if (m && !/^(home|explore|search|i|settings|messages|notifications|compose)$/i.test(m[1])) {
                            handles.add(m[1]);
                            break;
                        }
                    }
                }
            });

            // Who-to-follow / sidebar cells (optional coverage)
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
            this.refreshStats();
            this.log('MATCH', { handle, reason, location: profile.location });

            const dry = Core.store.get('geoDryRun', true);
            if (dry) {
                this.setNow('DRY-RUN match @' + handle + ' — ' + reason);
                return;
            }

            this.setNow('Blocking @' + handle + '…');
            const ok = await Core.blockUser(profile.id || handle);
            if (ok) {
                this.blockedThisSession++;
                this.refreshStats();
                this.log('BLOCKED', { handle, reason, location: profile.location });
                // Persist block history
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
                blocked: this.blockedThisSession,
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
