/* Change tracks on Change requests (plan: docs/plans/CR-AFTER-GOLIVE-2026-11-23.md; rules in src/crtracklogic.js, tests/cr_track.mjs).
   A change request can own a new contract that came after the kick-off was approved: Claude reads it (job pull_cr) and saves what changes (pull transfer kind cr_delta,
   scope = the CR record id); the project owner approves that on Transfers; "Set up the change" then adds the change's scope lines, requirement sessions, plan phase and
   BRD addendum, tagged with the CR number. The approved kick-off, plan, sessions and BRDs are never changed. Team only. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const L = () => root.FWBCrTrack; const I = () => V.items;
  const { toast } = V;
  const team = () => S.project && !V.isCustomer();
  const base = () => '/api/projects/' + encodeURIComponent(S.project.id); const xurl = id => base() + '/transfers' + (id ? '/' + encodeURIComponent(id) : '');
  const X = () => { const pid = S.project ? S.project.id : ''; if (!S.ui.crx || S.ui.crx.pid !== pid) S.ui.crx = { pid, list: null, loading: false, view: {} }; return S.ui.crx; };
  async function load(force) {
    const x = X(); if (!team() || x.loading || (x.list && !force)) return; x.loading = true;
    try { x.list = (await API.get(xurl() + '?kind=' + L().KIND)).transfers || []; } catch (e) { x.list = []; } finally { x.loading = false; }
    if (S.ui.view === 'changes') V.render();
  }
  V.crTrackLoad = load;
  const deltaOf = c => { const l = X().list || []; return l.find(t => t.id === c.deltaId) || l.find(t => t.scope && t.scope === c.id) || null; };
  const brdStatus = () => { const d = F.doc('brddoc') || {}; const o = {}; Object.entries(d.docs || {}).forEach(([k, v]) => { o[k] = (v || {}).status || ''; }); return o; };
  const stepsOf = c => { const p = F.doc('planner') || {}; return L().steps(c, { delta: deltaOf(c), sessions: p.sessions, brds: (F.doc('brddoc') || {}).list, brdStatus: brdStatus(), utc: I().list('utc') }); };

  /** the button on each change request row */
  V.crTrackBtn = c => { if (!team()) return ''; load(); const s = stepsOf(c), n = s.filter(x => x.done).length, on = c.track || deltaOf(c);
    return `<button class="btn sm" data-act="crxOpen" data-id="${esc(c.id)}" title="The new contract, sessions, plan and BRD addendum of this change">${on ? 'Change track ' + n + '/' + s.length : 'Change track'}</button>`; };

  /** new contracts Claude read that no change request owns yet (asked from the chat, or from Contract intake before a CR existed) */
  V.crTrackInbox = () => { if (!team()) return ''; load(); const cr = I().list('cr'); const own = new Set(cr.map(c => c.deltaId).concat(cr.map(c => c.id)));
    const loose = (X().list || []).filter(t => !own.has(t.id) && !own.has(t.scope));
    const ask = '<button class="btn sm" data-act="crxPull" title="Claude looks in the project\'s OneDrive folder for a contract that was not read before and saves what it changes">Read a new contract with Claude</button>';
    if (!loose.length) return `<div class="card" style="margin-bottom:14px"><div class="card-b small" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="muted" style="flex:1;min-width:240px">A new contract after the kick-off (a change request, amendment or renewal)? Claude reads it and the change gets its own sessions, plan phase and BRD addendum. The approved kick-off stays as it is.</span>${ask}</div></div>`;
    return `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>New contracts read by Claude</h3><span class="small muted">${loose.length} not tied to a change request yet</span><span class="spacer"></span>${ask}</div><div class="card-b">${loose.map(t => `<div class="row" style="align-items:center;gap:10px;margin-bottom:6px"><span class="small" style="flex:1"><b>${esc((t.source && t.source.label) || 'New contract')}</b> <span class="muted">· ${esc(t.status)}</span></span><button class="btn sm primary" data-act="crxAdopt" data-id="${esc(t.id)}">Start a change track from it</button></div>`).join('')}</div></div>`; };

  async function claude(c) {
    const note = c ? 'Change request ' + L().crNo(c) + ': ' + (c.title || '') : 'A new contract for this project (not tied to a change request yet)';
    await API.post(base() + '/jobs', { kind: 'pull_cr', ref: c ? c.id : '', note }); if (V.asstRequested) V.asstRequested(); if (V.studioJobs) V.studioJobs.load(true);
    toast('Claude was asked to find and read the new contract. When it is saved, approve it on Transfers, then press Set up the change here.', 8000);
  }
  ACT.crxPull = a => V.busy(a, () => claude(null));
  /** Contract intake after the kick-off is approved (src/msadocs.js reread): a change track first; Cancel keeps the old way (a change to the kick-off deck and plan). true when a track was started */
  V.crTrackStart = async why => {
    if (!team() || !V.confirmDialog) return false;
    const yes = await V.confirmDialog('A new contract after the kick-off', 'The kick-off is approved, so it is not redrafted. Start a change track for this contract? Claude reads only what it changes; once the project owner approves that, the change gets its own requirement sessions, plan phase and BRD addendum. Choose Cancel to send it as a change to the kick-off deck and plan instead.', 'Start a change track');
    if (!yes) return false;
    await I().load(['cr']); for (let i = 0; i < 30 && !I().ready(['cr']); i++) await new Promise(r => setTimeout(r, 100));
    const n = Math.max(0, ...I().list('cr').map(c => c.n || 0)) + 1, id = I().uid('cr'), c = { n, title: 'New contract (' + String(why || 'contract documents changed').slice(0, 120) + ')', mod: 'project', status: 'Draft', side: 'facilio', track: true, description: 'Change track started from Contract intake.' };
    await I().put('cr', id, c); await claude(Object.assign({ id }, c)); V.go('changes'); return true;
  };
  ACT.crxAdopt = a => V.busy(a, async () => { const t = (X().list || []).find(x => x.id === a.getAttribute('data-id')); if (!t) return;
    const n = Math.max(0, ...I().list('cr').map(c => c.n || 0)) + 1; const id = I().uid('cr');
    await I().put('cr', id, { n, title: String((t.source && t.source.label) || 'New contract').replace(/\.(pdf|docx?|txt)$/i, '').slice(0, 160), mod: 'project', status: 'Draft', side: 'facilio', track: true, deltaId: t.id, description: 'Change track for a new contract read by Claude.' });
    toast('Change request CR-' + String(n).padStart(3, '0') + ' made. Open its change track to see the next step.', 6000); V.render(); });

  async function deltaView(t) { const x = X(); const k = t.id + '@' + t.ver; if (x.view[k]) return x.view[k];
    try { const g = await API.get(xurl(t.id) + '?ver=' + encodeURIComponent(t.approvedVer || 'latest')); x.view[k] = L().parseDelta(g.content); } catch (e) { x.view[k] = { error: e.message || 'The change reading could not be loaded.' }; } return x.view[k]; }
  const listOf = (h, a) => a.length ? `<div class="small" style="margin:8px 0 2px"><b>${h}</b> (${a.length})</div><ul class="small" style="margin:0;padding-left:18px">${a.slice(0, 8).map(i => `<li>${esc(i.text)}${i.module ? ' <span class="muted">· ' + esc(i.module) + '</span>' : ''}${i.page ? ' <span class="muted">· ' + (i.doc ? esc(i.doc) + ' ' : '') + 'p.' + i.page + '</span>' : ''}</li>`).join('')}${a.length > 8 ? `<li class="muted">and ${a.length - 8} more</li>` : ''}</ul>` : '';

  ACT.crxOpen = async a => { const c = I().get('cr', a.getAttribute('data-id')); if (!c) return; await load(true); const t = deltaOf(c), no = L().crNo(c), s = stepsOf(c);
    const d = t ? await deltaView(t) : null;
    const track = `<ol class="small" style="margin:0 0 12px;padding-left:20px">${s.map(x => `<li style="margin:3px 0">${x.done ? '<b style="color:#0F6F06">✓</b> ' : '<span class="muted">○</span> '}${esc(x.label)}</li>`).join('')}</ol>`;
    let next = '';
    if (!t) next = `<p class="small" style="margin-top:0">No new contract is tied to ${no} yet. Claude looks in the project's OneDrive folder (every subfolder, whatever the file names) for the contract that was not read before, and saves only what it changes.</p><button class="btn primary" data-act="crxPullOne" data-id="${esc(c.id)}">Read the new contract with Claude</button>`;
    else if (!t.approvedVer) next = `<p class="small" style="margin-top:0">Claude read <b>${esc((t.source && t.source.label) || 'the new contract')}</b> (${esc(t.status)}). The project owner checks and approves it on Transfers; nothing is set up before that.</p><button class="btn primary" data-act="crxReview" data-id="${esc(t.id)}">Review it on Transfers</button>`;
    else next = `<p class="small" style="margin-top:0">${c.setupAt ? 'Set up on ' + esc(String(c.setupAt).slice(0, 10)) + (c.setupVer && c.setupVer !== t.approvedVer ? '. A newer reading is approved: set up again to add what is new.' : '. Setting up again only adds what is missing.') : 'Approved. Set up adds the change\'s scope lines, requirement sessions, a plan phase and a BRD addendum, all marked ' + esc(no) + '.'}</p><button class="btn primary" data-act="crxSetup" data-id="${esc(c.id)}">${c.setupAt ? 'Set up again' : 'Set up the change'}</button>`;
    const body = d && !d.error ? `<div class="card" style="margin-top:12px"><div class="card-b">${d.title ? `<div class="small"><b>${esc(d.title)}</b></div>` : ''}${d.documents.length ? `<div class="xs muted">Read: ${esc(d.documents.join(', '))}</div>` : ''}${listOf('Added', d.added)}${listOf('Changed', d.changed)}${listOf('Removed', d.removed)}${d.conflicts.length ? `<div class="small" style="margin-top:8px;color:#D85903"><b>Conflicts with the original contract</b><ul style="margin:2px 0 0;padding-left:18px">${d.conflicts.slice(0, 6).map(x => '<li>' + esc(x) + '</li>').join('')}</ul></div>` : ''}</div></div>` : d && d.error ? `<p class="small" style="color:#D85903">${esc(d.error)}</p>` : '';
    const links = c.setupAt ? `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm" data-act="crxGo" data-v="planner">Requirement sessions</button><button class="btn sm" data-act="crxGo" data-v="timeline">Project plan</button><button class="btn sm" data-act="crxGo" data-v="brd">BRD addendum</button><button class="btn sm" data-act="crxGo" data-v="uatrun">UAT</button></div>` : '';
    V.openDrawer(no + ' · change track', `<p class="small muted" style="margin-top:0">${esc(c.title || '')}</p>${track}${next}${body}${links}`, `<button class="btn" data-act="crxClaude" data-id="${esc(c.id)}">Ask Claude about this change</button><span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>`, { wide: true }); };
  ACT.crxPullOne = a => V.busy(a, async () => { const c = I().get('cr', a.getAttribute('data-id')); if (!c) return; if (!c.track) await I().put('cr', c.id, Object.assign({}, c, { track: true })); await claude(c); V.ACT.closeDrawer(); });
  ACT.crxReview = async a => { const id = a.getAttribute('data-id'); V.ACT.closeDrawer(); V.go('transfers'); setTimeout(() => { if (ACT.xfOpen) ACT.xfOpen({ getAttribute: k => (k === 'data-id' ? id : k === 'data-sp' ? 'project' : null) }); }, 400); };
  ACT.crxGo = a => { V.ACT.closeDrawer(); V.go(a.getAttribute('data-v')); };
  ACT.crxClaude = async a => { const c = I().get('cr', a.getAttribute('data-id')); if (!c) return; const no = L().crNo(c);
    await V.claudeOpenSimple('Use the Delivery Studio connector for this project. Change request ' + no + ' (' + (c.title || '') + ') has its own change track. Read it with get_records kind cr, the new contract with transfer_read (kind cr_delta, scope ' + c.id + '), and the scope lines, sessions and plan rows marked ' + no + '. Tell me where the change stands, what is still missing for it, and anything in the new contract that conflicts with the original one.', { title: no + ' change track', task: 'cr_track', module: 'Change requests' }); };

  /** Set up: the approved reading becomes scope lines, sessions, a plan phase and a BRD addendum; only what is not there yet is added */
  ACT.crxSetup = a => V.busy(a, async () => {
    const c = I().get('cr', a.getAttribute('data-id')); if (!c) return; await load(true); const t = deltaOf(c); if (!t || !t.approvedVer) { toast('Approve the change on Transfers first.', 5000, true); return; }
    let g; try { g = await API.get(xurl(t.id) + '?ver=' + t.approvedVer); } catch (e) { toast(e.message || 'The approved reading could not be loaded.', 6000, true); return; }
    const d = L().parseDelta(g.content); if (d.error) { toast(d.error + ' Ask Claude to save it again.', 7000, true); return; }
    F.doc('planner'); const pd = S.docs.planner.data = (S.docs.planner.data && typeof S.docs.planner.data === 'object') ? S.docs.planner.data : {}; pd.scope = Array.isArray(pd.scope) ? pd.scope : []; pd.sessions = Array.isArray(pd.sessions) ? pd.sessions : [];
    F.doc('plan_struct'); const ps = S.docs.plan_struct.data = (S.docs.plan_struct.data && typeof S.docs.plan_struct.data === 'object') ? S.docs.plan_struct.data : {}; ps.rows = Array.isArray(ps.rows) ? ps.rows : [];
    const B = root.FWBBrd, brds = B ? B.list() : [];
    const mods = F.allModules ? F.allModules() : []; const modKey = lab => { const l = String(lab).toLowerCase(); const m = mods.find(x => String(x.name).toLowerCase() === l || String(V.modLabel ? V.modLabel(x.name) : '').toLowerCase() === l || String(x.label || '').toLowerCase() === l); return m ? m.name : ''; };
    const r = L().setup(d, { cr: c, today: V.today(), scope: pd.scope, sessions: pd.sessions, rows: ps.rows, brds, sessionPlan: root.FWBKickoffLogic && root.FWBKickoffLogic.sessionPlan, uid: F.uid, modKey });
    if (r.scope.length || r.sessions.length) { pd.scope.push(...r.scope); pd.sessions.push(...r.sessions); F.changed('Change ' + r.no + ' set up', r.scope.length + ' scope lines, ' + r.sessions.length + ' sessions', { section: 'planner', render: false }); }
    if (r.rows.length) { ps.rows.push(...r.rows); F.changed(null, null, { section: 'plan_struct', render: false }); }
    if (r.brd && B) { if (V.contractBasis) r.brd.basis = V.contractBasis(); brds.push(r.brd); B.state(r.brd.id); F.changed(null, null, { section: B.store(), render: false }); }
    await I().put('cr', c.id, Object.assign({}, c, { track: true, deltaId: t.id, setupAt: new Date().toISOString(), setupVer: t.approvedVer, setupBy: (S.user && (S.user.name || S.user.email)) || '' }));
    V.ACT.closeDrawer(); V.render();
    toast('Set up ' + r.no + ': ' + [r.scope.length + ' scope lines', r.sessions.length + ' sessions', r.rows.length ? 'a plan phase' : '', r.brd ? 'a BRD addendum' : ''].filter(Boolean).join(', ') + '.' + (r.notes.length ? ' ' + r.notes.join(' ') : ''), 11000);
  });
})(window);
