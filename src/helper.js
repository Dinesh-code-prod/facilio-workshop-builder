/* The Claude helper light (top bar) and its explanation. The Studio has no clock of its own: drafts, imports and the morning reminders are done by the scheduled task in a team member's Claude desktop.
   The server notes every check-in of a Claude (work/server/_jobsapi.mjs, GET /api/projects/:id/helper); this file shows it: green "Claude helper on" when someone checked in within 15 minutes,
   amber "Claude helper off" otherwise, and a window that says in plain words what it means and what to do (open Claude desktop, set up the task). Customers never see it. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  let st = null, last = 0, forPid = '';
  const PROMPT = 'Use the Facilio Delivery Studio connector. First check the scheduled task "Delivery Studio job queue" with the scheduled-tasks tools: if it is paused (enabled false), switch it on again with update_scheduled_task (enabled true, keep its schedule) and say so in one line; if you cannot, say in one line that the person must switch on "Delivery Studio job queue" under Scheduled in Claude desktop, and carry on. Then call project_jobs with action list (no project) and do the waiting jobs one by one.';
  const show = () => !!(S.project && !V.isCustomer() && S.user && S.user.kind !== 'customer');
  const skipKey = () => 'fwb.hp.skip.' + String((S.user && S.user.email) || '');
  const skipped = () => { try { return Date.now() - Number(localStorage.getItem(skipKey()) || 0) < 3 * 864e5; } catch (e) { return false; } };
  // a person whose Claude never checked in is asked once (and again after three days) to set it up; the banner goes by itself as soon as their first check-in arrives
  const needBanner = () => !!(show() && st && !st.mineAt && !skipped()); let shown = false;
  function banner() { shown = needBanner(); return shown ? '<div class="hp-banner" role="status"><div class="hp-bt"><b>Set up your Claude helper</b> <span>about 2 minutes</span><p>Drafts, file imports and the morning reminders are done by a small task in your Claude desktop. Yours has not checked in yet, so those wait for someone else\'s.</p></div><div class="hp-ba"><button type="button" class="btn primary" data-act="helperInfo">How it works</button><button type="button" class="btn" data-act="helperOpen">Activate Claude</button><button type="button" class="btn link" data-act="helperLater">Later</button></div></div>' : ''; }
  async function refresh(force) {
    if (!show()) return; if (!force && forPid === S.project.id && Date.now() - last < 45000) return; forPid = S.project.id; last = Date.now();
    try { st = await root.FWBApi.get('/api/projects/' + S.project.id + '/helper'); } catch (e) { return; }
    const c = document.getElementById('hpChip'); if (c) c.outerHTML = chip(); if (needBanner() !== shown) V.render();
  }
  function chip() {
    if (!show()) return ''; refresh(false); const on = st && st.state === 'on';
    return '<button type="button" class="hp-chip' + (st ? (on ? ' on' : ' off') : '') + '" id="hpChip" data-act="helperInfo" title="Whether a Claude is running for this project. Click to see what it means."><i aria-hidden="true"></i>' + esc(st ? st.chip : 'Claude helper') + '</button>';
  }
  V.helper = { banner, created: async () => { await refresh(true); ACT.helperInfo('new'); }, chip, refresh, off: () => !!(st && st.state !== 'on'), state: () => st, prompt: PROMPT };
  ACT.helperOpen = () => { if (V.claudeNav) V.claudeNav('claude://claude.ai/new?q=' + encodeURIComponent(PROMPT)); else window.open('https://claude.ai/new?q=' + encodeURIComponent(PROMPT), '_blank'); };
  ACT.helperCopy = async () => { try { await navigator.clipboard.writeText(PROMPT); V.toast('Copied. Paste it into any Claude chat.'); } catch (e) { V.toast('Copy was blocked. Select the text and copy it by hand.', 5000, true); } };
  ACT.helperLater = () => { try { localStorage.setItem(skipKey(), String(Date.now())); } catch (e) { } V.render(); };
  ACT.helperInfo = async a => {
    const fresh = a === 'new';
    await refresh(true); const s = st || { state: 'never', line: 'The status could not be read.', people: [], waiting: 0 }; const on = s.state === 'on';
    const who = (s.people || []).map(p => '<div class="ev-row"><span class="ev-t">' + esc(p.name) + '</span><span class="small muted">' + (p.at ? esc(V.fmtDate(p.at.slice(0, 10))) + ' ' + esc(p.at.slice(11, 16)) + ' UTC' : 'never checked in') + '</span></div>').join('');
    V.drawer(fresh ? 'Your project is ready: keep Claude open' : 'Claude helper', (fresh ? '<p class="small" style="margin:0 0 10px">One more thing before you start. Part of the work on this project is done by Claude, through a small task in Claude desktop. Without it, drafts, imports and the morning reminders wait.</p>' : '') + '<div class="hp-box ' + (on ? 'on' : 'off') + '"><b>' + esc(s.chip || 'Claude helper') + '</b><p class="small" style="margin:4px 0 0">' + esc(s.line || '') + (s.waiting ? ' ' + s.waiting + ' request' + (s.waiting === 1 ? ' is' : 's are') + ' waiting.' : '') + '</p></div>'
      + '<h4 style="margin:14px 0 4px">What it is</h4><p class="small" style="margin:0">Delivery Studio does the work you can see: pages, exports, answers from the records. The things only Claude can do (drafting the BRD and guides, reading your files, importing a plan, the morning reminders) are done by a small <b>scheduled task in Claude desktop</b>. It runs every few minutes, <b>only while Claude desktop is open and the computer is on</b>. One person\'s Claude serves the whole project, but the jobs that read your own mailbox or drive need your own Claude.</p>'
      + '<h4 style="margin:14px 0 4px">What to do</h4><ol class="small" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Press Activate Claude (or open Claude desktop) when you start working.</li><li>On a long break, close Claude desktop: the task only runs while it is open, and it also pauses itself after 30 idle minutes. Press Activate Claude when you are back.</li><li>Create the Studio task once: Claude setup has the two prompts to copy.</li><li>Nothing to do while the light is green.</li></ol>'
      + '<h4 style="margin:14px 0 4px">Who checked in</h4>' + (who || '<p class="small muted" style="margin:0">Nobody yet.</p>'),
      '<button type="button" class="btn" data-act="helperCopy">Copy the prompt</button><button type="button" class="btn" data-act="koOpen" data-view="claudesetup">Claude setup</button><button type="button" class="btn primary" data-act="helperOpen">Open Claude desktop</button>');
  };
  setInterval(() => { if (show() && !document.hidden) refresh(true); }, 60000);
})(typeof window !== 'undefined' ? window : globalThis);
