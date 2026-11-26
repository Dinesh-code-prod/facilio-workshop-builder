// Shot list for the Claude setup film (public/films/claude-setup.js; plan docs/plans/GUIDE-FILMS-CLAUDE-AND-TEAM-PLAN-2026-11-26.md): Help > Claude setup,
// each of its tabs, and the Start here checklist as it looks after Claude's setup report (every piece ready but Node.js, given to the page as the report
// it would receive). Run with tools/film-capture.mjs claude-setup on a copy of the local data.
const tab = k => async (p, h) => { await p.evaluate(k => { FWB.S.ui.clTab = k; FWBViews.render(); }, k); await h.settle(1800); };
const report = async (p, h) => { await p.evaluate(() => { const real = FWBViews.helper.state; FWBViews.helper.state = () => Object.assign({}, real() || {}, { setupAt: '2026-11-26T09:12:00Z',
  setup: { studio: 'ok', m365: 'ok', studioSkills: 'ok', toolbox: 'ok', skillsRepo: 'ok', watcher: 'missing', queue: 'ok', node: 'missing', git: 'ok', python: 'ok', os: 'windows' } }); FWBViews.render(); }); await h.settle(1500); };
export default { id: 'claude-setup', format: 'webp', quality: 30, shots: [
  { key: 'start', view: 'claudesetup', prep: tab('start'), pos: { 'start:tabs': '.main .tabs', 'start:film': '.fp-inline', 'start:h': '.main h1', 'start:t-connect': '[data-act="clTab"][data-v="connect"]', 'start:t-jobs': '[data-act="clTab"][data-v="jobs"]', 'start:t-skills': '[data-act="clTab"][data-v="skills"]', 'start:t-how': '[data-act="clTab"][data-v="how"]', 'start:nav': 'nav.sidebar .sb-item.active' } },
  { key: 'install', view: 'claudesetup', prep: tab('start'), top: [['text', 'Install these first', '.main'], 90], pos: { 'install:step': ['text', 'Install these first', '.main'], 'install:copy': ['text', 'Copy the setup message', '.main'] } },
  { key: 'steps', view: 'claudesetup', prep: tab('start'), top: [['text', 'Ask for access', '.main'], 120], pos: { 'steps:access': ['text', 'Ask for access', '.main'], 'steps:paste': ['text', 'Paste the setup message', '.main'], 'steps:check': ['text', 'Check your list', '.main'] } },
  { key: 'checklist', view: 'claudesetup', prep: async (p, h) => { await tab('start')(p, h); await report(p, h); }, top: [['text', 'Set up your computer', '.main'], 30], pos: { 'checklist:status': ['text', '8 of 10', '.main'], 'checklist:copy': ['text', 'Copy the setup message', '.main'] } },
  { key: 'checklist2', view: 'claudesetup', prep: async (p, h) => { await tab('start')(p, h); await report(p, h); }, top: [['text', 'Delivery Studio connector', '.main'], 140], pos: { 'checklist2:studio': ['text', 'Delivery Studio connector', '.main'], 'checklist2:watcher': ['text', 'Instant answers (watcher)', '.main'], 'checklist2:node': ['text', 'Node.js', '.main'] } },
  { key: 'connect', view: 'claudesetup', prep: tab('connect'), pos: { 'connect:h': '.main .tabs' } },
  { key: 'jobs', view: 'claudesetup', prep: tab('jobs'), pos: { 'jobs:h': '.main .tabs' } },
  { key: 'skills', view: 'claudesetup', prep: tab('skills'), pos: { 'skills:h': '.main .tabs' } },
  { key: 'how', view: 'claudesetup', prep: tab('how'), pos: { 'how:h': '.main .tabs' } },
  { key: 'stuck', view: 'claudesetup', prep: tab('start'), top: [['text', 'If something does not work', '.main'], 60], pos: { 'stuck:h': ['text', 'If something does not work', '.main'] } }] };
