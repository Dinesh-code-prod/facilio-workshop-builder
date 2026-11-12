/* Assistant routing: the pure rules that turn a message (and the model's first reading of it) into a level of work and the engine that does it.
   No network, no database: used by /assistant/route in api.mjs and by tests/route_eval.mjs.
   Engines: project = Project AI (DeepSeek answering from the project records, at once); deepseek = DeepSeek for routine text work on what the person gives
   (rewrite, summarise, reformat, extract, classify), at once; claude = the person's own Claude through the job queue (reasoning, changes, several sources,
   anything risky). Claude orchestrates the work it receives: it may hand routine sub-parts to DeepSeek (project_jobs action delegate) and checks them.
   Levels: simple, standard, advanced, complex, critical. The rules only ever raise a level the model gave; Claude can still decide a job is bigger. */

export const TIERS = ['simple', 'standard', 'advanced', 'complex', 'critical'];
export const ENGINES = { project: 'Project AI', deepseek: 'DeepSeek', claude: 'Claude' };

const W = (re, s) => re.test(s);
const ROUTINE = /\b(rewrite|re-?word|rephrase|reformat|format|shorten|tidy|polish|proof-?read|fix (the )?(grammar|spelling)|translate|summari[sz]e|summary of (this|the following|below)|extract|pull out|list the (names|dates|emails)|classify|categori[sz]e|convert (this|to)|turn (this|it|this \w+|the \w+) into|as a table|into a (table|list|bullet list))\b/i;
const ANALYSIS = /\b(compare|comparison|validate|validation|review|audit|analy[sz]e|analysis|assess|identify (gaps|missing|risks)|find (gaps|missing)|missing (information|permissions?)|why (is|does|isn'?t|doesn'?t)|root cause|debug|troubleshoot|explain why|cross-?module|dependenc)/i;
const BUILD = /\b(generate|build|design|architect|architecture|prepare|draft|create|write|plan|propose|redo|revamp|rebuild|overhaul)\b/i;
const MULTI = /\b(all|every|multiple|several|across|each|entire|whole|full|complete|end-to-end|both)\b|\btranscripts\b|\bdocuments\b|\bmodules\b|\bsessions\b/i;
const TECH = /\b(script|scripts|xml|org(anization)? (xml|config)|configuration|config|state ?flow|transition|workflow|permission|roles?|api|integration|field|form builder|formula|sql|json|code)\b/i;
const DOCS = /\b(brd|transcripts?|msa|contract|workshop|minutes|uat|ftr|test (cases|scenarios)|solution|requirements?)\b/i;
const RISK = /\b(send|email the customer|delete|remove all|sign-?off|approve|go-?live|production|contract|invoice|price|fee|commercial)\b/i;
const CHANGE = /\b(update|change|make|create|write|draft|fix|add|remove|delete|replace|rename|generate|build|prepare)\b/i;

/** the level of work and the engine for one message.
    route: the model's reading (lookup | help | small | heavy | unclear), or the plain-rules guess when the model was not available.
    Returns { tier, engine, label, score, dims, why } */
export function assess(message, route) {
  const m = String(message || ''), r = ['lookup', 'help', 'small', 'heavy', 'unclear'].includes(route) ? route : 'small';
  const h = m.indexOf(': ') > 0 ? m.slice(0, m.indexOf(': ')) : m;   // the ask is before a colon; text pasted after it is the material, not the request
  const steps = (h.match(/\b(and then|then|also|after that|next)\b|;|\n/gi) || []).length;
  const dims = {
    steps: steps >= 3 ? 2 : steps >= 1 ? 1 : 0,                                    // how many things to do in a row
    context: W(MULTI, h) && W(DOCS, h) ? 2 : W(DOCS, h) ? 1 : 0,                     // how much of the project it must read
    reasoning: W(ANALYSIS, h) ? 2 : W(BUILD, h) && !W(ROUTINE, h) ? 1 : 0,           // compare, validate, explain why, design
    technical: W(TECH, h) ? (W(ANALYSIS, h) ? 2 : 1) : 0,                             // scripts, configuration, state flows, permissions
    risk: W(RISK, h) ? 2 : 0,                                                       // reaches the customer, deletes, money or sign-off
    size: m.length > 400 ? 2 : m.length > 160 ? 1 : 0                                // a long ask is rarely a one-liner
  };
  let score = Object.values(dims).reduce((a, b) => a + b, 0) + (r === 'heavy' ? 3 : r === 'small' ? 1 : 0);
  const given = m.indexOf(': ') > 0 || /\b(this|these|below|following|above|the text)\b/i.test(h);   // routine work is on text the person supplies; "summarise the project decisions" is a look-up
  const routine = given && W(ROUTINE, h) && !W(ANALYSIS, h) && dims.context < 2 && dims.technical < 2;
  if (routine) score = Math.max(0, score - 2);
  let tier = score <= 1 ? 'simple' : score <= 3 ? 'standard' : score <= 5 ? 'advanced' : score <= 7 ? 'complex' : 'critical';
  if (dims.risk && (r === 'small' || r === 'heavy') && TIERS.indexOf(tier) < 2) tier = 'advanced';   // a change that reaches the customer or money is never treated as simple
  if (r === 'heavy' && TIERS.indexOf(tier) < 3) tier = 'complex';
  const changes = r === 'small' || r === 'heavy' || (r === 'unclear' && W(CHANGE, m));
  let engine, why;
  if (routine && TIERS.indexOf(tier) <= 1 && !dims.risk) { engine = 'deepseek'; why = 'routine text work on what you gave'; }
  else if ((r === 'lookup' || r === 'help') && TIERS.indexOf(tier) <= 1) { engine = 'project'; why = r === 'help' ? 'a question about the Studio itself' : 'answered from the project records'; }
  else if (!changes && TIERS.indexOf(tier) <= 1) { engine = 'project'; why = 'answered from the project records'; }
  else { engine = 'claude'; why = tier === 'critical' ? 'high impact: Claude does it and you approve the result' : changes ? 'it changes the project, so Claude does it' : 'it needs deeper reasoning over several sources'; }
  return { tier, engine, label: ENGINES[engine], score, dims, why };
}
