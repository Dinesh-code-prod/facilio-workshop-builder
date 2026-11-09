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
