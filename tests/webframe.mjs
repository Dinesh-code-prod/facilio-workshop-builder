// Facilio tools in frames (roadmap E13): the allow-list rules (src/webframelogic.js), the page policy in src/template.html, and the menu in src/shell.js.
// Source-text checks only: no browser, so whether a real site renders inside the frame is NOT checked here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const W = createRequire(import.meta.url)('../src/webframelogic.js');
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

t('every listed site is allowed, Support Desk is first, ids are unique', () => {
  assert.equal(W.SITES[0].id, 'support-desk'); assert.equal(W.SITES[0].url, 'https://support-desk.facilio.run/#/homepage');
  assert.equal(new Set(W.SITES.map(s => s.id)).size, W.SITES.length);
  W.SITES.forEach(s => { assert.ok(W.isAllowed(s.url), s.id); assert.equal(W.siteById(s.id), s); assert.equal(new URL(s.url).hostname, s.framedHost); });
  assert.equal(W.siteById('nope'), null);
});
t('isAllowed: https only, exact host, no sign-in details, no odd schemes', () => {
  [['https://support-desk.facilio.run/#/homepage', true], ['https://www.facilio.com/pricing', true], ['https://facilio.run/', true],
   ['http://support-desk.facilio.run/', false], ['javascript:alert(1)', false], ['data:text/html,<b>x</b>', false], ['//support-desk.facilio.run/', false],
   ['https://support-desk.facilio.run.evil.com/', false], ['https://evil.com/?https://facilio.com/', false], ['https://notfacilio.com/', false], ['https://evilfacilio.com/', false],
   ['https://sub.facilio.com/', false], ['https://facilio.com.evil.io/', false], ['https://user:pw@facilio.com/', false], ['https://facilio.com@evil.com/', false],
   ['https://facilio.com:8443/', false], ['  https://facilio.com/', false], ['', false], [null, false], [undefined, false], [42, false]
  ].forEach(([u, ok]) => assert.equal(W.isAllowed(u), ok, String(u)));
});
t('frameSrcHosts lists the exact hosts, no wildcards, https only', () => {
  const h = W.frameSrcHosts();
  assert.deepEqual(h, ['https://support-desk.facilio.run', 'https://meteor.facilio.work', 'https://comet.facilio.work', 'https://facilio.com', 'https://www.facilio.com', 'https://facilio.run']);
  h.forEach(x => { assert.ok(!/[*]/.test(x), x); assert.match(x, /^https:\/\/[a-z.-]+$/); });
});
t('the page policy lists exactly those hosts in frame-src and child-src, and keeps the other directives', () => {
  const csp = (read('src/template.html').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1]; assert.ok(csp, 'policy found');
  const dir = Object.fromEntries(csp.split(';').map(s => s.trim()).filter(Boolean).map(s => { const [k, ...v] = s.split(/\s+/); return [k, v]; }));
  const want = W.frameSrcHosts().slice().sort();
  ['frame-src', 'child-src'].forEach(k => { assert.deepEqual(dir[k].filter(x => /^https?:/.test(x)).sort(), want, k); assert.deepEqual(dir[k].filter(x => !/^https?:/.test(x)), ["'self'", 'blob:'], k); });
  assert.deepEqual(dir['object-src'], ["'none'"]); assert.deepEqual(dir['base-uri'], ["'none'"]); assert.deepEqual(dir['form-action'], ["'self'"]);
  assert.deepEqual(dir['script-src'], ["'self'", "'wasm-unsafe-eval'"]); assert.deepEqual(dir['default-src'], ["'self'"]);
});
t('the menu: Inbox and Tickets are out of NAV, Support Desk and Facilio tools are in', () => {
  const src = read('src/shell.js'); const nav = src.slice(src.indexOf('const NAV = ['), src.indexOf('V.NAV_ALIAS'));
  assert.ok(!/\['inbox'/.test(nav) && !/\['tickets'/.test(nav), 'inbox and tickets are not menu entries');
  assert.ok(!nav.includes("g: 'Support'"), 'the Support group is gone from the menu');assert.match(nav, /g: 'Help'[^\n]*\['webframe', 'Facilio tools'\]/);
  assert.match(src, /V\.NAV_ALIAS = \{/); assert.match(src, /'Support & Tickets': 'Support & AI'/);
  assert.match(read('src/tickets.js'), /V\.tickets\s*=/); assert.match(read('src/inbox.js'), /V\.inbox\s*=/, 'the old pages still exist, so old links resolve');
});
t('the page and styles are built in, and the frame has the safe attributes', () => {
  const b = read('build.mjs'); assert.ok(b.indexOf("'src/webframelogic.js'") < b.indexOf("'src/webframe.js'")); assert.match(b, /r\('src\/webframe\.css'\)/);
  const js = read('src/webframe.js');
  ['referrerpolicy="no-referrer"', 'sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"', 'allow=""', 'target="_blank" rel="noopener noreferrer"', 'Open in a new tab'].forEach(s => assert.ok(js.includes(s), s));
  assert.match(js, /HELP_MS = 6000/); assert.match(js, /does not allow being shown inside Delivery Studio/); assert.match(read('src/uistate.js'), /'webframe', 'supportdesk'/);
});
t('Meteor and Comet can be docked beside a page; sites that refuse framing cannot, and the allow-list is unchanged', () => {
  assert.deepEqual(W.SITES.filter(x => x.framed === false).map(x => x.id), ['support-desk', 'facilio', 'run']);
  assert.deepEqual(W.SITES.filter(x => x.framed !== false).map(x => x.id), ['meteor', 'comet']);
  const js = read('src/webframe.js'); assert.ok(js.includes('return x && x.framed !== false && W.isAllowed(x.url) ? x : null'), 'dock only for sites that allow framing');
  ['ACT.wfDock =', 'ACT.wfDockClose', 'class="wf-dock-frame" title="${esc(x.title)}" src="${esc(x.url)}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" allow=""', 'This site does not open inside Delivery Studio', 'data-act="wfWin"', "'popup=yes,width=' + w + ',height=' + sh + ',left=' + (sw - w) + ',top=0,noopener,noreferrer'", "'fds_tool_' + x.id", 'if (!x || !W.isAllowed(x.url)) return;', 'ACT.wfBig'].forEach(x => assert.ok(js.includes(x), x));
  const mk = read('src/mockup.js'); assert.ok(mk.includes("V.wfDockButton('meteor'") && !mk.includes("V.wfDockButton('comet')"), 'Mockup has Open Meteor here and no Comet'); const tr = read('src/guideslist.js'); assert.ok(tr.includes("V.wfDockButton('comet')") && tr.includes('data-act="mkComet"'), 'Training has Open Comet and Open Comet here');
});
console.log(n + ' checks passed');
