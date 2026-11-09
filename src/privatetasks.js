/* My private tasks (Tasks and email > My private tasks): a person's own day-to-day list for the project, kept apart from the shared tasks and visible to nobody else.
   The list is read and saved through /api/projects/:id/private-tasks, which only ever answers with the caller's own list (work/server/_privatetasks.mjs, tests/private_tasks.mjs). It is never an item of the
   project, so no shared page, report, export, search or Claude tool can show it. A private task can be made a shared project task (it then leaves this list). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const I = () => V.items; const { toast } = V;
  const url = () => '/api/projects/' + encodeURIComponent(S.project.id) + '/private-tasks';
  const P = () => (S.ui.ptk && S.ui.ptk.pid === S.project.id ? S.ui.ptk : (S.ui.ptk = { pid: S.project.id, items: null, loading: false, err: '' }));
  const today = () => (V.today ? V.today() : new Date().toISOString().slice(0, 10));
  const day = d => (d ? (V.fmtDate ? V.fmtDate(d) : d) : '');
  const newId = () => 'p' + Math.random().toString(36).slice(2, 10).padEnd(6, 'x');
  function load() { const p = P(); if (p.items !== null || p.loading) return; p.loading = true; API.get(url()).then(r => { p.items = r.items || []; }).catch(e => { p.items = []; p.err = e.message || 'The private list could not be loaded'; }).finally(() => { p.loading = false; V.render(); }); }
  async function persist() { const p = P(); try { const r = await API.put(url(), { items: p.items }); p.items = r.items; p.err = ''; } catch (e) { toast(e.message || 'Your private list was not saved', 6000, true); p.items = null; load(); } V.render(); }
  V.ptkCount = () => { const p = P(); return p.items ? p.items.filter(x => x.status !== 'Done').length : undefined; };

  const PR = { High: 'p-1', Medium: 'p-2', Low: 'p-3' };
  const row = x => `<li class="ptk-row${x.status === 'Done' ? ' done' : ''}"><input type="checkbox" data-change="ptkToggle" data-id="${esc(x.id)}" aria-label="Done: ${esc(x.title)}"${x.status === 'Done' ? ' checked' : ''}>
    <div class="ptk-main"><button type="button" class="ptk-t" data-act="ptkEdit" data-id="${esc(x.id)}">${esc(x.title)}</button>${x.notes ? `<div class="xs muted ptk-n">${esc(x.notes.slice(0, 140))}</div>` : ''}</div>
    ${x.priority ? `<span class="pt-pr ${PR[x.priority]}">${esc(x.priority)}</span>` : ''}${x.due ? `<span class="ptk-d${x.status !== 'Done' && x.due < today() ? ' late' : ''}">${esc(day(x.due))}</span>` : ''}
    <button type="button" class="btn sm ghost" data-act="ptkEdit" data-id="${esc(x.id)}">Edit</button></li>`;
  V.ptkHtml = () => {
    load(); const p = P(); const t0 = today(); const all = p.items || []; const open = all.filter(x => x.status !== 'Done'); const done = all.filter(x => x.status === 'Done').sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
    const sec = (title, list, cls) => (list.length ? `<section class="ptk-sec ${cls || ''}"><h4>${esc(title)} <span class="muted">${list.length}</span></h4><ul class="ptk-list">${list.map(row).join('')}</ul></section>` : '');
    const by = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || String(a.at).localeCompare(String(b.at));
    const groups = [['Overdue', open.filter(x => x.due && x.due < t0).sort(by), 'bad'], ['Today', open.filter(x => x.due === t0), ''], ['Coming up', open.filter(x => x.due && x.due > t0).sort(by), ''], ['No date', open.filter(x => !x.due), '']];
    return `<div class="card ptk"><div class="card-h"><h3>My private tasks</h3><span class="tag green" title="Nobody else can see this list">Only you can see these</span></div><div class="card-b">
      <p class="small muted" style="margin-top:0">Your own day-to-day list for this project. It is kept apart from the shared tasks: your team, admins, reports, exports and Claude never show it. Move a task to the project when it should be shared.</p>
      ${p.err ? `<div class="notice err" style="margin-bottom:10px"><span>${esc(p.err)}</span></div>` : ''}
      <div class="ptk-add"><input type="text" id="ptkT" maxlength="300" placeholder="Add a task and press Enter" aria-label="New private task"><input type="date" id="ptkD" aria-label="Due date" value="${t0}"><select id="ptkP" aria-label="Priority"><option value="">Priority</option><option>High</option><option>Medium</option><option>Low</option></select><button type="button" class="btn primary" data-act="ptkAdd">Add</button></div>
      ${p.items === null ? '<p class="muted">Loading your list…</p>' : (open.length ? groups.map(g => sec(g[0], g[1], g[2])).join('') : '<div class="empty" style="padding:18px 0"><p class="muted" style="margin:0">Nothing open. Add your first task above.</p></div>')}
      ${done.length ? `<details class="ptk-done"><summary>Done (${done.length})</summary><ul class="ptk-list">${done.slice(0, 30).map(row).join('')}</ul>${done.length > 1 ? '<button type="button" class="btn sm" data-act="ptkClearDone">Clear the done tasks</button>' : ''}</details>` : ''}
    </div></div>`;
  };

  ACT.ptkAdd = () => { const el = document.getElementById('ptkT'); const title = ((el && el.value) || '').trim(); if (!title) { if (el) el.focus(); return; } const p = P(); if (p.items === null) return;
    p.items = p.items.concat([{ id: newId(), title, notes: '', due: (document.getElementById('ptkD') || {}).value || '', priority: (document.getElementById('ptkP') || {}).value || '', status: 'To Do', at: new Date().toISOString(), doneAt: '' }]); persist(); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'ptkT') { e.preventDefault(); ACT.ptkAdd(); } });
  ACT.ptkToggle = el => { const p = P(); const id = el.getAttribute('data-id'); p.items = p.items.map(x => (x.id === id ? Object.assign({}, x, { status: el.checked ? 'Done' : 'To Do', doneAt: el.checked ? new Date().toISOString() : '' }) : x)); persist(); };
  ACT.ptkClearDone = () => { const p = P(); p.items = p.items.filter(x => x.status !== 'Done'); persist(); };
  ACT.ptkEdit = a => { const x = P().items.find(y => y.id === a.getAttribute('data-id')); if (!x) return;
    V.drawer('Private task', `<p class="small muted" style="margin-top:0">Only you can see this task.</p><label class="f" for="ptkE_t">Task</label><input type="text" id="ptkE_t" maxlength="300" value="${esc(x.title)}"><label class="f" for="ptkE_n">Notes</label><textarea id="ptkE_n" rows="4" maxlength="2000">${esc(x.notes)}</textarea>
      <div class="fgrid"><div><label class="f" for="ptkE_d">Due date</label><input type="date" id="ptkE_d" value="${esc(x.due)}"></div><div><label class="f" for="ptkE_p">Priority</label><select id="ptkE_p">${['', 'High', 'Medium', 'Low'].map(o => `<option value="${o}"${o === x.priority ? ' selected' : ''}>${o || 'None'}</option>`).join('')}</select></div></div>`,
      `<button class="btn danger" data-act="ptkDel" data-id="${esc(x.id)}">Delete</button><button class="btn" data-act="ptkShare" data-id="${esc(x.id)}" title="Creates a shared task in this project and removes it from your private list">Move to project tasks</button><span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ptkSave" data-id="${esc(x.id)}">Save</button>`); };
  ACT.ptkSave = a => { const p = P(); const id = a.getAttribute('data-id'); const g = i => (document.getElementById(i) || {}).value || ''; const title = g('ptkE_t').trim(); if (!title) { toast('Give the task a title'); return; }
    p.items = p.items.map(x => (x.id === id ? Object.assign({}, x, { title, notes: g('ptkE_n'), due: g('ptkE_d'), priority: g('ptkE_p') }) : x)); V.closeDrawer(); persist(); };
  ACT.ptkDel = async a => { const id = a.getAttribute('data-id'); if (!(await V.confirmDialog('Delete private task', 'Delete this task from your private list?', 'Delete', true))) return; P().items = P().items.filter(x => x.id !== id); V.closeDrawer(); persist(); };
  ACT.ptkShare = a => V.busy(a, async () => { const p = P(); const id = a.getAttribute('data-id'); const x = p.items.find(y => y.id === id); if (!x) return;
    if (!(await V.confirmDialog('Move to project tasks', 'This creates a shared task that your whole team can see, assigned to you, and removes it from your private list.', 'Move'))) return;
    await I().put('task', I().uid('t'), { title: x.title, desc: x.notes, type: 'Other', status: x.status === 'Done' ? 'Done' : 'To Do', priority: x.priority, owner: (S.user && S.user.email) || '', due: x.due, src: { type: 'manual' } }); p.items = p.items.filter(y => y.id !== id); V.closeDrawer(); await persist(); toast('Moved to the project tasks'); });
})(typeof window !== 'undefined' ? window : globalThis);
