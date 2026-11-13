/* BRD sources: the panel above the BRD draft that shows, in the order of the delivery lifecycle, every input the BRD is built from,
   how much of it reaches the BRD and what is held back (with the page to fix it). It reads the same data src/brd.js reads, so it cannot drift from the document.
   counts() is pure over the passed data (tests/brd_sources.mjs); V.brdSources() reads the open project. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  /** d: { findings, reqs, mods: [{ name, label, sol, flowsChanged, fieldsChanged, notes }], procs, cflows, usecases, kpis, sla, decisions, gov: { decision, raid, cr } } */
  function counts(d) {
    const f = arr(d.findings), r = arr(d.reqs), mods = arr(d.mods);
    const fConf = f.filter(x => x.status === 'confirmed').length, fOpen = f.filter(x => x.status !== 'confirmed' && x.status !== 'dismissed').length;
    const rConf = r.filter(x => x.status === 'Confirmed'), rPend = r.filter(x => x.status !== 'Confirmed' && x.status !== 'Rejected').length;
    const noMod = rConf.filter(x => !arr(x.modules).length).length; const noSol = mods.filter(m => !m.sol).map(m => m.label);
    const sum = k => mods.reduce((a, m) => a + (Number(m[k]) || 0), 0);
    const uc = arr(d.usecases).filter(u => u.scope !== 'Out of scope'), ucOk = uc.filter(u => u.confirmation === 'Customer confirmed').length;
    const cf = arr(d.cflows), cfIn = cf.filter(c => c.inBrd).length; const g = d.gov || {};
    const row = (label, have, held, section, view, why) => ({ label, have, held, section, view, why });
    return [
      { group: 'Requirement sessions', rows: [
        row('Findings from the transcripts', fConf + ' confirmed', fOpen, 'Module requirements', 'checks', fOpen ? fOpen + ' not confirmed yet: they are not in the BRD' : ''),
        row('Requirements', rConf.length + ' confirmed', rPend, 'Functional requirements, traceability', 'reqs', rPend ? rPend + ' awaiting confirmation' : ''),
        row('Requirements without a module', noMod ? noMod + ' in General requirements' : 'none', noMod, 'General requirements', 'reqs', noMod ? 'Give them a module to place them in the module section' : ''),
        row('Decisions and actions from call summaries', arr(d.decisions).length + ' items', 0, 'Decisions, assumptions & dependencies', 'rsquestions', '')] },
      { group: 'Solution', rows: [
        row('Agreed solution per module', (mods.length - noSol.length) + ' of ' + mods.length + ' modules written', noSol.length, 'Solution proposal (each module)', 'solution', noSol.length ? 'No solution text: ' + noSol.slice(0, 4).join(', ') + (noSol.length > 4 ? ' and ' + (noSol.length - 4) + ' more' : '') : '')] },
      { group: 'Configuration', rows: [
        row('State flows', sum('flowsChanged') + ' proposed or changed', 0, 'Process state flow, state flow details', 'flow', ''),
        row('Fields and forms', sum('fieldsChanged') + ' fields added, changed or removed', 0, 'Fields, forms agreed', 'modules', ''),
        row('Notifications', sum('notes') + ' agreed', 0, 'Notifications agreed (each module)', 'notifications', ''),
        row('SLA matrix and KPIs', arr(d.sla).length + ' SLA rows, ' + arr(d.kpis).length + ' KPIs', 0, 'SLA matrix, KPIs and reporting', 'slakpi', '')] },
      { group: 'Processes and use cases', rows: [
        row('End-to-end processes', arr(d.procs).length + ' mapped', 0, 'End-to-end business processes', 'whiteboard', ''),
        row('Whiteboard flows', cfIn + ' of ' + cf.length + ' marked for the BRD', cf.length - cfIn, 'End-to-end business processes', 'whiteboard', cf.length - cfIn ? (cf.length - cfIn) + ' not marked "in BRD"' : ''),
        row('Use cases', ucOk + ' of ' + uc.length + ' customer confirmed', uc.length - ucOk, 'Customer-specific use cases', 'usecases', uc.length - ucOk ? (uc.length - ucOk) + ' only listed, not described, until the customer confirms' : '')] },
      { group: 'Governance', rows: [
        row('Decisions, risks and change requests', (arr(g.decision).length + arr(g.raid).length + arr(g.cr).length) + ' recorded', 0, 'Decisions, assumptions & dependencies; proposed changes', 'governance', '')] }
    ];
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { counts }; return; }

  const F = root.FWB; const V = root.FWBViews; const { S, esc } = F; const ACT = V.ACT;
  const KINDS = ['cflow', 'usecase', 'kpi', 'decision', 'raid', 'cr'];
  const list = k => { try { return V.items && V.items.ready([k]) ? V.items.list(k) : []; } catch (e) { return []; } };
  function data() {
    const SOL = root.FWBSolutionLogic, sol = F.doc('solutions'); const inScope = F.allModules().filter(m => m.inScope);
    const mods = inScope.map(m => { let flowsChanged = 0, fieldsChanged = 0; try { flowsChanged = (m.flowIds || []).map(F.flowModel).filter(f => f && (f.origin === 'proposed' || ((F.flowDiff(f.id) || {}).changes || []).length)).length; } catch (e) { }
      try { fieldsChanged = F.effFields(m.name).filter(f => ['proposed', 'modified', 'removed'].includes(f.status)).length; } catch (e) { }
      return { name: m.name, label: m.label, sol: !!(SOL && SOL.textOf && SOL.textOf(sol, 'module:' + m.name)), flowsChanged, fieldsChanged, notes: (S.ws.notifications || []).filter(n => n.module === m.name).length }; });
    let SS = null; try { SS = root.FWBBrdSessions ? root.FWBBrdSessions.rows({ bank: S.docs.rs_questions && S.docs.rs_questions.data, room: S.docs.workshop_room && S.docs.workshop_room.data, label: n => ((F.moduleView(n) || {}).label || n) }) : null; } catch (e) { }
    const fd = F.doc('rs_findings');
    return { findings: fd && fd.items, reqs: S.ws.requirements, mods, procs: S.ws.processes, cflows: list('cflow'), usecases: list('usecase'), kpis: list('kpi'), sla: S.ws.slaMatrix,
      decisions: SS ? [].concat(SS.decisions, SS.assumptions, SS.dependencies, SS.actions) : [], gov: { decision: list('decision'), raid: list('raid'), cr: list('cr') } };
  }
  V.brdSources = () => {
    if (V.isCustomer && V.isCustomer()) return ''; if (V.items) { const need = KINDS.filter(k => !V.items.ready([k])); if (need.length) V.items.load(need); }
    let groups; try { groups = counts(data()); } catch (e) { return ''; }
    const held = groups.reduce((a, g) => a + g.rows.reduce((b, r) => b + (r.held || 0), 0), 0); const open = !!S.ui.brdSrc;
    const rows = g => g.rows.map(r => `<li class="bs-r ${r.held ? 'held' : 'ok'}"><i aria-hidden="true"></i><div class="bs-t"><b>${esc(r.label)}</b><span>${esc(r.have)}${r.why ? ' · <em>' + esc(r.why) + '</em>' : ''}</span></div><div class="bs-s">${esc(r.section)}</div><button type="button" class="btn sm" data-act="nav" data-view="${esc(r.view)}">Open</button></li>`).join('');
    return `<div class="brd-src${open ? ' open' : ''}"><button type="button" class="bs-h" data-act="brdSrc" aria-expanded="${open}"><b>What this BRD is built from</b><span>${held ? held + ' input' + (held === 1 ? ' is' : 's are') + ' not reaching the BRD yet' : 'Every recorded input reaches the BRD'}</span><em>${open ? 'Hide' : 'Show'}</em></button>
      ${open ? `<div class="bs-b">${groups.map(g => `<section><h4>${esc(g.group)}</h4><ul>${rows(g)}</ul></section>`).join('')}</div>` : ''}</div>`;
  };
  ACT.brdSrc = () => { S.ui.brdSrc = !S.ui.brdSrc; V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
