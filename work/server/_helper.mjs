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
