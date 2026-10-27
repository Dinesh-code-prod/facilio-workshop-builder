/* Guide intelligence: turns a parsed organisation configuration (FWBParser.parsePackage output) into
   1. a relationship graph whose links are either VERIFIED (named in the configuration) or UNCERTAIN (only suggested, e.g. a name that appears inside script text),
   2. customer-facing functionality items written in plain language (no XML, IDs or script code),
   3. a comparison with an earlier inventory (new / changed / removed / unchanged),
   4. proposals for the existing guide that keep manual wording unless the person chooses otherwise.
   Pure code: no DOM, no network. It runs in the browser and in Node tests. Nothing here calls an AI service; wording is rule-based and can be polished by the person. */
(function (root) {
  'use strict';
  const humanize = s => String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase());
  const hash = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const uniq = a => [...new Set(a.filter(Boolean))];
  const list = (a, max) => { a = uniq(a); const s = a.slice(0, max || 6); return s.join(', ') + (a.length > s.length ? ' and ' + (a.length - s.length) + ' more' : ''); };
  const q = s => '“' + s + '”';

  function analyse(b, opts) {
    opts = opts || {}; const mods = b.modules || {}; const L = m => (mods[m] && mods[m].label) || humanize(m);
    const nodes = new Map(), edges = []; const items = [], findings = [];
    const node = (id, type, label) => { if (!nodes.has(id)) nodes.set(id, { id, type, label }); return id; };
    const edge = (from, to, kind, text, level, evidence, itemKey) => { const e = { id: hash(from + '>' + kind + '>' + to + (evidence || '')), from, to, kind, text, level, evidence: evidence || '', itemKey: itemKey || '' }; if (!edges.some(x => x.id === e.id)) edges.push(e); return e; };
    const find = (level, itemKey, text) => { const f = { id: hash(level + itemKey + text), level, itemKey, text }; findings.push(f); return f; };
    const have = m => !!(mods[m] && !mods[m].notInModuleXml);
    const customFields = m => ((mods[m] && mods[m].fields) || []).filter(f => f.origin === 'Custom' && !f.formOnly);
    const templates = new Set((b.emailTemplates || []).map(t => t.name)); const apps = new Set((b.connectedApps || []).map(a => a.name).filter(Boolean));
    const fieldOf = (m, f) => ((mods[m] && mods[m].fields) || []).find(x => x.name === f);
    const customMods = Object.values(mods).filter(m => m.custom).map(m => m.name);
    const disabled = { buttons: 0, rules: 0, notifications: 0, transitions: 0 };

    // ----- scripts: only explicit Module("x") calls count as verified; a bare name inside the text is only a hint
    function scriptEdges(fromId, itemKey, scripts, ownerModule) {
      (scripts || []).forEach((src, i) => {
        const sid = node(fromId + '#script' + (i + 1), 'script', 'Automated step ' + (i + 1)); edge(fromId, sid, 'runs', 'runs an automated step', 'verified', 'Script present in the configuration', itemKey);
        const explicit = new Set(); const re = /\b[Mm]odule\(\s*["']([A-Za-z0-9_]+)["']\s*\)/g; let m; while ((m = re.exec(src))) explicit.add(m[1]);
        explicit.forEach(name => { if (have(name)) edge(sid, node('module:' + name, 'module', L(name)), 'works with', 'reads or updates ' + L(name) + ' records', 'verified', 'The script names the ' + L(name) + ' module directly', itemKey); else find('broken', itemKey, 'An automated step refers to module ' + q(name) + ', which is not in this package.'); });
        Object.keys(mods).forEach(name => { const nm = name.replace(/[^A-Za-z0-9_]/g, ''); if (!nm || explicit.has(name)) return; const bare = customMods.includes(name) || name === ownerModule; if (!(new RegExp('["\']' + nm + '["\']').test(src) || (bare && new RegExp('\\b' + nm + '\\b').test(src)))) return; edge(sid, node('module:' + name, 'module', L(name)), 'may use', 'mentions ' + L(name), 'uncertain', 'The name appears in the script text, which is not enough to prove what the script does with it', itemKey); });
      });
    }

    // ----- modules and their fields
    Object.values(mods).forEach(m => { node('module:' + m.name, 'module', m.label); });
    const scoped = Object.values(mods).filter(m => !m.notInModuleXml && (m.custom || customFields(m.name).length));
    scoped.forEach(m => {
      const key = 'module:' + m.name; const lines = []; const cf = customFields(m.name);
      cf.forEach(f => {
        const fid = node('field:' + m.name + '.' + f.name, 'field', f.label); edge('module:' + m.name, fid, 'has field', 'has the field ' + f.label, 'verified', 'Field defined on this module', key);
        const tl = /lookup/i.test(f.type) ? 'linked record' : /picklist/i.test(f.type) ? 'list of choices' : f.type.toLowerCase(); let t = f.label + ' (' + tl + (f.required ? ', required' : '') + ')'; if (f.options && f.options.length) t += ': ' + list(f.options.filter(o => o.visible).map(o => o.value), 8);
        lines.push({ g: 'Fields you can fill in', t });
        if (f.lookup) { if (have(f.lookup) || mods[f.lookup]) { edge(fid, node('module:' + f.lookup, 'module', L(f.lookup)), 'links to', f.label + ' links each ' + L(m.name) + ' to a ' + L(f.lookup) + ' record', 'verified', 'Lookup field points to the ' + L(f.lookup) + ' module', key); lines.push({ g: 'Linked records', t: f.label + ' links each ' + L(m.name) + ' to a ' + L(f.lookup) + ' record.' }); } else find('broken', key, f.label + ' points to ' + q(f.lookup) + ', which is not in this package.'); }
      });
      (b.relationships || []).filter(r => r.fromModule === m.name || r.toModule === m.name).forEach(r => { const other = r.fromModule === m.name ? r.toModule : r.fromModule; if (!mods[other]) { find('broken', key, 'The relationship ' + q(r.name) + ' refers to a module that is not in this package.'); return; } edge(node('module:' + r.fromModule, 'module', L(r.fromModule)), node('module:' + r.toModule, 'module', L(r.toModule)), 'related to', L(r.fromModule) + ' and ' + L(r.toModule) + ' are related (' + (r.name || r.forward || 'relationship') + ')', 'verified', 'Relationship defined in the configuration', key); if (r.fromModule === m.name) lines.push({ g: 'Linked records', t: (r.forward || r.name || 'Related') + ': ' + L(r.toModule) + ' records can be related to a ' + L(m.name) + '.' }); });
      items.push({ key, kind: 'module', module: m.name, title: m.label, intro: (m.custom ? m.label + ' is an additional module set up for your organisation. ' : m.label + ' has extra fields set up for your organisation. ') + (m.description ? m.description.replace(/\s+/g, ' ').trim() + (/[.!?]$/.test(m.description.trim()) ? '' : '.') : ''), lines, findings: [] });
    });

    // ----- buttons
    (b.buttons || []).forEach(btn => {
      if (!btn.enabled) { disabled.buttons++; return; } const key = 'button:' + btn.module + '/' + (btn.link || btn.name); const bid = node(key, 'button', btn.name); const lines = []; const mid = node('module:' + btn.module, 'module', L(btn.module));
      if (!have(btn.module)) find('broken', key, 'The button ' + q(btn.name) + ' is placed on module ' + q(btn.module) + ', which is not in this package.');
      edge(mid, bid, 'shows button', L(btn.module) + ' shows the button ' + btn.name, 'verified', 'Button defined for this module', key);
      lines.push({ g: 'Where you find it', t: 'On ' + L(btn.module) + ' records' + (btn.position ? ' (' + humanize(btn.position).toLowerCase() + ')' : '') + '.' });
      if (btn.criteria && btn.criteria.text) lines.push({ g: 'When it is available', t: btn.criteria.text });
      const act = btn.actions || { types: [], fieldUpdates: [], scripts: [], templates: [], changeState: [], recipients: [] };
      let did = false;
      if (btn.targetModule && btn.targetModule !== btn.module) {
        const tid = node('module:' + btn.targetModule, 'module', L(btn.targetModule));
        if (mods[btn.targetModule]) { const verb = /create|new|add|record|form/i.test(btn.actionType || '') ? 'creates' : 'connects to'; edge(bid, tid, verb, 'the button ' + (verb === 'creates' ? 'creates a ' : 'connects to ') + L(btn.targetModule) + (verb === 'creates' ? ' record' : ''), 'verified', 'Button settings name the ' + L(btn.targetModule) + ' module (action type ' + (btn.actionType || 'not stated') + ')', key); lines.push({ g: 'What it does', t: verb === 'creates' ? 'Creates a ' + L(btn.targetModule) + ' record.' : 'Takes you to ' + L(btn.targetModule) + '.' }); did = true;
          if (verb !== 'creates') find('uncertain', key, 'The button ' + q(btn.name) + ' refers to ' + L(btn.targetModule) + ' but its action type (' + (btn.actionType || 'not stated') + ') does not say whether a record is created. Confirm the behaviour.'); }
        else find('broken', key, 'The button ' + q(btn.name) + ' refers to module ' + q(btn.targetModule) + ', which is not in this package.');
      }
      if (btn.connectedApp) { if (!apps.size || apps.has(btn.connectedApp)) { edge(bid, node('app:' + btn.connectedApp, 'app', humanize(btn.connectedApp)), 'opens app', 'the button opens the ' + humanize(btn.connectedApp) + ' app', 'verified', 'Button settings name the connected app', key); lines.push({ g: 'What it does', t: 'Opens the ' + humanize(btn.connectedApp) + ' app.' }); did = true; } else find('broken', key, 'The button ' + q(btn.name) + ' opens connected app ' + q(btn.connectedApp) + ', which is not in this package.'); }
      act.fieldUpdates.forEach(u => { if (btn.module && !fieldOf(btn.module, (u.field || '')) && !/^moduleState$/.test(u.field)) find('uncertain', key, 'The button sets ' + q(u.fieldLabel || u.field) + ', which was not found among the ' + L(btn.module) + ' fields.'); edge(bid, node('field:' + btn.module + '.' + u.field, 'field', u.fieldLabel || u.field), 'updates', 'sets ' + (u.fieldLabel || u.field), 'verified', 'Field update in the button action', key); lines.push({ g: 'What it does', t: 'Sets ' + (u.fieldLabel || humanize(u.field)) + (u.value ? ' to ' + u.value : '') + '.' }); did = true; });
      act.changeState.forEach(s => { lines.push({ g: 'What it does', t: 'Changes the status to ' + s + '.' }); did = true; });
      act.templates.forEach(t => { edge(bid, node('template:' + t, 'template', t), 'sends', 'the button sends the email ' + t, templates.size && !templates.has(t) ? 'uncertain' : 'verified', 'Email template named in the action', key); lines.push({ g: 'What it does', t: 'Sends the email ' + q(t) + (act.recipients.length ? ' to ' + list(act.recipients, 4) : '') + '.' }); did = true; if (templates.size && !templates.has(t)) find('uncertain', key, 'The email template ' + q(t) + ' was not found in this package.'); });
      if (act.scripts.length) { scriptEdges(key, key, act.scripts, btn.module); lines.push({ g: 'What it does', t: 'Runs an automated step in the background.' }); did = true; }
      else if (/script|function|workflow/i.test((btn.buttonType || '') + ' ' + (btn.actionType || ''))) { find('uncertain', key, 'The button ' + q(btn.name) + ' is set to run a script or function, but the configuration does not say which one. Confirm what it does before describing it.'); }
      if (!did) find('uncertain', key, 'The configuration does not describe what the button ' + q(btn.name) + ' does. Add the steps from your own knowledge or UAT notes.');
      if (btn.targetModule && btn.targetModule !== btn.module && !act.fieldUpdates.length) find('uncertain', key, 'Which values the button copies into the new ' + L(btn.targetModule) + ' record are not visible in the configuration. Confirm before listing them.');
      items.push({ key, kind: 'button', module: btn.module, title: btn.name, intro: 'The ' + q(btn.name) + ' button.', lines, findings: [] });
    });

    // ----- workflow rules and notifications
    const ruleItem = (r, kind) => {
      if (!r.enabled) { disabled[kind === 'rule' ? 'rules' : 'notifications']++; return; } const key = kind + ':' + r.module + '/' + (r.link || r.name); const rid = node(key, kind, r.name); const lines = [];
      if (!have(r.module)) find('broken', key, 'The ' + (kind === 'rule' ? 'automation' : 'notification') + ' ' + q(r.name) + ' belongs to module ' + q(r.module) + ', which is not in this package.');
      edge(rid, node('module:' + r.module, 'module', L(r.module)), 'triggers on', (kind === 'rule' ? 'the automation ' : 'the notification ') + r.name + ' reacts to ' + L(r.module) + ' records', 'verified', 'Rule is defined for this module (' + (r.eventLabel || r.event || 'event') + ')', key);
      lines.push({ g: 'When it happens', t: (r.eventLabel || humanize(r.event) || 'An event') + ' on ' + L(r.module) + (r.fieldsWatched && r.fieldsWatched.length ? ' (' + list(r.fieldsWatched, 4) + ' changes)' : '') + '.' }); if (r.criteria && r.criteria.text) lines.push({ g: 'Only when', t: r.criteria.text });
      const a = r.actions; a.fieldUpdates.forEach(u => { if (!fieldOf(r.module, u.field) && u.field !== 'moduleState') find('uncertain', key, 'The automation sets ' + q(u.fieldLabel || u.field) + ', which was not found among the ' + L(r.module) + ' fields.'); edge(rid, node('field:' + r.module + '.' + u.field, 'field', u.fieldLabel || u.field), 'updates', 'updates ' + (u.fieldLabel || u.field), 'verified', 'Field update in the action', key); lines.push({ g: 'What happens', t: (u.fieldLabel || humanize(u.field)) + ' is set' + (u.value ? ' to ' + u.value : '') + '.' }); });
      a.changeState.forEach(s => lines.push({ g: 'What happens', t: 'The status changes to ' + s + '.' }));
      a.templates.forEach(t => { edge(rid, node('template:' + t, 'template', t), 'sends', 'sends the email ' + t, templates.size && !templates.has(t) ? 'uncertain' : 'verified', 'Email template named in the action', key); lines.push({ g: 'What happens', t: 'An email (' + q(t) + ') is sent' + (a.recipients.length ? ' to ' + list(a.recipients, 4) : '') + '.' }); if (templates.size && !templates.has(t)) find('uncertain', key, 'The email template ' + q(t) + ' was not found in this package.'); });
      if (!a.templates.length && a.recipients.length && (kind === 'notification' || a.types.some(t => /MAIL|NOTIF|SMS|PUSH/i.test(t)))) lines.push({ g: 'What happens', t: 'A message is sent to ' + list(a.recipients, 4) + '.' });
      if (a.scripts.length) { scriptEdges(key, key, a.scripts, r.module); lines.push({ g: 'What happens', t: 'An automated step runs in the background.' }); find('uncertain', key, 'The automation runs ' + a.scripts.length + ' script(s). Their business effect is not interpreted automatically: describe it only after checking it.'); }
      if (kind === 'notification' || a.templates.length) edge(rid, node('event:' + r.module + ':' + (r.event || ''), 'event', r.eventLabel || humanize(r.event)), 'fires on', 'fires on ' + (r.eventLabel || humanize(r.event)), 'verified', 'Activity type in the rule', key);
      if (lines.length < 2) find('uncertain', key, 'The ' + (kind === 'rule' ? 'automation' : 'notification') + ' ' + q(r.name) + ' has no readable action in the configuration.');
      items.push({ key, kind, module: r.module, title: r.name, intro: (kind === 'rule' ? 'Automation ' : 'Notification ') + q(r.name) + '.', lines, findings: [] });
    };
    (b.workflowRules || []).forEach(r => ruleItem(r, 'rule')); (b.notifications || []).forEach(r => ruleItem(r, 'notification'));

    // ----- status flows (grouped per flow)
    const byFlow = {}; (b.transitions || []).forEach(t => { if (!t.enabled) { disabled.transitions++; return; } (byFlow[t.flowId] = byFlow[t.flowId] || []).push(t); });
    (b.flows || []).forEach(f => {
      const ts = byFlow[f.id || (f.module + '::' + (f.link || f.name))] || byFlow[f.module + '::' + f.name] || []; if (!ts.length) return; const key = 'flow:' + f.module + '/' + (f.link || f.name); const lines = [];
      ts.forEach(t => { const who = t.performers && t.performers.length ? ' (by ' + list(t.performers.map(p => p.label || p.name || p), 3) + ')' : ''; lines.push({ g: 'Status changes', t: (t.fromLabel || t.from) + ' → ' + (t.toLabel || t.to) + ': ' + t.name + who + (t.commentRequired ? ', a comment is required' : '') + '.' });
        const a = t.actions || {}; node('flow:' + f.module + '/' + t.name, 'transition', t.name); (a.templates || []).forEach(tp => { lines.push({ g: 'Messages sent on a status change', t: q(t.name) + ' sends ' + q(tp) + '.' }); edge(node(key, 'flow', f.name), node('template:' + tp, 'template', tp), 'sends', t.name + ' sends ' + tp, templates.size && !templates.has(tp) ? 'uncertain' : 'verified', 'Email template named in the status change', key); });
        (a.fieldUpdates || []).forEach(u => lines.push({ g: 'Automatic updates on a status change', t: q(t.name) + ' sets ' + (u.fieldLabel || humanize(u.field)) + (u.value ? ' to ' + u.value : '') + '.' })); if ((a.scripts || []).length) { scriptEdges(key, key, a.scripts, f.module); find('uncertain', key, q(t.name) + ' runs an automated step whose effect is not interpreted automatically.'); } });
      edge(node(key, 'flow', f.name), node('module:' + f.module, 'module', L(f.module)), 'moves', 'the ' + f.name + ' flow moves ' + L(f.module) + ' records between statuses', 'verified', 'Status flow defined for this module', key);
      items.push({ key, kind: 'flow', module: f.module, title: L(f.module) + ': ' + f.name, intro: 'Status flow for ' + L(f.module) + '.', lines, findings: [] });
    });
    (b.sla || []).filter(s => s.enabled).forEach(s => { const key = 'sla:' + s.module + '/' + s.name; const lines = []; (s.commitments || []).forEach(c => (c.entities || []).forEach(e => lines.push({ g: 'Targets', t: (e.entity || c.name) + ': ' + (e.seconds >= 3600 ? Math.round(e.seconds / 360) / 10 + ' hours' : Math.round(e.seconds / 60) + ' minutes') + '.' }))); if (!lines.length) return; node(key, 'sla', s.name); edge(key, node('module:' + s.module, 'module', L(s.module)), 'applies to', s.name + ' applies to ' + L(s.module), 'verified', 'SLA policy defined for this module', key); items.push({ key, kind: 'sla', module: s.module, title: s.name, intro: 'Service level policy ' + q(s.name) + ' on ' + L(s.module) + '.', lines, findings: [] }); });

    // ----- finish items: text, hash, findings
    const byKey = {}; findings.forEach(f => { (byKey[f.itemKey] = byKey[f.itemKey] || []).push(f); });
    items.forEach(it => { it.moduleLabel = L(it.module); it.findings = (byKey[it.key] || []).map(f => ({ level: f.level, text: f.text })); it.md = itemMd(it); it.hash = hash(it.title + '|' + it.lines.map(l => l.g + '|' + l.t).join('\n')); });
    const verified = edges.filter(e => e.level === 'verified').length;
    return { items, graph: { nodes: [...nodes.values()], edges }, findings, stats: { modules: Object.keys(mods).length, customModules: customMods.length, fields: scoped.reduce((n, m) => n + customFields(m.name).length, 0), buttons: items.filter(i => i.kind === 'button').length, rules: items.filter(i => i.kind === 'rule').length, notifications: items.filter(i => i.kind === 'notification').length, flows: items.filter(i => i.kind === 'flow').length, edges: edges.length, verified, uncertain: edges.length - verified, broken: findings.filter(f => f.level === 'broken').length, disabled } };
  }
  // The customer-facing text of one item: headings and bullets only
  function itemMd(it) {
    const groups = []; it.lines.forEach(l => { let g = groups.find(x => x.g === l.g); if (!g) groups.push(g = { g: l.g, ts: [] }); if (!g.ts.includes(l.t)) g.ts.push(l.t); });
    return '### ' + it.title + '\n' + (it.intro ? it.intro + '\n' : '') + groups.map(g => '\n**' + g.g + '**\n' + g.ts.map(t => '- ' + t).join('\n')).join('\n');
  }

  // ----- comparison of two inventories (arrays of items) -----
  function diff(prev, next) {
    const pm = new Map((prev || []).map(i => [i.key, i])); const nm = new Map(next.map(i => [i.key, i])); const out = { added: [], changed: [], removed: [], unchanged: [] };
    next.forEach(n => { const p = pm.get(n.key); if (!p) out.added.push({ key: n.key, item: n }); else if (p.hash !== n.hash) { const id = l => l.g + '|' + l.t; const ps = new Set(p.lines.map(id)), ns = new Set(n.lines.map(id)); out.changed.push({ key: n.key, item: n, prevItem: p, addedLines: n.lines.filter(l => !ps.has(id(l))), removedLines: p.lines.filter(l => !ns.has(id(l))) }); } else out.unchanged.push({ key: n.key, item: n }); });
    (prev || []).forEach(p => { if (!nm.has(p.key)) out.removed.push({ key: p.key, item: p }); });
    return out;
  }

  // ----- proposals for an existing guide -----
  const blockText = bl => (bl && bl.t === 'md' ? bl.text || '' : '');
  const secText = s => s.blocks.map(blockText).join('\n').toLowerCase();
  function genBlock(guide, key) { for (let i = 0; i < guide.sections.length; i++) { const j = guide.sections[i].blocks.findIndex(b => b.gen && b.gen.key === key); if (j >= 0) return { si: i, bi: j, sec: guide.sections[i], block: guide.sections[i].blocks[j] }; } return null; }
  function mention(guide, item) { const nm = String(item.kind === 'module' ? item.title : item.kind === 'button' ? item.title : '').toLowerCase(); if (nm.length < 4) return null; for (const s of guide.sections) if (secText(s).includes(nm)) return s; return null; }
  function sectionFor(guide, item, mods) { const lab = String(item.moduleLabel || (mods && mods[item.module] && mods[item.module].label) || item.module || 'Other configuration').toLowerCase(); return guide.sections.find(s => s.title.toLowerCase().includes(lab) || (lab.length > 3 && lab.includes(s.title.toLowerCase()) && s.title.length > 3)) || null; }
  function propose(guide, d, mods) {
    const out = []; let n = 0; const P = o => out.push(Object.assign({ id: 'p' + (++n) + '_' + hash(o.key + o.type), status: 'pending' }, o));
    const edited = g => !!(g && g.block.gen && blockText(g.block) !== g.block.gen.base);
    const unc = it => it.findings.some(f => f.level !== 'verified');
    d.added.forEach(({ item }) => { const g = genBlock(guide, item.key), m = mention(guide, item); if (g) return;
      if (m) P({ key: item.key, type: 'review', title: item.title, kind: item.kind, secTitle: m.title, secId: m.id, before: '', after: item.md, reason: 'The guide already mentions ' + q(item.title) + ' in ' + q(m.title) + '. Review the wording against what is configured; add the generated text only if it helps.', conflict: false, uncertain: unc(item), findings: item.findings, hash: item.hash });
      else { const s = sectionFor(guide, item, mods); P({ key: item.key, type: 'add', title: item.title, kind: item.kind, secTitle: s ? s.title : (item.moduleLabel || item.module || 'Other configuration'), secId: s ? s.id : null, before: '', after: item.md, reason: 'New in the configuration and not described in the guide.', conflict: false, uncertain: unc(item), findings: item.findings, hash: item.hash }); } });
    d.changed.forEach(c => { const item = c.item, g = genBlock(guide, item.key), m = g ? null : mention(guide, item); if (g && g.block.gen.hash === item.hash) return; const why = (c.addedLines.length ? 'Added: ' + c.addedLines.map(l => l.t).slice(0, 4).join(' ') : '') + (c.removedLines.length ? (c.addedLines.length ? ' ' : '') + 'No longer configured: ' + c.removedLines.map(l => l.t).slice(0, 4).join(' ') : '');
      if (g) P({ key: item.key, type: 'update', title: item.title, kind: item.kind, secTitle: g.sec.title, secId: g.sec.id, before: blockText(g.block), after: item.md, reason: why || 'The configuration changed.', conflict: edited(g), uncertain: unc(item), findings: item.findings, hash: item.hash, added: c.addedLines.map(l => l.t), removed: c.removedLines.map(l => l.t) });
      else if (m) P({ key: item.key, type: 'review', title: item.title, kind: item.kind, secTitle: m.title, secId: m.id, before: '', after: item.md, reason: 'The configuration changed and the guide describes it in your own words in ' + q(m.title) + '. ' + why, conflict: true, uncertain: unc(item), findings: item.findings, hash: item.hash, added: c.addedLines.map(l => l.t), removed: c.removedLines.map(l => l.t) });
      else { const s = sectionFor(guide, item, mods); P({ key: item.key, type: 'add', title: item.title, kind: item.kind, secTitle: s ? s.title : (item.moduleLabel || item.module), secId: s ? s.id : null, before: '', after: item.md, reason: why, conflict: false, uncertain: unc(item), findings: item.findings, hash: item.hash }); } });
    d.removed.forEach(({ item }) => { const g = genBlock(guide, item.key), m = g ? null : mention(guide, item); if (g && g.block.gen.removedInConfig) return;
      if (g) P({ key: item.key, type: 'remove', title: item.title, kind: item.kind, secTitle: g.sec.title, secId: g.sec.id, before: blockText(g.block), after: '', reason: 'No longer in the configuration (removed or switched off).', conflict: edited(g), uncertain: false, findings: [], hash: '' });
      else if (m) P({ key: item.key, type: 'review', title: item.title, kind: item.kind, secTitle: m.title, secId: m.id, before: '', after: '', reason: q(item.title) + ' is no longer in the configuration but the guide still mentions it in ' + q(m.title) + '. Check that section and update it by hand.', conflict: true, uncertain: false, findings: [], hash: '', removalNote: true }); });
    return out;
  }
  // Apply one decided proposal to the guide (mutates it). resolution: 'proposed' | 'mine' | 'edited' (with text)
  const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function apply(guide, p, resolution, text) {
    const gen = { key: p.key, hash: p.hash, at: new Date().toISOString() };
    if (p.type === 'remove') { const g = genBlock(guide, p.key); if (g) { if (resolution === 'mine') { g.block.gen = Object.assign({}, g.block.gen, { removedInConfig: true }); return 'kept'; } g.sec.blocks.splice(g.bi, 1); if (!g.sec.blocks.length && g.sec.generated) guide.sections.splice(g.si, 1); return 'removed'; } return 'none'; }
    if (p.removalNote) return 'noted';
    const body = resolution === 'edited' ? text : p.after;
    if (p.type === 'update') { const g = genBlock(guide, p.key); if (!g) return apply(guide, Object.assign({}, p, { type: 'add' }), resolution, text); if (resolution === 'mine') { g.block.gen = Object.assign({}, g.block.gen, gen, { base: p.after }); return 'kept'; } g.block.text = body; g.block.gen = Object.assign({}, gen, { base: body }); return 'updated'; }
    let sec = p.secId && guide.sections.find(s => s.id === p.secId); if (!sec) { sec = { id: newId(), title: p.secTitle || 'Other configuration', blocks: [], generated: true }; guide.sections.push(sec); }
    sec.blocks.push({ t: 'md', text: body, gen: Object.assign({}, gen, { base: body }) }); return 'added';
  }

  // ----- checks before publishing -----
  function validate(guide, analysis, decisions) {
    const out = []; const add = (sev, area, what, detail) => out.push({ sev, area, what, detail });
    const keys = new Set((analysis ? analysis.items : []).map(i => i.key)); const uncertainKeys = new Set((analysis ? analysis.items : []).filter(i => i.findings.some(f => f.level !== 'verified')).map(i => i.key));
    guide.sections.forEach(s => s.blocks.forEach(b => {
      const t = blockText(b);
      if (/<\/?[A-Za-z][A-Za-z0-9_]*[\s>\/]/.test(t) && /<[A-Za-z]+[^>]*>/.test(t)) add('medium', s.title, 'Text looks like markup or XML', 'Remove technical markup before sending to the customer.');
      if (/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\bUnique_Identifier\b|\bcv\.[a-z]+\.|\bworkflowV2\b|\bfunction\s*\(|=>\s*\{/.test(t)) add('medium', s.title, 'Contains internal identifiers or code', 'Customer guides should describe what happens, not how it is built.');
      if (b.gen) { if (analysis && !keys.has(b.gen.key) && !b.gen.removedInConfig) add('medium', s.title, 'Describes something that is not in the uploaded configuration', 'Block for ' + q(b.gen.key.split(':').pop()) + ' has no matching configuration. Remove it or confirm it still applies.'); if (uncertainKeys.has(b.gen.key)) add('low', s.title, 'Includes behaviour that is only partly verified', 'See the validation notes for ' + q(b.gen.key.split(':').pop()) + ' and confirm the wording.'); }
    }));
    const pend = (decisions || []).filter(p => p.status === 'pending'); if (pend.length) add('medium', 'Update review', pend.length + ' proposed change' + (pend.length > 1 ? 's' : '') + ' not decided yet', 'Accept or reject each proposal before publishing.');
    const conf = (decisions || []).filter(p => p.status === 'pending' && p.conflict); if (conf.length) add('high', 'Update review', conf.length + ' conflict' + (conf.length > 1 ? 's' : '') + ' with manual wording', 'Choose which wording to keep.');
    if (analysis) analysis.findings.filter(f => f.level === 'broken').forEach(f => add('high', 'Configuration', f.text, 'A referenced component is missing from the package.'));
    return out;
  }
  root.FWBIntel = { analyse, diff, propose, apply, validate, itemMd, hash, genBlock };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FWBIntel;
})(typeof window !== 'undefined' ? window : globalThis);
