# Module: `notifmute`

**Source:** `src/modules/notifmute.js` · **Exports:** `NotifMute`

## Purpose

Hide notification rows that report **likes** on your posts (client-side DOM only). Does not change X’s server-side notification preferences.

## Public API

| Member | Description |
|--------|-------------|
| `NotifMute.startWatch()` / `stopWatch()` | MutationObserver on `document.body` |
| `NotifMute.scanDom(force)` | Hide matching cells now |
| `NotifMute.unhideAll()` | Remove hides for current page |
| `NotifMute.isLikeNotification(text)` | Pattern match |

## Storage

- `tem:likeMuteEnabled` (default true)
- `tem:likeMuteAutoStart` (default true)
- `tem:likeMutePatterns` — string array

## Selectors

Primary: `[data-testid="cellInnerDiv"]` on `/notifications`.

## Maintenance

X copy and test ids change often. Extend patterns in the UI or `defaultPatterns` when rows stop matching.
