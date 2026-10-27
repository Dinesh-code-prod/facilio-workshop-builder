/* Project Resources & Links: meeting notes, call recordings, meeting links, SmartSheet, Miro and other project documents.
   Audit result: the app stored uploaded files (project files) and the customer-facing guide, but had no place for plain links.
   Links are records (kind "res") on the existing item store, so permissions, audit and versions come from the same server rules. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const { ico, toast, drawer, closeDrawer } = V; const ACT = V.ACT; const I = () => V.items;
  const TYPES = ['Meeting notes', 'Call recording', 'Meeting link', 'SmartSheet', 'Miro board', 'Figma', 'SharePoint / OneDrive', 'Document', 'Other'];
  const st = { q: '', type: '' };
  const fmt = iso => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const canEdit = () => !S.readonly && !V.isCustomer();
  const tags = r => String(r.tags || '').split(',').map(x => x.trim()).filter(Boolean);

  function rows() {
    const q = st.q.trim().toLowerCase();
    return I().list('res').filter(r => (!st.type || r.type === st.type) && (!q || [r.name, r.description, r.category, r.tags, r.type, r.url].some(x => String(x || '').toLowerCase().includes(q)))).sort((a, b) => String(b._at || '').localeCompare(String(a._at || '')));
  }
  function html() {
    if (!I().ready(['res'])) { I().load(['res']); return `<div class="page-header"><div class="t"><h1>Resources &amp; Links</h1></div></div><div class="page-body"><p class="muted">Loading resources…</p></div>`; }
    const all = I().list('res'), list = rows();
    const used = [...new Set(all.map(r => r.type).filter(Boolean))];
    return `<div class="page-header"><div class="t"><h1>Resources &amp; Links</h1><p>Meeting notes, recordings, boards and trackers for ${esc(S.project.name)}. Links open in a new tab.</p></div>${canEdit() ? `<div class="actions"><button class="btn primary" data-act="resAdd">${ico('plus')}Add resource</button></div>` : ''}</div>
    <div class="page-body"><div class="card"><div class="res-bar"><div class="tk-sw">${ico('search')}<input type="search" id="resQ" data-res="q" value="${esc(st.q)}" placeholder="Search name, type, tag or description" aria-label="Search resources"></div>
      <label class="tk-f"><span>Type</span><select data-change="resType" aria-label="Filter by type"><option value="">All types</option>${used.map(t => `<option${t === st.type ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label></div>
      ${list.length ? `<div class="tbl-wrap"><table class="tbl res-tbl"><thead><tr><th>Name</th><th>Type</th><th>Category / tags</th><th>Added by</th><th>Updated</th><th></th></tr></thead><tbody id="resBody">${list.map(r => `<tr><td><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(r.name)}</b></a><div class="small muted">${esc(host(r.url))}${r.description ? ' · ' + esc(r.description) : ''}</div></td><td>${esc(r.type || 'Other')}</td><td>${esc(r.category || '')}${tags(r).map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</td><td>${esc(r.createdByName || '')}</td><td>${esc(fmt(r._at))}</td><td class="nw"><a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open</a>${canEdit() ? ` <button class="btn sm ghost" data-act="resEdit" data-id="${esc(r.id)}">Edit</button> <button class="btn sm ghost" data-act="resDel" data-id="${esc(r.id)}" aria-label="Remove ${esc(r.name)}">${ico('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><h3>${all.length ? 'No resources match' : 'No resources yet'}</h3><p class="muted">${all.length ? 'Clear the search or type filter.' : 'Add the links this project keeps going back to: meeting notes, recordings, a SmartSheet or a Miro board.'}</p>${!all.length && canEdit() ? '<button class="btn primary" data-act="resAdd">Add the first resource</button>' : ''}</div>`}</div></div>`;
  }
  const form = r => `<div class="fgrid"><div class="full"><label class="f" for="rsN">Name *</label><input id="rsN" type="text" maxlength="200" value="${esc(r.name || '')}" placeholder="e.g. Kick-off call recording"></div>
    <div class="full"><label class="f" for="rsU">Link *</label><input id="rsU" type="url" value="${esc(r.url || '')}" placeholder="https://"></div>
    <div><label class="f" for="rsT">Type</label><select id="rsT">${TYPES.map(t => `<option${t === (r.type || 'Document') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div><div><label class="f" for="rsC">Category</label><input id="rsC" type="text" value="${esc(r.category || '')}" placeholder="e.g. Discovery"></div>
    <div class="full"><label class="f" for="rsG">Tags (comma separated)</label><input id="rsG" type="text" value="${esc(r.tags || '')}"></div><div class="full"><label class="f" for="rsD">Description</label><textarea id="rsD" rows="3">${esc(r.description || '')}</textarea></div></div>`;
  const open = id => { const r = id ? I().get('res', id) : {}; drawer(id ? 'Edit resource' : 'Add resource', form(r), `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="resSave" data-id="${esc(id || '')}">Save resource</button>`); };
  ACT.resAdd = () => open(''); ACT.resEdit = a => open(a.getAttribute('data-id'));
  ACT.resType = el => { st.type = el.value; V.render(); };
  ACT.resSave = a => V.busy(a, async () => {
    const v = id => (document.getElementById(id) || {}).value || ''; const name = v('rsN').trim(), url = v('rsU').trim();
    if (!name) { toast('Add a name', 4000, true); return; } if (!/^https?:\/\/[^\s]+$/i.test(url)) { toast('Enter a full link starting with http:// or https://', 5000, true); return; }
    const id = a.getAttribute('data-id') || I().uid('res'); const old = a.getAttribute('data-id') ? I().get('res', id) : {};
    await I().put('res', id, Object.assign({}, old, { name, url, type: v('rsT'), category: v('rsC').trim(), tags: v('rsG').trim(), description: v('rsD').trim() })); closeDrawer(); toast('Resource saved');
  });
  ACT.resDel = async a => { const r = I().get('res', a.getAttribute('data-id')); if (!r || !(await V.confirmDialog('Remove resource', 'Remove "' + r.name + '" from this project? The link itself is not affected.', 'Remove'))) return; await I().del('res', r.id); toast('Resource removed'); };
  document.addEventListener('input', e => { const el = e.target; if (el.getAttribute && el.getAttribute('data-res') === 'q') { st.q = el.value; const b = document.getElementById('resBody'); if (b) { const keep = el.selectionStart; V.render(); const n = document.getElementById('resQ'); if (n) { n.focus(); try { n.setSelectionRange(keep, keep); } catch (x) { } } } else V.render(); } });
  V.resources = { html };
})(typeof window !== 'undefined' ? window : globalThis);
