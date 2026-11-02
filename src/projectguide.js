/* Project Settings > Keeping the project: how to keep a project so that the BRD, UAT, guides, reports and the Claude connector give good answers.
   A live checklist shows what is recorded already (counts from this project's own records), then the habits, what each deliverable needs, and questions to ask Claude. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const safe = (fn, d) => { try { return fn(); } catch (e) { return d; } };
  const go = v => esc(JSON.stringify({ view: v }));
  function checks() {
    const ws = S.ws || {}; const reqs = Array.isArray(ws.requirements) ? ws.requirements : []; const qs = Array.isArray(ws.questions) ? ws.questions : [];
    const pl = safe(() => F.doc('planner'), {}) || {}; const tr = safe(() => F.doc('transcripts'), {}) || {}; const cfg = safe(() => F.doc('config'), {}) || {};
    const cand = Array.isArray(tr.candidates) ? tr.candidates : []; const pending = cand.filter(c => c.status === 'pending' || c.status === 'clarify').length;
    const mods = safe(() => F.allModules().filter(m => m.inScope).length, 0); const sessions = (pl.sessions || []).length; const items = Array.isArray(tr.items) ? tr.items.filter(i => !i.deleted).length : 0;
    const ucs = safe(() => (V.items && V.items.ready(['usecase']) ? V.items.list('usecase').length : null), null);
    const conf = reqs.filter(r => r.status === 'Confirmed').length; const openQ = qs.filter(q => q.status !== 'closed').length;
    const p = S.project || {}; const team = safe(() => (S.members || []).length, 0);
    const logos = safe(() => F.doc('brddoc').logos || {}, {});
    const connected = safe(() => localStorage.getItem('fwb_claude_conn') === '1', false);
    return [
      [!!p.customer && team > 1, 'Project details and team', (p.customer ? 'Customer named' : 'Customer missing') + ', ' + team + ' team member(s)', 'settings'],
      [!!pl.msa, 'Contract (MSA) uploaded', pl.msa ? 'Scope read from ' + (pl.msa.name || 'the MSA') : 'Upload the signed MSA so scope can be checked', 'msaflow'],
      [mods > 0, 'Modules in scope marked', mods + ' module(s) in scope', 'modules'],
      [sessions > 0, 'Requirement sessions planned', sessions + ' session(s)', 'planner'],
      [items > 0, 'Workshop transcripts uploaded', items + ' transcript(s), ' + cand.length + ' statement(s) read', 'transcripts'],
      [cand.length > 0 && pending === 0, 'Every transcript statement reviewed', pending + ' still to review (accept, merge, clarify or reject each one)', 'transcripts'],
      [conf > 0, 'Requirements confirmed with the customer', conf + ' Confirmed, ' + (reqs.length - conf) + ' still Draft. Only Confirmed ones reach the BRD', 'transcripts'],
      [qs.length > 0 && openQ === 0, 'Open questions answered', openQ + ' open of ' + qs.length, 'transcripts'],
      [ucs == null ? false : ucs > 0, 'Use cases written', ucs == null ? 'Open Use cases to load them' : ucs + ' use case(s)', 'transcripts'],
      [cfg.source === 'imported', 'Customer configuration loaded', cfg.source === 'imported' ? 'Configuration imported' : 'Reference configuration only. Load the customer export in Configuration source', 'settings'],
      [!!(logos.facilio && logos.customer), 'BRD logos added', 'Both logos set', 'brd'],
      [connected, 'Claude connector added', connected ? 'Open in Claude sends the short connector prompt' : 'Add the connector in Claude (Claude connection tab) and tick the box', 'settings']
    ];
  }
  const ROWS = [
    ['BRD', 'Modules in scope; Confirmed requirements; state flows and roles in the modules; the contract', 'Get the task pack for BRD for this project and write it. Save the result as a draft.'],
    ['UAT plan and test cases', 'Confirmed requirements; use cases with steps; build status; go-live checklist', 'Prepare the UAT plan for this project from the use cases and requirements. Use get_task_pack task uat.'],
    ['User guide or training outline', 'Modules and roles; use cases; configuration loaded; published guide settings', 'Draft the user guide for the module "Work Orders". Use get_task_pack task guide.'],
    ['Issue tracker or status report', 'Tickets (also by e-mail); risks and issues; actions; change requests; recent activity', 'Give me the open issues by priority, then a weekly status report. Use get_tickets and get_records raid.'],
    ['Gap check before BRD sign-off', 'Everything above, plus open questions and statements still to review', 'Run the review pack for this project and list the five biggest gaps with sources.'],
    ['Hand-over and closure', 'Build records; hypercare issues; lessons learned; sign-offs', 'Prepare the hand-over summary from hypercare issues and sign-offs.']
  ];
  const HABITS = [
    ['One fact, one place', 'Record each decision, requirement or question once, in its own page. Do not copy it into notes. Claude and the BRD read the page, not your notes.'],
    ['Use the customer\'s words, then confirm', 'Accept a statement from a transcript only when it says what the customer needs. Mark a requirement Confirmed only after the customer agreed. Draft means "not yet".'],
    ['Write complete requirements', 'A title, the objective in one or two sentences, the module, and how it will be accepted. Short and specific beats long and vague.'],
    ['Close questions', 'Give every question an owner and a date. Close it with the answer so the BRD and Claude do not treat it as open.'],
    ['Record decisions and risks the day they happen', 'Decision: what, who decided, when. Risk or issue: impact, owner, next step. Change request: what changed and why.'],
    ['Keep names the same', 'Use the module names Delivery Studio shows. Use the customer\'s name for a role the same way every time.'],
    ['Update after every session', 'Upload the transcript the same day, review the statements within two days, and send the open questions to the customer.'],
    ['Check before you export', 'Open Checks &amp; Validations. Fix what is marked blocking before you send the BRD for sign-off.']
  ];
  const PROMPTS = ['Call connector_help, then give me an overview of this project.', 'What is still missing before the BRD can be signed off? Use the review pack.', 'List the transcript statements that are still pending and suggest which to accept.', 'Show the open questions and who owns them.', 'Prepare the UAT plan from the confirmed requirements and save it as a draft.', 'Summarise what changed in this project in the last week.'];
  V.projectKeepHtml = () => {
    const rows = checks(); const done = rows.filter(r => r[0]).length;
    const pid = (S.project || {}).id || '';
    return `<p class="small" style="margin-top:0">Everything Delivery Studio and your Claude produce is built from what is recorded in this project. Complete, confirmed records give a good BRD, UAT plan, guide and report. Empty or messy ones give thin answers. This page shows what is recorded now and how to keep it in good shape.</p>
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>What is recorded now</h3><span class="xs muted">${done} of ${rows.length} in place</span></div><div class="card-b">
        <div class="keep-list">${rows.map(([ok, t, d, view]) => `<div class="keep-row"><span class="keep-dot ${ok ? 'on' : ''}" aria-label="${ok ? 'Done' : 'Not yet'}">${ok ? '✓' : ''}</span><div><b>${esc(t)}</b><div class="xs muted">${d}</div></div>${ok ? '' : `<button class="btn sm" data-act="goNav" data-nav="${go(view)}">Open</button>`}</div>`).join('')}</div></div></div>
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Habits that give good outputs</h3></div><div class="card-b"><ol class="small" style="line-height:1.7;margin:0;padding-left:18px">${HABITS.map(([a, b]) => `<li><b>${a}.</b> ${b}</li>`).join('')}</ol></div></div>
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>What each output needs</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Output</th><th>What must be recorded</th><th>Ask Claude</th></tr></thead><tbody>${ROWS.map(r => `<tr><td><b>${esc(r[0])}</b></td><td class="small">${esc(r[1])}</td><td class="small">${esc(r[2])}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Questions to try with the connector</h3></div><div class="card-b"><div class="xs muted" style="margin-bottom:8px">Paste the project id first so Claude opens the right project: <code>${esc(pid)}</code> <button type="button" class="btn sm" data-act="hoCopyVal" data-val="${esc(pid)}">Copy id</button></div>
        <ul class="small" style="line-height:1.8;margin:0;padding-left:18px">${PROMPTS.map(p => `<li>${esc(p)} <button type="button" class="btn sm ghost" data-act="hoCopyVal" data-val="${esc(p)}">Copy</button></li>`).join('')}</ul></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
