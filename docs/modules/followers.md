# Module: `followers`

**Source:** `src/modules/followers.js` · **Exports:** `Followers`

Ported from Tweepcred Manager’s Followers tab (`tem-*` ids):

1. Snapshot Followers list → diff gains/losses  
2. Scan Following → enrich via API → **sort by following count** → CSV/JSON

Storage keys under `tem:followersHistory:<user>`, `tem:followersSort`, `tem:followersMax`.
