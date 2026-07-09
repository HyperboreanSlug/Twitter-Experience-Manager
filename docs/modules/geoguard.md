# Module: `geoguard`

**Source:** `src/modules/geoguard.js` · **Exports:** `GeoGuard`

## Purpose

Watch the Home timeline (and other tweet lists), resolve each author with `UserByScreenName`, then:

1. **Soft hide** matching posts in the DOM (default ON — recommended)
2. Optionally **live-block** (default OFF via “Do not live-block”)

Matching uses **self-reported** profile location (optional: bio) against configurable region needles (default India + South Asia).

## Public API

| Member | Description |
|--------|-------------|
| `GeoGuard.startWatch()` / `stopWatch()` | MutationObserver + async queue |
| `GeoGuard.scanDom()` | Collect handles; re-apply soft hides |
| `GeoGuard.evaluateHandle(h)` | Lookup → match → soft-hide → optional block |
| `GeoGuard.hideArticlesForHandle(h)` | Soft-hide tweets by author |
| `GeoGuard.unhideAll()` | Undo soft hides on current page |
| `GeoGuard.matchRegion(profile)` | Needle + Devanagari heuristic |

## Safety defaults

- **Soft hide ON** by default  
- **Do not live-block ON** by default  
- Whitelist never hide/block  
- ~1.1–1.45 s delay between lookups  
- `data-tem-geo-hidden="1"` marks hidden nodes

## Limitations

- Location is voluntary free text — not ground truth for nationality.  
- Diaspora users listing “Mumbai” abroad, or empty locations, both misclassify.  
- Blocking is rate-limited and against X ToS.  
- Does not use IP geolocation or language models on tweet text (by design).

## Maintenance

- Update `defaultNeedles` carefully; keep user overrides via `tem:geoNeedles`.  
- If `blocks/create.json` breaks, check CSRF/`ct0` and content-type form encoding.
