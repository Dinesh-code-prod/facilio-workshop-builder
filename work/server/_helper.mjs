/* The Claude helper (tests/helper_status.mjs). Pure rules, no database and no Teams call.
   The Studio has no clock and no AI of its own for drafts: the scheduled task in a team member's Claude desktop does the waiting jobs and starts the morning brief.
   So the Studio watches for it: every time a Claude checks the queue (project_jobs) the server notes the person and the time; a project is "covered" when any team member checked in recently.
   Also here: which jobs only the requester's own Claude may take (they search that person's own mailbox or drive), and the Teams message a person gets when added to a project. */
import { personOf, projectLine } from './_msgfmt.mjs';
/** minutes without a check-in after which no Claude counts as running (a task runs every 5 minutes) */
export const FRESH_MIN = 15;
/** kinds that read the requester's own Outlook, OneDrive, Clari or org connection: another person's Claude would search the wrong mailbox or drive */
export const PERSONAL = new Set(['pull_msa', 'pull_clari', 'pull_brd', 'pull_transcript', 'fetch_feedback', 'fetch_hypercare', 'fetch_mail', 'check_sent', 'fetch_org_status']);
const em = v => String(v || '').trim().toLowerCase();
/** the Studio skills a Claude may report it has (the check-in carries ids, never anything else) */
export const cleanSkills = a => [...new Set((Array.isArray(a) ? a : []).map(x => String(x == null ? '' : x).trim().toLowerCase()).filter(x => /^[a-z0-9][a-z0-9-]{1,59}$/.test(x)))].slice(0, 40);
/** may this person's Claude take this job? Personal jobs only by the person who asked; a job with no known requester is open to the team. */
export const canTake = (kind, requestedBy, email) => !PERSONAL.has(kind) || !em(requestedBy) || em(requestedBy) === em(email);
/** beats: [{ email, name, at }] of the team members; now: ms. -> { state: 'on' | 'off' | 'never', lastAt, lastBy, minutesAgo, people } */
export function status(beats, now) {
  const list = (Array.isArray(beats) ? beats : []).map(b => ({ name: personOf(b.name || b.email), at: /^\d{4}-\d{2}-\d{2}T/.test(String(b.at || '')) ? b.at : '' }));
  const seen = list.filter(b => b.at).sort((a, b) => b.at.localeCompare(a.at)); if (!seen.length) return { state: 'never', lastAt: '', lastBy: '', minutesAgo: null, people: list };
  const mins = Math.max(0, Math.round((now - Date.parse(seen[0].at)) / 60000)); return { state: mins <= FRESH_MIN ? 'on' : 'off', lastAt: seen[0].at, lastBy: seen[0].name, minutesAgo: mins, people: list };
}
/** the words for a status, for the top bar and the waiting-request line */
export function words(st) {
  if (st.state === 'on') return { chip: 'Claude helper on', line: 'A Claude is running for this project (' + (st.lastBy || 'a team member') + ', ' + (st.minutesAgo <= 1 ? 'just now' : st.minutesAgo + ' minutes ago') + ').' };
  if (st.state === 'off') return { chip: 'Claude helper off', line: 'No Claude has checked in for ' + (st.minutesAgo >= 120 ? Math.round(st.minutesAgo / 60) + ' hours' : st.minutesAgo + ' minutes') + '. Drafts and reminders wait until someone opens Claude desktop with the Studio task.' };
  return { chip: 'Claude helper off', line: 'No Claude has ever checked in for this project. Drafts and reminders wait until someone sets up the Studio task in Claude desktop.' };
}
/** the Teams message to a person who has just been added to a project: what it is, who added them, their role, what to do first */
export function addedMessage(project, member, actorName, baseUrl) {
  const role = { owner: 'an owner', editor: 'an editor', viewer: 'a viewer (read only)' }[member.role] || 'a team member'; const url = String(baseUrl || '') + '#/p/' + project.id; const by = personOf(actorName);
  const page = p => url + '/' + p;
  return { title: 'PROJECT · ' + project.name, text: ['**You have been added to a project' + (by ? ' by ' + by : '') + '.**', '**Project:** ' + projectLine(project), '**Your role:** ' + role,
    '**What Delivery Studio is:** the one workspace where the team runs a customer implementation from kick-off to handover: the plan and tasks, the requirement sessions, the BRD, UAT, the training guides and the reports.',
    '**How Claude helps:** Claude drafts the documents (BRD, guides, plans, reports), reads the files you give it and answers questions about the project. People decide and approve; nothing Claude writes is final until a person approves it. Claude works while Claude desktop is open with the Studio task.',
    '**What to do first:** 1) Open the project and read the overview. 2) Read the Team Guide (about 10 minutes). 3) Set up Claude (about 2 minutes): open Claude setup and create the Studio task. 4) Ask me here in Teams: "my tasks" or "project details".'].join('\n'),
    facts: [{ title: 'Why you got this', value: 'A project owner added you to this project' }, { title: 'Project', value: project.name }].concat(project.customer ? [{ title: 'Customer', value: project.customer }] : []).concat([{ title: 'Your role', value: member.role || 'editor' }, { title: 'Added by', value: by || 'a project owner' }]),
    actions: [{ title: 'Open the project', url }, { title: 'Team Guide', url: page('teamhelp') }, { title: 'Set up Claude', url: page('claudesetup') }, { title: 'My tasks', url: page('tasks') }] };
}

