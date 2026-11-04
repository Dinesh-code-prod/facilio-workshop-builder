/* Facilio tools shown inside Delivery Studio (pure code, also run by tests/webframe.mjs; roadmap E13).
   ONE allow-list drives three things: the tabs of the page (src/webframe.js), the check made before any address is put in a frame, and the exact host list in the
   page policy (frame-src and child-src in src/template.html). To add a site, add it here, then add the same host to the policy; the test fails if the two differ.
   Nothing here sends data to the sites. */
(function (root) {
  'use strict';
  // framedHost: the host the frame loads. alsoHosts: hosts the site may redirect to (the page policy must allow those too).
  const SITES = [
    { id: 'support-desk', title: 'Support Desk', url: 'https://support-desk.facilio.run/#/homepage', framedHost: 'support-desk.facilio.run', note: 'Raise and follow support tickets. Sign in there with your Facilio account.' },
    { id: 'meteor', title: 'Meteor', url: 'https://meteor.facilio.work/#/library', framedHost: 'meteor.facilio.work', note: 'Build Facilio prototypes with Claude. Use fictional sample data only.' },
    { id: 'comet', title: 'Comet', url: 'https://comet.facilio.work/', framedHost: 'comet.facilio.work', note: 'Product videos and guided walkthroughs.' },
    { id: 'facilio', title: 'facilio.com', url: 'https://facilio.com/', framedHost: 'facilio.com', alsoHosts: ['www.facilio.com'], note: 'The Facilio public website.' },
    { id: 'run', title: 'Facilio Run directory', url: 'https://facilio.run/', framedHost: 'facilio.run', note: 'The directory of internal Facilio sites.' }
  ];
  const siteById = id => SITES.find(s => s.id === id) || null;
  const hosts = () => SITES.flatMap(s => [s.framedHost].concat(s.alsoHosts || []));
  // https only, host exactly one of the allowed hosts, no sign-in details or custom port in the address; javascript:, data:, http: and look-alike hosts fail
  function isAllowed(url) {
    if (typeof url !== 'string' || !url || url !== url.trim()) return false;
    let u; try { u = new URL(url); } catch (e) { return false; }
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && hosts().includes(u.hostname);
  }
  const frameSrcHosts = () => hosts().filter((h, i, a) => a.indexOf(h) === i).map(h => 'https://' + h);
  const api = { SITES, siteById, isAllowed, frameSrcHosts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWebFrame = api;
})(typeof window !== 'undefined' ? window : globalThis);
