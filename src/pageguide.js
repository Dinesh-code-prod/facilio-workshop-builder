/* Plain-language help on the pages that confused people: a short "what is this page for" strip (V.pageGuide), an explained AI panel that replaces
   rows of blue / Ask Claude buttons (V.aiPanel), and for Training & Guides the bar of four separate tabs (V.trainTop) and, on the User Guide Builder only, the sources the drafts read (V.trainSources).
   Nothing here changes data: it reads what other pages keep and links to them. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const lsGet = k => { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { root.localStorage.setItem(k, v); } catch (e) { /* private window */ } };

  // key: [what it is for, steps, what comes next]
  const PG = {
    cfginputs: ['The Configuration Hub keeps everything configured for this customer in one place, and is the last step before the BRD. What you write here also feeds guides, test plans and handover.',
      ['Overview: see system modules, custom modules, relationships, connected apps and what still needs work.', 'Modules: describe each custom module in a few words. System modules are listed so nothing is missed.', 'Module relationships: say how modules connect (for example a work order creates a purchase request).', 'Connected apps and tabs: list the apps and the tabs each role sees.', 'Checks: fix anything flagged as unclear or missing.', 'Then use the Draft documents panel to turn it into a guide, UAT plan, training outline or handover.'], 'Next: write the BRD Draft. Training & Guides and UAT use the same inputs.'],
    guidebuilder: ['Write the customer\'s written user guide, section by section, from the project\'s records. You review every section before it counts.',
      ['Start a guide and choose the modules and the readers.', 'Let the AI draft each section, or write it yourself.', 'Edit, then approve each section.', 'Add logos and export to Word or PDF.'], ''],
    vidguide: ['Turn a screen recording you already have into draft guide steps. The video stays on this computer.',
      ['Open the video and capture the screens you need.', 'Paste or load the transcript.', 'Keep only the screenshots you want.', 'Let the AI draft the steps, then review them.'], ''],
    resources: ['A shared shelf for the notes and links the team keeps with the project: training links, recordings, reference documents.', ['Notes: write down what was said or decided. Web addresses in a note are clickable.', 'Tick Private on a note to keep it just for you: nobody else, and not the Claude project tools, can see it.', 'Links & resources: paste an address and the type and name are filled in; each card opens the page in a new tab.', 'Everyone on the project can open the shared ones.'], ''],
    dl_build: ['Tracks whether each in-scope module has been configured and tested by the Facilio team. It is the team\'s own status, before the customer tests.',
      ['Set each module to Not started, In progress, Ready for testing or Completed.', 'Check the build tasks from the plan for dates that have passed.', 'When all modules are Completed, move on to UAT.'], 'Next: UAT.'],
    dl_uat: ['User acceptance testing: the customer\'s own people try the system and confirm it does what they asked for. This page runs the whole thing, from writing the tests to closing the issues.',
      ['Prepare the tester guide, so people know what to do.', 'Write or generate the test cases for each module.', 'Run them and log every problem on the Issues board.', 'Fix, retest and close the issues.', 'Tick the readiness checklist and get the UAT sign-off.'], 'Next: Go-live.'],
    dl_golive: ['Answers one question: are we ready to switch on? It counts what is still open (sign-offs, tests, issues, risks, checklist) and tells you plainly.',
      ['Read the Readiness verdict and its open points.', 'Work through the Go-live checklist.', 'Close the go-live actions.', 'When the verdict says Ready, go live.'], 'Next: Hypercare and handover.'],
    ftr: ['The FTR (first-time-right) report in Excel: a scenario list the customer\'s testers run, with results, kept together in one workbook.', ['Add or import the scenarios.', 'Run them and record results.', 'Export the workbook for sign-off.'], ''],
    kpi: ['KPI workbooks: the measures the customer will track once the system is live.', ['Choose the KPIs that matter.', 'Fill in the definitions and targets.', 'Export for the customer.'], '']
  };
  V.pageGuide = key => {
    const g = PG[key]; if (!g) return '';
    const k = 'fwb_pg_' + key; const open = lsGet(k) !== '0';
    return `<details class="pg"${open ? ' open' : ''}><summary data-act="pgToggle" data-k="${esc(k)}"><b>What is this page for?</b><span>${open ? '' : esc(g[0].split('. ')[0] + '.')}</span></summary><div class="pg-b"><p>${esc(g[0])}</p><ol>${g[1].map(s => `<li>${esc(s)}</li>`).join('')}</ol>${g[2] ? `<p class="xs muted">${esc(g[2])}</p>` : ''}</div></details>`;
  };
  ACT.pgToggle = a => { const d = a.closest('details'); lsSet(a.getAttribute('data-k'), d && d.open ? '0' : '1'); };

  // ---------- the explained AI panel ----------
  // rows: [task, name, what it makes]; opts: { title, intro, open }
  V.aiPanel = (rows, o = {}) => {
    if (!V.aiButton || V.isCustomer() || S.readonly) return '';
    const how = `<div class="aip-how"><div><b>✦ Generate</b><span>DeepSeek writes a first draft inside Delivery Studio, from this project\'s records. Quick. It stays a draft until a person approves it.</span></div><div><b>Ask Claude</b><span>Sends the request to the Assistant box. Your Claude picks it up through the connector, writes it and saves it here as a draft. Better for long or polished writing.</span></div></div>`;
    return `<details class="card aip"${o.open ? ' open' : ''}><summary><b>${esc(o.title || 'Draft with AI')}</b><span class="small muted">${rows.map(r => esc(r[1])).join(' · ')}</span></summary><div class="aip-b">${o.intro ? `<p class="small" style="margin:0 0 10px">${esc(o.intro)}</p>` : ''}${how}<div class="aip-rows">${rows.map(r => `<div class="aip-row"><div><b>${esc(r[1])}</b><div class="xs muted">${esc(r[2] || '')}</div></div><div class="row" style="gap:6px;flex-wrap:wrap">${V.aiButton(r[0], 'Generate')}</div></div>`).join('')}</div></div></details>`;
  };

  // ---------- Training & Guides: the path and the sources ----------
  // the four pages are four separate tabs: [page, name, what only this tab does, icon]
  const TABS = [['guidebuilder', 'User Guide Builder', 'The customer\'s written guide, Word or PDF', 'book'], ['vidguide', 'Video to Guide', 'Guide steps from a recording you already have', 'mic']];
  const count = k => { try { const n = k === 'guidebuilder' ? I().list('ugd').length : k === 'resources' ? I().list('pnote').length + I().list('res').length : 0; return n ? `<em>${n}</em>` : ''; } catch (e) { return ''; } };
  const logoState = () => { const d = F.doc('brddoc'); const l = (d && d.logos) || {}; return { facilio: !!(l.facilio && l.facilio.fileId), customer: !!(l.customer && l.customer.fileId) }; };
  function sources() {
    const C = V.cfgInputs; const n = C && C.counts ? C.counts() : null; const cf = F.doc('config') || {}; const lg = logoState();
    const brd = V.signoffStatus ? V.signoffStatus('brd').status : 'notdue'; const nmod = Object.keys((S.baseline || {}).modules || {}).length;
    const item = (ok, title, text, btn) => `<div class="tp-src ${ok ? 'ok' : 'todo'}"><i>${ok ? '✓' : '!'}</i><div><b>${esc(title)}</b><div class="xs muted">${text}</div></div>${btn || ''}</div>`;
    const can = !V.isCustomer() && !S.readonly;
    return `<div class="card tp-srcs"><div class="card-h"><h3>What the drafts read</h3><span class="small muted">The more of these are filled in, the closer the guide is to your customer\'s real setup.</span></div><div class="tp-grid">
      ${item(brd === 'signed', 'BRD draft', brd === 'signed' ? 'Signed off. The guide follows the agreed requirements.' : 'Not signed off yet. Drafts will mark anything unconfirmed.', '<button class="btn sm" data-act="nav" data-view="brd">Open BRD</button>')}
      ${V.featureHidden('cfginputs') ? '' : item(n ? n.mods + n.rels + n.apps > 0 : false, 'Configuration Hub', n ? (n.mods + n.rels + n.apps) + ' custom module, relationship and app records.' : 'Custom modules, relationships and apps with their tabs.', '<button class="btn sm" data-act="nav" data-view="cfginputs">Open</button>')}
      ${V.featureHidden('orgpkg') ? '' : item(nmod > 0 && cf.source === 'imported', 'Org package', cf.source === 'imported' ? 'Loaded: ' + esc((cf.importedMeta || {}).sourceName || 'package') + ' (' + nmod + ' modules). The AI can see the real flows.' : 'Using the reference setup. Load the customer\'s own package so the flows match their organisation.', can ? '<button class="btn sm" data-act="importConfig">Load org package (.zip)</button>' : '')}
      ${item(lg.facilio && lg.customer, 'Logos', (lg.facilio ? 'Facilio logo added. ' : 'Facilio logo missing. ') + (lg.customer ? 'Customer logo added.' : 'Customer logo missing.') + ' Used on the cover and header of exported guides.', can ? '<button class="btn sm" data-act="brdLogos">Add logos</button>' : '')}</div></div>`;
  }
  V.trainTop = cur => `<nav class="tp-tabs" role="tablist" aria-label="Training &amp; Guides">${TABS.map(s => `<button type="button" role="tab" aria-selected="${s[0] === cur}" class="tp-tab${s[0] === cur ? ' on' : ''}" data-act="nav" data-view="${s[0]}"><span class="tp-ic">${V.ico ? V.ico(s[3]) : ''}</span><span class="tp-tx"><b>${esc(s[1])}${count(s[0])}</b><span>${esc(s[2])}</span></span></button>`).join('')}</nav>`;
  V.trainSources = sources;   // only the User Guide Builder reads these, so only that tab shows them

  // put the strips at the top of the page body without touching each page's own code
  const wrap = (name, key, fn) => { const o = V[name]; if (!o || !o.html || o._pg) return; const h = o.html; o._pg = 1; o.html = function () { const out = h.apply(this, arguments); const add = fn(); return typeof out === 'string' && add ? out.replace('<div class="page-body">', () => '<div class="page-body">' + add) : out; }; };
  // the team project dashboard had no export: a bar above it prints the whole page as it looks
  ACT.pdPrint = () => V.range.printLive(document.querySelector('.page-body'), ((S.project && S.project.name) || 'Project') + ' · Dashboard');
  wrap('projdash', 'projdash', () => (V.isCustomer() ? '' : '<div class="row no-print" style="justify-content:flex-end;margin:0 0 10px"><button class="btn sm" data-act="pdPrint" title="Print the whole dashboard, or save it as a PDF">Export dashboard as PDF</button></div>'));
  const train = k => () => V.trainTop(k) + V.pageGuide(k) + (k === 'guidebuilder' ? V.trainSources() : '');
  wrap('guidebuilder', 'guidebuilder', train('guidebuilder')); wrap('vidguide', 'vidguide', train('vidguide'));
  wrap('cfginputs', 'cfginputs', () => V.pageGuide('cfginputs')); wrap('ftr', 'ftr', () => V.pageGuide('ftr')); wrap('kpi', 'kpi', () => V.pageGuide('kpi'));
})(typeof window !== 'undefined' ? window : globalThis);
