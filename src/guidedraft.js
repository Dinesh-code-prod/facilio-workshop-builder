/* User Guide Builder — guided drafting, modelled on the BRD Draft workflow.
   A guide records its set-up (W.plan: modules, readers' roles, level of detail, the sources to use, an optional walkthrough). Each section has a
   brief, and is written (or rewritten) on its own through the shared AI service (POST /ai/guide-section, operation "document"), so one section can
   be regenerated without touching the others. Rules that keep people in control:
   - a section the person has edited is never overwritten: a regeneration comes back as a proposal (replace / add below / discard), and the guide is
     saved as a version first when a proposal replaces edited text;
   - each AI section records which sources and which state of them it was written from; when those records change, the section is flagged
     "Sources changed" so it can be reviewed (nothing is rewritten automatically);
   - "[Missing: …]" markers from the AI stay in the text and are flagged by the quality checks until a person resolves them.
   Nothing here approves or publishes: approval stays with the project owner on the Quality checks tab. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const API = root.FWBApi;
  const { drawer, closeDrawer, toast, ico, tag, confirmDialog } = V;
  const C = () => V.ugCtx; const W = () => C().W();
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  // the sections a Facilio user guide usually has; the person picks the ones that fit the modules (nothing is forced)
  const STRUCT = [
    ['purpose', 'Purpose and scope', 'What this guide covers, which modules, and who it is for', true],
    ['before', 'Before you start', 'Prerequisites: access, permissions and anything that must exist first', true],
    ['nav', 'Navigation and access', 'How to reach each module: app, tab and menu path', true],
    ['overview', 'Module overview', 'What each module is for and how the modules relate', true],
    ['steps', 'Step-by-step procedures', 'The main tasks as numbered steps, by role', true],
    ['fields', 'Screens and fields', 'The fields on the main forms and what to enter', false],
    ['status', 'Statuses and workflow', 'Status transitions and who can move a record from one status to the next', true],
    ['actions', 'Buttons and actions', 'The actions available and when to use them', false],
    ['rules', 'Validations and rules', 'What the system checks and the messages a user may see', false],
    ['faq', 'Troubleshooting and FAQ', 'Common problems and their answers', true],
    ['related', 'Related procedures', 'Other procedures and dependencies the reader may need', false]
  ];
  // a UAT guide: what customer testers follow during user acceptance testing (same drafting workflow, UAT-shaped sections and sources)
  const STRUCT_UAT = [
    ['u_purpose', 'Purpose and scope of UAT', 'What this UAT covers (modules, processes) and what is out of scope', true],
    ['u_roles', 'Roles and responsibilities', 'Who tests, who fixes, who signs off', true],
    ['u_env', 'Test environment and access', 'Where to test, test users and logins, test data to use', true],
    ['u_how', 'How to test', 'The approach, entry and exit criteria, and how long testing runs', true],
    ['u_scen', 'Test scenarios', 'Scenarios per module: requirement, preconditions, steps, expected result; actual result and pass/fail left for the tester', true],
    ['u_defects', 'Recording results and defects', 'How to record results, raise a defect and its severity, and what happens next', true],
    ['u_out', 'Not in this UAT', 'Unconfirmed requirements and changes that are not approved, so testers know what not to test', true],
    ['u_signoff', 'Sign-off', 'How UAT is signed off and by whom', true],
    ['u_sched', 'Schedule and contacts', 'UAT sessions, dates and who to contact', false]
  ];
  const SRC = [['cfg', 'Configuration Inputs', 'custom modules, relationships and apps, and the configuration digest', ['cmodx', 'cfgrel', 'capp']], ['decisions', 'Confirmed decisions', 'decisions recorded in workshops', ['decision']], ['usecases', 'Use cases', 'use cases and their steps', ['usecase']], ['brd', 'BRD', 'the BRD document', []], ['build', 'Build items', 'what has been built and verified', ['build']], ['published', 'Customer User Guide (published)', 'the module workbook shared with the customer', []], ['reqs', 'Confirmed requirements', 'requirements agreed in the workshops (drafts are given as not agreed)', []], ['uat', 'UAT sessions and readiness', 'UAT demos, training and the readiness checklist', ['uat', 'checklist']], ['crs', 'Approved change requests', 'agreed changes to scope', ['cr']]];
  const SRC_ON = { user: ['cfg', 'decisions', 'usecases', 'brd', 'build', 'reqs'], uat: ['reqs', 'usecases', 'crs', 'uat', 'cfg', 'decisions'] };
  const LEVELS = [['overview', 'Overview'], ['steps', 'Step-by-step'], ['detailed', 'Detailed (fields, statuses, buttons)']];
  const KINDS = [...new Set(SRC.flatMap(x => x[3]))].concat(['vid']);
  const DOCS = { cfg: ['config_digest', 'config'], brd: ['brddoc'], published: ['guide_published'], reqs: ['workshop'] };

  const modOptions = () => { const set = new Map(); try { (F.allModules ? F.allModules() : []).filter(m => m.inScope).forEach(m => set.set(m.label, 1)); } catch (e) { } I().list('cmodx').forEach(m => set.set(m.label || m.name, 1)); return [...set.keys()].filter(Boolean).sort(); };
  const roleOptions = () => { try { return [...new Set((F.allActors ? F.allActors() : []).map(a => a.roleName).filter(Boolean))].sort(); } catch (e) { return []; } };

  // what a section was written from: per source kind the number of matching records and the latest change, plus the size of the documents.
  // Compared later to flag sections whose sources have changed. Cheap and computed in the page from records already loaded.
  function sig(plan) {
    plan = plan || {}; const mods = (plan.modules || []).map(m => m.toLowerCase()); const about = r => !mods.length || mods.some(m => JSON.stringify(r).toLowerCase().includes(m));
    const parts = []; SRC.forEach(([k, , , kinds]) => { if (!(plan.sources || {})[k]) return; kinds.forEach(kd => { const rs = I().list(kd).filter(about); parts.push(kd + ':' + rs.length + ':' + rs.reduce((m, r) => (String(r._at || '') > m ? String(r._at || '') : m), '')); }); (DOCS[k] || []).forEach(d => { const x = F.doc ? F.doc(d) : null; parts.push(d + ':' + (x ? JSON.stringify(x).length : 0)); }); });
    if (plan.vid) { const v = I().get('vid', plan.vid); parts.push('vid:' + (v ? v._at : 'gone')); }
    return parts.join('|');
  }
  const stale = (g, s) => !!(s.ai && s.ai.sig && g.plan && s.ai.sig !== sig(g.plan));

  // ---------- new guide: a short guided set-up (like starting a BRD draft) ----------
  ACT.ugNewUat = () => ACT.ugNew({ getAttribute: () => 'uat' });
  ACT.ugNew = a => {
    const kind = a && a.getAttribute && a.getAttribute('data-k') === 'uat' ? 'uat' : 'user'; const ST = kind === 'uat' ? STRUCT_UAT : STRUCT; I().load(KINDS); const mods = modOptions(), roles = roleOptions(); const vids = I().list('vid'); const ai = I().list('ai').filter(x => x.task === 'guide'); const cfg = I().list('cmodx').length + I().list('capp').length;
    const chk = (name, v, l, on, sub) => `<label class="ug-opt"><input type="checkbox" name="${name}" value="${esc(v)}"${on ? ' checked' : ''}><span><b>${esc(l)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
    drawer(kind === 'uat' ? 'New UAT guide' : 'New user guide', `<input type="hidden" id="ug_kind" value="${kind}">${kind === 'uat' ? '<p class="small" style="margin-top:0">A guide for the customer\'s testers: what to test, how, the scenarios with expected results, how to record defects and sign off. Scenarios come only from confirmed requirements, approved changes and use cases.</p>' : ''}<ol class="ug-steps" aria-label="Steps"><li class="on">Set up</li><li>Draft sections</li><li>Review and edit</li><li>Check</li><li>Approve and export</li></ol>
      <label class="f" for="ug_t">Guide title</label><input type="text" id="ug_t" maxlength="120" value="${kind === 'uat' ? 'UAT guide' : 'User guide'}">
      <div class="fgrid"><div><label class="f" for="ug_c">Customer</label><input type="text" id="ug_c" maxlength="80" value="${esc((S.project && S.project.customer) || '')}"></div><div><label class="f" for="ug_lv">Level of detail</label><select id="ug_lv">${LEVELS.map(([k, l]) => `<option value="${k}"${k === 'steps' ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
      <fieldset class="ug-fs"><legend class="f">1. Modules or workflows this guide covers</legend>${mods.length ? `<div class="ug-opts">${mods.map(m => chk('ug_m', m, m, false)).join('')}</div>` : '<p class="small muted">No module is marked in scope yet (System Modules) and no custom module is described (Configuration Inputs). You can still write the guide; the AI then uses all project records.</p>'}<input type="text" id="ug_mx" maxlength="200" placeholder="Other modules, separated by commas" style="margin-top:6px"></fieldset>
      <fieldset class="ug-fs"><legend class="f">2. Readers (roles)</legend>${roles.length ? `<div class="ug-opts">${roles.map(r => chk('ug_r', r, r, false)).join('')}</div>` : ''}<input type="text" id="ug_rx" maxlength="200" placeholder="${roles.length ? 'Other roles, separated by commas' : 'e.g. Technician, Helpdesk agent'}" style="margin-top:6px"></fieldset>
      <fieldset class="ug-fs"><legend class="f">3. Sources the AI may use</legend><div class="ug-opts">${SRC.map(([k, l, sub]) => chk('ug_s', k, l, SRC_ON[kind].includes(k), sub)).join('')}</div>
        ${vids.length ? `<label class="f" for="ug_v">Recorded walkthrough (optional)</label><select id="ug_v"><option value="">None</option>${vids.map(v => `<option value="${esc(v.id)}">${esc(v.title || 'Walkthrough')}</option>`).join('')}</select>` : '<p class="xs muted">A recorded walkthrough can be added from Video to Guide.</p>'}</fieldset>
      <fieldset class="ug-fs"><legend class="f">4. Sections</legend><div class="ug-opts">${ST.map(([k, l, sub, on]) => chk('ug_x', k, l, on, sub)).join('')}</div></fieldset>
      <label class="f" for="ug_start">Then</label><select id="ug_start"><option value="gen">Write every section now with AI (one at a time, about 10–20 s each)</option><option value="empty">Create the sections empty; I will write or generate them one by one</option>${cfg ? `<option value="cfg">Start from Configuration Inputs (no AI)</option>` : ''}${ai.length ? `<option value="ai">Start from an existing AI guide draft (${ai.length})</option>` : ''}</select>
      <p class="xs muted" style="margin-top:8px">The AI writes only from the chosen sources and marks what it cannot find as <b>[Missing: …]</b>. Everything stays a draft until a project owner approves it.</p>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ugWizGo">${ico('plus')}Create guide</button>`, { wide: true });
  };
  const picked = n => [...document.querySelectorAll(`input[name="${n}"]:checked`)].map(x => x.value);
  const extra = id => ((document.getElementById(id) || {}).value || '').split(',').map(x => x.trim()).filter(Boolean);
  ACT.ugWizGo = a => V.busy(a, async () => {
    const val = i => ((document.getElementById(i) || {}).value || '').trim(); const title = val('ug_t'); if (!title) { V.ui.field('ug_t', 'Enter a title'); return; }
    const kind = val('ug_kind') === 'uat' ? 'uat' : 'user'; const plan = { kind, modules: [...new Set(picked('ug_m').concat(extra('ug_mx')))].slice(0, 20), roles: [...new Set(picked('ug_r').concat(extra('ug_rx')))].slice(0, 12), level: val('ug_lv') || 'steps', sources: {}, vid: val('ug_v') || '' };
    picked('ug_s').forEach(k => { plan.sources[k] = true; }); const start = val('ug_start');
    if (!Object.keys(plan.sources).length && !plan.vid && start === 'gen') { toast('Choose at least one source, or create the sections empty'); return; }
    let sections = picked('ug_x').map(k => { const d = STRUCT.concat(STRUCT_UAT).find(x => x[0] === k); return { id: uid('s'), title: d[1], brief: d[2], blocks: [], gen: start === 'gen' ? 'pending' : undefined }; });
    if (start === 'cfg' && V.ugCfgSections) sections = V.ugCfgSections();
    if (start === 'ai') { const d = I().list('ai').filter(x => x.task === 'guide').sort((p, q) => String(q._created || '').localeCompare(String(p._created || '')))[0]; if (d && V.ugSectionsFromMd) sections = V.ugSectionsFromMd(d.content); }
    const id = I().uid('ug');
    await I().put('ugd', id, { title, customer: val('ug_c'), audience: plan.roles.join(', '), version: '0.1', status: 'draft', plan, brand: { accent: '#1570EF', footer: '', cover: true, logo: null }, sections });
    closeDrawer(); S.ui.ugOpen = id; S.ui.ugTab = 'content'; V.render();
    if (start === 'gen') setTimeout(() => ACT.ugGenAll(), 50);
  });

  // ---------- generate one section ----------
  const busy = new Set(); let runAll = false;
  const secBody = (sec, g) => { const others = (g.sections || []).filter(x => x !== sec).map(x => x.title); return { title: sec.title, brief: sec.brief || '', guideTitle: g.title, modules: g.plan.modules, roles: g.plan.roles, level: g.plan.level, sources: g.plan.sources, vid: g.plan.vid || undefined, others, kind: g.plan.kind === 'uat' ? 'uat' : undefined }; };
  async function writeSection(sec, g) { return API.post(`/api/projects/${S.project.id}/ai/guide-section`, secBody(sec, g)); }
  const meta = r => ({ at: new Date().toISOString(), provider: r.provider, model: r.model, notice: r.notice || '', srcs: (r.sources || []).map(s => s.ref + ' ' + s.label), sig: sig(W().plan) });
  const hasText = sec => (sec.blocks || []).some(b => (b.t === 'md' && String(b.text || '').trim()) || b.t === 'img');
  async function gen(i, opts) {
    const g = W(); const sec = g && g.sections[i]; if (!sec || busy.has(sec.id)) return; if (!g.plan) { toast('Set up this guide first (modules, readers, sources)', 5000, true); ACT.ugPlan(); return; }
    busy.add(sec.id); sec.gen = 'running'; V.render();
    try {
      const r = (opts && opts.reply) || await writeSection(sec, g); const cur = W(); const s2 = cur && cur.sections.find(x => x.id === sec.id); if (!s2) return;
      s2.gen = undefined;
      if (hasText(s2) && (s2.edited || !s2.ai)) { s2.proposal = Object.assign({ text: r.text }, meta(r)); C().schedule(); V.render(); if (!(opts && opts.quiet)) ACT.ugProposal({ getAttribute: () => s2.id }); return; }   // never overwrite what a person wrote
      C().edit(() => { const imgs = (s2.blocks || []).filter(b => b.t === 'img'); s2.blocks = [{ t: 'md', text: r.text }].concat(imgs); s2.ai = meta(r); s2.edited = false; delete s2.proposal; });
      if (r.notice) toast(r.notice, 6000);
    } catch (e) { const s2 = (W() || { sections: [] }).sections.find(x => x.id === sec.id); if (s2) { s2.gen = 'error'; s2.err = e.message; } if (!(opts && opts.quiet)) toast(e.message, 6000, true); throw e; }
    finally { busy.delete(sec.id); V.render(); }
  }
  ACT.ugClaude = a => { const i = Number(a.getAttribute('data-i')); const g = W(); const sec = g && g.sections[i]; if (!sec) return; if (!g.plan) { toast('Set up this guide first (modules, readers, sources)', 5000, true); ACT.ugPlan(); return; }
    V.claudeHandoff({ title: 'Guide section: ' + sec.title, url: `/api/projects/${S.project.id}/ai/guide-section`, body: secBody(sec, g), extra: 'If you have a recorded walkthrough of this process, attach it to the chat as well.', onReply: r => gen(i, { reply: r }).catch(() => { }) }); };
  ACT.ugGen = a => { const i = Number(a.getAttribute('data-i')); gen(i).catch(() => { }); };
  ACT.ugGenAll = async () => {
    const g = W(); if (!g || runAll) return; runAll = true; const todo = g.sections.map((s, i) => [s, i]).filter(([s]) => s.gen === 'pending' || s.gen === 'error' || !hasText(s)); let ok = 0, failed = 0;
    try { for (const [s] of todo) { const i = W().sections.findIndex(x => x.id === s.id); if (i < 0) continue; try { await gen(i, { quiet: true }); ok++; } catch (e) { failed++; if (/rate|limit|429/i.test(e.message)) { toast('The AI rate limit was reached; the remaining sections are marked so you can continue later.', 7000, true); break; } } } }
    finally { runAll = false; V.render(); }
    toast(failed ? `${ok} section(s) written, ${failed} failed. Use Generate on those sections to try again.` : `${ok} section(s) written. Review each one before approval.`, 6000, !!failed);
  };
  // a proposal for a section the person has edited: replace (after saving a version), add below, or discard
  ACT.ugProposal = a => {
    const g = W(); const sec = g.sections.find(x => x.id === a.getAttribute('data-id')); if (!sec || !sec.proposal) return; const cur = (sec.blocks || []).filter(b => b.t === 'md').map(b => b.text).join('\n\n');
    drawer('New AI text for "' + sec.title + '"', `<p class="small" style="margin-top:0">This section has text a person wrote or edited, so the new AI text was not applied. Compare and choose.</p><div class="ug-cmp"><div><p class="ug-k">Current text</p><pre>${esc(cur || '(empty)')}</pre></div><div><p class="ug-k">AI proposal · ${esc(sec.proposal.provider || '')}</p><pre>${esc(sec.proposal.text)}</pre></div></div>`,
      `<button class="btn" data-act="ugPropGo" data-id="${esc(sec.id)}" data-k="discard">Discard proposal</button><span class="spacer"></span><button class="btn" data-act="ugPropGo" data-id="${esc(sec.id)}" data-k="append">Add below my text</button><button class="btn primary" data-act="ugPropGo" data-id="${esc(sec.id)}" data-k="replace">Replace my text</button>`, { wide: true });
  };
  ACT.ugPropGo = async a => {
    const k = a.getAttribute('data-k'); const g = W(); const sec = g.sections.find(x => x.id === a.getAttribute('data-id')); if (!sec || !sec.proposal) { closeDrawer(); return; } const p = sec.proposal;
    if (k === 'replace' && V.guideUpdate && V.guideUpdate.snapshot) { try { await C().flush(); await V.guideUpdate.snapshot('Before replacing "' + sec.title.slice(0, 40) + '"', 'Saved automatically before AI text replaced edited text'); } catch (e) { toast('Could not save a version first, so nothing was replaced: ' + e.message, 6000, true); return; } }
    C().edit(() => { delete sec.proposal; if (k === 'discard') return; const meta2 = { at: p.at, provider: p.provider, model: p.model, notice: p.notice, srcs: p.srcs, sig: p.sig };
      if (k === 'replace') { const imgs = (sec.blocks || []).filter(b => b.t === 'img'); sec.blocks = [{ t: 'md', text: p.text }].concat(imgs); sec.ai = meta2; sec.edited = false; }
      if (k === 'append') { sec.blocks = (sec.blocks || []).concat({ t: 'md', text: p.text }); sec.ai = meta2; sec.edited = true; } });
    closeDrawer(); V.render(); toast(k === 'discard' ? 'Proposal discarded' : k === 'replace' ? 'Replaced. The previous text is in Version history.' : 'Added below your text');
  };
  ACT.ugBrief = a => { const i = Number(a.getAttribute('data-i')); const sec = W().sections[i]; drawer('What "' + sec.title + '" should cover', `<label class="f" for="ug_br">Section brief (used when the section is generated)</label><textarea id="ug_br" rows="4" maxlength="600">${esc(sec.brief || '')}</textarea>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ugBriefGo" data-i="${i}">Save</button>`); };
  ACT.ugBriefGo = a => { const i = Number(a.getAttribute('data-i')); const v = ((document.getElementById('ug_br') || {}).value || '').trim(); C().edit(() => { W().sections[i].brief = v; }); closeDrawer(); V.render(); };
  // change the guide's set-up later (for guides made before this, too)
  ACT.ugPlan = () => {
    I().load(KINDS); const g = W(); const plan = g.plan || { modules: [], roles: [], level: 'steps', sources: { cfg: true, decisions: true, usecases: true, brd: true, build: true }, vid: '' }; const vids = I().list('vid');
    const mods = [...new Set(modOptions().concat(plan.modules))], roles = [...new Set(roleOptions().concat(plan.roles))];
    const chk = (name, v, l, on) => `<label class="ug-opt"><input type="checkbox" name="${name}" value="${esc(v)}"${on ? ' checked' : ''}><span><b>${esc(l)}</b></span></label>`;
    drawer('Guide set-up', `<p class="small muted" style="margin-top:0">Used when a section is generated. Changing it does not rewrite any section; sections written from different sources are flagged for review.</p>
      <fieldset class="ug-fs"><legend class="f">Modules</legend><div class="ug-opts">${mods.map(m => chk('ug_m', m, m, plan.modules.includes(m))).join('') || '<span class="small muted">None in scope yet.</span>'}</div><input type="text" id="ug_mx" maxlength="200" placeholder="Other modules, separated by commas" style="margin-top:6px"></fieldset>
      <fieldset class="ug-fs"><legend class="f">Readers (roles)</legend><div class="ug-opts">${roles.map(r => chk('ug_r', r, r, plan.roles.includes(r))).join('')}</div><input type="text" id="ug_rx" maxlength="200" placeholder="Other roles, separated by commas" style="margin-top:6px"></fieldset>
      <label class="f" for="ug_lv">Level of detail</label><select id="ug_lv">${LEVELS.map(([k, l]) => `<option value="${k}"${k === plan.level ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <fieldset class="ug-fs"><legend class="f">Sources</legend><div class="ug-opts">${SRC.map(([k, l]) => chk('ug_s', k, l, !!plan.sources[k])).join('')}</div>${vids.length ? `<label class="f" for="ug_v">Walkthrough</label><select id="ug_v"><option value="">None</option>${vids.map(v => `<option value="${esc(v.id)}"${v.id === plan.vid ? ' selected' : ''}>${esc(v.title || 'Walkthrough')}</option>`).join('')}</select>` : ''}</fieldset>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ugPlanGo">Save set-up</button>`, { wide: true });
  };
  ACT.ugPlanGo = () => { const val = i => ((document.getElementById(i) || {}).value || '').trim(); const plan = { kind: (W().plan || {}).kind || 'user', modules: [...new Set(picked('ug_m').concat(extra('ug_mx')))].slice(0, 20), roles: [...new Set(picked('ug_r').concat(extra('ug_rx')))].slice(0, 12), level: val('ug_lv') || 'steps', sources: {}, vid: val('ug_v') };
    picked('ug_s').forEach(k => { plan.sources[k] = true; }); C().edit(() => { W().plan = plan; if (!W().audience && plan.roles.length) W().audience = plan.roles.join(', '); }); closeDrawer(); V.render(); toast('Set-up saved'); };

  // ---------- what the builder shows ----------
  function top(can) {
    const g = W(); if (!g) return ''; const secs = g.sections || []; const written = secs.filter(hasText).length, aiN = secs.filter(s => s.ai).length, st = secs.filter(s => stale(g, s)).length, props = secs.filter(s => s.proposal).length, miss = secs.filter(s => /\[Missing[:\]]/i.test((s.blocks || []).map(b => b.text || '').join(' '))).length;
    const step = !g.plan ? 0 : written < secs.length || !secs.length ? 1 : props || st || miss ? 2 : g.status === 'approved' ? 4 : 3;
    const steps = ['Set up', 'Draft sections', 'Review and edit', 'Check', 'Approve and export'];
    const p = g.plan; const planLine = p ? `${p.kind === 'uat' ? '<b>UAT guide</b> · ' : ''}${esc((p.modules || []).join(', ') || 'All modules')} · ${esc((p.roles || []).join(', ') || 'readers not set')} · ${esc((LEVELS.find(x => x[0] === p.level) || ['', ''])[1])} · sources: ${esc(SRC.filter(x => p.sources[x[0]]).map(x => x[1]).join(', ') || 'none')}${p.vid ? ' + walkthrough' : ''}` : 'Not set up yet: choose modules, readers and sources so sections can be generated.';
    return `<div class="card ug-top"><ol class="ug-steps" aria-label="Progress">${steps.map((t, i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}"${i === step ? ' aria-current="step"' : ''}>${esc(t)}</li>`).join('')}</ol>
      <div class="ug-plan"><span class="small"><b>Set-up:</b> ${planLine}</span>${can ? `<span class="row" style="gap:6px"><button class="btn sm" data-act="ugPlan">${ico('edit')}Set-up</button>${p ? `<button class="btn sm primary" data-act="ugGenAll"${runAll ? ' disabled' : ''}>${ico('spark')}${runAll ? 'Writing…' : 'Write empty sections'}</button>` : ''}</span>` : ''}</div>
      <div class="ug-stat small muted">${written}/${secs.length} sections have text · ${aiN} written with AI${st ? ` · <b class="ug-warn">${st} with changed sources</b>` : ''}${props ? ` · <b class="ug-warn">${props} proposal(s) to review</b>` : ''}${miss ? ` · <b class="ug-warn">${miss} with [Missing] markers</b>` : ''}</div></div>`;
  }
  function secBar(i, can) {
    const g = W(); const s = g.sections[i]; if (!s) return ''; const out = [];
    if (s.gen === 'running' || busy.has(s.id)) out.push(tag('blue', 'Writing…'));
    else if (s.gen === 'pending') out.push(tag('low', 'Waiting to be written'));
    else if (s.gen === 'error') out.push(`<span title="${esc(s.err || '')}">${tag('red', 'Generation failed')}</span>`);
    if (s.ai) out.push(`<span title="${esc((s.ai.srcs || []).join('\n'))}">${tag('blue', 'AI · ' + (s.ai.provider || '') + ' · ' + (V.fmtDate ? V.fmtDate(s.ai.at) : ''))}</span>`);
    if (s.edited) out.push(tag('green', 'Edited by a person'));
    if (stale(g, s)) out.push(`<span title="The records this section was written from have changed since. Review it, or regenerate (your edits are kept as a proposal).">${tag('orange', 'Sources changed')}</span>`);
    if (s.proposal) out.push(`<button class="btn sm" data-act="ugProposal" data-id="${esc(s.id)}">${ico('eye')}Review AI proposal</button>`);
    if (can) out.push(`<button class="btn sm" data-act="ugClaude" data-i="${i}" title="Write this section in your own Claude">In Claude</button>`);
    if (can) out.push(`<button class="btn sm" data-act="ugBrief" data-i="${i}" title="${esc(s.brief || 'Say what this section should cover')}">Brief</button><button class="btn sm" data-act="ugGen" data-i="${i}"${busy.has(s.id) ? ' disabled' : ''}>${ico('spark')}${hasText(s) ? 'Regenerate' : 'Generate'}</button>`);
    return out.length ? `<div class="ug-sbar">${out.join('')}</div>` : '';
  }
  // quality checks added to the builder's own
  function checks(g) {
    const out = []; (g.sections || []).forEach(s => {
      const txt = (s.blocks || []).map(b => b.text || '').join('\n');
      if (stale(g, s)) add('medium', s.title, 'The records this section was written from have changed. Review the section against them.');
      if (s.proposal) add('medium', s.title, 'An AI proposal for this section is waiting for a decision.');
      if (s.gen === 'error') add('medium', s.title, 'Generating this section failed. Generate it again or write it.');
      function add(sev, item, detail) { out.push({ sev, area: 'Draft', item, detail }); }
    });
    return out;
  }
  V.ugDraft = { top, secBar, checks, sig, stale };
  V.ugMarkEdited = i => { const g = W(); const s = g && g.sections[i]; if (s && (s.ai || hasText(s))) s.edited = true; };
})(typeof window !== 'undefined' ? window : globalThis);
