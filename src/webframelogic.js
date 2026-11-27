/* Facilio tools shown inside Delivery Studio (pure code, also run by tests/webframe.mjs; roadmap E13).
   ONE allow-list drives three things: the tabs of the page (src/webframe.js), the check made before any address is put in a frame, and the exact host list in the
   page policy (frame-src and child-src in src/template.html). To add a site, add it here, then add the same host to the policy; the test fails if the two differ.
   Nothing here sends data to the sites. */
(function (root) {
  'use strict';
  // framed: false = the site's own rules (frame-ancestors, or a sign-in page that refuses framing) stop it showing inside another page; the page shows a small card with Open in a new tab / Open in a window instead of a frame.
  // framedHost: the host the frame loads. alsoHosts: hosts the site may redirect to (the page policy must allow those too).
  const SITES = [
    { id: 'support-desk', title: 'Support Desk', url: 'https://support-desk.facilio.work/#/homepage', framedHost: 'support-desk.facilio.work', note: 'The support team\'s ticket desk (help@facilio.com). You need access on Support Desk\'s own list. If it stays blank, use Open in a window once to sign in.' },   // moved from facilio.run (24 Nov 2026): same site as the Studio, so it shows inside
    { id: 'meteor', title: 'Meteor', url: 'https://meteor.facilio.work/#/library', framedHost: 'meteor.facilio.work', note: 'Build Facilio prototypes with Claude. Use fictional sample data only.' },
    { id: 'comet', title: 'Comet', url: 'https://comet.facilio.work/', framedHost: 'comet.facilio.work', note: 'Product videos and guided walkthroughs.' },
    { id: 'facilio', title: 'facilio.com', url: 'https://facilio.com/', framedHost: 'facilio.com', alsoHosts: ['www.facilio.com'], framed: false, note: 'The Facilio public website.' },
    { id: 'run', title: 'Facilio Run', url: 'https://facilio.run/', framedHost: 'facilio.run', framed: false, list: true, note: 'Internal Facilio sites. Every Facilio employee can open them; each opens in a new tab.' }
  ];
  // the Facilio Run sites chosen for the delivery team (27 Nov 2026, docs/plans/FACILIO-RUN-INTEGRATION-PLAN-2026-11-27.md). Sites that do work the Studio already does are left out on purpose.
  const RUN_GROUPS = [
    { title: 'Implementation toolkit', sites: [
      { name: 'impl-ai-hub', note: 'AI tools for implementation: install /facilio-impl-toolbox once for FTR, UAT and configuration skills.' },
      { name: 'packaging-docs', note: 'Sandbox copy, package and install, for implementers.' },
      { name: 'pm-v3-guide', note: 'PM V3: how the modules fit, import guide and field reference.' },
      { name: 'pm-v3-import-guide', note: 'PM V3 import: module flow, associations and sample sheets.' },
      { name: 'org-kb-builder', note: 'Build and publish an org\'s Org Docs knowledge base.' },
      { name: 'dashcopy-doctor', note: 'Check a dashboard against another org before copying it.' },
      { name: 'integration-checklist', note: 'Integration checklists per org and application.' }] },
    { title: 'Knowledge', sites: [
      { name: 'knowflow', note: 'Standard operating procedures: browse, preview, download.' },
      { name: 'unique-use-case', note: 'Solutions Library: unique implementation use cases and what worked.' },
      { name: 'fsm-builds', note: 'FSM build library: custom use cases, widgets, scripts and tools.' },
      { name: 'solution-studio', note: 'Demo configuration team: use case library and solution write-ups.' },
      { name: 'helpdesk-guide', note: 'Facilio Helpdesk product guide, step by step.' },
      { name: 'facilio-services', note: 'Production service directory with regional domains.' },
      { name: 'code-shelf', note: 'Shared library of reference code snippets.' },
      { name: 'trainimaterials', note: 'Internal training video academy.' }] },
    { title: 'Find any site', sites: [
      { name: 'run-index', note: 'Live, searchable index of every Facilio Run page.' }] }
  ];
  const runSiteUrl = name => 'https://' + name + '.facilio.run/';
  const siteById = id => SITES.find(s => s.id === id) || null;
  const hosts = () => SITES.flatMap(s => [s.framedHost].concat(s.alsoHosts || []));
  // https only, host exactly one of the allowed hosts, no sign-in details or custom port in the address; javascript:, data:, http: and look-alike hosts fail
  function isAllowed(url) {
    if (typeof url !== 'string' || !url || url !== url.trim()) return false;
    let u; try { u = new URL(url); } catch (e) { return false; }
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && hosts().includes(u.hostname);
  }
  const frameSrcHosts = () => hosts().filter((h, i, a) => a.indexOf(h) === i).map(h => 'https://' + h);
  const api = { SITES, siteById, isAllowed, frameSrcHosts, RUN_GROUPS, runSiteUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWebFrame = api;
})(typeof window !== 'undefined' ? window : globalThis);
