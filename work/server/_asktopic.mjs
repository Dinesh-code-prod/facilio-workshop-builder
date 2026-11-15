// Quick answers in the Assistant: which project records a question needs (the area it names first, then the page the person is on), at most two sets.
const TOPICS = [
  [/\bftr\b|functional test|test results?|\bpass(ed|es)?\b|\bfail(ed|s|ing)?\b/, 'ftr'],
  [/\buat\b|test cases?|testers?|defects?|\bbugs?\b/, 'uat'],
  [/\bbrd\b|requirements?|\bscope\b|sign-?off/, 'brd'],
  [/hypercare|incidents?|after go-?live/, 'hypercare'],
  [/go-?live|cut-?over|launch|readiness/, 'golive'],
  [/handover|closure/, 'handover'],
  [/\bguides?\b|training|\bvideos?\b/, 'guide'],
  [/config(uration)?|\bfields?\b|\bforms?\b|state ?flows?|\bmodules?\b|\broles?\b/, 'config'],
  [/workshops?|\bsessions?\b|transcripts?|meetings?|minutes/, 'workshop'],
  [/\btasks?\b|overdue|\bdue\b|action items?|\bowners?\b|status report|this week|\bwsr\b/, 'wsr'],
  [/\bgaps?\b|open questions?|missing|blockers?|risks?/, 'gaps']
];
/** msg: the question; pageTask: the records of the page the person is on; allowed: the record sets the server knows. Returns one or two set names, the named area first. */
export function askTasks(msg, pageTask, allowed) {
  const t = String(msg || '').toLowerCase(), ok = x => (allowed || []).includes(x);
  const hits = TOPICS.filter(x => x[0].test(t) && ok(x[1])).map(x => x[1]);
  return [...new Set([...hits.slice(0, 1), ok(pageTask) ? pageTask : 'gaps'])].slice(0, 2);
}
