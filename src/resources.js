/* Notes & Links: project notes (kind "pnote") and links to meetings, recordings, boards and trackers (kind "res"), both records on the item store, so permissions, audit and versions come from the same server rules.
   9 Nov 2026 redesign: a note can be private (kind pnote, data.private: only its writer is sent it, the server enforces that), web addresses in notes are clickable, a pasted link is typed and named for you,
   filters are chips with counts. Helpers that need no page (linkify, type guess, private rule) live in src/reslinks.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const { ico, toast, drawer, closeDrawer } = V; const ACT = V.ACT; const I = () => V.items; const R = root.FWBResLinks;
  const TYPES = ['Meeting notes', 'Call recording', 'Meeting link', 'SmartSheet', 'Miro board', 'Figma', 'SharePoint / OneDrive', 'Document', 'Other'];
  const ABBR = { 'Meeting notes': 'Notes', 'Call recording': 'Rec', 'Meeting link': 'Call', 'SmartSheet': 'Sheet', 'Miro board': 'Miro', 'Figma': 'Figma', 'SharePoint / OneDrive': 'Files', 'Document': 'Doc', 'Other': 'Link' };
  const NCATS = ['Meeting notes', 'Decision', 'Requirement', 'Customer context', 'Risk', 'General'];
  const st = { q: '', type: '', tab: 'notes', nq: '', ncat: '', scope: '' };
  const fmt = iso => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const canEdit = () => !S.readonly && !V.isCustomer();
  const tags = r => String(r.tags || '').split(',').map(x => x.trim()).filter(Boolean);
  const me = () => String(S.user && S.user.email || '').toLowerCase();
  const mine = n => !!n.createdByEmail && String(n.createdByEmail).toLowerCase() === me();
  const byLine = r => `<span class="rs-by"><i class="rs-av" aria-hidden="true">${esc(String(r.createdByName || '?').trim().charAt(0).toUpperCase())}</i>${esc(r.createdByName || 'Unknown')} · ${esc(fmt(r._at))}</span>`;
  const tagChips = r => tags(r).map(t => `<span class="rs-tag">${esc(t)}</span>`).join('');
  const chip = (label, n, on, act, v) => `<button type="button" class="rs-chip${on ? ' on' : ''}" aria-pressed="${on}" data-act="${act}" data-v="${esc(v)}">${esc(label)}${n === '' ? '' : `<em>${n}</em>`}</button>`;
  const seg = (items, cur, act) => `<div class="seg" role="group">${items.map(x => `<button type="button" class="${x[0] === cur ? 'on' : ''}" aria-pressed="${x[0] === cur}" data-act="${act}" data-v="${esc(x[0])}">${x[1]}</button>`).join('')}</div>`;
  const has = (q, arr) => !q || arr.some(x => String(x || '').toLowerCase().includes(q));
  const newest = (a, b) => String(b._at || '').localeCompare(String(a._at || ''));

  function html() {
    if (!I().ready(['res', 'pnote'])) { I().load(['res', 'pnote']); return `<div class="page-header"><div class="t"><h1>Notes &amp; Links</h1></div></div><div class="page-body"><p class="muted">Loading notes and links…</p></div>`; }
    const notes = I().list('pnote'), links = I().list('res');
    return `<div class="page-header"><div class="t"><h1>Notes &amp; Links</h1><p>Everything this project keeps going back to for ${esc(S.project.name)}: notes (keep one private if it is just for you) and links to meetings, recordings, boards and trackers. Links open in a new tab.</p></div>${canEdit() ? `<div class="actions"><button class="btn${st.tab === 'notes' ? ' primary' : ''}" data-act="noteAdd">${ico('plus')}Add note</button><button class="btn${st.tab === 'links' ? ' primary' : ''}" data-act="resAdd">${ico('plus')}Add link</button></div>` : ''}</div>
    <div class="page-body rs">${seg([['notes', `Notes <em>${notes.length}</em>`], ['links', `Links &amp; resources <em>${links.length}</em>`]], st.tab, 'resTab')}${st.tab === 'notes' ? notesHtml(notes) : linksHtml(links)}</div>`;
  }

  // ---- notes ----
  const nrows = all => { const q = st.nq.trim().toLowerCase(); return all.filter(n => (!st.ncat || (n.category || 'General') === st.ncat) && (!st.scope || (st.scope === 'private' ? n.private === true : n.private !== true)) && has(q, [n.title, n.body, n.category, n.tags, n.createdByName])).sort(newest); };
  function noteCard(n) {
    const priv = n.private === true, body = String(n.body || '');
    return `<article class="rs-note${priv ? ' priv' : ''}"><header><span class="rs-cat">${esc(n.category || 'General')}</span>${priv ? `<span class="rs-lock" title="Only you can see this note">${ico('lock')}Private</span>` : ''}</header>
      <h3><button type="button" class="rs-tl" data-act="noteView" data-id="${esc(n.id)}">${esc(n.title)}</button></h3>
      ${body.trim() ? `<p class="rs-prev">${R.linkify(R.preview(body, 260))}</p>` : '<p class="rs-prev muted">No text yet.</p>'}
      <footer>${byLine(n)}${tagChips(n)}<span class="rs-na"><button class="btn sm ghost" data-act="noteView" data-id="${esc(n.id)}">${ico('eye')}Read</button>${canEdit() ? `<button class="btn sm ghost" data-act="noteEdit" data-id="${esc(n.id)}" aria-label="Edit ${esc(n.title)}">${ico('edit')}</button><button class="btn sm ghost" data-act="noteDel" data-id="${esc(n.id)}" aria-label="Delete ${esc(n.title)}">${ico('trash')}</button>` : ''}</span></footer></article>`;
  }
  function notesHtml(all) {
    const list = nrows(all), nPriv = all.filter(n => n.private === true).length, cnt = c => all.filter(n => (n.category || 'General') === c).length;
    return `<div class="rs-bar"><div class="tk-sw">${ico('search')}<input type="search" id="noteQ" data-res="nq" value="${esc(st.nq)}" placeholder="Search title, text, tag or author" aria-label="Search notes"></div>${seg([['', 'All'], ['shared', 'Team'], ['private', `${ico('lock')}Only me <em>${nPriv}</em>`]], st.scope, 'noteScope')}</div>
    <div class="rs-chips" role="group" aria-label="Filter by category">${chip('All', all.length, !st.ncat, 'noteCat', '')}${NCATS.map(c => chip(c, cnt(c), st.ncat === c, 'noteCat', c)).join('')}</div>
    ${list.length ? `<div class="rs-grid">${list.map(noteCard).join('')}</div>`
      : `<div class="empty"><h3>${all.length ? 'No notes match' : 'No notes yet'}</h3><p class="muted">${all.length ? 'Clear the search or the filters.' : 'Keep meeting notes, decisions and customer context for this project in one place. Mark a note private when it is only for you.'}</p>${!all.length && canEdit() ? '<button class="btn primary" data-act="noteAdd">Add the first note</button>' : ''}</div>`}`;
  }
  const nform = n => `<div class="fgrid"><div class="full"><label class="f" for="ntT">Title *</label><input id="ntT" type="text" maxlength="200" value="${esc(n.title || '')}" placeholder="e.g. Kick-off call: what we agreed"></div><div><label class="f" for="ntC">Category</label><select id="ntC">${NCATS.map(c => `<option${c === (n.category || 'General') ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div><div><label class="f" for="ntG">Tags (comma separated)</label><input id="ntG" type="text" value="${esc(n.tags || '')}"></div>
    <div class="full"><label class="f" for="ntB">Note</label><textarea id="ntB" rows="12" maxlength="20000" placeholder="Write the note. Web addresses you paste here become clickable links.">${esc(n.body || '')}</textarea></div>
    ${!n.id || mine(n) ? `<div class="full"><label class="rs-priv"><input type="checkbox" id="ntP"${n.private === true ? ' checked' : ''}><span><b>${ico('lock')}Private note</b><small>Only you can see it. The team, the customer and Claude's project tools never receive it.</small></span></label></div>` : ''}</div>`;
  const nopen = id => { const n = id ? I().get('pnote', id) : {}; if (id && !n) return; drawer(id ? 'Edit note' : 'Add note', nform(n || {}), `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="noteSave" data-id="${esc(id || '')}">Save note</button>`); };
  ACT.resTab = a => { st.tab = a.getAttribute('data-v'); V.render(); };
  ACT.noteAdd = () => { st.tab = 'notes'; nopen(''); }; ACT.noteEdit = a => nopen(a.getAttribute('data-id'));
  ACT.noteCat = a => { st.ncat = a.getAttribute('data-v') || ''; V.render(); }; ACT.noteScope = a => { st.scope = a.getAttribute('data-v') || ''; V.render(); };
  ACT.noteView = a => {
    const n = I().get('pnote', a.getAttribute('data-id')); if (!n) return;
    drawer(n.title, `<div class="rs-rd"><div class="rs-meta"><span class="rs-cat">${esc(n.category || 'General')}</span>${n.private === true ? `<span class="rs-lock">${ico('lock')}Private: only you can see this</span>` : ''}${tagChips(n)}</div>
      <div class="rs-read">${String(n.body || '').trim() ? R.linkify(n.body) : '<span class="muted">No text yet.</span>'}</div><p class="small muted">Written by ${esc(n.createdByName || 'unknown')}${n._created ? ' on ' + esc(fmt(n._created)) : ''} · updated ${esc(fmt(n._at))}</p></div>`,
      `<button class="btn" data-act="closeDrawer">Close</button>${canEdit() ? `<button class="btn primary" data-act="noteEdit" data-id="${esc(n.id)}">${ico('edit')}Edit</button>` : ''}`, { wide: true });
  };
  ACT.noteSave = a => V.busy(a, async () => {
    const v = id => (document.getElementById(id) || {}).value || ''; const title = v('ntT').trim(); if (!title) { toast('Add a title', 4000, true); return; }
    const id = a.getAttribute('data-id') || I().uid('pn'); const old = a.getAttribute('data-id') ? I().get('pnote', id) : {}; const p = document.getElementById('ntP');
    await I().put('pnote', id, Object.assign({}, old, { title, category: v('ntC'), tags: v('ntG').trim(), body: v('ntB') }, p ? { private: p.checked } : {})); closeDrawer(); toast(p && p.checked ? 'Private note saved. Only you can see it' : 'Note saved');
  });
  ACT.noteDel = async a => { const n = I().get('pnote', a.getAttribute('data-id')); if (!n || !(await V.confirmDialog('Delete note', 'Delete "' + n.title + '"? This cannot be undone.', 'Delete'))) return; await I().del('pnote', n.id); toast('Note deleted'); };

  // ---- links ----
  const lrows = all => { const q = st.q.trim().toLowerCase(); return all.filter(r => (!st.type || (r.type || 'Other') === st.type) && has(q, [r.name, r.description, r.category, r.tags, r.type, r.url, r.createdByName])).sort(newest); };
  function linkCard(r) {
    const href = esc(F.safeUrl(r.url)), t = r.type || 'Other';
    return `<article class="rs-link"><a class="rs-ico" href="${href}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true" title="${esc(t)}">${esc(ABBR[t] || 'Link')}</a>
      <div class="rs-lb"><a class="rs-ln" href="${href}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a><div class="rs-lh">${esc(R.host(r.url))} · ${esc(t)}${r.category ? ' · ' + esc(r.category) : ''}</div>${r.description ? `<p class="rs-ld">${esc(r.description)}</p>` : ''}<div class="rs-lf">${byLine(r)}${tagChips(r)}</div></div>
      <div class="rs-la"><a class="btn sm primary" href="${href}" target="_blank" rel="noopener noreferrer">${ico('link')}Open</a><button class="btn sm ghost" data-act="resCopy" data-id="${esc(r.id)}" aria-label="Copy the link to ${esc(r.name)}" title="Copy link">${ico('copy')}</button>${canEdit() ? `<button class="btn sm ghost" data-act="resEdit" data-id="${esc(r.id)}" aria-label="Edit ${esc(r.name)}">${ico('edit')}</button><button class="btn sm ghost" data-act="resDel" data-id="${esc(r.id)}" aria-label="Remove ${esc(r.name)}">${ico('trash')}</button>` : ''}</div></article>`;
  }
  function linksHtml(all) {
    const list = lrows(all), used = TYPES.filter(t => all.some(r => (r.type || 'Other') === t)), cnt = t => all.filter(r => (r.type || 'Other') === t).length;
    return `<div class="rs-bar">${canEdit() ? `<div class="tk-sw rs-quick">${ico('link')}<input type="url" id="resQuick" data-res="quick" placeholder="Paste a link here to add it (Miro, SharePoint, a recording…)" aria-label="Paste a link to add it"></div>` : ''}<div class="tk-sw">${ico('search')}<input type="search" id="resQ" data-res="q" value="${esc(st.q)}" placeholder="Search name, type, tag or description" aria-label="Search links"></div></div>
    ${used.length ? `<div class="rs-chips" role="group" aria-label="Filter by type">${chip('All', all.length, !st.type, 'resType', '')}${used.map(t => chip(t, cnt(t), st.type === t, 'resType', t)).join('')}</div>` : ''}
    ${list.length ? `<div class="rs-links">${list.map(linkCard).join('')}</div>`
      : `<div class="empty"><h3>${all.length ? 'No links match' : 'No links yet'}</h3><p class="muted">${all.length ? 'Clear the search or the type filter.' : 'Add the links this project keeps going back to: meeting notes, recordings, a SmartSheet or a Miro board. Paste an address above and the type and name are filled in for you.'}</p>${!all.length && canEdit() ? '<button class="btn primary" data-act="resAdd">Add the first link</button>' : ''}</div>`}`;
  }
  const form = r => `<div class="fgrid"><div class="full"><label class="f" for="rsU">Link *</label><input id="rsU" type="url" value="${esc(r.url || '')}" placeholder="https://"></div><div class="full"><label class="f" for="rsN">Name *</label><input id="rsN" type="text" maxlength="200" value="${esc(r.name || '')}" placeholder="e.g. Kick-off call recording"></div>
    <div><label class="f" for="rsT">Type</label><select id="rsT">${TYPES.map(t => `<option${t === (r.type || 'Document') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div><div><label class="f" for="rsC">Category</label><input id="rsC" type="text" value="${esc(r.category || '')}" placeholder="e.g. Discovery"></div>
    <div class="full"><label class="f" for="rsG">Tags (comma separated)</label><input id="rsG" type="text" value="${esc(r.tags || '')}"></div><div class="full"><label class="f" for="rsD">Description</label><textarea id="rsD" rows="3">${esc(r.description || '')}</textarea></div></div>`;
  const open = (id, pre) => { const r = id ? I().get('res', id) : (pre || {}); if (id && !r) return; drawer(id ? 'Edit link' : 'Add link', form(r), `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="resSave" data-id="${esc(id || '')}">Save link</button>`); };
  // a pasted address opens the form with the type and a name already filled in
  const quick = raw => { const url = String(raw || '').trim(); if (!/^https?:\/\/[^\s]+$/i.test(url)) { toast('Paste a full link starting with http:// or https://', 4500, true); return false; } open('', { url, type: R.guessType(url), name: R.guessName(url) }); return true; };
  ACT.resAdd = () => { st.tab = 'links'; open(''); }; ACT.resEdit = a => open(a.getAttribute('data-id'));
  ACT.resType = a => { st.type = a.getAttribute('data-v') || ''; V.render(); };
  ACT.resCopy = async a => { const r = I().get('res', a.getAttribute('data-id')); if (!r) return; try { await navigator.clipboard.writeText(r.url); toast('Link copied'); } catch (e) { toast('Could not copy. Select the address and copy it', 4500, true); } };
  ACT.resSave = a => V.busy(a, async () => {
    const v = id => (document.getElementById(id) || {}).value || ''; const name = v('rsN').trim(), url = v('rsU').trim();
    if (!/^https?:\/\/[^\s]+$/i.test(url)) { toast('Enter a full link starting with http:// or https://', 5000, true); return; } if (!name) { toast('Add a name', 4000, true); return; }
    const id = a.getAttribute('data-id') || I().uid('res'); const old = a.getAttribute('data-id') ? I().get('res', id) : {};
    await I().put('res', id, Object.assign({}, old, { name, url, type: v('rsT'), category: v('rsC').trim(), tags: v('rsG').trim(), description: v('rsD').trim() })); closeDrawer(); toast('Link saved');
  });
  ACT.resDel = async a => { const r = I().get('res', a.getAttribute('data-id')); if (!r || !(await V.confirmDialog('Remove link', 'Remove "' + r.name + '" from this project? The link itself is not affected.', 'Remove'))) return; await I().del('res', r.id); toast('Link removed'); };

  // search boxes re-draw the page and keep the cursor where it was; the paste box opens the form on paste or Enter
  const refocus = (id, keep) => { V.render(); const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(keep, keep); } catch (x) { } } };
  document.addEventListener('input', e => { const el = e.target; const dr = el.getAttribute && el.getAttribute('data-res'); if (dr === 'nq') { st.nq = el.value; refocus('noteQ', el.selectionStart); } else if (dr === 'q') { st.q = el.value; refocus('resQ', el.selectionStart); } });
  document.addEventListener('paste', e => { const el = e.target; if (!(el && el.getAttribute && el.getAttribute('data-res') === 'quick')) return; const t = (e.clipboardData && e.clipboardData.getData('text') || '').trim(); if (/^https?:\/\/[^\s]+$/i.test(t)) { e.preventDefault(); quick(t); } });
  document.addEventListener('keydown', e => { const el = e.target; if (e.key === 'Enter' && el && el.getAttribute && el.getAttribute('data-res') === 'quick') { e.preventDefault(); if (quick(el.value)) el.value = ''; } });
  V.resources = { html };
})(typeof window !== 'undefined' ? window : globalThis);
