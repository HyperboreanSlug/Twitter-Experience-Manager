# Packaging

- `header.meta.js` — userscript metadata (Violentmonkey-friendly)  
- `bootstrap.js` — IIFE + `__temRunning` guard  
- `boot.js` — init + optional Geo Guard / NotifMute auto-start  
- `footer.js` — close IIFE  

### Violentmonkey / Tampermonkey

| Directive | Why |
|-----------|-----|
| `@grant none` | No sandbox isolation; no `GM_*` APIs |
| `@inject-into page` | Page context so `fetch` + cookies match X’s own requests |
| `@run-at document-idle` | Wait until DOM is ready enough |
| `@noframes` | Skip iframes |
| `@match` x.com / twitter.com | SPA coverage |

Same file is valid for **console paste** (metadata lines are comments).

```bash
node scripts/build.js
```

Outputs `dist/twitter-experience-manager.user.js` and root `twitter-experience-manager.js`.
