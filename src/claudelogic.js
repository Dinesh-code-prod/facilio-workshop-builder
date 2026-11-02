/* Open in Claude: the rules that every Claude button shares (pure code, also run by tests/claude_launch.mjs).
   - what goes in a link: Claude Desktop (claude://claude.ai/new?q=) and Claude on the web (https://claude.ai/new?q=) prefill the message box from "q". Desktop cuts q at about
     14,000 characters, and operating systems and browsers cap whole links, so a prompt whose ENCODED length is over the limit below is never put in a link (it would be cut without
     warning). It goes to the clipboard instead, or travels as a hand-off package that a short reference prompt points at.
   - the short reference prompt: tells Claude to use the Delivery Studio extension tools with the signed hand-off link.
   - the common header: every prompt says who is asking, where, what for and what happens to the answer. */
(function (root) {
  'use strict';
  const LIMIT = { web: 6500, desktop: 7500 };   // longest ENCODED prompt put in a link
  const BASE = { web: 'https://claude.ai/new', desktop: 'claude://claude.ai/new' };
  const enc = p => encodeURIComponent(String(p == null ? '' : p));
  // { href, prefilled } for 'web' or 'desktop'. A prompt that does not fit gives the plain link and prefilled:false, so the caller copies it and says so.
  function link(dest, prompt) { const d = dest === 'desktop' ? 'desktop' : 'web'; const q = enc(prompt); if (!String(prompt || '').trim() || q.length > LIMIT[d]) return { href: BASE[d], prefilled: false, tooLong: !!String(prompt || '').trim() }; return { href: BASE[d] + '?q=' + q, prefilled: true, tooLong: false }; }
  const fits = (dest, prompt) => enc(prompt).length <= LIMIT[dest === 'desktop' ? 'desktop' : 'web'];
  // the prompt Claude Desktop receives when the extension is installed: short, and carrying only the reference
  function refPrompt(title, ref) { return 'Delivery Studio hand-off: ' + String(title || 'task') + '\n\nUse the "Facilio Delivery Studio hand-off" tools: call get_current_task with the reference below, follow the instructions it returns (look at any pictures and documents with the tools that give them), and finish by sending the answer with submit_task_result.\n\nReference: ' + ref; }
  // m: { project, customer, page, module, title, destination }
  function wrap(prompt, m) { m = m || {};
    const head = ['You are helping a Facilio implementation consultant in Facilio Delivery Studio.', 'Project: ' + (m.project || 'not named') + (m.customer ? ' (customer: ' + m.customer + ')' : '') + (m.page ? '. Page: ' + m.page : '') + (m.module ? '. Module: ' + m.module : '') + '.', 'Task: ' + (m.title || 'as described below') + '.',
      'What happens to your answer: ' + (m.destination || 'it is brought back into Delivery Studio, shown as a preview, and saved only when the person confirms') + '.', 'Use only the material given here. Do not invent anything; mark anything unclear as uncertain.'].join('\n');
    return head + '\n\n' + String(prompt || ''); }
  // the answer format for the tasks that return a diagram, so the extension can tell Claude exactly what to send
  const FLOW_SHAPE = { title: 'string', nodes: [{ id: 'n1', label: 'string', kind: 'start|end|state|process|decision', confidence: 'detected|inferred|uncertain' }], edges: [{ from: 'n1', to: 'n2', label: 'string', confidence: 'detected|inferred|uncertain' }], notes: 'string' };
  const api = { LIMIT, link, fits, refPrompt, wrap, FLOW_SHAPE, enc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBClaude = api;
})(typeof window !== 'undefined' ? window : globalThis);
