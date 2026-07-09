/**
 * @module ui
 * @see docs/modules/ui.md
 */
    const UI = {
        id: 'tem-panel',

        build() {
            const old = document.getElementById(this.id);
            if (old) old.remove();

            const panel = document.createElement('div');
            panel.id = this.id;
            panel.innerHTML = this.styles() + `
              <div class="tem-header" id="tem-header">
                <div class="tem-badge">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>
                </div>
                <div class="tem-htext">
                  <h2>Twitter Experience Manager</h2>
                  <div class="tem-sub">usability tools for X</div>
                </div>
                <button class="tem-iconbtn" id="tem-min" title="Minimize" type="button"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
                <button class="tem-iconbtn" id="tem-close" title="Close" type="button"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
              </div>
              <nav class="tem-tabs" id="tem-tabs">
                <button class="tem-tab tem-active" data-tab="followers" type="button">Followers</button>
                <button class="tem-tab" data-tab="geoguard" type="button">Geo Guard</button>
                <button class="tem-tab" data-tab="notifs" type="button">Notifs</button>
                <button class="tem-tab" data-tab="about" type="button">About</button>
              </nav>
              <div class="tem-body">
                <section class="tem-pane tem-active" id="tem-pane-followers"></section>
                <section class="tem-pane" id="tem-pane-geoguard"></section>
                <section class="tem-pane" id="tem-pane-notifs"></section>
                <section class="tem-pane" id="tem-pane-about"></section>
              </div>`;
            const mount = document.body || document.documentElement;
            mount.insertBefore(panel, mount.firstChild);

            document.getElementById('tem-min').onclick = () => panel.classList.toggle('tem-min');
            document.getElementById('tem-close').onclick = () => {
                panel.remove();
                try { window.__temRunning = false; } catch (_) { }
                if (typeof GeoGuard !== 'undefined' && GeoGuard.stopWatch) GeoGuard.stopWatch();
                if (typeof NotifMute !== 'undefined' && NotifMute.stopWatch) NotifMute.stopWatch();
            };
            document.getElementById('tem-tabs').addEventListener('click', (e) => {
                const tab = e.target.closest('.tem-tab');
                if (tab) this.switchTab(tab.dataset.tab);
            });

            this.makeDraggable(panel, document.getElementById('tem-header'));
        },

        switchTab(name) {
            document.querySelectorAll('#tem-tabs .tem-tab').forEach(t =>
                t.classList.toggle('tem-active', t.dataset.tab === name));
            document.querySelectorAll('.tem-pane').forEach(p =>
                p.classList.toggle('tem-active', p.id === `tem-pane-${name}`));
            if (name === 'followers' && typeof Followers !== 'undefined') Followers.onShow();
            if (name === 'geoguard' && typeof GeoGuard !== 'undefined') GeoGuard.onShow();
            if (name === 'notifs' && typeof NotifMute !== 'undefined') NotifMute.onShow();
        },

        makeDraggable(panel, header) {
            let dragging = false, offX = 0, offY = 0;
            header.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.tem-iconbtn')) return;
                dragging = true;
                const r = panel.getBoundingClientRect();
                panel.style.transform = 'none';
                panel.style.left = `${r.left}px`;
                panel.style.top = `${r.top}px`;
                panel.style.right = 'auto';
                offX = e.clientX - r.left;
                offY = e.clientY - r.top;
                header.setPointerCapture(e.pointerId);
            });
            header.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const w = panel.offsetWidth, h = panel.offsetHeight;
                panel.style.left = `${Math.max(6, Math.min(window.innerWidth - w - 6, e.clientX - offX))}px`;
                panel.style.top = `${Math.max(6, Math.min(window.innerHeight - h - 6, e.clientY - offY))}px`;
            });
            const end = (e) => { if (dragging) { dragging = false; try { header.releasePointerCapture(e.pointerId); } catch (_) { } } };
            header.addEventListener('pointerup', end);
            header.addEventListener('pointercancel', end);
        },

        styles() {
            const p = `#${this.id}`;
            return `<style>
            ${p},${p} *{box-sizing:border-box}
            ${p}{
              --acc:#1d9bf0;--ok:#17bf63;--warn:#f7931a;--danger:#f4212e;
              --text:#e7e9ea;--muted:#71767b;--card:rgba(255,255,255,.05);--border:rgba(255,255,255,.12);
              position:fixed;top:16px;right:16px;width:min(440px,calc(100vw - 24px));
              max-height:calc(100vh - 32px);overflow:hidden;display:flex;flex-direction:column;
              z-index:2147483647;margin:0;padding:0;
              background:rgba(21,24,28,.95);backdrop-filter:blur(14px) saturate(150%);-webkit-backdrop-filter:blur(14px) saturate(150%);
              color:var(--text);font-family:"TwitterChirp",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
              font-size:15px;line-height:1.45;text-align:left;
              border:1px solid var(--border);border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.55);
              -webkit-font-smoothing:antialiased;animation:tem-in .25s ease both;
            }
            @keyframes tem-in{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
            ${p} .tem-header{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:grab;user-select:none;border-bottom:1px solid var(--border);flex:0 0 auto}
            ${p} .tem-header:active{cursor:grabbing}
            ${p} .tem-badge{flex:0 0 auto;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7856ff,var(--acc));color:#fff;box-shadow:0 4px 12px rgba(120,86,255,.4)}
            ${p} .tem-htext{flex:1 1 auto;min-width:0}
            ${p} .tem-htext h2{margin:0;font-size:15px;font-weight:800;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            ${p} .tem-sub{font-size:12px;color:var(--muted);font-weight:500}
            ${p} .tem-iconbtn{flex:0 0 auto;width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);background:transparent;transition:.15s}
            ${p} .tem-iconbtn:hover{background:rgba(255,255,255,.1);color:var(--text)}
            ${p} #tem-close:hover{background:rgba(244,33,46,.15);color:var(--danger)}
            ${p} .tem-tabs{display:flex;gap:2px;padding:8px 10px 0;flex:0 0 auto}
            ${p} .tem-tab{flex:1;padding:9px 4px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;border-radius:8px 8px 0 0;transition:.15s}
            [data-tem-geo-hidden="1"],[data-tem-like-hidden="1"]{display:none!important}
            ${p} .tem-tab:hover{color:var(--text);background:rgba(255,255,255,.05)}
            ${p} .tem-tab.tem-active{color:var(--acc);border-bottom-color:var(--acc)}
            ${p} .tem-body{padding:16px;overflow-y:auto;flex:1 1 auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
            ${p} .tem-body::-webkit-scrollbar{width:8px}
            ${p} .tem-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:8px}
            ${p}.tem-min{width:min(320px,calc(100vw - 24px))}
            ${p}.tem-min .tem-tabs,${p}.tem-min .tem-body{display:none}
            ${p} .tem-pane{display:none}
            ${p} .tem-pane.tem-active{display:block}
            ${p} .tem-section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px}
            ${p} .tem-section h4{margin:0 0 6px;font-size:14px;font-weight:700}
            ${p} .tem-section p{margin:0 0 10px;font-size:13px;color:var(--muted)}
            ${p} .tem-section ul{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--muted)}
            ${p} .tem-section li{margin:4px 0}
            ${p} .tem-label{display:block;font-size:13px;color:var(--muted);margin:12px 0 6px}
            ${p} .tem-label:first-child{margin-top:0}
            ${p} .tem-input{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(0,0,0,.25);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:.15s}
            ${p} textarea.tem-input{resize:vertical;min-height:72px}
            ${p} select.tem-input{appearance:none;-webkit-appearance:none;cursor:pointer}
            ${p} select.tem-input option{background:#15181c;color:var(--text)}
            ${p} .tem-input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(29,155,240,.25)}
            ${p} .tem-check{display:flex;align-items:flex-start;gap:8px;margin-top:12px;font-size:13px;color:var(--muted);cursor:pointer;line-height:1.4}
            ${p} .tem-check input{flex:0 0 auto;width:16px;height:16px;margin-top:1px;accent-color:var(--acc);cursor:pointer}
            ${p} .tem-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:10px 16px;border-radius:999px;border:1px solid transparent;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;transition:.15s}
            ${p} .tem-btn-primary{background:var(--acc);color:#fff}
            ${p} .tem-btn-primary:hover{background:#1a8cd8}
            ${p} .tem-btn-ghost{background:transparent;border-color:var(--border);color:var(--text)}
            ${p} .tem-btn-ghost:hover{background:rgba(255,255,255,.08)}
            ${p} .tem-btn-danger{background:transparent;border-color:rgba(244,33,46,.5);color:var(--danger)}
            ${p} .tem-btn-danger:hover{background:rgba(244,33,46,.12)}
            ${p} .tem-btn[disabled]{opacity:.45;cursor:not-allowed}
            ${p} .tem-btns{display:flex;gap:10px;margin-top:8px}
            ${p} a{color:var(--acc);text-decoration:none}
            ${p} a:hover{text-decoration:underline}
            ${p} .tem-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
            ${p} .tem-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 8px;text-align:center}
            ${p} .tem-stat-v{font-size:22px;font-weight:800;color:var(--acc);font-variant-numeric:tabular-nums}
            ${p} .tem-stat-l{font-size:11px;color:var(--muted);margin-top:4px}
            ${p} .tem-status{text-align:center;padding:9px;border-radius:10px;font-size:13px;font-weight:700;margin-top:6px}
            ${p} .tem-status.run{background:rgba(23,191,99,.18);color:var(--ok)}
            ${p} .tem-status.pause{background:rgba(247,147,26,.18);color:var(--warn)}
            ${p} .tem-status.stop{background:rgba(244,33,46,.18);color:var(--danger)}
            ${p} .tem-status.idle{background:rgba(255,255,255,.06);color:var(--muted)}
            ${p} .tem-now{background:rgba(29,155,240,.1);border:1px solid rgba(29,155,240,.3);border-radius:10px;padding:10px;margin:10px 0;font-size:13px;text-align:center}
            ${p} .tem-note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5}
            ${p} .tem-warn-box{background:rgba(247,147,26,.12);border:1px solid rgba(247,147,26,.35);color:#ffd9a8;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}
            ${p} .tem-foot{margin-top:6px;text-align:center;font-size:11px;color:var(--muted)}
            ${p} .tem-f-list{max-height:280px;overflow:auto;margin-top:4px}
            ${p} .tem-f-table{width:100%;border-collapse:collapse;font-size:12px}
            ${p} .tem-f-table th{position:sticky;top:0;background:#1a1d22;text-align:left;padding:6px 4px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)}
            ${p} .tem-f-table td{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
            ${p} .tem-f-num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
            ${p} .tem-f-rank{color:var(--muted);width:28px}
            ${p} .tem-f-loc{color:var(--muted);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            ${p} .tem-f-tag{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:999px;font-size:10px;background:rgba(29,155,240,.15);color:var(--acc)}
            ${p} .tem-log{max-height:180px;overflow:auto;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:rgba(0,0,0,.25);border-radius:10px;padding:8px;margin-top:8px}
            ${p} .tem-log div{padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)}
            @media (max-width:480px){${p}{top:8px;right:8px;left:8px;width:auto;border-radius:16px}}
            </style>`;
        },

        el(id) { return document.getElementById(id); }
    };
