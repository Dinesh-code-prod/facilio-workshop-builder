/* Switches for parts of the app that are built but not shown. A switch set to false hides its pages everywhere (menu, tabs, search, buttons, guides); set it to true to show them again.
   Nothing is deleted: the code, the saved records and the connector tools stay as they are. */
(function (root) {
  'use strict';
  const V = root.FWBViews = root.FWBViews || {};
  V.FEATURES = Object.assign({ orgPackage: false }, V.FEATURES);
  const HIDDEN_WITH = { orgPackage: ['cfginputs', 'pkgan', 'orgpkg'] };
  V.featureHidden = view => Object.keys(HIDDEN_WITH).some(k => !V.FEATURES[k] && HIDDEN_WITH[k].includes(view));
})(typeof window !== 'undefined' ? window : globalThis);
