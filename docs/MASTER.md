# TEM Master Module Map

**Repo:** HyperboreanSlug/Twitter-Experience-Manager · **v1.1.2** · **MIT**  
**What:** Browser userscript / console toolkit for x.com — follower snapshots, Following sort, timeline soft-hide by location text, like-notif mute.  
**Runtime:** Single IIFE, session cookies only, no API keys. Dual: console paste + Violentmonkey (`@grant GM_info` + `@inject-into content`).  
**Build:** `node scripts/build.js` → concat → `dist/twitter-experience-manager.user.js` (+ root copy + smoke test).

> **Token-efficient review rule:** Prefer this file over reading full sources. Drill into `src/modules/<name>.js` only when a section below is insufficient. Per-module notes in `docs/modules/` are thinner; this is the SSOT.

---

## 1. Topology (build order = load order)

```
header.meta.js          # userscript metadata (must be first line of output)
bootstrap.js            # IIFE open + __temRunning guard
  core.js               # auth, store, GraphQL, block
  follow.js             # UserCell DOM helpers
  ui.js                 # panel shell + CSS + tabs
  followers.js          # Followers tab feature
  geoguard.js           # Geo Guard tab feature
  notifmute.js          # Notifs tab feature
  about.js              # About tab (static HTML)
boot.js                 # init + render all panes + autostart watchers
footer.js               # })();
```

| Layer | Modules | Role |
|-------|---------|------|
| **Shell** | bootstrap, header, boot, footer | Inject, single-instance, lifecycle |
| **Platform** | core | Cookies, fetch GraphQL/REST, `tem:*` storage |
| **DOM lib** | follow | Shared list-cell parsers |
| **Chrome** | ui | `#tem-panel`, styles, tab routing |
| **Features** | followers, geoguard, notifmute, about | Product tabs |

**Deps (feature → platform):**

| Module | Uses |
|--------|------|
| Follow | Core.sleep |
| UI | GeoGuard.stopWatch, NotifMute.stopWatch (close) |
| Followers | Core, Follow, UI |
| GeoGuard | Core, Follow, UI |
| NotifMute | Core, UI |
| About | Core, UI |
| boot | Core, UI, Followers, GeoGuard, NotifMute, About |

Globals (concat, not ES modules): `Core`, `Follow`, `UI`, `Followers`, `GeoGuard`, `NotifMute`, `About`.

---

## 2. Boot sequence

1. `bootstrap`: log inject mode; if `window.__temRunning` → focus existing panel, abort; else set flag.
2. Modules define consts (no side effects except definitions).
3. `temBoot()` when DOM ready:
   - `Core.init()` — ct0, transaction id, username, userId, fetch sniffer
   - `UI.build()` — panel + styles
   - `Followers/GeoGuard/NotifMute/About.render()`; clear `firstShow`
   - `UI.switchTab('followers')`
   - +1200ms: if `geoAutoStart` → `GeoGuard.startWatch()`; if `likeMuteAutoStart` (default true) → `NotifMute.startWatch()`
4. Boot failure → fixed error banner `#tem-boot-error`.

**Close panel:** remove DOM, `__temRunning=false`, stop Geo + Notif watchers.

---

## 3. Module cards (dense)

### 3.0 Packaging / bootstrap

| Item | Detail |
|------|--------|
| **Files** | `src/header.meta.js`, `bootstrap.js`, `boot.js`, `footer.js`, `scripts/build.js` |
| **~LOC** | meta ~37 · bootstrap ~30 · boot ~65 · footer 1 · build ~124 |
| **Critical meta** | `@grant GM_info`, `@inject-into content`, `@run-at document-end`, match x.com/twitter.com |
| **Why not `@grant none`** | X CSP often blocks page-world inject |
| **Build invariants** | Strip BOM; output starts with `// ==UserScript==`; `new Function` parse-check body; emit smoke `dist/tem-smoke-test.user.js` |
| **Console paste** | Metadata is comments; `GM_info` may be undefined — still runs |

---

### 3.1 `core` — platform

| | |
|--|--|
| **Src** | `src/modules/core.js` (~272 LOC) |
| **Export** | `Core` |
| **Purpose** | Session auth surface, GraphQL UserByScreenName, REST block, localStorage, utilities |

