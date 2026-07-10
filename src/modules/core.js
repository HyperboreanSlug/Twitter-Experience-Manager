/**
 * @module core
 * @see docs/modules/core.md
 */
    const Core = {
        version: '1.2.3',
        product: 'Twitter Experience Manager',
        baseUrl: 'https://' + (typeof location !== 'undefined' ? location.hostname : 'x.com'),
        // Public X web client guest token (same string shipped in x.com frontend JS).
        // NOT a user password/PAT. Tracker sync never uses this. Prefer session cookies (ct0).
        authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        ct0: null,
        transaction_id: '',
        username: '',
        userId: null,
        // Twitter snowflake epoch as Number (avoid BigInt for max engine compat)
        snowflakeEpoch: 1288834974657,
        _queryIds: {},

        init() {
            try {
                this.ct0 = this.getCookie('ct0');
                this.updateTransactionId();
                this.refreshIdentity();
                this.installQuerySniffer();
            } catch (e) {
                try { console.error('[TEM] Core.init error', e); } catch (_) { }
            }
        },

        /**
         * Re-read logged-in account from cookies + nav UI.
         * Prefer stable twid userId; username from account switcher only (not profile page).
         * @returns {{ userId: string|null, username: string }}
         */
        refreshIdentity() {
            try {
                this.ct0 = this.getCookie('ct0') || this.ct0;
            } catch (_) { }
            const prevId = this.userId;
            this.userId = this.getUserId();
            const fromUi = this.getUsernameFromUI();
            if (fromUi) {
                this.username = fromUi;
            } else if (this.userId) {
                const mapped = this.store.get('accountMap:' + this.userId, null);
                if (mapped) this.username = String(mapped);
            }
            // Drop stale handle if cookie account changed and UI has not painted yet
            if (this.userId && prevId && this.userId !== prevId && !fromUi) {
                const mapped = this.store.get('accountMap:' + this.userId, null);
                this.username = mapped ? String(mapped) : '';
            }
            if (this.userId && this.username) {
                this.store.set('accountMap:' + this.userId, String(this.username).toLowerCase());
                this.store.set('lastAccount', {
                    userId: this.userId,
                    username: String(this.username).toLowerCase(),
                    at: Date.now()
                });
            }
            return {
                userId: this.userId,
                username: (this.username || '').toLowerCase()
            };
        },

        installQuerySniffer() {
            try {
                if (window.__temSniffer) return;
                if (typeof window.fetch !== 'function') return;
                window.__temSniffer = true;
                const self = this;
                const origFetch = window.fetch.bind(window);
                window.fetch = function (input) {
                    try {
                        const u = typeof input === 'string' ? input : (input && input.url) || '';
                        const m = u.match(/\/i\/api\/graphql\/([^/]+)\/([^/?]+)/);
                        if (m) self._queryIds[m[2]] = m[1];
                    } catch (_) { }
                    return origFetch.apply(null, arguments);
                };
            } catch (e) {
                try { console.warn('[TEM] query sniffer not installed', e); } catch (_) { }
            }
        },

        async resolveQueryId(operationName) {
            if (this._queryIds[operationName]) return this._queryIds[operationName];
            const rank = (u) => (/\bapi[.\-]/.test(u) ? 3 : 0) + (/\bmain[.\-]/.test(u) ? 2 : 0) + (/endpoint/i.test(u) ? 2 : 0);
            let urls = [];
            try { urls = performance.getEntriesByType('resource').map(r => r.name); } catch (_) { }
            document.querySelectorAll('script[src]').forEach(s => urls.push(s.src));
            urls = [...new Set(urls)].filter(n => /abs\.twimg\.com\/responsive-web\/client-web.*\.js(\?|$)/.test(n));
            urls.sort((a, b) => rank(b) - rank(a));
            for (const u of urls) {
                try {
                    const res = await fetch(u, { credentials: 'omit' });
                    if (!res.ok) continue;
                    const id = this._extractQueryId(await res.text(), operationName);
                    if (id) { this._queryIds[operationName] = id; return id; }
                } catch (_) { }
            }
            return this._queryIds[operationName] || null;
        },

        _extractQueryId(text, op) {
            const ID = '([a-zA-Z0-9_-]{10,})';
            const patterns = [
                new RegExp('queryId:"' + ID + '",operationName:"' + op + '"'),
                new RegExp('operationName:"' + op + '",queryId:"' + ID + '"'),
                new RegExp('"' + op + '"[\\s\\S]{0,240}?queryId:"' + ID + '"'),
                new RegExp('queryId:"' + ID + '"[\\s\\S]{0,240}?operationName:"' + op + '"')
            ];
            for (const re of patterns) { const m = text.match(re); if (m) return m[1]; }
            return null;
        },

        sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
        rand(min, max) { return min + Math.floor(Math.random() * (max - min)); },

        getCookie(name) {
            const m = `; ${document.cookie}`.match(`;\\s*${name}=([^;]+)`);
            return m ? m[1] : null;
        },

        getUserId() {
            const raw = this.getCookie('twid');
            if (!raw) return null;
            const dec = decodeURIComponent(raw);
            const m = dec.match(/\d+/);
            return m ? m[0] : null;
        },

        /**
         * Logged-in handle from nav account switcher only.
         * Avoids [data-testid="UserName"] / URL path (those are profile-under-view, not session).
         */
        getUsernameFromUI() {
            const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
            if (switcher) {
                const text = (switcher.textContent || '') + ' ' + (switcher.getAttribute('aria-label') || '');
                const m = text.match(/@([A-Za-z0-9_]{1,15})/);
                if (m) return m[1];
            }
            // Desktop sometimes nests the handle in a link inside the switcher region
            const nav = document.querySelector('header[role="banner"] a[href^="/"][data-testid="AppTabBar_Profile_Link"]') ||
                document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
            if (nav) {
                const href = nav.getAttribute('href') || '';
                const hm = href.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
                if (hm && !/^(home|explore|search|i|settings|messages|notifications|compose|login)$/i.test(hm[1])) {
                    return hm[1];
                }
            }
            return '';
        },

        updateTransactionId() {
            try {
                const arr = new Uint8Array(95);
                (window.crypto || crypto).getRandomValues(arr);
                let s = '';
                for (let i = 0; i < arr.length; i++) {
                    let x = (arr[i] / 255 * 61) | 0;
                    s += String.fromCharCode(x + (x > 9 ? (x > 35 ? 61 : 55) : 48));
                }
                this.transaction_id = s;
            } catch (_) {
                this.transaction_id = String(Date.now()) + Math.random().toString(36).slice(2);
            }
        },

        apiHeaders(contentType = 'application/json') {
            return {
                authorization: this.authorization,
                'content-type': contentType,
                'x-client-transaction-id': this.transaction_id,
                'x-csrf-token': this.ct0,
                'x-twitter-active-user': 'yes',
                'x-twitter-auth-type': 'OAuth2Session'
            };
        },

        store: {
            get(key, fallback) {
                try {
                    const v = localStorage.getItem('tem:' + key);
                    return v == null ? fallback : JSON.parse(v);
                } catch (_) { return fallback; }
            },
            set(key, val) {
                try { localStorage.setItem('tem:' + key, JSON.stringify(val)); } catch (_) { }
            }
        },

        parseCount(text) {
            if (text == null) return null;
            const m = String(text).replace(/,/g, '').match(/([\d.]+)\s*([KkMm])?/);
            if (!m) return null;
            let n = parseFloat(m[1]);
            if (/k/i.test(m[2])) n *= 1e3;
            else if (/m/i.test(m[2])) n *= 1e6;
            return Math.round(n);
        },

        escapeHtml(s) {
            return String(s).replace(/[&<>"']/g, c => (
                { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
            ));
        },

        waitForElem(selector, timeout = 8000) {
            const existing = document.querySelector(selector);
            if (existing) return Promise.resolve(existing);
            return new Promise(resolve => {
                let settled = false;
                const finish = (val) => {
                    if (settled) return;
                    settled = true;
                    observer.disconnect();
                    clearTimeout(timer);
                    resolve(val);
                };
                const observer = new MutationObserver(() => {
                    const el = document.querySelector(selector);
                    if (el) finish(el);
                });
                observer.observe(document.body, { subtree: true, childList: true });
                const timer = setTimeout(() => finish(null), timeout);
            });
        },

        userByScreenNameFeatures() {
            return JSON.stringify({
                hidden_profile_subscriptions_enabled: true, rweb_tipjar_consumption_enabled: true,
                responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false,
                subscriptions_verification_info_is_identity_verified_enabled: true,
                subscriptions_verification_info_verified_since_enabled: true, highlights_tweets_tab_ui_enabled: true,
                responsive_web_twitter_article_notes_tab_enabled: true, subscriptions_feature_can_gift_premium: true,
                creator_subscriptions_tweet_preview_api_enabled: true,
                responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                responsive_web_graphql_timeline_navigation_enabled: true
            });
        },

        async fetchUserByScreenName(handle) {
            const screen_name = (handle || '').replace(/^@/, '').trim();
            if (!screen_name) return null;
            const queryId = await this.resolveQueryId('UserByScreenName');
            if (!queryId) return null;
            const variables = JSON.stringify({ screen_name, withSafetyModeUserFields: true });
            const features = this.userByScreenNameFeatures();
            const url = `${this.baseUrl}/i/api/graphql/${queryId}/UserByScreenName?` +
                new URLSearchParams({ variables, features });
            try {
                const res = await fetch(url, {
                    headers: this.apiHeaders(),
                    referrer: `${this.baseUrl}/${screen_name}`,
                    referrerPolicy: 'strict-origin-when-cross-origin',
                    method: 'GET', mode: 'cors', credentials: 'include',
                    signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
                        ? AbortSignal.timeout(8000) : undefined
                });
                if (res.status === 404) delete this._queryIds['UserByScreenName'];
                if (res.status !== 200) return null;
                const json = await res.json();
                const result = json && json.data && json.data.user && json.data.user.result;
                const lg = result && result.legacy;
                if (!lg) return null;
                return {
                    id: result.rest_id || lg.id_str,
                    screenName: lg.screen_name || screen_name,
                    name: lg.name || '',
                    followers: lg.followers_count != null ? lg.followers_count : null,
                    following: lg.friends_count != null ? lg.friends_count : null,
                    statuses: lg.statuses_count != null ? lg.statuses_count : null,
                    location: lg.location || '',
                    description: lg.description || '',
                    createdAt: lg.created_at || null,
                    verified: !!lg.verified,
                    protected: !!lg.protected,
                    raw: result
                };
            } catch (_) {
                return null;
            }
        },

        /**
         * Block a user via legacy REST (session cookies). Returns true on success.
         */
        async blockUser(screenNameOrId) {
            const handle = String(screenNameOrId || '').replace(/^@/, '').trim();
            if (!handle) return false;
            this.updateTransactionId();
            const body = new URLSearchParams();
            if (/^\d+$/.test(handle)) body.set('user_id', handle);
            else body.set('screen_name', handle);
            try {
                const res = await fetch(`${this.baseUrl}/i/api/1.1/blocks/create.json`, {
                    method: 'POST',
                    headers: this.apiHeaders('application/x-www-form-urlencoded'),
                    body: body.toString(),
                    credentials: 'include',
                    referrer: this.baseUrl + '/home',
                    mode: 'cors',
                    signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
                        ? AbortSignal.timeout(10000) : undefined
                });
                if (res.status === 429) {
                    console.warn('[TEM] Block rate-limited (429)');
                    return false;
                }
                return res.ok || res.status === 200 || res.status === 403; // 403 sometimes if already blocked
            } catch (e) {
                console.warn('[TEM] blockUser error', e);
                return false;
            }
        }
    };
