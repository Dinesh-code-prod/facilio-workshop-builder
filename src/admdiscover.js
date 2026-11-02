/* Admin > Discover more: one library of product highlights for all projects. An admin writes an entry (or turns a pasted or uploaded product note into a DRAFT
   to read and edit), picks the audience (every project, or chosen ones) and optional start and end dates. Customers see an entry on their Explore Facilio page
   only while it is published and today is inside its dates; the server checks this on every read, so no scheduler is involved. Text only, always escaped. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  const { drawer, closeDrawer, toast, confirmDialog, tag } = V;
  const X = { items: null }; const val = id => { const e = document.getElementById(id); return e ? String(e.value || '') : ''; };
  const PH = { draft: ['low', 'Draft'], scheduled: ['blue', 'Scheduled'], live: ['green', 'Live'], ended: ['tbc', 'Ended'], archived: ['low', 'Archived'] };
  const lines = s => String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const day = d => (d ? V.fmtDate(d) : '');
  const projects = () => ((V.admData && V.admData()) || {}).projects || [];
  const refresh = () => (V.admRefresh ? V.admRefresh() : null);

  V.admDiscover = {
    ready: () => !!X.items,
    async load() { try { X.items = (await API.get('/api/admin/discover', { noAuthRedirect: true })).items; } catch (e) { X.items = []; toast(e.message, 5000, true); } },
    html() {
      if (!X.items) return '<div class="adm-empty">Loading…</div>';
      const rows = X.items.map(e => `<tr><td><b>${esc(e.title)}</b>${e.module ? `<div class="xs muted">${esc(e.module)}</div>` : ''}</td><td>${tag(PH[e.phase][0], PH[e.phase][1])}</td>
        <td class="small">${e.from || e.until ? esc((day(e.from) || 'any time') + ' to ' + (day(e.until) || 'no end')) : '<span class="muted">No dates: live while published</span>'}</td>
        <td class="small">${e.audience === 'projects' ? esc((e.projects || []).length + ' project' + ((e.projects || []).length === 1 ? '' : 's')) : 'Every project'}</td>
        <td class="small muted">${esc(e.updatedBy || '')}<div class="xs">${esc(day(e.updatedAt))}</div></td>
        <td style="white-space:nowrap"><button class="btn sm" data-act="dmEdit" data-id="${esc(e.id)}">Edit</button> <button class="btn sm${e.status === 'published' ? '' : ' primary'}" data-act="dmPub" data-id="${esc(e.id)}">${e.status === 'published' ? 'Unpublish' : 'Publish'}</button> <button class="btn sm" data-act="dmDel" data-id="${esc(e.id)}">Delete</button></td></tr>`).join('');
      return `<div class="adm-card"><div class="adm-h"><h3>Discover more library</h3><span class="row" style="gap:8px"><button class="btn" data-act="dmDraft">Draft from a product note</button><button class="btn primary" data-act="dmEdit">New entry</button></span></div>
        <p class="small muted" style="margin:0 0 12px">Entries written here appear on the Explore Facilio page of every project they target, while they are published and inside their dates. Project teams can still add their own entries there. Nothing an AI draft says is published until you read it, edit it and publish it.</p>
        ${X.items.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Entry</th><th>Status</th><th>Dates</th><th>Shown to</th><th>Last edited</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="adm-empty">No entries yet. Create one, or draft one from a product note.</div>'}</div>`;
    }
  };
  const form = e => {
    const sel = new Set(e.projects || []);
    return `<label class="f" for="dm_t">Title</label><input id="dm_t" maxlength="160" value="${esc(e.title || '')}">
      <div class="grid g2"><div><label class="f" for="dm_m">Module or topic</label><input id="dm_m" maxlength="80" value="${esc(e.module || '')}"></div><div><label class="f" for="dm_a">Availability</label><select id="dm_a">${[['discuss', 'Let us discuss'], ['optional', 'Available to add'], ['enabled', 'Already included']].map(([k, l]) => `<option value="${k}"${(e.availability || 'discuss') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <label class="f" for="dm_p">The problem it solves</label><textarea id="dm_p" rows="2" maxlength="1200">${esc(e.problem || '')}</textarea>
      <label class="f" for="dm_s">Overview</label><textarea id="dm_s" rows="3" maxlength="2000">${esc(e.summary || '')}</textarea>
      <label class="f" for="dm_c">What it does (one per line)</label><textarea id="dm_c" rows="3">${esc((e.capabilities || []).join('\n'))}</textarea>
      <label class="f" for="dm_u">Where it helps (one per line)</label><textarea id="dm_u" rows="2">${esc((e.useCases || []).join('\n'))}</textarea>
      <label class="f" for="dm_src">Source of this wording</label><input id="dm_src" maxlength="300" value="${esc(e.source || '')}" placeholder="e.g. Release notes, product sheet name">
      <div class="grid g3"><div><label class="f" for="dm_st">Status</label><select id="dm_st"><option value="draft"${e.status !== 'published' ? ' selected' : ''}>Draft (hidden)</option><option value="published"${e.status === 'published' ? ' selected' : ''}>Published</option><option value="archived"${e.status === 'archived' ? ' selected' : ''}>Archived (kept, not shown)</option></select></div><div><label class="f" for="dm_f">Show from</label><input id="dm_f" type="date" value="${esc(e.from || '')}"></div><div><label class="f" for="dm_e">Show until</label><input id="dm_e" type="date" value="${esc(e.until || '')}"></div></div>
      <label class="f" for="dm_aud">Shown to</label><select id="dm_aud" data-change="dmAud"><option value="all"${e.audience !== 'projects' ? ' selected' : ''}>Every project</option><option value="projects"${e.audience === 'projects' ? ' selected' : ''}>Chosen projects only</option></select>
      <div id="dm_pl" style="${e.audience === 'projects' ? '' : 'display:none;'}max-height:170px;overflow:auto;margin-top:8px;border:1px solid #E4E7EC;border-radius:10px;padding:8px">${projects().filter(p => !p.archived).map(p => `<label class="chk" style="display:flex;gap:8px;padding:3px 0"><input type="checkbox" class="dm_pj" value="${esc(p.id)}"${sel.has(p.id) ? ' checked' : ''}> <span>${esc(p.name)}${p.customer ? ' <span class="xs muted">' + esc(p.customer) + '</span>' : ''}</span></label>`).join('') || '<span class="muted small">No projects.</span>'}</div>
      <div class="xs muted" style="margin-top:8px">Dates are optional. With no dates the entry is live while it is published. The end date is the last day it shows.</div>`;
  };
  ACT.dmAud = el => { const p = document.getElementById('dm_pl'); if (p) p.style.display = el.value === 'projects' ? '' : 'none'; };
  const open = (e, title) => drawer(title, form(e), `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dmSave" data-id="${esc(e.id || '')}">Save</button>`, { wide: true });
  ACT.dmEdit = a => { const id = a && a.getAttribute && a.getAttribute('data-id'); const e = id ? X.items.find(x => x.id === id) : { status: 'draft', audience: 'all' }; if (e) open(e, id ? 'Edit entry' : 'New entry'); };
  ACT.dmSave = a => V.busy(a, async () => { const id = a.getAttribute('data-id') || ('dm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4));
    const body = { title: val('dm_t'), module: val('dm_m'), availability: val('dm_a'), problem: val('dm_p'), summary: val('dm_s'), capabilities: lines(val('dm_c')), useCases: lines(val('dm_u')), source: val('dm_src'), status: val('dm_st'), from: val('dm_f'), until: val('dm_e'), audience: val('dm_aud'), projects: [...document.querySelectorAll('.dm_pj:checked')].map(x => x.value) };
    try { await API.put('/api/admin/discover/' + id, body); closeDrawer(); await V.admDiscover.load(); toast('Entry saved'); refresh(); } catch (e) { toast(e.message, 6000, true); } });
  ACT.dmPub = a => V.busy(a, async () => { const e = X.items.find(x => x.id === a.getAttribute('data-id')); if (!e) return; const on = e.status !== 'published';
    if (on && !(await confirmDialog('Publish entry', `Publish "${e.title}"? Customers of ${e.audience === 'projects' ? 'the chosen projects' : 'every project'} will see it${e.from ? ' from ' + day(e.from) : ' now'}.`, 'Publish'))) return;
    try { await API.put('/api/admin/discover/' + e.id, Object.assign({}, e, { status: on ? 'published' : 'draft' })); await V.admDiscover.load(); toast(on ? 'Published' : 'Unpublished'); refresh(); } catch (er) { toast(er.message, 6000, true); } });
  ACT.dmDel = async a => { const e = X.items.find(x => x.id === a.getAttribute('data-id')); if (!e || !(await confirmDialog('Delete entry', `Delete "${e.title}" for every project? Requests customers already made stay in their projects.`, 'Delete', true))) return;
    try { await API.del('/api/admin/discover/' + e.id); await V.admDiscover.load(); toast('Entry deleted'); refresh(); } catch (er) { toast(er.message, 6000, true); } };
  // product note (pasted or uploaded) -> a draft entry to review
  ACT.dmDraft = () => drawer('Draft from a product note', `<p class="small muted" style="margin-top:0">Paste text from a product sheet or release note, or choose a text, Word or PDF file. The AI writes a draft from that text only. It is saved as a draft and nothing is shown to customers until you publish it.</p><label class="f" for="dm_note">Product note</label><textarea id="dm_note" rows="9" placeholder="Paste the note here"></textarea><div class="row" style="margin-top:8px"><button class="btn sm" data-act="dmFile">Choose a file</button><span id="dm_fn" class="xs muted"></span></div>`,
    `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dmDraftGo">Write the draft</button>`, { wide: true });
  ACT.dmFile = async () => { const f = (await V.pickFile('.txt,.md,.docx,.pdf'))[0]; if (!f) return; try { const t = await V.extractTranscriptText(f); document.getElementById('dm_note').value = t.slice(0, 30000); const n = document.getElementById('dm_fn'); if (n) { n.textContent = f.name; n.dataset.name = f.name; } } catch (e) { toast('That file could not be read', 5000, true); } };
  ACT.dmDraftGo = a => V.busy(a, async () => { const text = val('dm_note'); const n = document.getElementById('dm_fn');
    try { const r = await API.post('/api/admin/discover/draft', { text, fileName: (n && n.dataset.name) || '' }); const d = Object.assign({ status: 'draft', audience: 'all', availability: 'discuss' }, r.draft); closeDrawer(); setTimeout(() => open(d, 'Review the draft'), 120); toast('Draft written. Read it before you save.', 6000); } catch (e) { toast(e.message, 7000, true); } });
})(typeof window !== 'undefined' ? window : globalThis);
