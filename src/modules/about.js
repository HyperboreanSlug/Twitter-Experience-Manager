/**
 * @module about
 * @see docs/modules/about.md
 */
    const About = {
        render() {
            UI.el('tem-pane-about').innerHTML = `
              <div class="tem-section">
                <h4>Twitter Experience Manager</h4>
                <p>A modular usability toolkit for X.com — same packaging style as Tweepcred Manager (console paste + Greasemonkey), focused on network hygiene and timeline control.</p>
                <ul>
                  <li><strong>Followers</strong> — snapshot who follows you; sort Following by each account's following count.</li>
                  <li><strong>Geo Guard</strong> — <strong>soft-hide</strong> (and optionally block) timeline posts by region needles (defaults: India + South Asia).</li>
                  <li><strong>Notifs</strong> — hide “liked your post” rows on the notifications page (client-side).</li>
                </ul>
              </div>
              <div class="tem-section">
                <h4>Install (Violentmonkey)</h4>
                <p>Open <code>dist/twitter-experience-manager.user.js</code> in Violentmonkey (or use “Install from URL” with the raw GitHub file). Metadata uses <code>@grant none</code>, <code>@inject-into page</code>, <code>@run-at document-idle</code>, <code>@noframes</code> — same bundle works as a console paste.</p>
              </div>
              <div class="tem-section">
                <h4>Modular source</h4>
                <p>Each feature is a file under <code>src/modules/</code> with docs in <code>docs/modules/</code>. Rebuild: <code>node scripts/build.js</code>.</p>
              </div>
              <div class="tem-section">
                <h4>Related</h4>
                <p>Reputation tooling lives in <strong>Tweepcred Manager</strong>. This project reuses the Followers tracker concept and shared dual-mode architecture.</p>
              </div>
              <div class="tem-warn-box">Automating X violates its Terms of Service. Region filters use self-reported text only. Prefer soft-hide over live block. At your own risk.</div>
              <div class="tem-foot">Twitter Experience Manager v${Core.version}</div>`;
        }
    };
