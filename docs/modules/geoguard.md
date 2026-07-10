# Module: `geoguard`

**Source:** `src/modules/geoguard.js` · **Exports:** `GeoGuard` · **v1.2+**

## Purpose

Watch timeline tweet lists, resolve authors via `UserByScreenName`, then:

1. **Soft hide** matching posts (default ON)
2. Optionally **live-block** (default OFF)
3. **Persist** matches in local exportable DB (`tem:geoDb`)
4. Optionally **sync public list** to [Indian-Account-Tracker](https://github.com/HyperboreanSlug/Indian-Account-Tracker)

Matching uses **self-reported** profile location (optional bio) vs region needles.

## Local DB

| Key | Notes |
|-----|--------|
| `tem:geoDb` | `{ schemaVersion, updatedAt, accounts }` — **uncapped** |

Record (full/local): handle, userId, reasonCode, reasonNeedle, reason, location, firstSeen, lastSeen, hits, blocked, sources.

**Public export / GitHub push** strips `location`, `reason`, `blocked` — never includes tokens or operator identity.

## Sync (no hardcoded credentials)

| Key | Notes |
|-----|--------|
| `tem:geoListUrl` | Public HTTPS JSON for anonymous pull |
| `tem:geoSyncRepo` | `owner/repo` for browser-session push |
| `tem:geoSyncPath` | e.g. `data/accounts.json` |
| `tem:geoSyncBranch` | default `main` |
| `tem:geoSyncSource` | Install tag |

Pull: public GET. Push: `GM_xmlhttpRequest` + **GitHub browser cookies** (edit form / tree-save) — log into github.com; no PAT.

## Public API (high level)

| Member | |
|--------|--|
| `startWatch` / `stopWatch` / `scanDom` | MO + queue |
| `evaluateHandle` | lookup → match → hide/block → **dbUpsertMatch** |
| `exportDb({ publicOnly })` / `exportDbCsv` / `importDbFile` | DB I/O |
| `syncPullMerge` / `syncPushMerge` | GitHub public list |
| `matchRegion` | needles + Devanagari |

## Safety defaults

Soft hide ON · dry-run (no live-block) ON · whitelist respected · ~1.1s+ lookup delay.

## Limitations

Self-reported location only. Blocking is ToS risk. DB soft-hide reuses prior matches without re-fetch.