**Key fields:** `version`, `baseUrl`, `authorization` (public web bearer), `ct0`, `transaction_id`, `username`, `userId`, `_queryIds`, `snowflakeEpoch`

| API | Behavior |
|-----|----------|
| `init()` | Cookie ct0, random txn id, username from nav UI, userId from `twid`, install fetch sniffer |
| `installQuerySniffer` | Patch `fetch` once (`__temSniffer`); map `/graphql/{id}/{Op}` → `_queryIds[Op]` |
| `resolveQueryId(op)` | Sniffed id, else scrape twimg client-web JS for queryId |
| `fetchUserByScreenName(h)` | GraphQL UserByScreenName → normalized profile object or null |
| `blockUser(id\|handle)` | POST `/i/api/1.1/blocks/create.json` form body; 429 → false; 403 treated ok (already blocked) |
| `store.get/set(k,v)` | `localStorage` key `tem:`+k, JSON |
| `apiHeaders(ct)` | Bearer + ct0 + txn + OAuth2Session flags |
| helpers | `sleep`, `rand`, `parseCount`, `escapeHtml`, `waitForElem`, `getCookie`, `getUserId`, `getUsernameFromUI` |

**Profile shape (fetch):** `{ id, screenName, name, followers, following, statuses, location, description, createdAt, verified, protected, raw }`

**Break points:** queryId rotation (404 clears cache); CSRF/ct0 expiry; fetch sniffer if page overwrites `fetch` after init.

---

### 3.2 `follow` — DOM lib

| | |
|--|--|
| **Src** | `src/modules/follow.js` (~81 LOC) |
| **Export** | `Follow` |
| **Purpose** | Parse `[data-testid="UserCell"]` rows (ported from mass-unfollow) |

| API | |
|-----|--|
| `isMutual(cell)` | `userFollowIndicator` / aria / text “follows you” |
| `isPrivate(cell)` | protected/private/locked aria on svg/labels |
| `getUsername(cell)` | First profile `a[href^="/"]` segment |
| `findUnfollowButton` / `waitConfirm` | Present for parity; **Followers/Geo do not call unfollow** |

---

### 3.3 `ui` — chrome

| | |
|--|--|
| **Src** | `src/modules/ui.js` (~182 LOC) |
| **Export** | `UI` |
| **Purpose** | Dark-glass `#tem-panel`, tabs, shared CSS component classes |

**Tabs / panes:** `followers` · `geoguard` · `notifs` · `about` → `#tem-pane-*`

| API | |
|-----|--|
| `build()` | Replace panel; bind min/close/tabs; `makeDraggable` |
| `switchTab(name)` | Active tab/pane; `onShow()` for feature modules |
| `styles()` | Injected `<style>` scoped to `#tem-panel`; **global** hide rules for `[data-tem-geo-hidden]` / `[data-tem-like-hidden]` |
| `el(id)` | `getElementById` |

**Design tokens:** `--acc #1d9bf0`, purple badge gradient `#7856ff`, z-index max.

---

### 3.4 `followers` — feature

| | |
|--|--|
| **Src** | `src/modules/followers.js` (~443 LOC) |
| **Export** | `Followers` |
| **Purpose** | (A) Snapshot Followers list + diff (B) Scan Following, enrich profiles, sort, export |

**State:** `running`, `stopFlag`, `rows[]`, `sortMode`, `enrichDelayMs=900`, `firstShow`

| Flow | Path req | Mechanism |
|------|----------|-----------|
| Snapshot | `/followers` or `/verified_followers` | `collectListHandles` scroll UserCells → store snapshot |
| Diff | — | last two history entries: set gain/loss |
| Scan & sort | `/following` | collect → `fetchUserByScreenName` each (cap `followersMax`) → table |

**`collectListHandles`:** maxScrolls (80–120), settle ~700ms, stagnant×3 stop, scroll `primaryColumn` / window.

**Sort modes:** `following_desc` (default) \| `following_asc` \| `followers_desc` \| `name`

**Storage (`tem:` prefix via Core.store):**

| Key | Default | |
|-----|---------|--|
| `followersHistory:<user>` | `[]` | Last **20** snaps `{ at, username, handles[], meta[] }` |
| `followersSort` | `following_desc` | |
| `followersMax` | `200` | 0 = enrich all scanned |

