# Module: `followers`

**Source:** `src/modules/followers.js` · **Exports:** `Followers`

Ported from Tweepcred Manager’s Followers tab (`tem-*` ids):

1. Snapshot Followers list → diff gains/losses  
2. Scan Following → enrich via API → **sort by following count** → CSV/JSON

Storage is **per logged-in account** (stable `twid` id preferred):

- `tem:followersHistory:id:<userId>` (preferred) or `tem:followersHistory:user:<handle>`
- Legacy `tem:followersHistory:<handle>` is migrated on read
- `tem:accountMap:<userId>` → last known handle
- `tem:followersSort`, `tem:followersMax` (global UI prefs)

Identity: `Core.refreshIdentity()` (cookie `twid` + account switcher / profile nav link). UI shows “Tracking @… · id …”. Snapshot/scan refuse other users’ list pages.
