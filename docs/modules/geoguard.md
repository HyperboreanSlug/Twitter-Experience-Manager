# Module: `geoguard`

**Source:** `src/modules/geoguard.js` · **Exports:** `GeoGuard` · **v1.3+**

## Region filters (tiers)

Self-reported location/bio only. **South Africa is hard-excluded.**

| Tier | Categories | Default |
|------|------------|---------|
| **1 Core** | South Asia (India, Pakistan, Bangladesh, Sri Lanka, Nepal, Afghanistan, other) | **ON** |
| **2 High** | West Africa, East/Central Africa (no SA), Southeast Asia | **ON** |
| **3 Optional** | MENA, Latin America hotspots | **OFF** |

UI: category + subcategory checkboxes; bulk Tier 1/2/3/Clear; optional custom needles. Stored as `tem:geoRegions` + `tem:geoCustomNeedles`.

Matching uses boundary-aware needles (e.g. india≠indiana) + optional Devanagari when India/Nepal subs enabled.

## Other

Soft-hide default ON · live-block default OFF · local DB uncapped · list sync **off** by default.
