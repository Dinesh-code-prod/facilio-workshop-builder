// The Claude helper (work/server/_helper.mjs, wiring in _jobsapi.mjs, api.mjs, src/helper.js): is a Claude running, who may take a personal job, and what a person added to a project is told.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { FRESH_MIN, PERSONAL, canTake, status, words, addedMessage, cleanSkills, cleanSetup } from '../work/server/_helper.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const now = Date.parse('2026-11-09T10:00:00Z'); const at = m => new Date(now - m * 60000).toISOString();
t('a project is covered when any team member checked in within 15 minutes', () => {
  const s = status([{ email: 'sam@facilio.com', name: 'sam.k@facilio.com', at: at(4) }, { email: 'kim@facilio.com', name: 'Kim', at: at(300) }, { email: 'lee@facilio.com', name: 'Lee', at: '' }], now);
  assert.equal(s.state, 'on'); assert.equal(s.lastBy, 'Sam K'); assert.equal(s.minutesAgo, 4); assert.equal(s.people.length, 3); assert.equal(FRESH_MIN, 15);
});
t('after 15 minutes without a check-in it is off, and with none ever it says never', () => { assert.equal(status([{ email: 'a@b.c', at: at(16) }], now).state, 'off'); assert.equal(status([{ email: 'a@b.c', at: at(15) }], now).state, 'on'); assert.equal(status([{ email: 'a@b.c', at: '' }], now).state, 'never'); assert.equal(status([], now).state, 'never'); });
t('the words tell what it means in plain language', () => {
  assert.match(words(status([{ email: 'a@b.c', name: 'Sam', at: at(1) }], now)).line, /A Claude is running for this project \(Sam, just now\)/); assert.match(words(status([{ email: 'a@b.c', at: at(45) }], now)).line, /No Claude has checked in for 45 minutes/);
  assert.match(words(status([{ email: 'a@b.c', at: at(300) }], now)).line, /for 5 hours/); assert.match(words(status([], now)).line, /ever checked in/); assert.equal(words(status([], now)).chip, 'Claude helper off');
});
t('skills a Claude reports are cleaned to ids', () => { assert.deepEqual(cleanSkills([' Video-To-User-Guide ', 'x', 'bad id!', 'ftr-generator', 'ftr-generator', 5, null]), ['video-to-user-guide', 'ftr-generator']); assert.deepEqual(cleanSkills('no'), []); });
t('a job that reads a person’s own mailbox or drive is taken only by that person’s Claude', () => {
  for (const k of ['fetch_mail', 'pull_msa', 'pull_brd', 'pull_transcript', 'check_sent']) { assert.ok(PERSONAL.has(k)); assert.equal(canTake(k, 'Sam@Facilio.com', 'sam@facilio.com'), true); assert.equal(canTake(k, 'sam@facilio.com', 'kim@facilio.com'), false); }
  assert.equal(canTake('make_guide', 'sam@facilio.com', 'kim@facilio.com'), true); assert.equal(canTake('chat', 'sam@facilio.com', 'kim@facilio.com'), true); assert.equal(canTake('fetch_mail', '', 'kim@facilio.com'), true);
});
t('a person added to a project is told what it is, what Claude does, what to do first, with the project link and three more buttons', () => {
  const m = addedMessage({ id: 'p1', name: 'Rollout', customer: 'Binghatti' }, { role: 'editor', email: 'kim@facilio.com' }, 'sam.k@facilio.com', 'https://x.facilio.work/');
  assert.equal(m.title, 'PROJECT · Rollout'); assert.match(m.text, /^\*\*You have been added to Rollout as an editor\*\*\nAdded by Sam K\. Delivery Studio is where/); assert.match(m.text, /Claude drafts; people decide and approve\./); assert.match(m.text, /\*\*START HERE \(4\)\*\*\n- Open the project/); assert.match(m.text, /\*\*What to do:\*\* Do the first two steps today\./);
  assert.deepEqual(m.actions.map(a => a.title), ['Open the project', 'Team Guide', 'Set up Claude', 'My tasks']); assert.deepEqual(m.actions.slice(0, 3).map(a => a.url), ['https://x.facilio.work/#/p/p1', 'https://x.facilio.work/#/p/p1/teamhelp', 'https://x.facilio.work/#/p/p1/claudesetup']); assert.deepEqual(m.actions[3].data, { tool: 'my_tasks' }, 'My tasks answers in Teams');
  assert.ok(m.facts.some(f => f.title === 'Project' && f.value === 'Rollout · Binghatti') && m.facts.some(f => f.title === 'Added by' && f.value === 'Sam K'));
});
t('the server records each check-in, shows the status to the team, hides personal jobs from other Claudes, and tells a person they were added', () => {
  const jobs = fs.readFileSync('work/server/_jobsapi.mjs', 'utf8'), api = fs.readFileSync('work/server/api.mjs', 'utf8');
  assert.match(jobs, /const beat = async \(s, b\) =>/); assert.match(jobs, /async jobs_list_all\(s, b\) \{ await beat\(s, b\);/); assert.match(jobs, /async jobs_claim\(s, b\) \{ await beat\(s, b\);/); assert.match(jobs, /canTake\(j0\.kind, j0\.requestedBy, s\.email\)/); assert.match(jobs, /route\('GET', '\/api\/projects\/:id\/helper'/);
  assert.match(api, /await memberAddedNotice\(project, m, s\);/); assert.match(api, /addedMessage\(project, m, actor\.name \|\| actor\.email, TW_BASE\)/);
});
t('the assistant (not the top bar) shows the light and Ask Claude, and a waiting request says so when no Claude is running', () => {
  const a = fs.readFileSync('src/assistant.js', 'utf8'); assert.match(a, /V\.helper \? V\.helper\.chip\(\)/); assert.match(a, /class="btn sm ask-claude"/); assert.doesNotMatch(fs.readFileSync('src/shell.js', 'utf8'), /helper\.chip\(\)|ask-claude/); assert.match(a, /Claude is paused to save usage, so it waits/); assert.match(a, /act: 'helperOpen'/); assert.match(fs.readFileSync('build.mjs', 'utf8'), /'src\/helper\.js'/);
});
console.log(n + ' Claude helper checks passed');
{ // every Claude button opens the Assistant with a live request card; the chat bubbles say who is who (src/assistant.js, src/ui.css)
  const a = fs.readFileSync('src/assistant.js', 'utf8'), css = fs.readFileSync('src/ui.css', 'utf8'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('a request sent by any Claude button opens the Assistant at once: the shared post is wrapped, the card shows what was asked, the wait in seconds, and the no-Claude warning with buttons', () => {
    // the shared post in src/kickoff.js opens it (also for calls made inside kickoff.js and for a request Claude already has), and the two buttons that post directly call it too
    const kick = fs.readFileSync('src/kickoff.js', 'utf8'); assert.match(a, /V\.asstRequested = \(\) => \{ if \(!team\(\)\) return;/); assert.match(kick, /const post = async \(path, body\) => \{[^\n]*path === '\/jobs' && root\.FWBViews\.asstRequested/);
    assert.match(fs.readFileSync('src/introhub.js', 'utf8'), /kind: 'make_from_reference'[^\n]*V\.asstRequested\(\)/); assert.match(fs.readFileSync('src/msadocs.js', 'utf8'), /kind: 'pull_msa', note \}\); if \(V\.asstRequested\) V\.asstRequested\(\)/); assert.match(a, /String\(j\.note \|\| ''\)\.trim\(\) \? ': .{1,8}u201c/); assert.match(a, /Math\.floor\(sec \/ 15\) \* 15 \+ ' seconds'/);
    assert.match(a, /Claude is paused to save usage, so this request waits[^]*act: 'helperOpen'[^]*act: 'helperCopy'/); assert.match(a, /function tick\(\)[^]*as-live/); assert.match(a, /morph\(bodyEl, body\)/); assert.doesNotMatch(a, /open\.length \? 15e3/);   // the waiting time ticks live; only changed sections redraw (a full redraw every 15 s flickered)
  });
  u('your messages are a solid blue bubble, Claude\u2019s a pale grey-blue one, a teammate\u2019s white with a blue edge', () => { assert.match(css, /\.ki-row\.you \.ki-bub[^{]*\{ background: #0024D6 !important;[^}]*color: #fff !important/); assert.match(css, /\.ki-row:not\(\.you\):not\(\.sys\):not\(\.bad\):not\(\.other\) \.ki-bub[^{]*\{ background: #EDF5FF !important/); assert.match(css, /\.ki-row\.other \.ki-bub[^{]*\{ background: #fff !important; border: 1px solid #0024D6/); });
}
{ const css = fs.readFileSync('src/ui.css', 'utf8'); // the date and time of a chat message sit under it in the normal flow, never on top of the text or the buttons
  assert.match(css, /body #asst \.ki-time:not\(#_\):not\(#__\):not\(#___\) \{ position: static !important; display: block !important;/); console.log('  ok  the date and time of each chat message sit under it, not over the text or the buttons'); }
{ const a = fs.readFileSync('src/assistant.js', 'utf8'), css = fs.readFileSync('src/ui.css', 'utf8'); // Claude's side is green, its two buttons are a matching pair, and a waiting request says what is happening and for how long
  assert.match(a, /Please wait\. Your request has been sent to Claude/); assert.match(a, /etaText\(j\.size === 'heavy' \? 'heavy' : 'small'\)/); assert.match(a, /Claude has started and is analysing your request/);
  assert.match(css, /ki-row:not\(\.you\):not\(\.sys\):not\(\.bad\):not\(\.other\) \.ki-bub[^{]*\{ background: #F1FFF0 !important;[^}]*border-left: 4px solid #49b83f/); assert.match(css, /\.ki-acts \.btn\.primary[^{]*\{ background: #49b83f !important/); assert.match(css, /\.ki-acts \.btn:not\(#_\)[^{]*\{[^}]*border: 1\.5px solid #49b83f/);
  console.log('  ok  Claude\u2019s side is green with a matching pair of buttons, and a waiting request says it was sent, that Claude is analysing, and how long it takes'); }
{ const H = await import('../work/server/_helper.mjs'); const api = fs.readFileSync('work/server/api.mjs', 'utf8'), hj = fs.readFileSync('src/helper.js', 'utf8'), sh = fs.readFileSync('src/shell.js', 'utf8'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  const now2 = Date.parse('2026-11-09T10:00:00Z'); const off = H.status([{ email: 'a@b.c', name: 'Sam', at: new Date(now2 - 300 * 60000).toISOString() }], now2);
  u('requests that waited a day with no Claude checked in are flagged; fresh ones, or a running Claude, are not', () => {
    const old = { status: 'waiting', requestedAt: new Date(now2 - 30 * 36e5).toISOString() }, fresh = { status: 'waiting', requestedAt: new Date(now2 - 2 * 36e5).toISOString() };
    assert.deepEqual(H.stuckJobs([old, fresh, { status: 'done', requestedAt: old.requestedAt }], off, now2), { n: 2, hours: 30 }); assert.equal(H.stuckJobs([fresh], off, now2), null); assert.equal(H.stuckJobs([old], { state: 'on' }, now2), null); assert.equal(H.stuckJobs([], off, now2), null);
  });
  u('the owners\u2019 alert says how many, how long, why, and what to do, with two buttons', () => {
    const m = H.helperAlert({ id: 'p1', name: 'Rollout', customer: 'Binghatti' }, { n: 3, hours: 52 }, off, 'https://x.facilio.work/'); assert.match(m.text, /^\*\*3 requests have waited 2 days for Claude\*\*/); assert.ok(m.facts.some(f => f.title === 'Project' && f.value === 'Rollout \u00b7 Binghatti')); assert.match(m.text, /last Claude check-in was 5 hours ago \(Sam\)/); assert.match(m.text, /\*\*What to do:\*\*/);
    assert.deepEqual(m.actions.map(a => a.title), ['Open the project', 'Set up Claude']); assert.ok(m.facts.some(f => f.title === 'Waiting requests' && f.value === '3'));
  });
  u('Phase 2 is wired: the setup banner, the window after a project is created, the owner alert once a day, and the guide says the task is needed', () => {
    assert.match(hj, /const needBanner = \(\) => !!\(show\(\) && st && !st\.mineAt && !skipped\(\)\)/); assert.match(hj, /created: async \(\) => \{ await refresh\(true\); ACT\.helperInfo\('new'\); \}/); assert.match(sh, /V\.helper\.banner\(\)/); assert.match(sh, /V\.helper\.created\(\)/);
    assert.match(api, /async function helperAlerts\(s, ps, today\)/); assert.match(api, /await helperAlerts\(s, ps, today\);/); assert.match(fs.readFileSync('src/claudesetup.js', 'utf8'), /Keep Claude helping: the scheduled task \(set it up once\)/); assert.match(fs.readFileSync('src/teamhelp.js', 'utf8'), /The Claude helper light, at the top of the Assistant \(the chat button, bottom right\), shows whether any teammate/);
  });
}
{ const h = fs.readFileSync('src/helper.js', 'utf8'), a = fs.readFileSync('src/assistant.js', 'utf8');
  assert.ok(h.includes('update_scheduled_task') && h.includes('>Activate Claude</button>') && h.includes('close Claude desktop') && a.includes("label: 'Activate Claude'") && !a.includes("label: 'Open Claude desktop'") && a.includes('Claude is paused to save usage'), 'Activate Claude wakes the queue task and the chat says Claude is paused'); console.log('  ok  Activate Claude: the prompt switches the queue task back on, and the chat and window say Claude is paused'); }
{ const H = await import('../work/server/_helper.mjs'); const u = (n, f) => { f(); console.log('  ok  ' + n); };
  u('Claude usage: only known fields come through, percentages are clamped, text is plain, and nothing usable gives null', () => {
    const c = H.cleanUsage({ plan: 'Pro', windows: [{ label: '5-hour limit', percentUsed: 3, resetsAt: '2026-11-09T22:19:59.533Z' }, { label: 'Weekly · all models', percentUsed: 159, resetsAt: 'tomorrow' }, { label: '<b>x</b>', percentUsed: 'abc' }, { percentUsed: 5 }], extra: { enabled: true, spent: '0.00', monthlyLimit: 40, currency: 'USD', percentUsed: 0 }, context: { tokensUsed: 883214 }, evil: 'x' });
    assert.equal(c.plan, 'Pro'); assert.equal(c.windows.length, 2); assert.equal(c.windows[1].percentUsed, 100); assert.equal(c.windows[1].resetsAt, ''); assert.equal(c.windows[0].resetsAt, '2026-11-09T22:19:59.533Z');
    assert.deepEqual(c.extra, { enabled: true, spent: 0, monthlyLimit: 40, currency: 'USD', percentUsed: 0 }); assert.ok(!('context' in c) && !('evil' in c));
    assert.ok(H.cleanUsage(JSON.stringify({ plan: 'Pro', windows: [{ label: '5-hour limit', percentUsed: 3, resetsAt: '2026-11-09T22:19:59.533Z' }] })), 'usage sent as JSON text is read too'); assert.equal(H.cleanUsage('not json'), null);
    assert.equal(H.cleanUsage({}), null); assert.equal(H.cleanUsage({ windows: [] }), null); assert.equal(H.cleanUsage(null), null); });
  u('a new usage snapshot is due when there is none or it is older than 2 minutes', () => { const now = Date.parse('2026-11-09T12:00:00Z'); assert.equal(H.usageDue(null, now), true); assert.equal(H.usageDue([], now), true); assert.equal(H.usageDue([{ at: '2026-11-09T11:59:00Z' }], now), false); assert.equal(H.usageDue([{ at: '2026-11-09T11:50:00Z' }, { at: '2026-11-09T09:00:00Z' }], now), true); });
  u('up to 12 Claude accounts on one Studio sign-in stay apart (same plan, different weekly reset), the same account is replaced, old ones drop', () => { const now = Date.parse('2026-11-09T12:00:00Z'); const mk = (i, at) => ({ plan: 'Pro', windows: [{ label: 'Weekly · all models', percentUsed: i, resetsAt: new Date(Date.parse('2026-11-13T04:00:00Z') + i * 3600000).toISOString() }], at }); let l = []; for (let i = 0; i < 14; i++) l = H.mergeUsage(l, mk(i, new Date(now - (14 - i) * 60000).toISOString()), now); assert.equal(l.length, 12); assert.equal(l[0].windows[0].percentUsed, 13); l = H.mergeUsage(l, mk(5, new Date(now).toISOString()), now); assert.equal(l.length, 12); assert.equal(l[0].windows[0].percentUsed, 5); assert.equal(l.filter(x => x.windows[0].percentUsed === 5).length, 1); const old = H.mergeUsage([mk(1, new Date(now - 40 * 3600000).toISOString())], mk(2, new Date(now).toISOString()), now); assert.equal(old.length, 1); });
  const j = fs.readFileSync('work/server/_jobsapi.mjs', 'utf8'), a = fs.readFileSync('work/server/api.mjs', 'utf8'), w = JSON.parse(fs.readFileSync('work/work.json', 'utf8')), asst = fs.readFileSync('src/assistant.js', 'utf8');
  u('usage rides on the existing project_jobs tool (no new tool), the list answer says when it is due, and the page shows it above the chat', () => {
    const pj = w.mcp.tools.find(t => t.name === 'project_jobs'); assert.ok(pj.input_schema.properties.action.enum.includes('usage') && pj.input_schema.properties.usage);
    assert.ok(a.includes("usage: 'jobs_usage'") && a.includes("route('GET', '/api/usage'") && j.includes('async jobs_usage(') && j.includes('usageDue: usageDue(snap && snap.accounts, Date.now())'));
    assert.ok(a.includes("route('POST', '/api/usage/refresh'") && j.includes('snap.want'), 'Update now asks the queue task for a fresh report');
    assert.ok(asst.includes('id="asUse"') && asst.includes('function paintUsage()') && asst.includes('usageNote()') && asst.includes('it does not report tokens per request')); });
}
{ // the one-time setup report (24 Nov 2026): only known items and values are kept, so a check-in can never store anything else
  assert.deepEqual(cleanSetup({ node: 'OK', git: 'not needed', studio: 'ok', m365: 'missing', toolbox: 'ok', skillsRepo: 'missing', watcher: 'ok', queue: 'ok', os: 'Mac', token: 'secret', path: 'C:/x' }), { node: 'ok', git: 'not needed', studio: 'ok', m365: 'missing', toolbox: 'ok', skillsRepo: 'missing', watcher: 'ok', queue: 'ok', os: 'mac' });
  assert.equal(cleanSetup({ node: 'yes', os: 'amiga' }), null); assert.equal(cleanSetup('x'), null); assert.equal(cleanSetup([]), null);
  console.log('  ok  the setup report keeps only known items (node, git, connectors, skills, the two tasks, Windows or Mac)'); }
