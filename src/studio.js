/* Guides & Video Studio: writes the briefs for the things the team has to produce: a video or walkthrough, a customer user guide, a training outline.
   Everything is written from the project's own configuration and the real Facilio screens kept in this app. Only facts found in the configuration go into a brief;
   anything else is marked "to confirm". */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { toast } = V;
  const OUT = { walkthrough: ['Walkthrough', 'The viewer clicks through each step at their own pace. Best for how-to and training.'], video: ['Video', 'Plays by itself, with optional voice-over. Best for a short explainer.'], guide: ['User guide section', 'Written steps for the customer, drafted from the same facts.'], training: ['Training outline', 'A role-based outline for a training session.'] };
  const AUD = { users: 'customer end users (people who do the daily work)', admins: 'customer administrators (people who set things up)', team: 'the Facilio delivery team (internal training)' };
  const VO = { none: 'no voice-over, on-screen text only', en: 'English voice-over', ar: 'Arabic voice-over' };
  const ui = () => S.ui;
  // the demo kit's own screens for a module (src/demokit-data.js); matched on the module name, ignoring case and a plural s
  const DK = () => root.FWBDemoKit || { base: '', screens: [], journeys: [] };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
  const kitScreens = label => DK().screens.filter(x => norm(x[1]) === norm(label));
  const stateLabel = (m, id) => { const s = (m.states || []).find(x => x.id === id); return s ? (s.label || s.name) : String(id || ''); };

  // the modules worth explaining first: custom ones and those in scope, then everything else
  function modules() {
    let all = []; try { all = F.allModules ? F.allModules() : []; } catch (e) { }
    const hot = all.filter(m => m.custom || m.inScope).sort((a, b) => String(a.label || a.name).localeCompare(String(b.label || b.name)));
    const rest = all.filter(m => !(m.custom || m.inScope) && (m.flowIds || []).length).sort((a, b) => String(a.label || a.name).localeCompare(String(b.label || b.name)));
    return { hot, rest };
  }
  // facts from the configuration for one module; nothing is guessed
  function facts(name) {
    const base = S.baseline && S.baseline.modules && S.baseline.modules[name]; let mv = null; try { mv = (F.allModules ? F.allModules() : []).find(m => m.name === name); } catch (e) { }
    const label = (base && base.label) || (mv && mv.label) || name;
    const fields = base ? (base.fields || []).filter(f => f.required || f.mainField).map(f => f.label).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 12) : [];
    const flows = (S.baseline && S.baseline.flows || []).filter(f => f.module === name); const pick = flows.find(f => f.isDefault) || flows[0]; let flow = null;
    try {
      const m = pick && F.baselineFlowModel(pick);
      if (m && m.states && m.states.length) {
        const steps = (m.transitions || []).filter(t => !t.removed && t.enabled !== false); const order = []; const seen = new Set(); let queue = [m.initial].filter(Boolean);
        while (queue.length) { const s = queue.shift(); if (seen.has(s)) continue; seen.add(s); steps.filter(t => t.from === s).forEach(t => { order.push(t); queue.push(t.to); }); }
        steps.forEach(t => { if (!order.includes(t)) order.push(t); });
        const uniq = new Set(); const all = order.map(t => ({ name: t.name, from: stateLabel(m, t.from), to: stateLabel(m, t.to), checks: (t.validations || []).slice(0, 2), portals: t.portals || [] })).filter(s => { const k = s.name + '|' + s.from + '|' + s.to; if (uniq.has(k)) return false; uniq.add(k); return true; });   // the same step can be configured twice (for example per portal)
        flow = { name: m.name, states: m.states.map(s => s.label || s.name), steps: all };
      }
    } catch (e) { }
    return { kit: kitScreens(label), name, label, desc: String((base && base.description) || (mv && mv.description) || '').slice(0, 300), fields, nFields: base ? (base.fields || []).length : 0, nForms: base ? (Array.isArray(base.forms) ? base.forms.length : Number(base.forms) || 0) : 0, flow, custom: !!(base && base.custom) };
  }
  function brief(f) {
    const p = S.project || {}, o = ui().vsOut || 'walkthrough', kind = o === 'video' ? 'video' : 'walkthrough', min = Math.max(1, Math.min(10, Number(ui().vsMin) || 2));
    const title = f.label + (kind === 'video' ? ': how it works' : ': step by step');
    const steps = f.flow ? f.flow.steps.slice(0, 12).map((s, i) => `${i + 1}. ${s.name}: ${s.from} to ${s.to}${s.checks.length ? ' (checks: ' + s.checks.join('; ') + ')' : ''}${s.portals.length ? ' (shown in the ' + s.portals.join(' and ') + ' portal)' : ''}`).join('\n') : '(no state flow is configured for this module in the project; describe the steps from the Facilio screens and mark them "to confirm")';
    return [`Make a ${kind}: "${title}"`, `For: ${AUD[ui().vsAud] || AUD.users}`, `Customer: ${p.customer || 'the customer'} (project "${p.name || ''}"). Use sample data only; never real customer data.`, `App and module: Facilio CMMS, ${f.label}${f.desc ? '. ' + f.desc : ''}`, '',
      'Story, step by step (from this project\'s configuration):', steps, '', f.fields.length ? `Key fields on the record: ${f.fields.join(', ')}.` : '', f.kit.length ? `Screens: use these real Facilio product screens (sample data):\n${f.kit.slice(0, 8).map(x => `- ${x[0]}: ${x[3]}`).join('\n')}` : `Screens: use the real Facilio product screens for ${f.label} if you have them; otherwise say which screen is missing.`, 'Say "to confirm" for anything that is not in the configuration. Do not invent steps, buttons or fields. Label features that do not ship yet as "coming soon".',
      `Voice-over: ${VO[ui().vsVo] || VO.none}. Length: about ${min} minute${min > 1 ? 's' : ''}.`].filter(x => x !== null).join('\n');
  }
  const opt = (v, cur, l) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`;
  const sel = (k, label, opts, cur) => `<div><label class="f">${label}</label><select data-change="vsSet" data-k="${k}" aria-label="${label}">${opts}</select></div>`;

  function createTab() {
    const { hot, rest } = modules(); const cur = ui().vsMod || (hot[0] && hot[0].name) || ''; const out = ui().vsOut || 'walkthrough';
    if (!cur) return '<div class="card empty"><h3>No modules yet</h3><p>Load the customer\'s org package in Project Settings, then come back. The studio writes from what is configured.</p></div>';
    const f = facts(cur); const isMedia = out === 'video' || out === 'walkthrough';
    const modOpts = (hot.length ? `<optgroup label="Custom and in scope (${hot.length})">${hot.map(m => opt(m.name, cur, m.label || m.name)).join('')}</optgroup>` : '') + `<optgroup label="Other modules with a state flow (${rest.length})">${rest.map(m => opt(m.name, cur, m.label || m.name)).join('')}</optgroup>`;
    const pick = `<div class="card" style="padding:16px"><div class="sec-k"><p>Step 1</p><h2>What should it explain?</h2></div><div class="grid g2">
      ${sel('mod', 'Module', modOpts, cur)}${sel('out', 'What to make', Object.keys(OUT).map(k => opt(k, out, OUT[k][0])).join(''), out)}
      ${sel('aud', 'Who is it for', Object.keys(AUD).map(k => opt(k, ui().vsAud || 'users', AUD[k])).join(''), ui().vsAud || 'users')}
      ${isMedia ? sel('vo', 'Voice-over', Object.keys(VO).map(k => opt(k, ui().vsVo || 'none', VO[k])).join(''), ui().vsVo || 'none') : ''}
      ${isMedia ? sel('min', 'Length', [1, 2, 3, 5].map(n => opt(n, ui().vsMin || 2, n + (n > 1 ? ' minutes' : ' minute'))).join(''), ui().vsMin || 2) : ''}</div><p class="small muted" style="margin-top:8px">${esc(OUT[out][1])}</p></div>`;
    const flowHtml = f.flow ? `<div class="small"><b>State flow: ${esc(f.flow.name)}</b><ol style="padding-left:18px;margin:6px 0">${f.flow.steps.slice(0, 12).map(s => `<li>${esc(s.name)}: ${esc(s.from)} &rarr; ${esc(s.to)}</li>`).join('')}</ol></div>` : '<p class="small muted">No state flow is configured for this module.</p>';
    const know = `<div class="card" style="padding:16px"><div class="sec-k"><p>Step 2</p><h2>What this project knows about ${esc(f.label)}</h2></div>
      <p class="small">${f.desc ? esc(f.desc) : '<span class="muted">No description in the configuration.</span>'}</p>
      <p class="small"><b>${f.nFields}</b> fields · <b>${f.nForms}</b> form${f.nForms === 1 ? '' : 's'}${f.custom ? ' · custom module' : ''}</p>
      ${f.fields.length ? `<p class="small"><b>Key fields:</b> ${f.fields.map(esc).join(', ')}</p>` : ''}${flowHtml}
      <p class="small" style="margin-top:8px"><b>Product Tour screens:</b> ${f.kit.length ? f.kit.map(x => `<button class="btn sm" data-act="vsView" data-i="${DK().screens.indexOf(x)}" title="${esc(x[3])}">${esc(x[0])}</button>`).join(' ') : '<span class="muted">none found for this module. Browse the Product Tour tab.</span>'}</p></div>`;
    let make;
    if (isMedia) {
      const text = ui().vsBrief != null ? ui().vsBrief : brief(f);
      make = `<div class="card" style="padding:16px"><div class="sec-k"><p>Step 3</p><h2>Make the ${out}</h2></div>
        <p class="small muted">Edit the brief if you like, copy it, then copy it into your own Claude, or into the video and walkthrough creator. Attach any screenshots you have.</p>
        <textarea id="vs_brief" rows="14" data-change="vsBrief" style="font-family:ui-monospace,Menlo,monospace;font-size:12px" aria-label="Brief">${esc(text)}</textarea>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" data-act="vsCopy">Copy brief</button><button class="btn primary" data-act="vsClaude">Copy and open Claude</button><button class="btn" data-act="vsTab" data-v="kit">Find screens in the Product Tour</button></div></div>`;
    } else {
      const task = out === 'guide' ? 'guide' : 'training';
      make = `<div class="card" style="padding:16px"><div class="sec-k"><p>Step 3</p><h2>Draft the ${esc(OUT[out][0].toLowerCase())}</h2></div>
        <p class="small muted">This uses the existing AI drafts. They read the project's records and the org package, and stay unapproved until a project owner approves them. Add "${esc(f.label)}" in the instruction box.</p>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">${V.aiButton ? V.aiButton(task, out === 'guide' ? 'Draft customer user guide' : 'Draft training outline') : ''}<button class="btn" data-act="nav" data-view="guidebuilder">Open the User Guide Builder</button></div></div>`;
    }
    const also = `<div class="card" style="padding:14px"><b>Already have a video?</b> <span class="small">Turn its transcript into guide steps with</span> <button class="btn sm" data-act="nav" data-view="vidguide">Video to Guide</button></div>`;
    return `<div class="grid g2" style="align-items:start"><div style="display:grid;gap:14px">${pick}${know}</div><div style="display:grid;gap:14px">${make}${also}</div></div>`;
  }
  function kitTab() {
    return '<div class="card" style="padding:14px"><p class="small">The real Facilio product screens, on sample data, grouped the way the customer sees them on their Product Tour page. Use them to find the screens a video should show. Click a screen to open it here.</p></div>' + (V.sfBody ? V.sfBody(true) : '');
  }
  function linksTab() {
    return '<div class="card" style="padding:14px"><b>Story ideas</b> <span class="small muted">real events told start to finish, good starting points for a walkthrough</span>'
      + '<div class="grid g2" style="margin-top:8px">' + DK().journeys.map(j => '<div class="card" style="padding:12px"><b>' + esc(j[0]) + '</b><div class="xs muted">' + esc(j[1]) + '</div><ol class="small" style="padding-left:18px;margin:6px 0 0">' + j[2].map(t => '<li>' + esc(t) + '</li>').join('') + '</ol></div>').join('') + '</div></div>'
      + '<div class="card" style="padding:14px;margin-top:12px"><b>When to use the studio</b><ul class="small" style="padding-left:18px;line-height:1.7"><li>After the org package is loaded: a user-guide draft per module.</li><li>Before UAT: a walkthrough of each flow the customer will test, so testers know the steps.</li><li>Before go-live: short how-to videos for the roles that change.</li><li>At handover: training outlines and the guides that stay with the customer.</li></ul></div>';
  }
  V.vstudio = {
    html() {
      const tab = ui().vsTab || 'create';
      const head = `<div class="page-header"><div class="t"><h1>Guides &amp; Video Studio</h1><p>Turn what this project knows about the customer's setup into guides, videos and walkthroughs. For the Facilio team: customers do not see this page.</p></div></div>`;
      const tabs = `<div class="tabs" role="tablist">${[['create', 'Create'], ['kit', 'Product Tour'], ['links', 'Story ideas and tips']].map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" role="tab" aria-selected="${tab === k}" data-act="vsTab" data-v="${k}">${l}</button>`).join('')}</div>`;
      return head + `<div class="page-body">${tabs}${tab === 'kit' ? kitTab() : tab === 'links' ? linksTab() : createTab()}</div>`;
    }
  };
  // opens one screen inside the app (the saved picture; screens without one are not shown)
  ACT.vsView = a => { const x = DK().screens[Number(a.getAttribute('data-i'))]; if (!x || !x[5]) return;
    const body = x[5] ? '<img src="demokit/hd/' + esc(x[5]) + '" alt="' + esc(x[0]) + '" style="width:100%;border:1px solid var(--fc-border);border-radius:6px">'
      : '';
    V.drawer(x[0], '<p class="small muted">' + esc(x[1]) + ' · ' + esc(x[2]) + '</p><p class="small">' + esc(x[3]) + '</p>' + body, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>', { wide: true }); };
  ACT.vsTab = a => { ui().vsTab = a.getAttribute('data-v'); V.render(); };
  ACT.vsSet = el => { const k = el.getAttribute('data-k'); ui()['vs' + k[0].toUpperCase() + k.slice(1)] = el.value; ui().vsBrief = null; V.render(); };
  ACT.vsBrief = el => { ui().vsBrief = el.value; };
  const copy = async text => { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } };
  const current = () => { const t = document.getElementById('vs_brief'); return t ? t.value : ''; };
  ACT.vsCopy = async () => { toast((await copy(current())) ? 'Brief copied' : 'Copy was blocked. Select the text and copy it by hand', 4000); };
  ACT.vsClaude = async () => { const ok = await copy(current()); toast(ok ? 'Brief copied. Paste it into a new Claude chat (Ctrl+V)' : 'Copy was blocked. Select the brief and copy it by hand', 6000); window.open('https://claude.ai/new', '_blank', 'noopener'); };
})(typeof window !== 'undefined' ? window : globalThis);
