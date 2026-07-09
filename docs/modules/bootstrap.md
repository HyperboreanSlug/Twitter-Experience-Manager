# Packaging

- `header.meta.js` — userscript metadata (Violentmonkey-friendly)  
- `bootstrap.js` — IIFE + `__temRunning` guard  
- `boot.js` — init + optional Geo Guard / NotifMute auto-start  
- `footer.js` — close IIFE  

### Violentmonkey / Tampermonkey

| Directive | Why |
|-----------|-----|
| `@grant none` | No `GM_*` APIs; works as console paste too |
| `@inject-into content` | **Required on X.com** — CSP blocks `page` injection (“could not inject script”) |
| `@run-at document-idle` | Wait until DOM is ready enough |
| `@noframes` | Skip iframes |
| `@match` x.com / twitter.com | SPA coverage |

Do **not** use `@inject-into page` on X — Violentmonkey fails to inject under X’s CSP.

Same file is valid for **console paste** (metadata lines are comments).

```bash
node scripts/build.js
```

Outputs `dist/twitter-experience-manager.user.js` and root `twitter-experience-manager.js`.
