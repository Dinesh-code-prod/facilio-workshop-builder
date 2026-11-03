/* Open in Claude: the ONE engine behind every Claude button in Delivery Studio (rules in src/claudelogic.js, server side in /api/projects/:id/handoff).
   What a click does:
   1. builds the task prompt (the page's own server route prepares it from this project's records) and puts the common header on it;
   2. Claude Desktop with the Delivery Studio extension installed: stores ONE hand-off package (prompt, pictures, documents, the expected answer) on the server, opens Claude Desktop
      with a SHORT prompt that carries only the signed reference, and then waits for Claude's answer to arrive through the extension (no pasting);
   3. Claude Desktop without the extension, and Claude on the web: the full prompt goes in the link when it fits (never silently cut); otherwise it is copied and the page says so.
      A picture goes to the clipboard as PNG: a web page cannot attach a file to another site, so pasting it (Ctrl+V) is the one manual step, and the page says so;
   4. the answer, however it arrives (extension, pasted reply, file), goes through the same checks as always and shows a preview before anything is saved.
   No Anthropic API key is used anywhere: Claude does the work in the person's own subscription. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const L = root.FWBClaude; const { drawer, closeDrawer, toast } = V;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const hasConn = () => ls.get('fwb_claude_conn') === '1';
  const CONN_URL = 'https://mcp.facilio.work/facilio-delivery-studio';
  const copyText = async t => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } };
  const copyImg = blob => (blob && navigator.clipboard && window.ClipboardItem ? navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => true, () => false) : Promise.resolve(false));
  const dl = (blob, name) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  const setStatus = (t, bad) => { const el = document.getElementById('hoStatus'); if (el) { el.textContent = t; el.className = 'notice small' + (bad ? ' warn' : ''); el.hidden = false; } };
  const b64 = async blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
  const meta = o => ({ project: S.project && S.project.name, customer: S.project && S.project.customer, page: (document.querySelector('.page-header h1') || {}).textContent || S.ui.view, module: o.module || '', title: o.title, destination: o.destination });

  // the signed hand-off package for this click (only with the extension on, and only when it is needed: pictures or documents, or a prompt too long for a link)
  async function makePackage(o, full) {
    const files = []; for (const f of (o.files || [])) files.push({ name: f.name, mime: f.mime, data: await b64(f.blob), text: f.text || '' });
    const r = await API.post(`/api/projects/${S.project.id}/handoff`, { title: o.title, task: o.task || 'task', module: o.module || '', view: S.ui.view || '', page: String(meta(o).page || '').trim().slice(0, 80), prompt: full, context: o.context || '', expect: o.expect || { format: 'text' }, files });
    return r;
  }
  // everything the page needs after a click: { full, ref (or ''), link, mode }
  async function prepare(o, dest) {
    const full = L.wrap(o.prompt, meta(o));
    // with the connector added in Claude, the prompt only carries the hand-off id (pictures cannot travel through the connector, so a task with a picture uses the extension or the clipboard)
    if (hasConn() && dest !== 'copy' && !o.noConn && !(o.files || []).some(f => /^image\//.test(f.mime))) { try { const r = await makePackage(o, full); return { full, ref: r.id, id: r.id, expires: r.expires, conn: true }; } catch (e) { toast((e.message || 'The hand-off could not be prepared') + ' Falling back to a copied prompt.', 7000, true); return { full, ref: '', id: '', failed: true }; } }
    return { full, ref: '', id: '' };
  }

  // ---------- the launcher every button uses ----------
  // o: { title, task, module, prompt, files:[{name,mime,blob,text}], expect:{format,note,schema}, context }  dest: 'desktop' | 'web' | 'copy'
  V.claudeNav = u => { window.location.href = u; };   // one place that hands a claude:// link to the operating system
  V.claudeLaunch = async (o, dest) => {
    const p = await prepare(o, dest); const full = p.full; let said = '';
    if (dest === 'copy') { const ok = await copyText(full); window.open('https://claude.ai/new', '_blank', 'noopener'); return { ok, prefilled: false, ref: '', said: ok ? 'The prompt is copied. In Claude, click the message box and press Ctrl+V.' : 'This browser blocked copying. Use Copy the prompt.' }; }
    if (p.conn) { const mm = meta(o); const lk = L.link(dest === 'desktop' ? 'desktop' : 'web', L.connPrompt(o.title, p.id, { project: mm.project, page: String(mm.page || '').trim() })); if (dest === 'desktop') V.claudeNav(lk.href); else window.open(lk.href, '_blank', 'noopener'); return { ok: true, prefilled: lk.prefilled, ref: p.ref, id: p.id, expires: p.expires, said: 'Claude was opened with a short prompt that uses the Facilio Delivery Studio connector. Press Enter to send it. Claude reads the task from Delivery Studio and the answer arrives here by itself.' }; }
    const lk = L.link(dest === 'desktop' ? 'desktop' : 'web', full); let copied = false; if (!lk.prefilled) copied = await copyText(full);
    if (dest === 'desktop') V.claudeNav(lk.href); else window.open(lk.href, '_blank', 'noopener');
    said = lk.prefilled ? 'Claude was opened with the prompt in the message box (if the box is empty, use Copy the prompt and paste it).' : copied ? 'The prompt is too long to put in a link without losing part of it, so it is copied: in Claude click the message box and press Ctrl+V.' : 'The prompt is too long for a link and this browser blocked copying: use Copy the prompt.';
    if (dest === 'desktop') said += ' If Claude Desktop did not open, it is not installed or links from this browser are blocked; use Open Claude Web.';
    if (o.files && o.files.length) said += ' The picture or files cannot go through the connector: use Copy the image and paste it in Claude.';
    return { ok: true, prefilled: lk.prefilled, copied, ref: '', said };
  };
  // the simple case for the buttons that only need the prompt opened: copy it, open Claude with it where it fits, say what happened
  V.claudeOpenSimple = async (prompt, o) => { o = Object.assign({ title: 'Task' }, o || {}); const r = await V.claudeLaunch(Object.assign({}, o, { prompt, noConn: true }), o.dest || 'web'); return r; };

  let HO = null; let poll = null;
  const stopPoll = () => { if (poll) { clearInterval(poll); poll = null; } };
  function startPoll(r) { stopPoll(); if (!r.id || !HO) return; const id = r.id; const until = Date.parse(r.expires) || Date.now() + 3600e3;
    poll = setInterval(async () => {
      if (!document.getElementById('hoR') || !HO || Date.now() > until) { stopPoll(); return; }
      try { const g = await API.get(`/api/projects/${S.project.id}/handoff/${id}`); if (g.status === 'done') { stopPoll(); const box = document.getElementById('hoR'); if (box) box.value = g.result; setStatus('Claude\'s answer arrived. Checking it now.'); await bringBack(); } }
      catch (e) { stopPoll(); setStatus(e.message || 'The hand-off ended.', true); } }, 4000); }
  async function bringBack() {
    if (!HO) return; const reply = (document.getElementById('hoR') || {}).value || ''; if (!reply.trim()) { toast('Paste Claude\'s reply first', 4000, true); return; }
    try { const r = await API.post(HO.replyUrl || HO.url, HO.replyBody ? HO.replyBody(reply) : Object.assign({}, HO.body, { reply })); const f = HO.onReply; if (!HO.into) closeDrawer(); HO = null; stopPoll(); if (f) await f(r); } catch (e) { toast(e.message || 'Could not read the reply', 6000, true); setStatus((e.message || 'Could not read the reply') + ' You can correct it in the box and press Bring the reply back.', true); } }

  // ---------- the panel (used by every button that brings an answer back into a step) ----------
  // o: { title, url, body, task, module, expect, files, image (PNG blob, for the clipboard), prompt (ready-made), skipPack, extra, into, autoOpen, onReply(result) }
  V.claudeHandoff = async o => {
    try {
      const r = o.skipPack ? { prompt: '', title: o.title } : o.prompt ? { prompt: o.prompt, title: o.title } : await API.post(o.url, Object.assign({}, o.body, { claudePack: true }));
      const files = (o.files || []).slice(); if (o.image && !files.length) files.unshift({ name: 'flow-diagram.png', mime: 'image/png', blob: o.image });
      HO = Object.assign({}, o, { prompt: r.prompt, name: r.title || o.title, files, image: o.image || (files.find(f => /^image\//.test(f.mime)) || {}).blob || null }); stopPoll();
      const hasFiles = !o.skipPack && files.length > 0;
      const conn = `<label class="chk small" style="margin:6px 0;display:flex;gap:8px"><input type="checkbox" data-change="hoConn"${hasConn() ? ' checked' : ''}> <span><b>I added the Facilio Delivery Studio connector in Claude</b> (Claude > Settings > Connectors > Add custom connector, name it Facilio Delivery Studio, paste <code>${CONN_URL}</code> and sign in with your Facilio account). Works in Claude on the web, the desktop app and the phone, with nothing to download.</span></label>`;
      const ext = conn + '<div id="hoConnSt" class="xs muted" style="margin:0 0 8px"></div>';
      const what = hasFiles && o.task === 'flow-image' ? `<p class="small" style="margin:0 0 8px"><b>What Claude is asked to do:</b> read the picture, list every shape, label, decision and arrow, work out the order and direction and the branches, and answer with JSON that Process Whiteboard can read back. Nothing is added to the board until you check it.</p>` : '';
      const row = o.skipPack ? '' : `<div class="row" style="gap:8px;margin:8px 0;flex-wrap:wrap"><button type="button" class="btn sm primary" data-act="hoGo" data-d="web">Open Claude Web</button><button type="button" class="btn sm" data-act="hoGo" data-d="desktop">Open Claude Desktop</button><button type="button" class="btn sm" data-act="hoGo" data-d="copy">Copy Prompt and Open Claude</button></div>
        <div class="row" style="gap:8px;margin:0 0 8px;flex-wrap:wrap">${HO.image ? '<button type="button" class="btn sm" data-act="hoImg">Copy the image</button><button type="button" class="btn sm" data-act="hoDl">Download the image</button>' : ''}<button type="button" class="btn sm" data-act="hoCopy">Copy the prompt</button><button type="button" class="btn sm" data-act="hoDlP">Download the prompt (.md)</button></div>${ext}<div id="hoStatus" class="notice small" hidden></div>${V.skillsNote && !hasFiles ? V.skillsNote() : ''}`;
      const html = (o.skipPack ? `<div class="notice"><span>Paste the whole reply Claude gave you here.</span></div>` : `<p class="small muted" style="margin:0 0 6px">${esc(o.extra || '')}</p>`) + what + row + `<label class="f" for="hoR" style="margin-top:6px">Claude's reply</label><textarea id="hoR" rows="8" placeholder="Claude's answer arrives here by itself with the extension; otherwise paste it here"></textarea><div class="row" style="gap:8px;margin-top:8px"><button type="button" class="btn sm primary" data-act="hoBack">Bring the reply back</button></div>`;
      const into = o.into && document.getElementById(o.into); if (into) into.innerHTML = html; else drawer((r.title || o.title || 'Use your own Claude'), html, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button>', { wide: true });
      V.claudeConnCheck(); if (o.autoOpen && !o.skipPack) ACT.hoGo({ getAttribute: () => 'web' });
    } catch (e) { toast(e.message || 'Could not prepare the prompt', 6000, true); } };
  ACT.hoGo = a => { if (!HO || !HO.prompt) return; const d = a.getAttribute('data-d'); const img = HO.image; const o = { title: HO.name || HO.title, task: HO.task, module: HO.module, context: HO.context, expect: HO.expect || (HO.task === 'flow-image' || HO.task === 'flow-text' ? { format: 'json', note: 'Delivery Studio flow shape', schema: L.FLOW_SHAPE } : { format: 'text' }), files: HO.files, prompt: HO.prompt };
    const fitsLink = L.fits(d === 'desktop' ? 'desktop' : 'web', L.wrap(HO.prompt, meta(o)));   // when the prompt is copied instead, the clipboard is the prompt's, so the picture is copied with its own button
    const imgP = img && d !== 'copy' && fitsLink ? copyImg(img) : Promise.resolve(null);   // started inside the click
    V.claudeLaunch(o, d).then(async r => { const okImg = await imgP; let t = r.said;
      if (img && !r.ref && d !== 'copy') t += okImg === true ? ' The picture is on your clipboard: click the message box and press Ctrl+V once more to attach it. A web page cannot attach the file for you.' : okImg === false ? ' This browser did not let the page copy the picture, so use Download the image and attach it with the paperclip.' : ' The clipboard holds the prompt, so use Copy the image next and paste it as well, or Download the image.';
      setStatus(t, !r.ok || okImg === false); if (r.id) startPoll(r); else if (!r.prefilled && r.ok) toast(d === 'copy' || r.copied ? 'Prompt copied. In Claude, click the message box and press Ctrl+V, then send.' : 'Claude opened without the prompt. Use Copy the prompt, then paste it in Claude.', 9000); }); };
  ACT.hoImg = async () => { if (!HO || !HO.image) return; const ok = await copyImg(HO.image); setStatus(ok ? 'The picture is on your clipboard. In the Claude chat, click the message box and press Ctrl+V.' : 'This browser did not let the page copy the picture. Use Download the image and attach it with the paperclip.', !ok); };
  ACT.hoDl = () => { if (HO && HO.image) dl(HO.image, 'flow-diagram.png'); };
  ACT.hoCopy = async () => toast((await copyText(L.wrap((HO || {}).prompt || '', meta({ title: (HO || {}).name })))) ? 'Prompt copied' : 'Copy was blocked', 3000);
  ACT.hoDlP = () => { if (HO && HO.prompt) dl(new Blob([L.wrap(HO.prompt, meta({ title: HO.name }))], { type: 'text/markdown' }), String(HO.name || 'prompt').replace(/[^\w-]+/g, '_') + '_prompt.md'); };
  ACT.hoBack = a => V.busy(a, bringBack);
  // the same three ways to open Claude for the screens that keep their own reply box (the prompt is set by the screen before it draws these)
  V.claudeQuick = null;
  V.claudeQuickLinks = () => '<button type="button" class="btn sm primary" data-act="clqGo" data-d="web">Open Claude Web</button><button type="button" class="btn sm" data-act="clqGo" data-d="desktop">Open Claude Desktop</button><button type="button" class="btn sm" data-act="clqGo" data-d="copy">Copy Prompt and Open Claude</button>';
  ACT.clqGo = a => { const q = V.claudeQuick; if (!q || !q.prompt) return; V.claudeLaunch({ title: q.title || 'Task', task: q.task || 'task', prompt: q.prompt, expect: { format: 'text' }, noConn: true }, a.getAttribute('data-d')).then(r => toast(r.said, 8000)); };
  // the server notes when this person's Claude last used the connector: that, not the tick box, shows whether it is really added (a seen connector also turns the tick on)
  V.claudeConnCheck = async () => { try { const r = await API.get('/api/me/connector'); if (r.seen) ls.set('fwb_claude_conn', '1'); const el = document.getElementById('hoConnSt'); if (el) el.innerHTML = r.seen ? '&#10003; Your Claude used the connector on ' + esc(new Date(r.seen).toLocaleDateString()) + '.' : '<b>Not seen yet.</b> Add the connector first (Help &gt; Claude setup). Until then Open Claude copies the full prompt.'; return !!r.seen; } catch (e) { return null; } };
  ACT.hoConn = el => { ls.set('fwb_claude_conn', el.checked ? '1' : '0'); toast(el.checked ? 'Open Claude will now send the short connector prompt' : 'Open Claude will send the full prompt', 4000); };
  // where to get the extension and how to install it: one text, shown in Project Settings > Claude Desktop extension and from every Open in Claude panel
  // Project Settings > Claude connection: this project's id, the connector address and ready-made lines for Claude Code and Claude Desktop, each with a copy button
  const cp = (label, val) => `<div style="margin:6px 0"><div class="xs muted">${esc(label)}</div><div class="row" style="gap:8px;align-items:flex-start"><code style="flex:1;white-space:pre-wrap;word-break:break-all;background:#f4f7fd;border:1px solid #e3e9f5;border-radius:8px;padding:8px 10px;font-size:12px">${esc(val)}</code><button type="button" class="btn sm" data-act="hoCopyVal" data-val="${esc(val)}">Copy</button></div></div>`;
  V.claudeProjectHtml = () => { const pr = S.project || {}; const id = pr.id || ''; const start = 'Use the Facilio Delivery Studio connector. Work on the project "' + (pr.name || '') + '" (id ' + id + '). Call connector_help if you are unsure what you can do, then project_overview, then help me with: ';
    return `<p class="small" style="margin-top:0">Connect your own Claude to <b>this project</b>. Claude can then read its requirements, open questions and use cases, take the same task packs as Open in Claude, and save finished drafts back here as <b>unapproved drafts</b>. It runs as you, with your project access, and uses your own Claude plan (no API key).</p>
      ${cp('Project name', pr.name || '')}${cp('Project ID', id)}${cp('Connector address', CONN_URL)}
      <h4 style="margin:14px 0 6px">Claude Code (terminal)</h4>${cp('Run once', 'claude mcp add --transport http facilio-delivery-studio ' + CONN_URL)}<div class="xs muted">Then run <code>/mcp</code> in Claude Code and choose to sign in with your Facilio account.</div>
      <h4 style="margin:14px 0 6px">Claude Desktop and Claude on the web</h4><ol class="small" style="line-height:1.7;margin:0 0 6px"><li>Settings > Connectors > Add custom connector. Name: Facilio Delivery Studio. Address: the one above.</li><li>Sign in with your Facilio account.</li></ol><div class="xs muted">On a Claude Team or Enterprise plan the Add custom connector button only shows when an owner of your Claude organisation has allowed custom connectors. If you do not see it, ask them, or use Claude Code.</div>
      <h4 style="margin:14px 0 6px">Start a chat about this project</h4>${cp('Paste this as your first message, then say what you need', start)}
      <label class="chk" style="display:flex;gap:8px;margin:12px 0 0"><input type="checkbox" data-change="hoConn"${hasConn() ? ' checked' : ''}> <span>I added the connector. Open in Claude then sends one short line instead of the whole prompt.</span></label><div id="hoConnSt" class="xs muted" style="margin:6px 0 0"></div>`; };
  ACT.hoCopyVal = async a => toast((await copyText(a.getAttribute('data-val') || '')) ? 'Copied' : 'Copy was blocked by the browser', 2500);
  V.claudeExtOn = hasConn;
})(typeof window !== 'undefined' ? window : globalThis);
