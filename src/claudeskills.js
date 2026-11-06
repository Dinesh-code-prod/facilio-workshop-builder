/* Claude skills: small add-ons the team can install in their own Claude (Claude Desktop, claude.ai or Claude Code) so it does better work on user guides, videos,
   spreadsheets and code questions. They live in this app (public/skills, one ZIP each; the source folders are in the repo under /skills). Every prompt that asks Claude
   for something names these skills and says to carry on without them if they are not installed. This panel helps people install them: ZIPs, a terminal command for Mac
   or Windows with a folder they can choose, and the source of each skill. Nothing here calls Claude or installs anything by itself. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  // [name, what it does, where it comes from (empty = made for this team)]
  const SKILLS = [
    ['facilio-solution-document-builder', 'Builds the client-ready Solution Document (Word) of a Facilio org from its package ZIP: every module explained, with flows, fields, automations and role access, and a check that nothing is missed. Used on the Handover page.', ''],
    ['guidebook-builder', 'Writes a paired User Guide and Admin Guide for any product feature, in a fixed structure and tone, from your notes, a Notion page or a description.', ''],
    ['video-to-user-guide', 'Turns a recorded walkthrough (and what was said in it) into accurate step-by-step guide text.', ''],
    ['demo-video', 'Plans and builds a product demo video: scenes, screen recordings, voice-over and final render.', 'https://github.com/Leihyn/claude-demo-video-skill'],
    ['ui-mockup-video', 'Builds an animated product screen from screenshots, with cursor moves, typing and clicks, and renders it as a video.', ''],
    ['video-editing', 'Cuts footage and assembles clips into one video.', 'https://github.com/notque/vexjoy-agent'],
    ['remotion-create', 'Starts a new video project in Remotion.', 'https://github.com/remotion-dev/skills'],
    ['remotion-captions', 'Adds and animates captions (the words shown on screen).', 'https://github.com/remotion-dev/skills'],
    ['remotion-multimedia', 'Brings video, audio and images into a Remotion video.', 'https://github.com/remotion-dev/skills'],
    ['remotion-render', 'Exports the finished video file.', 'https://github.com/remotion-dev/skills'],
    ['graphify', 'Turns a folder of code or documents into a knowledge graph, so questions about a project are answered from the graph.', 'https://github.com/graphify-labs/graphify'],
    ['excel-analysis', 'Reads and analyses spreadsheets: pivot tables, charts and summaries.', ''],
    ['brag', 'Turns a project website into a short, shareable launch video.', 'https://github.com/latent-spaces/brag']
  ];
  // the line added to every prompt that asks Claude for something (the server adds the same line to every Claude prompt it builds)
  V.skillsPromptLine = 'SKILLS (optional): if your Claude has these skills installed, use them where they fit: facilio-solution-document-builder (the Solution Document of an org from its package ZIP), guidebook-builder (a User Guide and an Admin Guide for a feature), excel-analysis (spreadsheets and .xlsx files), video-to-user-guide (steps from a recorded walkthrough), demo-video, ui-mockup-video, video-editing and the remotion skills (building and rendering a video), brag (a short launch video of a project website), graphify (how a codebase or a set of documents fits together). If a skill is not installed, carry on without it. Whatever you use, keep the reply format this prompt asks for.';
  V.skillsNote = () => `<div class="notice" style="margin:10px 0"><span><b>Tip:</b> add a few skills to your Claude and it does better work here. <button type="button" class="btn sm" data-act="skillsHelp">Install the skills</button></span></div>`;

  const base = () => new URL('skills/', root.location.href).href;
  const sel = () => SKILLS.map(s => s[0]).filter(n => { const c = document.querySelector('input[data-change="skillsPick"][data-n="' + n + '"]'); return !c || c.checked; });
  const dirOf = os => { const i = document.getElementById(os === 'mac' ? 'sk_mac' : 'sk_win'); return ((i && i.value) || '').trim(); };
  function commands() {
    const names = sel(), url = base();
    if (!names.length) return { mac: 'Pick at least one skill above.', win: 'Pick at least one skill above.' };
    let m = dirOf('mac') || '~/.claude/skills'; m = m.replace(/^~(?=\/|$)/, '$HOME').replace(/"/g, '');
    const w = (dirOf('win') || '%USERPROFILE%\\.claude\\skills').replace(/%USERPROFILE%/gi, '$env:USERPROFILE').replace(/"/g, '');
    const mac = `DEST="${m}"\nmkdir -p "$DEST"\nfor s in ${names.join(' ')}; do\n  curl -fsSL "${url}$s.zip" -o "/tmp/$s.zip" && unzip -oq "/tmp/$s.zip" -d "$DEST" && echo "Installed $s"\ndone`;
    const win = `$d = "${w}"\nNew-Item -ItemType Directory -Force $d | Out-Null\nforeach ($s in ${names.map(n => `'${n}'`).join(', ')}) {\n  $z = "$env:TEMP\\$s.zip"\n  Invoke-WebRequest "${url}$s.zip" -OutFile $z\n  Expand-Archive $z -DestinationPath $d -Force\n  "Installed $s"\n}`;
    return { mac, win };
  }
  function paint() { const c = commands(); const a = document.getElementById('sk_c_mac'), b = document.getElementById('sk_c_win'); if (a) a.textContent = c.mac; if (b) b.textContent = c.win; }
  ACT.skillsPick = paint; ACT.skillsDir = paint;
  ACT.skillsCopy = async el => { const t = (document.getElementById('sk_c_' + el.getAttribute('data-os')) || {}).textContent || ''; try { await navigator.clipboard.writeText(t); V.toast('Command copied. Paste it into the terminal and press Enter.'); } catch (e) { V.toast('Copy was blocked. Select the command and copy it by hand.', 5000); } };
  ACT.skillsHelp = () => {
    V.drawer('Install the skills in your Claude', `<p class="small" style="margin-top:0">Skills are small add-ons that teach Claude how to do a job well: user guides, videos, spreadsheets and understanding a codebase. You install them once in your own Claude. Delivery Studio does not install anything for you and works without them, only with less polish.</p>
    <h4 style="margin:14px 0 6px">1. Choose the skills</h4>
    <div class="tg2-grid">${SKILLS.map(([n, d, src]) => `<label class="tg2-tile" style="cursor:pointer"><span class="row" style="gap:8px;align-items:center"><input type="checkbox" checked data-change="skillsPick" data-n="${esc(n)}"><b>${esc(n)}</b></span><span>${esc(d)}</span><span class="row" style="gap:6px;flex-wrap:wrap"><a class="btn sm" href="skills/${esc(n)}.zip" download>Download ZIP</a>${src ? `<a class="btn sm" href="${esc(src)}" target="_blank" rel="noopener noreferrer">Source on GitHub</a>` : '<span class="xs muted">Made for this team</span>'}</span></label>`).join('')}</div>
    <h4 style="margin:16px 0 6px">2. Install</h4>
    <p class="small" style="margin:0 0 8px"><b>Claude Desktop or claude.ai:</b> download the ZIPs above, open <b>Customize</b>, then <b>Skills</b>, and upload each ZIP.</p>
    <p class="small" style="margin:0 0 8px"><b>Claude Code, or any folder you want:</b> open a terminal, paste the command for your computer and press Enter. It downloads the chosen skills from this app and unpacks them into the folder. Change the folder if you like.</p>
    <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-start">
      <div style="flex:1;min-width:290px"><label class="f">Mac or Linux (Terminal)</label><input type="text" id="sk_mac" value="~/.claude/skills" data-change="skillsDir" aria-label="Folder on Mac or Linux"><pre id="sk_c_mac" style="white-space:pre-wrap;word-break:break-all;background:#0f1d3a;color:#e6edff;padding:10px;border-radius:8px;font-size:12px;margin:8px 0"></pre><button type="button" class="btn sm" data-act="skillsCopy" data-os="mac">Copy command</button></div>
      <div style="flex:1;min-width:290px"><label class="f">Windows (PowerShell)</label><input type="text" id="sk_win" value="%USERPROFILE%\\.claude\\skills" data-change="skillsDir" aria-label="Folder on Windows"><pre id="sk_c_win" style="white-space:pre-wrap;word-break:break-all;background:#0f1d3a;color:#e6edff;padding:10px;border-radius:8px;font-size:12px;margin:8px 0"></pre><button type="button" class="btn sm" data-act="skillsCopy" data-os="win">Copy command</button></div>
    </div>
    <p class="xs muted" style="margin:6px 0 0">If the download fails (for example a company login sits in front of this app), download the ZIPs above and unzip them into the folder by hand. Each skill is one folder with a SKILL.md inside.</p>
    <h4 style="margin:16px 0 6px">3. Check it worked, then carry on</h4>
    <ol class="small" style="line-height:1.7;margin:0"><li>Close Claude and open it again.</li><li>Ask Claude: <i>Which skills do you have?</i> The ones you installed should be listed.</li><li>Go back to Delivery Studio and use <b>Open in Claude</b> as usual. Every prompt already names these skills, so Claude uses them where they fit, and carries on without any that are missing.</li></ol>
    <p class="xs muted" style="margin-top:12px">More skills: <a href="https://www.skills.sh" target="_blank" rel="noopener noreferrer">skills.sh</a>. For a video, attach your recorded screen video to the Claude chat yourself; very large recordings (over a few hundred MB) are better trimmed first.</p>`, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>', { wide: true });
    paint();
  };
})(typeof window !== 'undefined' ? window : globalThis);
