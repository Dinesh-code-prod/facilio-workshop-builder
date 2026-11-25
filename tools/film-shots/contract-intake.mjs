// Shot list for the Contract intake film (public/films/contract-intake.js). The demo project has no contract, so this writes a made-up one into the
// (copied) local data: a master agreement and an order form that disagree on hypercare (30 or 60 days), then the analysis, the documents check and three
// questions from the contract. Run with tools/film-capture.mjs contract-intake (on a copy of the local data: it changes the demo project).
const DOCS = [
  { id: 'd1', role: 'msa', label: 'Master agreement', name: 'Riverside Facilities MSA (signed).pdf', at: '2026-10-20T09:00:00Z', status: 'verified', verifiedBy: 'Priya R', verifiedAt: '2026-10-21T10:00:00Z',
    pages: [{ n: 1, text: 'Facilio will implement its connected CMMS for Riverside Towers: work order management, assets with QR tags and planned preventive maintenance for fourteen towers.' },
      { n: 2, text: 'Go-live is 18 January 2027, followed by 30 days of hypercare. Integration with SAP through an API is included.' }] },
  { id: 'd2', role: 'order', label: 'Order form', name: 'Order form 2026-114.pdf', at: '2026-10-22T09:00:00Z', status: 'read',
    pages: [{ n: 1, text: 'Licences for 120 technicians and 25 managers. Hypercare support: 60 days after go-live.' }] }];
const CHECK = { documents: [
    { id: 'd1', summary: 'Facilio implements work orders, assets with QR tags and preventive maintenance for fourteen towers; go-live 18 January 2027.', parties: ['Riverside Facilities', 'Facilio'], effectiveDate: '20 Oct 2026', term: '3 years', scope: ['Work orders', 'Assets', 'Preventive maintenance', 'SAP integration'], fees: '', sla: '' },
    { id: 'd2', summary: 'Licences for 120 technicians and 25 managers, and the hypercare period.', parties: ['Riverside Facilities'], effectiveDate: '22 Oct 2026', term: '', scope: [], fees: '', sla: '' }],
  conflicts: [{ topic: 'Hypercare length', docA: 'd1', quoteA: 'followed by 30 days of hypercare', docB: 'd2', quoteB: 'Hypercare support: 60 days after go-live', note: 'The order form is later and more specific. Confirm 60 days with the customer at the kick-off.', quoted: true }],
  supersedes: [{ doc: 'd2', clause: 'the hypercare period', of: 'd1' }], gaps: ['No acceptance criteria for the SAP integration.'], recommendations: ['Agree the SAP interface owner before the first workshop.'] };
const QUESTIONS = { items: [
  { id: 'qb_1', order: 1, state: 'kept', text: 'Which of the fourteen towers run two shifts, and who hands open work orders over between them?', category: 'workflow', track: 'core', module: 'workorder', why: 'handover rules', ref: 'MSA p.1', quote: 'work order management', priority: 'must', expected: 'names and times', history: [] },
  { id: 'qb_2', order: 2, state: 'kept', text: 'Which SAP version receives the purchase orders, who owns the API access, and what happens when it is down?', category: 'integration', track: 'connected', module: 'workorder', why: 'interface ownership', ref: 'MSA p.2', quote: 'Integration with SAP through an API', priority: 'must', expected: 'version, owner, fallback', history: [] },
  { id: 'qb_3', order: 3, state: 'kept', text: 'Are QR tags already on the assets, or does the asset register need tagging before go-live?', category: 'data', track: 'core', module: 'asset', why: 'data readiness', ref: 'MSA p.1', quote: 'assets with QR tags', priority: 'must', expected: 'yes or no, and who tags', history: [] }], summaries: [] };
const analysed = async (p, h) => { const d = await p.evaluate(([docs, check]) => { const M = FWBMsaDocs; return M.setAnalysis(M.setCheck({ docs }, check, 'Claude', '2026-11-24T09:00:00Z'), 'Priya R', '2026-11-24T09:05:00Z'); }, [DOCS, CHECK]);
  await h.putDoc('msa_text', d); await h.putDoc('rs_questions', QUESTIONS); await h.reload(); };
export default { id: 'contract-intake', quality: 38, shots: [
  { key: 'empty', view: 'msaintake', prep: async (p, h) => { await h.putDoc('msa_text', { docs: [] }); await h.putDoc('rs_questions', { items: [], summaries: [] }); await h.reload(); }, pos: { upload: '[data-act="uploadMsa"]', steps: '.md-steps' } },
  { key: 'docs', view: 'msaintake', prep: async (p, h) => { await h.putDoc('msa_text', { docs: DOCS }); await h.reload(); }, pos: { analyse: '[data-act="mdAnalyse"]', add: '[data-act="mdAdd"]', bar: '.md-an', steps: '.md-steps', list: ['text', 'Contract documents', '.main'] } },
  { key: 'analysed', view: 'msaintake', prep: analysed, pos: { bar: '.md-an', steps: '.md-steps', check: ['text', 'Check the documents together', '.main'] } },
  { key: 'disagree', view: 'msaintake', top: ['.md-c', 160], pos: { conflict: '.md-c', heading: ['text', 'Where the documents disagree', '.main'] } },
  { key: 'asked', view: 'rsquestions', top: [['text', 'Work Order', '.main'], 60], pos: { list: ['text', 'Which of the fourteen towers', '.main'], must: ['text', 'Must', '.main'] } }] };
