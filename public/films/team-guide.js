/* The Team Guide film (user, 26 Nov 2026; plan docs/plans/GUIDE-FILMS-CLAUDE-AND-TEAM-PLAN-2026-11-26.md): how to create a project, every tab of the
   sidebar in menu order, the Assistant, the customer preview and Otto in Teams, made like a screen recording of the real Studio (the demo project, Expanded
   sidebar): the mouse goes to the exact entry and button and clicks, the screen the click opens fades in, a few words beside the mouse say what it is for.
   Every tab is also a clip of its own (FWBFilms['tg-<page id>']) that the Team Guide shows under its stage. Screens: public/films/team-guide/ (WebP, taken by
   tools/film-capture.mjs with tools/film-shots/team-guide.mjs, boxes in tools/film-shots/team-guide.pos.json) and two of the Contract intake and Plan pilots. */
(function (root) {
  'use strict';
  const K = root.FWBFilmKit, { C, fin, rr, tx, tick, cursor, fade, pulse, label, track } = K;
  // the sidebar entry of each page on its own screen (its top, in px; x 10, w 269, h 34) (team-guide.pos.json). Each group's pages were taken with the menu at
  // the same place, so the next tab of a group sits on the current screen exactly where the film clicks it
  const NAV = { projdash: 182, lifecycle: 217, msaintake: 255, intro: 290, onboarding: 269, workshop: 304, rstrans: 339, whiteboard: 269, rschecks: 304, flow: 269, modules: 304, 
    roles: 339, notifications: 374, solmap: 269, mockup: 304, slakpi: 339, brd: 269, governance: 304, changes: 339, ftr: 269, delivery: 304, kpi: 339, guides: 286, 
    tasks: 269, mailtab: 304, supportdesk: 339, transfers: 374, golivehc: 409, handover: 331, soldoc: 366, statusrep: 367, trace: 405, resources: 411, docs: 446, 
    seefacilio: 448, teamhelp: 486, claudesetup: 596, settings: 601, workspace: 671 };
  const nav = id => [10, NAV[id], 269, 34];
  // the next page is in the same sidebar group (open on this screen) when its entry is 1 to 3 rows (35 px) below this one
  const sameGroup = (a, b) => { const d = NAV[b] - NAV[a], k = Math.round(d / 35); return k >= 1 && k <= 3 && Math.abs(d - 35 * k) <= 4; };
  // the page title's top (x 330) on its screen: after the click the mouse glides there, so the words sit on the page they explain (team-guide.pos.json)
  const TOP = { projdash: 279, lifecycle: 96, brd: 104 }, LOW = ['tasks', 'mailtab', 'supportdesk', 'transfers', 'golivehc', 'statusrep', 'trace', 'resources', 'docs', 'seefacilio', 'claudesetup', 'settings', 'workspace'];
  const head = id => [330, TOP[id] || (id === 'teamhelp' ? 153 : LOW.includes(id) ? 144 : 114), 360, 40];
  // what each tab is for, in the team's words: [part, group, what the group is for, pages: [id, the page as the menu names it, what it does, clicks on it:
  // [[where, the screen it opens, the words]]]]
  const GROUPS = [
    ['Project', 'Home', 'Where the project stands', [['projdash', 'Dashboard', 'Where the project stands today, in numbers'], ['lifecycle', 'Project cycle', 'Every stage, closed only from real records']]],
    ['Discover and define', '1. Project introduction', 'Agree what is delivered, by when and by whom', [
      ['msaintake', 'Contract intake', 'The signed MSA and order forms, read together', [[[1101, 164, 151, 40], 'contract-intake/docs.jpg', 'Upload the MSA', 'Then every amendment and order form'], [[1086, 164, 166, 40], 'contract-intake/analysed.jpg', 'Analyse contracts', 'Claude drafts the kick-off, plan and questions']]],
      ['intro', 'Kick-off, plan and schedule', 'The kick-off deck, the plan, the session schedule', [[[549, 232, 110, 36], 'plan-replan/plan.jpg', 'Project plan', 'Edit dates in the grid; each change asks why']]]]],
    ['Discover and define', '2. Requirement sessions', 'Run the sessions; nothing said is lost', [['onboarding', 'Data onboarding', 'Facilio data templates, checked sheet by sheet'], ['workshop', 'Workshop room (live call)', 'Ask the prepared questions during the call'],
      ['rstrans', 'Transcripts', 'Claude finds the promises and asks; you confirm']]],
    ['Discover and define', '2. Process & checks', 'Draw the process, confirm what counts', [['whiteboard', 'Process whiteboard', 'Draw the process with the customer'], ['rschecks', 'Checks & validations', 'Confirm what reaches the BRD and test cases']]],
    ['Discover and define', '2. Module design', 'How each module works', [['flow', 'State flow builder', 'Statuses, and who may press each button'], ['modules', 'Forms & templates', 'Modules and fields, from the requirements'],
      ['roles', 'Roles & access', 'Who can see and do what'], ['notifications', 'Notifications', 'Who is told what, and when']]],
    ['Design and build', '3. Solution design & BRD', 'The solution, module by module', [['solmap', 'Solution', 'The whole design per module, in one tree'], ['mockup', 'Mockup (Meteor)', 'Screens the customer sees before the build'],
      ['slakpi', 'KPIs & SLA', 'Service levels and KPIs for the BRD and FTR']]],
    ['Design and build', '3. BRD & sign-off', 'Agree it, sign it, guard the scope', [['brd', 'BRD Draft', 'Drafted from confirmed requirements; you approve'], ['governance', 'Governance & RAID', 'Sign-offs, risks, decisions, actions, minutes'],
      ['changes', 'Change Requests', 'Anything outside the signed scope', [[[1076, 164, 176, 40], 'changes+', 'New change request', 'Never change the scope silently']]]]],
    ['Design and build', '4. UAT & FTR', 'Prove it works', [['ftr', 'FTR Report', 'Claude writes it; you check each result'], ['delivery', 'Build & test tracker', 'Build status, UAT test cases and issues'], ['kpi', 'KPI Workbooks', 'The workbooks the customer reports on']]],
    ['Launch and support', '5. Training guides', 'Leave the customer able to run it', [['guides', 'Guides & Videos', 'Ask Claude for user, UAT or training guides']]],
    ['Launch and support', 'Tasks & mail', 'Everything to do, every day', [['tasks', 'Tasks', 'One register for everything to do', [[[328, 309, 127, 40], 'tasks+', 'New task', 'Owner and due date; Otto tells them']]],
      ['mailtab', 'Customer mail', 'Customer mail becomes tasks and reply drafts'], ['supportdesk', 'Support Desk', 'The Facilio Support Desk, inside the Studio'],
      ['transfers', 'Transfers', 'Approve what Claude read; start from a contract'], ['golivehc', 'Go-live & hypercare', 'The go-live verdict, then issues after launch']]],
    ['Launch and support', '8. Project handover', 'Hand over cleanly and close', [['handover', 'Handover & Closure', 'Owners, support handover, lessons, close'], ['soldoc', 'Solution document', 'The client-ready description of what was built']]],
    ['Project', 'Reports and notes', 'Report, trace, keep it together', [['statusrep', 'Status report (WSR) & monthly report', 'Built from live records; what was sent'], ['trace', 'Traceability & quality', 'Every requirement traced to design and tests'],
      ['resources', 'Notes & Links', 'Notes and links kept with the project'], ['docs', 'Documents & Files', 'The project folder in SharePoint']]],
    ['Share with the customer', 'With the customer', 'What the customer sees', [['seefacilio', 'Product Tour', 'Show the customer what Facilio can do']]],
    ['Integrations & admin', 'Help, Claude and settings', 'Learn, connect Claude, set the project up', [['teamhelp', 'Team Guide', 'These films, stage by stage'], ['claudesetup', 'Claude setup', 'Connect your own Claude, once'],
      ['settings', 'Project Settings', 'Details, people, the SharePoint folder'], ['workspace', 'Tabs & Layouts', 'Rename, reorder or hide tabs per project']]]];

  // ---- Otto in Teams (user, 26 Nov 2026: "create UI like this same and match with project used in guide"): Otto's chat as people see it in Teams, drawn
  // in its layout (a dark chat: your message on the right, Otto's answer on the left with bold labels and lists, the tools line, the message box), with the
  // demo project's own data (Demo: Riverside Towers: the tasks, dates and counts its Dashboard and Tasks show) ----
  const D = { bg: '#1F1F1F', bar: '#292929', otto: '#292929', me: '#2B2B40', ink: '#FFFFFF', dim: '#ADADAD', line: '#3D3D3D', link: '#7F85F5', accent: '#7F85F5' };
  const DETAILS = [['p', 'Here are the Demo: Riverside Towers project details:'], ['b', 'Customer:', 'Riverside Facilities (demo)'], ['b', 'Start and end dates:', '24 Oct 2026 to 22 Jan 2027 (go-live)'],
    ['b', 'Team:', 'Raj Mehta, Meera Shah (Facilio)'], ['b', 'Stage:', '3 · Solution design & BRD, plan 30% done'], ['b', 'Requirements:', '6, 3 confirmed'], ['b', 'BRD:', 'in draft, 4 of 6 review parts ticked'],
    ['b', 'Risks and issues:', '3 open'], ['b', 'UAT:', '8 test cases, 3 passed'], ['b', 'Hypercare:', '2 open issues'], ['gap'], ['pb', 'Tasks:', '14 in total, 12 open and 2 done. Three are overdue:'],
    ['li', 'Confirm approval cover (due 19 Nov 2026)'], ['li', 'Collect the asset list (due 22 Nov 2026)'], ['li', 'Send the BRD draft for review (due 25 Nov 2026)'], ['tools', 'project_overview']];
  const TASKS = [['pb', '', 'Demo: Riverside Towers has 12 open tasks. Today is 26 Nov 2026.'], ['h', 'Overdue'], ['li', 'Confirm approval cover, due 19 Nov (7 days late)'], ['li', 'Collect the asset list, due 22 Nov (4 days late)'],
    ['li', 'Send the BRD draft for review, due 25 Nov (1 day late)'], ['h', 'Due soon'], ['li', 'Build the work order state flow, due 29 Nov'], ['li', 'Prepare UAT scripts, due 7 Dec'],
    ['h', 'Other open tasks (no due date)'], ['li', 'Review the BRD: Introduction and Requirements'], ['li', 'Fix and retest: Reject a work order'], ['tools', 'my_tasks']];
  const NEWTASK = [['pbig', 'New task for you: T-4'], ['p', 'Meera Shah gave it to you · due Sat 29 Nov · High'], ['p', 'Build the work order state flow'], ['btns', ['Done: T-4', 'Move to +2 days', 'Move to next Monday', 'My tasks']]];
  const MORNING = [['pbig', 'Good morning. Your day, across your projects'], ['h', 'Overdue (3)'], ['li', 'Confirm approval cover · 7 days late'], ['li', 'Collect the asset list · 4 days late'], ['li', 'Send the BRD draft for review · 1 day late'],
    ['h', 'Coming up in 3 days'], ['li', 'Build the work order state flow · Sat 29 Nov'], ['p', 'What to do: start with Confirm approval cover.'], ['btns', ['Open', 'My tasks']]];
  // one Otto answer laid out at x, y, width w: returns its height and its buttons; draw = false only measures
  function answer(g, x, y, w, blocks, draw, done) { let yy = y + 30; const bs = [], T = (s, xx, sz, col, wt) => { if (draw) tx(g, s, xx, yy, sz, col, wt); };
    for (const b of blocks) {
      if (b[0] === 'gap') { yy += 10; continue; }
      if (b[0] === 'p' || b[0] === 'pbig') { T(b[1], x + 20, b[0] === 'pbig' ? 18 : 16, D.ink, b[0] === 'pbig' ? 700 : 400); yy += b[0] === 'pbig' ? 30 : 26; continue; }
      if (b[0] === 'h') { yy += 6; T(b[1], x + 20, 16, D.ink, 700); yy += 26; continue; }
      if (b[0] === 'pb') { g.font = `700 16px ${K.FONT}`; const lw = b[1] ? g.measureText(b[1] + ' ').width : 0; T(b[1], x + 20, 16, D.ink, 700); T(b[2], x + 20 + lw, 16, D.ink, 400); yy += 28; continue; }
      if (b[0] === 'b' || b[0] === 'li') { if (draw) { g.beginPath(); g.arc(x + 48, yy - 5, 3, 0, Math.PI * 2); g.fillStyle = D.ink; g.fill(); }
        if (b[0] === 'b') { g.font = `700 16px ${K.FONT}`; const lw = g.measureText(b[1] + ' ').width; T(b[1], x + 62, 16, D.ink, 700); T(b[2], x + 62 + lw, 16, D.ink, 400); } else T(b[1], x + 62, 16, D.ink, 400); yy += 26; continue; }
      if (b[0] === 'tools') { yy += 8; T('[tools used for this reply: ' + b[1] + ']', x + 20, 15, D.ink, 400); yy += 24; if (draw) { tx(g, 'via', x + 20, yy, 15, D.ink, 400); tx(g, 'facilio-delivery-studio', x + 48, yy, 15, D.link, 400); g.fillStyle = D.link; g.fillRect(x + 48, yy + 3, 156, 1); } yy += 26; continue; }
      if (b[0] === 'btns') { yy += 4; let bx = x + 20; b[1].forEach((s, i) => { g.font = `600 14px ${K.FONT}`; const bw = g.measureText(s).width + 30, on = done && i === 0;
        if (draw) { rr(g, bx, yy - 22, bw, 34, 6, on ? '#2D4A2D' : i === 0 ? D.accent : '#3A3A3A', null); tx(g, on ? 'Done' : s, bx + bw / 2, yy, 14, '#fff', 600, 'center'); } bs.push([bx, yy - 22, bw, 34]); bx += bw + 10; }); yy += 24; }
    }
    return { h: yy - y, bs }; }
  // the chat: your message (right), then Otto's answer (left, with the time); `p` 0..1 how far the answer has arrived; returns the answer's buttons
  function chat(g, me, blocks, p, typed, done, stamp) {
    g.fillStyle = D.bg; g.fillRect(0, 0, K.W, K.H); g.fillStyle = D.bar; g.fillRect(0, 0, K.W, 58); g.fillStyle = D.line; g.fillRect(0, 58, K.W, 1);
    rr(g, 26, 12, 34, 34, 8, '#0E7C66'); tx(g, 'O', 43, 35, 18, '#fff', 700, 'center'); tx(g, 'Otto', 78, 36, 20, D.ink, 700); tx(g, 'Chat', 148, 35, 15, D.ink, 600); g.fillStyle = D.accent; g.fillRect(146, 54, 34, 3); tx(g, 'About', 196, 35, 15, D.dim, 400);
    // the message box
    rr(g, 212, 640, 1024, 48, 6, '#292929', null); g.fillStyle = D.accent; g.fillRect(216, 686, 1016, 2); tx(g, typed || 'Type a message', 232, 670, 16, typed ? D.ink : D.dim, 400);
    g.font = `400 16px ${K.FONT}`; const mw = me ? g.measureText(me).width + 36 : 0, ans = answer(g, 0, 0, 900, blocks, false), top = me ? 96 : 84, aTop = top + (me ? 64 : 0);
    const scroll = Math.max(0, aTop + ans.h + 20 - 620) * K.ease(p);   // the chat scrolls up as the answer comes in
    g.save(); g.beginPath(); g.rect(0, 59, K.W, 575); g.clip(); g.translate(0, -scroll);
    if (me) { tx(g, stamp, 1236, top - 10, 12, D.dim, 400, 'right'); rr(g, 1236 - mw, top, mw, 42, 8, D.me); tx(g, me, 1236 - mw + 18, top + 27, 16, D.ink, 400); }
    let bs = []; if (p > 0) fade(g, Math.min(1, p * 3), () => { rr(g, 164, aTop + 8, 36, 36, 8, '#0E7C66'); tx(g, 'O', 182, aTop + 32, 18, '#fff', 700, 'center'); tx(g, 'Otto   ' + stamp, 222, aTop, 13, D.dim, 400);
      rr(g, 212, aTop + 8, 900, ans.h + 10, 8, D.otto); bs = answer(g, 212, aTop + 12, 900, blocks, true, done).bs.map(b => [b[0], b[1] - scroll, b[2], b[3]]); });
    g.restore(); return bs; }
  function otto(g, lt) {
    const type = (s, t0, d) => s.slice(0, Math.round(s.length * fin(lt, t0, d)));
    if (lt < 12.5) {   // ask for a project's details
      const q = 'can i get the project details for riverside towers', sent = lt > 3.3; chat(g, sent ? q : '', DETAILS, fin(lt, 4.2, 1.6), sent ? '' : type(q, 0.6, 2.2), false, '9:12 AM');
      const p = track([[0, 900, 560], [2.6, 900, 560], [3.1, 1210, 664]], lt); cursor(g, p[0], p[1], lt > 3.1 && lt < 3.6 ? (lt - 3.1) / 0.5 : 0); pulse(g, 1210, 664, (lt - 3.1) / 0.7);
      label(g, 1240, 548, 'Ask Otto about a project', 'It answers from the Studio, through the connector', fin(lt, 6.2, 0.4) - fin(lt, 12, 0.3));
    } else if (lt < 23) { const l = lt - 12.5, q = 'pending tasks for riverside towers', sent = l > 2.8;   // what is still to do
      chat(g, sent ? q : '', TASKS, fin(l, 3.6, 1.6), sent ? '' : type(q, 0.4, 1.9), false, '9:13 AM');
      const p = track([[0, 1210, 664], [2.2, 1210, 664], [2.6, 1210, 664]], l); cursor(g, p[0], p[1], l > 2.6 && l < 3.1 ? (l - 2.6) / 0.5 : 0); pulse(g, 1210, 664, (l - 2.6) / 0.7);
      label(g, 1240, 548, 'Pending tasks, late first', 'Then due soon, and the rest', fin(l, 5.4, 0.4) - fin(l, 10.2, 0.3));
    } else if (lt < 32) { const l = lt - 23, done = l > 5.4;   // Otto writes first: a task given to you, done from Teams
      const bs = chat(g, '', NEWTASK, fin(l, 0.3, 0.8), '', done, '10:02 AM'), b = bs[0] || [232, 220, 100, 34], p = track([[0, 900, 560], [3.2, 900, 560], [4.9, b[0] + b[2] / 2, b[1] + b[3] / 2]], l);
      cursor(g, p[0], p[1], l > 4.9 && l < 5.4 ? (l - 4.9) / 0.5 : 0); pulse(g, b[0] + b[2] / 2, b[1] + b[3] / 2, (l - 4.9) / 0.7);
      if (l > 5.6) tx(g, 'T-4 is marked done in the Studio too.', 232, b[1] + 70, 15, '#92C353', 600);
      label(g, 1240, 548, 'A task given to you', 'Press Done or move the date, right in Teams', fin(l, 1.2, 0.4) - fin(l, 8.6, 0.3));
    } else { const l = lt - 32;   // every morning
      chat(g, '', MORNING, fin(l, 0.3, 0.8), '', false, '8:00 AM'); label(g, 1240, 548, 'Every morning', 'Your day across your projects; Teams messages are on once the app owner switches them on', fin(l, 1, 0.4));
    }
  }
  function firstDay(g, lt) {
    g.fillStyle = C.bg; g.fillRect(0, 0, K.W, K.H); tx(g, 'Your first day', 120, 190, 40, C.ink, 700); tx(g, 'Three things, in this order', 120, 230, 20, C.text);
    [['Open Demo: Riverside Towers', 'A practice project with data in every tab'], ['Set up Claude', 'Help > Claude setup: watch its film, about three minutes'], ['Watch the clip of the tab you are on', 'Team Guide: every tab has one, in menu order']].forEach(([a, b], i) => fade(g, fin(lt, 0.6 + i * 1.2, 0.5), () => {
      const y = 290 + i * 96; rr(g, 120, y, 760, 76, 16, C.page, C.line); tick(g, 160, y + 38, 16, fin(lt, 1 + i * 1.2, 0.5), C.blue); tx(g, a, 194, y + 34, 20, C.ink, 600); tx(g, b, 194, y + 58, 15, C.text); }));
  }

  // ---- the beats, in menu order ----
  const beats = [{ card: ['Delivery Studio', 'The Team Guide film', 'Create a project, every tab of the menu, the Assistant and Otto in Teams: the mouse shows where to click.'], d: 3.4 },
    { scr: 'projects', d: 4.6, clip: 'tg-welcome', clipTitle: 'Your projects', clipSub: 'Every customer project in one place', clicks: [{ at: [452, 617, 380, 103], t: 1.2, say: ['Every customer project, in one place', 'Practise in Demo: Riverside Towers'], cam: [640, 420, 1180] }] },
    { card: ['Start', 'Create a project', 'From the projects home'], d: 2.2 },
    { scr: 'projects', d: 9.2, clip: 'tg-create', clipTitle: 'Create a project', clipSub: 'Name, customer, currency and the signed MSA', clicks: [{ at: [93, 288, 142, 40], t: 1.1, then: 'newproj', say: ['New project', 'Name, customer and currency'], cam: [900, 300, 1000] },
      { at: [598, 130, 635, 42], t: 3.7, type: ['Riverside Towers CAFM', [600, 132, 630, 38]], say: ['Project name', 'Then the customer and the currency'], cam: [900, 300, 1000] },
      { at: [598, 434, 635, 40], t: 6.6, say: ['What are you delivering?', 'A CMMS implementation, or AI agents'], cam: [900, 420, 1000] }] },
    { scr: 'newproj2', d: 9.4, clicks: [{ at: [598, 136, 635, 58], t: 0.9, say: ['Drop the signed MSA', 'Claude reads it and drafts plan, sessions, kick-off'], cam: [900, 260, 1000] },
      { at: [598, 301, 350, 32], t: 3.6, say: ['No file to hand?', 'Claude lists the OneDrive project folders'], cam: [900, 300, 1000] },
      { at: [1095, 651, 142, 40], t: 6.2, then: 'projdash', say: ['Create project', 'It opens on its Dashboard'] }] }];
  for (const [part, gname, gsub, pages] of GROUPS) {
    beats.push({ card: [part, gname, gsub], d: 2.2 });
    pages.forEach(([id, name, does, acts], i) => {
      const same = i > 0 && sameGroup(pages[i - 1][0], id), clicks = [{ at: nav(id), t: 1.0, then: same ? id : null }, { at: head(id), t: 2.1, look: true, say: [name, does] }]; let tt = 4.6;
      (acts || []).forEach(([at, then, s1, s2]) => { clicks.push({ at, t: tt, then, say: [s1, s2] }); tt += 3.2; });
      beats.push({ scr: same ? pages[i - 1][0] : id, d: acts ? 5.4 + 3.2 * acts.length : 5.6, clip: 'tg-' + id, clipTitle: name, clicks });
    });
    if (gname === 'With the customer') beats.push({ scr: 'seefacilio', d: 7.4, clip: 'tg-customer', clipTitle: 'Preview as customer', clicks: [{ at: [990, 12, 130, 36], t: 1.1, then: 'customer', say: ['Preview as customer', 'Exactly what the customer sees, read-only'], cam: [640, 360, 1280] },
      { at: [924, 12, 112, 36], t: 4.6, say: ['Exit preview', 'Use it before every customer meeting'], cam: [800, 200, 1100] }] });
    if (gname === 'Help, Claude and settings') beats.push({ scr: 'workspace', d: 8.4, clip: 'tg-assistant', clipTitle: 'The Assistant', clicks: [{ at: [1200, 640, 58, 58], t: 1.1, then: 'assistant', say: ['The Assistant', 'On every page, bottom right'], cam: [900, 330, 1000] },
      { at: [588, 509, 646, 52], t: 3.9, type: ['What is waiting on the customer?', [592, 512, 560, 40]], say: ['Ask in your own words', 'Answers at once; big work goes to Claude'], cam: [900, 380, 1000] }] });
  }
  beats.push({ card: ['Every day', 'Otto in Teams', 'Your tasks and reminders come to you'], d: 2.2 }, { draw: otto, d: 38, clip: 'tg-otto', clipTitle: 'Otto in Teams', clipSub: 'Ask about a project, see your tasks, press Done in Teams' },
    { card: ['Next', 'Your first day', ''], d: 2 }, { draw: firstDay, d: 6.5, clip: 'tg-firstday', clipTitle: 'Your first day', clipSub: 'Three things to do first' });

  const FILES = [...new Set(beats.flatMap(b => [b.scr, ...(b.clicks || []).map(c => c.then)]).filter(Boolean))];
  K.recording({ id: 'team-guide', title: 'The Team Guide film: every tab of Delivery Studio', sc: K.screens('team-guide', FILES, 'webp'), FILES, beats });
})(typeof window !== 'undefined' ? window : globalThis);
