/* Stage tasks: the standard tasks of each delivery stage, added to the project's task list with an owner chosen by Delivery role
   (Project settings > Access, Implementation team). The list comes from a published "Stage tasks" template (Templates) or the
   Facilio standard below. A person picks the stage, unticks what does not apply and presses Add; nothing is added by itself.
   Template text: one "# Stage" heading per stage (the task stages the server accepts), then one task per line:
   Title | Delivery role | Days until due | Task type. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return;
  const F = root.FWB, ACT = V.ACT, I = () => V.items, API = root.FWBApi;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SH = root.FWBStageTasks; if (!SH) return;   // the rules: work/server/_stagetasks.mjs (bundled before this file)
  const { STAGES, ROLES, STANDARD, parse, keyOf, ownerFor } = SH, dueIn = days => SH.dueIn(days);
  V.stageTaskLogic = { STAGES, ROLES, STANDARD, parse, keyOf, ownerFor };   // also run by tests/stage_tasks.mjs
  V.deliveryRoles = ROLES;

  if (!F) return;   // the rest is the page part
  const { S } = F, { drawer, closeDrawer, toast } = V;
  let st = null;   /* { tpls, src, text, name, stage } */
  async function textOf(src) {
    if (src === 'std') return { text: STANDARD, name: 'Facilio standard' };
    const t = st.tpls.find(x => x.id === src); const r = await API.get('/api/templates/' + src); return { text: (r.data || {}).body || '', name: t ? t.name : 'Template' };
  }
  function draw() {
    const P = parse(st.text), list = P.stages[st.stage] || [], have = new Set(I().list('task').map(t => t.key).filter(Boolean));
    const team = (F.doc('people') || {}).team || [], members = S.members || [];
    const rows = list.map((x, i) => { const own = ownerFor(x.role, team, members), done = have.has(keyOf(st.stage, x.title));
      return `<tr${done ? ' class="muted"' : ''}><td><input type="checkbox" data-sti="${i}" ${done ? 'disabled' : 'checked'} aria-label="Add ${esc(x.title)}"></td><td>${esc(x.title)}${done ? ' <span class="xs muted">· already added</span>' : ''}</td><td class="small">${esc(x.role || '—')}</td>
        <td class="small">${own ? esc(own.name) + (own.how === 'lead' ? ' <span class="xs muted">(project manager: nobody has this role)</span>' : '') : '<span class="muted">Nobody yet</span>'}</td><td class="small">${esc(dueIn(x.days))}</td></tr>`; }).join('');
    const noRoles = !team.some(x => x && x.drole);
    drawer('Add stage tasks', `<p class="small muted" style="margin-top:0">The standard tasks of a stage, each given to the team member with its Delivery role. Untick what does not apply. Tasks already added are skipped.</p>
      ${noRoles ? '<div class="notice warn small" style="margin-bottom:10px">No Delivery roles are set yet, so the tasks have no owner. Set them in Settings &gt; Access, Implementation team.</div>' : ''}
      <div class="fgrid"><div><label class="f">Stage</label><select data-change="stgStage">${STAGES.map(s => `<option${s === st.stage ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div><label class="f">Task list</label><select data-change="stgSrc"><option value="std"${st.src === 'std' ? ' selected' : ''}>Facilio standard</option>${st.tpls.map(t => `<option value="${esc(t.id)}"${st.src === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div></div>
      ${P.warnings.length ? `<div class="notice warn small" style="margin:8px 0">${P.warnings.slice(0, 4).map(esc).join('<br>')}</div>` : ''}
      <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th></th><th>Task</th><th>Delivery role</th><th>Owner</th><th>Due</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">This list has no tasks for this stage.</td></tr>'}</tbody></table></div>
      <p class="xs muted">Make your own list in Templates (type Stage tasks), publish it, and it appears under Task list.</p>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="stgAdd">Add tasks</button>`, { wide: true });
  }
  V.addStageTasks = async (tplId, stage) => {
    await I().load(['task']); let tpls = [];
    try { const r = await API.get('/api/templates?kind=tasks&projectId=' + encodeURIComponent(S.project.id)); tpls = (r.items || []).filter(t => t.status === 'published'); } catch (e) { }
    st = { tpls, src: tplId && tpls.some(t => t.id === tplId) ? tplId : (tpls[0] ? tpls[0].id : 'std'), stage: STAGES.includes(stage) ? stage : STAGES[0] };
    const src = await textOf(st.src).catch(() => ({ text: STANDARD, name: 'Facilio standard' })); st.text = src.text; st.name = src.name;
    if (!stage) { const have = new Set(I().list('task').map(t => t.key).filter(Boolean)), P = parse(st.text); st.stage = STAGES.find(s => (P.stages[s] || []).some(x => !have.has(keyOf(s, x.title)))) || STAGES[0]; }
    draw();
  };
  ACT.stgStage = el => { st.stage = el.value; draw(); };
  ACT.stgSrc = el => V.busy(null, async () => { st.src = el.value; try { const r = await textOf(st.src); st.text = r.text; st.name = r.name; } catch (e) { toast(e.message, 5000, true); } draw(); });
  ACT.stageTasks = () => V.addStageTasks();
  ACT.stgAdd = a => V.busy(a, async () => {
    const list = (parse(st.text).stages[st.stage] || []), team = (F.doc('people') || {}).team || [], picked = [...document.querySelectorAll('[data-sti]')].filter(x => x.checked && !x.disabled).map(x => list[+x.getAttribute('data-sti')]);
    if (!picked.length) { toast('Tick at least one task'); return; }
    let n = 0, skipped = 0;
    for (const x of picked) {
      const own = ownerFor(x.role, team, S.members);
      try { await I().put('task', I().uid('t'), { title: x.title, type: x.type, stage: st.stage, status: 'To Do', priority: 'Medium', owner: own ? own.email : '', due: dueIn(x.days), key: keyOf(st.stage, x.title), src: { type: 'template', label: st.name }, desc: x.role ? 'Delivery role: ' + x.role : '' }); n++; }
      catch (e) { if (e.status === 409) skipped++; else { toast('Stopped at "' + x.title + '": ' + e.message, 6000, true); break; } }
    }
    closeDrawer(); toast('Added ' + n + ' task' + (n === 1 ? '' : 's') + ' for ' + st.stage + (skipped ? ' (' + skipped + ' were already there)' : '') + '.'); V.render();
  });
})(typeof window !== 'undefined' ? window : globalThis);
