/* Project backup to your own computer (25 Nov 2026, user: D: for now, OneDrive later; server: work/server/_backup.mjs). Project Settings > Team: Download backup (one ZIP of the project: records for Excel,
   document sections as HTML, project files, full data) and the one message that makes your Claude save every project's backup each day into D:\Delivery Studio backups (Windows) or ~/Delivery Studio backups (Mac). Team only. */
(function (root) {
  'use strict';
  const F = root.FWB, V = root.FWBViews; if (!F || !V) return;
  const { S, esc } = F; const ACT = V.ACT; const API = () => root.FWBApi;
  const st = { pid: null, last: undefined };
  const team = () => !!(S.project && S.user && !(V.isCustomer && V.isCustomer()));
  // said once to Claude in the desktop app (Code tab: it needs to save files); the same text is on Claude setup
  V.BACKUP_TASK = 'Set up a scheduled task in this Claude desktop app with the scheduled-tasks tools: name "Delivery Studio backup (daily)", taskId delivery-studio-backup, schedule every day at 18:00 (cron 0 18 * * *). If it already exists, make sure it is switched on and stop. Its prompt: "Back up my Delivery Studio projects to this computer. '
    + '1. The backup folder is D:\\Delivery Studio backups on Windows (if there is no D: drive, Delivery Studio backups in my home folder) and ~/Delivery Studio backups on a Mac; create it if it is missing. '
    + '2. Use the Facilio Delivery Studio connector: find_projects, and keep the projects I am on that are not archived. '
    + '3. For each, call project_jobs with action backup and that project, then follow its next instructions exactly: download the url with curl into <backup folder>/<folder>/<fileName>, keep only the 7 newest backup ZIPs in that folder, and unzip it into the subfolder latest after emptying it (Expand-Archive on Windows, unzip on a Mac). Never show, save or log the url. '
    + '4. Reply in one line: how many projects were backed up and where." Run it once now.';
  async function last() { try { st.last = (await API().get('/api/projects/' + S.project.id + '/backup')).last; } catch (e) { st.last = null; } V.render(); }
  V.bkCard = () => {
    if (!team()) return '';
    if (st.pid !== S.project.id) { st.pid = S.project.id; st.last = undefined; last(); }
    const l = st.last, when = l ? esc(new Date(l.at).toLocaleString()) + ' by ' + esc(l.by) : (l === null ? 'Not made yet' : 'Checking…');
    return '<section class="st-sec"><div class="st-side"><h3>Backup to your computer</h3><p>One ZIP of this project that opens without the Studio: the records in Excel, the document sections as web pages, the project files and the full data. Your Claude can save every project\'s backup each day in D:\\Delivery Studio backups (Windows) or ~/Delivery Studio backups (Mac), keeping 7 days.</p></div>'
      + '<div class="card st-card"><div class="card-b"><dl class="kv small"><dt>Last backup</dt><dd>' + when + '</dd></dl>'
      + '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="btn sm primary" data-act="bkDownload">Download backup</button><button type="button" class="btn sm" data-act="bkDaily">Copy the daily set-up for Claude</button></div>'
      + '<p class="xs muted" style="margin:10px 0 0">The daily copy needs Claude in the desktop app on your computer. It stays on that computer: copy the folder somewhere else (for example OneDrive) if the computer itself should be covered. Private notes are never included. Files over 40 MB in total are listed, not copied.</p></div></div></section>';
  };
  ACT.bkDownload = a => V.busy(a, async () => {
    const r = await API().post('/api/projects/' + S.project.id + '/backup', {});
    if (!/^(https:\/\/|http:\/\/localhost[:/])/.test(r.url || '')) throw new Error('The backup link did not come back');   // localhost: the local dev server
    const l = document.createElement('a'); l.href = r.url; l.rel = 'noopener'; document.body.appendChild(l); l.click(); l.remove();
    V.toast('Backup ready: ' + r.contents.records + ' records, ' + r.contents.sections + ' sections, ' + r.contents.files + ' files' + (r.contents.filesNotIncluded ? ' (' + r.contents.filesNotIncluded + ' too big, listed only)' : '') + '. Keep it somewhere outside the Studio.', 8000);
    await last();
  });
  ACT.bkDaily = async () => { let ok = false; try { ok = V.claudeCopy ? await V.claudeCopy(V.BACKUP_TASK) : (await navigator.clipboard.writeText(V.BACKUP_TASK), true); } catch (e) { ok = false; } V.toast(ok ? 'Copied. Paste it once in Claude in the desktop app (Code tab) and send: it sets up the daily backup and runs it now.' : 'This browser blocked copying.', 8000, !ok); };
})(typeof window !== 'undefined' ? window : globalThis);
