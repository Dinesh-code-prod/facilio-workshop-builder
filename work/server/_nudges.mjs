/* Lifecycle nudges (tests: tests/nudges.mjs): the message Otto sends a project's owners when the project's records say it needs attention.
   Pure code. The facts come from assess() in _portfolio.mjs (overdue plan steps, an idle project, customer questions waiting, blocked work, go-live close with prerequisites open, and so on), which already
   says what triggered each signal and what to do next; this only words them. Only critical and high signals are sent. The key repeats for the same set of signals within three days, so the same worry is
   not sent every morning, and a new or changed set is sent at once (notify() tells a key once per person). */
import { HEALTH_LABEL } from './_portfolio.mjs';
const RANK = { critical: 0, high: 1 };

export function lifecycleMessage(project, health, today) {
  const sigs = ((health && health.signals) || []).filter(g => g && g.code && RANK[g.sev] !== undefined).sort((a, b) => RANK[a.sev] - RANK[b.sev] || String(a.code).localeCompare(String(b.code))); if (!sigs.length) return null;
  const day = Math.floor(Date.parse(today + 'T00:00:00Z') / 864e5); const n = sigs.length; const top = sigs.slice(0, 5); const crit = sigs.filter(g => g.sev === 'critical').length;
  return {
    key: 'nud|' + project.id + '|' + sigs.map(g => g.code).sort().join(',') + '|' + Math.floor(day / 3),
    title: n + ' thing' + (n === 1 ? '' : 's') + ' need' + (n === 1 ? 's' : '') + ' attention · ' + project.name,
    text: top.map(g => g.title).join('; '),
    detail: top.map(g => g.title + (g.action ? '. Next step: ' + g.action : '')).join(' • ') + (n > top.length ? ' • and ' + (n - top.length) + ' more' : ''),
    facts: [{ title: 'Project health', value: HEALTH_LABEL[health.health] || String(health.health || '') }, { title: 'Critical', value: String(crit) }, { title: 'High', value: String(n - crit) }]
  };
}
