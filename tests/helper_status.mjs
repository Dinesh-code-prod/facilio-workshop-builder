// The Claude helper (work/server/_helper.mjs, wiring in _jobsapi.mjs, api.mjs, src/helper.js): is a Claude running, who may take a personal job, and what a person added to a project is told.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { FRESH_MIN, PERSONAL, canTake, status, words, addedMessage } from '../work/server/_helper.mjs';
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
t('a job that reads a person’s own mailbox or drive is taken only by that person’s Claude', () => {
  for (const k of ['fetch_mail', 'pull_msa', 'pull_brd', 'pull_transcript', 'check_sent']) { assert.ok(PERSONAL.has(k)); assert.equal(canTake(k, 'Sam@Facilio.com', 'sam@facilio.com'), true); assert.equal(canTake(k, 'sam@facilio.com', 'kim@facilio.com'), false); }
  assert.equal(canTake('make_guide', 'sam@facilio.com', 'kim@facilio.com'), true); assert.equal(canTake('chat', 'sam@facilio.com', 'kim@facilio.com'), true); assert.equal(canTake('fetch_mail', '', 'kim@facilio.com'), true);
});
t('a person added to a project is told what it is, what Claude does, what to do first, with the project link and three more buttons', () => {
  const m = addedMessage({ id: 'p1', name: 'Rollout', customer: 'Binghatti' }, { role: 'editor', email: 'kim@facilio.com' }, 'sam.k@facilio.com', 'https://x.facilio.work/');
  assert.equal(m.title, 'PROJECT · Rollout'); assert.match(m.text, /^\*\*You have been added to a project by Sam K\.\*\*/); assert.match(m.text, /\*\*Project:\*\* Rollout · Binghatti/); assert.match(m.text, /\*\*Your role:\*\* an editor/); assert.match(m.text, /\*\*What Delivery Studio is:\*\*/); assert.match(m.text, /\*\*How Claude helps:\*\*/); assert.match(m.text, /\*\*What to do first:\*\* 1\)/);
  assert.deepEqual(m.actions.map(a => a.title), ['Open the project', 'Team Guide', 'Set up Claude', 'My tasks']); assert.deepEqual(m.actions.map(a => a.url), ['https://x.facilio.work/#/p/p1', 'https://x.facilio.work/#/p/p1/teamhelp', 'https://x.facilio.work/#/p/p1/claudesetup', 'https://x.facilio.work/#/p/p1/tasks']);
  assert.ok(m.facts.some(f => f.title === 'Customer' && f.value === 'Binghatti') && m.facts.some(f => f.title === 'Added by' && f.value === 'Sam K'));
});
t('the server records each check-in, shows the status to the team, hides personal jobs from other Claudes, and tells a person they were added', () => {
  const jobs = fs.readFileSync('work/server/_jobsapi.mjs', 'utf8'), api = fs.readFileSync('work/server/api.mjs', 'utf8');
  assert.match(jobs, /const beat = async s =>/); assert.match(jobs, /async jobs_list_all\(s, b\) \{ await beat\(s\);/); assert.match(jobs, /async jobs_claim\(s, b\) \{ await beat\(s\);/); assert.match(jobs, /canTake\(j0\.kind, j0\.requestedBy, s\.email\)/); assert.match(jobs, /route\('GET', '\/api\/projects\/:id\/helper'/);
  assert.match(api, /await memberAddedNotice\(project, m, s\);/); assert.match(api, /addedMessage\(project, m, actor\.name \|\| actor\.email, TW_BASE\)/);
});
t('the top bar shows the light, and a waiting request says so when no Claude is running', () => {
  assert.match(fs.readFileSync('src/shell.js', 'utf8'), /V\.helper \? V\.helper\.chip\(\)/); const a = fs.readFileSync('src/assistant.js', 'utf8'); assert.match(a, /No Claude is running right now, so it waits/); assert.match(a, /act: 'helperOpen'/); assert.match(fs.readFileSync('build.mjs', 'utf8'), /'src\/helper\.js'/);
});
console.log(n + ' Claude helper checks passed');
{ // every Claude button opens the Assistant with a live request card; the chat bubbles say who is who (src/assistant.js, src/ui.css)
  const a = fs.readFileSync('src/assistant.js', 'utf8'), css = fs.readFileSync('src/ui.css', 'utf8'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('a request sent by any Claude button opens the Assistant at once: the shared post is wrapped, the card shows what was asked, the wait in seconds, and the no-Claude warning with buttons', () => {
    assert.match(a, /V\.asstRequested = \(\) =>/); assert.match(a, /j\.post = async function \(path, body\)[^]*path === '\/jobs' && body && body\.kind && team\(\)/); assert.match(a, /String\(j\.note \|\| ''\)\.trim\(\) \? ': .{1,8}u201c/); assert.match(a, /Math\.floor\(sec \/ 15\) \* 15 \+ ' seconds'/);
    assert.match(a, /No Claude is running right now, so this request waits[^]*act: 'helperOpen'[^]*act: 'helperCopy'/); assert.match(a, /Date\.now\(\) \/ \(open\.length \? 15e3 : 6e4\)/);
  });
  u('your messages are a solid blue bubble, Claude\u2019s a pale grey-blue one, a teammate\u2019s white with a blue edge', () => { assert.match(css, /\.ki-row\.you \.ki-bub[^{]*\{ background: #1570EF !important;[^}]*color: #fff !important/); assert.match(css, /\.ki-row:not\(\.you\):not\(\.sys\):not\(\.bad\):not\(\.other\) \.ki-bub[^{]*\{ background: #EEF2F8 !important/); assert.match(css, /\.ki-row\.other \.ki-bub[^{]*\{ background: #fff !important; border: 1px solid #1570EF/); });
}
{ const css = fs.readFileSync('src/ui.css', 'utf8'); // the date and time of a chat message sit under it in the normal flow, never on top of the text or the buttons
  assert.match(css, /body #asst \.ki-time:not\(#_\):not\(#__\):not\(#___\) \{ position: static !important; display: block !important;/); console.log('  ok  the date and time of each chat message sit under it, not over the text or the buttons'); }
{ const a = fs.readFileSync('src/assistant.js', 'utf8'), css = fs.readFileSync('src/ui.css', 'utf8'); // Claude's side is green, its two buttons are a matching pair, and a waiting request says what is happening and for how long
  assert.match(a, /Please wait\. Your request has been sent to Claude/); assert.match(a, /etaText\(j\.size === 'heavy' \? 'heavy' : 'small'\)/); assert.match(a, /Claude has started and is analysing your request/);
  assert.match(css, /ki-row:not\(\.you\):not\(\.sys\):not\(\.bad\):not\(\.other\) \.ki-bub[^{]*\{ background: #E8F7EE !important;[^}]*border-left: 4px solid #16A34A/); assert.match(css, /\.ki-acts \.btn\.primary[^{]*\{ background: #16A34A !important/); assert.match(css, /\.ki-acts \.btn:not\(#_\)[^{]*\{[^}]*border: 1\.5px solid #16A34A/);
  console.log('  ok  Claude\u2019s side is green with a matching pair of buttons, and a waiting request says it was sent, that Claude is analysing, and how long it takes'); }
{ const H = await import('../work/server/_helper.mjs'); const api = fs.readFileSync('work/server/api.mjs', 'utf8'), hj = fs.readFileSync('src/helper.js', 'utf8'), sh = fs.readFileSync('src/shell.js', 'utf8'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  const now2 = Date.parse('2026-11-09T10:00:00Z'); const off = H.status([{ email: 'a@b.c', name: 'Sam', at: new Date(now2 - 300 * 60000).toISOString() }], now2);
  u('requests that waited a day with no Claude checked in are flagged; fresh ones, or a running Claude, are not', () => {
    const old = { status: 'waiting', requestedAt: new Date(now2 - 30 * 36e5).toISOString() }, fresh = { status: 'waiting', requestedAt: new Date(now2 - 2 * 36e5).toISOString() };
    assert.deepEqual(H.stuckJobs([old, fresh, { status: 'done', requestedAt: old.requestedAt }], off, now2), { n: 2, hours: 30 }); assert.equal(H.stuckJobs([fresh], off, now2), null); assert.equal(H.stuckJobs([old], { state: 'on' }, now2), null); assert.equal(H.stuckJobs([], off, now2), null);
  });
  u('the owners\u2019 alert says how many, how long, why, and what to do, with two buttons', () => {
    const m = H.helperAlert({ id: 'p1', name: 'Rollout', customer: 'Binghatti' }, { n: 3, hours: 52 }, off, 'https://x.facilio.work/'); assert.match(m.text, /^\*\*3 requests have been waiting for Claude for 2 days\.\*\*/); assert.match(m.text, /\*\*Project:\*\* Rollout \u00b7 Binghatti/); assert.match(m.text, /last Claude check-in was 5 hours ago \(Sam\)/); assert.match(m.text, /\*\*What to do:\*\*/);
    assert.deepEqual(m.actions.map(a => a.title), ['Open the project', 'Set up Claude']); assert.ok(m.facts.some(f => f.title === 'Waiting requests' && f.value === '3'));
  });
  u('Phase 2 is wired: the setup banner, the window after a project is created, the owner alert once a day, and the guide says the task is needed', () => {
    assert.match(hj, /const needBanner = \(\) => !!\(show\(\) && st && !st\.mineAt && !skipped\(\)\)/); assert.match(hj, /created: async \(\) => \{ await refresh\(true\); ACT\.helperInfo\('new'\); \}/); assert.match(sh, /V\.helper\.banner\(\)/); assert.match(sh, /V\.helper\.created\(\)/);
    assert.match(api, /async function helperAlerts\(s, ps, today\)/); assert.match(api, /await helperAlerts\(s, ps, today\);/); assert.match(fs.readFileSync('src/claudesetup.js', 'utf8'), /Keep Claude helping: the scheduled task \(set it up once\)/); assert.match(fs.readFileSync('src/teamhelp.js', 'utf8'), /The Claude helper light in the top bar shows whether any teammate/);
  });
}
