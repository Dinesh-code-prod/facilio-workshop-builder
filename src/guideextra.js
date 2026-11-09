/* Project guides: guides the team adds for ONE project next to the standard Module guides (a Word, text, Markdown or HTML file, or pasted text, with its pictures).
   The file is turned into plain blocks (heading, paragraph, list, table, picture) and drawn by our own renderer, so nothing from the file runs in the page.
   Stored in the document guide_extra; the customer sees the guides that are not hidden at once, with no Publish step. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { drawer, closeDrawer, toast, loading, confirmDialog } = V;
  (V.extraSections = V.extraSections || []).push('guide_extra');
  const MAX_TOTAL = 4e6, MAX_IMG = 700e3, MAX_BLOCKS = 1500, PFX = 'x:';
  const items = () => { const d = F.doc('guide_extra'); return Array.isArray(d.items) ? d.items : (d.items = []); };
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const shown = () => items().filter(x => !cust() || !x.hidden);
  const txt = n => (n.textContent || '').replace(/\s+/g, ' ').trim();
  const img = n => { const s = n.getAttribute('src') || ''; return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(s) && s.length <= MAX_IMG ? { t: 'img', src: s, alt: (n.getAttribute('alt') || '').slice(0, 200) } : null; };
  const imgsOf = (n, out) => n.querySelectorAll('img').forEach(i => { const b = img(i); if (b) out.push(b); });

  function fromHtml(html) {
    const body = new DOMParser().parseFromString('<body>' + html, 'text/html').body; const out = [];
    body.querySelectorAll('script,style,iframe,object,embed').forEach(n => n.remove());
    const walk = nodes => Array.from(nodes).forEach(n => { const k = n.nodeName;
      if (/^H[1-6]$/.test(k)) { const t = txt(n); if (t) out.push({ t: 'h', lvl: Math.min(3, +k[1]), text: t }); }
      else if (k === 'P') { const t = txt(n); if (t) out.push({ t: 'p', text: t }); imgsOf(n, out); }
      else if (k === 'IMG') { const b = img(n); if (b) out.push(b); }
      else if (k === 'UL' || k === 'OL') { const li = Array.from(n.children).map(txt).filter(Boolean); if (li.length) out.push({ t: 'ul', items: li }); imgsOf(n, out); }
      else if (k === 'TABLE') { const rows = Array.from(n.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(txt)); if (rows.length) { const cols = Math.max(...rows.map(r => r.length)); const pad = r => { while (r.length < cols) r.push(''); return r; }; out.push({ t: 'table', headers: pad(rows[0]), rows: rows.slice(1).map(pad) }); } imgsOf(n, out); }
      else if (n.children && n.children.length) walk(n.children); else if (n.nodeType === 1) { const t = txt(n); if (t) out.push({ t: 'p', text: t }); } });
    walk(body.children); return out.slice(0, MAX_BLOCKS);
  }
  // text and Markdown: # headings, - bullets, blank line between paragraphs
  function fromText(t) {
    const out = []; let para = [], li = []; const fp = () => { if (para.length) out.push({ t: 'p', text: para.join(' ') }); para = []; }; const fi = () => { if (li.length) out.push({ t: 'ul', items: li }); li = []; };
    String(t).split(/\r?\n/).forEach(l => { const s = l.trim(); let m; if (!s) { fp(); fi(); } else if ((m = s.match(/^(#{1,6})\s+(.*)/))) { fp(); fi(); out.push({ t: 'h', lvl: Math.min(3, m[1].length), text: m[2] }); } else if ((m = s.match(/^[-*•–]\s+(.*)/))) { fp(); li.push(m[1]); } else { fi(); para.push(s); } });
    fp(); fi(); return out.slice(0, MAX_BLOCKS);
  }
  async function readFile(f) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext === 'docx') { await V.loadScript('vendor/mammoth.browser.min.js'); return fromHtml((await root.mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() })).value); }
    if (ext === 'html' || ext === 'htm') return fromHtml(await f.text());
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') return fromText(await f.text());
    return null;
  }

  const render = blocks => (blocks || []).map(b => b.t === 'h' ? `<h${b.lvl + 1} class="gx-h">${esc(b.text)}</h${b.lvl + 1}>` : b.t === 'p' ? `<p>${esc(b.text)}</p>` : b.t === 'ul' ? `<ul>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : b.t === 'img' && /^data:image\//.test(b.src) ? `<figure class="gx-fig"><img src="${esc(b.src)}" alt="${esc(b.alt || '')}"></figure>`
    : b.t === 'table' ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${b.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '').join('');

  async function save(note) { F.markDirty('guide_extra'); await F.flush(); F.changed('Project guides', note); }
  async function add(title, blocks) {
    if (!blocks.length) { toast('Nothing could be read from this file', 5000, true); return; }
    const next = items().concat([{ id: 'g' + Date.now().toString(36), title: (title || 'New guide').slice(0, 80), blocks, by: S.user.name, at: new Date().toISOString(), hidden: false }]);
    if (JSON.stringify(next).length > MAX_TOTAL) { toast('The guides are too large together. Remove a picture-heavy guide or use a smaller file.', 7000, true); return; }
    F.doc('guide_extra').items = next; await save('Added ' + next[next.length - 1].title); closeDrawer(); S.ui.llMod = PFX + next[next.length - 1].id; V.render(); toast('Guide added');
  }

  V.guideExtra = {
    list: () => shown().map(x => ({ key: PFX + x.id, title: x.title, hidden: !!x.hidden })),
    addBtn: () => (!cust() && !S.readonly ? '<button class="btn" data-act="guideAdd">+ Add a guide</button>' : ''),
    has: key => String(key).startsWith(PFX) && shown().some(x => PFX + x.id === key),
    nav(cur) { const l = shown(); return (l.length ? `<div class="wb-cap">Project guides</div>` + l.map(x => `<button class="wb-mod${cur === PFX + x.id ? ' on' : ''}" data-act="llMod" data-m="${PFX}${esc(x.id)}"><span>${esc(x.title)}${x.hidden ? ' (hidden)' : ''}</span></button>`).join('') : '') + (!cust() && !S.readonly ? `<button class="btn sm" style="margin:12px 0 0" data-act="guideAdd">+ Add a guide</button>` : ''); },
    body(key) { const g = items().find(x => PFX + x.id === key); if (!g) return ''; const team = !cust() && !S.readonly;
      return `<div class="gx"><h2 style="margin-bottom:6px">${esc(g.title)}</h2><div class="xs muted" style="margin-bottom:14px">Added by ${esc(g.by || '')} · ${esc(V.fmtDate(g.at))}${g.hidden ? ' · hidden from the customer' : ''}</div>${render(g.blocks)}${team ? `<div class="row" style="margin-top:20px;gap:8px"><button class="btn sm" data-act="guideXHide" data-id="${esc(g.id)}">${g.hidden ? 'Show to the customer' : 'Hide from the customer'}</button><button class="btn sm" data-act="guideXDel" data-id="${esc(g.id)}">Remove</button></div>` : ''}</div>`; }
  };

  ACT.guideAdd = () => { if (S.readonly) return;
    drawer('Add a guide for this project', `<div class="notice small" style="margin-bottom:12px">Bring in a guide you already have. It is laid out cleanly with its headings, lists, tables and pictures, and the customer sees it on Module guides straight away (you can hide it).</div>
      <label class="f">Guide title</label><input id="gx_title" maxlength="80" placeholder="e.g. Approving a purchase request">
      <label class="f" style="margin-top:12px">Or paste the text</label><textarea id="gx_text" rows="7" placeholder="Use # for headings and - for bullet points"></textarea>
      <ul class="small muted" style="margin:12px 0 0;padding-left:18px"><li>Word (.docx), HTML, text and Markdown files work. Pictures inside a Word file come with it (PNG, JPG, GIF, WebP, under 700 KB each).</li><li>PDF is not read here. Ask Claude to turn a PDF into text first, then paste it.</li></ul>`,
      '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn" data-act="guidePaste">Add pasted text</button><button class="btn primary" data-act="guideFile">Choose a file…</button>'); };
  ACT.guidePaste = () => { const v = id => (document.getElementById(id) || {}).value || ''; const t = v('gx_text').trim(); if (!t) { toast('Paste some text first', 4000, true); return; } add(v('gx_title').trim(), fromText(t)); };
  ACT.guideFile = async () => {
    const title = ((document.getElementById('gx_title') || {}).value || '').trim(); const f = (await V.pickFile('.docx,.html,.htm,.txt,.md,.markdown'))[0]; if (!f) return;
    if (f.size > 12e6) { toast('Use a file under 12 MB', 5000, true); return; }
    loading(true, 'Reading ' + f.name + '…');
    try { const blocks = await readFile(f); if (!blocks) { toast('Use a Word (.docx), HTML, text or Markdown file', 5000, true); return; } await add(title || f.name.replace(/\.[^.]+$/, ''), blocks); }
    catch (e) { toast('Could not read the file: ' + e.message, 6000, true); } finally { loading(false); } };
  const byId = a => items().find(x => x.id === a.getAttribute('data-id'));
  ACT.guideXHide = async a => { const g = byId(a); if (!g || S.readonly) return; g.hidden = !g.hidden; await save((g.hidden ? 'Hid ' : 'Showed ') + g.title); V.render(); };
  ACT.guideXDel = async a => { const g = byId(a); if (!g || S.readonly) return; if (!(await confirmDialog('Remove this guide', `Remove "${g.title}" for everyone, including the customer?`, 'Remove'))) return; F.doc('guide_extra').items = items().filter(x => x !== g); S.ui.llMod = null; await save('Removed ' + g.title); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
