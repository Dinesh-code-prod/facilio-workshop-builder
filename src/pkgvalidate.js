/* Static validation of a Facilio organisation package (roadmap E2 item 5): PackageConf.xml plus components/<TYPE>.xml, given as {path: text}.
   Pure code: no DOM, no network; runs in the browser (window.FWBPkgValidate) and in Node tests. It reads the files with its own small XML reader, so the
   same code runs everywhere; when a DOMParser is available (options.DOMParser or the global one) a file must be well-formed for it as well.
   Rules are only those the repository can prove from the real sample package (tests/fixtures/orgpkg-sample) and from src/orgpkg.js verify():
   PackageConf lists exactly the component files, records have the sample's attributes, identifiers are unique, Parent_Id matches the module's identifier,
   views point at view groups, fields at modules. Anything that depends on the live organisation (modules, states, view groups that are not in the package)
   is a warning, not an error, unless the caller says what the organisation has (options.knownModules, options.knownViewGroups).
   The best result is "passed static checks". This never says a package is deployable, and the report always lists what it did NOT prove. */
(function (root) {
  'use strict';
  const VERSION = 'pkgvalidate/1';
  const MAX_BYTES = 5 * 1024 * 1024;
  const NOT_CHECKED = ['Runtime behaviour: whether the organisation accepts the import, and what the imported records do.',
    'Schema validity against Facilio\'s own schema: only the structure seen in the sample package is checked, not Facilio\'s schema.',
    'Dependencies on the live organisation: modules, states, view groups, roles and users that are not in the package were not looked up.',
    'View columns against fields, notification and workflow content, scripts and templates.',
    'Whether new Unique_Identifier numbers are accepted by the organisation.'];
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' };

  // ---------- a small strict XML reader (tree of {tag, attrs, kids, text}); DOCTYPE and entity declarations are refused ----------
  function parseXml(src) {
    let i = src.charCodeAt(0) === 0xFEFF ? 1 : 0; const n = src.length; const stack = []; let rootNode = null; const fail = m => ({ error: m + ' (character ' + i + ')' });
    const OPEN = /<([A-Za-z_][\w.:-]*)((?:\s+[A-Za-z_][\w.:-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y; const ATTR = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g; const CLOSE = /<\/([A-Za-z_][\w.:-]*)\s*>/y;
    const BADENT = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/; const BADCH = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/;
    const dec = s => s.replace(/&(amp|lt|gt|quot|apos);/g, (m, k) => ENT[k]).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Math.min(+d, 0x10FFFF))).replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10FFFF)));
    while (i < n) {
      const lt = src.indexOf('<', i); const text = src.slice(i, lt < 0 ? n : lt);
      if (text) { if (BADCH.test(text)) return fail('invalid character'); if (BADENT.test(text)) return fail('invalid entity'); if (stack.length) stack[stack.length - 1].text += dec(text); else if (text.trim()) return fail('text outside the root element'); }
      if (lt < 0) break; i = lt;
      if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); if (e < 0) return fail('unterminated comment'); i = e + 3; continue; }
      if (src.startsWith('<![CDATA[', i)) { const e = src.indexOf(']]>', i); if (e < 0 || !stack.length) return fail('bad CDATA section'); stack[stack.length - 1].text += src.slice(i + 9, e); i = e + 3; continue; }
      if (src.startsWith('<?', i)) { const e = src.indexOf('?>', i); if (e < 0) return fail('unterminated processing instruction'); i = e + 2; continue; }
      if (src.startsWith('<!', i)) return fail('DOCTYPE and entity declarations are not accepted');
      if (src[i + 1] === '/') { CLOSE.lastIndex = i; const m = CLOSE.exec(src); if (!m) return fail('bad closing tag'); const top = stack.pop(); if (!top || top.tag !== m[1]) return fail('closing tag </' + m[1] + '> does not match ' + (top ? '<' + top.tag + '>' : 'anything open')); i = CLOSE.lastIndex; continue; }
      OPEN.lastIndex = i; const m = OPEN.exec(src); if (!m) return fail('bad tag'); const node = { tag: m[1], attrs: {}, kids: [], text: '' }; let a; ATTR.lastIndex = 0;
      while ((a = ATTR.exec(m[2]))) { const v = a[2] != null ? a[2] : a[3]; if (a[1] in node.attrs) return fail('attribute ' + a[1] + ' is repeated'); if (BADENT.test(v) || BADCH.test(v)) return fail('invalid attribute value'); node.attrs[a[1]] = dec(v); }
      if (stack.length) stack[stack.length - 1].kids.push(node); else if (rootNode) return fail('more than one root element'); else rootNode = node;
      i = OPEN.lastIndex; if (!m[3]) stack.push(node);
    }
    if (stack.length) return { error: 'element <' + stack[stack.length - 1].tag + '> is never closed' }; if (!rootNode) return { error: 'no root element' };
    return { root: rootNode };
  }
  const kid = (n, t) => n.kids.find(k => k.tag === t); const kt = (n, t) => { const k = kid(n, t); return k ? k.text.trim() : ''; };
  const bytes = s => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : s.length);

  /* validatePackage(files, options): options = { DOMParser?, maxFileBytes?, sizes?: {path: bytes} (when files are too large to hold as text),
       knownModules?: [names the organisation has], knownViewGroups?: ['<module>|<group>'] }
     -> { ok, status, errors[], warnings[], checked[], notChecked[], version } with entries { rule, file, message }. */
  function validatePackage(files, options) {
    options = options || {}; files = files || {}; const errors = [], warnings = [], checked = []; const E = (rule, file, message) => errors.push({ rule, file, message }); const W = (rule, file, message) => warnings.push({ rule, file, message });
    const max = options.maxFileBytes || MAX_BYTES; const DP = options.DOMParser || (typeof DOMParser !== 'undefined' ? DOMParser : null); const paths = Object.keys(files);
    // 1. path and size safety
    paths.forEach(p => {
      const segs = p.split('/'); const bad = /^[\\/]/.test(p) || /^[A-Za-z]:/.test(p) || p.includes('\\') || segs.includes('..') || segs.includes('.') || segs.some(s => s === '') && !p.endsWith('/') || !/^[A-Za-z0-9_\-./]+$/.test(p) || p.length > 200;
      if (bad) E('unsafe-path', p, 'The file name is not a plain relative path (no "..", no leading slash or drive letter, no backslash, only letters, digits, _ - . and /).');
      const sz = options.sizes && options.sizes[p] != null ? options.sizes[p] : typeof files[p] === 'string' ? bytes(files[p]) : -1;
      if (typeof files[p] !== 'string' && !(options.sizes && options.sizes[p] != null)) E('not-text', p, 'The file is not text.'); else if (sz > max) E('too-large', p, 'The file is ' + Math.round(sz / 1024) + ' KB, over the limit of ' + Math.round(max / 1024) + ' KB.');
    });
    checked.push('Path and size safety of ' + paths.length + ' file(s) (limit ' + Math.round(max / 1024 / 1024 * 10) / 10 + ' MB each).');
    const safe = p => !errors.some(e => e.file === p && (e.rule === 'unsafe-path' || e.rule === 'not-text' || e.rule === 'too-large'));
    // 2. well-formed XML
    const trees = {}; let xmlCount = 0;
    const read = p => {
      if (trees[p] !== undefined) return trees[p]; const r = parseXml(files[p]); xmlCount++;
      if (!r.error && DP) { try { const d = new DP().parseFromString(files[p], 'text/xml'); if (!d.documentElement || (d.getElementsByTagName && d.getElementsByTagName('parsererror').length)) r.error = 'the XML parser reports an error'; } catch (e) { r.error = 'the XML parser reports an error'; } }
      if (r.error) E('malformed-xml', p, 'Not well-formed XML: ' + r.error + '.'); return (trees[p] = r.error ? null : r.root);
    };
    // 3. PackageConf.xml against the files
    const conf = files['PackageConf.xml'] != null && safe('PackageConf.xml') ? read('PackageConf.xml') : null;
    if (files['PackageConf.xml'] == null) E('missing-file', 'PackageConf.xml', 'PackageConf.xml is missing.');
    const listed = []; if (conf) {
      if (conf.tag !== 'Package') E('package-root', 'PackageConf.xml', 'The root element is <' + conf.tag + '>, the sample has <Package>.');
      const comps = kid(conf, 'Components'); (comps ? comps.kids.filter(k => k.tag === 'Component') : []).forEach(c => { const f = 'components/' + c.text.trim(); if (listed.includes(f)) E('duplicate-listing', 'PackageConf.xml', f + ' is listed twice.'); listed.push(f); if (c.attrs.Type && c.text.trim() !== c.attrs.Type + '.xml') W('component-name', 'PackageConf.xml', 'Component Type="' + c.attrs.Type + '" names the file ' + c.text.trim() + ' (the sample names it ' + c.attrs.Type + '.xml).'); });
      if (!comps) E('package-components', 'PackageConf.xml', 'PackageConf.xml has no <Components> list.');
      checked.push('PackageConf.xml is well-formed and lists ' + listed.length + ' component file(s).');
    }
    const compFiles = paths.filter(p => /^components\//.test(p) && !p.endsWith('/'));
    if (conf) { listed.forEach(f => { if (files[f] == null) E('missing-file', f, 'PackageConf.xml lists ' + f + ' but the file is not in the package.'); }); compFiles.forEach(f => { if (!listed.includes(f)) E('unlisted-file', f, f + ' is in the package but PackageConf.xml does not list it.'); }); }
    paths.filter(p => p !== 'PackageConf.xml' && !/^components\//.test(p) && !/^metafiles\//.test(p) && p !== 'error-log.txt' && !p.endsWith('/')).forEach(p => W('unexpected-file', p, 'This file is not part of the sample package layout (PackageConf.xml, components/, metafiles/, error-log.txt).'));
    if (conf && !listed.length && !compFiles.length) W('empty-package', 'PackageConf.xml', 'The package has no component files: there is nothing to import.');
    checked.push('Every file PackageConf.xml lists exists, and every file in components/ is listed (' + compFiles.length + ' component file(s)).');
    // 4. component files: records, identifiers
    const recs = {}; const idsSeen = new Map(); let nrec = 0;
    compFiles.filter(f => /\.xml$/.test(f) && safe(f)).forEach(f => {
      const r = read(f); if (!r) return; const T = f.slice(11, -4); recs[T] = []; if (r.tag !== 'Components') E('component-root', f, 'The root element is <' + r.tag + '>, the sample has <Components>.');
      const own = new Set();
      r.kids.forEach(k => { nrec++; recs[T].push(k); if (k.tag !== T) E('record-type', f, 'A <' + k.tag + '> record is in the ' + T + ' file.');
        const u = k.attrs.Unique_Identifier; if (!u) E('record-id', f, 'A <' + k.tag + '> record has no Unique_Identifier.'); else if (own.has(u)) E('duplicate-id', f, 'Unique_Identifier ' + u + ' is used more than once in this file.'); else { own.add(u); if (idsSeen.has(u)) W('duplicate-id-across-files', f, 'Unique_Identifier ' + u + ' is also used in ' + idsSeen.get(u) + '. The sample does not show whether identifiers must be unique across component types.'); else idsSeen.set(u, f); }
        ['Created_Version', 'Modified_Version', 'Status', 'Type'].filter(a => !k.attrs[a]).forEach(a => W('record-attribute', f, 'A <' + k.tag + '> record has no ' + a + ' attribute (every record of the sample has one).')); });
    });
    checked.push('Component files are well-formed (' + xmlCount + ' XML file(s) read), with ' + nrec + ' record(s) named after their file, and Unique_Identifier present and not repeated within a file.');
    // 5. reference integrity, for the references src/orgpkg.js already knows
    const mods = new Map(); (recs.MODULE || []).forEach(m => mods.set(kt(m, 'name'), m.attrs.Unique_Identifier)); const known = new Set(options.knownModules || []); const groups = new Set(); let nref = 0;
    (recs.VIEW_GROUP || []).forEach(g => groups.add(kt(g, 'ModuleName') + '|' + kt(g, 'Name'))); (options.knownViewGroups || []).forEach(g => groups.add(g));    const modRef = (f, who, m, rec) => { nref++; if (!m) { E('reference', f, who + ' names no module.'); return; }
      if (mods.has(m)) { if (rec && rec.attrs.Parent_Id && rec.attrs.Parent_Id !== mods.get(m) && rec.tag !== 'MODULE') E('parent-id', f, who + ': Parent_Id ' + rec.attrs.Parent_Id + ' is not the identifier (' + mods.get(m) + ') of module ' + m + ' in this package.'); return; }
      if (known.has(m)) return; if (options.knownModules) E('reference', f, who + ' refers to module ' + m + ', which is neither in the package nor in the organisation\'s module list given.'); else W('reference-org', f, who + ' refers to module ' + m + ', which is not in the package. It is assumed to exist in the organisation; this was not checked.'); };
    (recs.FIELD || []).forEach(r => { modRef('components/FIELD.xml', 'Field ' + kt(r, 'name'), kt(r, 'moduleName'), r); if (kt(r, 'DataType') === '7' && kt(r, 'lookupModuleName')) { const l = kt(r, 'lookupModuleName'); if (!mods.has(l) && !known.has(l)) { nref++; if (options.knownModules) E('reference', 'components/FIELD.xml', 'Lookup field ' + kt(r, 'name') + ' points to module ' + l + ', which is not in the package or the module list given.'); else W('reference-org', 'components/FIELD.xml', 'Lookup field ' + kt(r, 'name') + ' points to module ' + l + ', which is not in the package (assumed to exist in the organisation; not checked).'); } } });
    (recs.TICKET_STATUS || []).forEach(r => modRef('components/TICKET_STATUS.xml', 'State ' + kt(r, 'status'), kt(r, 'parentModuleName'), r));
    (recs.STATE_FLOW || []).forEach(r => modRef('components/STATE_FLOW.xml', 'State flow ' + kt(r, 'name'), kt(r, 'moduleName'), r));
    (recs.STATE_TRANSITION || []).forEach(r => modRef('components/STATE_TRANSITION.xml', 'Transition ' + kt(r, 'name'), kt(r, 'moduleName'), r));
    (recs.NOTIFICATION || []).forEach(r => modRef('components/NOTIFICATION.xml', 'Notification ' + kt(r, 'name'), kt(r, 'moduleName'), r));
    (recs.VIEW_GROUP || []).forEach(r => modRef('components/VIEW_GROUP.xml', 'View group ' + kt(r, 'Name'), kt(r, 'ModuleName'), r));
    (recs.VIEW || []).forEach(r => { const m = kt(r, 'moduleName'); modRef('components/VIEW.xml', 'View ' + kt(r, 'name'), m, r); const g = kt(r, 'ViewGroupName'); if (g) { nref++; if (!groups.has(m + '|' + g)) { if (options.knownViewGroups) E('reference', 'components/VIEW.xml', 'View ' + kt(r, 'name') + ' is in view group ' + g + ' of ' + m + ', which is neither in the package nor in the view groups given.'); else W('reference-org', 'components/VIEW.xml', 'View ' + kt(r, 'name') + ' is in view group ' + g + ' of ' + m + ', which is not in the package (assumed to exist in the organisation; not checked).'); } } });
    checked.push(nref + ' reference(s): record to module (and Parent_Id against the module identifier in the package), view to view group, lookup field to module.');
    const ok = errors.length === 0;
    return { ok, status: ok ? 'passed static checks' : 'failed static checks', errors, warnings, checked, notChecked: NOT_CHECKED.slice(), version: VERSION };
  }
  const api = { validatePackage, parseXml, VERSION, NOT_CHECKED, MAX_BYTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBPkgValidate = api;
})(typeof window !== 'undefined' ? window : globalThis);
