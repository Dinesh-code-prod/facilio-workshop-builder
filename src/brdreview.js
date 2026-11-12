/* Stage 3, BRD review checklist (roadmap E20): before a BRD can be approved, a person checks each part and ticks it off with their name. Six parts: the introduction, the requirements, the process flows,
   the fields and forms, the custom and connected apps, and the contract and sessions. The ticks are stored on the BRD record (brddoc.review.<part> = { by, at }; per BRD, so a secondary BRD has its own) and the server refuses
   to mark a BRD approved without all six (work/server/api.mjs, BRD_REVIEW). Next to each part the panel shows what is still open (Draft requirements, proposals nobody applied yet, open checks), as facts for the person; they do not tick for them.
   Approving stays the owner's. Pure rules are exported as V.brdReviewLogic (tests/brd_review.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { toast } = V;
  const ITEMS = [['intro', 'BRD introduction', 'The background, business objectives and scope notes are right and match the contract.'], ['requirements', 'Requirements', 'Every requirement is confirmed or removed. None is left as a Draft.'], ['flows', 'Process flows', 'The state flows and the flows across modules match what the sessions agreed.'],
    ['fields', 'Fields and forms', 'The custom fields and forms are the ones the customer asked for.'], ['apps', 'Custom and connected apps', 'Each connected app is described and really needed.'], ['contract', 'Contract and sessions', 'The BRD checks against the contract and the sessions are resolved.']];
  const FIND = ['gap', 'conflict', 'unsupported', 'outside_contract', 'contract_conflict'];
  const KIND_PART = { requirement: 'requirements', brdintro: 'intro', flow: 'flows', crosslink: 'flows', field: 'fields', form: 'fields', connectedapp: 'apps' };

  /** pure: the parts still not ticked off by a person */
  const missing = review => ITEMS.map(x => x[0]).filter(id => !(review && review[id] && review[id].by));
  /** pure: what is still open for each part, as numbers: Draft requirements, proposals nobody applied or dismissed, open checks against the contract and the sessions */
  function facts(requirements, proposals, findings) {
    const out = { intro: 0, requirements: 0, flows: 0, fields: 0, apps: 0, contract: 0 };
    (requirements || []).forEach(r => { if (r && r.status === 'Draft') out.requirements++; });
    (proposals || []).forEach(p => { if (p && p.status === 'open' && KIND_PART[p.kind]) out[KIND_PART[p.kind]]++; });
    (findings || []).forEach(f => { if (f && f.status === 'open' && FIND.includes(f.kind)) out.contract++; });
    return out;
  }
  V.brdReviewLogic = { ITEMS, missing, facts };

  const rec = () => (root.FWBBrd && root.FWBBrd.state ? root.FWBBrd.state() : null);
  const team = () => !!(S.user && S.user.kind !== 'customer' && S.project && S.project.id && (!V.isCustomer || !V.isCustomer()));
  const ro = () => !!S.readonly || (S.project && S.project.role === 'viewer');
  const items = sec => { const d = F.doc(sec); return d && Array.isArray(d.items) ? d.items : []; };
  V.brdReviewPanel = () => {
    const d = rec(); if (!team() || !d) return ''; const rv = d.review || {}, fa = facts(S.ws.requirements, items('design_proposals'), items('rs_findings')), todo = missing(rv).length;
    const row = x => { const id = x[0], t = rv[id], n = fa[id]; return '<div class="rv-row' + (t && t.by ? ' on' : '') + '"><button type="button" class="rv-box" data-act="brdRvTick" data-id="' + id + '" aria-label="Mark ' + esc(x[1]) + ' as reviewed" aria-pressed="' + !!(t && t.by) + '"' + (ro() ? ' disabled' : '') + '>' + (t && t.by ? '✓' : '') + '</button><div><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span>'
      + (n ? '<em>' + n + (id === 'requirements' ? ' still a Draft' : id === 'contract' ? ' open check' + (n === 1 ? '' : 's') : ' proposal' + (n === 1 ? '' : 's') + ' not applied or dismissed') + '</em>' : '') + (t && t.by ? '<small>Checked by ' + esc(t.by) + '</small>' : '') + '</div></div>'; };
    return '<section class="rv"><div class="rv-h"><div><b>Before this BRD is approved</b><span>' + (todo ? 'Check each part and tick it off with your name. ' + todo + ' of ' + ITEMS.length + ' still to do. The owner can approve when all are ticked.' : 'Every part is checked. The owner can approve the BRD.') + '</span></div></div>' + ITEMS.map(row).join('') + '</section>';
  };
  const v = V.brd; if (v && typeof v.html === 'function') { const h = v.html; v.html = function () { const out = h.apply(this, arguments); return typeof out === 'string' ? V.brdReviewPanel() + out : out; }; }
  ACT.brdRvTick = a => {
    if (ro()) return; const d = rec(); if (!d) return; const id = a.getAttribute('data-id'), it = ITEMS.find(x => x[0] === id); if (!it) return; d.review = Object.assign({}, d.review || {});
    if (d.review[id] && d.review[id].by) delete d.review[id]; else d.review[id] = { by: S.user.name || S.user.email, at: new Date().toISOString() };
    F.changed('BRD review', it[1] + (d.review[id] ? ' checked' : ' unchecked'), { section: 'brddoc' }); V.render();
  };
  { const was = ACT.brdStatus; if (typeof was === 'function') ACT.brdStatus = async el => { const d = rec(); if (el && el.value === 'approved' && d && missing(d.review).length) { toast('Check each part of the BRD and tick it off first (the list above the document): ' + missing(d.review).length + ' left.', 7000, true); V.render(); return; } return was(el); }; }
})(typeof window !== 'undefined' ? window : globalThis);
