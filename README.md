<h1 align="center">Twitter Experience Manager</h1>

<p align="center">
  <strong>Modular usability toolkit for X.com</strong><br>
  Track followers, sort Following by following-count, and guard your timeline with configurable region filters.
</p>

<p align="center">
  Console paste · <strong>Violentmonkey</strong> / Tampermonkey · No API keys · Local session only
</p>

---

> **Warning: Use at your own risk.** Automating X is against its Terms of Service and **can get your account locked or banned**. Geo Guard’s location matching uses **self-reported profile text only** — not identity. Prefer **soft hide** over live block. Everything runs in your browser.

## Features

| Tab | What it does |
| --- | --- |
| **Followers** | Snapshot your Followers list over time (diff new/lost). Scan **Following** and **sort by each account’s following count**. Export CSV/JSON. |
| **Geo Guard** | Watch the timeline, look up authors, match location needles (default: **India + South Asia**). **Soft-hide** by default; optional live-block (off). **Persistent match DB** (export JSON/CSV) + optional sync to sibling repo [Indian-Account-Tracker](https://github.com/HyperboreanSlug/Indian-Account-Tracker) (public handles only; PAT stays in browser). |
| **Notifs** | Hide **“liked your post”** (and similar) notification rows on `/notifications` — client-side only. Auto-starts by default. |
| **About** | Docs pointer + warnings |

Same visual language as [Tweepcred Manager](https://github.com/HyperboreanSlug/Tweepcred-Manager) (dark glass panel, modular `src/modules`, dual console/userscript build).

## Quick start

### Console

1. Log into [x.com](https://x.com)
2. DevTools → Console (`allow pasting` if needed)
3. Paste [`dist/twitter-experience-manager.user.js`](dist/twitter-experience-manager.user.js)
4. Panel appears top-right

### Violentmonkey (recommended) / Tampermonkey / Greasemonkey

1. Install [Violentmonkey](https://violentmonkey.github.io/).
2. **New** → paste contents of `dist/twitter-experience-manager.user.js`, **or** open the [install URL (jsDelivr)](https://cdn.jsdelivr.net/gh/HyperboreanSlug/Twitter-Experience-Manager@main/dist/twitter-experience-manager.user.js) and confirm install.
3. Visit x.com while logged in — panel loads at `document-idle`.

**Stuck on an old version (e.g. Tampermonkey shows 1.3.2)?**  
`raw.githubusercontent.com` is often CDN-cached. Use the jsDelivr link above, or in Tampermonkey: Dashboard → TEM → **Last updated** → check for updates, or **remove the script and reinstall** from jsDelivr. Confirm `@version` is **1.3.4+**.

**Userscript metadata (VM on X.com):**

| Key | Value | Why |
|-----|--------|-----|
| `@grant` | `GM_info` | Forces content sandbox (not page). `@grant none` often fails X CSP. |
| `@inject-into` | `content` | CSP-safe. Never use `page` on x.com. |
| `@run-at` | `document-end` | Reliable DOM availability |

### Still see “Could not inject some scripts”?

1. **Delete** every old TEM copy in Violentmonkey (stale scripts with `@grant none` / `@inject-into page` keep failing).
2. Install **v1.1.2+** from the raw URL above (or paste `dist/twitter-experience-manager.user.js`).
3. Optional: install `dist/tem-smoke-test.user.js` first. If smoke fails, the problem is VM/browser permissions, not TEM.
4. Violentmonkey → Settings → set **Default inject-into** to **content** (or **auto**).
5. Hard-refresh x.com. Open DevTools console and look for `[TEM] bootstrap start` / `[TEM] ... ready`.

Console paste still works (metadata is comments).

## Project layout

```
src/modules/     # core, follow, ui, followers, geoguard, notifmute, about
docs/modules/    # per-module maintenance docs
scripts/build.js # concatenates → dist/*.user.js
IDEAS.md         # future feature ideas with pros/cons
```

```bash
node scripts/build.js
```

## Geo Guard notes

- Default needles are place/country substrings (Mumbai, Delhi, Pakistan, Bangladesh, …) plus optional Devanagari-in-location heuristic.
- Edit needles and whitelist in the UI; stored under `localStorage` keys `tem:geoNeedles`, `tem:geoWhitelist`.
- **Soft hide** (default ON): sets `display:none` on matching tweet cells — no block API.
- **Do not live-block** (default ON): never calls `blocks/create` unless you uncheck it.
- Profile lookups are delayed (~1.1s+) to reduce rate-limit pressure.
- False positives: tourists, diaspora, joke locations, shared city names. False negatives: empty location fields.

### Match database & multi-install tracker

- Every match is written to a local DB (`tem:geoDb`, **no size cap**). Export **full** or **public**.
- **No credentials are hardcoded** in TEM. Sync:
  1. **Pull** from any public HTTPS `accounts.json` URL, and/or  
  2. **Export public** → offline merge, and/or  
  3. **GitHub push** using your **browser GitHub login** (`GM_xmlhttpRequest` + session cookies — no PAT).
- Sibling project **Indian-Account-Tracker**: see `docs/HOSTING.md`.

## Like notification mute

- Open **Notifs** tab (watcher auto-starts by default).
- Visit `x.com/notifications` — rows whose text matches patterns like `liked your post` are hidden.
- Does **not** change X account settings; only this browser session’s DOM.
- Unhide button restores currently hidden rows; patterns are editable.

## Followers notes

1. Open `/followers` → Snapshot  
2. Later snapshot again → Diff  
3. Open `/following` → Scan & sort by following count  

See [`docs/modules/followers.md`](docs/modules/followers.md).

## Related

- **Tweepcred Manager** — reputation score estimate, mass unfollow, tweet cleanup.

## License

MIT — see [LICENSE](LICENSE).
