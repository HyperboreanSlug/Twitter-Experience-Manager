# Module: `notifmute`

**Source:** `src/modules/notifmute.js` · **Exports:** `NotifMute` · **v1.3.2+**

Client-side filter on `/notifications` (DOM hide only).

## Toggles (defaults)

| Toggle | Default | Storage key |
|--------|---------|-------------|
| Mute likes | **ON** | `tem:notifMuteLikes` (legacy `likeMuteEnabled`) |
| Mute retweets/reposts | **ON** | `tem:notifMuteRetweets` |
| Focus mode | **ON** | `tem:notifFocusMode` |
| Keep replies | **ON** | `tem:notifKeepReplies` |
| Keep new followers | **ON** | `tem:notifKeepFollows` |
| Keep quote tweets | **ON** | `tem:notifKeepQuotes` |
| Auto-start watcher | **ON** | `tem:likeMuteAutoStart` |

**Focus mode:** hide every row whose kind is not in the keep list (after mute rules).  
**Without focus:** only mute likes / retweets as checked.

## Classification

`classify(text)` → `like` | `retweet` | `quote` | `reply` | `follow` | `mention` | `other`  
Quote checked before retweet. Patterns editable in UI.

## API

`startWatch` / `stopWatch` / `scanDom` / `unhideAll` / `classify` / `shouldHide`
