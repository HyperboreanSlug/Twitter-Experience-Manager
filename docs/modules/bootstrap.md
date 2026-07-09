# Packaging

- `header.meta.js` — userscript metadata (Violentmonkey-friendly)  
- `bootstrap.js` — IIFE + `__temRunning` guard  
- `boot.js` — init + optional Geo Guard / NotifMute auto-start  
- `footer.js` — close IIFE  

### Violentmonkey / Tampermonkey on X.com

| Directive | Why |
|-----------|-----|
| `@grant GM_info` | Forces userscript sandbox. `@grant none` often injects as **page** and dies on X CSP |
| `@inject-into content` | CSP-safe content world |
| `@run-at document-end` | DOM ready |
| `@match *://x.com/*` etc. | Broad host coverage |

Do **not** use `@inject-into page` or bare `@grant none` on X.

If injection still fails, install `dist/tem-smoke-test.user.js` to isolate VM vs script bugs.

Same file is valid for **console paste** (metadata lines are comments; `GM_info` may be undefined).

```bash
node scripts/build.js
```

Outputs `dist/twitter-experience-manager.user.js` and root `twitter-experience-manager.js`.
