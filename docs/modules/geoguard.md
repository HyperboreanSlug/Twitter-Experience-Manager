# Module: `geoguard`

**Source:** `src/modules/geoguard.js` · **Exports:** `GeoGuard`

## Purpose

Watch the Home timeline (and other tweet lists), resolve each author with `UserByScreenName`, and **log or auto-block** accounts whose **self-reported** profile location (optional: bio) matches configurable region needles.

Default needles cover **India + South Asia** place names, country names, and a few symbols/scripts. Editable in the UI.

## Public API

| Member | Description |
|--------|-------------|
| `GeoGuard.startWatch()` / `stopWatch()` | MutationObserver + async queue |
| `GeoGuard.scanDom()` | Collect handles from `article[data-testid=tweet]` |
| `GeoGuard.evaluateHandle(h)` | Lookup → match → dry-run or `Core.blockUser` |
| `GeoGuard.matchRegion(profile)` | Needle + Devanagari heuristic |

## Safety defaults

- **Dry-run ON** by default  
- Whitelist never blocked  
- ~1.1–1.45 s delay between lookups  
- Session + persistent block history in `localStorage`

## Limitations

- Location is voluntary free text — not ground truth for nationality.  
- Diaspora users listing “Mumbai” abroad, or empty locations, both misclassify.  
- Blocking is rate-limited and against X ToS.  
- Does not use IP geolocation or language models on tweet text (by design).

## Maintenance

- Update `defaultNeedles` carefully; keep user overrides via `tem:geoNeedles`.  
- If `blocks/create.json` breaks, check CSRF/`ct0` and content-type form encoding.
