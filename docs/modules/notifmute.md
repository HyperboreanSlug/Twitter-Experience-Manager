# Module: `notifmute`

**Source:** `src/modules/notifmute.js` · **Exports:** `NotifMute`

Client-side mute of **likes** and **retweets/reposts** on `/notifications` only.  
**No focus mode** — replies, follows, quotes, mentions stay visible.

## Toggles

| Toggle | Default | Key |
|--------|---------|-----|
| Mute likes | ON | `tem:notifMuteLikes` |
| Mute retweets/reposts | ON | `tem:notifMuteRetweets` |
| Auto-start | ON | `tem:likeMuteAutoStart` |

Legacy `tem:notifFocusMode` is forced **false** on open.

## Loop guards

- `_scanning` blocks re-entrant `scanDom`
- `_scanScheduled` coalesces MutationObserver → rAF
- Observe `primaryColumn` when present (not entire `body` side effects alone)
- Only hide cells classified as `like` or `retweet`
