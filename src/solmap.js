/* Solution map (stage 3): the whole design of the project in ONE place, as a tree per module in scope (system, custom and proposed modules):
   the agreed solution, the fields added or changed, the forms, the state flows (states and who moves a record, with approvals), the roles and their access, and the notifications.
   Read only: every branch has a link to the page that edits it. The same tree downloads as a Word document or prints as PDF (the report of the solution).
   tree() is the data the page and the export share, so they always say the same. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const arr = v => (Array.isArray(v) ? v : []); const safe = (f, d) => { try { return f(); } catch (e) { return d; } };
  function tree() {
    const SOL = root.FWBSolutionLogic, sd = F.doc('solutions');
    return F.allModules().filter(m => m.inScope).map(m => {
      const flows = safe(() => arr(m.flowIds).map(F.flowModel).filter(f => f && (f.enabled !== false || f.origin === 'proposed')), []).map(f => {
        const st = id => ((arr(f.states).find(s => s.id === id) || {}).label || id);
        return { name: f.name + (f.origin === 'proposed' ? ' (proposed)' : ''), states: arr(f.states).map(s => s.label || s.id), steps: arr(f.transitions).filter(t => !t.removed && t.enabled !== false).map(t => ({ name: t.name, from: st(t.from), to: st(t.to), by: t.type !== 'user' ? 'System' : arr(t.actors).map(a => F.actorLabel(a.actor)).join(', ') || 'To be confirmed', approval: t.approval && t.approval.required ? arr(t.approval.approvers).map(F.actorLabel).join(', ') : '' })) };
      });
      const fields = safe(() => F.effFields(m.name).filter(f => ['proposed', 'modified', 'removed'].includes(f.status)), []).map(f => ({ label: f.label || f.name, type: f.type || '', status: f.status === 'proposed' ? 'Added' : f.status === 'modified' ? 'Changed' : 'Removed', required: !!f.required }));
      const forms = safe(() => F.formsForModule(m.name), []).filter(f => f && (f.proposed || f.app === 'maintenance')).slice(0, 8).map(f => ({ name: f.label || f.name, proposed: !!f.proposed, sections: arr(f.sections).map(s => s.name).filter(Boolean) }));
      const roles = safe(() => F.allActors().filter(a => !a.privileged), []).map(a => { const p = V.proposedPerm ? V.proposedPerm(a.id, m.name) : null; const e = !p && V.existingPerm ? V.existingPerm(a, m.name) : null; const txt = p ? F.permText(p, m.name) : e ? e.text : ''; return txt && txt !== 'No access' ? { role: a.label, access: txt, proposed: !!p } : null; }).filter(Boolean);
      const notes = (S.ws.notifications || []).filter(n => n.module === m.name).map(n => ({ name: n.name, when: n.trigger === 'state' ? 'Moves to ' + n.state : 'Created', to: arr(n.recipients).join(', ') || 'The current user', on: n.status !== 'off' }));
      return { name: m.name, label: m.label, kind: m.origin === 'proposed' ? 'Proposed custom module' : m.custom ? 'Custom module' : 'System module', solution: SOL && SOL.textOf ? SOL.textOf(sd, 'module:' + m.name) : '', status: SOL && SOL.statusOf ? SOL.statusOf(sd, 'module:' + m.name) : '', flows, fields, forms, roles, notes };
    });
  }
  const cnt = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  function branch(title, n, view, body, open) { return `<details class="sm-b"${open ? ' open' : ''}><summary><span>${esc(title)}</span><em>${n}</em><button type="button" class="ki-link" data-act="nav" data-view="${view}">Open</button></summary><div class="sm-in">${body || '<p class="xs muted">Nothing recorded.</p>'}</div></details>`; }
  const tbl = (h, rows) => rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  V.solmap = {
    html() {
      if (V.isCustomer && V.isCustomer()) return ''; const T = tree(); const all = !!S.ui.smAll;
      const head = `<div class="page-header"><div class="t"><h1>Solution map</h1><p>The whole design in one place: for each module, its solution, fields, forms, state flows, roles and notifications. Open any branch to see it; the Open link goes to the page that edits it.</p></div><div class="row"><button class="btn" data-act="smToggle">${all ? 'Collapse all' : 'Expand all'}</button><button class="btn" data-act="smPrint">Print or PDF</button><button class="btn primary" data-act="smWord">Download Word</button></div></div>`;
      if (!T.length) return head + '<div class="page-body"><div class="card empty"><h3>No module in scope yet</h3><p>Choose the modules the project covers on System Modules &amp; Form Builder.</p></div></div>';
      return head + '<div class="page-body sm-page">' + T.map((m, i) => `<details class="card sm-m"${all || i === 0 ? ' open' : ''}><summary><b>${esc(m.label)}</b><span class="sm-k">${esc(m.kind)}</span>${m.status ? `<span class="sm-s">${esc(m.status)}</span>` : ''}<span class="sm-c">${cnt(m.flows.length, 'flow')} · ${cnt(m.fields.length, 'field change')} · ${cnt(m.roles.length, 'role')} · ${cnt(m.notes.length, 'notification')}</span></summary><div class="sm-body">
        ${branch('Solution', m.solution ? '' : 'not written', 'solution', m.solution ? String(m.solution).split(/\n{2,}/).map(p => `<p class="sm-p">${esc(p)}</p>`).join('') : '', all || !!m.solution)}
        ${branch('Fields', m.fields.length, 'modules', tbl(['Field', 'Type', 'Change', 'Mandatory'], m.fields.map(f => [f.label, f.type, f.status, f.required ? 'Yes' : ''])), all)}
        ${branch('Forms', m.forms.length, 'modules', tbl(['Form', 'Sections'], m.forms.map(f => [f.name + (f.proposed ? ' (proposed)' : ''), f.sections.join(', ')])), all)}
        ${branch('State flows', m.flows.length, 'flow', m.flows.map(f => `<h4 class="sm-h">${esc(f.name)}</h4><p class="xs muted">States: ${esc(f.states.join(' → '))}</p>` + tbl(['Action', 'From', 'To', 'Done by', 'Approval'], f.steps.map(s => [s.name, s.from, s.to, s.by, s.approval]))).join(''), all)}
        ${branch('Roles and access', m.roles.length, 'roles', tbl(['Role', 'Access'], m.roles.map(r => [r.role + (r.proposed ? ' (proposed)' : ''), r.access])), all)}
        ${branch('Notifications', m.notes.length, 'notifications', tbl(['Notification', 'When', 'Who is told'], m.notes.map(n => [n.name + (n.on ? '' : ' (off)'), n.when, n.to])), all)}
      </div></details>`).join('') + '</div>';
    }
  };
  ACT.smToggle = () => { S.ui.smAll = !S.ui.smAll; V.render(); };
  // the report: the same tree as one document (Word opens this HTML as a .doc; print gives a PDF)
  function reportHtml() {
    const T = tree(), pr = S.ws.project || {}; const t = (h, rows) => rows.length ? `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:10pt"><tr>${h.map(x => `<th style="background:#E8EEF8;text-align:left">${esc(x)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : '<p><i>Nothing recorded.</i></p>';
    return `<html><head><meta charset="utf-8"><title>Solution map</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1d1d1f}h1{color:#1D1A5E}h2{color:#1D1A5E;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:24px}h3{color:#344054;margin:14px 0 6px}</style></head><body>
      <h1>Solution map${pr.client ? ' — ' + esc(pr.client) : ''}</h1><p>${esc((S.project && S.project.name) || '')} · ${new Date().toISOString().slice(0, 10)}</p>
      ${T.map(m => `<h2>${esc(m.label)} <small style="color:#667085;font-weight:normal">(${esc(m.kind)})</small></h2><h3>Solution</h3>${m.solution ? String(m.solution).split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('') : '<p><i>Not written yet.</i></p>'}
        <h3>Fields</h3>${t(['Field', 'Type', 'Change', 'Mandatory'], m.fields.map(f => [f.label, f.type, f.status, f.required ? 'Yes' : '']))}
        <h3>Forms</h3>${t(['Form', 'Sections'], m.forms.map(f => [f.name + (f.proposed ? ' (proposed)' : ''), f.sections.join(', ')]))}
        <h3>State flows</h3>${m.flows.length ? m.flows.map(f => `<p><b>${esc(f.name)}</b> — ${esc(f.states.join(' → '))}</p>` + t(['Action', 'From', 'To', 'Done by', 'Approval'], f.steps.map(s => [s.name, s.from, s.to, s.by, s.approval]))).join('') : '<p><i>Nothing recorded.</i></p>'}
        <h3>Roles and access</h3>${t(['Role', 'Access'], m.roles.map(r => [r.role + (r.proposed ? ' (proposed)' : ''), r.access]))}
        <h3>Notifications</h3>${t(['Notification', 'When', 'Who is told'], m.notes.map(n => [n.name, n.when, n.to]))}`).join('')}</body></html>`;
  }
  const fileName = ext => 'solution-map-' + String((S.project && S.project.name) || 'project').replace(/[^\w-]+/g, '-').toLowerCase() + '.' + ext;
  ACT.smWord = () => V.download(fileName('doc'), '﻿' + reportHtml(), 'application/msword');
  ACT.smPrint = () => { const w = window.open('', '_blank'); if (!w) { V.toast('The browser blocked the new window. Allow pop-ups for this site, or use Download Word.', 6000, true); return; } w.document.write(reportHtml()); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); };
  V.solmapTree = tree;
})(typeof window !== 'undefined' ? window : globalThis);
