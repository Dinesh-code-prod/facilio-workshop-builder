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
  /** text -> null | { type: 'nav', view, label } | { type: 'task', title } | { type: 'job', job: { kind, section, note }, label } | { type: 'draft', task, label }
      ctx: { pages: [[id, label]] (the menu of this project), today: Date } */
  function match(text, ctx) {
    const raw = String(text || '').trim(), t = low(raw), c = ctx || {}; if (!t || t.length > 300) return null;
    // Meteor and Comet: open one docked inside the Studio, or ask it something through Claude (the Studio cannot call another facilio.work app itself; Claude can, with its connectors)
    let mc = /^(?:please\s+)?(?:open|show|launch)\s+(meteor|comet)\b\s*[.!]?$/i.exec(raw); if (mc) return { type: 'dock', site: mc[1].toLowerCase(), label: mc[1][0].toUpperCase() + mc[1].slice(1).toLowerCase() };
    mc = /\b(meteor|comet)\b/i.exec(raw); if (mc && raw.length >= 12 && !/^(open|go to|show me the)\b.*\b(page|tab)\b/i.test(raw)) { const site = mc[1].toLowerCase(), name = site[0].toUpperCase() + site.slice(1); return { type: 'job', job: { kind: 'chat', section: 'chat', note: ('Use ' + TOOLS[site] + ' to do this, then answer here in the Studio chat with the facts and links you found: ' + raw).slice(0, 590) }, label: 'Ask ' + name + ' through your Claude' }; }
    // add a task: "add task: call the customer", "new task follow up on the SLA"
    let m = /^(?:please\s+)?(?:add|create|new|make)\s+(?:a\s+)?(?:new\s+)?(?:task|to-?do)\s*(?::|-|to|called)?\s+(.{3,200})$/i.exec(raw);
    if (m) return { type: 'task', title: m[1].replace(/[.\s]+$/, '') };
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
    // open a page: "open the BRD", "go to tasks", "show me the FTR report"
    m = /^(?:please\s+)?(?:open|go to|show(?: me)?|take me to|jump to)\s+(?:the\s+|my\s+)?(.{2,60}?)(?:\s+(?:page|tab))?[.?!]?$/i.exec(raw);
    if (m && Array.isArray(c.pages)) {
      const want = low(m[1]); const score = p => { const l = low(p[1]); return l === want ? 3 : l.startsWith(want) || want.startsWith(l) ? 2 : l.includes(want) || want.includes(l) ? 1 : 0; };
      const best = c.pages.map(p => [p, score(p)]).filter(x => x[1]).sort((a, b) => b[1] - a[1])[0]; if (best) return { type: 'nav', view: best[0][0], label: best[0][1] };
    }
    return null;
  }
  const api = { match };
  root.FWBViews = root.FWBViews || {}; root.FWBViews.chatCmd = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
