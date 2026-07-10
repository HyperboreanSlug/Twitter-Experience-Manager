/**
 * @module ui
 * @see docs/modules/ui.md
 */
    const UI = {
        id: 'tem-panel',
        open: false,

        build() {
            const old = document.getElementById(this.id);
            if (old) old.remove();
            const oldTrigger = document.getElementById('tem-launcher');
            if (oldTrigger) oldTrigger.remove();

            this.open = false;

            const panel = document.createElement('div');
            panel.id = this.id;
            panel.className = 'tem-collapsed';
            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-label', 'Twitter Experience Manager');
            panel.innerHTML = this.styles() + `
              <button type="button" class="tem-dropbtn" id="tem-toggle" aria-expanded="false" aria-controls="tem-dropdown">
                <span class="tem-dropbtn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>
                </span>
                <span class="tem-dropbtn-label">TEM Settings</span>
                <span class="tem-dropbtn-chev" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </button>
              <div class="tem-dropdown" id="tem-dropdown" hidden>
                <div class="tem-header" id="tem-header">
                  <div class="tem-htext">
                    <h2>Settings</h2>
                    <div class="tem-sub">Twitter Experience Manager</div>
                  </div>
                  <button class="tem-iconbtn" id="tem-min" title="Minimize" type="button" aria-label="Minimize">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
                  </button>
                  <button class="tem-iconbtn" id="tem-close" title="Close" type="button" aria-label="Close">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                  </button>
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
                </div>
              </div>`;

            const mount = document.body || document.documentElement;
            mount.insertBefore(panel, mount.firstChild);

            const toggle = document.getElementById('tem-toggle');
            const dropdown = document.getElementById('tem-dropdown');

            const setOpen = (next) => {
                this.open = !!next;
                panel.classList.toggle('tem-collapsed', !this.open);
                panel.classList.toggle('tem-open', this.open);
                if (dropdown) {
                    if (this.open) dropdown.removeAttribute('hidden');
                    else dropdown.setAttribute('hidden', '');
                }
                if (toggle) {
                    toggle.setAttribute('aria-expanded', this.open ? 'true' : 'false');
                    const chev = toggle.querySelector('.tem-dropbtn-chev');
                    if (chev) chev.classList.toggle('tem-chev-up', this.open);
                }
            };

            this.setOpen = setOpen;
            this.toggleOpen = () => setOpen(!this.open);

            toggle.onclick = (e) => {
                e.stopPropagation();
                this.toggleOpen();
            };

            document.getElementById('tem-min').onclick = (e) => {
                e.stopPropagation();
                setOpen(false);
            };
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

            // Click outside closes dropdown
            document.addEventListener('pointerdown', (e) => {
                if (!this.open) return;
                if (panel.contains(e.target)) return;
                setOpen(false);
            }, true);

            // Escape collapses
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.open) setOpen(false);
            });

            setOpen(false);
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

        styles() {
            const p = `#${this.id}`;
            return `<style>
            ${p},${p} *{box-sizing:border-box}
            ${p}{
              --acc:#1d9bf0;--ok:#17bf63;--warn:#f7931a;--danger:#f4212e;
              --text:#e7e9ea;--muted:#8b98a5;--card:rgba(255,255,255,.05);--border:rgba(255,255,255,.12);
              --space-1:6px;--space-2:8px;--space-3:10px;--space-4:12px;--space-5:14px;--space-6:16px;
              --radius-sm:10px;--radius-md:12px;--radius-lg:14px;--radius-pill:999px;
              --btn-h:40px;--control-h:40px;
              position:fixed;top:10px;left:50%;transform:translateX(-50%);
              z-index:2147483647;margin:0;padding:0;
              display:flex;flex-direction:column;align-items:center;
              width:auto;max-width:min(440px,calc(100vw - 20px));
              font-family:"TwitterChirp",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
              font-size:15px;line-height:1.45;text-align:left;color:var(--text);
              -webkit-font-smoothing:antialiased;
              pointer-events:none;
            }
            ${p} > *{pointer-events:auto}
            ${p} .tem-dropbtn{
              display:inline-flex;align-items:center;justify-content:center;gap:8px;
              min-height:36px;padding:8px 14px 8px 12px;margin:0;
              border:1px solid var(--border);border-radius:var(--radius-pill);
              background:rgba(21,24,28,.92);backdrop-filter:blur(12px) saturate(150%);
              -webkit-backdrop-filter:blur(12px) saturate(150%);
              color:var(--text);font:700 13px/1.2 inherit;cursor:pointer;
              box-shadow:0 8px 28px rgba(0,0,0,.4);
              transition:background .15s,border-color .15s,box-shadow .15s;
            }
            ${p} .tem-dropbtn:hover{background:rgba(32,36,42,.96);border-color:rgba(255,255,255,.2)}
            ${p} .tem-dropbtn:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
            ${p} .tem-dropbtn-icon{
              flex:0 0 auto;width:22px;height:22px;border-radius:7px;
              display:inline-flex;align-items:center;justify-content:center;
              background:linear-gradient(135deg,#7856ff,var(--acc));color:#fff;
            }
            ${p} .tem-dropbtn-icon svg{display:block}
            ${p} .tem-dropbtn-label{white-space:nowrap}
            ${p} .tem-dropbtn-chev{display:inline-flex;color:var(--muted);transition:transform .18s ease}
            ${p} .tem-dropbtn-chev svg{display:block}
            ${p} .tem-dropbtn-chev.tem-chev-up{transform:rotate(180deg);color:var(--acc)}
            ${p}.tem-open .tem-dropbtn{border-color:rgba(29,155,240,.45);box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 0 1px rgba(29,155,240,.15)}

            ${p} .tem-dropdown{
              margin-top:8px;width:min(440px,calc(100vw - 20px));
              max-height:calc(100vh - 64px);overflow:hidden;
              display:flex;flex-direction:column;
              background:rgba(21,24,28,.97);backdrop-filter:blur(14px) saturate(150%);
              -webkit-backdrop-filter:blur(14px) saturate(150%);
              border:1px solid var(--border);border-radius:18px;
              box-shadow:0 18px 50px rgba(0,0,0,.55);
              animation:tem-drop-in .18s ease both;
            }
            ${p} .tem-dropdown[hidden]{display:none!important}
            @keyframes tem-drop-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

            ${p} .tem-header{display:flex;align-items:center;gap:var(--space-3);padding:12px 14px;user-select:none;border-bottom:1px solid var(--border);flex:0 0 auto}
            ${p} .tem-htext{flex:1 1 auto;min-width:0}
            ${p} .tem-htext h2{margin:0;font-size:15px;font-weight:800;letter-spacing:-.2px;line-height:1.25}
            ${p} .tem-sub{font-size:12px;color:var(--muted);font-weight:500;line-height:1.3;margin-top:2px}
            ${p} .tem-iconbtn{flex:0 0 auto;width:32px;height:32px;padding:0;border-radius:50%;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);background:transparent;transition:background .15s,color .15s}
            ${p} .tem-iconbtn svg{display:block;flex:0 0 auto}
            ${p} .tem-iconbtn:hover{background:rgba(255,255,255,.1);color:var(--text)}
            ${p} #tem-close:hover{background:rgba(244,33,46,.15);color:var(--danger)}
            ${p} .tem-tabs{display:flex;align-items:stretch;gap:2px;padding:var(--space-2) var(--space-3) 0;flex:0 0 auto}
            ${p} .tem-tab{flex:1 1 0;min-width:0;min-height:36px;padding:8px 4px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--muted);font-size:12px;font-weight:700;line-height:1.2;cursor:pointer;font-family:inherit;border-radius:8px 8px 0 0;transition:color .15s,background .15s,border-color .15s;display:inline-flex;align-items:center;justify-content:center;text-align:center}
            [data-tem-geo-hidden="1"],[data-tem-like-hidden="1"]{display:none!important}
            ${p} .tem-tab:hover{color:var(--text);background:rgba(255,255,255,.05)}
            ${p} .tem-tab.tem-active{color:var(--acc);border-bottom-color:var(--acc)}
            ${p} .tem-body{padding:var(--space-5);overflow-y:auto;flex:1 1 auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent;min-height:0}
            ${p} .tem-body::-webkit-scrollbar{width:8px}
            ${p} .tem-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:8px}
            ${p} .tem-pane{display:none}
            ${p} .tem-pane.tem-active{display:block}
            ${p} .tem-section{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);margin-bottom:var(--space-4)}
            ${p} .tem-section:last-child{margin-bottom:0}
            ${p} .tem-section h4,${p} .tem-subhead{margin:0 0 var(--space-2);font-size:14px;font-weight:700;line-height:1.3;color:var(--text)}
            ${p} .tem-subhead{margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--border)}
            ${p} .tem-section > p{margin:0 0 var(--space-3);font-size:13px;color:var(--muted);line-height:1.45}
            ${p} .tem-section ul{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--muted)}
            ${p} .tem-section li{margin:4px 0}
            ${p} .tem-label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin:0 0 var(--space-2);letter-spacing:.01em}
            ${p} .tem-input + .tem-label,${p} .tem-btns + .tem-label,${p} .tem-status + .tem-label,${p} .tem-note + .tem-label,${p} select.tem-input + .tem-label{margin-top:var(--space-4)}
            ${p} .tem-section > .tem-label:first-child,${p} .tem-subhead + .tem-label{margin-top:0}
            ${p} .tem-input{display:block;width:100%;min-height:var(--control-h);padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:rgba(0,0,0,.28);color:var(--text);font-size:14px;line-height:1.3;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s}
            ${p} textarea.tem-input{min-height:72px;resize:vertical;line-height:1.4}
            ${p} select.tem-input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:32px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b98a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
            ${p} select.tem-input option{background:#15181c;color:var(--text)}
            ${p} .tem-input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(29,155,240,.22)}
            ${p} .tem-check{display:flex;align-items:flex-start;gap:10px;margin:0;padding:var(--space-2) 0;font-size:13px;color:var(--muted);cursor:pointer;line-height:1.4}
            ${p} .tem-stats + .tem-check{margin-top:var(--space-1)}
            ${p} .tem-check + .tem-check{margin-top:0}
            ${p} .tem-check input{flex:0 0 auto;width:16px;height:16px;margin:2px 0 0;padding:0;accent-color:var(--acc);cursor:pointer}
            ${p} .tem-check strong{color:var(--text);font-weight:700}
            ${p} .tem-btns{display:flex;flex-wrap:wrap;align-items:stretch;gap:var(--space-2);margin-top:var(--space-3);width:100%}
            ${p} .tem-stats + .tem-btns,${p} .tem-check + .tem-btns,${p} .tem-input + .tem-btns,${p} select.tem-input + .tem-btns,${p} p + .tem-btns,${p} .tem-note + .tem-btns{margin-top:var(--space-3)}
            ${p} .tem-btns + .tem-btns{margin-top:var(--space-2)}
            ${p} .tem-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1 1 0;min-width:0;min-height:var(--btn-h);width:auto;margin:0;padding:8px 12px;border-radius:var(--radius-pill);border:1px solid transparent;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;line-height:1.25;text-align:center;white-space:normal;transition:background .15s,border-color .15s,color .15s,opacity .15s;vertical-align:middle}
            ${p} .tem-btns > .tem-btn{flex:1 1 calc(50% - 4px);max-width:100%}
            ${p} .tem-btns > .tem-btn:only-child{flex:1 1 100%}
            ${p} .tem-btn-primary{background:var(--acc);color:#fff;border-color:var(--acc)}
            ${p} .tem-btn-primary:hover:not([disabled]){background:#1a8cd8;border-color:#1a8cd8}
            ${p} .tem-btn-ghost{background:rgba(255,255,255,.03);border-color:var(--border);color:var(--text)}
            ${p} .tem-btn-ghost:hover:not([disabled]){background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}
            ${p} .tem-btn-danger{background:rgba(244,33,46,.06);border-color:rgba(244,33,46,.45);color:var(--danger)}
            ${p} .tem-btn-danger:hover:not([disabled]){background:rgba(244,33,46,.14)}
            ${p} .tem-btn[disabled]{opacity:.45;cursor:not-allowed}
            ${p} a{color:var(--acc);text-decoration:none}
            ${p} a:hover{text-decoration:underline}
            ${p} .tem-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2);margin:0 0 var(--space-4);align-items:stretch}
            ${p} .tem-stats-4{grid-template-columns:repeat(4,minmax(0,1fr))}
            ${p} .tem-stat{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:64px;background:rgba(0,0,0,.18);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 6px;text-align:center}
            ${p} .tem-stat-v{font-size:20px;font-weight:800;color:var(--acc);font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:-.02em}
            ${p} .tem-stat-l{font-size:10px;color:var(--muted);margin-top:4px;line-height:1.25;font-weight:600;letter-spacing:.02em}
            ${p} .tem-status{display:flex;align-items:center;justify-content:center;text-align:center;min-height:36px;padding:8px 12px;border-radius:var(--radius-sm);font-size:12px;font-weight:700;line-height:1.3;margin-top:var(--space-3)}
            ${p} .tem-status.run{background:rgba(23,191,99,.18);color:var(--ok)}
            ${p} .tem-status.pause{background:rgba(247,147,26,.18);color:var(--warn)}
            ${p} .tem-status.stop{background:rgba(244,33,46,.18);color:var(--danger)}
            ${p} .tem-status.idle{background:rgba(255,255,255,.06);color:var(--muted)}
            ${p} .tem-now{background:rgba(29,155,240,.1);border:1px solid rgba(29,155,240,.3);border-radius:var(--radius-sm);padding:10px 12px;margin:var(--space-3) 0 0;font-size:13px;line-height:1.4;text-align:center}
            ${p} .tem-note{font-size:12px;color:var(--muted);margin:var(--space-3) 0 0;line-height:1.5}
            ${p} .tem-btns + .tem-note{margin-top:var(--space-3)}
            ${p} .tem-warn-box{background:rgba(247,147,26,.12);border:1px solid rgba(247,147,26,.35);color:#ffd9a8;border-radius:var(--radius-sm);padding:10px 12px;font-size:13px;line-height:1.45;margin:0 0 var(--space-4)}
            ${p} .tem-foot{margin-top:var(--space-3);padding-top:var(--space-2);text-align:center;font-size:11px;color:var(--muted);line-height:1.3}
            ${p} .tem-f-list{max-height:280px;overflow:auto;margin-top:var(--space-2)}
            ${p} .tem-f-table{width:100%;border-collapse:collapse;font-size:12px}
            ${p} .tem-f-table th{position:sticky;top:0;background:#1a1d22;text-align:left;padding:8px 6px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)}
            ${p} .tem-f-table td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:middle}
            ${p} .tem-f-num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
            ${p} .tem-f-rank{color:var(--muted);width:28px}
            ${p} .tem-f-loc{color:var(--muted);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            ${p} .tem-f-tag{display:inline-block;margin-left:4px;padding:1px 6px;border-radius:var(--radius-pill);font-size:10px;line-height:1.3;vertical-align:middle;background:rgba(29,155,240,.15);color:var(--acc)}
            ${p} .tem-log{max-height:180px;overflow:auto;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:rgba(0,0,0,.25);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);margin-top:var(--space-2)}
            ${p} .tem-log div{padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);line-height:1.35}
            @media (max-width:480px){
              ${p}{top:8px;left:10px;right:10px;transform:none;width:auto;max-width:none;align-items:stretch}
              ${p} .tem-dropbtn{width:100%;justify-content:center}
              ${p} .tem-dropdown{width:100%}
              ${p} .tem-btns > .tem-btn{flex:1 1 100%}
              ${p} .tem-stats-4{grid-template-columns:repeat(2,minmax(0,1fr))}
              ${p} .tem-tab{font-size:11px;padding:8px 2px}
            }
            </style>`;
        },

        el(id) { return document.getElementById(id); }
    };
