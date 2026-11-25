/* Commands typed in the Assistant chat that the Studio can do itself (open a page, add a task, start a Claude job, find a draft to approve).
   Pure code: no DOM, no network (also run by tests/chatcmds.mjs). src/assistant.js asks match() before routing a message; nothing runs until the person presses Do it.
   Anything that does not match clearly returns null and the message goes to Project AI or Claude as before. */
(function (root) {
  'use strict';
  const low = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  const forMod = t => { const m = /\b(?:for|on|about)\s+(?:the\s+)?([a-z0-9][a-z0-9 &/-]{2,40}?)(?:\s+module)?\s*[.?!]?$/i.exec(t); return m && !/^(this|the project|everything|all)$/i.test(m[1].trim()) ? m[1].trim() : ''; };
  const ymd = d => d.toISOString().slice(0, 10);
  const TOOLS = {"meteor":"the Meteor connector tools, READ only (project, my_prototypes, get_prototype)","comet":"the Comet connector tools, READ only (my_work, comets, get_creation)"};
  const GUIDES = [[/\buat guide|tester'?s? guide/, 'uat', 'the UAT guide'], [/\buser guide/, 'user', 'a user guide'], [/\btraining (guide|outline|plan)/, 'training', 'a training guide'], [/\bvideo script|shot list/, 'video', 'a video script']];
  const DRAFTS = [[/\bftr\b/, 'ftr', 'FTR report'], [/\buat guide/, 'uat', 'UAT guide'], [/\buser guide/, 'guide', 'user guide'], [/\btraining/, 'training', 'training guide'], [/\bbrd\b/, 'brd', 'BRD'], [/\b(weekly|status) report|\bwsr\b/, 'wsr', 'weekly status report']];
  /** text -> null | { type: 'nav', view, label } | { type: 'task', title } | { type: 'folder', name } | { type: 'job', job: { kind, section, note }, label } | { type: 'draft', task, label }
      ctx: { pages: [[id, label]] (the menu of this project), today: Date } */
  function match(text, ctx) {
    const raw = String(text || '').trim(), t = low(raw), c = ctx || {}; if (!t || t.length > 300) return null;
    // Meteor and Comet: open one docked inside the Studio, or ask it something through Claude (the Studio cannot call another facilio.work app itself; Claude can, with its connectors)
    let mc = /^(?:please\s+)?(?:open|show|launch)\s+(meteor|comet)\b\s*[.!]?$/i.exec(raw); if (mc) return { type: 'dock', site: mc[1].toLowerCase(), label: mc[1][0].toUpperCase() + mc[1].slice(1).toLowerCase() };
    mc = /\b(meteor|comet)\b/i.exec(raw); if (mc && raw.length >= 12 && !/^(open|go to|show me the)\b.*\b(page|tab)\b/i.test(raw)) { const site = mc[1].toLowerCase(), name = site[0].toUpperCase() + site.slice(1); return { type: 'job', job: { kind: 'chat', section: 'chat', note: ('Use ' + TOOLS[site] + ' to do this, then answer here in the Studio chat with the facts and links you found: ' + raw).slice(0, 590) }, label: 'Ask ' + name + ' through your Claude' }; }
    // module scope: "Purchase Order and Quote are not required, remove their flows and mark them out of scope" (the server plans it first; nothing changes before Confirm)
    const tc = tasksCmd(t, c.modules); if (tc) return tc;
    const sc = scopeCmd(t, c.modules); if (sc) return sc;
    // the project check: "check this project", "what needs attention?", "health check"; how often it runs by itself: "check this project daily / when I open it / never"
    if (/\b(check|watch)\w*\b.*\b(project|it)\b.*\b(daily|every day|each day|when i open|on open|every time|never|off|stop)\b|\b(stop|never)\b.*\bcheck\w*\b.*\bproject\b/.test(t)) return { type: 'checkfreq', freq: /never|off|stop/.test(t) ? 'off' : /daily|every day|each day/.test(t) ? 'daily' : 'open' };
    if (/^(?:please\s+)?(?:check|review|scan|audit)\s+(?:this|the|my)\s+project\b|\b(health ?check|what needs (my )?attention|anything (wrong|missing|late))\b/.test(t)) return { type: 'check' };
    // add a task: "add task: call the customer", "new task follow up on the SLA"
    let m = /^(?:please\s+)?(?:add|create|new|make)\s+(?:a\s+)?(?:new\s+)?(?:task|to-?do)\s*(?::|-|to|called)?\s+(.{3,200})$/i.exec(raw);
    if (m) return { type: 'task', title: m[1].replace(/[.\s]+$/, '') };
    // a guide folder on the Training page: "new folder Technicians", "create a guide folder called Admins" (the person confirms; moving guides in stays on the page)
    m = /^(?:please\s+)?(?:add|create|make|new)\s+(?:a\s+)?(?:new\s+)?(?:guides?\s+|training\s+)?folder\s*(?:called|named|for|:|-)?\s+(.{2,60})$/i.exec(raw);
    if (m) return { type: 'folder', name: m[1].replace(/^["'\u201c]+|["'\u201d.\s]+$/g, '') };
    // edit or export a document drafted like the BRD: the FTR report and the guides open as editable documents with Word, PDF and HTML in their top bar
    if (/\b(edit|export|download|html)\b/.test(t) && /\bftr\b|functional test report/.test(t)) return { type: 'nav', view: 'ftr', label: 'the FTR report: click any cell to change it; Word, PDF and HTML are in its top bar' };
    if (/\b(edit|export|download)\b.*\b(user |training )?guides?\b.*\b(html|word|pdf)\b|\b(html|word|pdf)\b.*\bguides?\b/.test(t)) return { type: 'nav', view: 'guides', label: 'Training guides: open a guide, then Word, PDF or HTML in its top bar' };
    // approve a draft: the approval itself stays a click in the draft window
    if (/\bapprove\b/.test(t)) { const d = DRAFTS.find(x => x[0].test(t)); if (d) return { type: 'draft', task: d[1], label: d[2] }; }
    const doVerb = /^(?:please\s+|can you\s+|could you\s+)?(?:write|make|create|generate|prepare|draft|build|refresh|update|redo|run)\b/.test(t);
    // the FTR report: write it, or test the organisation through the Facilio connector
    if (/\bftr\b|functional test report/.test(t)) {
      if (/\b(check|test|verify|run)\b.*\b(org|organi[sz]ation|config(uration)?|connector)\b/.test(t)) return { type: 'job', job: { kind: 'make_ftr', section: 'check', note: raw.slice(0, 500) }, label: 'Check the organisation against the FTR test cases' };
      if (doVerb) return { type: 'job', job: { kind: 'make_ftr', section: 'write', note: raw.slice(0, 500) }, label: 'Write or refresh the FTR report' };
    }
    // guides and video scripts, for everything or one module
    if (doVerb) { const g = GUIDES.find(x => x[0].test(t)); if (g) { const mod = forMod(raw); return { type: 'job', job: { kind: 'make_guide', section: g[1], note: ((mod ? 'Only for the module "' + mod + '". ' : '') + raw).slice(0, 560) }, label: 'Make ' + g[2] + (mod ? ' for ' + mod : '') }; } }
    // the weekly status report for the week that ends today
    if (doVerb && /\b(weekly|status) report|\bwsr\b/.test(t)) return { type: 'job', job: { kind: 'make_wsr', section: ymd(c.today || new Date()), note: raw.slice(0, 500) }, label: 'Make the weekly status report' };
    // a new contract: "pull my new MSA", "read the amendment from the drive" (src/crtracklogic.js chatJob: a change track after the kick-off is approved)
    const CR = root.FWBCrTrack || (typeof require === 'function' ? (() => { try { return require('./crtracklogic.js'); } catch (e) { return null; } })() : null); const cj = CR && CR.chatJob(raw, !!c.kickoffApproved); if (cj) return cj;
    // open a page: "open the BRD", "go to tasks", "show me the FTR report"
    m = /^(?:please\s+)?(?:open|go to|show(?: me)?|take me to|jump to)\s+(?:the\s+|my\s+)?(.{2,60}?)(?:\s+(?:page|tab))?[.?!]?$/i.exec(raw);
    if (m && Array.isArray(c.pages)) {
      const want = low(m[1]); const score = p => { const l = low(p[1]); return l === want ? 3 : l.startsWith(want) || want.startsWith(l) ? 2 : l.includes(want) || want.includes(l) ? 1 : 0; };
      const best = c.pages.map(p => [p, score(p)]).filter(x => x[1]).sort((a, b) => b[1] - a[1])[0]; if (best) return { type: 'nav', view: best[0][0], label: best[0][1] };
    }
    return null;
  }
  // modules named in the text (labels or names, plural allowed, longest first so "Purchase Order" never also counts as "Order"); out or in scope; flows off only when flows are named with a removing verb
  const OUTQ = /\b(out of (the )?scope|not (required|needed|in scope|part of)|descope|de-scope|exclude|remove|drop)\b/, INQ = /\b(in(to)? (the )?scope|include|bring back|add\b.*\bto (the )?scope)\b/;
  const QUEST = /\?\s*$|^(what|which|is|are|how|does|do|why|who|when|can|could)\b/;
  function findMods(t, modules) {
    if (!Array.isArray(modules)) return []; const rx = s => new RegExp('\\b' + low(s).replace(/[^a-z0-9 ]/g, '').trim().split(' ').join('\\s*') + '(e?s)?\\b');
    let rest = t.replace(/[^a-z0-9 ]/g, ' '); const found = [];
    modules.map(m => ({ m, keys: [m.label, m.name].filter(k => k && low(k).replace(/[^a-z0-9]/g, '').length > 2) })).sort((a, b) => Math.max(0, ...b.keys.map(k => k.length)) - Math.max(0, ...a.keys.map(k => k.length)))
      .forEach(({ m, keys }) => keys.some(k => { const r = rx(k); if (!r.test(rest)) return false; rest = rest.replace(new RegExp(r.source, 'g'), ' '); if (!found.includes(m)) found.push(m); return true; }));
    return found;
  }
  function scopeCmd(t, modules) {
    if (!Array.isArray(modules) || !modules.length || QUEST.test(t)) return null; const out = OUTQ.test(t), inn = !out && INQ.test(t); if (!out && !inn) return null;
    const found = findMods(t, modules).map(m => m.name); if (!found.length) return null;
    const flows = /\bflows?\b/.test(t) ? (out && /\b(remove|switch(ed)? off|turn(ed)? off|disable|drop|retire|delete)\b/.test(t) ? 'off' : inn && /\b(switch(ed)? on|turn(ed)? on|enable|restore|bring back)\b/.test(t) ? 'on' : 'keep') : 'keep';
    const out1 = { type: 'scope', modules: found, inScope: inn, flows }; if (out && /\brequirements?\b/.test(t)) out1.requirements = 'out'; return out1;
  }
  // tasks in bulk: "close all overdue tasks of Quote", "reassign Ravi's open tasks to Asha", "move my overdue tasks to 2026-12-05" (the server previews; a name that matches nobody is reported)
  function tasksCmd(t, modules) {
    if (!/\btasks?\b/.test(t) || QUEST.test(t) || /^(?:please\s+)?(add|create|new|make)\b/.test(t)) return null; const set = {}; let m;
    if (/\b(close|complete|finish)\b|\bmark\b.*\b(done|complete|completed|closed)\b/.test(t)) set.status = 'Done'; else if (/\bcancel\b/.test(t)) set.status = 'Cancelled';
    if ((m = /\b(?:due|deadline|move|push|shift|postpone|re-?date)\b.*\b(?:to|on|by|until)\s+(\d{4}-\d{2}-\d{2})\b/.exec(t))) set.due = m[1];
    if ((m = /\b(?:reassign|assign|give|hand(?: over)?|transfer|move)\b.*\bto\s+([a-z][a-z.'-]*(?:\s+[a-z][a-z.'-]*)?)$/.exec(t.replace(/[.!\s]+$/, ''))) && !/^(done|complete|closed)$/.test(m[1])) set.owner = m[1];
    if (!Object.keys(set).length) return null;
    const modText = t.replace(/\bto\s+[a-z][^]*$/, ' ').replace(/\btasks?\b/g, ' ');   // "tasks" is the subject, not the Tasks module; the name after "to" is a person
    const filter = { status: /\b(overdue|late)\b/.test(t) ? 'overdue' : 'open' }, mods = findMods(modText, modules); if (mods.length > 1) return null;   // two modules in one bulk change: let Claude read it
    if (/\bmy (open |overdue |late )?tasks\b/.test(t)) filter.owner = 'me'; else if ((m = /\b([a-z]+)'s\b/.exec(t))) filter.owner = m[1];
    if (mods.length) { filter.module = mods[0].name; filter.moduleLabel = mods[0].label; }
    return { type: 'tasks', filter, set };
  }
  const api = { match };
  root.FWBViews = root.FWBViews || {}; root.FWBViews.chatCmd = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
