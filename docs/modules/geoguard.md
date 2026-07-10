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
| `tem:geoDb` | `{ schemaVersion, updatedAt, accounts: { handleLower: record } }` |
| Cap | 8000 accounts (evict oldest `lastSeen`) |

Record (full/local): handle, userId, reasonCode, reasonNeedle, reason, location, firstSeen, lastSeen, hits, blocked, sources.

**Public export / GitHub push** strips `location`, `reason`, `blocked` — never includes tokens or operator identity.

## Sync (no hardcoded credentials)

| Key | Notes |
|-----|--------|
| `tem:geoListUrl` | Public HTTPS JSON URL for **anonymous pull** |
| `tem:geoPushMode` | `none` \| `github` \| `put_url` (default **none**) |
| `tem:geoSyncRepo` | Your `owner/repo` if using GitHub write |
| `tem:geoSyncPath` | e.g. `data/accounts.json` |
| `tem:geoPutUrl` | Your HTTPS PUT endpoint |
| `tem:geoSyncSource` | Install tag |
| `tem:geoWriteSecret` | **User-pasted only** — never in source, never exported |

Pull uses `_fetchPublicJson` (no Authorization). Push refuses GitHub mode without a user-supplied secret.

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
