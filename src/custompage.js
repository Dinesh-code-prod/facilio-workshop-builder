/* Custom pages (Tabs & Layouts): a page the team builds itself from blocks, with mini tabs inside it.
   A page is { id, label, group, tabs: [{ id, label, blocks: [{ id, type, ... }] }] }; a page written before this existed has only a text body and shows as one tab with one text block.
   Blocks: text, buttons and links, live numbers from the project records, a checklist, a table, an Ask Claude button (goes through the connector queue), and an embedded Facilio tool or video.
   The pure part (cleaning and limits) is exported as FWBCustomPage and tested in tests/custompage.mjs; everything the team types is cleaned here and escaped again when drawn. */
(function (root) {
  'use strict';
  const BLOCKS = { text: 'Text', links: 'Buttons and links', numbers: 'Live numbers', checklist: 'Checklist', table: 'Table', ask: 'Ask Claude button', embed: 'Facilio tool or video' };
  const METRICS = { open: 'Open tasks', overdue: 'Overdue tasks', done: 'Done tasks', progress: 'Progress against plan', golive: 'Go-live date', stage: 'Current stage', risks: 'Open risks' };
  const EMBED_HOSTS = ['support-desk.facilio.run', 'meteor.facilio.work', 'comet.facilio.work', 'facilio.com', 'www.facilio.com', 'facilio.run'];   // the hosts the app's frame policy allows
  const LIMIT = { tabs: 8, blocks: 30, links: 12, items: 40, cols: 8, rows: 60 };
  const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);
  const uid = p => (p || 'b') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const safeUrl = u => { u = String(u || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; };
  const embedOk = u => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' && EMBED_HOSTS.some(h => x.hostname === h || x.hostname.endsWith('.' + h)); } catch (e) { return false; } };
  const linesOf = t => String(t == null ? '' : t).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  // "Label | target" per line; a target is a Studio page (its id) or an https link
  const parseLinks = t => linesOf(t).slice(0, LIMIT.links).map(l => { const i = l.lastIndexOf('|'); const label = clip(i > 0 ? l.slice(0, i) : l, 40).trim(); const to = clip(i > 0 ? l.slice(i + 1) : '', 300).trim(); const url = safeUrl(to); return label ? (url ? { label, kind: 'url', to: url } : /^[a-z][\w]{1,40}$/i.test(to) ? { label, kind: 'page', to } : null) : null; }).filter(Boolean);
  const linksText = items => (items || []).map(x => x.label + ' | ' + x.to).join('\n');
  const parseChecklist = (t, old) => { const done = new Set((old || []).filter(x => x.done).map(x => x.t)); return linesOf(t).slice(0, LIMIT.items).map(s => ({ t: clip(s, 120), done: done.has(clip(s, 120)) })); };
  const checklistText = items => (items || []).map(x => x.t).join('\n');
  const parseTable = t => { const rows = linesOf(t).slice(0, LIMIT.rows + 1).map(l => l.split('|').map(c => clip(c.trim(), 200))); const cols = (rows.shift() || []).slice(0, LIMIT.cols).map(c => clip(c, 30)); return { cols, rows: rows.map(r => cols.map((_, i) => r[i] || '')) }; };
  const tableText = b => [(b.cols || []).join(' | ')].concat((b.rows || []).map(r => r.join(' | '))).join('\n');
  function cleanBlock(b) {
    b = b || {}; const type = BLOCKS[b.type] ? b.type : 'text'; const o = { id: clip(b.id, 24) || uid('b'), type };
    if (type === 'text') o.md = clip(b.md, 20000);
    else if (type === 'links') o.items = (Array.isArray(b.items) ? b.items : []).map(x => ({ label: clip(x && x.label, 40).trim(), kind: x && x.kind === 'url' ? 'url' : 'page', to: x && x.kind === 'url' ? safeUrl(x.to) : (/^[a-z][\w]{1,40}$/i.test(String(x && x.to)) ? String(x.to) : '') })).filter(x => x.label && x.to).slice(0, LIMIT.links);
    else if (type === 'numbers') o.metrics = (Array.isArray(b.metrics) ? b.metrics : []).filter((m, i, a) => METRICS[m] && a.indexOf(m) === i).slice(0, 8);
    else if (type === 'checklist') { o.title = clip(b.title, 60); o.items = (Array.isArray(b.items) ? b.items : []).map(x => ({ t: clip(x && x.t, 120).trim(), done: !!(x && x.done) })).filter(x => x.t).slice(0, LIMIT.items); }
    else if (type === 'table') { o.title = clip(b.title, 60); o.cols = (Array.isArray(b.cols) ? b.cols : []).slice(0, LIMIT.cols).map(c => clip(c, 30)); o.rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, LIMIT.rows).map(r => o.cols.map((_, i) => clip(Array.isArray(r) ? r[i] : '', 200))); }
    else if (type === 'ask') { o.label = clip(b.label, 40) || 'Ask Claude'; o.prompt = clip(b.prompt, 4000); }
    else if (type === 'embed') { o.title = clip(b.title, 60); o.url = embedOk(b.url) ? String(b.url).trim() : ''; }
    return o;
  }
  function cleanPage(c) {
    c = c || {}; let tabs = Array.isArray(c.tabs) && c.tabs.length ? c.tabs : [{ id: 't1', label: 'Main', blocks: c.body ? [{ type: 'text', md: c.body }] : [] }];
    tabs = tabs.slice(0, LIMIT.tabs).map((t, i) => ({ id: clip(t && t.id, 24) || uid('t'), label: clip(t && t.label, 30).trim() || 'Tab ' + (i + 1), blocks: (Array.isArray(t && t.blocks) ? t.blocks : []).slice(0, LIMIT.blocks).map(cleanBlock) }));
    return { id: clip(c.id, 24), label: clip(c.label, 40), group: clip(c.group, 60), tabs };
  }
  const api = { BLOCKS, METRICS, EMBED_HOSTS, LIMIT, cleanBlock, cleanPage, safeUrl, embedOk, parseLinks, linksText, parseChecklist, checklistText, parseTable, tableText, uid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBCustomPage = api;
  const F = root.FWB, V = root.FWBViews; if (!F || !V || !V.ACT) return;
  // ---------------- the page, in the browser ----------------
  const { S, esc } = F; const ACT = V.ACT; const { drawer, closeDrawer, toast, confirmDialog } = V; const I = () => V.items;
  const wsDoc = () => F.doc('workspace') || {};
  const findPage = id => (wsDoc().custom || []).find(x => x.id === id);
  const canEdit = () => { let p = 'all'; try { p = wsDoc().perm || 'all'; } catch (e) { } const role = S.project && S.project.role; return !V.isCustomer() && !S.readonly && (p === 'owners' ? role === 'owner' : p === 'editors' ? role !== 'viewer' : true); };
  const canTick = () => !V.isCustomer() && !S.readonly;
  const save = what => { F.changed(what, '', { section: 'workspace' }); };
  const pageLabel = id => { const nav = (V.navBase && V.navBase()) || []; for (const g of nav) for (const it of g.items) if (it[0] === id) return it[1]; return id; };
  const fd = d => (d ? (V.fmtDate ? V.fmtDate(d) : d) : 'not set');
  const isOpen = t => !/^(done|closed|resolved|cancelled|complete|completed|answered)$/i.test(String(t.status || ''));
  let loading = false;
  function metric(key) {
    const ready = I() && I().ready && I().ready(['task', 'raid']); if (!ready) { if (I() && I().load && !loading) { loading = true; I().load(['task', 'raid']); setTimeout(() => { loading = false; try { if (/^cx_/.test(S.ui.view || '')) V.render(); } catch (e) { } }, 1500); } return ['…', '']; }
    const t0 = V.today(); const tasks = I().list('task'); const open = tasks.filter(isOpen);
    if (key === 'open') return [String(open.length), 'of ' + tasks.length + ' tasks'];
    if (key === 'overdue') { const n = open.filter(t => (t.due || t.eta) && String(t.due || t.eta) < t0).length; return [String(n), n ? 'need attention' : 'none late']; }
    if (key === 'done') return [String(tasks.length - open.length), 'finished'];
    if (key === 'risks') { const l = I().list('raid').filter(r => r.status !== 'Closed'); return [String(l.length), l.filter(r => r.impact === 'High').length + ' high']; }
    const st = V.planStats ? V.planStats() : null;
    if (key === 'progress') return st && st.n ? [Math.round(st.actual) + '%', 'plan ' + Math.round(st.planned) + '%'] : ['–', 'no dated plan'];
    if (key === 'golive') return [fd(st && st.goLive), ''];
    if (key === 'stage') { const p = V.phaseNow ? V.phaseNow() : null; const x = p && p.cur >= 0 && p.info ? p.info[p.cur] : null; return x ? [x.title, 'step ' + (x.i + 1) + ' of ' + p.info.length] : ['–', '']; }
    return ['–', ''];
  }
  function blockHtml(pg, b) {
    const t = b.type;
    if (t === 'text') return '<div class="cp-text">' + (b.md ? V.md(b.md) : '<span class="muted">Empty text.</span>') + '</div>';
    if (t === 'links') return '<div class="cp-links">' + (b.items || []).map(x => x.kind === 'url' ? '<a class="btn" href="' + esc(x.to) + '" target="_blank" rel="noopener noreferrer">' + esc(x.label) + '</a>' : '<button type="button" class="btn" data-act="cpGo" data-view="' + esc(x.to) + '" title="Open ' + esc(pageLabel(x.to)) + '">' + esc(x.label) + '</button>').join('') + '</div>';
    if (t === 'numbers') return '<div class="cp-tiles">' + (b.metrics || []).map(m => { const v = metric(m); return '<div class="cp-tile"><span>' + esc(METRICS[m]) + '</span><b>' + esc(v[0]) + '</b><small>' + esc(v[1]) + '</small></div>'; }).join('') + '</div>';
    if (t === 'checklist') return (b.title ? '<h3 class="cp-h">' + esc(b.title) + '</h3>' : '') + '<ul class="cp-ck">' + (b.items || []).map((x, i) => '<li><label><input type="checkbox" data-change="cpCheck" data-page="' + esc(pg.id) + '" data-b="' + esc(b.id) + '" data-i="' + i + '"' + (x.done ? ' checked' : '') + (canTick() ? '' : ' disabled') + '><span>' + esc(x.t) + '</span></label></li>').join('') + '</ul>';
    if (t === 'table') return (b.title ? '<h3 class="cp-h">' + esc(b.title) + '</h3>' : '') + '<div class="cp-tw"><table class="tbl"><thead><tr>' + (b.cols || []).map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + (b.rows || []).map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    if (t === 'ask') return '<div class="cp-links"><button type="button" class="btn primary" data-act="cpAsk" data-page="' + esc(pg.id) + '" data-b="' + esc(b.id) + '">' + esc(b.label) + '</button><span class="small muted">Sends this request to your Claude through the connector.</span></div>';
    if (t === 'embed') return b.url ? (b.title ? '<h3 class="cp-h">' + esc(b.title) + '</h3>' : '') + '<iframe class="cp-embed" src="' + esc(b.url) + '" title="' + esc(b.title || 'Embedded page') + '" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>' : '<div class="notice"><span>This link is not an allowed Facilio address, so nothing is shown.</span></div>';
    return '';
  }
  V.customPage = {
    html() {
      const id = String(S.ui.view || '').replace(/^cx_/, ''); const raw = findPage(id); if (!raw) return '<div class="page-body"><div class="notice err"><span>This page was removed from the workspace.</span></div></div>';
      const pg = cleanPage(raw); pg.id = id; S.ui.cpTab = S.ui.cpTab || {}; const cur = pg.tabs.find(t => t.id === S.ui.cpTab[id]) || pg.tabs[0];
      const tabs = pg.tabs.length > 1 ? '<div class="tabs cp-tabs" role="tablist" aria-label="' + esc(raw.label) + ' tabs">' + pg.tabs.map(t => '<button type="button" class="tab' + (t === cur ? ' active' : '') + '" role="tab" aria-selected="' + (t === cur) + '" data-act="cpTab" data-page="' + esc(id) + '" data-t="' + esc(t.id) + '">' + esc(t.label) + '</button>').join('') + '</div>' : '';
      const body = cur.blocks.length ? cur.blocks.map(b => '<section class="card cp-block"><div class="card-b">' + blockHtml(pg, b) + '</div></section>').join('') : '<div class="card"><div class="card-b"><span class="muted">This tab is empty.' + (canEdit() ? ' Use Edit page to add blocks.' : '') + '</span></div></div>';
      return '<div class="page-header"><div class="t"><h1>' + esc(raw.label) + '</h1></div><div class="row">' + (canEdit() ? '<button class="btn" data-act="wsEditPage" data-id="' + esc(id) + '">Edit page</button>' : '') + '</div></div><div class="page-body">' + tabs + '<div class="cp-blocks">' + body + '</div></div>';
    }
  };
  ACT.cpTab = a => { S.ui.cpTab = S.ui.cpTab || {}; S.ui.cpTab[a.getAttribute('data-page')] = a.getAttribute('data-t'); V.render(); };
  ACT.cpGo = a => { const v = a.getAttribute('data-view'); if (V[v] || /^cx_/.test(v)) V.go(v); else toast('That page is not available here.', 4000, true); };
  ACT.cpCheck = el => { const raw = findPage(el.getAttribute('data-page')); if (!raw || !canTick()) return; const pg = cleanPage(raw); const b = pg.tabs.flatMap(t => t.blocks).find(x => x.id === el.getAttribute('data-b')); const it = b && b.items[Number(el.getAttribute('data-i'))]; if (!it) return; it.done = !!el.checked; raw.tabs = pg.tabs; save('Checklist ticked'); };
  ACT.cpAsk = a => { const raw = findPage(a.getAttribute('data-page')); const pg = raw && cleanPage(raw); const b = pg && pg.tabs.flatMap(t => t.blocks).find(x => x.id === a.getAttribute('data-b')); if (!b || !b.prompt) { toast('This button has no request written yet.', 4000, true); return; } return V.claudeOpenSimple(b.prompt, { title: b.label, task: 'custom-page' }).then(r => { if (r && r.said) toast(r.said, 5000); }).catch(e => toast(e.message || 'Could not send', 5000, true)); };
  // ---------------- the builder ----------------
  const wrapAdd = ACT.wsAddPage; ACT.wsAddPage = a => { const id = a && a.getAttribute && a.getAttribute('data-id'); if (id && findPage(id)) return open(id); return wrapAdd ? wrapAdd(a) : undefined; };
  let D = null;   // { id, label, tabs, cur }
  function open(id) { const raw = findPage(id); if (!raw) return; const pg = cleanPage(raw); D = { id, label: raw.label, tabs: JSON.parse(JSON.stringify(pg.tabs)), cur: 0 }; draw(); }
  const val = sel => { const e = document.querySelector(sel); return e ? e.value : ''; };
  function sync() {   // read what is typed into the draft before any change of structure
    if (!D) return; D.label = val('#cpL') || D.label; const t = D.tabs[D.cur]; if (!t) return; t.label = val('#cpT') || t.label;
    t.blocks.forEach(b => { const g = f => val('[data-cpf="' + b.id + ':' + f + '"]'); if (b.type === 'text') b.md = g('md'); else if (b.type === 'links') b.items = parseLinks(g('items')); else if (b.type === 'checklist') { b.title = g('title'); b.items = parseChecklist(g('items'), b.items); } else if (b.type === 'table') { b.title = g('title'); const x = parseTable(g('table')); b.cols = x.cols; b.rows = x.rows; } else if (b.type === 'ask') { b.label = g('label'); b.prompt = g('prompt'); } else if (b.type === 'embed') { b.title = g('title'); b.url = g('url'); } else if (b.type === 'numbers') b.metrics = Object.keys(METRICS).filter(m => { const e = document.querySelector('[data-cpf="' + b.id + ':m:' + m + '"]'); return e && e.checked; }); });
  }
  const pages = () => { const out = []; ((V.navBase && V.navBase()) || []).forEach(g => g.items.forEach(it => { if (V[it[0]] && it[0] !== 'customPage') out.push([it[0], it[1]]); })); return out; };
  function blockForm(b, i, n) {
    const f = (lab, el) => '<label class="f">' + lab + '</label>' + el; const ph = k => 'data-cpf="' + esc(b.id) + ':' + k + '"';
    let body = '';
    if (b.type === 'text') body = f('Text (headings with #, lists with -, tables with |, **bold**)', '<textarea rows="6" ' + ph('md') + '>' + esc(b.md) + '</textarea>');
    else if (b.type === 'links') body = f('One button per line: Label | page or https link', '<textarea rows="4" ' + ph('items') + ' placeholder="Open the tasks | tasks">' + esc(linksText(b.items)) + '</textarea>') + '<select data-change="cpPick" data-b="' + esc(b.id) + '" aria-label="Add a Studio page as a button"><option value="">Add a Studio page as a button…</option>' + pages().map(p => '<option value="' + esc(p[0]) + '">' + esc(p[1]) + '</option>').join('') + '</select>';
    else if (b.type === 'numbers') body = '<label class="f">Numbers to show (they read the project records live)</label><div class="cp-mchk">' + Object.keys(METRICS).map(m => '<label><input type="checkbox" ' + ph('m:' + m) + ((b.metrics || []).includes(m) ? ' checked' : '') + '> ' + esc(METRICS[m]) + '</label>').join('') + '</div>';
    else if (b.type === 'checklist') body = f('Title', '<input type="text" maxlength="60" ' + ph('title') + ' value="' + esc(b.title) + '">') + f('One item per line (ticks are kept for lines that stay the same)', '<textarea rows="5" ' + ph('items') + '>' + esc(checklistText(b.items)) + '</textarea>');
    else if (b.type === 'table') body = f('Title', '<input type="text" maxlength="60" ' + ph('title') + ' value="' + esc(b.title) + '">') + f('First line: column names. Then one row per line. Separate cells with |', '<textarea rows="6" ' + ph('table') + ' placeholder="Name | Owner | Due">' + esc(tableText(b)) + '</textarea>');
    else if (b.type === 'ask') body = f('Button label', '<input type="text" maxlength="40" ' + ph('label') + ' value="' + esc(b.label) + '">') + f('What Claude should do (it reads this project through the connector)', '<textarea rows="5" ' + ph('prompt') + '>' + esc(b.prompt) + '</textarea>');
    else if (b.type === 'embed') body = f('Title', '<input type="text" maxlength="60" ' + ph('title') + ' value="' + esc(b.title) + '">') + f('Address (https, a Facilio tool or video)', '<input type="url" ' + ph('url') + ' value="' + esc(b.url) + '" placeholder="https://comet.facilio.work/…">') + '<p class="small muted">Only Facilio tools and videos can be shown here: ' + EMBED_HOSTS.map(esc).join(', ') + '.</p>';
    return '<div class="cp-bf"><div class="cp-bh"><b>' + (i + 1) + '. ' + esc(BLOCKS[b.type]) + '</b><span class="spacer"></span><button type="button" class="btn sm icon ghost" data-act="cpUp" data-b="' + esc(b.id) + '"' + (i ? '' : ' disabled') + ' aria-label="Move up" title="Move up">↑</button><button type="button" class="btn sm icon ghost" data-act="cpDown" data-b="' + esc(b.id) + '"' + (i < n - 1 ? '' : ' disabled') + ' aria-label="Move down" title="Move down">↓</button><button type="button" class="btn sm danger" data-act="cpDelBlock" data-b="' + esc(b.id) + '">Delete block</button></div>' + body + '</div>';
  }
  function draw() {
    const t = D.tabs[D.cur]; const n = t.blocks.length;
    const tabsRow = '<div class="cp-tabrow">' + D.tabs.map((x, i) => '<button type="button" class="tab' + (i === D.cur ? ' active' : '') + '" data-act="cpSel" data-i="' + i + '">' + esc(x.label) + '</button>').join('') + (D.tabs.length < LIMIT.tabs ? '<button type="button" class="btn sm" data-act="cpAddTab">+ Add tab</button>' : '') + '</div>';
    const html = '<label class="f" for="cpL">Page name (as shown in the menu)</label><input type="text" id="cpL" maxlength="40" value="' + esc(D.label) + '">' +
      '<label class="f">Tabs inside this page <span class="xs muted">mini tabs across the top of the page</span></label>' + tabsRow +
      '<div class="cp-trow"><div><label class="f" for="cpT">Name of this tab</label><input type="text" id="cpT" maxlength="30" value="' + esc(t.label) + '"></div>' + (D.tabs.length > 1 ? '<button type="button" class="btn danger" data-act="cpDelTab">Delete tab</button>' : '') + '</div>' +
      '<div class="cp-bl">' + (n ? t.blocks.map((b, i) => blockForm(b, i, n)).join('') : '<p class="muted">No blocks yet. Add one below.</p>') + '</div>' +
      (n < LIMIT.blocks ? '<label class="f" for="cpAdd">Add a block</label><select id="cpAdd" data-change="cpAddBlock"><option value="">Choose what to add…</option>' + Object.keys(BLOCKS).map(k => '<option value="' + k + '">' + esc(BLOCKS[k]) + '</option>').join('') + '</select>' : '');
    drawer('Edit page', html, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="cpSave">Save</button>', { wide: true });
  }
  ACT.cpSel = a => { sync(); D.cur = Number(a.getAttribute('data-i')) || 0; draw(); };
  ACT.cpAddTab = () => { sync(); if (D.tabs.length >= LIMIT.tabs) return; D.tabs.push({ id: uid('t'), label: 'Tab ' + (D.tabs.length + 1), blocks: [] }); D.cur = D.tabs.length - 1; draw(); };
  ACT.cpDelTab = async () => { sync(); if (D.tabs.length < 2) return; if (!(await confirmDialog('Delete tab', 'Delete the tab "' + D.tabs[D.cur].label + '" and its blocks?', 'Delete', true))) return; D.tabs.splice(D.cur, 1); D.cur = Math.max(0, D.cur - 1); draw(); };
  ACT.cpAddBlock = el => { const k = el && el.value; if (!BLOCKS[k]) return; sync(); const b = cleanBlock({ type: k }); if (k === 'numbers') b.metrics = ['open', 'overdue', 'progress']; if (k === 'ask') b.label = 'Ask Claude'; D.tabs[D.cur].blocks.push(b); draw(); };
  ACT.cpPick = el => { const id = el && el.value; if (!id) return; sync(); const b = D.tabs[D.cur].blocks.find(x => x.id === el.getAttribute('data-b')); if (b) { b.items = (b.items || []).concat([{ label: pageLabel(id), kind: 'page', to: id }]).slice(0, LIMIT.links); draw(); } };
  const mv = (id, d) => { sync(); const a = D.tabs[D.cur].blocks; const i = a.findIndex(x => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; draw(); };
  ACT.cpUp = a => mv(a.getAttribute('data-b'), -1); ACT.cpDown = a => mv(a.getAttribute('data-b'), 1);
  ACT.cpDelBlock = async a => { sync(); const id = a.getAttribute('data-b'); if (!(await confirmDialog('Delete block', 'Delete this block from the page?', 'Delete', true))) return; const t = D.tabs[D.cur]; t.blocks = t.blocks.filter(x => x.id !== id); draw(); };
  ACT.cpSave = () => { sync(); const raw = findPage(D.id); if (!raw) { closeDrawer(); return; } const label = clip(D.label, 40).trim(); if (!label) { toast('Name the page'); return; } const pg = cleanPage({ id: D.id, label, group: raw.group, tabs: D.tabs }); raw.label = label; raw.tabs = pg.tabs; delete raw.body; closeDrawer(); save('Custom page saved'); toast('Saved'); };
})(typeof window !== 'undefined' ? window : globalThis);
