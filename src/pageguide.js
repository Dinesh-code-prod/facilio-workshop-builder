/* Plain-language help on the pages that confused people: a short "what is this page for" strip (V.pageGuide), an explained AI panel that replaces
   rows of blue / Open in Claude / Add from Claude buttons (V.aiPanel), and for Training & Guides the four-step path and the sources the drafts read (V.trainTop).
   Nothing here changes data: it reads what other pages keep and links to them. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const lsGet = k => { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { root.localStorage.setItem(k, v); } catch (e) { /* private window */ } };

  // key: [what it is for, steps, what comes next]
  const PG = {
    cfginputs: ['Where you write down what is special about this customer\'s setup. The AI and the documents read it, so what you write here makes the guides, test plans and handover more accurate.',
      ['Custom modules: describe each module that is not standard Facilio, in a few words.', 'Module relationships: say how modules connect (for example a work order creates a purchase request).', 'Connected apps and tabs: list the apps and the tabs each role sees.', 'Checks: fix anything flagged as unclear or missing.', 'Then use the Draft documents panel to turn it into a guide, UAT plan, training outline or handover.'], 'Next: Training & Guides and UAT use these inputs.'],
    vstudio: ['Plan and brief a user guide, training outline or video for one module. It reads the configuration, the BRD draft, Configuration Inputs and the org package, so the story matches what was built.',
      ['Check the sources panel: BRD, Configuration Inputs, org package and logos.', 'Pick the module, what to make, who it is for, and the length.', 'Review what the project knows, then draft with DeepSeek, or open it in Claude for a polished result.', 'Bring the reply back and review it before it is used.'], 'Next: write the full written guide in the User Guide Builder.'],
    guidebuilder: ['Write the customer\'s written guide, section by section, from the project\'s records. You review every section before it counts.',
      ['Start a guide and choose the modules and the readers.', 'Let the AI draft each section, or write it yourself.', 'Edit, then approve each section.', 'Add logos and export to Word or PDF.'], 'Tip: a video you already have can become guide steps in Video to Guide.'],
    vidguide: ['Turn a recorded walkthrough into draft guide steps. The video stays on this computer.',
      ['Open the video and capture the screens you need.', 'Paste or load the transcript.', 'Keep only the screenshots you want.', 'Let the AI draft the steps, then review them.'], 'The result goes into a user guide draft.'],
    resources: ['A shared shelf for notes and links the team wants to keep with the project: training links, recordings, reference documents.', ['Add a note or link.', 'Give it a category so it is easy to find.', 'Everyone on the project can open it.'], ''],
    dl_build: ['Tracks whether each in-scope module has been configured and tested by the Facilio team. It is the team\'s own status, before the customer tests.',
      ['Set each module to Not started, In progress, Ready for testing or Completed.', 'Check the build tasks from the plan for dates that have passed.', 'When all modules are Completed, move on to UAT.'], 'Next: UAT.'],
    dl_uat: ['User acceptance testing: the customer\'s own people try the system and confirm it does what they asked for. This page runs the whole thing, from writing the tests to closing the issues.',
      ['Prepare the tester guide, so people know what to do.', 'Write or generate the test cases for each module.', 'Run them and log every problem on the Issues board.', 'Fix, retest and close the issues.', 'Tick the readiness checklist and get the UAT sign-off.'], 'Next: Go-live.'],
    dl_golive: ['Answers one question: are we ready to switch on? It counts what is still open (sign-offs, tests, issues, risks, checklist) and tells you plainly.',
      ['Read the Readiness verdict and its open points.', 'Work through the Go-live checklist.', 'Close the go-live actions.', 'When the verdict says Ready, go live.'], 'Next: Hypercare and handover.'],
    agenttest: ['Checks the Facilio AI agents against questions you expect real users to ask, before they go live.', ['Pick an agent.', 'Run its test questions.', 'Mark each answer as acceptable or not.', 'Fix the agent and run again.'], ''],
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
    const how = `<div class="aip-how"><div><b>✦ Generate</b><span>DeepSeek writes a first draft inside Delivery Studio, from this project\'s records. Quick. It stays a draft until a person approves it.</span></div><div><b>Open in Claude</b><span>Copies a ready prompt (project facts included) into your own Claude. Better for long or polished writing. Needs no key.</span></div><div><b>Add from Claude</b><span>Paste the reply you got back from Claude. It comes in as a draft to review, nothing is applied by itself.</span></div></div>`;
    return `<details class="card aip"${o.open ? ' open' : ''}><summary><b>${esc(o.title || 'Draft with AI')}</b><span class="small muted">${rows.map(r => esc(r[1])).join(' · ')}</span></summary><div class="aip-b">${o.intro ? `<p class="small" style="margin:0 0 10px">${esc(o.intro)}</p>` : ''}${how}<div class="aip-rows">${rows.map(r => `<div class="aip-row"><div><b>${esc(r[1])}</b><div class="xs muted">${esc(r[2] || '')}</div></div><div class="row" style="gap:6px;flex-wrap:wrap">${V.aiButton(r[0], 'Generate')}</div></div>`).join('')}</div></div></details>`;
  };

  // ---------- Training & Guides: the path and the sources ----------
  const STEPS = [['vstudio', 'Guides & Video Studio', 'Plan and brief a guide, training outline or video for one module.'], ['guidebuilder', 'User Guide Builder', 'Write the full written guide and export it to Word or PDF.'], ['vidguide', 'Video to Guide', 'Turn a recorded walkthrough into guide steps.'], ['resources', 'Notes & Links', 'Keep links and notes with the project.']];
  const logoState = () => { const d = F.doc('brddoc'); const l = (d && d.logos) || {}; return { facilio: !!(l.facilio && l.facilio.fileId), customer: !!(l.customer && l.customer.fileId) }; };
  function sources() {
    const C = V.cfgInputs; const n = C && C.counts ? C.counts() : null; const cf = F.doc('config') || {}; const lg = logoState();
    const brd = V.signoffStatus ? V.signoffStatus('brd').status : 'notdue'; const nmod = Object.keys((S.baseline || {}).modules || {}).length;
    const item = (ok, title, text, btn) => `<div class="tp-src ${ok ? 'ok' : 'todo'}"><i>${ok ? '✓' : '!'}</i><div><b>${esc(title)}</b><div class="xs muted">${text}</div></div>${btn || ''}</div>`;
    const can = !V.isCustomer() && !S.readonly;
    return `<div class="card tp-srcs"><div class="card-h"><h3>What the drafts read</h3><span class="small muted">The more of these are filled in, the closer the guide or video is to your customer\'s real setup.</span></div><div class="tp-grid">
      ${item(brd === 'signed', 'BRD draft', brd === 'signed' ? 'Signed off. The guide follows the agreed requirements.' : 'Not signed off yet. Drafts will mark anything unconfirmed.', '<button class="btn sm" data-act="nav" data-view="brd">Open BRD</button>')}
      ${item(n ? n.mods + n.rels + n.apps > 0 : false, 'Configuration Inputs', n ? (n.mods + n.rels + n.apps) + ' custom module, relationship and app records.' : 'Custom modules, relationships and apps with their tabs.', '<button class="btn sm" data-act="nav" data-view="cfginputs">Open</button>')}
      ${item(nmod > 0 && cf.source === 'imported', 'Org package', cf.source === 'imported' ? 'Loaded: ' + esc((cf.importedMeta || {}).sourceName || 'package') + ' (' + nmod + ' modules). The AI can see the real flows.' : 'Using the reference setup. Load the customer\'s own package so the flows match their organisation.', can ? '<button class="btn sm" data-act="importConfig">Load org package (.zip)</button>' : '')}
      ${item(lg.facilio && lg.customer, 'Logos', (lg.facilio ? 'Facilio logo added. ' : 'Facilio logo missing. ') + (lg.customer ? 'Customer logo added.' : 'Customer logo missing.') + ' Used on the cover and header of exported guides.', can ? '<button class="btn sm" data-act="brdLogos">Add logos</button>' : '')}</div></div>`;
  }
  V.trainTop = cur => `<div class="tp-path">${STEPS.map((s, i) => `<button type="button" class="tp-step${s[0] === cur ? ' on' : ''}" data-act="nav" data-view="${s[0]}"><i>${i + 1}</i><b>${esc(s[1])}</b><span>${esc(s[2])}</span></button>`).join('')}</div>${cur === 'vstudio' || cur === 'guidebuilder' ? sources() : ''}`;

  // put the strips at the top of the page body without touching each page's own code
  const wrap = (name, key, fn) => { const o = V[name]; if (!o || !o.html || o._pg) return; const h = o.html; o._pg = 1; o.html = function () { const out = h.apply(this, arguments); const add = fn(); return typeof out === 'string' && add ? out.replace('<div class="page-body">', () => '<div class="page-body">' + add) : out; }; };
  const train = k => () => V.pageGuide(k) + V.trainTop(k);
  wrap('vstudio', 'vstudio', train('vstudio')); wrap('guidebuilder', 'guidebuilder', train('guidebuilder')); wrap('vidguide', 'vidguide', train('vidguide')); wrap('resources', 'resources', train('resources'));
  wrap('cfginputs', 'cfginputs', () => V.pageGuide('cfginputs')); wrap('agenttest', 'agenttest', () => V.pageGuide('agenttest')); wrap('ftr', 'ftr', () => V.pageGuide('ftr')); wrap('kpi', 'kpi', () => V.pageGuide('kpi'));
})(typeof window !== 'undefined' ? window : globalThis);
