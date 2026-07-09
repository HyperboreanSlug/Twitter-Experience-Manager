# Packaging

- `header.meta.js` — userscript metadata  
- `bootstrap.js` — IIFE + `__temRunning` guard  
- `boot.js` — init + optional Geo Guard auto-start  
- `footer.js` — close IIFE  

```bash
node scripts/build.js
```

Outputs `dist/twitter-experience-manager.user.js` and root `twitter-experience-manager.js` (console **or** Greasemonkey).
