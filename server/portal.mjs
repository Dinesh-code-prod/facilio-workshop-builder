// Customer portal rules: what customer stakeholders may see and do, enforced on the server.
// - portal_controls (a project_docs section written by the implementation team) switches customer tabs, content and
//   permissions on and off. Defaults keep today's behaviour for existing customer areas and keep money/legal hidden.
// - project_items holds records several people edit at once (actions, RAID, sign-offs, change requests, onboarding
//   status, …). Each kind declares who may read it, who may write it and which changes a customer may make.
import { q1 } from './infra.mjs';

export const DEFAULT_CONTROLS = {
  tabs: { cust_home: true, kickoff: true, schedule: true, guide: true, dashboards: true, overview: true, scope: false, contract: false, plan: true, onboarding: false, workshops: true, governance: true, changes: true, delivery: true },
  show: { fees: false, rates: false, legal: false, risks: true, trainers: true },
  allow: { answers: true, discuss: true, actions: true, signoff: true, raid: true, cr: true, onboarding: true },
  hiddenModules: []
};
export async function controls(projectId) {
  const r = await q1(`SELECT data FROM project_docs WHERE project_id = $1 AND section = 'portal_controls'`, [projectId]);
  const d = (r && r.data) || {};
  return { tabs: Object.assign({}, DEFAULT_CONTROLS.tabs, d.tabs || {}), show: Object.assign({}, DEFAULT_CONTROLS.show, d.show || {}), allow: Object.assign({}, DEFAULT_CONTROLS.allow, d.allow || {}), hiddenModules: Array.isArray(d.hiddenModules) ? d.hiddenModules : [] };
}

// doc sections a customer may read, and the tab that must be on (null = always)
export const CUSTOMER_DOC_SECTIONS = { guide_published: 'guide', schedule_published: 'schedule', dashboards: 'dashboards', portal_controls: null, portal_published: null, onboarding_published: 'onboarding', plan_struct: 'plan' };
// file categories a customer may read / upload, with the tab (read) or permission (upload) that must be on
export const CUSTOMER_FILE_READ = { kickoff: 'kickoff', dashboard: 'dashboards', onboarding_workbook: 'onboarding', onboarding_files: 'onboarding', signoff_evidence: 'governance' };
export const CUSTOMER_FILE_UPLOAD = { onboarding_workbook: 'onboarding', onboarding_files: 'onboarding' };

const SIDE = s => (s.kind === 'customer' ? 'customer' : 'facilio');
const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
const same = (a, b, keys) => keys.every(k => JSON.stringify(a ? a[k] : undefined) === JSON.stringify(b ? b[k] : undefined));
const fail = msg => { const e = new Error(msg); e.status = 403; throw e; };

