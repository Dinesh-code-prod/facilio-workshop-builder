// The team menu shows only the tabs built in the Part E revamp (EXPOSED in src/shell.js). This checks the list against the real menu source:
// every exposed id is a real menu entry, the filter is wired into navBase, customers are not filtered, and the start view does not land on a hidden tab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/shell.js', import.meta.url), 'utf8'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const exposed = [...(/const EXPOSED = new Set\(\[([^\]]*)\]\)/.exec(src) || [, ''])[1].matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]);
const navBlock = src.slice(src.indexOf('const NAV = ['), src.indexOf('const CUSTOMER_NAV')); const navIds = [...navBlock.matchAll(/\['([a-z0-9_]+)', (?:'[^']+'|"[^"]+")\]/g)].map(m => m[1]);
t('the exposed list is found and has no duplicates', () => { assert.ok(exposed.length >= 6, 'found ' + exposed.length); assert.equal(new Set(exposed).size, exposed.length); });
t('every exposed id is a real entry of the team menu', () => { for (const id of exposed) assert.ok(navIds.includes(id), id + ' is not in NAV'); });
t('the revamp tabs are exposed and unfinished tabs are hidden', () => {
  for (const id of ['kickoff', 'plan', 'projdash', 'rsplan', 'rstrans', 'rschecks']) assert.ok(exposed.includes(id), id); assert.ok(navIds.includes('workshop') && exposed.includes('workshop'), 'the Workshop room (live call assistant, question list) is in the menu under Requirement sessions');
  for (const id of ['inbox', 'aiwork']) assert.ok(!exposed.includes(id), id + ' should stay hidden for now'); for (const id of ['explore', 'seefacilio', 'dashboards', 'resources', 'whatsnew']) assert.ok(exposed.includes(id) && navIds.includes(id), id + ' is shown in its stage (8 Nov 2026)'); assert.ok(exposed.includes('demokit') && navIds.includes('demokit'), 'Facilio Screens is back in the Customer View group (8 Nov 2026)'); for (const id of ['supportdesk', 'overview', 'msaflow', 'showcase', 'agents', 'agentdata', 'agentrules', 'agenttest', 'agentguide', 'vstudio', 'transition']) assert.ok(!navIds.includes(id), id + ' duplicates another tab and is out of the menu'); for (const id of ['tasks', 'transfers', 'roles', 'notifications', 'cfginputs', 'custintro', 'portal', 'templates', 'workspace', 'webframe', 'privacy', 'claudesetup', 'teamhelp']) assert.ok(exposed.includes(id), id + ' is shown');
  assert.ok(navIds.length - exposed.length >= 1, 'Deliverables & AI stays hidden');
});
t('navBase applies the filter to the team menu only, and the start view avoids a hidden tab', () => {
  assert.match(src, /V\[id\] && \(cust \|\| tabOn\(id\)\)/); assert.match(src, /tabOn\('overview'\) \? 'overview' : 'projdash'/); assert.ok(exposed.includes('projdash'));
  assert.match(src, /alltabs=1/); assert.match(src, /const HIDE_UNBUILT_TABS = true;/);
});
console.log(n + ' menu exposure checks passed');
