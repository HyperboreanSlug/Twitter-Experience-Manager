<h1 align="center">Twitter Experience Manager</h1>

<p align="center">
  <strong>Modular usability toolkit for X.com</strong><br>
  Track followers, sort Following by following-count, and guard your timeline with configurable region filters.
</p>

<p align="center">
  Console paste · Greasemonkey/Tampermonkey · No API keys · Local session only
</p>

---

> **Warning: Use at your own risk.** Automating X is against its Terms of Service and **can get your account locked or banned**. Geo Guard’s location matching uses **self-reported profile text only** — not identity. Prefer dry-run mode. Everything runs in your browser.

## Features

| Tab | What it does |
| --- | --- |
| **Followers** | Snapshot your Followers list over time (diff new/lost). Scan **Following** and **sort by each account’s following count**. Export CSV/JSON. |
| **Geo Guard** | Watch the Home timeline, look up authors, match location needles (default: **India + South Asia**), and **log or auto-block**. Dry-run on by default. Whitelist supported. |
| **About** | Docs pointer + warnings |

Same visual language as [Tweepcred Manager](https://github.com/HyperboreanSlug/Tweepcred-Manager) (dark glass panel, modular `src/modules`, dual console/userscript build).

## Quick start

### Console

1. Log into [x.com](https://x.com)
2. DevTools → Console (`allow pasting` if needed)
3. Paste [`dist/twitter-experience-manager.user.js`](dist/twitter-experience-manager.user.js)
4. Panel appears top-right

### Greasemonkey / Tampermonkey (persistent)

Install the same `dist/twitter-experience-manager.user.js` file as a userscript (`@grant none`, `@run-at document-idle`). It auto-loads on x.com / twitter.com.

## Project layout

```
src/modules/     # core, follow, ui, followers, geoguard, about
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
- **Dry-run** logs matches without calling `blocks/create`.
- Profile lookups are delayed (~1.1s+) to reduce rate-limit pressure.
- False positives: tourists, diaspora, joke locations, shared city names. False negatives: empty location fields.

## Followers notes

1. Open `/followers` → Snapshot  
2. Later snapshot again → Diff  
3. Open `/following` → Scan & sort by following count  

See [`docs/modules/followers.md`](docs/modules/followers.md).

## Related

- **Tweepcred Manager** — reputation score estimate, mass unfollow, tweet cleanup.

## License

MIT — see [LICENSE](LICENSE).