/** the requests of a project that have waited a day while no Claude checked in: { n, hours } or null (jobs: the stored job records, now: ms) */
export function stuckJobs(jobs, st, now) {
  const w = (Array.isArray(jobs) ? jobs : []).filter(j => j && j.status === 'waiting' && Date.parse(j.requestedAt || '')); if (!w.length || (st && st.state === 'on')) return null;
  const oldest = Math.max(...w.map(j => now - Date.parse(j.requestedAt))); return oldest >= 24 * 36e5 ? { n: w.length, hours: Math.floor(oldest / 36e5) } : null;
}
/** the Teams message to the owners of a project whose requests are stuck: how many, how long, why, and what to do */
export function helperAlert(project, x, st, baseUrl) {
  const url = String(baseUrl || '') + '#/p/' + project.id; const last = st && st.lastAt ? 'The last Claude check-in was ' + (st.minutesAgo >= 120 ? Math.round(st.minutesAgo / 60) + ' hours' : st.minutesAgo + ' minutes') + ' ago (' + (st.lastBy || 'a team member') + ').' : 'No Claude has ever checked in for this project.';
  return { title: 'PROJECT \u00b7 ' + project.name, text: ['**' + x.n + ' request' + (x.n === 1 ? ' has' : 's have') + ' been waiting for Claude for ' + (x.hours >= 48 ? Math.round(x.hours / 24) + ' days' : x.hours + ' hours') + '.**', '**Project:** ' + projectLine(project), last,
    '**What to do:** Someone on the team opens Claude desktop with the Delivery Studio task on (Claude setup has the steps). The waiting requests are then done within minutes. Drafts, imports and the morning reminders pause while no Claude runs.'].join('\n'),
    facts: [{ title: 'Why you got this', value: 'You own this project and its Claude requests are stuck' }, { title: 'Project', value: project.name }].concat(project.customer ? [{ title: 'Customer', value: project.customer }] : []).concat([{ title: 'Waiting requests', value: String(x.n) }]),
    actions: [{ title: 'Open the project', url }, { title: 'Set up Claude', url: url + '/claudesetup' }] };
}

/** minutes after which a person's usage snapshot is due again (10 Nov 2026: the queue task runs every 3 minutes and sends one on every run, so the chat stays current without pressing Update now) */
export const USAGE_FRESH_MIN = 2;
const txt = (v, n) => String(v == null ? '' : v).replace(/[^\w .:+\-·\/%$€£]/g, '').trim().slice(0, n);
const pct = v => { const x = Number(v); return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : null; };
/** a Claude's plan limits as it reports them (project_jobs action usage): only known fields, numbers clamped, text short and plain; null when nothing usable arrives */
export function cleanUsage(u) {
  if (typeof u === 'string') { try { u = JSON.parse(u); } catch (e) { u = null; } }   // some clients send a nested object as JSON text
  const o = u && typeof u === 'object' ? u : {}; const windows = (Array.isArray(o.windows) ? o.windows : []).slice(0, 6).map(w => ({ label: txt(w && w.label, 40), percentUsed: pct(w && w.percentUsed), resetsAt: /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(String(w && w.resetsAt || '')) ? String(w.resetsAt).slice(0, 30) : '' })).filter(w => w.label && w.percentUsed !== null);
  if (!windows.length) return null; const e = o.extra && typeof o.extra === 'object' ? o.extra : null; const num = v => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : null; };
  return { plan: txt(o.plan, 20), windows, extra: e ? { enabled: !!e.enabled, spent: num(e.spent), monthlyLimit: num(e.monthlyLimit), currency: txt(e.currency, 4), percentUsed: pct(e.percentUsed) } : null };
}
/** which Claude account a snapshot came from: its plan and the weekday and minute its weekly limit resets (fixed per account and the same every week, so two accounts on one Studio sign-in stay apart) */
export const usageKey = u => { const w = (u.windows || []).find(x => /weekly/i.test(x.label) && /all/i.test(x.label)) || (u.windows || []).find(x => /weekly/i.test(x.label)); return (u.plan || '') + '|' + (w && w.resetsAt ? Math.round((Date.parse(w.resetsAt) % 604800000) / 60000) : 'x'); };
/** the person's accounts after a new snapshot: the same account is replaced, others are kept, newest first, at most twelve, none older than 36 hours */
export function mergeUsage(list, snap, nowMs) {
  const k = usageKey(snap), keep = (Array.isArray(list) ? list : []).filter(a => a && a.at && usageKey(a) !== k && nowMs - Date.parse(a.at) < 36 * 3600000);
  return [snap].concat(keep).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 12);
}
/** is a new snapshot due? (no account reported yet, or the newest report is older than USAGE_FRESH_MIN); the queue task also reports in the first minutes of each hour, so every account is heard from */
export const usageDue = (accounts, nowMs) => { const l = Array.isArray(accounts) ? accounts : []; return !l.length || nowMs - Math.max(...l.map(a => Date.parse(a.at) || 0)) > USAGE_FRESH_MIN * 60000; };