**Export:** CSV / JSON of sorted rows. **No writes to X** (read + local only).

**Rate:** ~900–1300ms between enrich lookups.

---

### 3.5 `geoguard` — feature

| | |
|--|--|
| **Src** | `src/modules/geoguard.js` (~482 LOC) |
| **Export** | `GeoGuard` |
| **Purpose** | MO on body → author handles → UserByScreenName → region match → soft-hide and/or live-block |

**Pipeline:**
```
scanDom → handles from article[data-testid=tweet] + UserCell
       → skip seen / self
       → queue
_pump  → evaluateHandle (delay 1100+rand0-350)
       → whitelist? skip
       → profileCache | fetch
       → matchRegion(needles + optional Devanagari in location + optional bio)
       → matchedHandles + hideArticlesForHandle (if soft)
       → if !geoDryRun → Core.blockUser
```

**Session memory:** `seen`, `matchedHandles`, `queue`, `profileCache`, counters, `logLines` (cap 500).

| Storage key | Default | Meaning |
|-------------|---------|---------|
| `geoNeedles` | large India/S.Asia list | substring needles |
| `geoWhitelist` | `[]` | never hide/block |
| `geoSoftHide` | **true** | DOM hide |
| `geoDryRun` | **true** | “Do not live-block” |
| `geoUseBio` | false | also scan description |
| `geoAutoStart` | **false** | boot watcher |
| `geoBlockHistory` | `[]` | last 1000 block events |

**DOM marks:** `data-tem-geo-hidden=1`, `data-tem-geo-handle`, `data-tem-geo-reason` on `cellInnerDiv` or article.

**Match:** case-insensitive needle in location (+ bio if on); else Devanagari `\u0900-\u097F` in **location only**.

**Safety defaults:** soft-hide ON, live-block OFF. **ToS risk** only when dry-run unchecked.

**False +/−:** free-text location; diaspora; empty loc; shared city names.

---

### 3.6 `notifmute` — feature

| | |
|--|--|
| **Src** | `src/modules/notifmute.js` (~271 LOC) |
| **Export** | `NotifMute` |
| **Purpose** | Client-side hide of like-notification rows on `/notifications` |

**Pipeline:** MO → rAF-coalesced `scanDom` → cells `cellInnerDiv` (fallback article/notification) → `isLikeNotification` → `data-tem-like-hidden` + `display:none`.

| Storage | Default |
|---------|---------|
| `likeMuteEnabled` | true |
| `likeMuteAutoStart` | **true** |
| `likeMutePatterns` | EN+DE/FR/ES/PT fragments |

**Match:** pattern substrings + heuristics `liked your` / `liked a …` + `you`.

**Scope:** DOM only — does **not** change X notification prefs. Path-gated unless force scan.

---

### 3.7 `about` — feature

| | |
|--|--|
| **Src** | `src/modules/about.js` (~32 LOC) |
| **Export** | `About` |
| **Purpose** | Static HTML: feature list, VM install notes, ToS warn, version |

---

## 4. Cross-cutting concerns

### 4.1 localStorage namespace

All keys: `tem:<key>`. No sync, no server. Per-origin (x.com).

### 4.2 X API surface used

| Call | Module | Method |
|------|--------|--------|
| GraphQL `UserByScreenName` | core → followers, geoguard | GET session |
| REST `blocks/create.json` | core → geoguard only if !dryRun | POST form |
| DOM scroll lists | followers | no API |
| DOM hide | geoguard, notifmute | no API |

Public web bearer is hardcoded (same pattern as web client). Auth = cookies + ct0.

### 4.3 Rate / economy

| Path | Delay |
|------|-------|
| Geo evaluate | 1100 + [0,350] ms |
| Followers enrich | 900 + [0,400] ms |
| List scroll settle | ~700 ms |
| Notif/Geo scan | rAF coalesce (`_scanScheduled`) |

Caches: Geo `profileCache` + `seen` (session); Core `_queryIds` (session).

### 4.4 Selectors cheat-sheet (breakage index)

