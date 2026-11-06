/* Shared records (project_items): actions, decisions, RAID, sign-offs, change requests, onboarding status, minutes,
   use cases, … One row per record, so the implementation team and the customer can edit at the same time. The server
   decides who may read and change what (server/portal.mjs); this file is only a client cache.
   Also: customer portal controls (portal_controls section) with the same defaults as the server. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews; const API = root.FWBApi;

  const CTL_DEFAULT = {
    tabs: { cust_home: true, kickoff: true, schedule: true, guide: true, dashboards: true, overview: true, scope: true, contract: true, plan: true, onboarding: true, prepare: true, workshops: true, governance: true, changes: true, delivery: true, showcase: false, seefacilio: false, explore: false, whatsnew: false, integguide: false },
    show: { fees: false, rates: false, legal: false, risks: true, trainers: true },
    allow: { answers: true, discuss: true, actions: true, signoff: true, raid: true, cr: true, onboarding: true },
    hiddenModules: []
  };
  V.CTL_DEFAULT = CTL_DEFAULT;
  V.controls = () => { const d = (S.docs.portal_controls && S.docs.portal_controls.data) || {}; return { tabs: Object.assign({}, CTL_DEFAULT.tabs, d.tabs || {}), show: Object.assign({}, CTL_DEFAULT.show, d.show || {}), allow: Object.assign({}, CTL_DEFAULT.allow, d.allow || {}), hiddenModules: d.hiddenModules || [], phase: d.phase || {}, steps: d.steps || null, cadence: d.cadence || '' }; };
  V.isCustomer = () => S.user && S.user.kind === 'customer';
  // customer side: may the customer do X (always true for the implementation team unless read-only)
  V.custAllow = k => !V.isCustomer() ? !S.readonly : V.controls().allow[k] !== false;
  V.custShow = k => !V.isCustomer() || V.controls().show[k] !== false;
  V.side = () => (V.isCustomer() ? 'customer' : 'facilio');
  V.sideLabel = side => (side === 'customer' ? ((S.project && S.project.customer) || 'Customer') : side === 'both' ? 'Both' : 'Facilio');

  // ---------- item cache ----------
  let st = { project: null, kinds: {}, at: {}, loading: {} };
  const reset = () => { if (st.project !== (S.project && S.project.id)) st = { project: S.project && S.project.id, kinds: {}, at: {}, loading: {} }; };
  function load(kinds, force) {
    reset(); const need = kinds.filter(k => force || !st.at[k] || Date.now() - st.at[k] > 30000).filter(k => !st.loading[k]); if (!need.length || !S.project) return Promise.resolve();
    need.forEach(k => { st.loading[k] = true; });
    return API.get(`/api/projects/${S.project.id}/items?kinds=${need.join(',')}`).then(r => {
      need.forEach(k => { st.kinds[k] = new Map(); st.at[k] = Date.now(); st.loading[k] = false; });
      (r.items || []).forEach(it => { st.kinds[it.kind] = st.kinds[it.kind] || new Map(); st.kinds[it.kind].set(it.id, it); });
      V.render();
    }).catch(e => { need.forEach(k => { st.loading[k] = false; st.at[k] = Date.now(); }); if (e.status !== 403) V.toast(e.message || 'Could not load records', 5000, true); });
  }
  const ready = kinds => { reset(); return kinds.every(k => st.kinds[k]); };
  const list = kind => { reset(); return st.kinds[kind] ? [...st.kinds[kind].values()].map(x => Object.assign({ id: x.id, _v: x.version, _at: x.updatedAt, _by: x.updatedBy, _side: x.updatedSide, _created: x.createdAt, _cside: x.createdSide }, x.data)) : []; };
  const get = (kind, id) => list(kind).find(x => x.id === id) || null;
  async function put(kind, id, data, opts) {
    reset(); const clean = Object.assign({}, data); Object.keys(clean).forEach(k => { if (k[0] === '_' || k === 'id') delete clean[k]; });
    const r = await API.put(`/api/projects/${S.project.id}/items/${kind}/${id}`, { data: clean });
    st.kinds[kind] = st.kinds[kind] || new Map(); st.kinds[kind].set(id, r.item); if (!(opts && opts.silent)) V.render(); return Object.assign({ id }, r.item.data);
  }
  async function del(kind, id) { reset(); await API.del(`/api/projects/${S.project.id}/items/${kind}/${id}`); if (st.kinds[kind]) st.kinds[kind].delete(id); V.render(); }
  const uid = p => (p || 'i') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function prime(items, kinds) { reset(); (kinds || []).forEach(k => { st.kinds[k] = new Map(); st.at[k] = Date.now(); }); (items || []).forEach(it => { st.kinds[it.kind] = st.kinds[it.kind] || new Map(); st.kinds[it.kind].set(it.id, it); }); }
  V.items = { prime, load, ready, list, get, put, del, uid, reset: () => { st = { project: null, kinds: {}, at: {}, loading: {} }; } };

  // ---------- small shared helpers for the new sections ----------
  V.today = () => new Date().toISOString().slice(0, 10);
  V.daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
  V.addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  V.pill = (cls, text) => `<span class="pl pl-${cls}">${F.esc(text)}</span>`;
  V.moduleOptions = (selected, extra) => { const mods = F.allModules().filter(m => m.inScope).sort((a, b) => a.label.localeCompare(b.label)); return (extra || []).concat(mods.map(m => ({ v: m.name, l: m.label }))).map(o => `<option value="${F.esc(o.v)}" ${o.v === selected ? 'selected' : ''}>${F.esc(o.l)}</option>`).join(''); };
  V.modLabel = m => ({ kickoff: 'Kick-off', uat: 'UAT', golive: 'Go-live', project: 'Project', '': 'General' }[m || ''] || ((F.moduleView && F.moduleView(m)) || {}).label || m || 'General');
  // stage an item that is waiting for the server: guard against double clicks
  V.busy = async (el, fn) => { if (el && el.disabled) return; if (el) { el.disabled = true; el.classList.add('loading'); } try { return await fn(); } catch (e) { V.toast(e.message || 'Something went wrong', 5000, true); } finally { if (el) { el.disabled = false; el.classList.remove('loading'); } } };
})(typeof window !== 'undefined' ? window : globalThis);
