/**
 * @module core
 * @see docs/modules/core.md
 */
    const Core = {
        version: '1.0.0',
        product: 'Twitter Experience Manager',
        baseUrl: `https://${window.location.hostname}`,
        authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        ct0: null,
        transaction_id: '',
        username: '',
        userId: null,
        snowflakeEpoch: 1288834974657n,
        _queryIds: {},

        init() {
            this.ct0 = this.getCookie('ct0');
            this.updateTransactionId();
            this.username = this.getUsernameFromUI();
            this.userId = this.getUserId();
            this.installQuerySniffer();
        },

        installQuerySniffer() {
            if (window.__temSniffer) return;
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

        getUsernameFromUI() {
            const sources = [
                '[data-testid="SideNav_AccountSwitcher_Button"]',
                '[data-testid="UserName"]'
            ];
            for (const sel of sources) {
                const el = document.querySelector(sel);
                const m = el && el.textContent.match(/@(\w+)/);
                if (m) return m[1];
            }
            return (document.location.href.split('/')[3] || '').replace('#', '');
        },

        updateTransactionId() {
            this.transaction_id = [...crypto.getRandomValues(new Uint8Array(95))]
                .map((x, i) => (i = x / 255 * 61 | 0, String.fromCharCode(i + (i > 9 ? i > 35 ? 61 : 55 : 48)))).join``;
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
                    signal: AbortSignal.timeout(8000)
                });
                if (res.status === 404) delete this._queryIds['UserByScreenName'];
                if (res.status !== 200) return null;
                const result = (await res.json())?.data?.user?.result;
                const lg = result?.legacy;
                if (!lg) return null;
                return {
                    id: result.rest_id || lg.id_str,
                    screenName: lg.screen_name || screen_name,
                    name: lg.name || '',
                    followers: lg.followers_count ?? null,
                    following: lg.friends_count ?? null,
                    statuses: lg.statuses_count ?? null,
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
                    signal: AbortSignal.timeout(10000)
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