// Each kind: tab (customer read needs it), read(item, ctl) extra customer filter, write(ctx) returns the data to store
// for a customer write or throws. Kinds marked internal are never returned to, or written by, customers.
export const KINDS = {
  action: { tab: 'overview', write({ old, next, ctl, s }) { if (!ctl.allow.actions) fail('Actions are read-only for you');
      const done = st => (st === 'Done' ? { doneAt: (old && old.doneAt) || new Date().toISOString() } : { doneAt: null });
      if (!old) return Object.assign(pick(next, ['mod', 'text', 'owner', 'due', 'status']), { side: 'customer', by: s.name }, done(next.status));
      if (old.side !== 'customer' && !same(old, next, ['mod', 'text', 'side', 'due'])) fail('You can only change the status and owner of Facilio actions');
      return Object.assign({}, old, pick(next, old.side === 'customer' ? ['mod', 'text', 'owner', 'due', 'status'] : ['owner', 'status']), done(next.status || old.status)); } },
  decision: { tab: 'overview' },
  raid: { tab: 'governance', write({ old, next, ctl, s }) { if (!ctl.allow.raid) fail('The RAID log is read-only for you');
      return Object.assign({}, old || { side: 'customer', by: s.name }, pick(next, ['type', 'title', 'mod', 'impact', 'owner', 'due', 'mitigation', 'status'])); } },
  signoff: { tab: 'governance', write({ old, next, ctl, s }) { if (!ctl.allow.signoff) fail('Sign-off is not enabled for you');
      if (!old || old.status !== 'requested') fail('This sign-off has not been requested');
      if (next.status === 'signed') { if (!String(next.signer || '').trim() || !next.confirm) fail('Enter your name and tick the confirmation'); return Object.assign({}, old, { status: 'signed', signer: String(next.signer).slice(0, 120), title: String(next.title || '').slice(0, 120), signedAt: new Date().toISOString(), signedBy: s.name, onBehalf: false }); }
      if (next.status === 'concern') { if (!String(next.concern || '').trim()) fail('Describe the concern'); return Object.assign({}, old, { status: 'concern', concern: String(next.concern).slice(0, 2000), concernBy: s.name }); }
      fail('Not permitted'); } },
  cr: { tab: 'changes', read: it => it.published || it.side === 'customer', write({ old, next, ctl, s }) { if (!ctl.allow.cr) fail('Change requests are read-only for you');
      if (!old) return Object.assign(pick(next, ['title', 'mod', 'description', 'why']), { status: 'Requested', side: 'customer', published: true, by: s.name });
      if (old.status === 'Proposed' && ['CR Converted', 'Rejected'].includes(next.status)) { if (!String(next.decisionBy || '').trim()) fail('Enter your name to record the decision'); return Object.assign({}, old, { status: next.status, decisionBy: String(next.decisionBy).slice(0, 120), decisionNote: String(next.decisionNote || '').slice(0, 2000), decidedAt: new Date().toISOString() }); }
      if (old.side === 'customer' && old.status === 'Requested') return Object.assign({}, old, pick(next, ['title', 'mod', 'description', 'why']));
      fail('Not permitted'); } },
  onb: { tab: 'onboarding', write({ old, next, ctl, s }) { if (!ctl.allow.onboarding) fail('Data onboarding is read-only for you');
      const CUST = ['todo', 'filling', 'sent']; if ((old && !CUST.includes(old.status)) || !CUST.includes(next.status)) fail('Only Facilio can set this status');
      return Object.assign({}, old || { sheet: String(next.sheet || '').slice(0, 120) }, { status: next.status, by: s.name, file: next.file !== undefined ? next.file : (old || {}).file }); } },
  onbsub: { tab: 'onboarding', write({ old, next, ctl, s }) { if (!ctl.allow.onboarding) fail('Data onboarding is read-only for you'); if (old) fail('Submissions cannot be changed');
      return Object.assign(pick(next, ['fileId', 'fileName', 'rows', 'issues', 'sheets', 'sent']), { by: s.name }); } },
  onbfile: { tab: 'onboarding', write({ old, next, ctl, s }) { if (!ctl.allow.onboarding) fail('Data onboarding is read-only for you'); if (old && old.by !== s.name) fail('Not permitted');
      return Object.assign(pick(next, ['tpl', 'link', 'fileId', 'name', 'note']), { by: s.name }); } },
  onbws: { tab: 'onboarding', write({ old, next, ctl, s }) { if (!ctl.allow.onboarding) fail('Data onboarding is read-only for you');
      if (typeof next.json !== 'string' || next.json.length > 1800000) fail('The workbook data is too large to save'); let st; try { st = JSON.parse(next.json); } catch (e) { fail('The workbook data is not valid'); } if (!st || typeof st !== 'object' || st.v !== 2) fail('The workbook data is not valid');
      return { json: next.json, rows: next.rows && typeof next.rows === 'object' ? next.rows : {}, savedAt: new Date().toISOString(), stage: 'prepared', by: s.name }; } },
  owner: { tab: 'overview' }, agreement: { tab: 'overview' }, minutes: { tab: 'governance' }, checklist: { tab: 'delivery' }, build: { tab: 'delivery' }, uat: { tab: 'delivery', read: it => !!it.published },
  digest: { tab: 'overview', read: it => !!it.posted },
  ctrcore: { tab: 'contract' }, ctrfees: { tab: 'contract', read: (it, ctl) => !!ctl.show.fees }, ctrlegal: { tab: 'contract', read: (it, ctl) => !!ctl.show.legal }, ctrrates: { tab: 'contract', read: (it, ctl) => !!ctl.show.rates },
  scope: { tab: 'scope' }, modbrief: { tab: 'guide' }, fieldreq: { tab: 'guide' },
  // implementation-team only
  note: { internal: true }, ctrwatch: { internal: true }, usecase: { internal: true }, discrepancy: { internal: true }, brdrev: { internal: true }
};
export const KIND_RE = /^[a-z]{2,12}$/;
export const ITEM_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
export { SIDE };
