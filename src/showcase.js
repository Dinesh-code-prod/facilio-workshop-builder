/* Explore Facilio (Customer Showcase): Facilio modules and updates the implementation team chooses to show a customer, and the customer's
   "I'm interested" requests. Layout follows the "What's New / Recommended for you" tab of the delivery lead's artifact.
   Nothing is generated or invented here: entries are written by the team (records of kind "news"), each names the source of its wording, and
   only project owners and admins can publish (enforced on the server). Whether a module is already enabled is suggested from this project's
   configuration and can be changed. An interest request (kind "interest") also opens a Facilio action in Governance, so it reaches the team
   through the existing actions, overview and notification bell. Text is always escaped; images are uploaded files shown from the file store. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const API = root.FWBApi;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const cust = () => V.isCustomer(); const canEdit = () => !cust() && !S.readonly; const isOwner = () => !cust() && S.project && S.project.role === 'owner';
  const AV = { enabled: ['Already in your project', 'g'], optional: ['Available to add', 'v'], discuss: ['Let us discuss', 'o'] };
  const IST = { new: ['New', 'blue'], contacted: ['Contacted', 'tbc'], demo: ['Demo booked', 'green'], closed: ['Closed', 'low'] };
  const img = {}; // file id -> object URL
  // entries the admin library shows this project (published, inside their dates, targeted); read from the server each time the page opens
  const G = { pid: '', items: [] };
  const globals = () => (G.pid === (S.project && S.project.id) ? G.items : []);
  const getN = id => I().get('news', id) || globals().find(x => x.id === id);
  const entries = () => I().list('news').concat(globals()).slice().sort((a, b) => (a.order || 0) - (b.order || 0) || String(b._at || '').localeCompare(String(a._at || '')));
  const visible = () => entries().filter(n => !cust() || n.status === 'published');
  const mods = () => (F.allModules ? F.allModules() : []).filter(m => m && m.name).sort((a, b) => (b.inScope - a.inScope) || String(a.label).localeCompare(String(b.label)));
  const modLabel = n => { const m = mods().find(x => x.name === n); return m ? m.label : n; };
  function loadImages() { visible().forEach(n => { if (n.imageId && img[n.imageId] === undefined) { img[n.imageId] = ''; V.fileBlob(n.imageId).then(b => { img[n.imageId] = URL.createObjectURL(b); const el = document.querySelector(`[data-sc-img="${n.imageId}"]`); if (el) { el.style.backgroundImage = `url("${img[n.imageId]}")`; el.classList.add('has'); } }).catch(() => { }); } }); }
  const thumb = n => `<div class="sc-th${n.imageId && img[n.imageId] ? ' has' : ''}" data-sc-img="${esc(n.imageId || '')}"${n.imageId && img[n.imageId] ? ` style="background-image:url('${img[n.imageId]}')"` : ''} role="img" aria-label="${esc(n.imageAlt || n.title)}">${n.imageId ? '' : `<span class="sc-th-m">${esc(modLabel(n.module) || 'Facilio')}</span>`}</div>`;
  const mineAsked = n => I().list('interest').some(x => x.newsId === n.id && x.by === (S.user && S.user.email));

  function card(n) {
    const av = AV[n.availability] || AV.discuss; const asks = I().list('interest').filter(x => x.newsId === n.id).length;
    return `<article class="sc-card${n.status !== 'published' ? ' draft' : ''}">${thumb(n)}<div class="sc-b">
      <div class="sc-tags">${n.module ? `<span class="sc-chip">${esc(modLabel(n.module))}</span>` : ''}<span class="sc-chip ${av[1]}">${av[0]}</span>${!cust() ? (n.status === 'published' ? tag('green', 'Published') : tag('low', 'Draft')) : ''}</div>
      <h3>${esc(n.title)}</h3>${n.summary ? `<p>${esc(n.summary.length > 220 ? n.summary.slice(0, 219) + '…' : n.summary)}</p>` : ''}
      <div class="sc-acts"><button class="btn sm" data-act="xfOpen" data-id="${esc(n.id)}">Learn more</button>${cust() ? (mineAsked(n) ? '<span class="sc-sent">Request sent</span>' : `<button class="btn sm primary" data-act="xfAsk" data-id="${esc(n.id)}">I'm interested</button>`) : `${n.global ? '<span class="sc-asks">From the Facilio library</span>' : ''}${canEdit() && !n.global ? `<button class="btn sm" data-act="xfEdit" data-id="${esc(n.id)}">Edit</button>` : ''}${isOwner() && !n.global ? `<button class="btn sm${n.status === 'published' ? '' : ' primary'}" data-act="xfPub" data-id="${esc(n.id)}">${n.status === 'published' ? 'Unpublish' : 'Publish'}</button>` : ''}${asks ? `<span class="sc-asks">${asks} interested</span>` : ''}`}</div></div></article>`;
  }
  function requestsHtml() {
    const rs = I().list('interest').slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    if (!rs.length) return `<div class="card empty"><h3>No requests yet</h3><p>When ${esc((S.project && S.project.customer) || 'the customer')} asks about an entry, the request appears here and as a Facilio action in Governance.</p></div>`;
    return `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Entry</th><th>Asked by</th><th>When</th><th>Note</th><th>Status</th><th>Owner</th></tr></thead><tbody>${rs.map(r => `<tr><td><b>${esc(r.title)}</b>${r.module ? `<div class="xs muted">${esc(modLabel(r.module))}</div>` : ''}</td><td>${esc(r.byName || r.by)}${r.byCustomer ? '' : ' <span class="xs muted">(recorded by Facilio)</span>'}</td><td class="small">${esc(V.fmtDate(String(r.at).slice(0, 10)))}</td><td class="small">${esc(r.note || '')}</td>
      <td>${canEdit() ? `<select data-change="xfReqSt" data-id="${esc(r.id)}" aria-label="Status">${Object.keys(IST).map(k => `<option value="${k}"${r.status === k ? ' selected' : ''}>${IST[k][0]}</option>`).join('')}</select>` : tag(IST[r.status] ? IST[r.status][1] : 'low', IST[r.status] ? IST[r.status][0] : r.status)}</td><td>${canEdit() ? `<input type="text" data-change="xfReqOwner" data-id="${esc(r.id)}" value="${esc(r.owner || '')}" maxlength="120" placeholder="Who follows up" aria-label="Owner">` : esc(r.owner || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  V.showcase = {
    html() {
      if (!I().ready(['news', 'interest'])) { I().load(['news', 'interest', 'action']).then(() => V.render()); return '<div class="page-header"><div class="t"><h1>Explore Facilio</h1></div></div><div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>'; }
      const tab = cust() ? 'entries' : (S.ui.scTab || 'entries'); const list = visible(); const nNew = I().list('interest').filter(x => x.status === 'new').length; const sc = (S.project && S.project.customer) || 'the customer';
      const head = `<div class="page-header"><div class="t"><h1>Explore Facilio</h1><p>${cust() ? 'Facilio modules and updates your implementation team thinks are relevant to your project. Ask about anything that interests you.' : `Modules and updates you choose to show ${esc(sc)}. Write each entry from approved product material and name its source; only owners and admins can publish. When ${esc(sc)} asks about an entry, it appears under Requests, as a Facilio action in Governance and, when Teams notices are on (Tickets › Support mailbox), as a Teams post and a direct message to the project owners.`}</p></div><div class="row">${canEdit() ? `<button class="btn primary" data-act="xfEdit">${ico('plus')}New entry</button>` : ''}</div></div>`;
      const tabs = cust() ? '' : `<div class="tabs" role="tablist">${[['entries', 'Entries · ' + entries().length], ['requests', 'Requests' + (nNew ? ' · ' + nNew + ' new' : '')]].map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" role="tab" aria-selected="${tab === k}" data-act="xfTab" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;
      const pub = list.filter(n => n.status === 'published'), drafts = list.filter(n => n.status !== 'published');
      const grid = l => `<div class="sc-grid">${l.map(card).join('')}</div>`;
      const body = tab === 'requests' ? requestsHtml() : !list.length ? `<div class="card empty"><h3>${cust() ? 'Nothing to explore yet' : 'No entries yet'}</h3><p>${cust() ? 'Your implementation team has not shared anything here yet.' : 'Create an entry for a module or update that could help ' + esc(sc) + '. Start from a module to pick up its name and whether it is already in this project.'}</p></div>`
        : (cust() ? `<div class="sec-k"><p>Recommended for you</p><h2>From your Facilio team</h2></div>${grid(pub)}` : `${pub.length ? `<div class="sec-k"><p>Published</p><h2>What ${esc(sc)} sees</h2></div>${grid(pub)}` : ''}${drafts.length ? `<div class="sec-k"><p>Drafts</p><h2>Not visible to ${esc(sc)}</h2></div>${grid(drafts)}` : ''}`);
      return head + `<div class="page-body">${tabs}${body}</div>`;
    },
    mount() { loadImages(); const id = S.project && S.project.id; if (id && G.pid !== id) { G.pid = id; G.items = []; API.get('/api/projects/' + id + '/discover').then(r => { G.items = r.items || []; if (S.ui.view === 'showcase') V.render(); }).catch(() => { }); } }
  };
  ACT.xfTab = a => { S.ui.scTab = a.getAttribute('data-v'); V.render(); };

  // ---------- detail ----------
  ACT.xfOpen = a => {
    const n = getN(a.getAttribute('data-id')); if (!n) return; const av = AV[n.availability] || AV.discuss;
    const ul = (t, xs) => (xs || []).length ? `<h4 class="sc-dh">${t}</h4><ul class="sc-ul">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    drawer(n.title, `${thumb(n)}<div class="sc-tags" style="margin:14px 0 6px">${n.module ? `<span class="sc-chip">${esc(modLabel(n.module))}</span>` : ''}<span class="sc-chip ${av[1]}">${av[0]}</span></div>
      ${n.problem ? `<h4 class="sc-dh">The problem it solves</h4><p>${esc(n.problem)}</p>` : ''}${n.summary ? `<h4 class="sc-dh">Overview</h4><p>${esc(n.summary)}</p>` : ''}${ul('What it does', n.capabilities)}${ul('Where it helps', n.useCases)}
      ${n.relation ? `<h4 class="sc-dh">How it relates to your project</h4><p>${esc(n.relation)}</p>` : ''}${!cust() && n.source ? `<p class="xs muted" style="margin-top:14px">Source of this wording: ${esc(n.source)}</p>` : ''}`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>${cust() ? (mineAsked(n) ? '<span class="sc-sent">Request sent</span>' : `<button class="btn primary" data-act="xfAsk" data-id="${esc(n.id)}">I'm interested</button>`) : ''}`, { wide: true });
    loadImages();
  };

  // ---------- interest ----------
  ACT.xfAsk = a => { const n = getN(a.getAttribute('data-id')); if (!n) return;
    drawer('Ask about ' + n.title, `<p class="small muted" style="margin-top:0">Your Facilio team will get in touch. Add anything that would help them prepare (optional).</p><label class="f" for="sc_note">Note</label><textarea id="sc_note" rows="4" maxlength="1000" placeholder="e.g. We would like a demo for the maintenance team"></textarea>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="xfAskGo" data-id="${esc(n.id)}">Send request</button>`); };
  ACT.xfAskGo = a => V.busy(a, async () => {
    const n = getN(a.getAttribute('data-id')); if (!n) return; const note = (document.getElementById('sc_note') || {}).value || ''; const who = cust() ? ((S.user && S.user.name) || (S.project && S.project.customer) || 'The customer') : 'The customer';
    try { await I().put('interest', I().uid('in'), { newsId: n.id, title: n.title, module: n.module || '', note: note.trim().slice(0, 1000), status: 'new' });
      const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
      await I().put('action', I().uid('a'), { text: `Follow up: ${who} asked about "${n.title}"${note.trim() ? ' (' + note.trim().slice(0, 120) + ')' : ''}`, side: 'facilio', status: 'Open', mod: n.module || 'project', owner: '', due });
      closeDrawer(); toast('Request sent. Your Facilio team will get in touch.'); V.render(); }
    catch (e) { toast(e.message || 'The request could not be sent', 6000, true); } });
  ACT.xfReqSt = el => V.busy(null, async () => { const r = I().get('interest', el.getAttribute('data-id')); if (!r) return; try { await I().put('interest', r.id, Object.assign({}, r, { status: el.value })); toast('Request updated'); } catch (e) { toast(e.message, 6000, true); } });
  ACT.xfReqOwner = el => V.busy(null, async () => { const r = I().get('interest', el.getAttribute('data-id')); if (!r) return; try { await I().put('interest', r.id, Object.assign({}, r, { owner: el.value.trim() })); } catch (e) { toast(e.message, 6000, true); } });

  // ---------- authoring ----------
  const val = id => ((document.getElementById(id) || {}).value || '').trim();
  const lines = id => val(id).split('\n').map(x => x.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
  ACT.xfEdit = a => {
    const id = a && a.getAttribute && a.getAttribute('data-id'); const n = id ? I().get('news', id) : { availability: 'discuss', capabilities: [], useCases: [] }; S.ui.scImg = n.imageId || '';
    drawer(id ? 'Edit entry' : 'New Explore Facilio entry', `<div class="notice small" style="margin-top:0">Write from approved Facilio product material and name it below. Do not include pricing, integration promises or customer results that are not in that material.</div>
      <label class="f" for="sc_mod">Module (optional)</label><select id="sc_mod"><option value="">Not tied to a module</option>${mods().map(m => `<option value="${esc(m.name)}"${n.module === m.name ? ' selected' : ''}>${esc(m.label)}${m.inScope ? ' · in this project' : ''}</option>`).join('')}</select>
      ${id ? '' : '<button class="btn sm" data-act="xfFromMod" style="margin-top:8px">Start from this module</button>'}
      <label class="f" for="sc_t">Title</label><input type="text" id="sc_t" maxlength="160" value="${esc(n.title || '')}" placeholder="e.g. Inspections on mobile">
      <label class="f" for="sc_p">Customer problem it addresses</label><textarea id="sc_p" rows="2" maxlength="1200">${esc(n.problem || '')}</textarea>
      <label class="f" for="sc_s">Overview</label><textarea id="sc_s" rows="3" maxlength="2000">${esc(n.summary || '')}</textarea>
      <div class="g2 grid"><div><label class="f" for="sc_c">Capabilities and benefits (one per line)</label><textarea id="sc_c" rows="5">${esc((n.capabilities || []).join('\n'))}</textarea></div><div><label class="f" for="sc_u">Use cases (one per line)</label><textarea id="sc_u" rows="5">${esc((n.useCases || []).join('\n'))}</textarea></div></div>
      <label class="f" for="sc_r">How it relates to this project</label><textarea id="sc_r" rows="2" maxlength="1200">${esc(n.relation || '')}</textarea>
      <label class="f" for="sc_a">Availability for this customer</label><select id="sc_a">${Object.keys(AV).map(k => `<option value="${k}"${n.availability === k ? ' selected' : ''}>${AV[k][0]}</option>`).join('')}</select>
      <label class="f" for="sc_src">Source of the wording (required to publish)</label><input type="text" id="sc_src" maxlength="300" value="${esc(n.source || '')}" placeholder="e.g. Facilio product notes, October 2026">
      <label class="f">Image (optional, PNG, JPEG or WebP up to 5 MB)</label><div class="row"><button class="btn sm" data-act="xfImg">${ico('upl')}${n.imageId ? 'Replace image' : 'Upload image'}</button><span class="xs muted" id="sc_imgn">${n.imageId ? 'Image attached' : 'No image'}</span></div>
      <label class="f" for="sc_alt">Image description (for screen readers)</label><input type="text" id="sc_alt" maxlength="200" value="${esc(n.imageAlt || '')}">`,
      `${id ? `<button class="btn danger" data-act="xfDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="xfSave" data-id="${esc(id || '')}">Save as draft</button>`, { wide: true });
  };
  // fills only what the project's configuration knows: the module name, its configured description and whether it is in scope
  ACT.xfFromMod = () => { const name = val('sc_mod'); const m = mods().find(x => x.name === name); if (!m) { toast('Choose a module first'); return; } const mv = F.moduleView ? F.moduleView(m.name) : null;
    const t = document.getElementById('sc_t'); if (!t.value) t.value = m.label; const s = document.getElementById('sc_s'); const desc = (mv && mv.description) || m.description || ''; if (!s.value && desc) s.value = desc;
    document.getElementById('sc_a').value = m.inScope ? 'enabled' : 'optional'; if (!val('sc_src') && desc) document.getElementById('sc_src').value = 'Module description from this project\'s Facilio configuration';
    toast(desc ? 'Name, configured description and availability filled in. Add the rest from approved material.' : 'Name and availability filled in. This module has no description in the configuration.', 6000); };
  ACT.xfImg = async () => { const f = (await V.pickFile('image/png,image/jpeg,image/webp'))[0]; if (!f) return; if (f.size > 5e6) { toast('That image is larger than 5 MB', 5000, true); return; }
    try { const rec = await API.uploadFile(S.project.id, f, 'showcase_image', {}); S.ui.scImg = rec.id; const n = document.getElementById('sc_imgn'); if (n) n.textContent = f.name; toast('Image uploaded'); } catch (e) { toast(e.message || 'Upload failed', 6000, true); } };
  ACT.xfSave = a => V.busy(a, async () => {
    const id = a.getAttribute('data-id'); const cur = id ? I().get('news', id) : null; const title = val('sc_t'); if (!title) { V.ui.field('sc_t', 'Give the entry a title'); return; }
    const d = Object.assign({}, cur || {}, { title, module: val('sc_mod'), problem: val('sc_p'), summary: val('sc_s'), capabilities: lines('sc_c'), useCases: lines('sc_u'), relation: val('sc_r'), availability: val('sc_a'), source: val('sc_src'), imageId: S.ui.scImg || '', imageAlt: val('sc_alt'), status: cur ? cur.status : 'draft' });
    try { await I().put('news', id || I().uid('nw'), d); closeDrawer(); toast(cur && cur.status === 'published' ? 'Saved. The customer sees the change.' : 'Saved as draft'); V.render(); } catch (e) { toast(e.message, 6000, true); } });
  ACT.xfPub = a => V.busy(a, async () => {
    const n = getN(a.getAttribute('data-id')); if (!n) return; const on = n.status !== 'published';
    if (on && !n.source) { toast('Name the source of the wording before publishing', 6000, true); return; }
    if (on && !(await confirmDialog('Publish to the customer', `"${n.title}" will appear under Explore Facilio for ${(S.project && S.project.customer) || 'the customer'}. Check that every statement comes from ${n.source}.`, 'Publish'))) return;
    try { await I().put('news', n.id, Object.assign({}, n, { status: on ? 'published' : 'draft' })); toast(on ? 'Published' : 'Unpublished'); V.render(); } catch (e) { toast(e.message, 6000, true); } });
  ACT.xfDel = a => V.busy(a, async () => { if (!(await confirmDialog('Delete entry', 'Delete this entry? Requests already made stay in the list.', 'Delete', true))) return; try { await I().del('news', a.getAttribute('data-id')); closeDrawer(); toast('Deleted'); V.render(); } catch (e) { toast(e.message, 6000, true); } });
})(typeof window !== 'undefined' ? window : globalThis);