| Selector / mark | Used by |
|-----------------|---------|
| `article[data-testid="tweet"]` | Geo author scan |
| `[data-testid="User-Name"]` | Geo `authorFromArticle` |
| `[data-testid="UserCell"]` | Followers, Geo sidebar |
| `[data-testid="cellInnerDiv"]` | Hide wrappers, NotifMute cells |
| `[data-testid="SideNav_AccountSwitcher_Button"]` | Core username |
| `twid` / `ct0` cookies | Core auth |
| `data-tem-geo-hidden` / `data-tem-like-hidden` | Soft hide marks |
| GraphQL path `/i/api/graphql/{id}/{Op}` | Sniffer |

### 4.5 Dual-mode / CSP

| Mode | How |
|------|-----|
| Violentmonkey | content sandbox via GM_info + inject-into content |
| Console | paste built file; no GM |
| Debug inject | install smoke userscript first |

---

## 5. Feature matrix

| Capability | Write X? | Network | Persistence | Default on |
|------------|----------|---------|-------------|------------|
| Follower snapshot/diff | No | No (DOM) | localStorage history | manual |
| Following sort | No | GraphQL N lookups | sort/max prefs | manual |
| Geo soft-hide | No | GraphQL per author | needles/wl/flags | watcher off; soft on |
| Geo live-block | **Yes** | REST block | block history | **off** (dryRun) |
| Like notif mute | No | No | patterns/flags | watcher **on** |
| UI panel | No | No | — | always |

---

## 6. Mental model (one paragraph)

TEM is a **concatenated IIFE** that mounts a fixed panel and three active features. **Core** is the only network/auth layer. **Followers** is a page-bound list walker + optional GraphQL enricher for analytics. **GeoGuard** is an async queue over timeline authors with optional destructive block behind a dry-run flag. **NotifMute** is pure DOM text matching on notifications. Shared look-and-feel lives in **UI**; list-row parsing in **Follow**. Everything feature-stateful uses `Core.store` (`tem:*`).

---

## 7. Edit map (where to change what)

| Change | File |
|--------|------|
| Version / userscript meta | `header.meta.js` + `Core.version` |
| New GraphQL op / profile fields | `core.js` |
| Panel layout / CSS / tabs | `ui.js` (+ boot if new tab) |
| Snapshot/sort logic | `followers.js` |
| Region defaults / hide/block policy | `geoguard.js` |
| Like strings / notif selectors | `notifmute.js` |
| Boot order / autostart | `boot.js` |
| Concat order | `scripts/build.js` |

**Adding a module:** implement `const X = { render, onShow? }`; add to `BODY` in build.js after deps; pane+tab in `ui.js`; call render/onShow in boot/switchTab; optional `docs/modules/x.md`.

---

## 8. Review checklist (fast)

- [ ] Build order preserves Core → Follow → UI → features → boot  
- [ ] No live-block without explicit `geoDryRun=false`  
- [ ] Soft-hide defaults remain safe if Geo changes  
- [ ] NotifMute stays DOM-only (no mute API)  
- [ ] Delays remain ≥ ~1s for GraphQL hammer paths  
- [ ] Selectors still match X DOM (UserCell, tweet, cellInnerDiv)  
- [ ] `tem:` storage keys unchanged or migrated  
- [ ] Userscript still `@grant GM_info` + `@inject-into content`  
- [ ] `node scripts/build.js` parse-check passes  

---

## 9. Out of scope / adjacent

- **Not in this repo:** Tweepcred Manager (reputation, mass unfollow, tweet cleanup) — sibling architecture.  
- **IDEAS.md:** keyword mute, following-only mode, reply quality, media saver, engagement budget, quote collapse, list-first nav — **unimplemented**.  
- **No** TypeScript, bundler (esbuild/webpack), tests suite, or ES module imports — plain concat only.

---

## 10. File size index (approx bytes, for triage)

| Path | ~bytes | Density |
|------|--------|---------|
| geoguard.js | 22k | largest feature |
| followers.js | 21k | largest feature |
| ui.js | 14k | CSS-heavy |
| core.js | 12k | platform |
| notifmute.js | 12k | medium |
| follow.js | 4k | small lib |
| about.js | 2k | static |
| boot / bootstrap / meta | small | shell |

---

*Generated for efficient re-review. When code drifts, update **this** file first, then thin `docs/modules/*` if needed.*
