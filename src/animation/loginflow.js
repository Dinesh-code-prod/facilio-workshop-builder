/* Sign-in page, left side (team view): "How Delivery Studio helps", a six-chapter explainer drawn in SVG and sequenced with ONE GSAP timeline (vendor/gsap.min.js, GSAP's free standard licence).
   It replaces the earlier hand-coded canvas story for the team sign-in (the customer invite page still uses the city story in loginstory.js).
   Chapters: 1 everything lands in one project and AI drafts the deliverables, 2 AI reads the sources and proposes, 3 people confirm and the customer signs off online,
   4 build and test stay linked to each requirement, 5 go live and hand over, 6 the result. Names and numbers are illustrative.
   Motion rules (motion-design skill): corporate personality, one signature ease (power3.out in, power2.inOut travel), entrances longer than exits, one hero per chapter,
   ambient life (orbiting sparkles, pulses) under the primary action. Plays once per page view and holds the last picture; Replay restarts it; reduced motion shows the last picture.
   Without GSAP (the file did not load) the last picture is shown still. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return;
  const doc = root.document; const old = V.isoLogin;
  const RM = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // [start second, caption title, caption text, window title, stage-rail position at the end]
  const CH = [
    [0, 'One studio for the whole project', 'Emails, files, recordings and contracts come into one place. AI drafts first, your team reviews, so projects move faster with nothing lost.', 'Delivery Studio', .5],
    [4.8, 'AI reads and proposes', 'Transcripts, the contract and the organisation package are read together. Requirements, settings and open questions come back as drafts.', 'AI drafts', 1.5],
    [9.6, 'People decide, the customer signs off', 'Your team confirms each requirement. The BRD builds from them and the customer approves it online.', 'Requirements and BRD', 3],
    [14.4, 'Build and test, linked to every requirement', 'Configuration and UAT test cases stay tied to the requirement they prove. A failed test is fixed on the same record.', 'Configuration and UAT', 4],
    [19, 'Go live, then hand over', 'Readiness, hypercare and the handover pack close the project with nothing lost.', 'Go-live and handover', 7],
    [23.6, 'Faster, with nothing lost', 'One record replaces the chasing across email, sheets and chats. People stay in control of every approval.', 'The result', 7]
  ];
  const END = 28, RAIL = ['Kick-off', 'Workshops', 'Requirements', 'BRD', 'Build & test', 'Go-live', 'Hypercare', 'Handover'];
  const F = 'font-family="Geist, Inter, system-ui, sans-serif"';
  const T = (s, x, y, sz, w, col, an, cls) => `<text${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" font-size="${sz}" font-weight="${w}" fill="${col}"${an ? ` text-anchor="${an}"` : ''} ${F}>${esc(s)}</text>`;
  const R = (x, y, w, h, r, fill, stroke, cls) => `<rect${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
  const G = (x, y, cls, inner) => `<g class="${cls}" data-x="${x}" data-y="${y}">${inner}</g>`;
  const LINE = 'rgba(0,0,0,.09)', INK = '#262626', MUTE = '#686868', BLUE = '#1570EF', PINK = '#E5197F', NAVY = '#1D1A5E', GREEN = '#16a34a';
  const ICON = {
    doc: '<path d="M3 1h7l3 3v11H3zM6 8h4M6 11h4" fill="none" stroke="#1570EF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    rec: '<path d="M2 8v0M5 5v6M8 2v12M11 5v6M14 7v2" fill="none" stroke="#1570EF" stroke-width="1.6" stroke-linecap="round"/>',
    org: '<path d="M1 6h5v9H1zM7 2h8v13H7zM10 6h2M10 9h2" fill="none" stroke="#1570EF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    sheet: '<path d="M2 2h12v12H2zM2 6h12M2 10h12M7 2v12" fill="none" stroke="#1570EF" stroke-width="1.4" stroke-linejoin="round"/>',
    vid: '<path d="M1 3h10v10H1zM11 7l4-3v8l-4-3" fill="none" stroke="#1570EF" stroke-width="1.5" stroke-linejoin="round"/>'
  };
  const tick = (cls, cx, cy, r) => `<g class="${cls}" data-x="${cx}" data-y="${cy}"><circle r="${r}" fill="${GREEN}"/><path d="M${-r * .45} 0l${r * .3} ${r * .35}l${r * .65} ${-r * .7}" fill="none" stroke="#fff" stroke-width="${r * .26}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const PEOPLE = [['MS', '#1570EF'], ['DR', '#0e9384'], ['PN', PINK]];

  function chapters() {
    // 1: inputs fly into one project, AI drafts the deliverables, people review
    const IN = [['Emails', 'doc'], ['Meeting audio', 'rec'], ['Contract', 'doc'], ['Spreadsheets', 'sheet'], ['Site videos', 'vid']], POS = [[24, 66], [60, 104], [26, 142], [64, 180], [28, 218]];
    const OUT = [['BRD', 'From requirements'], ['UAT plan', 'Linked test cases'], ['Configuration', 'Documented set-up'], ['User guides', 'One per role'], ['Handover pack', 'Nothing lost']];
    const CHIPS = ['Requirements', 'Risks', 'Tasks', 'Documents'];
    const c1 = T('Scattered today', 24, 58, 9.5, 600, '#a3a3a3', '', 'c1l') + T('One project', 342, 58, 9.5, 600, '#a3a3a3', 'middle', 'c1l') + T('Ready for review', 486, 58, 9.5, 600, '#a3a3a3', '', 'c1l')
      + IN.map(([t, k], i) => G(POS[i][0], POS[i][1], 'c1in', R(0, 0, 128, 28, 9, '#f7f7f7', LINE) + `<g transform="translate(8 6)">${ICON[k]}</g>` + T(t, 30, 18, 10.5, 600, INK))).join('')
      + G(244, 92, 'c1hub', R(0, 0, 196, 124, 16, '#fff', 'rgba(21,112,239,.4)') + T('Delivery Studio', 16, 24, 12.5, 700, NAVY)
        + `<g class="c1ai" transform="translate(172 20)"><g class="c1orb"><circle cx="0" cy="-19" r="2.4" fill="${PINK}"/><circle cx="16" cy="9" r="2.4" fill="${BLUE}"/><circle cx="-16" cy="9" r="2.4" fill="${PINK}"/></g><circle r="11" fill="${PINK}"/>${T('AI', 0, 3, 8.5, 700, '#fff', 'middle')}</g>`
        + '<line class="c1ln" x1="54" y1="51" x2="142" y2="51" stroke="rgba(21,112,239,.4)" stroke-width="1.3"/><line class="c1ln" x1="54" y1="51" x2="54" y2="81" stroke="rgba(21,112,239,.4)" stroke-width="1.3"/><line class="c1ln" x1="142" y1="51" x2="142" y2="81" stroke="rgba(21,112,239,.4)" stroke-width="1.3"/>'
        + CHIPS.map((l, k) => `<g class="c1ch" transform="translate(${14 + (k % 2) * 88} ${40 + Math.floor(k / 2) * 30})">${R(0, 0, 80, 22, 8, '#f7f7f7', LINE)}${T(l, 40, 14.5, 9.5, 600, INK, 'middle')}</g>`).join('')
        + T('AI reads, links and drafts', 98, 112, 9.5, 600, MUTE, 'middle'))
      + OUT.map(([t, s], i) => G(482, 66 + i * 38, 'c1out', R(0, 0, 196, 31, 10, '#fff', LINE) + T(t, 12, 13, 10.5, 600, INK) + T(s, 12, 24.5, 8.5, 500, MUTE)
        + `<g class="c1dr" transform="translate(126 7)">${R(0, 0, 60, 17, 8.5, 'rgba(21,112,239,.1)')}${T('AI draft', 30, 12, 9.5, 600, '#0e4a9a', 'middle')}</g><g class="c1rv" transform="translate(126 7)">${R(0, 0, 60, 17, 8.5, 'rgba(22,163,74,.13)')}${T('Reviewed', 30, 12, 9.5, 600, '#0b5a0b', 'middle')}</g><circle class="c1rg" cx="156" cy="15" r="9" fill="none" stroke="${GREEN}" stroke-width="1.6"/>`)).join('')
      + G(24, 168, 'c1st', T('5 → 1', 0, 0, 34, 700, NAVY) + T('places to look become', 0, 22, 10.5, 500, MUTE) + T('one project record', 0, 37, 10.5, 600, INK))
      + T('People review and approve every draft. Nothing goes out on its own.', 350, 272, 10.5, 600, MUTE, 'middle', 'c1note');
    // 2: three sources, the AI core, three drafts
    const SRC = [['Workshop transcript', '58 min, 3 speakers'], ['MSA and scope', '24 pages'], ['Organisation package', 'Modules, flows, roles']], DR = [['Requirements', '14 proposed'], ['Project settings', 'Name, dates, phase'], ['Open questions', '6 for the customer']];
    const c2 = SRC.map(([t, s], i) => G(24, 66 + i * 64, 'c2s', R(0, 0, 158, 46, 12, '#fff', LINE) + R(10, 11, 24, 24, 7, 'rgba(21,112,239,.1)') + T(t, 44, 21, 10.5, 600, INK) + T(s, 44, 34, 8.5, 500, MUTE))).join('')
      + [0, 1, 2].map(i => `<path class="c2p" d="M182 ${89 + i * 64} C 250 ${89 + i * 64}, 250 154, 304 154" fill="none" stroke="rgba(21,112,239,.35)" stroke-width="1.6"/><circle class="c2tk" r="3.2" fill="${BLUE}"/>`).join('')
      + `<g class="c2core" data-x="338" data-y="154"><circle class="c2r" r="34" fill="none" stroke="${PINK}" stroke-width="1.4"/><circle class="c2r" r="34" fill="none" stroke="${BLUE}" stroke-width="1.4"/><circle r="30" fill="${PINK}"/>${T('AI', 0, 6, 17, 700, '#fff', 'middle')}</g>`
      + [0, 1, 2].map(i => `<path class="c2q" d="M372 154 C 424 154, 424 ${89 + i * 64}, 480 ${89 + i * 64}" fill="none" stroke="rgba(229,25,127,.35)" stroke-width="1.6"/><circle class="c2tk2" r="3.2" fill="${PINK}"/>`).join('')
      + DR.map(([t, s], i) => G(480, 66 + i * 64, 'c2d', R(0, 0, 196, 46, 12, '#fff', LINE) + T(t, 14, 21, 11, 700, INK) + T(s, 14, 35, 9, 500, MUTE) + `<g transform="translate(120 14)">${R(0, 0, 66, 17, 8.5, 'rgba(21,112,239,.1)')}${T('AI draft', 33, 12, 9.5, 600, '#0e4a9a', 'middle')}</g>`)).join('')
      + T('AI proposes. A person decides what counts.', 350, 272, 10.5, 600, MUTE, 'middle', 'c2note');
    // 3: BRD builds, requirements are confirmed, the customer signs off
    const REQ = [['R-01', 'Technicians raise material requests'], ['R-02', 'Weekly readings shown as a trend'], ['R-03', 'Supervisors alerted on SLA breach'], ['R-04', 'Documents follow the work order']];
    const c3 = G(24, 62, 'c3doc', R(0, 0, 244, 200, 14, '#fff', LINE) + T('Business requirements document', 16, 24, 11.5, 700, INK) + `<g class="c3st" transform="translate(16 34)">${R(0, 0, 54, 17, 8.5, 'rgba(188,75,9,.12)')}${T('v1 draft', 27, 12, 9.5, 600, '#8a3706', 'middle')}</g><g class="c3ok" transform="translate(16 34)">${R(0, 0, 70, 17, 8.5, 'rgba(22,163,74,.13)')}${T('v1 approved', 35, 12, 9.5, 600, '#0b5a0b', 'middle')}</g>`
      + [.95, 1, .8, 1, .9, .6, .85].map((w, i) => `<rect class="c3ln" x="16" y="${64 + i * 18}" width="${212 * w}" height="8" rx="4" fill="${i % 3 === 0 ? 'rgba(21,112,239,.22)' : 'rgba(0,0,0,.09)'}"/>`).join(''))
      + REQ.map(([id, t], i) => G(292, 62 + i * 41, 'c3r', R(0, 0, 386, 33, 10, '#fff', LINE) + T(id, 12, 20.5, 9, 600, MUTE) + T(t, 46, 20.5, 10.5, 500, INK)
        + `<g class="c3tc" transform="translate(296 8)">${R(0, 0, 72, 17, 8.5, 'rgba(188,75,9,.12)')}${T('To confirm', 36, 12, 9.5, 600, '#8a3706', 'middle')}</g><g class="c3cf" transform="translate(296 8)">${R(0, 0, 72, 17, 8.5, 'rgba(22,163,74,.13)')}${T('Confirmed', 36, 12, 9.5, 600, '#0b5a0b', 'middle')}</g>` + `<g class="c3av" transform="translate(274 16.5)"><circle r="8" fill="${PEOPLE[i % 3][1]}"/>${T(PEOPLE[i % 3][0], 0, 3, 7.5, 700, '#fff', 'middle')}</g>`)).join('')
      + G(292, 230, 'c3sg', R(0, 0, 386, 32, 16, '#fff', GREEN) + `<g transform="translate(18 16)"><circle r="8" fill="${GREEN}"/><path d="M-3.4 0l2.2 2.6 4.4-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>` + T('Signed off online by Priya N., Riverside Facilities', 36, 20, 10.5, 600, '#0b5a0b'));
    // 4: requirement -> configuration -> test, two rows (one fails and is fixed)
    const ROWS = [[84, 'R-02', 'Weekly readings as a trend', 'Readings module, trend widget', 'Reading appears on the trend', 0], [172, 'R-03', 'Supervisors alerted on SLA', 'SLA rule, notification', 'SLA breach alert is sent', 1]];
    const c4 = ROWS.map(([y, id, a, b, t, bad], r) => G(24, y, 'c4n', R(0, 0, 176, 62, 12, '#fff', LINE) + T(id + ' requirement', 12, 20, 9, 600, MUTE) + T(a, 12, 38, 10.5, 600, INK))
      + G(262, y, 'c4n', R(0, 0, 176, 62, 12, '#fff', LINE) + T('Configuration', 12, 20, 9, 600, MUTE) + T(b, 12, 38, 10.5, 600, INK))
      + G(500, y, 'c4n c4t' + r, R(0, 0, 178, 62, 12, '#fff', LINE) + T('Test case', 12, 20, 9, 600, MUTE) + T(t, 12, 38, 10.5, 600, INK)
        + (bad ? `<g class="c4f" transform="translate(12 44)">${R(0, 0, 40, 14, 7, 'rgba(177,14,28,.12)')}${T('Fail', 20, 10.5, 9, 600, '#8e0b17', 'middle')}</g><g class="c4x" transform="translate(58 44)">${T('fixed on the same record', 0, 10.5, 8.5, 500, MUTE)}</g>` : '') + `<g class="c4p" transform="translate(12 44)">${R(0, 0, 40, 14, 7, 'rgba(22,163,74,.13)')}${T('Pass', 20, 10.5, 9, 600, '#0b5a0b', 'middle')}</g>`)
      + `<path class="c4a" d="M200 ${y + 31} L262 ${y + 31}" stroke="${BLUE}" stroke-width="2" fill="none"/><path class="c4a" d="M438 ${y + 31} L500 ${y + 31}" stroke="${BLUE}" stroke-width="2" fill="none"/><circle class="c4tk" r="4" fill="${PINK}"/>`).join('')
      + G(24, 252, 'c4cv', T('Test coverage', 0, 10, 10, 600, MUTE) + R(88, 2, 420, 8, 4, 'rgba(0,0,0,.09)') + R(88, 2, 420, 8, 4, GREEN, '', 'c4bar') + T('Every requirement has a test', 520, 10, 10, 600, INK));
    // 5: readiness, live, hypercare curve, handover pack
    const CK = ['Users trained', 'Data loaded', 'Guides published', 'Sign-offs done', 'Support ready'];
    const c5 = G(24, 62, 'c5rd', R(0, 0, 200, 200, 14, '#fff', LINE) + T('Go-live readiness', 16, 24, 11.5, 700, INK) + CK.map((l, i) => `<g class="c5ck" transform="translate(14 ${38 + i * 31})">${R(0, 0, 172, 25, 8, '#f7f7f7', LINE)}${T(l, 34, 16.5, 10.5, 500, INK)}</g>`).join(''))
      + CK.map((l, i) => tick('c5t', 24 + 14 + 14, 62 + 38 + i * 31 + 12.5, 8)).join('')
      + `<g class="c5live" data-x="350" data-y="150"><circle class="c5rp" r="44" fill="none" stroke="${GREEN}" stroke-width="1.6"/><circle class="c5rp" r="44" fill="none" stroke="${GREEN}" stroke-width="1.6"/><circle class="c5cr" r="44" fill="${GREEN}"/>${T('Live', 0, 7, 20, 700, '#fff', 'middle')}</g>` + T('Hypercare: first 30 days', 350, 222, 10.5, 600, INK, 'middle', 'c5lb')
      + G(486, 62, 'c5hc', R(0, 0, 192, 100, 14, '#fff', LINE) + T('Hypercare · open issues', 14, 22, 10.5, 700, INK) + '<path class="c5cv" d="M14 40 C 50 44, 70 52, 96 62 S 150 82, 178 86" fill="none" stroke="#1570EF" stroke-width="2.4" stroke-linecap="round"/>')
      + G(486, 174, 'c5hp', R(0, 0, 192, 88, 14, '#fff', LINE) + T('Handover pack', 14, 22, 10.5, 700, INK) + ['Guides', 'BRD', 'Config'].map((l, i) => `<g class="c5tl" transform="translate(${14 + i * 58} 36)">${R(0, 0, 52, 40, 9, '#f7f7f7', LINE)}<g transform="translate(18 6)">${ICON.doc}</g>${T(l, 26, 33, 9, 600, INK, 'middle')}</g>`).join('') + `<g class="c5hd" transform="translate(110 8)">${R(0, 0, 70, 17, 8.5, 'rgba(22,163,74,.13)')}${T('Handed over', 35, 12, 9.5, 600, '#0b5a0b', 'middle')}</g>`);
    // 6: the result
    const c6 = T('Same project, two ways of running it', 350, 78, 12, 700, NAVY, 'middle', 'c6t')
      + G(40, 100, 'c6b1', T('Chasing across email, sheets and chats', 0, 0, 10.5, 600, MUTE) + R(0, 10, 620, 18, 9, 'rgba(0,0,0,.09)') + R(0, 10, 620, 18, 9, '#cbd5e1', '', 'c6f1'))
      + G(40, 156, 'c6b2', T('One studio: AI drafts, people approve, one record', 0, 0, 10.5, 700, INK) + R(0, 10, 620, 18, 9, 'rgba(0,0,0,.09)') + R(0, 10, 620, 18, 9, BLUE, '', 'c6f2'))
      + T('Illustrative picture, not a measured result', 350, 214, 9.5, 500, '#a3a3a3', 'middle', 'c6il')
      + ['One source of truth', 'AI drafts first', 'People stay in control'].map((l, i) => G(80 + i * 188, 232, 'c6k', R(0, 0, 170, 28, 14, 'rgba(21,112,239,.08)', 'rgba(21,112,239,.25)') + T(l, 85, 18, 10.5, 700, NAVY, 'middle'))).join('');
    return [c1, c2, c3, c4, c5, c6].map((c, i) => `<g class="ch ch${i + 1}" opacity="0">${c}</g>`).join('');
  }

  function html() {
    const rail = RAIL.map((l, i) => `<circle class="rd" cx="${30 + i * 91.4}" cy="314" r="4.2" fill="rgba(255,255,255,.28)"/>${T(l, 30 + i * 91.4, 334, 10, 600, 'rgba(255,255,255,.7)', i === 0 ? 'start' : i === 7 ? 'end' : 'middle', 'rl')}`).join('');
    const svg = `<svg class="lsf-svg" viewBox="0 0 700 346" role="img" aria-label="${esc('How Delivery Studio helps: inputs flow into one project, AI drafts, people review and approve, build and test stay linked to each requirement, then go live and hand over.')}" preserveAspectRatio="xMidYMin meet">`
      + '<defs><linearGradient id="lsfg" x1="0" x2="1"><stop offset="0" stop-color="#5aa0ff"/><stop offset=".45" stop-color="#ff6bb0"/><stop offset=".75" stop-color="#fbbf24"/><stop offset="1" stop-color="#34d399"/></linearGradient><filter id="lsfs" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#030218" flood-opacity=".5"/></filter><clipPath id="lsfc"><rect width="700" height="282" rx="18"/></clipPath></defs>'
      + `<g class="win" filter="url(#lsfs)"><rect width="700" height="282" rx="18" fill="#fff" stroke="rgba(255,255,255,.6)"/><g clip-path="url(#lsfc)"><rect width="700" height="34" fill="#fafafa"/><rect y="34" width="700" height="1" fill="rgba(0,0,0,.08)"/><rect width="700" height="2" fill="url(#lsfg)" opacity=".9"/>`
      + T('Riverside Towers rollout', 20, 22, 10.5, 600, INK) + T('/', 152, 22, 10.5, 500, '#a3a3a3') + '<text class="wt" x="166" y="22" font-size="10.5" font-weight="500" fill="#686868" ' + F + '>Delivery Studio</text>'
      + PEOPLE.map(([i, c], k) => `<g transform="translate(${630 + k * 18} 17)"><circle r="8" fill="${c}"/>${T(i, 0, 3, 7.5, 700, '#fff', 'middle')}</g>`).join('')
      + chapters() + '</g></g>'
      + `<line x1="30" y1="314" x2="670" y2="314" stroke="rgba(255,255,255,.2)" stroke-width="2" stroke-linecap="round"/><rect class="rf" x="30" y="312.5" width="640" height="3" rx="1.5" fill="url(#lsfg)"/>` + rail + '</svg>';
    return `<div class="lsx lsf" data-aud="team"><i class="lsf-g lsf-g1" aria-hidden="true"></i><i class="lsf-g lsf-g2" aria-hidden="true"></i><div class="lsx-top"><div class="lsx-cap" aria-live="polite"><b>${esc(CH[0][1])}</b><span>${esc(CH[0][2])}</span></div><div class="lsx-row"><div class="lsx-prog" aria-hidden="true">${CH.map(() => '<i></i>').join('')}</div><button type="button" class="lsx-rp">Replay</button><small>Illustrative</small></div></div><div class="lsf-stage">${svg}</div></div>`;
  }

  let gs = null;
  const lib = () => gs || (gs = new Promise(res => { if (root.gsap) return res(root.gsap); const s = doc.createElement('script'); s.src = 'vendor/gsap.min.js'; s.onload = () => res(root.gsap || null); s.onerror = () => res(null); doc.head.appendChild(s); }));
  let TL = null;
  function build(el, gsap) {
    const q = s => [...el.querySelectorAll(s)], one = s => el.querySelector(s);
    q('[data-x]').forEach(g => gsap.set(g, { x: +g.dataset.x, y: +g.dataset.y }));
    gsap.to(q('.lsf-g1'), { x: 40, y: 26, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 }); gsap.to(q('.lsf-g2'), { x: -36, y: -22, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });   // ambient layer: the soft light drifts behind the window
    gsap.set(q('.ch'), { opacity: 0 }); gsap.set(q('.c1rv, .c3ok, .c3cf, .c4p, .c1rg, .c4f, .c4x, .c2tk, .c2tk2, .c4tk'), { opacity: 0 });
    gsap.set(one('.rf'), { transformOrigin: '0% 50%', scaleX: 0 });
    q('.c2p, .c2q, .c1ln, .c4a').forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 0; p.dataset.len = L; gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
    gsap.set(q('.c1orb'), { transformOrigin: '0 0' });
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: .5 } });
    const at = i => CH[i][0];
    CH.forEach((c, i) => {
      tl.fromTo(q('.ch' + (i + 1)), { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: .45 }, at(i));
      if (i + 1 < CH.length) tl.to(q('.ch' + (i + 1)), { opacity: 0, x: -14, duration: .3, ease: 'power2.in' }, at(i + 1) - .32);
      tl.call(() => { one('.wt').textContent = c[3]; }, null, at(i));
      tl.to(one('.rf'), { scaleX: c[4] / 7, duration: Math.max(.6, (i + 1 < CH.length ? at(i + 1) : END) - at(i) - .6), ease: 'power2.inOut' }, at(i) + .2);
    });
    q('.rd').forEach((d, i) => tl.to(d, { fill: '#fff', attr: { r: 5 }, duration: .25 }, (i <= 1 ? at(i === 0 ? 0 : 1) : i <= 3 ? at(2) + (i - 2) * 2.2 : i === 4 ? at(3) + 1 : at(4) + (i - 5) * 1.2) + .3));
    // 1: land, AI, drafts, review
    const c1 = 0;
    tl.from(q('.c1l'), { opacity: 0, y: 6, stagger: .12 }, c1 + .1)
      .from(q('.c1in'), { opacity: 0, x: '-=26', stagger: .12, ease: 'back.out(1.4)' }, c1 + .15)
      .from(q('.c1hub'), { opacity: 0, scale: .94, transformOrigin: '50% 50%', duration: .6 }, c1 + .3);
    q('.c1in').forEach((n, i) => { const t0 = c1 + 1 + i * .22; tl.to(n, { x: 224, duration: .9, ease: 'power2.inOut' }, t0).to(n, { y: 136, duration: .9, ease: 'sine.inOut' }, t0).to(n, { scale: .45, opacity: 0, duration: .9, ease: 'power2.in', transformOrigin: '50% 50%' }, t0).to(one('.c1hub'), { scale: 1.025, duration: .12, yoyo: true, repeat: 1, transformOrigin: '50% 50%' }, t0 + .85); });
    tl.from(q('.c1ch'), { opacity: 0, scale: .6, transformOrigin: '50% 50%', stagger: .3, ease: 'back.out(1.6)' }, c1 + 1.7)
      .to(q('.c1ln'), { strokeDashoffset: 0, duration: .5, stagger: .25 }, c1 + 2.2)
      .from(q('.c1ai'), { opacity: 0, scale: 0, transformOrigin: '50% 50%', ease: 'back.out(2)' }, c1 + 1.5)
      .to(q('.c1orb'), { rotation: 360, duration: 3.2, ease: 'none' }, c1 + 1.5)
      .from(q('.c1st'), { opacity: 0, x: -10, duration: .6 }, c1 + 2.6);
    q('.c1out').forEach((o, i) => { const t0 = c1 + 2.6 + i * .28, t1 = c1 + 3.8 + i * .18; tl.from(o, { opacity: 0, x: '-=42', duration: .5 }, t0).to(o.querySelector('.c1dr'), { opacity: 0, duration: .2 }, t1).fromTo(o.querySelector('.c1rv'), { opacity: 0, scale: .7, transformOrigin: '30px 8px' }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, t1).fromTo(o.querySelector('.c1rg'), { opacity: .9, scale: .5, transformOrigin: '50% 50%' }, { opacity: 0, scale: 2, duration: .6 }, t1); });
    tl.from(q('.c1note'), { opacity: 0, y: 6 }, c1 + 4.1);
    // 2: sources -> AI -> drafts
    const c2 = at(1);
    const trip = (path, tk, t0, dur) => { const L = +path.dataset.len || path.getTotalLength(), o = { v: 0 }; tl.set(tk, { opacity: 1 }, t0).to(o, { v: 1, duration: dur, ease: 'power1.inOut', onUpdate: () => { const p = path.getPointAtLength(o.v * L); gsap.set(tk, { x: p.x, y: p.y }); } }, t0).set(tk, { opacity: 0 }, t0 + dur); };
    tl.from(q('.c2s'), { opacity: 0, x: '-=24', stagger: .15 }, c2 + .15).from(q('.c2core'), { opacity: 0, scale: .4, transformOrigin: '50% 50%', ease: 'back.out(1.7)', duration: .6 }, c2 + .5)
      .to(q('.c2p'), { strokeDashoffset: 0, stagger: .15, duration: .6 }, c2 + .7)
      .fromTo(q('.c2r'), { scale: 1, opacity: .7 }, { scale: 1.9, opacity: 0, duration: 1.1, stagger: .5, repeat: 2, ease: 'power1.out' }, c2 + 1.1);
    q('.c2p').forEach((p, i) => trip(p, q('.c2tk')[i], c2 + 1.3 + i * .25, 1.1));
    q('.c2q').forEach((p, i) => { tl.to(p, { strokeDashoffset: 0, duration: .6 }, c2 + 2.3 + i * .15); trip(p, q('.c2tk2')[i], c2 + 2.5 + i * .25, 1.1); });
    tl.from(q('.c2d'), { opacity: 0, x: '+=26', stagger: .22, duration: .5 }, c2 + 2.7).from(q('.c2note'), { opacity: 0, y: 6 }, c2 + 3.9);
    // 3: BRD, confirm, sign off
    const c3 = at(2);
    tl.from(q('.c3doc'), { opacity: 0, y: 14, duration: .5 }, c3 + .15).from(q('.c3ln'), { scaleX: 0, transformOrigin: '0% 50%', stagger: .18, duration: .45, ease: 'power2.out' }, c3 + .5)
      .from(q('.c3r'), { opacity: 0, x: '+=22', stagger: .16, duration: .45 }, c3 + .4);
    q('.c3av').forEach(a => gsap.set(a, { opacity: 0 }));
    q('.c3r').forEach((r, i) => { const t0 = c3 + 1.5 + i * .5; tl.to(r.querySelector('.c3tc'), { opacity: 0, duration: .15 }, t0).fromTo(r.querySelector('.c3cf'), { opacity: 0, scale: .7, transformOrigin: '36px 8px' }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, t0).fromTo(r.querySelector('.c3av'), { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2.4)' }, t0); });
    tl.to(q('.c3st'), { opacity: 0, duration: .2 }, c3 + 3.6).fromTo(q('.c3ok'), { opacity: 0, scale: .7, transformOrigin: '35px 8px' }, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)' }, c3 + 3.6).from(q('.c3sg'), { opacity: 0, y: '+=10', scale: .96, transformOrigin: '50% 50%', duration: .5, ease: 'back.out(1.5)' }, c3 + 3.5);
    // 4: linked chain, a failure that is fixed, coverage
    const c4 = at(3), arrows = q('.c4a');
    gsap.set(q('.c4bar'), { transformOrigin: '0% 50%', scaleX: 0 }); gsap.set(q('.c4p'), { opacity: 0 });
    tl.from(q('.c4n'), { opacity: 0, y: '+=12', stagger: .1, duration: .45 }, c4 + .15).from(q('.c4cv'), { opacity: 0, y: '+=8' }, c4 + .3);
    arrows.forEach((a, k) => tl.to(a, { strokeDashoffset: 0, duration: .5 }, c4 + .9 + (k % 2) * .55 + (k > 1 ? .5 : 0)));
    [0, 1].forEach(r => { const tk = q('.c4tk')[r], y = [84, 172][r] + 31, o = { v: 0 }, t0 = c4 + 1 + r * .5; tl.set(tk, { opacity: 1, x: 200, y }, t0).to(o, { v: 1, duration: 1.1, ease: 'power1.inOut', onUpdate: () => gsap.set(tk, { x: 200 + o.v * 300 }) }, t0).set(tk, { opacity: 0 }, t0 + 1.1); });
    const pop = (sel, t0) => tl.fromTo(sel, { opacity: 0, scale: .6, transformOrigin: '20px 7px' }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, t0);
    pop(one('.c4t0 .c4p'), c4 + 2.2); pop(one('.c4t1 .c4f'), c4 + 2.7);
    tl.to(one('.c4t1 .c4f'), { x: '+=4', yoyo: true, repeat: 3, duration: .06 }, c4 + 3).to(one('.c4t1 .c4f'), { opacity: 0, duration: .2 }, c4 + 3.5).to(one('.c4x'), { opacity: 1, duration: .3 }, c4 + 3.5);
    pop(one('.c4t1 .c4p'), c4 + 3.6); tl.to(q('.c4bar'), { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, c4 + 2.4);
    // 5: readiness, live, hypercare, handover
    const c5 = at(4);
    gsap.set(q('.c5t'), { opacity: 0 });
    tl.from(q('.c5rd'), { opacity: 0, y: '+=12', duration: .5 }, c5 + .15).from(q('.c5ck'), { opacity: 0, x: -10, stagger: .16, duration: .4 }, c5 + .4)
      .fromTo(q('.c5t'), { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, stagger: .22, duration: .35, ease: 'back.out(2.4)' }, c5 + .9)
      .from(q('.c5live'), { opacity: 0, scale: .5, transformOrigin: '50% 50%', duration: .7, ease: 'back.out(1.6)' }, c5 + 2.1).from(q('.c5lb'), { opacity: 0, y: 6 }, c5 + 2.6)
      .fromTo(q('.c5rp'), { scale: 1, opacity: .7 }, { scale: 1.9, opacity: 0, duration: 1.2, stagger: .5, repeat: 2, ease: 'power1.out' }, c5 + 2.4)
      .from(q('.c5hc'), { opacity: 0, x: '+=20', duration: .5 }, c5 + 1.1).from(q('.c5cv'), { strokeDasharray: 400, strokeDashoffset: 400, duration: 1.6, ease: 'power2.inOut' }, c5 + 1.5)
      .from(q('.c5hp'), { opacity: 0, x: '+=20', duration: .5 }, c5 + 1.7).from(q('.c5tl'), { opacity: 0, y: 8, scale: .8, transformOrigin: '50% 50%', stagger: .15, ease: 'back.out(1.8)' }, c5 + 2.2).from(q('.c5hd'), { opacity: 0, scale: .6, transformOrigin: '50% 50%', ease: 'back.out(2)' }, c5 + 3.2);
    // 6: the result
    const c6 = at(5);
    gsap.set(q('.c6f1, .c6f2'), { transformOrigin: '0% 50%', scaleX: 0 });
    tl.from(q('.c6t'), { opacity: 0, y: 8 }, c6 + .2).from(q('.c6b1, .c6b2'), { opacity: 0, y: '+=10', stagger: .2 }, c6 + .4)
      .to(q('.c6f1'), { scaleX: 1, duration: 1.8, ease: 'power2.inOut' }, c6 + .8).to(q('.c6f2'), { scaleX: .48, duration: 1.1, ease: 'power3.out' }, c6 + 1.2)
      .from(q('.c6il'), { opacity: 0 }, c6 + 2.4).from(q('.c6k'), { opacity: 0, y: '+=10', scale: .9, stagger: .15, transformOrigin: '50% 50%', ease: 'back.out(1.5)' }, c6 + 2.6);
    tl.set({}, {}, END);   // the timeline lasts END seconds: the last picture is held
    return tl;
  }

  function init() {
    const el = doc.querySelector('.lsf:not([data-on])'); if (!el) return; el.setAttribute('data-on', '1');
    const cap = el.querySelector('.lsx-cap'), segs = [...el.querySelectorAll('.lsx-prog i')];
    let cur = 0;
    const setCap = i => { if (cap.querySelector('b').textContent === CH[i][1]) return; cap.classList.remove('swap'); void cap.offsetWidth; cap.querySelector('b').textContent = CH[i][1]; cap.querySelector('span').textContent = CH[i][2]; cap.classList.add('swap'); };
    const still = () => { el.querySelectorAll('.ch6').forEach(g => g.setAttribute('opacity', '1')); const rf = el.querySelector('.rf'); if (rf) rf.setAttribute('width', '640'); el.querySelectorAll('.rd').forEach(d => d.setAttribute('fill', '#fff')); const wt = el.querySelector('.wt'); if (wt) wt.textContent = CH[5][3]; setCap(5); segs.forEach(s => s.style.setProperty('--p', 1)); };
    lib().then(gsap => {
      if (!gsap || !el.isConnected) { if (el.isConnected) still(); return; }
      TL = build(el, gsap);
      const sync = () => { const t = TL.time(); let i = 0; CH.forEach((c, k) => { if (t >= c[0]) i = k; }); if (i !== cur) { cur = i; setCap(i); } segs.forEach((s, k) => { const a = CH[k][0], b = k + 1 < CH.length ? CH[k + 1][0] : END - 1; s.style.setProperty('--p', Math.min(1, Math.max(0, (t - a) / (b - a))).toFixed(3)); }); };
      TL.eventCallback('onUpdate', sync);
      el.querySelector('.lsx-rp').addEventListener('click', () => { cur = -1; TL.restart(); });
      if (RM.matches) { TL.progress(1); sync(); return; }
      TL.play(0);
    });
  }
  V.loginFlow = { timeline: () => TL, chapters: CH, end: END };   // read by tests/ui/login-flow-check.mjs
  V.isoLogin = a => { if (a === 'customer' && old) return old(a); root.setTimeout(init, 0); return html(); };
})(typeof window !== 'undefined' ? window : globalThis);
