(function () {
  "use strict";
  var VIDEO_URL = "";               /* paste a YouTube / Vimeo / Loom embed URL here to show the Video button */
  var STORE_KEY = "facilio-onboarding-workspace-v1";
  var RH = 28, MIN_ROWS = 60, EXTRA_ROWS = 25;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function normH(s) { return String(s == null ? "" : s).toLowerCase().replace(/\*/g, " ").replace(/\([^)]*\)?/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); }
  function nv(s) { return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " "); }
  function cleanHeader(h) { return String(h).replace(/\*/g, "").replace(/\([^)]*\)?/g, "").replace(/\s+/g, " ").trim(); }
  function colLetter(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

  /* ---------------- table definitions (from the template) ---------------- */
  var ENT = {}; RULES.entities.forEach(function (e) { ENT[e.key] = e; });
  var TABLES = {};
  var CAT_TABLE = { key: "cat", sheet: "Asset Category Master", titles: [], headerRow: 1, descRow: null, headers: ["Asset Category"], descs: ["Categories offered in the Asset sheet's Asset Category dropdown."], widths: [42] };
  function buildTable(t) {
      var ent = ENT[t.key];
      var cols = t.headers.map(function (h, i) {
        var key = null;
        if (ent) Object.keys(ent.columns).some(function (k) { if (ent.columns[k].h.some(function (a) { return normH(a) === normH(h); })) { key = k; return true; } return false; });
        var meta = ent && key ? ent.columns[key] : {};
        return { d: i, h: h, label: cleanHeader(h), req: /\*/.test(h) || !!meta.req, desc: t.descs[i] || "", width: Math.max(96, Math.round((t.widths[i] || 14) * 7.4)), key: key, meta: meta };
      });
      TABLES[t.key] = { key: t.key, sheet: t.sheet, titles: t.titles, headerRow: t.headerRow, descRow: t.descRow, cols: cols, baseCols: cols.slice(), headers: t.headers, descs: t.descs, slots: t.slots || 0 };
  }
  SPEC.tables.concat([CAT_TABLE]).forEach(buildTable);
  function ci(tab, key) { var c = TABLES[tab].cols; for (var i = 0; i < c.length; i++) if (c[i].key === key) return i; return -1; }

  /* dropdown references between sheets */
  var LOC = function (levels) {
    var o = { site: { from: "site", col: "name" } };
    if (levels > 1) o.building = { from: "building", col: "name", where: { site: "site" } };
    if (levels > 2) o.floor = { from: "floor", col: "name", where: { site: "site", building: "building" } };
    if (levels > 3) o.space = { from: "space", col: "name", where: { site: "site", building: "building", floor: "floor" } };
    return o;
  };
  var REFS = {
    building: LOC(1), floor: LOC(2), space: LOC(3), asset: LOC(4), inventory: LOC(2), tools: LOC(2),
    user: { role: { from: "role", col: "name", free: true }, sites: { from: "site", col: "name", multi: true } },
    vendorContact: { vendor: { from: "vendor", col: "name" } },
    task: { plan: { from: "jobPlan", col: "name" } },
    pm: { asset: { from: "asset", col: "code", sub: "name" }, jobPlan: { from: "task", col: "plan" }, assignedTo: { from: "user", col: "name" }, vendor: { from: "vendor", col: "name" }, vendorContact: { from: "vendorContact", col: "name", where: { vendor: "vendor" } } },
    tenantContact: { tenant: { from: "tenant", col: "name" } }
  };
  REFS.floor.building = { from: "building", col: "name", where: { site: "site" } };
  REFS.space.floor = { from: "floor", col: "name", where: { site: "site", building: "building" } };
  /* floors/spaces refer to their own parent columns with different keys in the source tables */
  var SRC_KEYS = { building: { site: "site" }, floor: { site: "site", building: "building" }, space: { site: "site", building: "building", floor: "floor" } };

  /* ---------------- sheets, exactly as in the template ---------------- */
  var SHEET_TABLES = {}, GEN_NAMES = ["Job Plan Import", "Trigger Schedule Import", "PPM V3 Import"], ALL_SHEETS = [];
  function indexSheets() {
    SHEET_TABLES = {};
    Object.keys(TABLES).forEach(function (k) { (SHEET_TABLES[TABLES[k].sheet] = SHEET_TABLES[TABLES[k].sheet] || []).push(k); });
    Object.keys(SHEET_TABLES).forEach(function (n) { SHEET_TABLES[n].sort(function (a, b) { return TABLES[a].headerRow - TABLES[b].headerRow; }); });
    ALL_SHEETS = SPEC.sheetOrder.concat(GEN_NAMES);
  }

  /* ---------------- custom sheets: a client's extra module or information, checked and exported like a template sheet ----------------
     A definition { key, name, module, desc, cols:[{ id, name, desc, type, req, list[] }] } lives in state.sheets. The first column is the record's Name: always mandatory.
     Each definition becomes a SPEC table (layout), a RULES entity (checks: mandatory, type, dropdown, duplicate names), a GUIDE sheet and COLDOC notes. */
  var CTYPES = { text: "Text", number: "Number", integer: "Whole number", date: "Date (dd/mm/yyyy)", email: "Email", phone: "Phone", bool: "Yes / No", list: "Dropdown list",
    "ref:site": "Site (from the Site sheet)", "ref:building": "Building (from the Building sheet)", "ref:asset": "Asset (from the Asset sheet)", "ref:vendor": "Vendor (from the Vendor sheet)", "ref:tenant": "Tenant (from the Tenants sheet)", "ref:user": "User (from Roles & Users)" };
  /* module → the rule entity whose fields a custom sheet can start from (template sheets here; the other modules from public/onboarding/templates.json) */
  var MODULE_ENT = { "Site": "site", "Building": "building", "Floor": "floor", "Space": "space", "Asset": "asset", "Users": "user", "Roles": "role", "Vendor": "vendor", "Vendor Contact": "vendorContact",
    "Tenant": "tenant", "Tenant Contact": "tenantContact", "Tenant Unit": "tenantUnit", "Client": "client", "Client Contact": "clientContact", "Client Portfolio": "clientPortfolio", "Job Plan": "jobPlan",
    "Planned Maintenance": "pm", "Storeroom": "storeroom", "Item Type": "itemType", "Inventory Item": "item", "Tool Type": "toolType", "Tools": "toolItem", "Contract": "contractDetail", "SLA Priority": "slaPriority", "Compliance": "compliance" };
  var MODULES = Object.keys(MODULE_ENT).concat(["Asset Category", "People", "Meter", "Inspection", "Work Order", "Custom module"]);
  var EXTRA = {}, EXTRA_LISTS = {};
  try { fetch("../onboarding/templates.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (!j || !j.ONB) return; j.ONB.RULES.entities.forEach(function (e) { EXTRA[e.key] = e; }); EXTRA_LISTS = j.ONB.RULES.lists || {}; }).catch(function () { }); } catch (e) { }
  /* the basic system fields of a Facilio custom module; the client adds their own fields after them (the org's package has the final list) */
  var BASIC = [{ name: "Name", type: "text", req: true, desc: "The record's name: the module's main field." }, { name: "Description", type: "text", req: false, desc: "A longer description of the record." },
    { name: "Site", type: "ref:site", req: false, desc: "The site the record belongs to, exactly as on the Site sheet." }];
  function moduleFields(mod) {
    var k = MODULE_ENT[mod], e = k ? ((ENT[k] && !ENT[k].custom) ? ENT[k] : EXTRA[k]) : null;
    if (!e) return BASIC.map(function (f) { return JSON.parse(JSON.stringify(f)); });
    var lists = {}, doc = COLDOC[k] || {}, out = [], TM = { number: "number", integer: "integer", date: "date", email: "email", phone: "phone", bool: "bool", lat: "number", lng: "number" };
    Object.keys(EXTRA_LISTS).forEach(function (x) { lists[x] = EXTRA_LISTS[x]; }); Object.keys(RULES.lists).forEach(function (x) { lists[x] = RULES.lists[x]; });
    Object.keys(e.columns).forEach(function (ck) {
      var c = e.columns[ck], L = c.list && !c.multi ? lists[c.list] : null, rt = (ck === "site" || ck === "building") ? ck : (c.ref && /^(site|building|asset|vendor|tenant|user)\./.test(c.ref) ? c.ref.split(".")[0] : "");
      out.push({ key: ck, name: c.h[0], req: !!c.req, type: L ? "list" : rt ? "ref:" + rt : (TM[c.type] || "text"), list: L ? L.slice() : [], desc: (doc[ck] && doc[ck][0]) || "" });
    });
    var ni = -1; out.forEach(function (f, i) { if (ni < 0 && f.key === "name") ni = i; }); if (ni < 0) out.forEach(function (f, i) { if (ni < 0 && f.req) ni = i; }); if (ni > 0) out.unshift(out.splice(ni, 1)[0]);
    return out;
  }
  var RESERVED = ["cycles", "instructions"];
  if (RULES.ignoreSheets.indexOf("Instructions") < 0) RULES.ignoreSheets.push("Instructions");
  function cKey(c, i) { return i ? "c" + c.id : "name"; }
  function registerCustom(d) {
    var cols = {};
    d.cols.forEach(function (c, i) {
      var o = { h: [c.name] }; if (c.req || !i) o.req = true;
      if (/^ref:/.test(c.type || "")) { o.ref = c.type.slice(4) + ".name"; (REFS[d.key] = REFS[d.key] || {})[cKey(c, i)] = { from: c.type.slice(4), col: "name" }; }
      else if (CTYPES[c.type] && c.type !== "text" && c.type !== "list") o.type = c.type;
      if (c.type === "list" && c.list && c.list.length) { RULES.lists[d.key + "_" + c.id] = c.list.slice(); o.list = d.key + "_" + c.id; }
      cols[cKey(c, i)] = o;
    });
    var t = { key: d.key, sheet: d.name, titles: [[1, d.name + (d.module ? " · Facilio module: " + d.module : "")]], headerRow: 2, descRow: 3,
      headers: d.cols.map(function (c, i) { return c.name + (c.req || !i ? "*" : ""); }), descs: d.cols.map(function (c) { return c.desc || ""; }), widths: d.cols.map(function () { return 24; }), custom: true };
    var ent = { key: d.key, label: d.name, sheet: [d.name], core: false, custom: true, module: d.module || "", columns: cols,
      unique: [{ cols: ["name"], sev: "Critical" }], near: [{ col: "name", scope: [] }] };
    SPEC.tables.push(t); SPEC.sheetOrder.push(d.name); RULES.entities.push(ent); ENT[d.key] = ent;
    GUIDE.sheets[d.name] = { label: d.name, custom: true, purpose: (d.desc ? d.desc + " " : "A custom sheet for information the template doesn't cover. ") + (d.module ? "It maps to the Facilio " + d.module + " module." : "Choose the Facilio module it maps to with Edit sheet."),
      steps: ["Enter one row per record, starting on row 4.", "Give every row a Name (" + d.cols[0].name + "): Facilio needs it to create the record, and two rows can't share one.", "Fill every column marked * and pick values from the dropdowns.", "Use Edit sheet to add, remove or reorder columns, change a column's type or make it mandatory."],
      watch: ["Rows without a Name are flagged as errors and are not imported."] };
    COLDOC[d.key] = {}; d.cols.forEach(function (c, i) { COLDOC[d.key][cKey(c, i)] = [c.desc || (i ? "" : "The record's name, as it should appear in Facilio."), c.example || ""]; });
    buildTable(t);
  }
  function unregisterCustom(d) {
    var keep = function (x) { return x.key !== d.key; };
    SPEC.tables = SPEC.tables.filter(keep); RULES.entities = RULES.entities.filter(keep); SPEC.sheetOrder = SPEC.sheetOrder.filter(function (n) { return n !== d.name; });
    Object.keys(RULES.lists).forEach(function (k) { if (k.indexOf(d.key + "_") === 0) delete RULES.lists[k]; });
    delete GUIDE.sheets[d.name]; delete COLDOC[d.key]; delete ENT[d.key]; delete TABLES[d.key]; delete REFS[d.key];
  }
  (function () { try { var s0 = JSON.parse(localStorage.getItem("facilio-onboarding-workspace-v2") || "null"); (s0 && Array.isArray(s0.sheets) ? s0.sheets : []).forEach(registerCustom); } catch (e) { console.error(e); } })();
  indexSheets();
  function customDef(name) { return (state.sheets || []).filter(function (d) { return d.name === name; })[0] || null; }
  var RH = { data: 28, blank: 28, title: 34, intro: 28, header: 52, desc: 64, note: 78, gen: 28 };

  /* ---------------- state ---------------- */
  var STORE2 = "facilio-onboarding-workspace-v2";
  function freshState() {
    var s = { v: 2, tabs: {}, enabled: {}, active: "Overview", seenWalk: false };
    Object.keys(TABLES).forEach(function (k) { s.tabs[k] = []; });
    GUIDE.optionalSheets.forEach(function (n) { s.enabled[n] = true; });
    s.tabs.cat = SPEC.assetCategories.map(function (c) { return [c]; });
    s.fmt = {}; s.colw = {}; s.filters = {}; s.custom = {}; s.colOrder = {}; s.sheets = [];
    return s;
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE2);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 2 && s.idb) { var f0 = freshState(); f0.sheets = s.sheets || []; f0.active = s.active || "Overview"; f0.seenWalk = true; f0.idb = true; return f0; }
        if (s && s.v === 2) { Object.keys(TABLES).forEach(function (k) { if (!s.tabs[k]) s.tabs[k] = []; }); if (ALL_SHEETS.indexOf(s.active) < 0) s.active = "Overview"; return s; } }
      var old = localStorage.getItem(STORE_KEY);   /* carry over data typed in the first version */
      if (old) { var o = JSON.parse(old), f = freshState(); Object.keys(TABLES).forEach(function (k) { if (o.tabs && o.tabs[k]) f.tabs[k] = o.tabs[k]; }); f.seenWalk = !!o.seenWalk; return f; }
    } catch (e) {}
    return null;
  }
  var state = load() || freshState();
  if (!state.custom) state.custom = {}; if (!state.colOrder) state.colOrder = {}; if (!state.sheets) state.sheets = [];
  state.sheets.forEach(function (d) { if (!TABLES[d.key]) { registerCustom(d); indexSheets(); } if (!state.tabs[d.key]) state.tabs[d.key] = []; });
  var saveTimer = null;
  /* large work (over about 3 MB, roughly 30,000 rows) is kept in IndexedDB, which holds far more than localStorage; localStorage then keeps a small marker with the custom sheets */
  var PID = new URLSearchParams(location.search).get("p") || "local", BIG = 3e6;
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      var rq = indexedDB.open("facilio-onboarding", 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore("work"); };
      rq.onerror = function () { rej(rq.error); };
      rq.onsuccess = function () { var db = rq.result, tx = db.transaction("work", mode), r = fn(tx.objectStore("work")); tx.oncomplete = function () { db.close(); res(r && r.result); }; tx.onerror = function () { db.close(); rej(tx.error); }; };
    });
  }
  function save() {
    if (state.idb) return;   /* the saved work is still being read back: never overwrite it with the empty start-up state */
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var raw = JSON.stringify(state), at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), hasIdb = typeof indexedDB !== "undefined";
      var big = function () { idb("readwrite", function (st) { return st.put(raw, PID); }).then(function () {
          try { localStorage.setItem(STORE2, JSON.stringify({ v: 2, idb: true, sheets: state.sheets, active: state.active, seenWalk: true })); } catch (e) { }
          $("saveState").textContent = "Saved in this browser (large workbook) · " + at; })
        .catch(function () { $("saveState").textContent = "Too large to save in this browser. Download the workbook to keep it."; }); };
      if (raw.length > BIG && hasIdb) { big(); return; }
      try { localStorage.setItem(STORE2, raw); $("saveState").textContent = "Saved in this browser · " + at; if (hasIdb) idb("readwrite", function (st) { return st.delete(PID); }).catch(function () { }); }
      catch (e) { if (hasIdb) big(); else $("saveState").textContent = "Too large to save in the browser. Download the workbook to keep it."; }
    }, 400);
  }
  function rows(tab) { return state.tabs[tab]; }
  function dIx(tab, c) { var col = TABLES[tab].cols[c]; return col ? col.d : c; }
  function get(tab, i, c) { var R = rows(tab)[i], d = dIx(tab, c); return R && R[d] != null ? R[d] : ""; }
  function dataWidth(tab) { return TABLES[tab].baseCols.length + ((state.custom && state.custom[tab]) || []).length; }
  /* custom fields: extra columns a client adds; Facilio creates them as new fields on import */
  function customDefs(tab) { return (state.custom && state.custom[tab]) || []; }
  function rebuildCols(tab) {
    var t = TABLES[tab], base = t.baseCols, order = (state.colOrder && state.colOrder[tab]) || base.map(function (c) { return c.d; });
    t.cols = order.map(function (d) {
      if (d < base.length) return base[d];
      var def = customDefs(tab)[d - base.length] || { name: "Custom field" };
      return { d: d, h: def.name, label: def.name, req: !!def.req, desc: def.desc || "Custom field added for this onboarding", width: 150, key: "custom_" + (d - base.length), meta: cfMeta(tab, d - base.length, def), custom: true };
    });
    t.headers = t.cols.map(function (c) { return c.req && !/\*/.test(c.h) ? c.h + "*" : c.h; }); t.descs = t.cols.map(function (c) { return c.custom ? "Custom field" : (t.baseDescs ? t.baseDescs[c.d] : c.desc); });
  }
  /* a custom field's checks: its dropdown values, link to another sheet or type, used by the grid, the export and the checker */
  function cfMeta(tab, i, def) {
    var m = {}, t = def.type || "text";
    if (t === "list" && def.list && def.list.length) { m.list = "cf_" + tab + "_" + i; RULES.lists[m.list] = def.list.slice(); }
    else if (/^ref:/.test(t)) { m.ref = t.slice(4) + ".name"; (REFS[tab] = REFS[tab] || {})["custom_" + i] = { from: t.slice(4), col: "name" }; }
    else if (t !== "text" && t !== "list") m.type = t;
    return m;
  }
  function setCustomRules() {
    RULES.custom = {};
    Object.keys(state.custom || {}).forEach(function (tab) { var o = {};
      (state.custom[tab] || []).forEach(function (def, i) { if (!def || !def.name) return; var m = cfMeta(tab, i, def), r = {}; if (def.req) r.req = true; ["type", "list", "ref"].forEach(function (x) { if (m[x]) r[x] = m[x]; }); if (Object.keys(r).length) o[def.name.trim().toLowerCase()] = r; });
      RULES.custom[tab] = o; });
  }
  function rebuildAll() { Object.keys(TABLES).forEach(function (k) { if (!TABLES[k].baseDescs) TABLES[k].baseDescs = TABLES[k].descs.slice(); rebuildCols(k); }); }
  function rowFilled(R) { return R && R.some(function (v) { return v !== "" && v != null; }); }
  function filledRows(tab) { return rows(tab).filter(rowFilled).length; }
  function lastFilled(tab) { var R = rows(tab); for (var i = R.length - 1; i >= 0; i--) if (rowFilled(R[i])) return i; return -1; }
  function sheetList() { return ALL_SHEETS.filter(function (n) { return GUIDE.optionalSheets.indexOf(n) < 0 || state.enabled[n]; }); }
  function sheetFilled(n) { return (SHEET_TABLES[n] || []).reduce(function (a, k) { return a + (k === "cat" ? 0 : filledRows(k)); }, 0); }

  /* ---------------- value formatting ---------------- */
  var MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function iso(y, m, d) { if (y < 100) y += 2000; var dt = new Date(Date.UTC(y, m - 1, d)); return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null; }
  function toISO(v) {
    var s = String(v).trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return iso(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/))) return iso(+m[3], +m[2], +m[1]);
    if ((m = s.match(/^(\d{1,2})[\s\-\/.]+([A-Za-z]{3,9})[\s\-\/.,]+(\d{2}|\d{4})$/)) && MON[m[2].slice(0, 3).toLowerCase()]) return iso(+m[3], MON[m[2].slice(0, 3).toLowerCase()], +m[1]);
    if (/^\d{5}(\.\d+)?$/.test(s) && +s > 20000 && +s < 80000) return new Date(Math.round((+s - 25569) * 864e5)).toISOString().slice(0, 10);
    return null;
  }
  function normalizeIn(tab, c, v) {
    v = v == null ? "" : String(v);
    if (TABLES[tab].cols[c].meta.type === "date" && v.trim()) return toISO(v) || v;
    return v;
  }
  function show(tab, c, v) {
    if (v === "" || v == null) return "";
    if (TABLES[tab].cols[c].meta.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(8, 10) + "/" + v.slice(5, 7) + "/" + v.slice(0, 4);
    return String(v);
  }
  function isNumCol(tab, c) { var t = TABLES[tab].cols[c].meta.type; return t === "number" || t === "integer"; }

  /* ---------------- dropdown options ---------------- */
  function distinct(tab, colKey, filter) {
    var c = tab === "cat" ? 0 : ci(tab, colKey); if (c < 0) return [];
    var seen = {}, out = [];
    rows(tab).forEach(function (R) {
      if (!R) return; var v = R[dIx(tab, c)]; if (v == null || String(v).trim() === "") return;
      if (filter && !filter(R)) return;
      if (!seen[v]) { seen[v] = 1; out.push(String(v)); }
    });
    return out;
  }
  function subLabels(tab, colKey, subKey) { var a = dIx(tab, ci(tab, colKey)), b = dIx(tab, ci(tab, subKey)), m = {}; rows(tab).forEach(function (R) { if (R && R[a]) m[R[a]] = R[b] || ""; }); return m; }
  function optionsFor(tab, c, idx) {
    var col = TABLES[tab].cols[c], m = col.meta, ref = REFS[tab] && REFS[tab][col.key];
    if (ref) {
      var where = ref.where, row = rows(tab)[idx] || [];
      var filter = where ? function (R) {
        return Object.keys(where).every(function (tk) {
          var mine = row[dIx(tab, ci(tab, where[tk]))]; if (mine == null || String(mine).trim() === "") return true;
          var srcKey = (SRC_KEYS[ref.from] && SRC_KEYS[ref.from][tk]) || tk;
          return nv(R[dIx(ref.from, ci(ref.from, srcKey))]) === nv(mine);
        });
      } : null;
      var items = distinct(ref.from, ref.col, filter);
      if (tab === "pm" && col.key === "jobPlan") distinct("jobPlan", "name").forEach(function (x) { if (items.indexOf(x) < 0) items.push(x); });
      return { items: items, multi: !!ref.multi, free: !!ref.free, hint: items.length ? "" : "Nothing entered on the " + TABLES[ref.from].sheet + " sheet yet.", sub: ref.sub ? subLabels(ref.from, ref.col, ref.sub) : null, source: TABLES[ref.from].sheet };
    }
    if (m.list) return { items: RULES.lists[m.list].slice(), multi: !!m.multi };
    if (m.sheetList) return { items: distinct("cat", null), source: "Asset Category Master" };
    if (m.perm) return { items: RULES.permissions[m.perm].slice(), multi: true };
    if (m.type === "bool") return { items: ["Yes", "No"] };
    if (tab === "pm" && col.key === "runEvery") { var n = []; for (var i = 1; i <= 60; i++) n.push(String(i)); return { items: n }; }
    return null;
  }

  /* ---------------- sheet layout: one source of truth for screen, checks and export ---------------- */
  function sheetLayout(name) {
    if (GEN_NAMES.indexOf(name) >= 0) return genLayout(name);
    var rowsOut = [], blocks = [], maxCol = Math.max((SPEC.sheetCols[name] || []).length, (SHEET_TABLES[name] || []).reduce(function (m, t) { return Math.max(m, TABLES[t].cols.length); }, 0));
    function at(r) { while (rowsOut.length < r) rowsOut.push({ type: "blank" }); return rowsOut[r - 1]; }
    function setStatic(r, c, v, kind, custom) { var row = at(r); if (row.type === "blank") { row.type = "static"; row.kind = kind; row.cells = {}; } if (row.type === "static") { row.cells[c] = { v: v, kind: kind, custom: !!custom }; if (kind === "title" || kind === "header" || kind === "desc") row.kind = kind; } else { row.extra = row.extra || {}; row.extra[c] = { v: v, kind: kind }; } maxCol = Math.max(maxCol, c + 1); }
    if (name === "Overview") { SPEC.overviewCells.forEach(function (x) { setStatic(x[0], x[1], x[2], x[3]); }); return { name: name, rows: rowsOut, blocks: blocks, maxCol: Math.max(maxCol, 5) }; }
    var tabs = SHEET_TABLES[name] || [], prevEnd = 0;
    tabs.forEach(function (tab, k) {
      var t = TABLES[tab], tTop = t.titles.length ? t.titles[0][0] : t.headerRow;
      var top = k === 0 ? tTop : Math.max(tTop, prevEnd + 2), shift = top - tTop;
      t.titles.forEach(function (x, i) { if (x[1]) setStatic(x[0] + shift, 0, x[1], i === 0 ? "title" : "intro"); });
      var hr = t.headerRow + shift;
      t.headers.forEach(function (h, c) { setStatic(hr, c, h, "header", t.cols[c] && t.cols[c].custom); });
      var ds = hr + 1;
      if (t.descRow) { t.descs.forEach(function (d, c) { if (d) setStatic(ds, c, d, "desc", t.cols[c] && t.cols[c].custom); }); if (!rowsOut[ds - 1] || rowsOut[ds - 1].type === "blank") { at(ds).type = "static"; at(ds).kind = "desc"; at(ds).cells = {}; } ds++; }
      var last = k === tabs.length - 1, need = lastFilled(tab) + 1;
      var reserve = last ? Math.max(need + 40, 60) : Math.max(t.slots || 0, need + 3);
      for (var i = 0; i < reserve; i++) { var r = ds + i, cur = at(r); var keepExtra = cur.extra || (cur.type === "static" ? cur.cells : null); rowsOut[r - 1] = { type: "data", table: tab, idx: i, block: k }; if (keepExtra) rowsOut[r - 1].extra = keepExtra; }
      blocks.push({ table: tab, headerRow: hr, dataStart: ds, dataEnd: ds + reserve - 1, last: last });
      prevEnd = ds + reserve - 1;
    });
    (SPEC.extras[name] || []).forEach(function (x) { setStatic(x[0], x[1], x[2], x[3]); });
    rowsOut.forEach(function (row, i) { if (row.type === "blank" || row.type === "static") { for (var b = blocks.length - 1; b >= 0; b--) if (i + 1 >= (b === 0 ? 1 : blocks[b].headerRow - 1)) { row.block = b; break; } } });
    return { name: name, rows: rowsOut, blocks: blocks, maxCol: maxCol };
  }

  /* ---------------- grid rendering (variable row heights) ---------------- */
  var grid = $("grid"), ghead = $("ghead"), gbody = $("gbody");
  var rowsLayer = document.createElement("div"); gbody.appendChild(rowsLayer);
  var L = null, tops = [], sel = { r: 0, c: 0, r2: 0, c2: 0 }, editing = null, issues = { all: [], cell: {}, bySheet: {} };
  var HEADH = 22;
  function rowH(row) { if (row.type === "data") return isHidden(row.table, row.idx) ? 0 : RH.data; if (row.type === "static") return RH[row.kind] || RH.blank; return RH.blank; }
  function relayout() {
    L = sheetLayout(state.active);
    tops = [0]; L.rows.forEach(function (row, i) { tops.push(tops[i] + rowH(row)); });
  }
  function colW(c) { var cw = state.colw && state.colw[state.active] && state.colw[state.active][c]; if (cw) return cw; return baseColW(state.active, c); }
  function baseColW(sheet, c) {
    if (GEN_NAMES.indexOf(sheet) >= 0) { if (!genCache) genRefresh(); return (genCache.widths[sheet] || [])[c] || 140; }
    if (sheet === "Overview") { if (c < 2) return 40; return Math.max(124, Math.round(((SPEC.sheetCols.Overview || [])[c] || 14) * 7.4)); }
    var w = 0; (SHEET_TABLES[sheet] || []).forEach(function (tab) { var col = TABLES[tab].cols[c]; if (col) w = Math.max(w, col.custom ? 150 : col.width); });
    return Math.max(124, w || Math.round(((SPEC.sheetCols[sheet] || [])[c] || 14) * 7.4));
  }
  function colLeft(c) { var x = 46; for (var i = 0; i < c; i++) x += colW(i); return x; }
  function totalWidth() { return colLeft(L.maxCol); }
  function rowAtY(y) { var lo = 0, hi = L.rows.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (tops[mid + 1] <= y) lo = mid + 1; else hi = mid; } return lo; }
  function cellInfo(r, c) {
    var row = L.rows[r]; if (!row) return { v: "", editable: false };
    if (row.type === "data") {
      var t = TABLES[row.table];
      if (c < t.cols.length) return { v: show(row.table, c, get(row.table, row.idx, c)), raw: get(row.table, row.idx, c), editable: true, table: row.table, idx: row.idx, col: t.cols[c] };
      if (row.extra && row.extra[c]) return { v: row.extra[c].v, kind: row.extra[c].kind, editable: false };
      return { v: "", editable: false };
    }
    if (row.type === "static" && row.cells[c]) return { v: row.cells[c].v, kind: row.cells[c].kind, custom: row.cells[c].custom, editable: false };
    return { v: "", editable: false, kind: row.type === "static" && row.kind === "desc" ? "desc" : "" };
  }
  function renderHead() {
    var cmin = Math.min(sel.c, sel.c2), cmax = Math.max(sel.c, sel.c2), letters = ghead.querySelector(".letters");
    /* update in place when possible so the element under the pointer is never replaced */
    if (!letters || letters.getAttribute("data-sheet") !== state.active || letters.children.length !== L.maxCol + 1) {
      var h = "<div class='hrow letters' data-sheet='" + esc(state.active) + "'><div class='corner'></div>";
      for (var c = 0; c < L.maxCol; c++) h += "<div data-lc='" + c + "' title='Select column " + colLetter(c) + "'>" + colLetter(c) + "<span class='rz' data-rz='" + c + "' title='Drag to resize'></span></div>";
      h += "</div><div class='frozen' id='frozen'></div>";
      ghead.innerHTML = h; letters = ghead.querySelector(".letters");
    }
    for (var i = 0; i < L.maxCol; i++) { var el = letters.children[i + 1], w = colW(i) + "px"; if (el.style.width !== w) el.style.width = w; var fzi = i < frozen(); el.style.position = fzi ? "sticky" : ""; el.style.left = fzi ? frzLeft(i) + "px" : ""; el.style.zIndex = fzi ? "4" : ""; el.classList.toggle("frz-last", fzi && i === frozen() - 1); var on = i >= cmin && i <= cmax; if (el.classList.contains("on") !== on) el.classList.toggle("on", on); }
    ghead.style.width = totalWidth() + "px";
  }
  var rafPending = false;
  function cellParts(r, c, row, hh, ctx) {
    var info = cellInfo(r, c), cls = [], iss = ctx.cellIss[r + ":" + c];
    if (info.kind) cls.push("s-" + info.kind);
    if (info.custom) cls.push("custom");
    if (row.type === "data" && !info.editable) cls.push("ro");
    if (iss) cls.push("c-" + iss.sev);
    if (info.editable && isNumCol(info.table, c)) cls.push("num");
    if (ctx.multi && r >= ctx.rmin && r <= ctx.rmax && c >= ctx.cmin && c <= ctx.cmax) cls.push("rng");
    if (r === sel.r && c === sel.c) cls.push("sel");
    var dd = r === sel.r && c === sel.c && info.editable && (optionsFor(info.table, c, info.idx) || info.col.meta.type === "date") ? "<button class='cell-dd' data-dd='1' tabindex='-1' aria-label='Open list'>▾</button>" : "";
    var txt = esc(info.v);
    if (info.kind === "header" && /\*/.test(info.v)) txt = esc(String(info.v).replace(/\s*\*\s*/g, " ").trim()) + "<span class='req'> *</span>";
    var fb = ctx.hdrBlock && filterMode && c < TABLES[ctx.hdrBlock.table].cols.length ? "<button class='fbtn" + (isFiltered(ctx.hdrBlock.table, c) ? " on" : "") + "' data-ft='" + ctx.hdrBlock.table + "' data-fc='" + c + "' tabindex='-1' aria-label='Filter'>" + (isFiltered(ctx.hdrBlock.table, c) ? "⛉" : "▾") + "</button>" : "";
    var fh = info.editable && r === ctx.rmax && c === ctx.cmax ? "<span class='fh' data-fh='1' title='Drag to fill'></span>" : "";
    var fo = info.editable ? fmtGet(info.table, info.idx, c) : (row.type !== "data" ? sheetFmt(state.active)[sKeyIn(L, r, c)] : null), fst = styleOf(fo), fz = frozen();
    if (fo && fo.note) cls.push("has-note");
    if (c < fz) { cls.push("frz"); if (c === fz - 1) cls.push("frz-last"); fst += "position:sticky;left:" + frzLeft(c) + "px;z-index:" + (r === sel.r && c === sel.c ? 4 : 3) + ";"; }
    if (fst.indexOf("white-space:normal") >= 0) cls.push("wrap");
    else if (row.type === "data" && info.editable && info.v && !isNumCol(info.table, c) && c + 1 < L.maxCol && !iss && !(info.editable && fmtGet(info.table, info.idx, c) && fmtGet(info.table, info.idx, c).al)) { var nx = cellInfo(r, c + 1); if (!nx.v && !ctx.cellIss[r + ":" + (c + 1)]) cls.push("spill"); }
    return { cls: cls.join(" "), style: "width:" + colW(c) + "px;height:" + hh + "px;line-height:" + (row.type === "data" || row.kind === "gen" ? (hh - 1) + "px" : "1.3") + ";" + fst,
      html: txt + dd + fb + fh, title: fo && fo.note ? "Note: " + fo.note : (row.type === "static" && info.v && String(info.v).length > 30 ? String(info.v) : "") };
  }
  function renderBody() {
    var H = grid.clientHeight, top = Math.max(0, grid.scrollTop - HEADH), n = L.rows.length;
    var r0 = Math.max(0, rowAtY(top) - 6), r1 = Math.min(n, rowAtY(top + H) + 8);
    gbody.style.height = tops[n] + "px"; gbody.style.width = totalWidth() + "px";
    var ctx = { rmin: Math.min(sel.r, sel.r2), rmax: Math.max(sel.r, sel.r2), cmin: Math.min(sel.c, sel.c2), cmax: Math.max(sel.c, sel.c2), cellIss: issues.cell[state.active] || {} };
    ctx.multi = ctx.rmin !== ctx.rmax || ctx.cmin !== ctx.cmax;
    var W = totalWidth() + "px", key = state.active + "|" + L.maxCol, keep = {};
    if (rowsLayer.getAttribute("data-key") !== key) { rowsLayer.innerHTML = ""; rowsLayer.setAttribute("data-key", key); }
    var existing = {}; Array.prototype.forEach.call(rowsLayer.children, function (el) { existing[el.getAttribute("data-row")] = el; });
    for (var r = r0; r < r1; r++) {
      var row = L.rows[r], hh = rowH(row); if (!hh) continue;
      var rk = "row" + (row.type === "static" ? " k-" + row.kind : (row.type === "data" ? "" : " k-blank"));
      ctx.hdrBlock = row.type === "static" && row.kind === "header" ? L.blocks.filter(function (b) { return b.headerRow === r + 1; })[0] : null;
      var el = existing[r];
      if (!el) { el = document.createElement("div"); el.setAttribute("data-row", r); var inner = "<div class='rn' data-rn='" + r + "'></div>"; for (var c0 = 0; c0 < L.maxCol; c0++) inner += "<div data-r='" + r + "' data-c='" + c0 + "'></div>"; el.innerHTML = inner; rowsLayer.appendChild(el); }
      keep[r] = 1;
      if (el.className !== rk) el.className = rk;
      var rs = "top:" + tops[r] + "px;height:" + hh + "px;width:" + W; if (el._st !== rs) { el.style.cssText = rs; el._st = rs; }
      var rn = el.children[0], rnCls = "rn" + (r >= ctx.rmin && r <= ctx.rmax ? " on" : "") + (hiddenAbove(r) ? " gap" : ""), rnSt = "height:" + hh + "px;line-height:" + (hh - 1) + "px";
      if (rn.className !== rnCls) rn.className = rnCls; if (rn._st !== rnSt) { rn.style.cssText = rnSt; rn._st = rnSt; } if (rn.textContent !== String(r + 1)) rn.textContent = String(r + 1);
      for (var c = 0; c < L.maxCol; c++) {
        var p = cellParts(r, c, row, hh, ctx), cell = el.children[c + 1];
        if (cell.className !== p.cls) cell.className = p.cls;
        if (cell._st !== p.style) { cell.style.cssText = p.style; cell._st = p.style; }
        if (cell._h !== p.html) { cell.innerHTML = p.html; cell._h = p.html; }
        if (cell.title !== p.title) cell.title = p.title;
      }
    }
    Object.keys(existing).forEach(function (k) { if (!keep[k]) existing[k].remove(); });
    renderFrozen(); drawCopyMark(); drawSelBox(ctx);
    if (editing) positionEditor();
  }
  /* frozen header: when a table's heading scrolls out of view, its column names stay visible */
  function renderFrozen() {
    var fz = $("frozen"); if (!fz) return;
    if (L.gen) {
      if (grid.scrollTop < RH.header) { fz.style.display = "none"; return; }
      var hg = "<div class='corner'>1</div>"; for (var gc = 0; gc < L.maxCol; gc++) hg += "<div style='width:" + colW(gc) + "px'>" + esc(L.genHeader[gc] || "") + "</div>";
      fz.innerHTML = hg; fz.style.display = "flex"; fz.style.width = totalWidth() + "px"; return;
    }
    var y = grid.scrollTop, r = rowAtY(Math.max(0, y)), row = L.rows[r];
    var b = row && row.block != null ? L.blocks[row.block] : null;
    var nextHead = L.blocks.some(function (x) { var t0 = tops[x.headerRow - 1]; return t0 >= y - 2 && t0 < y + RH.header + 8; });
    if (!b || tops[b.headerRow - 1] + RH.header > y || nextHead) { fz.style.display = "none"; return; }
    var t = TABLES[b.table], h = "<div class='corner'>" + b.headerRow + "</div>";
    for (var c = 0; c < L.maxCol; c++) h += "<div style='width:" + colW(c) + "px'>" + (c < t.headers.length ? esc(String(t.headers[c]).replace(/\s*\*\s*/g, " ").trim()) + (/\*/.test(t.headers[c]) ? "<span class='req'> *</span>" : "") : "") + "</div>";
    fz.innerHTML = h; fz.style.display = "flex"; fz.style.width = totalWidth() + "px";
  }
  function render() { relayout(); renderHead(); renderBody(); renderFx(); }
  grid.addEventListener("scroll", function () { if (rafPending) return; rafPending = true; requestAnimationFrame(function () { rafPending = false; renderBody(); }); });
  window.addEventListener("resize", function () { renderBody(); });

  function renderFx() {
    var info = cellInfo(sel.r, sel.c);
    if (document.activeElement !== $("nameBox")) $("nameBox").value = colLetter(Math.min(sel.c, sel.c2)) + (Math.min(sel.r, sel.r2) + 1) + (sel.r !== sel.r2 || sel.c !== sel.c2 ? ":" + colLetter(Math.max(sel.c, sel.c2)) + (Math.max(sel.r, sel.r2) + 1) : "");
    var fxIn = $("fxIn"), inf0 = cellInfo(sel.r, sel.c);
    if (document.activeElement !== fxIn) { fxIn.value = inf0.editable ? String(inf0.raw == null ? "" : inf0.raw) : String(inf0.v || ""); fxIn.readOnly = !inf0.editable; fxIn.classList.toggle("ro", !inf0.editable); }
    var h;
    if (L.gen) {
      var gs0 = genSheet(state.active), hd = L.genHeader[sel.c] || "";
      h = "<div class='col'>" + esc(hd) + " <span class='autotag'>Auto</span>" + (sel.r > 0 && genSource(state.active, sel.r, sel.c) ? "<button class='apply srcbtn' data-src='1'>Go to source</button>" : "") + "</div><div class='desc'>Comes from: " + esc((GEN_WHY[gs0.type] || {})[hd] || "") + "</div>";
    } else if (info.editable) {
      var col = info.col, o = optionsFor(info.table, sel.c, info.idx);
      var src = o && o.source ? "Picks from the " + o.source + " sheet. " : (o && o.items && o.items.length && o.items.length <= 8 ? "Options: " + o.items.join(", ") + ". " : "");
      h = "<div class='col'>" + esc(col.label) + (col.req ? "<span class='req'> *</span>" : "") + "</div><div class='desc'>" + esc(src + (col.desc || "")) + "</div>";
    } else {
      h = "<div class='col'>" + (info.v ? esc(String(info.v)) : "&nbsp;") + "</div><div class='desc'>" + (info.kind === "header" ? "Template column heading" : info.kind === "desc" ? "Template guidance for this column" : info.kind === "title" || info.kind === "intro" ? "Template text" : info.kind ? "Reference list from the template" : "") + "</div>";
    }
    var iss = (issues.cell[state.active] || {})[sel.r + ":" + sel.c];
    if (iss) { var i0 = iss.list[0], fix = applicableFix(i0), more = iss.list.length - 1;
      h += "<div class='iss " + i0.severity + "' title='" + esc(iss.list.map(function (x) { return x.severity + ": " + x.issue + " " + (x.suggestion || ""); }).join("\n")) + "'>" + (fix != null && info.editable ? "<button class='apply' data-fix='" + esc(fix) + "'>Apply fix</button>" : "") + "<b>" + i0.severity + ":</b> " + esc(i0.issue) + " " + esc(i0.suggestion || "") + (more ? " <span class='more'>(+" + more + " more)</span>" : "") + "</div>"; }
    $("fx").innerHTML = h;
  }
  $("fx").addEventListener("click", function (e) { if (e.target.closest("[data-src]")) { goSource(state.active, sel.r, sel.c); return; } var b = e.target.closest("[data-fix]"); var info = cellInfo(sel.r, sel.c); if (b && info.editable) { setCells([[info.table, info.idx, sel.c, b.getAttribute("data-fix")]]); grid.focus(); } });
  function applicableFix(i) { var m = (i.suggestion || "").match(/^(?:Use|Remove the extra space:|Use single normal spaces:) '([^']*)'/); return m ? m[1] : null; }

  /* ---------------- selection & navigation ---------------- */
  function select(r, c, extend) {
    r = Math.max(0, Math.min(L.rows.length - 1, r)); c = Math.max(0, Math.min(L.maxCol - 1, c));
    if (extend) { sel.r2 = r; sel.c2 = c; } else { sel.r = sel.r2 = r; sel.c = sel.c2 = c; }
    ensureVisible(extend ? sel.r2 : sel.r, extend ? sel.c2 : sel.c);
    renderHead(); renderBody(); renderFx(); renderPanel(true); refreshRibbon();
  }
  function ensureVisible(r, c) {
    var y = tops[r], hgt = tops[r + 1] - tops[r], x = colLeft(c), w = colW(c), pad = HEADH + RH.header;
    if (y < grid.scrollTop + (grid.scrollTop > 0 ? RH.header : 0)) grid.scrollTop = Math.max(0, y - RH.header);
    else if (y + hgt + HEADH > grid.scrollTop + grid.clientHeight) grid.scrollTop = y + hgt + HEADH - grid.clientHeight;
    if (x - 46 < grid.scrollLeft) grid.scrollLeft = x - 46;
    else if (x + w > grid.scrollLeft + grid.clientWidth) grid.scrollLeft = x + w - grid.clientWidth;
  }
  /* Ctrl+Arrow: jump to the edge of the data block, as Excel does */
  function hasVal(r, c) { var i = cellInfo(r, c); return !!(i.v !== "" && i.v != null); }
  function jumpEdge(r, c, k) {
    var dr = k === "ArrowDown" ? 1 : k === "ArrowUp" ? -1 : 0, dc = k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0;
    var maxR = L.rows.length - 1, maxC = L.maxCol - 1, inb = function (a, b) { return a >= 0 && a <= maxR && b >= 0 && b <= maxC; };
    var nr = r + dr, nc = c + dc; if (!inb(nr, nc)) return [r, c];
    if (hasVal(r, c) && hasVal(nr, nc)) { while (inb(nr + dr, nc + dc) && hasVal(nr + dr, nc + dc)) { nr += dr; nc += dc; } return [nr, nc]; }
    while (inb(nr, nc) && !hasVal(nr, nc)) { if (!inb(nr + dr, nc + dc)) return [nr, nc]; nr += dr; nc += dc; }
    return [nr, nc];
  }
  function firstDataRow() { for (var i = 0; i < L.rows.length; i++) if (L.rows[i].type === "data") return i; return 0; }
  var dragging = false, dragMode = null;
  gbody.addEventListener("mousedown", function (e) {
    if (e.button === 2) return;
    if (excelMouseDown(e)) return;
    var dd = e.target.closest("[data-dd]"), cell = e.target.closest("[data-r]"); if (!cell) return;
    var r = +cell.getAttribute("data-r"), c = +cell.getAttribute("data-c");
    if (editing) commitEdit();
    /* redraw after the event: replacing the cell under the pointer during mousedown makes Chrome drop the mouseup */
    if (dd) { e.preventDefault(); select(r, c); startEdit(null, true); return; }
    var sh = e.shiftKey; e.preventDefault(); grid.focus();
    if (e.detail >= 2 && !sh) { select(r, c); startEdit(null, false, true); return; }   /* double-click: edit in the cell, like Excel */
    dragging = true; dragMode = "cells"; select(r, c, sh);
  });
  function dragTo(el) {
    if (!dragMode || !el) return;
    var cell = el.closest ? el.closest("[data-r],[data-rn],[data-lc]") : null; if (!cell) return;
    var r = cell.hasAttribute("data-r") ? +cell.getAttribute("data-r") : (cell.hasAttribute("data-rn") ? +cell.getAttribute("data-rn") : null);
    var c = cell.hasAttribute("data-c") ? +cell.getAttribute("data-c") : (cell.hasAttribute("data-lc") ? +cell.getAttribute("data-lc") : null);
    var or2 = sel.r2, oc2 = sel.c2;
    if (dragMode === "cells") { if (r != null) sel.r2 = r; if (c != null) sel.c2 = c; }
    else if (dragMode === "rows") { if (r != null) sel.r2 = r; }
    else if (dragMode === "cols") { if (c != null) sel.c2 = c; }
    if (or2 !== sel.r2 || oc2 !== sel.c2) { renderBody(); renderHead(); renderFx(); }
  }
  gbody.addEventListener("mouseover", function (e) { if (excelMouseOver(e)) return; dragTo(e.target); });
  ghead.addEventListener("mouseover", function (e) { if (dragMode === "cols") dragTo(e.target); });
  window.addEventListener("mouseup", function (e) { dragging = false; dragMode = null; excelMouseUp(e); });
  /* keep selecting while the pointer is held past the edge of the sheet, like Excel */
  var lastPt = null;
  window.addEventListener("mousemove", function (e) { lastPt = { x: e.clientX, y: e.clientY }; });
  (function autoScroll() {
    if (dragMode && lastPt) {
      var g = grid.getBoundingClientRect(), dy = 0, dx = 0;
      if (lastPt.y > g.bottom - 16) dy = Math.min(40, lastPt.y - g.bottom + 16); else if (lastPt.y < g.top + 30 && dragMode !== "cols") dy = -Math.min(40, g.top + 30 - lastPt.y);
      if (lastPt.x > g.right - 16) dx = Math.min(40, lastPt.x - g.right + 16); else if (lastPt.x < g.left + 50 && dragMode !== "rows") dx = -Math.min(40, g.left + 50 - lastPt.x);
      if (dragMode === "cols") dy = 0; if (dragMode === "rows") dx = 0;
      if (dy || dx) { grid.scrollTop += dy; grid.scrollLeft += dx;
        var x = Math.max(g.left + 50, Math.min(g.right - 4, lastPt.x)), y = Math.max(g.top + 26, Math.min(g.bottom - 4, lastPt.y));
        dragTo(document.elementFromPoint(dragMode === "rows" ? g.left + 20 : x, dragMode === "cols" ? g.top + 10 : y)); }
    }
    requestAnimationFrame(autoScroll);
  })();
  gbody.addEventListener("dblclick", function (e) { e.preventDefault(); });

  grid.addEventListener("keydown", function (e) {
    if (editing) return;
    if (excelKey(e)) return;
    var k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && (k === "z" || k === "Z")) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && (k === "y" || k === "Y")) { e.preventDefault(); redo(); return; }
    if (mod && (k === "a" || k === "A")) { e.preventDefault(); sel.r = 0; sel.c = 0; sel.r2 = L.rows.length - 1; sel.c2 = L.maxCol - 1; renderBody(); renderHead(); return; }
    if (e.altKey && k === "ArrowDown") { e.preventDefault(); startEdit(null, true); return; }
    if (k === "Escape" && copyMark) { e.preventDefault(); clearCopyMark(); return; }
    if (mod && /^Arrow/.test(k)) { e.preventDefault(); var to = jumpEdge(e.shiftKey ? sel.r2 : sel.r, e.shiftKey ? sel.c2 : sel.c, k); select(to[0], to[1], e.shiftKey); return; }
    var mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) { e.preventDefault(); if (e.shiftKey) select(sel.r2 + mv[0], sel.c2 + mv[1], true); else select(sel.r + mv[0], sel.c + mv[1]); return; }
    if (k === "Tab") { e.preventDefault(); select(sel.r, sel.c + (e.shiftKey ? -1 : 1)); return; }
    if (k === "Enter") { e.preventDefault(); select(sel.r + (e.shiftKey ? -1 : 1), sel.c); return; }
    if (k === "F2") { e.preventDefault(); startEdit(null, false, true); return; }
    if (k === "PageDown" || k === "PageUp") { e.preventDefault(); select(sel.r + (k === "PageDown" ? 20 : -20), sel.c); return; }
    if (k === "Home") { e.preventDefault(); select(mod ? 0 : sel.r, 0); return; }
    if (k === "End") { e.preventDefault(); select(mod ? L.rows.length - 1 : sel.r, L.maxCol - 1); return; }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); clearRange(); return; }
    if (k.length === 1 && !mod && !e.altKey) { e.preventDefault(); startEdit(k, true); }
  });

  /* ---------------- editing ---------------- */
  var editorEl = null, popEl = null, popIdx = -1, popItems = [];
  function positionEditor() {
    if (!editorEl || !editing) return;
    var c = editing.c, w = colW(c), y = tops[editing.r];
    editorEl.style.left = colLeft(c) + "px"; editorEl.style.top = y + "px"; editorEl.style.width = Math.max(w, 160) + "px";
    if (popEl) { popEl.style.left = colLeft(c) + "px"; popEl.style.top = y + RH.data + 2 + "px"; }
  }
  function startEdit(initial, withList, caretEnd) {
    if (editing) commitEdit();
    var info = cellInfo(sel.r, sel.c);
    if (!info.editable && L.gen) { toast("This sheet fills itself from PM Assets, Job Plan and Asset. Change the data there; Go to source jumps to it."); return; }
    if (!info.editable) { if (initial != null || withList) toast(info.kind ? "This row is part of the template and can't be edited." : "This cell isn't part of a template table."); return; }
    var tab = info.table, col = info.col;
    editing = { tab: tab, idx: info.idx, r: sel.r, c: sel.c, orig: info.raw, filter: initial != null, enterMode: initial != null };
    editorEl = document.createElement("input"); editorEl.className = "editor"; editorEl.setAttribute("aria-label", col.label);
    if (col.meta.type === "date") { editorEl.type = "date"; editorEl.value = /^\d{4}-\d{2}-\d{2}$/.test(info.raw) ? info.raw : (toISO(info.raw) || ""); }
    else editorEl.value = initial != null ? initial : info.raw;
    gbody.appendChild(editorEl); positionEditor(); editorEl.focus();
    if (initial == null && editorEl.type !== "date") { if (caretEnd) { var n = editorEl.value.length; editorEl.setSelectionRange(n, n); } else editorEl.select(); }
    var opts = optionsFor(tab, sel.c, info.idx);
    if (opts) { editing.opts = opts; if (withList || initial != null) openPop(); }
    editorEl.addEventListener("input", function () { if (editing) editing.filter = true; if (editing && editing.opts) openPop(); });
    editorEl.addEventListener("keydown", edKey);
    editorEl.addEventListener("blur", function () { setTimeout(function () { if (editing && document.activeElement !== editorEl) commitEdit(); }, 120); });
  }
  function currentToken() { var v = editorEl.value; return editing.opts.multi ? v.split(",").pop().trim() : v; }
  function openPop() {
    var o = editing.opts, q = editing.filter ? currentToken().toLowerCase() : "";
    var chosen = o.multi ? editorEl.value.split(",").map(function (s) { return s.trim().toLowerCase(); }) : [];
    popItems = o.items.filter(function (it) { return !q || it.toLowerCase().indexOf(q) >= 0 || (o.sub && String(o.sub[it] || "").toLowerCase().indexOf(q) >= 0); }).slice(0, 300);
    if (!popEl) { popEl = document.createElement("div"); popEl.className = "pop"; popEl.setAttribute("role", "listbox"); gbody.appendChild(popEl);
      popEl.addEventListener("mousedown", function (e) { e.preventDefault(); var it = e.target.closest("[data-i]"); if (it) choose(+it.getAttribute("data-i")); }); }
    var curIdx = popItems.map(function (x) { return x.toLowerCase(); }).indexOf(String(editorEl.value).trim().toLowerCase());
    popIdx = popItems.length ? (curIdx >= 0 ? curIdx : 0) : -1;
    var h = popItems.map(function (it, i) {
      var ck = o.multi ? "<span class='chk'>" + (chosen.indexOf(it.toLowerCase()) >= 0 ? "✓" : "") + "</span>" : "";
      return "<div class='opt" + (i === popIdx ? " on" : "") + "' role='option' data-i='" + i + "'>" + ck + esc(it) + (o.sub && o.sub[it] ? "<small>" + esc(o.sub[it]) + "</small>" : "") + "</div>";
    }).join("");
    if (!popItems.length) h = "<div class='hint'>" + esc(o.hint || (q ? "No match. The value will be checked as typed." : "No options yet.")) + "</div>";
    else if (o.multi) h = "<div class='hint'>Several can be chosen; they are separated with commas.</div>" + h;
    popEl.innerHTML = h; positionEditor();
  }
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
  function choose(i) {
    var it = popItems[i]; if (it == null) return;
    if (editing.opts.multi) {
      var parts = editorEl.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean), q = currentToken();
      if (q && parts.length && parts[parts.length - 1] === q) parts.pop();
      var at = parts.map(function (p) { return p.toLowerCase(); }).indexOf(it.toLowerCase());
      if (at >= 0) parts.splice(at, 1); else parts.push(it);
      editorEl.value = parts.join(", ") + (parts.length ? ", " : ""); openPop(); editorEl.focus();
    } else { editorEl.value = it; commitEdit(); grid.focus(); }
  }
  function edKey(e) {
    var k = e.key; e.stopPropagation();
    if (popEl && popItems.length && (k === "ArrowDown" || k === "ArrowUp")) {
      e.preventDefault(); popIdx = (popIdx + (k === "ArrowDown" ? 1 : -1) + popItems.length) % popItems.length;
      Array.prototype.forEach.call(popEl.querySelectorAll(".opt"), function (o, i) { o.classList.toggle("on", i === popIdx); if (i === popIdx) o.scrollIntoView({ block: "nearest" }); });
      return;
    }
    if (k === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); var v = editorEl.value, cells = selCells(); cancelEdit(); if (cells.length) setCells(cells.map(function (x) { return [x.table, x.idx, x.c, v]; })); grid.focus(); return; }
    if (editing.enterMode && /^Arrow/.test(k) && !(popEl && popItems.length && (k === "ArrowDown" || k === "ArrowUp"))) {
      e.preventDefault(); var mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k]; commitEdit(); grid.focus(); select(sel.r + mv[0], sel.c + mv[1]); return;
    }
    if (k === "Enter" && popEl && popIdx >= 0 && popItems.length && (currentToken() || editing.filter === false)) { e.preventDefault(); choose(popIdx); if (!editing) select(sel.r + 1, sel.c); return; }
    if (k === "Enter") { e.preventDefault(); commitEdit(); grid.focus(); select(sel.r + (e.shiftKey ? -1 : 1), sel.c); return; }
    if (k === "Tab") { e.preventDefault(); commitEdit(); grid.focus(); select(sel.r, sel.c + (e.shiftKey ? -1 : 1)); return; }
    if (k === "Escape") { e.preventDefault(); cancelEdit(); grid.focus(); return; }
  }
  function commitEdit() {
    if (!editing) return; var ed = editing; editing = null;
    var v = editorEl.value; if (ed.opts && ed.opts.multi) v = v.replace(/,\s*$/, "");
    editorEl.remove(); editorEl = null; closePop();
    if (v !== ed.orig) setCells([[ed.tab, ed.idx, ed.c, v]]); else renderBody();
  }
  function cancelEdit() { if (!editing) return; editing = null; editorEl.remove(); editorEl = null; closePop(); renderBody(); }

  /* ---------------- data changes, undo ---------------- */
  var undoStack = [], redoStack = [];
  function setCells(list, noUndo, sheetForUndo, raw) {
    var rec = [];
    list.forEach(function (x) {
      var tab = x[0], i = x[1], c = x[2], w = TABLES[tab].cols.length; if (c >= w && !raw) return;
      var d = raw ? c : dIx(tab, c), R = rows(tab); while (R.length <= i) R.push(null);
      if (!R[i]) R[i] = new Array(dataWidth(tab)).fill("");
      var nvv = raw ? x[3] : normalizeIn(tab, c, x[3]), old = R[i][d] == null ? "" : R[i][d];
      if (nvv === old) return; rec.push([tab, i, d, old, nvv]); R[i][d] = nvv;
    });
    Object.keys(TABLES).forEach(function (tab) { var R = rows(tab); while (R.length && !rowFilled(R[R.length - 1])) R.pop(); });
    if (!rec.length) { renderBody(); return; }
    if (!noUndo) { undoStack.push({ sheet: sheetForUndo || state.active, rec: rec }); if (undoStack.length > 200) undoStack.shift(); redoStack = []; }
    changed();
  }
  function undo() { var u = undoStack.pop(); if (!u) return; if (u.snap) { if (u.sheet !== state.active) switchSheet(u.sheet, true); restoreSnap(u.snap.before); redoStack.push(u); return; } if (u.sheet !== state.active) switchSheet(u.sheet, true); setCells(u.rec.map(function (x) { return [x[0], x[1], x[2], x[3]]; }), true, null, true); redoStack.push(u); }
  function redo() { var u = redoStack.pop(); if (!u) return; if (u.snap) { if (u.sheet !== state.active) switchSheet(u.sheet, true); restoreSnap(u.snap.after); undoStack.push(u); return; } if (u.sheet !== state.active) switchSheet(u.sheet, true); setCells(u.rec.map(function (x) { return [x[0], x[1], x[2], x[4]]; }), true, null, true); undoStack.push(u); }
  function clearRange() {
    var list = [];
    for (var r = Math.min(sel.r, sel.r2); r <= Math.max(sel.r, sel.r2); r++) for (var c = Math.min(sel.c, sel.c2); c <= Math.max(sel.c, sel.c2); c++) { var info = cellInfo(r, c); if (info.editable) list.push([info.table, info.idx, c, ""]); }
    if (list.length) setCells(list);
  }
  function changed() { save(); var keepTop = grid.scrollTop; relayout(); grid.scrollTop = keepTop; renderHead(); renderBody(); renderFx(); scheduleValidate(); }

  /* clipboard: works with Excel and Google Sheets */
  function rangeTSV() {
    var out = [];
    for (var r = Math.min(sel.r, sel.r2); r <= Math.max(sel.r, sel.r2); r++) {
      var line = []; for (var c = Math.min(sel.c, sel.c2); c <= Math.max(sel.c, sel.c2); c++) { var v = String(cellInfo(r, c).v || ""); line.push(/[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v); }
      out.push(line.join("\t"));
    }
    return out.join("\n");
  }
  function parseTSV(text) {
    var out = [], row = [], cur = "", q = false; text = text.replace(/\r\n?/g, "\n");
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"' && cur === "") q = true;
      else if (ch === "\t") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); out.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); out.push(row); }
    return out;
  }
  var copyMark = null;
  function markCopy(cut) { var R = selRange(); copyMark = { sheet: state.active, r1: R.r1, r2: R.r2, c1: R.c1, c2: R.c2, cut: cut }; drawCopyMark(); }
  function drawCopyMark() {
    var el = $("copyMark");
    if (!copyMark || copyMark.sheet !== state.active) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "copyMark"; el.className = "copymark"; gbody.appendChild(el); }
    el.style.cssText = "left:" + colLeft(copyMark.c1) + "px;top:" + tops[copyMark.r1] + "px;width:" + (colLeft(copyMark.c2 + 1) - colLeft(copyMark.c1)) + "px;height:" + (tops[copyMark.r2 + 1] - tops[copyMark.r1]) + "px";
  }
  function drawSelBox(ctx) {
    var el = $("selBox");
    if (!ctx.multi) { if (el) el.style.display = "none"; return; }
    if (!el) { el = document.createElement("div"); el.id = "selBox"; el.className = "selbox"; gbody.appendChild(el); }
    el.style.cssText = "display:block;left:" + colLeft(ctx.cmin) + "px;top:" + tops[ctx.rmin] + "px;width:" + (colLeft(ctx.cmax + 1) - colLeft(ctx.cmin)) + "px;height:" + (tops[ctx.rmax + 1] - tops[ctx.rmin]) + "px";
  }
  function clearCopyMark() { copyMark = null; drawCopyMark(); }
  document.addEventListener("copy", function (e) { if (editing || document.activeElement !== grid) return; e.preventDefault(); e.clipboardData.setData("text/plain", rangeTSV()); markCopy(false); toast("Copied. Select where to paste, then Ctrl+V. Esc cancels."); });
  document.addEventListener("cut", function (e) { if (editing || document.activeElement !== grid) return; e.preventDefault(); e.clipboardData.setData("text/plain", rangeTSV()); markCopy(true); toast("Cut. Select where to paste, then Ctrl+V."); });
  document.addEventListener("paste", function (e) {
    if (editing || document.activeElement !== grid) return; e.preventDefault();
    var data = parseTSV(e.clipboardData.getData("text/plain") || ""); if (!data.length) return;
    var r0 = Math.min(sel.r, sel.r2), c0 = Math.min(sel.c, sel.c2), info = cellInfo(r0, c0);
    if (!info.editable) { toast("Select a cell in a data row to paste."); return; }
    var list = [], tab = info.table, w = TABLES[tab].cols.length, R = selRange(), h = data.length, wd = Math.max.apply(null, data.map(function (l) { return l.length; }));
    var selH = R.r2 - R.r1 + 1, selW = R.c2 - R.c1 + 1;
    if ((selH > 1 || selW > 1) && selH % h === 0 && selW % wd === 0) {
      /* like Excel: a copied block pasted into a larger selection repeats to fill it */
      for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) { var ci2 = cellInfo(r, c); if (ci2.editable) list.push([ci2.table, ci2.idx, c, (data[(r - R.r1) % h] || [])[(c - R.c1) % wd] || ""]); }
    } else {
      data.forEach(function (line, i) { line.forEach(function (v, j) { if (c0 + j < w) list.push([tab, info.idx + i, c0 + j, v]); }); });
      sel.r2 = r0 + h - 1; sel.c2 = Math.min(w - 1, c0 + wd - 1);
    }
    if (copyMark && copyMark.cut && copyMark.sheet === state.active) {
      for (var cr = copyMark.r1; cr <= copyMark.r2; cr++) for (var cc = copyMark.c1; cc <= copyMark.c2; cc++) {
        var inside = cr >= Math.min(sel.r, sel.r2) && cr <= Math.max(sel.r, sel.r2) && cc >= Math.min(sel.c, sel.c2) && cc <= Math.max(sel.c, sel.c2);
        var ci3 = cellInfo(cr, cc); if (ci3.editable && !inside) list.unshift([ci3.table, ci3.idx, cc, ""]);
      }
      clearCopyMark();
    }
    setCells(list); toast("Pasted " + h + " row" + (h === 1 ? "" : "s"));
    renderBody(); renderHead();
  });

  /* ---------------- workbook cells (checks + export use the same layout) ---------------- */
  function serial(isoDate) { var p = isoDate.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5 + 25569; }
  function typed(tab, c, v) {
    if (v === "" || v == null) return null;
    var t = TABLES[tab].cols[c].meta.type, s = String(v);
    if (t === "date" && /^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s };
    if (t === "time" && /^\s*\d{1,2}:\d{2}\s*$/.test(s)) { var p = s.trim().split(":"); return { time: (+p[0] * 60 + +p[1]) / 1440, text: s.trim() }; }
    if ((t === "number" || t === "integer") && /^-?\d+(\.\d+)?$/.test(s) && s === s.trim()) return +s;
    return s;
  }
  function sheetCells(name) {
    var lay = sheetLayout(name), cells = {};
    lay.rows.forEach(function (row, i) {
      var r = i + 1;
      if (row.type === "static") Object.keys(row.cells).forEach(function (c) { cells[r + ":" + c] = row.cells[c]; });
      if (row.type === "data") {
        var R = rows(row.table)[row.idx];
        if (R) TABLES[row.table].cols.forEach(function (col, c) { var tv = typed(row.table, c, R[col.d]); if (tv != null) cells[r + ":" + c] = { v: tv, kind: "data" }; });
        if (row.extra) Object.keys(row.extra).forEach(function (c) { cells[r + ":" + c] = row.extra[c]; });
      }
    });
    return { name: name, cells: cells, layout: lay };
  }
  function toSheetJS(names) {
    var wb = XLSX.utils.book_new();
    names.forEach(function (n) {
      var S = sheetCells(n), ws = {}, maxR = 1, maxC = 0;
      Object.keys(S.cells).forEach(function (k) {
        var p = k.split(":"), r = +p[0], c = +p[1], v = S.cells[k].v, out;
        if (v && typeof v === "object" && v.date) out = { t: "n", v: serial(v.date), z: "dd/mm/yyyy" };
        else if (v && typeof v === "object" && "time" in v) out = { t: "s", v: v.text };
        else if (typeof v === "number") out = { t: "n", v: v };
        else out = { t: "s", v: String(v) };
        ws[XLSX.utils.encode_cell({ r: r - 1, c: c })] = out; maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
      });
      ws["!ref"] = "A1:" + XLSX.utils.encode_cell({ r: maxR - 1, c: maxC });
      XLSX.utils.book_append_sheet(wb, ws, n);
    });
    return wb;
  }

  /* ---------------- live checks ---------------- */
  var vTimer = null;
  var LIVE_LIMIT = 5000, stale = false, worker = null, wSeq = 0, wcb = {};   /* above LIVE_LIMIT rows an edit is not re-checked by itself: a full check takes seconds */
  var BGNOTE = "This runs in the background, so the page stays responsive.";
  function totalRows() { return Object.keys(TABLES).reduce(function (a, k) { return a + (k === "cat" ? 0 : filledRows(k)); }, 0); }
  function scheduleValidate() { clearTimeout(vTimer); if (totalRows() > LIVE_LIMIT) { if (!stale) { stale = true; renderStatus(); } return; } vTimer = setTimeout(runValidate, 450); }
  function getWorker() {
    if (worker === false) return null; if (worker) return worker;
    try {
      worker = new Worker("check-worker.js");
      worker.onmessage = function (e) { var cb = wcb[e.data.id]; delete wcb[e.data.id]; if (cb) cb.res(e.data); };
      worker.onerror = function (e) { if (e.preventDefault) e.preventDefault(); console.error(e); Object.keys(wcb).forEach(function (k) { wcb[k].rej(new Error("worker")); delete wcb[k]; }); worker = false; };
    } catch (e) { worker = false; }
    return worker || null;
  }
  function ask(msg, transfer) { var w = getWorker(); if (!w) return Promise.reject(new Error("no worker")); return new Promise(function (res, rej) { msg.id = ++wSeq; wcb[msg.id] = { res: res, rej: rej }; w.postMessage(msg, transfer || []); }); }
  function checkNames() { return sheetList().filter(function (n) { return n !== "Overview" && GEN_NAMES.indexOf(n) < 0; }); }
  /* the rows of each sheet as the checker reads them (same values as toSheetJS), built a slice at a time so the page keeps responding */
  function cellOut(v) { if (v && typeof v === "object" && v.date) return { t: "n", v: serial(v.date), z: "dd/mm/yyyy" }; if (v && typeof v === "object" && "time" in v) return v.text; if (typeof v === "number") return v; return v == null ? undefined : String(v); }
  function aoaRow(row) {
    var a = [];
    if (row.type === "static") Object.keys(row.cells).forEach(function (c) { a[+c] = cellOut(row.cells[c].v); });
    if (row.type === "data") { var R = rows(row.table)[row.idx]; if (R) TABLES[row.table].cols.forEach(function (col, c) { var tv = typed(row.table, c, R[col.d]); if (tv != null) a[c] = cellOut(tv); }); if (row.extra) Object.keys(row.extra).forEach(function (c) { a[+c] = cellOut(row.extra[c].v); }); }
    return a;
  }
  function aoaAsync(names, lays, progress, done) {
    var out = {}, si = 0, ri = 0, seen = 0, total = names.reduce(function (a, n) { return a + lays[n].rows.length; }, 0) || 1;
    (function step() {
      var until = Date.now() + 30;
      while (si < names.length && Date.now() < until) {
        var L = lays[names[si]], A = out[names[si]] = out[names[si]] || [];
        for (var k = 0; k < 2000 && ri < L.rows.length; k++, ri++, seen++) A.push(aoaRow(L.rows[ri]));
        if (ri >= L.rows.length) { si++; ri = 0; }
      }
      if (si < names.length) { progress(seen / total); setTimeout(step, 0); } else done(out);
    })();
  }
  function checkInBackground(done) {
    var n = totalRows(); if (n <= LIVE_LIMIT) { runValidate(); if (done) done(); return; }
    var fallback = function () { busy("Checking " + n.toLocaleString() + " rows…", 60); later(function () { try { runValidate(); } finally { busy(); } if (done) done(); }); };
    if (!getWorker()) { fallback(); return; }
    var names = checkNames(), lays = {}; names.forEach(function (x) { lays[x] = sheetLayout(x); }); setCustomRules();
    busy("Preparing " + n.toLocaleString() + " rows…", 10, BGNOTE);
    aoaAsync(names, lays, function (p) { busy("Preparing " + n.toLocaleString() + " rows…", 10 + Math.round(p * 45), BGNOTE); }, function (aoa) {
      busy("Checking " + n.toLocaleString() + " rows…", 70, BGNOTE);
      ask({ kind: "check", aoa: aoa, rules: RULES }).then(function (r) { busy(); if (r.error) { toast("The check couldn't finish: " + r.error); return; } applyCheck({ lays: lays }, r); if (done) done(); }, fallback);
    });
  }
  function anyData() { return Object.keys(TABLES).some(function (k) { return k !== "cat" && filledRows(k); }); }
  function checkJob() {
    var names = checkNames(), lays = {};
    names.forEach(function (n) { lays[n] = sheetLayout(n); }); setCustomRules();
    return { names: names, lays: lays, wb: toSheetJS(names) };
  }
  function runValidate() { var job, res; try { job = checkJob(); res = OnboardingValidator.validate(job.wb, RULES); } catch (e) { console.error(e); return; } applyCheck(job, res); }
  function applyCheck(job, res) {
    var lays = job.lays; stale = false;
    var cell = {}, list = [], bySheet = {}, rank = { Critical: 3, Warning: 2, Info: 1 }, has = anyData();
    res.issues.forEach(function (i) {
      if (!has) return;
      var lay = lays[i.sheet], r = +i.row || 0, c = -1, row = lay && r ? lay.rows[r - 1] : null;
      if (row && row.type === "data") { var cols = TABLES[row.table].cols; for (var k = 0; k < cols.length; k++) if (cleanHeader(cols[k].h) === i.field) { c = k; break; } }
      else if (row && row.type === "static" && row.kind === "header") { var hb = lay.blocks.filter(function (x) { return x.headerRow === r; })[0]; if (hb) TABLES[hb.table].cols.forEach(function (col, k) { if (c < 0 && (cleanHeader(col.h) === i.field || col.h === i.field)) c = k; }); }
      var item = Object.assign({}, i, { r: r ? r - 1 : null, c: c });
      list.push(item); (bySheet[i.sheet] = bySheet[i.sheet] || []).push(item);
      if (r) { var key = (r - 1) + ":" + Math.max(c, 0), m = (cell[i.sheet] = cell[i.sheet] || {});
        if (!m[key]) m[key] = { sev: i.severity, list: [] };
        if (rank[i.severity] > rank[m[key].sev]) m[key].sev = i.severity;
        m[key].list.push(item); m[key].list.sort(function (a, b) { return rank[b.severity] - rank[a.severity]; }); }
    });
    if (has) genIssues().forEach(function (gi) {
      list.push(gi); (bySheet[gi.sheet] = bySheet[gi.sheet] || []).push(gi);
      if (gi.r != null) { var key = gi.r + ":" + Math.max(gi.c, 0), m = (cell[gi.sheet] = cell[gi.sheet] || {});
        if (!m[key]) m[key] = { sev: gi.severity, list: [] }; if (rank[gi.severity] > rank[m[key].sev]) m[key].sev = gi.severity; m[key].list.push(gi); }
    });
    issues = { all: list, cell: cell, bySheet: bySheet, checks: res.checks };
    renderBody(); renderFx(); renderTabs(); renderStatus(); renderPanel(true);
  }

  /* ---------------- tabs, status, guide panel ---------------- */
  function switchSheet(name, quiet) {
    if (editing) commitEdit();
    state.active = name; if (GEN_NAMES.indexOf(name) >= 0) genRefresh(); $("genBanner").hidden = GEN_NAMES.indexOf(name) < 0; relayout(); var fr = firstDataRow(); sel = { r: fr, c: 0, r2: fr, c2: 0 }; grid.scrollTop = 0; grid.scrollLeft = 0;
    if (!quiet) save(); renderHead(); renderBody(); renderFx(); renderTabs(); renderPanel();
  }
  /* Facilio-style module rail */
  var IC = {
    home: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><path d='M3 9l7-6 7 6v8H12v-5H8v5H3z'/></svg>",
    building: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><path d='M4 17V3h8v14M12 8h4v9M2 17h16M7 6h2M7 9h2M7 12h2'/></svg>",
    asset: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><path d='M10 2l7 4v8l-7 4-7-4V6z M3 6l7 4 7-4 M10 10v8'/></svg>",
    users: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'><circle cx='8' cy='7' r='3'/><path d='M2.5 17c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M13.5 4.2a3 3 0 0 1 0 5.6M15.5 12.8c1 .7 1.7 2 2 4.2'/></svg>",
    vendor: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><rect x='2.5' y='6' width='15' height='10.5' rx='1.5'/><path d='M7 6V4h6v2M2.5 10.5h15'/></svg>",
    maint: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'><rect x='2.5' y='4' width='15' height='13' rx='1.5'/><path d='M2.5 8h15M6.5 2.5v3M13.5 2.5v3M7 12l2 2 4-4'/></svg>",
    box: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><path d='M2.5 6.5L10 3l7.5 3.5v7L10 17l-7.5-3.5z M2.5 6.5L10 10l7.5-3.5 M10 10v7'/></svg>",
    tenant: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'><circle cx='7' cy='12' r='3.5'/><path d='M9.5 9.5L16 3M13.5 5.5l2 2M12 7l1.5 1.5'/></svg>"
  };
  var RAIL = [
    { label: "Overview", icon: "home", sheets: ["Overview"] },
    { label: "Portfolio", icon: "building", sheets: ["Site", "Building", "Floors", "Spaces"] },
    { label: "Assets", icon: "asset", sheets: ["Asset", "Asset Category Master"] },
    { label: "Users", icon: "users", sheets: ["Roles & Users"] },
    { label: "Vendors", icon: "vendor", sheets: ["Vendor", "Vendor Contact"] },
    { label: "Maintenance", icon: "maint", sheets: ["Job Plan", "PM Assets"] },
    { label: "Inventory", icon: "box", sheets: ["Inventory"] },
    { label: "Tenants", icon: "tenant", sheets: ["Tenants", "Tenant Contact"] }
  ];
  function groupOf(n) { for (var i = 0; i < RAIL.length; i++) if (RAIL[i].sheets.indexOf(n) >= 0) return RAIL[i]; return RAIL[0]; }
  function renderRail() {
    var list = sheetList();
    if ($("rail")) $("rail").innerHTML = RAIL.map(function (g, i) {
      var sh = g.sheets.filter(function (n) { return list.indexOf(n) >= 0; }); if (!sh.length) return "";
      var crit = sh.reduce(function (a, n) { return a + critCount(n); }, 0), filled = sh.some(function (n) { return sheetFilled(n); });
      var cur = sh.indexOf(state.active) >= 0;
      return "<button data-g='" + i + "' aria-current='" + cur + "' title='" + esc(g.label + ": " + sh.join(", ")) + "'>" + IC[g.icon] + "<span>" + esc(g.label) + "</span>" +
        (crit ? "<i class='dot' aria-label='" + crit + " critical issues'>" + crit + "</i>" : (filled && g.label !== "Overview" ? "<i class='dot ok' aria-label='No critical issues'>✓</i>" : "")) + "</button>";
    }).join("");
    var g = groupOf(state.active);
    $("crumb").innerHTML = "Data onboarding" + (g.label !== "Overview" ? " › " + esc(g.label) : "") + " › <b>" + esc(state.active) + "</b>";
  }
  if ($("rail")) $("rail").addEventListener("click", function (e) {
    var b = e.target.closest("[data-g]"); if (!b) return;
    var g = RAIL[+b.getAttribute("data-g")], list = sheetList(), sh = g.sheets.filter(function (n) { return list.indexOf(n) >= 0; });
    if (sh.indexOf(state.active) < 0 && sh.length) switchSheet(sh[0]);
  });
  function critCount(n) { return (issues.bySheet[n] || []).filter(function (i) { return i.severity === "Critical"; }).length; }
  function renderTabs() {
    var list = sheetList();
    $("tabs").innerHTML = list.map(function (n, i) {
      var c = critCount(n), filled = sheetFilled(n) > 0, opt = GUIDE.optionalSheets.indexOf(n) >= 0;
      var badge = c ? "<span class='b' aria-label='" + c + " critical issues'>" + c + "</span>" : (filled ? "<span class='b ok' aria-label='No critical issues'>✓</span>" : "");
      return "<button class='tab" + (n === "Overview" ? " ov" : "") + (customDef(n) ? " custom" : "") + (GEN_NAMES.indexOf(n) >= 0 ? " gentab" : "") + "' role='tab' aria-selected='" + (n === state.active) + "' data-sheet='" + esc(n) + "'>" + (GEN_NAMES.indexOf(n) >= 0 ? "<span class='autotag'>Auto</span>" : "") + esc(n) + badge + (opt ? "<span class='x' data-remove='" + esc(n) + "' title='Remove sheet' aria-label='Remove " + esc(n) + "'>×</span>" : "") + "</button>";
    }).join("");
    $("btnAddSheet").hidden = false;
    renderRail();
  }
  $("tabs").addEventListener("click", function (e) {
    var x = e.target.closest("[data-remove]");
    if (x) { var n = x.getAttribute("data-remove"); e.stopPropagation();
      var go = function () { state.enabled[n] = false; if (state.active === n) state.active = "Overview"; save(); switchSheet(state.active); scheduleValidate(); };
      if (sheetFilled(n)) confirmBox("Remove the " + n + " sheet?", "Its " + sheetFilled(n) + " rows stay saved and come back if the sheet is added again. They are left out of the downloaded workbook.", go); else go();
      return; }
    var b = e.target.closest("[data-sheet]"); if (b) switchSheet(b.getAttribute("data-sheet"));
  });
  $("btnAddSheet").addEventListener("click", function (e) {
    var m = document.createElement("div"); m.className = "menu";
    m.innerHTML = GUIDE.optionalSheets.filter(function (n) { return !state.enabled[n]; }).map(function (n) { return "<button data-add='" + esc(n) + "'>" + esc(n) + "<small>" + esc(GUIDE.sheets[n].purpose) + "</small></button>"; }).join("") +
      "<button data-new='1'>New custom sheet<small>A sheet for another module, or information the template doesn't cover</small></button>";
    document.body.appendChild(m);
    var rc = e.target.getBoundingClientRect(); m.style.right = (window.innerWidth - rc.right) + "px"; m.style.bottom = (window.innerHeight - rc.top + 6) + "px";
    setTimeout(function () { document.addEventListener("click", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("click", close); } }); }, 0);
    m.addEventListener("click", function (ev) { if (ev.target.closest("[data-new]")) { m.remove(); openSheetEditor(null); return; } var b = ev.target.closest("[data-add]"); if (!b) return; var n = b.getAttribute("data-add"); state.enabled[n] = true; m.remove(); switchSheet(n); scheduleValidate(); });
  });
  /* ---------------- custom sheets: editor and actions ---------------- */
  var shEdit = null;
  function uid() { return "cs_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function lowName(n) { return String(n || "").trim().toLowerCase(); }
  function sheetNameTaken(n, except) { var k = lowName(n); return RESERVED.indexOf(k) >= 0 || ALL_SHEETS.concat(["Overview"]).some(function (x) { return x !== except && lowName(x) === k; }); }
  function uniqueSheetName(base) { base = String(base).replace(/[\[\]:*?\/\\]/g, " ").trim().slice(0, 31) || "Custom sheet"; var n = base, i = 2; while (sheetNameTaken(n)) n = base.slice(0, 27) + " " + i++; return n; }
  function popMenu(x, y, html, pick) {
    var m = document.createElement("div"); m.className = "menu"; m.style.position = "fixed"; m.innerHTML = html; document.body.appendChild(m);
    m.style.left = Math.max(8, Math.min(x, window.innerWidth - m.offsetWidth - 8)) + "px"; m.style.top = Math.max(8, Math.min(y, window.innerHeight - m.offsetHeight - 8)) + "px";
    setTimeout(function () { document.addEventListener("click", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("click", close); } }); }, 0);
    m.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; m.remove(); pick(b.getAttribute("data-a")); });
  }
  function canDuplicate(n) { return !customDef(n) && SHEET_TABLES[n] && n !== "Asset Category Master" && GEN_NAMES.indexOf(n) < 0 && n !== "Overview"; }
  function sheetAction(a, n) { var d = customDef(n); if (a === "edit" && d) openSheetEditor(d); else if (a === "dup") duplicateSheet(n); else if (a === "del" && d) deleteSheet(d); }
  $("tabs").addEventListener("contextmenu", function (e) {
    var b = e.target.closest("[data-sheet]"); if (!b) return; var n = b.getAttribute("data-sheet"), d = customDef(n);
    if (!d && !canDuplicate(n)) return; e.preventDefault();
    popMenu(e.clientX, e.clientY, d ? "<button data-a='edit'>Edit sheet<small>Rename it, change its columns or module</small></button><button data-a='dup'>Duplicate</button><button data-a='del' class='danger'>Delete sheet</button>"
      : "<button data-a='dup'>Duplicate as a custom sheet<small>Same columns, for another module or a second list</small></button>", function (a) { sheetAction(a, n); });
  });
  function openSheetEditor(def) {
    shEdit = { old: def, untouched: !def, d: def ? JSON.parse(JSON.stringify(def)) : { key: uid(), name: "", module: "", desc: "", cols: BASIC.map(function (f, i) { return { id: i + 1, name: f.name, desc: f.desc, type: f.type, req: f.req, list: [] }; }) } };
    $("shModNote").textContent = def ? "Add the module's fields brings in any of its standard fields this sheet doesn't have yet." : "A new sheet starts with the basic system fields (Name, Description, Site). Pick a module to start from its standard fields instead, then add your own.";
    $("shTitle").textContent = def ? "Edit sheet: " + def.name : "New custom sheet";
    $("shName").value = shEdit.d.name; $("shDesc").value = shEdit.d.desc || "";
    $("shModule").innerHTML = "<option value=''>Choose the module…</option>" + MODULES.map(function (m) { return "<option" + (m === shEdit.d.module ? " selected" : "") + ">" + esc(m) + "</option>"; }).join("");
    $("shErr").textContent = ""; drawShCols(); $("dlgSheet").showModal(); $("shName").focus();
  }
  function drawShCols() {
    var C = shEdit.d.cols;
    $("shCols").innerHTML = "<div class='shc shc-h'><span>Column heading</span><span>Type</span><span>Mandatory</span><span>Dropdown values, comma separated</span><span>Description for the customer</span><span></span></div>" + C.map(function (c, i) {
      return "<div class='shc' data-i='" + i + "'><input data-f='name' value='" + esc(c.name) + "' maxlength='80' aria-label='Column heading'>" +
        "<select data-f='type' aria-label='Type'" + (i ? "" : " disabled") + ">" + Object.keys(CTYPES).map(function (t) { return "<option value='" + t + "'" + (t === (c.type || "text") ? " selected" : "") + ">" + CTYPES[t] + "</option>"; }).join("") + "</select>" +
        "<label class='shreq'><input type='checkbox' data-f='req'" + (c.req || !i ? " checked" : "") + (i ? "" : " disabled") + "> " + (i ? "Yes" : "Always") + "</label>" +
        "<input data-f='list' value='" + esc((c.list || []).join(", ")) + "'" + (c.type === "list" ? "" : " disabled placeholder='For a dropdown list'") + " aria-label='Dropdown values'>" +
        "<input data-f='desc' value='" + esc(c.desc || "") + "' maxlength='300' aria-label='Description'>" +
        "<span class='shbtns'>" + (i ? "<button type='button' data-m='-1' aria-label='Move up'" + (i < 2 ? " disabled" : "") + ">↑</button><button type='button' data-m='1' aria-label='Move down'" + (i === C.length - 1 ? " disabled" : "") + ">↓</button><button type='button' data-x='1' aria-label='Remove column'>✕</button>" : "<small>Name</small>") + "</span></div>";
    }).join("");
  }
  function addModuleFields(auto) {
    var d = shEdit.d, mod = $("shModule").value; if (!mod) { $("shErr").textContent = "Choose the module first."; return; }
    var F = moduleFields(mod), fresh = !!shEdit.untouched, next = 1, have = {}, added = 0;
    if (fresh) d.cols = []; else next = d.cols.reduce(function (m, c) { return Math.max(m, c.id); }, 0) + 1;
    d.cols.forEach(function (c) { have[lowName(c.name)] = 1; });
    F.forEach(function (f, i) { if ((!fresh && i === 0) || have[lowName(f.name)]) return; d.cols.push({ id: next++, name: f.name, desc: f.desc, type: f.type, req: f.req || !d.cols.length, list: f.list || [] }); have[lowName(f.name)] = 1; added++; });
    shEdit.untouched = fresh; drawShCols();
    $("shModNote").textContent = added ? (fresh ? "Started from the " + mod + " module's " + added + " fields" : "Added " + added + " field" + (added === 1 ? "" : "s") + " of the " + mod + " module") + ". Remove what the customer doesn't need and add their own fields with + Add column." : "Every field of the " + mod + " module is already here.";
  }
  $("shModFields").onclick = function () { addModuleFields(false); };
  $("shModule").addEventListener("change", function () { if (shEdit && shEdit.untouched && $("shModule").value) addModuleFields(true); });
  function shField(e) {
    if (shEdit) shEdit.untouched = false;
    var row = e.target.closest("[data-i]"), f = e.target.getAttribute("data-f"); if (!row || !f) return; var c = shEdit.d.cols[+row.getAttribute("data-i")];
    if (f === "req") c.req = e.target.checked; else if (f === "list") c.list = e.target.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean); else c[f] = e.target.value;
    if (f === "type" && e.type === "change") drawShCols();
  }
  $("shCols").addEventListener("input", shField); $("shCols").addEventListener("change", shField);
  $("shCols").addEventListener("click", function (e) {
    var b = e.target.closest("button"), row = e.target.closest("[data-i]"); if (!b || !row) return; shEdit.untouched = false; var i = +row.getAttribute("data-i"), C = shEdit.d.cols;
    if (b.hasAttribute("data-x")) C.splice(i, 1); else { var j = i + (+b.getAttribute("data-m")); if (j < 1 || j >= C.length) return; C.splice(j, 0, C.splice(i, 1)[0]); }
    drawShCols();
  });
  $("shAddCol").onclick = function () { shEdit.untouched = false; var C = shEdit.d.cols; C.push({ id: C.reduce(function (m, c) { return Math.max(m, c.id); }, 0) + 1, name: "", desc: "", type: "text", req: false, list: [] }); drawShCols(); var ins = $("shCols").querySelectorAll("[data-f='name']"); ins[ins.length - 1].focus(); };
  $("shCancel").onclick = function () { $("dlgSheet").close(); };
  $("shOk").onclick = function () {
    var d = shEdit.d, old = shEdit.old, err = "", seen = {};
    d.name = $("shName").value.trim().replace(/\s+/g, " "); d.desc = $("shDesc").value.trim(); d.module = $("shModule").value;
    if (!d.name) err = "Give the sheet a name.";
    else if (/[\[\]:*?\/\\]/.test(d.name)) err = "A sheet name can't contain [ ] : * ? / or \\ (an Excel rule).";
    else if (sheetNameTaken(d.name, old && old.name)) err = "There is already a sheet called '" + d.name + "'.";
    if (!err) d.cols.some(function (c, i) {
      c.name = String(c.name || "").trim().replace(/\*/g, ""); var k = c.name.toLowerCase();
      if (!c.name) err = "Column " + (i + 1) + " needs a heading."; else if (seen[k]) err = "Two columns are called '" + c.name + "'."; else if (c.type === "list" && !(c.list || []).length) err = "Give the dropdown values for '" + c.name + "'.";
      seen[k] = 1; return !!err;
    });
    if (err) { $("shErr").textContent = err; return; }
    d.cols[0].req = true; d.cols[0].type = "text";
    var lost = old ? old.cols.filter(function (c) { return !d.cols.some(function (x) { return x.id === c.id; }); }) : [];
    var go = function () { $("dlgSheet").close(); applySheetDef(d, old); };
    if (lost.length && old && filledRows(old.key)) confirmBox("Remove " + lost.length + " column" + (lost.length === 1 ? "" : "s") + "?", "The values in " + lost.map(function (c) { return "'" + c.name + "'"; }).join(", ") + " are deleted from this sheet. Download the workbook first to keep a copy.", go);
    else go();
  };
  function applySheetDef(d, old) {
    if (old) {
      var ids = old.cols.map(function (c) { return c.id; }), n0 = old.cols.length, same = ids.join() === d.cols.map(function (c) { return c.id; }).join();
      state.tabs[d.key] = rows(old.key).map(function (r) { r = r || []; return d.cols.map(function (c) { var i = ids.indexOf(c.id); return i < 0 || r[i] == null ? "" : r[i]; }).concat(r.slice(n0)); });
      if (!same) { delete state.fmt[d.key]; delete state.colOrder[d.key]; if (state.filters) delete state.filters[d.key]; }
      if (old.name !== d.name) ["colw", "filters"].forEach(function (k) { if (state[k] && state[k][old.name]) { state[k][d.name] = state[k][old.name]; delete state[k][old.name]; } });
      unregisterCustom(old); state.sheets = state.sheets.map(function (x) { return x.key === old.key ? d : x; });
    } else { state.sheets.push(d); if (!state.tabs[d.key]) state.tabs[d.key] = []; }
    registerCustom(d); indexSheets(); rebuildAll(); undoStack = []; redoStack = []; save(); switchSheet(d.name); scheduleValidate();
    toast((old ? "Saved the " : "Added the ") + d.name + " sheet");
  }
  function duplicateSheet(n) {
    var d0 = customDef(n), d;
    if (d0) { d = JSON.parse(JSON.stringify(d0)); d.key = uid(); d.name = uniqueSheetName(d0.name + " copy"); state.tabs[d.key] = JSON.parse(JSON.stringify(rows(d0.key))); }
    else {
      var tab = (SHEET_TABLES[n] || [])[0]; if (!tab) return; var base = TABLES[tab].baseCols.slice(), ni = -1;
      base.forEach(function (c, i) { if (ni < 0 && c.key === "name") ni = i; }); if (ni > 0) base.unshift(base.splice(ni, 1)[0]);
      var T2 = { number: "number", integer: "integer", date: "date", email: "email", phone: "phone", bool: "bool", lat: "number", lng: "number" };
      d = { key: uid(), name: uniqueSheetName(n + " copy"), module: (GUIDE.sheets[n] && GUIDE.sheets[n].label) || n, desc: "A copy of the " + n + " sheet.",
        cols: base.map(function (c, i) { var m = c.meta || {}, L = m.list && !m.multi ? RULES.lists[m.list] : null; return { id: i + 1, name: c.label, desc: c.desc || "", type: L ? "list" : (T2[m.type] || "text"), req: !!c.req || !i, list: L ? L.slice() : [] }; }) };
      state.tabs[d.key] = rows(tab).filter(rowFilled).map(function (r) { return base.map(function (c) { return r[c.d] == null ? "" : r[c.d]; }); });
    }
    applySheetDef(d, null);
  }
  function deleteSheet(d) {
    var n = filledRows(d.key);
    confirmBox("Delete the " + d.name + " sheet?", (n ? "Its " + n + " row" + (n === 1 ? " is" : "s are") + " deleted too. " : "") + "This can't be undone. Download the workbook first to keep a copy.", function () {
      unregisterCustom(d); state.sheets = state.sheets.filter(function (x) { return x.key !== d.key; });
      ["tabs", "fmt", "custom", "colOrder", "filters"].forEach(function (k) { if (state[k]) delete state[k][d.key]; }); ["colw", "filters"].forEach(function (k) { if (state[k]) delete state[k][d.name]; });
      if (state.active === d.name) state.active = "Overview";
      indexSheets(); rebuildAll(); undoStack = []; redoStack = []; save(); switchSheet(state.active); scheduleValidate(); toast("Deleted the " + d.name + " sheet");
    });
  }

  /* ---------------- progress overlay ---------------- */
  function busy(msg, pct, sub) { var el = $("busy"); if (!msg) { el.hidden = true; return; } $("busyMsg").textContent = msg; $("busySub").textContent = sub || ""; $("busyBar").style.width = Math.max(0, Math.min(100, pct || 0)) + "%"; el.hidden = false; }
  function later(fn) { setTimeout(fn, 30); }   /* lets the overlay paint before a long step */

  function renderStatus() {
    var c = { Critical: 0, Warning: 0, Info: 0 }, gcrit = 0; issues.all.forEach(function (i) { if (i.gen) { if (i.severity === "Critical") gcrit++; } else c[i.severity]++; });
    var total = sheetList().reduce(function (n, s) { return n + sheetFilled(s); }, 0), ready = !c.Critical && filledRows("site") > 0;
    var dot = ready ? "#29A01E" : (c.Critical ? "#B61919" : "#FF6700");
    $("status").innerHTML = "<span class='rd'><span class='dot' style='background:" + dot + "'></span>" + (ready ? (c.Warning ? "Ready to import, with " + c.Warning + " warning" + (c.Warning === 1 ? "" : "s") + " to review" : "Ready to import") : (total ? c.Critical + " critical issue" + (c.Critical === 1 ? "" : "s") + " to fix before import" : "Start with the Site sheet")) + "</span>" +
      "<span>" + total + " row" + (total === 1 ? "" : "s") + " entered</span>" + (c.Warning ? "<span>" + c.Warning + " warnings</span>" : "") + (gcrit ? "<span class='genstat'>Import sheets: " + gcrit + " critical</span>" : "") + "<span class='spacer'></span><span id='selStats' class='selstats'></span><button id='stReport'>Check for errors</button>";
    if (stale) $("status").insertAdjacentHTML("afterbegin", "<span class='stale'>Large workbook: edits are checked when you press Check for errors</span>");
    $("stReport").onclick = openReport; updateSelStats();
    var n = critCount(state.active); $("ptCount").hidden = !n; $("ptCount").textContent = n;
  }
  var panelMode = "guide";
  $("ptGuide").onclick = function () { panelMode = "guide"; renderPanel(); };
  $("ptIssues").onclick = function () { panelMode = "issues"; renderPanel(); };
  function renderPanel(soft) {
    if (soft && panelMode === "guide") return;
    $("ptGuide").setAttribute("aria-selected", panelMode === "guide"); $("ptIssues").setAttribute("aria-selected", panelMode === "issues");
    var n = state.active, g = GUIDE.sheets[n], list = sheetList(), h = "";
    if (panelMode === "guide") {
      h += "<h2>" + esc(n) + "</h2><div class='stepno'>Sheet " + (list.indexOf(n) + 1) + " of " + list.length + (GUIDE.optionalSheets.indexOf(n) >= 0 ? " · depends on the onboarding scope" : "") + "</div><p>" + esc(g.purpose) + "</p>";
      if (customDef(n)) h += "<div class='shacts'><button class='btn sm' data-sa='edit'>Edit sheet</button><button class='btn sm' data-sa='dup'>Duplicate</button><button class='btn sm danger' data-sa='del'>Delete</button></div>";
      else if (canDuplicate(n)) h += "<div class='shacts'><button class='btn sm' data-sa='dup' title='Same columns, for another module or a second list'>Duplicate as a custom sheet</button></div>";
      var before = (g.before || []).filter(function (b) { return list.indexOf(b) >= 0; });
      if (before.length) h += "<h3>Fill these sheets first</h3><div class='chips'>" + before.map(function (b) { var f = sheetFilled(b) || (b === "Asset Category Master" && filledRows("cat")); return "<button class='chip" + (f ? " done" : "") + "' data-go='" + esc(b) + "'>" + esc(b) + (f ? " ✓" : "") + "</button>"; }).join("") + "</div>";
      h += "<h3>How to fill it</h3><ol>" + g.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>";
      if (GEN_NAMES.indexOf(n) >= 0) h += genPanel(n);
      (SHEET_TABLES[n] || []).forEach(function (tab) {
        var t = TABLES[tab], b = L.blocks.filter(function (x) { return x.table === tab; })[0];
        var TN = { user: "Users table", role: "Role table", jobPlan: "Job plan table", task: "Task table", inventory: "ITEMS table", tools: "TOOLS table" };
        h += "<h3 class='tbl'>" + esc(TN[tab] || "Columns") + (b ? "<small>Headings on row " + b.headerRow + ", data from row " + b.dataStart + "</small>" : "") + "</h3><div class='colcards'>";
        t.cols.forEach(function (c, i) {
          var d = docFor(tab, c);
          h += "<button class='colcard' data-tab='" + tab + "' data-col='" + i + "'><span class='cn'>" + colLetter(i) + " · " + esc(c.label) + (c.req ? "<span class='req'> *</span>" : "") + "</span>" +
            "<span class='cw'>" + esc(d[0]) + "</span><span class='cr'>" + esc(colRules(tab, i)) + "</span>" + (d[1] ? "<span class='ce'>Example: <b>" + esc(d[1]) + "</b></span>" : "") + "</button>";
        });
        h += "</div>";
      });
      h += "<h3>Watch out for</h3><ul class='watch'>" + g.watch.concat(n === "Overview" ? [] : ["Names used on other sheets must match exactly, including capitals and spaces."]).map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>";
    } else {
      var il = (issues.bySheet[n] || []).slice().sort(function (a, b) { var R = { Critical: 0, Warning: 1, Info: 2 }; return R[a.severity] - R[b.severity] || (a.r || 0) - (b.r || 0); });
      h += "<h2>Issues on " + esc(n) + "</h2><div class='stepno'>" + il.length + " found</div>";
      if (!il.length) h += "<div class='empty'>" + (sheetFilled(n) ? "No issues on this sheet." : "Nothing entered yet.") + "</div>";
      else h += "<ul class='ilist'>" + il.slice(0, 300).map(function (i, k) {
        return "<li data-jump='" + k + "'><span class='sev " + i.severity + "'>" + i.severity + "</span><span class='where'>" + (i.r != null ? "Row " + (i.r + 1) : "Sheet") + (i.field ? ", " + esc(i.field) : "") + "</span><br>" + esc(i.issue) + "<span class='fix'>" + esc(i.suggestion || "") + "</span></li>";
      }).join("") + "</ul>";
      $("pbody")._list = il;
    }
    $("pbody").innerHTML = h;
  }
  $("pbody").addEventListener("click", function (e) {
    var sa = e.target.closest("[data-sa]"); if (sa) { sheetAction(sa.getAttribute("data-sa"), state.active); return; }
    var go = e.target.closest("[data-go]"); if (go) { switchSheet(go.getAttribute("data-go")); return; }
    var col = e.target.closest("[data-col]"); if (col) { var tab = col.getAttribute("data-tab"), b = L.blocks.filter(function (x) { return x.table === tab; })[0]; if (b) { var fi = b.dataStart - 1 + Math.max(0, lastFilled(tab) + 1); select(Math.min(fi, b.dataEnd - 1), +col.getAttribute("data-col")); } grid.focus(); return; }
    var j = e.target.closest("[data-jump]"); if (j) jumpTo($("pbody")._list[+j.getAttribute("data-jump")]);
  });
  function docFor(tab, col) { var d = COLDOC[tab] || {}; return d[col.key || "_"] || [col.desc || "", ""]; }
  function colRules(tab, c) {
    var col = TABLES[tab].cols[c], m = col.meta || {}, ent = ENT[tab], out = [], ref = REFS[tab] && REFS[tab][col.key];
    if (col.custom) return "Custom field added for this onboarding. Optional. Text up to 255 characters. Facilio creates it as a new field when importing.";
    out.push(col.req ? "Mandatory." : "Optional.");
    if (ref) out.push("Pick from the " + TABLES[ref.from].sheet + " sheet" + (ref.where ? ", which lists only those under the chosen " + Object.keys(ref.where).join(" and ") : "") + ". The spelling must match exactly." + (ref.multi ? " Several can be chosen, separated by commas." : ""));
    if (m.list) { var Ls = RULES.lists[m.list]; out.push((m.multi ? "One or more of: " : "Pick from: ") + Ls.join(", ") + "."); }
    if (m.sheetList) out.push("Pick from the Asset Category Master sheet. The spelling must match exactly.");
    if (m.perm) out.push("One or more of: " + RULES.permissions[m.perm].join(", ") + ".");
    if (m.type === "bool") out.push("Yes or No.");
    if (m.type === "date") out.push("A date picked from the calendar, shown as dd/mm/yyyy.");
    if (m.type === "time") out.push("A 24-hour time such as 19:00. Several times can be separated by commas.");
    if (m.type === "integer") out.push("A whole number" + (m.min != null ? " from " + m.min : "") + (m.max != null ? " to " + m.max : "") + (m.allowNegative ? "; negative numbers are allowed for basements" : "") + ".");
    if (m.type === "number") out.push("A number only, without units, commas or currency" + (m.min != null && m.min >= 0 ? "; not negative" : "") + ".");
    if (m.type === "email") out.push("One complete email address, such as name@company.com.");
    if (m.type === "phone") out.push("Digits, with an optional + and country code.");
    if (m.type === "lat" || m.type === "lng") out.push("Decimal degrees, without the ° sign.");
    if (!m.type && !m.list && !m.sheetList && !m.perm && !ref) out.push("Text up to " + (m.long ? 2000 : 255) + " characters, without extra spaces.");
    if (ent && (ent.unique || []).some(function (u) { return u.cols.length === 1 && u.cols[0] === col.key && u.sev === "Critical"; })) out.push("Must be unique.");
    return out.join(" ");
  }
  function jumpTo(i) { if (!i) return; if (i.sheet !== state.active && ALL_SHEETS.indexOf(i.sheet) >= 0) switchSheet(i.sheet); if (i.r != null) select(i.r, Math.max(0, i.c)); grid.focus(); }

  /* ---------------- report dialog ---------------- */
  var repFilter = { sev: { Critical: true, Warning: true, Info: false }, sheet: "" };
  function openReport() { checkInBackground(function () { renderReport(); if (!$("dlgReport").open) $("dlgReport").showModal(); }); }
  function summary() {
    var per = {}, tot = { rows: 0, bad: 0, warn: 0, dup: 0 };
    sheetList().forEach(function (n) { if (n === "Overview" || GEN_NAMES.indexOf(n) >= 0 || n === "Asset Category Master") return; var r = sheetFilled(n); per[n] = { rows: r, bad: {}, warn: {}, dup: 0 }; tot.rows += r; });
    issues.all.forEach(function (i) { var p = per[i.sheet]; if (!p || i.r == null) return; if (i.severity === "Critical") p.bad[i.r] = 1; else if (i.severity === "Warning") p.warn[i.r] = 1; if (/Same as row \d+/.test(i.issue || "")) p.dup++; });
    Object.keys(per).forEach(function (n) { var p = per[n]; p.badN = Object.keys(p.bad).length; p.warnN = Object.keys(p.warn).filter(function (r) { return !p.bad[r]; }).length; tot.bad += p.badN; tot.warn += p.warnN; tot.dup += p.dup; });
    return { per: per, tot: tot };
  }
  function renderReport() {
    var c = { Critical: 0, Warning: 0, Info: 0 }; issues.all.forEach(function (i) { c[i.severity]++; });
    var list = issues.all.filter(function (i) { return repFilter.sev[i.severity] && (!repFilter.sheet || i.sheet === repFilter.sheet); });
    var S2 = summary(), T2 = S2.tot;
    var h = "<div class='sumgrid'><div><b>" + T2.rows + "</b><span>Records checked</span></div><div class='good'><b>" + Math.max(0, T2.rows - T2.bad) + "</b><span>Valid records</span></div><div class='bad'><b>" + T2.bad + "</b><span>Records with errors</span></div><div class='warn'><b>" + T2.warn + "</b><span>Records with warnings only</span></div><div><b>" + T2.dup + "</b><span>Duplicates</span></div></div>" +
      "<table class='sheetsum'><thead><tr><th>Sheet</th><th>Records</th><th>With errors</th><th>Warnings only</th><th>Duplicates</th></tr></thead><tbody>" + Object.keys(S2.per).filter(function (n) { var p = S2.per[n]; return p.rows || p.badN || (issues.bySheet[n] || []).length; }).map(function (n) { var p = S2.per[n];
        return "<tr data-go='" + esc(n) + "'><td>" + esc(n) + "</td><td>" + p.rows + "</td><td class='" + (p.badN ? "bad" : "n0") + "'>" + p.badN + "</td><td class='" + (p.warnN ? "" : "n0") + "'>" + p.warnN + "</td><td class='" + (p.dup ? "" : "n0") + "'>" + p.dup + "</td></tr>"; }).join("") + "</tbody></table>";
    h += "<div class='sumrow'><div class='c'><b>" + c.Critical + "</b><span>Critical, block import</span></div><div class='w'><b>" + c.Warning + "</b><span>Warnings</span></div><div class='i'><b>" + c.Info + "</b><span>Info</span></div></div>";
    h += "<div class='rep-filters'>" + ["Critical", "Warning", "Info"].map(function (s) { return "<button class='fchip' data-sev='" + s + "' aria-pressed='" + repFilter.sev[s] + "'>" + s + "</button>"; }).join("") +
      "<select id='repSheet' aria-label='Filter by sheet'><option value=''>All sheets</option>" + sheetList().filter(function (n) { return n !== "Overview"; }).map(function (n) { return "<option" + (repFilter.sheet === n ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + "</select></div>";
    if (!list.length) h += "<div class='empty'>" + (issues.all.length ? "No issues match these filters." : "No issues found.") + "</div>";
    else h += "<table class='rep'><thead><tr><th>Severity</th><th>Sheet</th><th>Row</th><th>Column</th><th>Value</th><th>Issue and fix</th></tr></thead><tbody>" + list.slice(0, 600).map(function (i, k) {
      return "<tr data-n='" + k + "'><td><span class='sev " + i.severity + "'>" + i.severity + "</span></td><td>" + esc(i.sheet) + "</td><td>" + (i.r != null ? i.r + 1 : "") + "</td><td>" + esc(i.field) + "</td><td>" + esc(String(i.value || "").slice(0, 60)) + "</td><td>" + esc(i.issue) + " <span style='color:var(--muted)'>" + esc(i.suggestion || "") + "</span></td></tr>";
    }).join("") + "</tbody></table>" + (list.length > 600 ? "<p class='empty'>Showing the first 600. The downloaded report has all " + list.length + ".</p>" : "");
    $("repBody").innerHTML = h; $("repBody")._list = list;
  }
  $("repBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sev]"); if (b) { var s = b.getAttribute("data-sev"); repFilter.sev[s] = !repFilter.sev[s]; renderReport(); return; }
    var sg = e.target.closest("tr[data-go]"); if (sg) { repFilter.sheet = sg.getAttribute("data-go"); renderReport(); return; }
    var tr = e.target.closest("tr[data-n]"); if (tr) { $("dlgReport").close(); jumpTo($("repBody")._list[+tr.getAttribute("data-n")]); }
  });
  $("repBody").addEventListener("change", function (e) { if (e.target.id === "repSheet") { repFilter.sheet = e.target.value; renderReport(); } });
  $("repClose").onclick = function () { $("dlgReport").close(); };
  $("repAgain").onclick = openReport;
  $("btnReport").onclick = openReport;
  $("repDownload").onclick = function () {
    var wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Issues", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [{ header: "Severity", width: 11 }, { header: "Sheet", width: 20 }, { header: "Row", width: 7 }, { header: "Column", width: 24 }, { header: "Entered value", width: 28 }, { header: "Issue", width: 70 }, { header: "Suggested fix", width: 55 }];
    issues.all.forEach(function (i) { ws.addRow([i.severity, i.sheet, i.r != null ? i.r + 1 : "", i.field, String(i.value || ""), i.issue, i.suggestion || ""]); });
    styleHeader(ws.getRow(1)); ws.autoFilter = { from: "A1", to: "G1" };
    ws.eachRow(function (row, n) { if (n > 1) { row.alignment = { vertical: "top", wrapText: true }; var s = row.getCell(1).value; row.getCell(1).font = { bold: true, color: { argb: s === "Critical" ? "FFC62F3D" : s === "Warning" ? "FFA35F00" : "FF2F6FA8" } }; } });
    saveWB(wb, "Facilio onboarding check report " + today() + ".xlsx");
  };

  /* ---------------- export workbook ---------------- */
  function today() { return new Date().toISOString().slice(0, 10); }
  function styleHeader(row) { row.eachCell(function (c) { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C2A63" } }; c.alignment = { vertical: "middle", wrapText: true }; }); row.height = 30; }
  function saveWB(wb, name) {
    wb.xlsx.writeBuffer().then(function (buf) {
      var blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      toast("Downloaded " + name);
    }).catch(function (e) { console.error(e); toast("The file couldn't be created."); });
  }
  var REFCOL = { site: 0, building: 0, floor: 0, space: 0, asset: 1, vendor: 0, vendorContact: 0, user: 0, role: 0, jobPlan: 0, task: 0, tenant: 0 };
  function addInstructions(wb, names) {
    var ws = wb.addWorksheet("Instructions"), r = 1, NAVY = "FF2C2A63";
    ws.getColumn(1).width = 30; ws.getColumn(2).width = 72; ws.getColumn(3).width = 56; ws.getColumn(4).width = 22;
    var put = function (vals, style) { var row = ws.getRow(r++); vals.forEach(function (v, i) { var c = row.getCell(i + 1); c.value = v; c.alignment = { wrapText: true, vertical: "top" }; if (style) style(c); }); return row; };
    put(["Facilio onboarding workbook"], function (c) { c.font = { bold: true, size: 16, color: { argb: NAVY } }; }); r++;
    ["1. Fill each sheet from the first empty row under the grey description row. Keep the sheet names and column headings exactly as they are.",
     "2. Columns marked * are mandatory. Every record needs its Name: a row without one is not imported.",
     "3. Pick values from the dropdown lists. Values must match the list exactly, including capitals and spaces.",
     "4. Write dates as dd/mm/yyyy and numbers without currency signs or thousands separators.",
     "5. Names used on other sheets (sites, buildings, floors, vendors, job plans) must be typed exactly as on their own sheet.",
     "6. Need another module or information the template doesn't cover? Add a sheet with a Name column and your own headings: it is brought in as a custom sheet.",
     "7. When you're done, import this file on the Data onboarding page (Import Excel, or drop it on the page) and press Check for errors. Fix what it lists and check again."].forEach(function (t) { put([t]); ws.mergeCells(r - 1, 1, r - 1, 4); });
    r++; put(["Sheet", "What it holds", "Mandatory columns", "Facilio module"], function (c) { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
    names.forEach(function (n) {
      if (n === "Overview" || GEN_NAMES.indexOf(n) >= 0) return; var g = GUIDE.sheets[n] || {}, d = customDef(n), req = [];
      (SHEET_TABLES[n] || []).forEach(function (k) { TABLES[k].cols.forEach(function (c) { if (c.req) req.push(cleanHeader(c.h)); }); });
      put([n, g.purpose || "", req.join(", ") || "None", d ? (d.module || "Custom sheet") : ((g.label && g.label !== n) ? g.label : n)]);
    });
    ws.views = [{ state: "frozen", ySplit: 0 }];
  }
  function exportWorkbook() {
    var names = sheetList(), wb = new ExcelJS.Workbook(); wb.creator = "Facilio"; wb.created = new Date();
    addInstructions(wb, names);
    var all = {}, pos = {};
    names.forEach(function (n) { var S = sheetCells(n); all[n] = S; S.layout.blocks.forEach(function (b) { pos[b.table] = { sheet: n, start: b.dataStart, end: Math.max(b.dataStart, b.dataStart + lastFilled(b.table)) }; }); });
    names.forEach(function (n) {
      var S = all[n], ws = wb.addWorksheet(n);
      for (var c = 0; c < S.layout.maxCol; c++) ws.getColumn(c + 1).width = Math.round((((state.colw[n] || {})[c]) || baseColW(n, c)) / 7.4);
      Object.keys(S.cells).forEach(function (k) {
        var p = k.split(":"), r = +p[0], c = +p[1] + 1, cell = S.cells[k], v = cell.v, x = ws.getCell(r, c);
        if (v && typeof v === "object" && v.date) { var d = v.date.split("-"); x.value = new Date(Date.UTC(+d[0], +d[1] - 1, +d[2])); x.numFmt = "dd/mm/yyyy"; }
        else if (v && typeof v === "object" && "time" in v) { x.value = v.time; x.numFmt = "hh:mm"; }
        else x.value = v;
        var kd = cell.kind;
        if (kd === "title") x.font = { bold: true, size: 14, color: { argb: "FF2C2A63" } };
        else if (kd === "intro") x.font = { italic: true, color: { argb: "FF5E6676" } };
        else if (kd === "header" || kd === "refhead") { x.font = { bold: true, color: { argb: "FFFFFFFF" } }; x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C2A63" } }; x.alignment = { vertical: "middle", wrapText: true }; }
        else if (kd === "desc") { x.font = { italic: true, size: 9, color: { argb: "FF5E6676" } }; x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F8" } }; x.alignment = { vertical: "top", wrapText: true }; }
        else if (kd === "note" || kd === "ref") x.alignment = { wrapText: true, vertical: "top" };
      });
      exportFormats(ws, S.layout, n);
      S.layout.rows.forEach(function (row, i) { if (row.type === "static" && row.kind === "header") ws.getRow(i + 1).height = 32; if (row.type === "static" && row.kind === "desc") ws.getRow(i + 1).height = 48; });
      S.layout.blocks.forEach(function (b) {
        var t = TABLES[b.table], last = b.last ? b.dataStart + Math.max(500, lastFilled(b.table) + 300) : b.dataEnd;
        t.cols.forEach(function (col, i) {
          var Lt = ws.getColumn(i + 1).letter, range = Lt + b.dataStart + ":" + Lt + last, m = col.meta, f = null, ref = REFS[b.table] && REFS[b.table][col.key];
          if (m.list && !m.multi) f = '"' + RULES.lists[m.list].join(",") + '"';
          else if (m.type === "bool") f = '"Yes,No"';
          else if (m.sheetList && pos.cat) f = "'Asset Category Master'!$A$" + pos.cat.start + ":$A$" + (pos.cat.end + 200);
          else if (b.table === "pm" && col.key === "runEvery") f = "Cycles!$A$1:$A$60";
          else if (ref && !ref.multi && pos[ref.from]) { var P = pos[ref.from], L2 = ws.getColumn((ref.col ? Math.max(0, ci(ref.from, ref.col)) : REFCOL[ref.from]) + 1).letter; f = "'" + P.sheet + "'!$" + L2 + "$" + P.start + ":$" + L2 + "$" + (P.end + 200); }
          if (f && f.length < 255) ws.dataValidations.add(range, { type: "list", allowBlank: true, formulae: [f], showErrorMessage: true, errorStyle: "warning", errorTitle: "Not in the list", error: "Pick a value from the list so it matches Facilio exactly." });
        });
      });
      if (S.layout.blocks[0]) ws.views = [{ state: "frozen", ySplit: S.layout.blocks[0].dataStart - 1 }];
      if (S.layout.gen) ws.views = [{ state: "frozen", ySplit: 1 }];
    });
    var cy = wb.addWorksheet("Cycles", { state: "hidden" }); for (var i = 1; i <= 60; i++) cy.getCell(i, 1).value = i;
    saveWB(wb, "Facilio onboarding data " + today() + ".xlsx");
  }
  $("btnExport").onclick = function () {
    checkInBackground(function () { var crit = issues.all.filter(function (i) { return i.severity === "Critical"; }).length;
    if (crit) confirmBox("Download with " + crit + " critical issue" + (crit === 1 ? "" : "s") + "?", "The workbook can be downloaded now, but Facilio can't import it until the critical issues are fixed. The check report lists each one.", exportWorkbook);
    else exportWorkbook(); });
  };

  /* ---------------- import ---------------- */
  $("btnImport").onclick = function () { $("fileInput").click(); };
  $("fileInput").addEventListener("change", function () { var f = this.files[0]; this.value = ""; if (f) importFile(f); });
  ["dragenter", "dragover"].forEach(function (t) { document.addEventListener(t, function (e) { if ($("dlgImp").open) { e.preventDefault(); return; } if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0) { e.preventDefault(); $("dropzone").hidden = false; } }); });
  document.addEventListener("dragleave", function (e) { if (!e.relatedTarget) $("dropzone").hidden = true; });
  document.addEventListener("drop", function (e) { e.preventDefault(); $("dropzone").hidden = true; if ($("dlgImp").open) return; var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) importFile(f); });
  function importFile(file) {
    var html = /\.html?$/i.test(file.name);
    if (!html && !/\.(xlsx|xlsm|xls)$/i.test(file.name)) { toast("Choose an Excel workbook (.xlsx) or the customer's onboarding HTML file."); return; }
    var go = function () {
      busy("Reading " + file.name + "…", 15, file.size > 2e6 ? "A large file takes a little while. " + BGNOTE : "");
      openBook(file, html).then(function (bk) {
        busy("Matching the sheets and columns…", 40);
        later(function () { mapUnknownSheets(bk, function (plan) { busy("Checking the data…", 70, bk.wb ? "" : BGNOTE); later(function () { finishImport(bk, plan, file.name + (html ? " (customer HTML)" : "")); }); }); });
      }).catch(function (e) { busy(); console.error(e); toast((e && e.userMsg) || "The file couldn't be read as an onboarding workbook."); });
    };
    if (anyData()) confirmBox("Replace the data in this workspace?", "Importing '" + file.name + "' replaces what is entered here. Download the current workbook first to keep a copy.", go); else go();
  }
  /* the file to import: read by the background worker when there is one, else here. Returns { names, head(n), count(n), wb (only when read here) } */
  function openBook(file, html) {
    return (html ? htmlBook(file) : file.arrayBuffer()).then(function (src) {
      if (getWorker()) {
        var buf = src instanceof ArrayBuffer ? src : XLSX.write(src, { type: "array", bookType: "xlsx" });
        return ask({ kind: "read", buf: buf }, [buf]).then(function (r) { if (r.error) throw new Error(r.error); return { names: r.sheetNames.slice(), head: function (n) { return r.previews[n].head; }, count: function (n) { return r.previews[n].count; } }; });
      }
      var wb = src instanceof ArrayBuffer ? XLSX.read(new Uint8Array(src), { type: "array", cellNF: true, cellDates: false }) : src;
      return { names: wb.SheetNames.slice(), wb: wb, head: function (n) { return sheetRows(wb.Sheets[n]).slice(0, 12); }, count: function (n) { return sheetRows(wb.Sheets[n]).length; } };
    });
  }
  function htmlBook(file) {
    var host = null; try { host = window.parent !== window ? window.parent : null; } catch (e) { }
    if (!host || typeof host.FWBOnbHtmlRows !== "function") return Promise.reject({ userMsg: "Open this workspace from Delivery Studio to import a customer's onboarding HTML file." });
    return file.text().then(function (t) { return host.FWBOnbHtmlRows(t); }).then(function (r) {
      if (!r || !r.ok) throw { userMsg: "The HTML file couldn't be used: " + ((r && r.errors) || []).slice(0, 2).map(function (x) { return typeof x === "string" ? x : (x && (x.message || x.issue)) || ""; }).join(" ") };
      var wb = XLSX.utils.book_new(); Object.keys(r.sheets).forEach(function (n) { XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r.sheets[n]), n.slice(0, 31)); });
      if (!wb.SheetNames.length) throw { userMsg: "The HTML file has no rows filled in yet." };
      return wb;
    });
  }
  function knownSheet(n) {
    var k = normH(n); if (k === "overview" || RESERVED.indexOf(k) >= 0) return true;
    return (RULES.ignoreSheets || []).concat(GEN_NAMES).some(function (x) { return normH(x) === k; }) || RULES.entities.some(function (e) { return e.sheet.some(function (a) { return normH(a) === k; }); });
  }
  function sheetRows(ws) { return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false, raw: false }); }
  function headerRowOf(R) {
    var i, filled = function (row) { return (row || []).filter(function (v) { return String(v).trim(); }).length; };
    for (i = 0; i < Math.min(R.length, 10); i++) if (filled(R[i]) >= 2) return i;
    for (i = 0; i < R.length; i++) if (filled(R[i])) return i; return 0;
  }
  function defFromRows(n, R, mod) {
    var H = (R[headerRowOf(R)] || []).map(function (v) { return String(v).trim(); }), seen = {}, cols = [];
    H.forEach(function (h, i) { if (!h) return; var nm = h.replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Column " + (i + 1), base = nm, j = 2; while (seen[nm.toLowerCase()]) nm = base + " " + j++; seen[nm.toLowerCase()] = 1; cols.push({ id: cols.length + 1, name: nm, desc: "", type: "text", req: /\*/.test(h), list: [] }); });
    if (!cols.length) return null;
    var ni = 0; cols.some(function (c, i) { if (/\bname\b/i.test(c.name)) { ni = i; return true; } return false; }); if (ni) cols.unshift(cols.splice(ni, 1)[0]); cols[0].req = true;
    return { key: uid(), name: uniqueSheetName(n), module: mod || "", desc: "Brought in from an imported file.", cols: cols };
  }
  function mapUnknownSheets(bk, done) {
    var plan = { skip: [], renames: [] }, un = bk.names.filter(function (n) { return !knownSheet(n) && bk.count(n) > 1; });
    if (!un.length) { done(plan); return; }
    busy();
    var targets = sheetList().filter(function (n) { return n !== "Overview" && GEN_NAMES.indexOf(n) < 0 && n !== "Asset Category Master"; });
    $("mapNote").textContent = "These sheets in the file don't match a sheet in this workspace. Keep each as a new custom sheet (its columns come from its heading row), put it into an existing sheet, or leave it out.";
    $("mapRows").innerHTML = un.map(function (n) { var R = bk.head(n), hr = headerRowOf(R), nc = (R[hr] || []).filter(function (v) { return String(v).trim(); }).length;
      return "<div class='mapr'><div><b>" + esc(n) + "</b><small>" + Math.max(0, bk.count(n) - hr - 1).toLocaleString() + " rows · " + nc + " columns</small></div>" +
        "<select data-f='to' aria-label='What to do with " + esc(n) + "'><option value='new'>Add as a new custom sheet</option>" + targets.map(function (t) { return "<option value='to:" + esc(t) + "'>Put into the " + esc(t) + " sheet</option>"; }).join("") + "<option value='skip'>Leave it out</option></select>" +
        "<select data-f='mod' aria-label='Facilio module for " + esc(n) + "'><option value=''>Facilio module…</option>" + MODULES.map(function (m) { return "<option>" + esc(m) + "</option>"; }).join("") + "</select></div>"; }).join("");
    $("mapOk").onclick = function () {
      var els = $("mapRows").querySelectorAll(".mapr"), notes = [], names = bk.names.slice();
      un.forEach(function (n, i) {
        var to = els[i].querySelector("[data-f=to]").value, mod = els[i].querySelector("[data-f=mod]").value;
        if (to === "skip") { plan.skip.push(n); notes.push(n + " left out"); }
        else if (to.indexOf("to:") === 0) { var t = to.slice(3); if (names.indexOf(t) >= 0) { plan.skip.push(n); notes.push(n + " not used: the file already has a " + t + " sheet"); } else { plan.renames.push([n, t]); names[names.indexOf(n)] = t; } }
        else { var d = defFromRows(n, bk.head(n), mod); if (!d) return; state.sheets.push(d); state.tabs[d.key] = []; registerCustom(d); if (d.name !== n) plan.renames.push([n, d.name]); }
      });
      indexSheets(); rebuildAll(); $("dlgMap").close(); if (notes.length) toast(notes.join(". ") + "."); busy("Checking the data…", 70); later(function () { done(plan); });
    };
    $("mapCancel").onclick = function () { $("dlgMap").close(); toast("Import cancelled. Nothing changed."); };
    $("dlgMap").showModal();
  }
  function finishImport(bk, plan, name) {
    setCustomRules();
    var fail = function (e) { busy(); console.error(e); toast("The file couldn't be read as an onboarding workbook."); };
    if (bk.wb) {
      var wb = bk.wb, res;
      plan.skip.forEach(function (n) { delete wb.Sheets[n]; wb.SheetNames = wb.SheetNames.filter(function (x) { return x !== n; }); });
      plan.renames.forEach(function (p) { wb.Sheets[p[1]] = wb.Sheets[p[0]]; delete wb.Sheets[p[0]]; wb.SheetNames[wb.SheetNames.indexOf(p[0])] = p[1]; });
      try { res = OnboardingValidator.validate(wb, RULES); } catch (e) { fail(e); return; }
      importResult(res, wb.SheetNames, name); return;
    }
    ask({ kind: "import", skip: plan.skip, renames: plan.renames, rules: RULES }).then(function (r) { if (r.error) throw new Error(r.error); importResult({ data: r.data, lists: r.lists }, r.sheetNames, name); }).catch(fail);
  }
  function importResult(res, sheetNames, fileName) {
        try {
          var D = res.data || {}, n = 0, fresh = freshState(); fresh.seenWalk = true; fresh.sheets = state.sheets.slice();
          Object.keys(TABLES).forEach(function (tab) {
            if (tab === "cat" || !D[tab]) return;
            var cols = TABLES[tab].baseCols, extra = D[tab].custom || [];
            if (extra.length) {
              fresh.custom[tab] = extra.map(function (x) { var old = customDefs(tab).filter(function (o) { return o && lowName(o.name) === lowName(x.h); })[0]; return old ? JSON.parse(JSON.stringify(old)) : { name: x.h }; });
              var order = cols.map(function (c0) { return c0.d; });
              extra.forEach(function (x, k) {
                var before = 0; Object.keys(D[tab].colMap).forEach(function (key) { if (D[tab].colMap[key].ci < x.ci) before++; });
                var pos = Math.min(order.length, before + extra.slice(0, k).filter(function (y) { return y.ci < x.ci; }).length);
                order.splice(pos, 0, cols.length + k);
              });
              fresh.colOrder[tab] = order;
            }
            fresh.tabs[tab] = D[tab].rows.map(function (rec) {
              n++;
              return cols.map(function (col) {
                var v = rec[col.key]; if (v == null) return "";
                if (v instanceof Date) return isNaN(v) ? "" : v.toISOString().slice(0, 10);
                if (typeof v === "object" && v.err) return v.err;
                if (typeof v === "object" && "time" in v) { var m = Math.round(v.time * 1440); return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
                return String(v);
              }).concat(extra.map(function (x) { var v = rec["~" + x.h]; return v == null ? "" : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)); }));
            });
          });
          GUIDE.optionalSheets.forEach(function (s) { fresh.enabled[s] = sheetNames.some(function (x) { return normH(x) === normH(s); }); });
          if (res.lists && res.lists.assetCategory && res.lists.assetCategory.sheet) fresh.tabs.cat = res.lists.assetCategory.values.map(function (v) { return [v]; });
          fresh.importSettings = state.importSettings || {}; state = fresh; rebuildAll(); undoStack = []; redoStack = []; save(); switchSheet("Site"); busy();
          toast("Imported " + n.toLocaleString() + " rows from " + fileName + ". Press Check for errors to see what needs fixing."); checkInBackground();
        } catch (e) { busy(); console.error(e); toast("The file couldn't be read as an onboarding workbook."); }
  }

  /* ---------------- dialogs, walkthrough, theme ---------------- */
  var cfCb = null;
  function confirmBox(title, body, cb) { $("cfTitle").textContent = title; $("cfBody").textContent = body; cfCb = cb; $("dlgConfirm").showModal(); }
  $("cfYes").onclick = function () { $("dlgConfirm").close(); if (cfCb) cfCb(); cfCb = null; };
  $("cfNo").onclick = function () { $("dlgConfirm").close(); cfCb = null; };
  var toastT = null;
  function toast(msg) { var el = $("toast"); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2600); }
  var wt = 0;
  var ART = {
    grid: "<div class='mini'><span class='h'>Site Name *</span><span class='h'>Site Type</span><span class='h'>Buildings *</span><span class='h'>Address</span><span>ABC Site</span><span class='s'>Offices</span><span>2</span><span>Yas Island</span><span>PQR Site</span><span>Residential</span><span>1</span><span>Al Reem</span><span></span><span></span><span></span><span></span></div>",
    flow: "<div class='flow'>" + ["Site", "Building", "Floors", "Spaces", "Asset", "Roles & Users", "Vendor", "Vendor Contact", "Job Plan", "PM Assets"].map(function (s, i) { return "<span" + (i === 0 ? " class='k'" : "") + ">" + (i + 1) + ". " + s + "</span>"; }).join("") + "</div>",
    match: "<div class='match'><div>Building sheet: <b>ApeX Apartments</b></div><div>Asset sheet: <b>ApeX Apartments</b> ✓</div><div>Asset sheet: <s>apex Apartments</s> ✗</div></div>",
    marks: "<div class='mini'><span class='h'>Asset Name *</span><span class='h'>Category *</span><span class='h'>Building</span><span class='h'>Site *</span><span>Chiller 01</span><span>Chiller</span><span class='r'>building A</span><span>ABC Site</span><span>AHU 01</span><span class='a'>Ahu</span><span>Building A</span><span>ABC Site</span><span>Pump 01</span><span>Pump</span><span>Building A</span><span class='r'></span></div>",
    send: "<div class='send'><div class='file'></div>Facilio onboarding data.xlsx</div>",
    auto: "<div class='flow' style='max-width:300px'><span class='k'>PM Assets</span><span class='k'>Job Plan</span><span class='k'>Asset</span><span style='background:none;font-size:18px'>→</span><span>Job Plan Import</span><span>Trigger Schedule Import</span><span>PPM V3 Import</span></div>",
    tabs: "<div class='flow'>" + ["Overview", "Site", "Building", "Floors", "Spaces", "Asset", "Roles & Users", "Vendor", "Vendor Contact", "Job Plan", "PM Assets", "Inventory", "Tenants", "Tenant Contact", "Asset Category Master"].map(function (s, i) { return "<span" + (i === 1 ? " class='k'" : "") + ">" + s + "</span>"; }).join("") + "</div>",
    paste: "<div class='mini'><span class='h'>Site Name *</span><span class='h'>Site Type ▾</span><span class='h'>Buildings *</span><span class='h'>Address</span><span>ABC Site</span><span class='s'>Residential ▾</span><span>2</span><span>Yas Island</span><span>PQR Site</span><span>Offices</span><span>1</span><span>Al Reem</span><span class='s'>Ctrl + V</span><span></span><span></span><span></span></div>"
  };
  function renderWalk() {
    var s = GUIDE.walkthrough[wt], last = wt === GUIDE.walkthrough.length - 1;
    $("wtArt").innerHTML = ART[s.art] || ""; $("wtStep").textContent = "Step " + (wt + 1) + " of " + GUIDE.walkthrough.length;
    $("wtTitle").textContent = s.title; $("wtBody").textContent = s.body;
    $("wtDots").innerHTML = GUIDE.walkthrough.map(function (_, i) { return "<i class='" + (i === wt ? "on" : "") + "'></i>"; }).join("");
    $("wtBack").hidden = wt === 0; $("wtImport").hidden = !last; $("wtNext").textContent = last ? "Start filling" : "Next";
  }
  function openWalk() { wt = 0; renderWalk(); $("dlgWalk").showModal(); }
  function closeWalk() { $("dlgWalk").close(); state.seenWalk = true; save(); grid.focus(); }
  $("wtNext").onclick = function () { if (wt < GUIDE.walkthrough.length - 1) { wt++; renderWalk(); } else closeWalk(); };
  $("wtBack").onclick = function () { if (wt > 0) { wt--; renderWalk(); } };
  $("wtSkip").onclick = closeWalk;
  $("wtImport").onclick = function () { closeWalk(); $("fileInput").click(); };
  $("btnGuide").onclick = function (e) {
    e.stopPropagation();
    var old = document.getElementById("walkMenu"); if (old) { old.remove(); return; }
    var n = state.active, steps = sheetTourSteps(n).length;
    var m = document.createElement("div"); m.className = "menu"; m.id = "walkMenu";
    m.innerHTML = "<button data-w='sheet'>Tour of this sheet: " + esc(n) + "<small>" + steps + " steps. " + (n === "Overview" ? "How the workbook is organised." : "Column by column: what to enter, the format, and an example.") + "</small></button>" +
      "<button data-w='ui'>Tour of the workspace<small>The buttons, panels and markers, one at a time.</small></button>" +
      "<button data-w='start'>Getting started<small>The basics in " + GUIDE.walkthrough.length + " short cards.</small></button>";
    document.body.appendChild(m);
    var rc = $("btnGuide").getBoundingClientRect(); m.style.top = (rc.bottom + 6) + "px"; m.style.left = Math.max(8, Math.min(rc.left, window.innerWidth - 300)) + "px";
    setTimeout(function () { document.addEventListener("click", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("click", close); } }); }, 0);
    m.addEventListener("click", function (ev) { var b = ev.target.closest("[data-w]"); if (!b) return; m.remove(); var w = b.getAttribute("data-w");
      if (w === "start") openWalk(); else if (w === "ui") startTour(uiTourSteps()); else startTour(sheetTourSteps(state.active)); });
  };

  /* ---------------- spotlight tours ---------------- */
  var tour = null;
  function headerCells(b, cFrom, cTo) {
    var r = b.headerRow - 1, out = [];
    for (var c = cFrom; c <= cTo; c++) { var el = rowsLayer.querySelector("[data-r='" + r + "'][data-c='" + c + "']"); if (el) out.push(el); }
    return out;
  }
  function showHeader(b, c) {
    grid.scrollTop = Math.max(0, tops[b.headerRow - 1] - (b.headerRow > 2 ? tops[b.headerRow - 1] - tops[Math.max(0, b.headerRow - 3)] : 0));
    var x = colLeft(c);
    if (x - 46 < grid.scrollLeft || x + colW(c) > grid.scrollLeft + grid.clientWidth) grid.scrollLeft = Math.max(0, x - 46 - 40);
    sel = { r: b.dataStart - 1, c: c, r2: b.dataStart - 1, c2: c }; renderHead(); renderBody(); renderFx();
  }
  function sheetTourSteps(n) {
    var g = GUIDE.sheets[n], steps = [], lay = sheetLayout(n);
    if (n === "Overview") {
      steps.push({ target: function () { return [$("grid")]; }, enter: function () { if (state.active !== n) switchSheet(n); }, title: "Overview", body: g.purpose });
      steps.push({ target: function () { return [$("tabs")]; }, title: "One tab per template sheet", body: "The tabs follow the template's sheet order. Sheets on the left feed the dropdowns of sheets on the right, so they are filled from left to right." });
      steps.push({ target: function () { return [$("btnGuide")]; }, title: "A tour on every sheet", body: "On any sheet, Walkthrough → Tour of this sheet explains each column: what to enter, the format, and an example." });
      return steps;
    }
    steps.push({ target: function () { return [$("grid")]; }, enter: function () { if (state.active !== n) switchSheet(n); }, title: n + ": what it is for", body: g.purpose + ((g.before || []).length ? " Fill these sheets first: " + g.before.join(", ") + "." : "") });
    lay.blocks.forEach(function (b) {
      var t = TABLES[b.table], TN = { user: "Users table", role: "Role table", jobPlan: "Job plan table", task: "Task table", inventory: "ITEMS table", tools: "TOOLS table" };
      if (lay.blocks.length > 1) steps.push({ enter: function () { showHeader(L.blocks.filter(function (x) { return x.table === b.table; })[0], 0); }, target: function () { var bb = L.blocks.filter(function (x) { return x.table === b.table; })[0]; return headerCells(bb, 0, t.cols.length - 1); },
        title: (TN[b.table] || "Table"), body: "Headings are on row " + b.headerRow + (t.descRow ? ", the template's guidance is on row " + (b.headerRow + 1) : "") + ", and data starts on row " + b.dataStart + "." });
      t.cols.forEach(function (col, i) {
        var d = docFor(b.table, col);
        steps.push({ enter: function () { showHeader(L.blocks.filter(function (x) { return x.table === b.table; })[0], i); },
          target: function () { var bb = L.blocks.filter(function (x) { return x.table === b.table; })[0]; return headerCells(bb, i, i); },
          title: colLetter(i) + " · " + col.label + (col.req ? " *" : ""), body: d[0], rules: colRules(b.table, i), example: d[1] });
      });
    });
    steps.push({ target: function () { return [$("ptIssues"), $("status")]; }, title: "Check the sheet", body: "Problem cells get a red (blocks the import) or amber (review) corner. The Issues tab lists every problem on this sheet, and selecting one jumps to the cell. Watch out for: " + g.watch.slice(0, 3).join(" ") });
    return steps;
  }
  function uiTourSteps() {
    return [
      { target: function () { return [$("nameBox")]; }, title: "Name box", body: "Shows the selected cell, for example A4. Row numbers match the downloaded workbook. Type an address such as B25 or Asset!C5 and press Enter to jump there." },
      { target: function () { return [$("fx")]; }, title: "Formula bar and column details", body: "The fx box shows the selected cell's value; long values can be edited there. Below it: the selected column, what it needs and, when there is a problem, what is wrong and how to fix it. Many problems have an Apply fix button." },
      { target: function () { return [$("ribbon")]; }, title: "Toolbar", body: "Undo and redo; font size, bold, italic, underline, strikethrough, text colour and highlight, borders and the format painter, on any cell including headings; alignment and wrap text; rows, columns, sort, filter, fill down (Ctrl+D) and right (Ctrl+R), Freeze to keep columns in view, find and replace. Right-click a cell for notes (Shift+F2)." },
      { target: function () { return [$("grid")]; }, enter: function () { if (state.active === "Overview") switchSheet("Site"); }, title: "The sheet", body: "Laid out exactly like the template: title, headings, the template's guidance row, then data rows. Type to replace a value, or double-click a cell (or press F2) to edit the text inside it; Esc cancels. Enter, Tab and the arrow keys move. Click or drag across row numbers or column letters to select whole rows or columns, and right-click them to insert or delete. Drag a column letter's edge to resize it, or double-click the edge to fit the content. Ctrl+Arrow jumps to the edge of the data; Ctrl+Enter fills every selected cell with the typed value. Drag the small square at the corner of a selection to fill down; codes such as AHU-01 continue as AHU-02. Copy and paste work with Excel and Google Sheets." },
      { target: function () { var el = rowsLayer.querySelector(".sel"); return el ? [el] : [$("grid")]; }, title: "Dropdowns", body: "Cells with a ▾ offer a list. Lists linked to other sheets only show what has been entered there, so names always match. Alt + Down opens the list from the keyboard." },
      { target: function () { return [$("tabs")]; }, title: "Sheet tabs", body: "One tab per template sheet. The red number is the count of problems that block the import; a green tick means the sheet has data and no blocking problems." },
      { target: function () { return [$("btnAddSheet")]; }, title: "Add sheets", body: "Add back Inventory, Tenants or Tenant Contact, or make a custom sheet for another module. Right-click a tab to edit, duplicate or delete a custom sheet." },
      { target: function () { return [$("panel")]; }, title: "Guide and Issues", body: "Guide explains the sheet column by column. Issues lists every problem on the sheet; selecting one jumps to the cell." },
      { target: function () { return [$("status")]; }, title: "Import readiness", body: "Shows whether the workbook is ready to import, how many rows are entered and how many problems remain." },
      { target: function () { return [$("btnImport")]; }, title: "Import Excel", body: "Loads a filled onboarding workbook, or the filled onboarding page (HTML), so it can be checked and corrected here. Sheets the workspace does not have can become custom sheets. A file can also be dropped anywhere on the page." },
      { target: function () { return [$("btnReport")]; }, title: "Check for errors", body: "Checks every sheet: records checked, valid, with errors and duplicates, sheet by sheet, then every problem with its fix. Select one to jump to the cell, or download the report." },
      { target: function () { return [$("btnExport")]; }, title: "Download workbook", body: "Creates the onboarding workbook in Facilio's template format, ready to send. Data is saved only in this browser, so download regularly." },
      { target: function () { return [$("btnTheme")]; }, title: "Light or dark", body: "Switches between the light and dark theme. The choice is remembered." }
    ];
  }
  function startTour(steps) {
    endTour();
    var wrap = document.createElement("div"); wrap.className = "tour"; wrap.innerHTML = "<div class='tour-block'></div><div class='tour-hole'></div><div class='tour-card' role='dialog' aria-live='polite' tabindex='-1'></div>";
    document.body.appendChild(wrap); tour = { steps: steps, i: 0, el: wrap };
    wrap.querySelector(".tour-block").addEventListener("click", function () {});
    wrap.addEventListener("click", function (e) { var b = e.target.closest("[data-t]"); if (!b) return; var a = b.getAttribute("data-t"); if (a === "next") moveTour(1); else if (a === "back") moveTour(-1); else endTour(); });
    document.addEventListener("keydown", tourKey, true);
    showTourStep();
  }
  function tourKey(e) { if (!tour) return; if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); endTour(); } else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); moveTour(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); moveTour(-1); } }
  function moveTour(d) { if (!tour) return; var j = tour.i + d; if (j < 0) return; if (j >= tour.steps.length) { endTour(); return; } tour.i = j; showTourStep(); }
  function endTour() { if (!tour) return; tour.el.remove(); tour = null; document.removeEventListener("keydown", tourKey, true); grid.focus(); }
  function showTourStep() {
    var st = tour.steps[tour.i]; if (st.enter) st.enter();
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      if (!tour) return;
      var els = (st.target ? st.target() : []).filter(Boolean), r = null;
      els.forEach(function (el) { var b = el.getBoundingClientRect(); if (!b.width && !b.height) return; r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
      var vw = window.innerWidth, vh = window.innerHeight;
      if (r) { r.left = Math.max(4, r.left - 4); r.top = Math.max(4, r.top - 4); r.right = Math.min(vw - 4, r.right + 4); r.bottom = Math.min(vh - 4, r.bottom + 4); }
      var hole = tour.el.querySelector(".tour-hole"), card = tour.el.querySelector(".tour-card");
      if (r) { hole.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;width:" + (r.right - r.left) + "px;height:" + (r.bottom - r.top) + "px"; } else hole.style.cssText = "left:50%;top:40%;width:0;height:0";
      var last = tour.i === tour.steps.length - 1;
      card.innerHTML = "<div class='tk'>" + (tour.i + 1) + " of " + tour.steps.length + "</div><h3>" + esc(st.title) + "</h3><p>" + esc(st.body) + "</p>" + (st.rules ? "<p class='tr'>" + esc(st.rules) + "</p>" : "") + (st.example ? "<p class='te'>Example: <b>" + esc(st.example) + "</b></p>" : "") +
        "<div class='tf'><button class='btn ghost' data-t='end'>Close</button><span class='spacer'></span>" + (tour.i ? "<button class='btn' data-t='back'>Back</button>" : "") + "<button class='btn primary' data-t='next'>" + (last ? "Done" : "Next") + "</button></div>";
      var cw = Math.min(360, vw - 24), ch = card.offsetHeight || 220, left, top;
      if (r && r.bottom + ch + 14 < vh) { top = r.bottom + 12; left = r.left; }
      else if (r && r.top - ch - 14 > 0) { top = r.top - ch - 12; left = r.left; }
      else if (r && r.right + cw + 14 < vw) { top = Math.max(12, r.top); left = r.right + 12; }
      else if (r && r.left - cw - 14 > 0) { top = Math.max(12, r.top); left = r.left - cw - 12; }
      else { top = (vh - ch) / 2; left = (vw - cw) / 2; }
      card.style.left = Math.max(12, Math.min(left, vw - cw - 12)) + "px"; card.style.top = Math.max(12, Math.min(top, vh - ch - 12)) + "px"; card.style.width = cw + "px";
      card.focus();
    }); });
  }
  $("btnPanel").onclick = function () { $("panel").classList.toggle("open"); };
  $("ptClose").onclick = function () { $("panel").classList.remove("open"); grid.focus(); };
  var THEME_KEY = "facilio-onboarding-theme", mq = window.matchMedia("(prefers-color-scheme: dark)");
  function effTheme() { return document.documentElement.getAttribute("data-theme") || (mq.matches ? "dark" : "light"); }
  function paintThemeBtn() { var dark = effTheme() === "dark"; document.documentElement.classList.toggle("is-dark", dark); $("themeLbl").textContent = dark ? "Light" : "Dark"; $("btnTheme").title = dark ? "Switch to light theme" : "Switch to dark theme"; $("btnTheme").setAttribute("aria-label", $("btnTheme").title); }
  $("btnTheme").onclick = function () { var next = effTheme() === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", next); try { localStorage.setItem(THEME_KEY, next); } catch (e) {} paintThemeBtn(); };
  if (mq.addEventListener) mq.addEventListener("change", paintThemeBtn);
  paintThemeBtn();
  if (VIDEO_URL) {
    $("btnVideo").hidden = false;
    $("btnVideo").onclick = function () { $("vidBody").innerHTML = "<div style='position:relative;padding-top:56.25%'><iframe src='" + esc(VIDEO_URL) + "' title='Onboarding video' allow='fullscreen' style='position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:8px'></iframe></div>"; $("dlgVideo").showModal(); };
    $("vidClose").onclick = function () { $("vidBody").innerHTML = ""; $("dlgVideo").close(); };
  }

  /* =====================================================================
     Excel-style features. Formatting is kept apart from the values, so it
     never changes what is checked or imported; it is written to the
     downloaded workbook as Excel formatting.
     ===================================================================== */
  if (!state.fmt) state.fmt = {}; if (!state.colw) state.colw = {}; if (!state.filters) state.filters = {};
  var filterMode = false;
  var PALETTE_FILL = [["None", ""], ["Light yellow", "#FFF3B0"], ["Light green", "#D6F5D2"], ["Light blue", "#DBE9FF"], ["Light cyan", "#CCF4F7"], ["Light pink", "#FFDDEE"], ["Light orange", "#FDE0CC"], ["Light purple", "#ECDDF5"], ["Light red", "#FFE0E0"], ["Light grey", "#EEF0F3"],
    ["Yellow", "#FFD43B"], ["Green", "#8EE087"], ["Blue", "#9DBEFF"], ["Cyan", "#7FE3EC"], ["Pink", "#FF9CCB"], ["Orange", "#F7A66F"], ["Purple", "#CFA3E6"], ["Red", "#FF9E9E"], ["Grey", "#C4C9D2"]];
  var PALETTE_TEXT = [["Default", ""], ["Red", "#B61919"], ["Orange", "#D85903"], ["Dark yellow", "#8A6D00"], ["Green", "#0F6F06"], ["Teal", "#0E7C86"], ["Blue", "#0024D6"], ["Purple", "#5B1D6F"], ["Pink", "#B0136B"], ["Grey", "#607796"],
    ["Black", "#192432"], ["Light red", "#E04848"], ["Light orange", "#F27A2A"], ["Gold", "#C99A00"], ["Light green", "#29A01E"], ["Light teal", "#16A9B6"], ["Light blue", "#2E65FF"], ["Light purple", "#8E44AD"], ["Light pink", "#E0408E"]];

  /* ---------- formatting store ---------- */
  function fmtRows(tab) { return state.fmt[tab] || (state.fmt[tab] = []); }
  function fmtGet(tab, i, c) { var F = state.fmt[tab], d = dIx(tab, c); return F && F[i] && F[i][d] ? F[i][d] : null; }
  function fmtStyle(tab, i, c) { return styleOf(fmtGet(tab, i, c)); }
  function styleOf(f) {
    if (!f) return "";
    var s = f.bd ? "box-shadow:inset 0 0 0 1px #33333D;" : "";
    if (f.b) s += "font-weight:700;";
    if (f.i) s += "font-style:italic;";
    if (f.u || f.s) s += "text-decoration:" + (f.u ? "underline " : "") + (f.s ? "line-through" : "") + ";";
    if (f.fc) s += "color:" + f.fc + ";";
    if (f.bg) s += "background:" + f.bg + ";" + (isDarkFill(f.bg) ? "" : "");
    if (f.al) s += "text-align:" + f.al + ";";
    if (f.sz) s += "font-size:" + f.sz + "px;";
    if (f.wr) s += "white-space:normal;line-height:1.25;";
    return s;
  }
  function isDarkFill() { return false; }
  function setFmt(tab, i, c, patch) {
    var F = fmtRows(tab); while (F.length <= i) F.push(null);
    if (!F[i]) F[i] = {};
    var d = dIx(tab, c), cur = Object.assign({}, F[i][d] || {});
    Object.keys(patch).forEach(function (k) { if (patch[k] === null || patch[k] === "" || patch[k] === false) delete cur[k]; else cur[k] = patch[k]; });
    if (Object.keys(cur).length) F[i][d] = cur; else delete F[i][d];
  }

  /* ---------- selection helpers ---------- */
  function selRange() { return { r1: Math.min(sel.r, sel.r2), r2: Math.max(sel.r, sel.r2), c1: Math.min(sel.c, sel.c2), c2: Math.max(sel.c, sel.c2) }; }
  function selCells() {
    var R = selRange(), out = [];
    for (var r = R.r1; r <= R.r2; r++) { var row = L.rows[r]; if (!row || row.type !== "data" || isHidden(row.table, row.idx)) continue;
      for (var c = R.c1; c <= R.c2; c++) if (c < TABLES[row.table].cols.length) out.push({ table: row.table, idx: row.idx, c: c, r: r }); }
    return out;
  }
  function selRowsByTable() {
    var R = selRange(), m = {};
    for (var r = R.r1; r <= R.r2; r++) { var row = L.rows[r]; if (row && row.type === "data") { (m[row.table] = m[row.table] || []).push(row.idx); } }
    return m;
  }
  function needDataSel() { toast("Select cells in a data row first."); }

  /* ---------- undo snapshots for structural changes ---------- */
  function cp(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function snapshot(tabs) { var o = {}; tabs.forEach(function (t) { o[t] = { rows: cp(rows(t)), fmt: cp(state.fmt[t] || []), custom: cp(state.custom[t] || []), order: cp(state.colOrder[t] || null), sheet: TABLES[t].sheet, colw: cp(state.colw[TABLES[t].sheet] || {}) }; }); return o; }
  function restoreSnap(snap) { Object.keys(snap).forEach(function (t) { var x = snap[t]; state.tabs[t] = cp(x.rows); state.fmt[t] = cp(x.fmt); state.custom[t] = cp(x.custom); if (x.order) state.colOrder[t] = cp(x.order); else delete state.colOrder[t]; state.colw[x.sheet] = cp(x.colw); rebuildCols(t); }); changed(); renderPanel(); }
  /* formats of cells outside the data tables (titles, headings, descriptions, the Overview, blank rows): kept per sheet, keyed by the row's place
     relative to its table's heading row, so a format stays with its cell as the tables above it grow */
  function sKeyIn(lay, r, c) { var row = lay.rows[r]; if (!row || row.type === "data") return null; var b = row.block != null ? lay.blocks[row.block] : null; return (b ? "b" + row.block + ":" + (r + 1 - b.headerRow) : "r" + r) + ":" + c; }
  function sheetFmt(n) { if (!state.sfmt) state.sfmt = {}; return state.sfmt[n] || (state.sfmt[n] = {}); }
  function fmtTargets() {
    var R = selRange(), out = selCells();
    for (var r = R.r1; r <= R.r2; r++) { var row = L.rows[r]; if (!row || row.type === "data") continue; for (var c = R.c1; c <= R.c2 && c < L.maxCol; c++) out.push({ r: r, c: c, sk: sKeyIn(L, r, c) }); }
    return out;
  }
  function curTarget() { var info = cellInfo(sel.r, sel.c); return info.editable ? { table: info.table, idx: info.idx, c: sel.c, r: sel.r } : (L.rows[sel.r] && L.rows[sel.r].type !== "data" ? { r: sel.r, c: sel.c, sk: sKeyIn(L, sel.r, sel.c) } : null); }
  function fGet(x) { return x.sk ? sheetFmt(state.active)[x.sk] : fmtGet(x.table, x.idx, x.c); }
  function fSet(x, patch) {
    if (!x.sk) return setFmt(x.table, x.idx, x.c, patch);
    var F = sheetFmt(state.active), cur = Object.assign({}, F[x.sk] || {});
    Object.keys(patch).forEach(function (k) { if (patch[k] === null || patch[k] === "" || patch[k] === false) delete cur[k]; else cur[k] = patch[k]; });
    if (Object.keys(cur).length) F[x.sk] = cur; else delete F[x.sk];
  }
  function fTabs(cells) { var t = uniqTabs(cells.filter(function (x) { return !x.sk; })); if (cells.some(function (x) { return x.sk; })) t.push("__sfmt"); return t; }
  function commitSnap(tabs, before) { var after = snapshot(tabs); undoStack.push({ sheet: state.active, snap: { before: before, after: after } }); if (undoStack.length > 200) undoStack.shift(); redoStack = []; changed(); }

  /* ---------- formatting commands ---------- */
  function toggleFmt(key) {
    var cells = fmtTargets(); if (!cells.length) return needDataSel();
    var tabs = fTabs(cells), before = snapshot(tabs), all = cells.every(function (x) { var f = fGet(x); return f && f[key]; });
    cells.forEach(function (x) { var p = {}; p[key] = all ? null : true; fSet(x, p); });
    commitSnap(tabs, before);
  }
  function setFmtAll(patch) {
    var cells = fmtTargets(); if (!cells.length) return needDataSel();
    var tabs = fTabs(cells), before = snapshot(tabs);
    cells.forEach(function (x) { fSet(x, patch); });
    commitSnap(tabs, before);
  }
  function clearFmt() {   /* like Excel's Clear Formats: the note stays */
    var cells = fmtTargets(); if (!cells.length) return needDataSel();
    var tabs = fTabs(cells), before = snapshot(tabs);
    cells.forEach(function (x) { var f = fGet(x), note = f && f.note; if (x.sk) { var S2 = sheetFmt(state.active); if (note) S2[x.sk] = { note: note }; else delete S2[x.sk]; } else { var F = state.fmt[x.table], d = dIx(x.table, x.c); if (F && F[x.idx]) { if (note) F[x.idx][d] = { note: note }; else delete F[x.idx][d]; } } });
    commitSnap(tabs, before);
  }
  /* undo covers the per-sheet formats too */
  var _snapshot = snapshot, _restoreSnap = restoreSnap;
  snapshot = function (tabs) { var o = _snapshot(tabs.filter(function (t) { return t !== "__sfmt"; })); if (tabs.indexOf("__sfmt") >= 0) o.__sfmt = { sheet: state.active, f: cp(sheetFmt(state.active)) }; return o; };
  restoreSnap = function (snap) { var rest = {}; Object.keys(snap).forEach(function (k) { if (k !== "__sfmt") rest[k] = snap[k]; }); if (snap.__sfmt) { sheetFmt(snap.__sfmt.sheet); state.sfmt[snap.__sfmt.sheet] = cp(snap.__sfmt.f); } _restoreSnap(rest); };

  /* ---------- format painter, notes, fill right, today's date, freeze columns ---------- */
  var painter = null;
  function startPainter() {
    if (painter) { painter = null; grid.classList.remove("painting"); refreshRibbon(); return; }
    var t = curTarget(), f = Object.assign({}, (t && fGet(t)) || {}); delete f.note; painter = f; grid.classList.add("painting");
    toast("Format copied. Select the cells to paint it on."); refreshRibbon();
  }
  function applyPainter() {
    if (!painter) return; var p = painter; painter = null; grid.classList.remove("painting");
    var cells = fmtTargets(); if (!cells.length) { refreshRibbon(); return; }
    var tabs = fTabs(cells), before = snapshot(tabs);
    cells.forEach(function (x) { var f = fGet(x), note = f && f.note, n = Object.assign({}, p); if (note) n.note = note;
      if (x.sk) { var S2 = sheetFmt(state.active); if (Object.keys(n).length) S2[x.sk] = n; else delete S2[x.sk]; }
      else { var F = fmtRows(x.table); while (F.length <= x.idx) F.push(null); if (!F[x.idx]) F[x.idx] = {}; var d = dIx(x.table, x.c); if (Object.keys(n).length) F[x.idx][d] = n; else delete F[x.idx][d]; } });
    commitSnap(tabs, before); refreshRibbon();
  }
  var paintDown = false;   /* armed by the press in the grid: the grid redraws cells under the pointer, so the release can land elsewhere */
  grid.addEventListener("mousedown", function (e) { paintDown = !!painter && !e.target.closest("[data-rn]"); }, true);
  window.addEventListener("mouseup", function () { if (painter && paintDown) { paintDown = false; setTimeout(applyPainter, 0); } });
  var noteAt = null;
  function editNote() {
    var t = curTarget(); if (!t) { toast("Select a cell first."); return; }
    var f = fGet(t); noteAt = t; $("ntTitle").textContent = (f && f.note ? "Edit note" : "New note") + " · " + colLetter(sel.c) + (sel.r + 1); $("ntText").value = (f && f.note) || ""; $("ntDel").hidden = !(f && f.note); $("dlgNote").showModal(); $("ntText").focus();
  }
  function setNote(text) { var t = noteAt; noteAt = null; if (!t) return; var tabs = fTabs([t]), before = snapshot(tabs); fSet(t, { note: text ? String(text).slice(0, 2000) : null }); commitSnap(tabs, before); }
  $("ntOk").onclick = function () { $("dlgNote").close(); setNote($("ntText").value.trim()); grid.focus(); };
  $("ntDel").onclick = function () { $("dlgNote").close(); setNote(""); grid.focus(); };
  $("ntCancel").onclick = function () { $("dlgNote").close(); noteAt = null; grid.focus(); };
  $("ntText").addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("ntOk").click(); });
  function fillRight() {
    var R = selRange(); if (R.c1 === R.c2) { if (R.c1 === 0) { toast("Select the cells to fill, including the value to copy on the left."); return; } R.c1--; }
    var list = [];
    for (var r = R.r1; r <= R.r2; r++) { var row = L.rows[r]; if (!row || row.type !== "data") continue; var w = TABLES[row.table].cols.length; if (R.c1 >= w) continue;
      var v = get(row.table, row.idx, R.c1); for (var c = R.c1 + 1; c <= R.c2 && c < w; c++) list.push([row.table, row.idx, c, v]); }
    if (list.length) setCells(list); else needDataSel();
  }
  function insertNow(time) {
    var d = new Date(), p = function (x) { return String(x).padStart(2, "0"); }, v = time ? p(d.getHours()) + ":" + p(d.getMinutes()) : d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    var cells = selCells(); if (!cells.length) return needDataSel(); setCells(cells.map(function (x) { return [x.table, x.idx, x.c, v]; }));
  }
  function frozen() { return (state.freeze && state.freeze[state.active]) || 0; }
  function frzLeft(c) { var x = 46; for (var i = 0; i < c; i++) x += colW(i); return x; }
  function toggleFreeze() {
    state.freeze = state.freeze || {};
    if (frozen()) delete state.freeze[state.active]; else state.freeze[state.active] = Math.max(1, Math.min(sel.c, sel.c2));
    save(); renderHead(); renderBody(); refreshRibbon();
    toast(frozen() ? "Column" + (frozen() > 1 ? "s A to " + colLetter(frozen() - 1) + " stay" : " A stays") + " in view while you scroll right. Press Freeze again to unfreeze." : "Columns unfrozen.");
  }
  function uniqTabs(cells) { var m = {}; cells.forEach(function (x) { m[x.table] = 1; }); return Object.keys(m); }

  /* ---------- rows: insert, delete ---------- */
  function insertRows(below) {
    var m = selRowsByTable(), tabs = Object.keys(m); if (!tabs.length) return needDataSel();
    var tab = tabs[0], idxs = m[tab], n = idxs.length, at = below ? Math.max.apply(null, idxs) + 1 : Math.min.apply(null, idxs);
    var before = snapshot([tab]), R = rows(tab), F = fmtRows(tab), w = TABLES[tab].cols.length;
    while (R.length < at) R.push(null); while (F.length < at) F.push(null);
    var add = [], addF = []; for (var i = 0; i < n; i++) { add.push(new Array(w).fill("")); addF.push(null); }
    Array.prototype.splice.apply(R, [at, 0].concat(add)); Array.prototype.splice.apply(F, [at, 0].concat(addF));
    commitSnap([tab], before);
    var b = L.blocks.filter(function (x) { return x.table === tab; })[0];
    if (b) { var r = b.dataStart - 1 + at; sel = { r: r, c: sel.c, r2: r + n - 1, c2: sel.c2 }; renderHead(); renderBody(); renderFx(); }
    toast("Inserted " + n + " row" + (n === 1 ? "" : "s") + (below ? " below" : " above"));
  }
  function deleteRows() {
    var m = selRowsByTable(), tabs = Object.keys(m); if (!tabs.length) return needDataSel();
    var before = snapshot(tabs), total = 0;
    tabs.forEach(function (tab) {
      var idxs = m[tab].slice().sort(function (a, b) { return b - a; }), R = rows(tab), F = fmtRows(tab);
      idxs.forEach(function (i) { if (i < R.length) R.splice(i, 1); if (i < F.length) F.splice(i, 1); total++; });
    });
    commitSnap(tabs, before); toast("Deleted " + total + " row" + (total === 1 ? "" : "s"));
  }

  /* ---------- sort ---------- */
  function sortBy(tab, c, desc) {
    var R = rows(tab), F = fmtRows(tab), last = lastFilled(tab); if (last < 1) return;
    var before = snapshot([tab]), pairs = [];
    for (var i = 0; i <= last; i++) pairs.push({ r: R[i], f: F[i] || null });
    var filled = pairs.filter(function (p) { return rowFilled(p.r); }), empty = pairs.filter(function (p) { return !rowFilled(p.r); });
    var coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    var dc = dIx(tab, c);
    filled.sort(function (a, b) { var x = (a.r && a.r[dc]) || "", y = (b.r && b.r[dc]) || ""; if (!x && y) return 1; if (x && !y) return -1; return desc ? coll.compare(y, x) : coll.compare(x, y); });
    var all = filled.concat(empty);
    for (var j = 0; j < all.length; j++) { R[j] = all[j].r; F[j] = all[j].f; }
    commitSnap([tab], before); toast("Sorted by " + TABLES[tab].cols[c].label + (desc ? ", Z to A" : ", A to Z"));
  }
  function sortSel(desc) { var info = cellInfo(sel.r, sel.c); if (!info.editable) return needDataSel(); sortBy(info.table, sel.c, desc); }

  /* ---------- filter ---------- */
  function isFiltered(tab, c) { var f = state.filters[tab]; return !!(f && f[dIx(tab, c)]); }
  function isHidden(tab, i) {
    var f = state.filters && state.filters[tab]; if (!f) return false;
    var R = rows(tab)[i]; if (!R || !rowFilled(R)) return false;
    return Object.keys(f).some(function (c) { var v = R[c] == null ? "" : String(R[c]); return f[c].indexOf(v) < 0; });
  }
  function hiddenAbove(r) { var p = L.rows[r - 1]; return p && p.type === "data" && isHidden(p.table, p.idx); }
  function setFilter(tab, c, allowed) { c = dIx(tab, c); if (!state.filters[tab]) state.filters[tab] = {}; if (allowed) state.filters[tab][c] = allowed; else delete state.filters[tab][c]; if (!Object.keys(state.filters[tab]).length) delete state.filters[tab]; save(); var t = grid.scrollTop; relayout(); grid.scrollTop = t; renderHead(); renderBody(); refreshRibbon(); }
  function clearAllFilters() { state.filters = {}; save(); relayout(); renderHead(); renderBody(); refreshRibbon(); }
  function anyFilter() { return Object.keys(state.filters || {}).length > 0; }
  function openFilter(tab, c, anchor) {
    closePops();
    var dc = dIx(tab, c), vals = {}, R = rows(tab); R.forEach(function (row) { if (rowFilled(row)) { var v = row[dc] == null ? "" : String(row[dc]); vals[v] = (vals[v] || 0) + 1; } });
    var keys = Object.keys(vals).sort(new Intl.Collator(undefined, { numeric: true }).compare), cur = state.filters[tab] && state.filters[tab][dc];
    var p = document.createElement("div"); p.className = "menu fpop"; p.id = "fpop";
    p.innerHTML = "<div class='fhd'>" + esc(TABLES[tab].cols[c].label) + "</div><button data-fa='az'>Sort A to Z</button><button data-fa='za'>Sort Z to A</button><div class='fsep'></div>" +
      "<div class='fbox'><input type='search' placeholder='Search values' aria-label='Search values'><label class='fall'><input type='checkbox' data-all='1'> Select all</label><div class='flist'>" +
      keys.map(function (k) { return "<label><input type='checkbox' value='" + esc(k) + "'" + (!cur || cur.indexOf(k) >= 0 ? " checked" : "") + "> " + (k === "" ? "<i>(Blanks)</i>" : esc(k)) + " <small>" + vals[k] + "</small></label>"; }).join("") +
      "</div></div><div class='ffoot'><button class='btn ghost' data-fa='clear'>Clear filter</button><span class='spacer'></span><button class='btn primary' data-fa='ok'>Apply</button></div>";
    document.body.appendChild(p);
    var rc = anchor.getBoundingClientRect(); p.style.position = "fixed"; p.style.top = Math.min(rc.bottom + 4, window.innerHeight - 380) + "px"; p.style.left = Math.min(rc.left, window.innerWidth - 290) + "px";
    var boxes = function () { return Array.prototype.slice.call(p.querySelectorAll(".flist input")); };
    var all = p.querySelector("[data-all]"); all.checked = boxes().every(function (b) { return b.checked; });
    all.onchange = function () { boxes().forEach(function (b) { if (b.parentNode.style.display !== "none") b.checked = all.checked; }); };
    p.querySelector("input[type=search]").oninput = function () { var q = this.value.toLowerCase(); boxes().forEach(function (b) { b.parentNode.style.display = !q || b.value.toLowerCase().indexOf(q) >= 0 ? "" : "none"; }); };
    p.addEventListener("click", function (e) {
      var a = e.target.closest("[data-fa]"); if (!a) return; var k = a.getAttribute("data-fa");
      if (k === "az" || k === "za") { closePops(); sortBy(tab, c, k === "za"); return; }
      if (k === "clear") { closePops(); setFilter(tab, c, null); return; }
      if (k === "ok") { var chosen = boxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; }); closePops(); setFilter(tab, c, chosen.length === keys.length ? null : chosen); }
    });
    setTimeout(function () { document.addEventListener("mousedown", function close(ev) { if (!p.contains(ev.target)) { p.remove(); document.removeEventListener("mousedown", close); } }); }, 0);
  }
  function filterByValue() { var info = cellInfo(sel.r, sel.c); if (!info.editable) return needDataSel(); filterMode = true; setFilter(info.table, sel.c, [String(info.raw == null ? "" : info.raw)]); toast("Showing rows where " + info.col.label + " is '" + info.raw + "'"); }
  function closePops() { ["fpop", "cmenu", "palpop"].forEach(function (id) { var x = document.getElementById(id); if (x) x.remove(); }); }

  /* ---------- fill down and fill handle ---------- */
  function fillDown() {
    var R = selRange(); if (R.r1 === R.r2) { var up = R.r1 - 1; if (up < 0 || !L.rows[up] || L.rows[up].type !== "data") return toast("Select the cells to fill, including the value to copy at the top."); R.r1 = up; }
    var src = L.rows[R.r1]; if (!src || src.type !== "data") return needDataSel();
    var list = [];
    for (var r = R.r1 + 1; r <= R.r2; r++) { var row = L.rows[r]; if (!row || row.type !== "data" || row.table !== src.table) continue;
      for (var c = R.c1; c <= R.c2; c++) if (c < TABLES[src.table].cols.length) list.push([src.table, row.idx, c, get(src.table, src.idx, c)]); }
    if (list.length) setCells(list);
  }
  var filling = null;
  function seriesNext(vals, k) {
    /* Excel-like: two or more numbers with a constant step continue the series; text ending in a number counts up; otherwise repeat */
    var n = vals.length, last = vals[n - 1];
    if (n >= 2 && vals.every(function (v) { return /^-?\d+(\.\d+)?$/.test(v); })) { var step = +vals[1] - +vals[0], ok = true; for (var i = 2; i < n; i++) if (+vals[i] - +vals[i - 1] !== step) ok = false; if (ok) return String(+last + step * (k + 1)); }
    var m = String(last).match(/^(.*?)(\d+)(\D*)$/);
    if (m && !/^-?\d+(\.\d+)?$/.test(last) && !/^\d{4}-\d{2}-\d{2}$/.test(last)) { var num = String(+m[2] + k + 1); while (num.length < m[2].length) num = "0" + num; return m[1] + num + m[3]; }
    return vals[k % n];
  }
  function finishFill(toRow) {
    var R = filling; filling = null; var cur = $("fillGhost"); if (cur) cur.remove();
    var src = L.rows[R.r1]; if (!src || src.type !== "data" || toRow <= R.r2) return;
    var list = [], tab = src.table;
    for (var c = R.c1; c <= R.c2; c++) {
      if (c >= TABLES[tab].cols.length) continue;
      var vals = []; for (var r = R.r1; r <= R.r2; r++) { var row = L.rows[r]; if (row && row.type === "data" && row.table === tab) vals.push(String(get(tab, row.idx, c))); }
      var k = 0; for (var r2 = R.r2 + 1; r2 <= toRow; r2++) { var row2 = L.rows[r2]; if (!row2 || row2.type !== "data" || row2.table !== tab) continue; list.push([tab, row2.idx, c, vals.every(function (v) { return v === ""; }) ? "" : seriesNext(vals, k)]); k++; }
    }
    if (list.length) { setCells(list); sel.r2 = toRow; renderBody(); renderHead(); }
  }

  /* ---------- column resize ---------- */
  var resizing = null;
  ghead.addEventListener("mousedown", function (e) {
    var rz = e.target.closest("[data-rz]");
    if (rz) { e.preventDefault(); e.stopPropagation(); var c = +rz.getAttribute("data-rz"); resizing = { c: c, x: e.clientX, w: colW(c) }; document.body.style.cursor = "col-resize"; return; }
    if (e.target.closest(".corner")) { e.preventDefault(); if (editing) commitEdit(); grid.focus(); sel.r = 0; sel.c = 0; sel.r2 = L.rows.length - 1; sel.c2 = L.maxCol - 1; renderHead(); renderBody(); renderFx(); updateSelStats(); return; }
    var lc = e.target.closest("[data-lc]"); if (!lc) return; if (e.button === 2) return; dragMode = "cols";
    e.preventDefault(); if (editing) commitEdit();
    var c2 = +lc.getAttribute("data-lc"), sh = e.shiftKey; grid.focus();
    if (sh) { sel.c2 = c2; } else { sel.c = sel.c2 = c2; } sel.r = 0; sel.r2 = L.rows.length - 1; renderHead(); renderBody(); renderFx(); refreshRibbon(); updateSelStats();
  });
  var measureCtx = document.createElement("canvas").getContext("2d");
  ghead.addEventListener("dblclick", function (e) {
    var rz = e.target.closest("[data-rz]"); if (!rz) return; var c = +rz.getAttribute("data-rz"), max = 48;
    L.rows.forEach(function (row, r) {
      var info = cellInfo(r, c); if (!info.v) return;
      if (row.type === "static" && (row.kind === "desc" || row.kind === "title" || row.kind === "intro")) return;
      measureCtx.font = (row.type === "static" ? "500 12px " : "400 14px ") + "Roboto, Arial, sans-serif";
      max = Math.max(max, measureCtx.measureText(String(info.v)).width + 24);
    });
    (state.colw[state.active] = state.colw[state.active] || {})[c] = Math.min(600, Math.ceil(max)); save(); relayout(); renderHead(); renderBody();
  });
  window.addEventListener("mousemove", function (e) {
    if (!resizing) return;
    var w = Math.max(48, Math.min(900, resizing.w + e.clientX - resizing.x));
    (state.colw[state.active] = state.colw[state.active] || {})[resizing.c] = w; renderHead(); renderBody();
  });

  /* ---------- mouse hooks called by the grid ---------- */
  function excelMouseDown(e) {
    closePops();
    var ft = e.target.closest("[data-ft]"); if (ft) { e.preventDefault(); openFilter(ft.getAttribute("data-ft"), +ft.getAttribute("data-fc"), ft); return true; }
    var fh = e.target.closest("[data-fh]"); if (fh) { e.preventDefault(); e.stopPropagation(); filling = selRange(); return true; }
    var rn = e.target.closest("[data-rn]");
    if (rn) { e.preventDefault(); if (editing) commitEdit(); var r = +rn.getAttribute("data-rn"), sh = e.shiftKey; grid.focus(); dragMode = "rows";
      if (sh) sel.r2 = r; else { sel.r = sel.r2 = r; } sel.c = 0; sel.c2 = L.maxCol - 1; renderHead(); renderBody(); renderFx(); refreshRibbon(); updateSelStats(); return true; }
    return false;
  }
  function excelMouseOver(e) {
    if (!filling) return false;
    var cell = e.target.closest("[data-r]"); if (!cell) return true;
    var r = +cell.getAttribute("data-r"), g = $("fillGhost");
    if (!g) { g = document.createElement("div"); g.id = "fillGhost"; g.className = "fillghost"; gbody.appendChild(g); }
    var top = tops[filling.r1], bottom = tops[Math.max(r, filling.r2) + 1];
    g.style.cssText = "left:" + colLeft(filling.c1) + "px;top:" + top + "px;width:" + (colLeft(filling.c2 + 1) - colLeft(filling.c1)) + "px;height:" + (bottom - top) + "px";
    filling.to = r; return true;
  }
  function excelMouseUp() {
    if (resizing) { resizing = null; document.body.style.cursor = ""; save(); }
    if (filling) finishFill(filling.to == null ? -1 : filling.to);
  }

  /* ---------- context menu ---------- */
  ghead.addEventListener("contextmenu", function (e) { var lc = e.target.closest("[data-lc]"); if (!lc) return; var c = +lc.getAttribute("data-lc"), R = selRange();
    if (c < R.c1 || c > R.c2 || R.r1 !== 0) { sel.c = sel.c2 = c; sel.r = 0; sel.r2 = L.rows.length - 1; renderHead(); renderBody(); renderFx(); } showCtx(e); });
  gbody.addEventListener("contextmenu", function (e) {
    var rn = e.target.closest("[data-rn]");
    if (rn) { var rr = +rn.getAttribute("data-rn"), RR = selRange(); if (rr < RR.r1 || rr > RR.r2 || RR.c1 !== 0) { sel.r = sel.r2 = rr; sel.c = 0; sel.c2 = L.maxCol - 1; renderHead(); renderBody(); renderFx(); } showCtx(e); return; }
    var cell = e.target.closest("[data-r]"); if (!cell) return;
    var r = +cell.getAttribute("data-r"), c = +cell.getAttribute("data-c"), R = selRange();
    if (r < R.r1 || r > R.r2 || c < R.c1 || c > R.c2) select(r, c);
    showCtx(e);
  });
  function showCtx(e) {
    e.preventDefault(); closePops();
    var m = document.createElement("div"); m.className = "menu cmenu"; m.id = "cmenu";
    var item = function (k, label, key) { return "<button data-cm='" + k + "'>" + label + (key ? "<kbd>" + key + "</kbd>" : "") + "</button>"; };
    m.innerHTML = item("cut", "Cut", "Ctrl+X") + item("copy", "Copy", "Ctrl+C") + item("paste", "Paste", "Ctrl+V") + "<div class='fsep'></div>" +
      item("insA", "Insert row above", "Ctrl+Shift++") + item("insB", "Insert row below") + item("del", "Delete row", "Ctrl+-") + item("clear", "Clear contents", "Delete") + "<div class='fsep'></div>" +
      item("az", "Sort A to Z") + item("za", "Sort Z to A") + item("fval", "Filter by this value") + (anyFilter() ? item("fclear", "Clear all filters") : "") + "<div class='fsep'></div>" +
      item("fill", "Fill down", "Ctrl+D") + item("fillR", "Fill right", "Ctrl+R") + item("clrfmt", "Clear formatting") + item("note", (function () { var t = curTarget(), f = t && fGet(t); return f && f.note ? "Edit note" : "New note"; })(), "Shift+F2") + "<div class='fsep'></div>" +
      item("colL", "Insert column left") + item("colR", "Insert column right") + (curCustom() ? item("colRen", "Rename column") + item("colDel", "Delete column") : "") +
      "<div class='swrow' aria-label='Highlight'>" + PALETTE_FILL.map(function (p) { return "<button class='sw' data-sw='" + p[1] + "' title='Highlight: " + p[0] + "' style='background:" + (p[1] || "var(--surface)") + "'>" + (p[1] ? "" : "∅") + "</button>"; }).join("") + "</div>";
    document.body.appendChild(m); m.style.position = "fixed";
    var h = m.offsetHeight || 420; m.style.left = Math.min(e.clientX, window.innerWidth - 270) + "px"; m.style.top = Math.min(e.clientY, window.innerHeight - h - 8) + "px";
    m.addEventListener("click", function (ev) {
      var sw = ev.target.closest("[data-sw]"); if (sw) { closePops(); setFmtAll({ bg: sw.getAttribute("data-sw") || null }); return; }
      var b = ev.target.closest("[data-cm]"); if (!b) return; closePops(); runCmd(b.getAttribute("data-cm"));
    });
    setTimeout(function () { document.addEventListener("mousedown", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("mousedown", close); } }); }, 0);
  }
  function clipboardPaste() {
    if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) {
      grid.focus(); var dt = new DataTransfer(); dt.setData("text/plain", t); document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
    }).catch(function () { toast("Use Ctrl+V to paste."); }); else toast("Use Ctrl+V to paste.");
  }
  function runCmd(k) {
    grid.focus();
    if (k === "cut") document.execCommand("cut"); else if (k === "copy") document.execCommand("copy"); else if (k === "paste") clipboardPaste();
    else if (k === "insA") insertRows(false); else if (k === "insB") insertRows(true); else if (k === "del") deleteRows(); else if (k === "clear") clearRange();
    else if (k === "az") sortSel(false); else if (k === "za") sortSel(true); else if (k === "fval") filterByValue(); else if (k === "fclear") clearAllFilters();
    else if (k === "fill") fillDown(); else if (k === "clrfmt") clearFmt();
    else if (k === "undo") undo(); else if (k === "redo") redo();
    else if (k === "b") toggleFmt("b"); else if (k === "i") toggleFmt("i"); else if (k === "u") toggleFmt("u"); else if (k === "s") toggleFmt("s");
    else if (k === "al-left") setFmtAll({ al: null }); else if (k === "al-center") setFmtAll({ al: "center" }); else if (k === "al-right") setFmtAll({ al: "right" });
    else if (k === "wrap") toggleFmt("wr");
    else if (k === "filter") { filterMode = !filterMode; if (!filterMode && anyFilter()) clearAllFilters(); renderBody(); refreshRibbon(); toast(filterMode ? "Filter buttons added to the table headings" : "Filters removed"); }
    else if (k === "bd") toggleFmt("bd"); else if (k === "painter") startPainter(); else if (k === "freeze") toggleFreeze(); else if (k === "fillR") fillRight(); else if (k === "note") editNote();
    else if (k === "find") openFind(false); else if (k === "replace") openFind(true);
    else if (k === "colL") insertColumn(false); else if (k === "colR") insertColumn(true); else if (k === "colRen") renameColumn(); else if (k === "colDel") deleteColumn();
  }

  /* ---------- ribbon ---------- */
  $("ribbon").addEventListener("mousedown", function (e) { if (e.target.closest("button")) e.preventDefault(); });
  $("ribbon").addEventListener("click", function (e) {
    var p = e.target.closest("[data-pal]"); if (p) { openPalette(p.getAttribute("data-pal"), p); return; }
    var b = e.target.closest("[data-cmd]"); if (b) runCmd(b.getAttribute("data-cmd"));
  });
  $("rbSize").addEventListener("change", function () { var v = +this.value; setFmtAll({ sz: v === 14 ? null : v }); grid.focus(); });
  function openPalette(kind, anchor) {
    closePops();
    var pal = kind === "fill" ? PALETTE_FILL : PALETTE_TEXT, m = document.createElement("div"); m.className = "menu palpop"; m.id = "palpop";
    m.innerHTML = "<div class='fhd'>" + (kind === "fill" ? "Highlight colour" : "Text colour") + "</div><div class='swgrid'>" + pal.map(function (p) {
      return "<button class='sw' data-c='" + p[1] + "' title='" + p[0] + "' style='" + (kind === "fill" ? "background:" + (p[1] || "var(--surface)") : "color:" + (p[1] || "var(--ink)")) + "'>" + (kind === "fill" ? (p[1] ? "" : "∅") : "A") + "</button>";
    }).join("") + "</div><label class='more'>More colours… <input type='color' data-more='1' value='" + (kind === "fill" ? "#ffd43b" : "#0024d6") + "'></label>";
    document.body.appendChild(m); var rc = anchor.getBoundingClientRect(); m.style.position = "fixed"; m.style.top = (rc.bottom + 4) + "px"; m.style.left = rc.left + "px";
    var apply = function (v) { closePops(); if (kind === "fill") { setFmtAll({ bg: v }); $("swFill").style.background = v || "transparent"; } else { setFmtAll({ fc: v }); $("swText").style.background = v || "var(--ink)"; } };
    m.addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (!b) return; apply(b.getAttribute("data-c") || null); });
    m.querySelector("[data-more]").addEventListener("change", function () { apply(this.value.toUpperCase()); });
    setTimeout(function () { document.addEventListener("mousedown", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("mousedown", close); } }); }, 0);
  }
  function refreshRibbon() {
    var info = cellInfo(sel.r, sel.c), ct = curTarget(), f = (ct && fGet(ct)) || {};
    [["b", f.b], ["i", f.i], ["u", f.u], ["s", f.s], ["wrap", f.wr], ["al-left", !f.al], ["al-center", f.al === "center"], ["al-right", f.al === "right"], ["filter", filterMode || anyFilter()], ["bd", f.bd], ["painter", !!painter], ["freeze", frozen() > 0]].forEach(function (x) {
      var b = $("ribbon").querySelector("[data-cmd='" + x[0] + "']"); if (b) b.setAttribute("aria-pressed", x[1] ? "true" : "false");
    });
    $("rbSize").value = String(f.sz || 14);
    var dis = !fmtTargets().length;
    var cb = $("ribbon").querySelector("[data-colmenu]"); if (cb) cb.disabled = !tableAt(sel.r, sel.c);
    Array.prototype.forEach.call($("ribbon").querySelectorAll("[data-needs='cell']"), function (b) { b.disabled = dis; });
    $("rbSize").disabled = dis;
  }

  /* ---------- find & replace ---------- */
  var findState = { q: "", rep: "", mc: false, whole: false, all: true };
  function openFind(withReplace) {
    var d = $("dlgFind"); $("fdQ").value = findState.q || (cellInfo(sel.r, sel.c).editable ? "" : ""); $("fdR").value = findState.rep;
    $("fdRepRow").hidden = !withReplace; $("fdReplace").hidden = !withReplace; $("fdReplaceAll").hidden = !withReplace; $("fdTitle").textContent = withReplace ? "Find and replace" : "Find";
    $("fdMsg").textContent = ""; if (!d.open) d.show(); $("fdQ").focus(); $("fdQ").select();
  }
  function readFind() { findState.q = $("fdQ").value; findState.rep = $("fdR").value; findState.mc = $("fdCase").checked; findState.whole = $("fdWhole").checked; findState.all = $("fdAll").checked; }
  function matches(v) {
    if (!findState.q) return false; v = String(v == null ? "" : v);
    var a = findState.mc ? v : v.toLowerCase(), q = findState.mc ? findState.q : findState.q.toLowerCase();
    return findState.whole ? a === q : a.indexOf(q) >= 0;
  }
  function allHits() {
    var out = [], sheets = findState.all ? sheetList().filter(function (n) { return GEN_NAMES.indexOf(n) < 0; }) : [state.active];
    sheets.forEach(function (n) { var lay = sheetLayout(n); lay.rows.forEach(function (row, r) { if (row.type === "static") { Object.keys(row.cells).forEach(function (c) { if (matches(row.cells[c].v)) out.push({ sheet: n, r: r, c: +c, ro: true }); }); return; } if (row.type !== "data") return; var R2 = rows(row.table)[row.idx]; if (!R2) return; TABLES[row.table].cols.forEach(function (col, c) { if (matches(R2[col.d])) out.push({ sheet: n, r: r, c: c, table: row.table, idx: row.idx }); }); }); });
    return out;
  }
  function findNext() {
    readFind(); var hits = allHits(); if (!hits.length) { $("fdMsg").textContent = "No matches."; return null; }
    var order = sheetList(), cur = { s: order.indexOf(state.active), r: sel.r, c: sel.c };
    var next = hits.filter(function (h) { var s = order.indexOf(h.sheet); return s > cur.s || (s === cur.s && (h.r > cur.r || (h.r === cur.r && h.c > cur.c))); })[0] || hits[0];
    if (next.sheet !== state.active) switchSheet(next.sheet);
    select(next.r, next.c); $("fdMsg").textContent = hits.length + " match" + (hits.length === 1 ? "" : "es"); return next;
  }
  function replaceText(v) {
    v = String(v); if (findState.whole) return findState.rep;
    var re = new RegExp(findState.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), findState.mc ? "g" : "gi"); return v.replace(re, findState.rep);
  }
  $("fdNext").onclick = findNext;
  $("fdQ").addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); findNext(); } if (e.key === "Escape") $("dlgFind").close(); });
  $("fdR").addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Escape") $("dlgFind").close(); });
  $("fdReplace").onclick = function () {
    readFind(); var info = cellInfo(sel.r, sel.c);
    if (info.editable && matches(info.raw)) { setCells([[info.table, info.idx, sel.c, replaceText(info.raw)]]); }
    findNext();
  };
  $("fdReplaceAll").onclick = function () {
    readFind(); var all = allHits(), hits = all.filter(function (h) { return !h.ro; }); if (!hits.length) { $("fdMsg").textContent = all.length ? "The matches are template headings, which can't be changed." : "No matches."; return; }
    setCells(hits.map(function (h) { return [h.table, h.idx, h.c, replaceText(get(h.table, h.idx, h.c))]; }));
    $("fdMsg").textContent = "Replaced " + hits.length + " value" + (hits.length === 1 ? "" : "s") + ". Ctrl+Z undoes it.";
  };
  $("fdClose").onclick = function () { $("dlgFind").close(); grid.focus(); };

  /* ---------- selection statistics (like Excel's status bar) ---------- */
  function updateSelStats() {
    var el = $("selStats"); if (!el) return;
    var R = selRange(); if (R.r1 === R.r2 && R.c1 === R.c2) { el.textContent = ""; return; }
    var count = 0, nums = [];
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) { var info = cellInfo(r, c); if (!info.editable) continue; var v = info.raw; if (v === "" || v == null) continue; count++; if (/^-?\d+(\.\d+)?$/.test(String(v).trim())) nums.push(+v); }
    if (!count) { el.textContent = ""; return; }
    var sum = nums.reduce(function (a, b) { return a + b; }, 0), fmtN = function (n) { return Math.round(n * 100) / 100; };
    el.textContent = nums.length > 1 ? "Average: " + fmtN(sum / nums.length) + "    Count: " + count + "    Sum: " + fmtN(sum) : "Count: " + count;
  }

  /* ---------- name box (type B25 or Site!B25 to jump) and formula bar ---------- */
  $("nameBox").addEventListener("focus", function () { this.select(); });
  $("nameBox").addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "Escape") { renderFx(); grid.focus(); return; }
    if (e.key !== "Enter") return; e.preventDefault();
    var v = this.value.trim(), sheet = state.active, m = v.match(/^(?:'?(.+?)'?!)?([A-Za-z]{1,3})(\d+)(?::([A-Za-z]{1,3})(\d+))?$/);
    if (!m) { toast("Type a cell address such as B25, or Site!B25."); return; }
    if (m[1]) { var hit = sheetList().filter(function (n) { return n.toLowerCase() === m[1].toLowerCase(); })[0]; if (!hit) { toast("No sheet called '" + m[1] + "'."); return; } if (hit !== state.active) switchSheet(hit); }
    var col = function (s2) { var n = 0; s2.toUpperCase().split("").forEach(function (ch) { n = n * 26 + ch.charCodeAt(0) - 64; }); return n - 1; };
    grid.focus(); select(+m[3] - 1, col(m[2])); if (m[4]) select(+m[5] - 1, col(m[4]), true);
  });
  var fxIn = $("fxIn");
  fxIn.addEventListener("keydown", function (e) {
    e.stopPropagation(); var info = cellInfo(sel.r, sel.c);
    if (e.key === "Escape") { e.preventDefault(); renderFx(); grid.focus(); return; }
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (info.editable && fxIn.value !== String(info.raw == null ? "" : info.raw)) setCells([[info.table, info.idx, sel.c, fxIn.value]]); grid.focus();
      if (e.key === "Enter") select(sel.r + (e.shiftKey ? -1 : 1), sel.c); else select(sel.r, sel.c + (e.shiftKey ? -1 : 1)); }
  });
  fxIn.addEventListener("blur", function () { var info = cellInfo(sel.r, sel.c); if (info.editable && !fxIn.readOnly && fxIn.value !== String(info.raw == null ? "" : info.raw)) setCells([[info.table, info.idx, sel.c, fxIn.value]]); });

  /* ---------- custom fields: insert, rename, delete columns ---------- */
  function tableAt(r, c) {
    var row = L.rows[r]; if (!row) return null;
    var tab = row.table || (row.block != null && L.blocks[row.block] ? L.blocks[row.block].table : null);
    if (!tab && L.blocks.length) tab = L.blocks[0].table;
    return tab && tab !== "cat" ? tab : (tab === "cat" ? null : null);
  }
  function curCustom() { var tab = tableAt(sel.r, sel.c); var col = tab && TABLES[tab].cols[sel.c]; return col && col.custom ? { tab: tab, col: col } : null; }
  var colCb = null;
  $("ccType").innerHTML = Object.keys(CTYPES).map(function (t) { return "<option value='" + t + "'>" + CTYPES[t] + "</option>"; }).join("");
  $("ccType").onchange = function () { $("ccList").disabled = $("ccType").value !== "list"; };
  function askName(title, def, cb) { def = typeof def === "string" ? { name: def } : (def || {}); $("ccTitle").textContent = title; $("ccName").value = def.name || ""; $("ccType").value = def.type || "text"; $("ccReq").checked = !!def.req; $("ccList").value = (def.list || []).join(", "); $("ccList").disabled = $("ccType").value !== "list"; $("ccErr").textContent = ""; colCb = cb; $("dlgCol").showModal(); $("ccName").focus(); $("ccName").select(); }
  function nameProblem(tab, name, exceptD) {
    var n = name.trim(); if (!n) return "Enter a column heading.";
    if (n.length > 100) return "Keep the heading to 100 characters or fewer.";
    if (/[*]/.test(n)) return "Headings can't contain *.";
    var ent = ENT[tab], key = normH(n);
    if (ent && Object.keys(ent.columns).some(function (k) { return ent.columns[k].h.some(function (a) { return normH(a) === key; }); })) return "'" + n + "' matches a template column. Use a different heading.";
    var clash = TABLES[tab].cols.some(function (c) { return c.d !== exceptD && normH(c.h) === key; });
    return clash ? "This sheet already has a column called '" + n + "'." : "";
  }
  $("ccOk").onclick = function () {
    var f = { name: $("ccName").value, type: $("ccType").value, req: $("ccReq").checked, list: $("ccList").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean) };
    if (f.type === "list" && !f.list.length) { $("ccErr").textContent = "Give the dropdown values, separated by commas."; return; }
    if (colCb) { var err = colCb(f); if (err) { $("ccErr").textContent = err; return; } } $("dlgCol").close(); grid.focus(); };
  $("ccCancel").onclick = function () { $("dlgCol").close(); grid.focus(); };
  $("ccName").addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); $("ccOk").click(); } });
  function insertColumn(right) {
    var tab = tableAt(sel.r, sel.c);
    if (!tab) { toast(TABLES.cat && state.active === "Asset Category Master" ? "Asset Category Master is a single list; columns can't be added here." : "Select a cell in a table first."); return; }
    var n = TABLES[tab].cols.length, pos = Math.min(Math.min(sel.c, sel.c2) + (right ? (Math.max(sel.c, sel.c2) - Math.min(sel.c, sel.c2) + 1) : 0), n);
    if (sel.c >= n) pos = n;
    askName("Add a custom field", "", function (f) {
      var name = f.name, err = nameProblem(tab, name, -1); if (err) return err;
      var before = snapshot([tab]), sheet = TABLES[tab].sheet;
      var defs = (state.custom[tab] = state.custom[tab] || []); defs.push({ name: name.trim(), type: f.type, req: f.req, list: f.list });
      var d = TABLES[tab].baseCols.length + defs.length - 1;
      var order = state.colOrder[tab] || TABLES[tab].cols.map(function (c) { return c.d; }); order.splice(pos, 0, d); state.colOrder[tab] = order;
      var cw = state.colw[sheet]; if (cw) { var nw = {}; Object.keys(cw).forEach(function (k) { nw[+k >= pos ? +k + 1 : k] = cw[k]; }); state.colw[sheet] = nw; }
      rebuildCols(tab); commitSnap([tab], before);
      sel.c = sel.c2 = pos; renderHead(); renderBody(); renderFx(); renderPanel(); toast("Added custom field '" + name.trim() + "'");
      return "";
    });
  }
  function renameColumn() {
    var cc = curCustom(); if (!cc) { toast("Only custom fields can be renamed; template columns keep their Facilio names."); return; }
    var cdef = state.custom[cc.tab][cc.col.d - TABLES[cc.tab].baseCols.length];
    askName("Edit custom field", cdef, function (f) {
      var name = f.name, err = nameProblem(cc.tab, name, cc.col.d); if (err) return err;
      var before = snapshot([cc.tab]); cdef.name = name.trim(); cdef.type = f.type; cdef.req = f.req; cdef.list = f.list;
      rebuildCols(cc.tab); commitSnap([cc.tab], before); renderPanel(); return "";
    });
  }
  function deleteColumn() {
    var cc = curCustom(); if (!cc) { toast("Template columns can't be deleted; only custom fields can."); return; }
    var go = function () {
      var before = snapshot([cc.tab]), order = state.colOrder[cc.tab], at = order.indexOf(cc.col.d), sheet = TABLES[cc.tab].sheet;
      order.splice(at, 1);
      var cw = state.colw[sheet]; if (cw) { var nw = {}; Object.keys(cw).forEach(function (k) { if (+k !== at) nw[+k > at ? +k - 1 : k] = cw[k]; }); state.colw[sheet] = nw; }
      rebuildCols(cc.tab); commitSnap([cc.tab], before); sel.c = sel.c2 = Math.max(0, at - 1); renderPanel(); toast("Deleted custom field '" + cc.col.h + "'. Ctrl+Z restores it.");
    };
    var used = rows(cc.tab).some(function (R) { return R && R[cc.col.d] !== "" && R[cc.col.d] != null; });
    if (used) confirmBox("Delete the custom field '" + cc.col.h + "'?", "Its values are removed from this sheet and the downloaded workbook. Ctrl+Z restores it.", go); else go();
  }
  $("ribbon").addEventListener("click", function (e) {
    var b = e.target.closest("[data-colmenu]"); if (!b) return; closePops();
    var m = document.createElement("div"); m.className = "menu cmenu"; m.id = "cmenu";
    m.innerHTML = "<button data-cm='colL'>Insert column left</button><button data-cm='colR'>Insert column right</button>" + (curCustom() ? "<button data-cm='colRen'>Edit column (name, type, mandatory)</button><button data-cm='colDel'>Delete column</button>" : "<div class='hint2'>Custom fields are extra columns for information the template doesn't have. Facilio creates them as new fields on import.</div>");
    document.body.appendChild(m); var rc = b.getBoundingClientRect(); m.style.position = "fixed"; m.style.top = (rc.bottom + 4) + "px"; m.style.left = rc.left + "px";
    m.addEventListener("click", function (ev) { var it = ev.target.closest("[data-cm]"); if (!it) return; closePops(); runCmd(it.getAttribute("data-cm")); });
    setTimeout(function () { document.addEventListener("mousedown", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("mousedown", close); } }); }, 0);
  });

  /* ---------- keyboard shortcuts ---------- */
  function excelKey(e) {
    var k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && (k === "b" || k === "B")) { e.preventDefault(); toggleFmt("b"); return true; }
    if (mod && (k === "i" || k === "I")) { e.preventDefault(); toggleFmt("i"); return true; }
    if (mod && (k === "u" || k === "U")) { e.preventDefault(); toggleFmt("u"); return true; }
    if (mod && k === "5") { e.preventDefault(); toggleFmt("s"); return true; }
    if (mod && !e.shiftKey && (k === "r" || k === "R")) { e.preventDefault(); fillRight(); return true; }
    if (mod && (k === ":" || (e.shiftKey && k === ";"))) { e.preventDefault(); insertNow(true); return true; }
    if (mod && k === ";") { e.preventDefault(); insertNow(false); return true; }
    if (e.shiftKey && k === "F2") { e.preventDefault(); editNote(); return true; }
    if (k === "Escape" && painter) { e.preventDefault(); painter = null; grid.classList.remove("painting"); refreshRibbon(); return true; }
    if (mod && (k === "d" || k === "D")) { e.preventDefault(); fillDown(); return true; }
    if (mod && (k === "f" || k === "F")) { e.preventDefault(); openFind(false); return true; }
    if (mod && (k === "h" || k === "H")) { e.preventDefault(); openFind(true); return true; }
    if (mod && e.shiftKey && (k === "+" || k === "=")) { e.preventDefault(); insertRows(false); return true; }
    if (mod && !e.shiftKey && (k === "-" || k === "_")) { e.preventDefault(); deleteRows(); return true; }
    if (mod && e.shiftKey && (k === "L" || k === "l")) { e.preventDefault(); runCmd("filter"); return true; }
    if (mod && k === " ") { e.preventDefault(); sel.r = 0; sel.r2 = L.rows.length - 1; renderHead(); renderBody(); updateSelStats(); return true; }
    if (e.shiftKey && k === " " && !mod) { e.preventDefault(); sel.c = 0; sel.c2 = L.maxCol - 1; renderHead(); renderBody(); updateSelStats(); return true; }
    return false;
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && (document.getElementById("cmenu") || document.getElementById("fpop") || document.getElementById("palpop"))) { e.preventDefault(); e.stopPropagation(); closePops(); grid.focus(); } }, true);
  document.addEventListener("keydown", function (e) {
    var mod = e.ctrlKey || e.metaKey; if (!mod || editing) return;
    var t = document.activeElement; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") && !t.closest(".ribbon")) return;
    if (e.key === "f" || e.key === "F") { e.preventDefault(); openFind(false); } else if (e.key === "h" || e.key === "H") { e.preventDefault(); openFind(true); }
  });
  var _origRenderBody = renderBody;
  renderBody = function () { _origRenderBody(); updateSelStats(); };

  /* ---------- export formatting to the downloaded workbook ---------- */
  function argb(hex) { return "FF" + String(hex).replace("#", "").toUpperCase(); }
  function exportFormats(ws, lay, n) {
    lay.rows.forEach(function (row, i) {
      if (row.type !== "data") return; var F = state.fmt[row.table]; if (!F || !F[row.idx]) return;
      Object.keys(F[row.idx]).forEach(function (d) {
        var vc = -1; TABLES[row.table].cols.forEach(function (col, k) { if (col.d === +d) vc = k; }); if (vc < 0) return;
        paintCell(ws.getCell(i + 1, vc + 1), F[row.idx][d]);
      });
    });
    var SF = (state.sfmt || {})[n] || {};
    Object.keys(SF).forEach(function (k) { var m = /^(?:b(\d+):(-?\d+)|r(\d+)):(\d+)$/.exec(k); if (!m) return; var r = m[1] != null ? (lay.blocks[+m[1]] ? lay.blocks[+m[1]].headerRow + (+m[2]) : 0) : +m[3] + 1; if (r >= 1) paintCell(ws.getCell(r, +m[4] + 1), SF[k]); });
  }
  function paintCell(x, f) {
    var font = Object.assign({}, x.font || {});
    if (f.b) font.bold = true; if (f.i) font.italic = true; if (f.u) font.underline = true; if (f.s) font.strike = true;
    if (f.fc) font.color = { argb: argb(f.fc) }; if (f.sz) font.size = Math.round(f.sz * 0.8);
    x.font = font;
    if (f.bg) x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(f.bg) } };
    if (f.al || f.wr) x.alignment = Object.assign({}, x.alignment || {}, f.al ? { horizontal: f.al } : {}, f.wr ? { wrapText: true, vertical: "top" } : {});
    if (f.bd) x.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    if (f.note) x.note = f.note;
  }

  /* =====================================================================
     Facilio import files: check uploaded Job Plan / PPM V3 / Trigger
     Schedule files, and generate them from the workspace.
     ===================================================================== */
  var IC = window.FacilioImportCheck, IR = IC.RULES;
  if (!state.importSettings) state.importSettings = {};
  var IS_DEFAULTS = { createdBy: "", priority: "Priority 5", maintenanceType: "Preventive", plannerType: "Custom", published: "false", section: "Checklists", pmName: "{category}-{frequency}-Maintenance-PPM", woCategory: "{department}", scopeCategory: "Asset", assetField: "code" };
  function IS() { return state.importSettings || (state.importSettings = {}); }
  function setting(k) { var v = IS()[k]; return v == null || v === "" ? IS_DEFAULTS[k] : v; }
  var TEAM = /[?&]team\b/.test(location.search);
  if (TEAM) $("btnImp").hidden = false;

  /* onboarding data the import files must agree with */
  function portfolioRefs() {
    var P = { sites: [], buildings: {}, floors: {}, spaces: {}, assets: [], assetCodes: [] }, push = function (o, k, v) { (o[k] = o[k] || []).indexOf(v) < 0 && o[k].push(v); };
    var g = function (tab, R, key) { var c = ci(tab, key); return c < 0 ? "" : String(R[dIx(tab, c)] == null ? "" : R[dIx(tab, c)]).trim(); };
    rows("site").forEach(function (R) { if (R && g("site", R, "name")) P.sites.push(g("site", R, "name")); });
    rows("building").forEach(function (R) { if (R && g("building", R, "name")) push(P.buildings, g("building", R, "site"), g("building", R, "name")); });
    rows("floor").forEach(function (R) { if (R && g("floor", R, "name")) push(P.floors, g("floor", R, "site") + "|" + g("floor", R, "building"), g("floor", R, "name")); });
    rows("space").forEach(function (R) { if (R && g("space", R, "name")) push(P.spaces, g("space", R, "site") + "|" + g("space", R, "building") + "|" + g("space", R, "floor"), g("space", R, "name")); });
    rows("asset").forEach(function (R) { if (!R) return; var n = g("asset", R, "name"), c = g("asset", R, "code"); if (n) P.assets.push(n); if (c) P.assetCodes.push(c); });
    return P.sites.length ? P : null;
  }

  /* ---------------- generate from the workspace ---------------- */
  var ORD = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
  function generateImports() {
    var g = function (tab, R, key) { var c = ci(tab, key); return c < 0 || !R ? "" : String(R[dIx(tab, c)] == null ? "" : R[dIx(tab, c)]).trim(); };
    var notes = [], assetBy = {}, assetIdx = {}, planIdx = {}, src = { jobplan: [], trigger: [], ppm: [] };
    rows("asset").forEach(function (R, i) { if (R && g("asset", R, "code")) { assetBy[g("asset", R, "code").toLowerCase()] = R; assetIdx[g("asset", R, "code").toLowerCase()] = i; } });
    rows("jobPlan").forEach(function (R, i) { if (R && g("jobPlan", R, "name") && planIdx[g("jobPlan", R, "name")] == null) planIdx[g("jobPlan", R, "name")] = i; });
    /* 1. Job Plan import: one row per task; job plan values repeat on every row */
    var plans = {}; rows("jobPlan").forEach(function (R) { if (R && g("jobPlan", R, "name")) plans[g("jobPlan", R, "name")] = g("jobPlan", R, "category"); });
    var jp = [], seq = {};
    rows("task").forEach(function (R, ti) {
      if (!R || !rowFilled(R)) return;
      src.jobplan.push({ task: ti, plan: planIdx[g("task", R, "plan")] });
      var name = g("task", R, "plan"), type = g("task", R, "inputType"), input = g("task", R, "input");
      seq[name] = (seq[name] || 0) + 1;
      jp.push([name, plans[name] || "Assets", "", setting("section"), "1", String(seq[name]), IR.taskScope, IR.taskScope, g("task", R, "checklist"), type, /^(radio|reading)$/i.test(type) ? input : ""]);
    });
    /* 2. Trigger Schedule import, derived from frequency + start date + time */
    var trig = [], trigBy = {}, ppm = [];
    rows("pm").forEach(function (R, i) {
      if (!R || !rowFilled(R)) return;
      var freq = g("pm", R, "frequency").toUpperCase(), start = g("pm", R, "startDate"), runEvery = +g("pm", R, "runEvery") || 1;
      var times = g("pm", R, "execTime").split(/[,;]/).map(function (x) { var m = x.trim().match(/^(\d{1,2}):(\d{2})/); return m ? ("0" + m[1]).slice(-2) + ":" + m[2] : ""; }).filter(Boolean).join(",");
      var skipWords = g("pm", R, "skip").toLowerCase().split(/[,;]/).map(function (x) { return ORD[x.trim()]; }).filter(Boolean);
      var tr = IR.triggers.indexOf(freq) >= 0 ? freq : null, m = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      var label = "", name = "", values = "", monthV = "", yday = "", sdText = m ? m[3] + "/" + m[2] + "/" + m[1] : "";
      if (tr && m) {
        var d = +m[3], mo = +m[2] - 1, wd = IR.weekdays[(new Date(Date.UTC(+m[1], mo, d)).getUTCDay() + 6) % 7];
        var unit = IR.labelFor[tr]; label = (unit === "Q" || unit === "HY") ? unit : runEvery + " " + unit;
        if (tr === "WEEKLY") values = wd;
        if (tr === "MONTHLY" || tr === "QUARTERLY" || tr === "HALF_YEARLY") values = String(d);
        if (tr === "QUARTERLY") monthV = IC.cycleStart(mo, 3);
        if (tr === "HALF_YEARLY") monthV = IC.cycleStart(mo, 6);
        if (tr === "ANNUALLY") { values = IR.months[mo]; yday = String(d); }
        name = IC.triggerName(tr, values, monthV, yday, times || "");
        if (!trigBy[name]) { trigBy[name] = 1; src.trigger.push({ pm: i }); trig.push([name, label, tr, "", times, runEvery > 1 ? String(runEvery) : "", values, skipWords.length ? String(skipWords[0]) : "", yday, monthV, "", sdText]); }
      }
      /* 3. PPM V3 row */
      var code = g("pm", R, "asset"), A = assetBy[code.toLowerCase()], cat = A ? g("asset", A, "category") : "";
      src.ppm.push({ pm: i, asset: assetIdx[code.toLowerCase()] });
      var fw = tr ? IR.nameWord[tr] : "", pmName = setting("pmName").replace("{category}", cat || code).replace("{frequency}", fw).replace("{jobplan}", g("pm", R, "jobPlan")).replace("{asset}", A ? g("asset", A, "name") : code).replace(/-{2,}/g, "-").replace(/^[-\s]+|[-\s]+$/g, "");
      var wo = setting("woCategory").replace("{department}", A ? g("asset", A, "department") : "").replace("{category}", cat);
      ppm.push([pmName, setting("published"), pmName, A ? g("asset", A, "site") : "", A ? g("asset", A, "building") : "", A ? g("asset", A, "floor") : "", A ? g("asset", A, "space") : "", A && setting("assetField") === "name" ? g("asset", A, "name") : code, g("pm", R, "jobPlan"), name, g("pm", R, "assignedTo"), setting("createdBy"), label, code, setting("maintenanceType"), setting("plannerType"), setting("priority"), setting("scopeCategory"), wo, wo]);
    });
    if (rows("pm").some(function (R) { return R && g("pm", R, "skip"); })) notes.push("Skip Every was converted from words (second, third…) to numbers; confirm the values in the Trigger Schedule file.");
    var mk = function (type, data) { return { name: IC.TYPE_LABEL[type], type: type, header: IC.HEAD[type].slice(), rows: data, rowNums: data.map(function (_, i) { return i + 2; }) }; };
    return { files: [mk("jobplan", jp), mk("trigger", trig), mk("ppm", ppm)], notes: notes, src: src };
  }

  /* ---------------- grouped results ---------------- */
  function compressRows(list) {
    var n = list.map(Number).filter(function (x) { return !isNaN(x); }).sort(function (a, b) { return a - b; }), out = [], i = 0;
    while (i < n.length) { var j = i; while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++; out.push(i === j ? String(n[i]) : n[i] + "–" + n[j]); i = j + 1; }
    return out.length > 6 ? out.slice(0, 6).join(", ") + ", …" : out.join(", ");
  }
  function groupIssues(list) {
    var g = {}, order = [];
    list.forEach(function (i) { var k = i.file + "|" + i.col + "|" + i.severity + "|" + i.issue.replace(/'[^']*'/g, "'…'") + "|" + i.suggestion.replace(/'[^']*'/g, "'…'");
      if (!g[k]) { g[k] = { first: i, rows: [], n: 0, values: {} }; order.push(k); } g[k].rows.push(i.row); g[k].n++; if (i.value) g[k].values[i.value] = 1; });
    var rank = { Critical: 0, Warning: 1, Info: 2 };
    return order.map(function (k) { return g[k]; }).sort(function (a, b) { return rank[a.first.severity] - rank[b.first.severity] || b.n - a.n; });
  }
  function renderImpResults(el, files, issues, extraNote) {
    var c = { Critical: 0, Warning: 0, Info: 0 }; issues.forEach(function (i) { c[i.severity]++; });
    var fixable = issues.filter(function (i) { return i.autofix !== undefined && i.autofix !== null; }).length;
    var h = "<div class='impfiles'>" + files.map(function (f) { var n = issues.filter(function (i) { return i.file === f.name && i.severity === "Critical"; }).length;
      return "<div class='impfile'><b>" + esc(f.name) + "</b><span>" + esc(IC.TYPE_LABEL[f.type]) + " · " + f.rows.length + " rows</span><span class='sev " + (n ? "Critical" : "ok") + "'>" + (n ? n + " critical" : "No critical issues") + "</span></div>"; }).join("") + "</div>";
    h += "<div class='sumrow'><div class='c'><b>" + c.Critical + "</b><span>Critical, block import</span></div><div class='w'><b>" + c.Warning + "</b><span>Warnings</span></div><div class='i'><b>" + c.Info + "</b><span>Info</span></div><div><b>" + fixable + "</b><span>Fixable automatically</span></div></div>";
    if (extraNote) h += "<p class='impnote'>" + esc(extraNote) + "</p>";
    var groups = groupIssues(issues);
    if (!groups.length) h += "<div class='empty'>No issues found. The files follow the Facilio import rules.</div>";
    else h += "<table class='rep'><thead><tr><th>Severity</th><th>File</th><th>Column</th><th>Rows</th><th>Issue and fix</th></tr></thead><tbody>" + groups.slice(0, 300).map(function (gr) {
      var i = gr.first, ex = Object.keys(gr.values).slice(0, 3);
      return "<tr><td><span class='sev " + i.severity + "'>" + i.severity + "</span></td><td>" + esc(i.file) + "</td><td>" + esc(i.col) + "</td><td>" + (gr.n > 1 ? "<b>" + gr.n + " rows</b><br>" : "") + esc(compressRows(gr.rows)) + "</td><td>" + esc(gr.n > 1 ? i.issue.replace(/'[^']*'/, ex.length === 1 ? "'" + ex[0] + "'" : "this value") : i.issue) + " <span style='color:var(--muted)'>" + esc(i.suggestion) + "</span>" + (gr.n > 1 && ex.length > 1 ? "<br><small style='color:var(--muted)'>e.g. " + ex.map(esc).join(" · ") + "</small>" : "") + "</td></tr>";
    }).join("") + "</tbody></table>";
    el.innerHTML = h;
  }
  function issuesWorkbook(issues, name) {
    var wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Issues", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [{ header: "Severity", width: 11 }, { header: "File", width: 34 }, { header: "Row", width: 7 }, { header: "Column", width: 26 }, { header: "Value", width: 30 }, { header: "Issue", width: 70 }, { header: "Suggested fix", width: 50 }, { header: "Automatic fix", width: 24 }];
    issues.forEach(function (i) { ws.addRow([i.severity, i.file, i.row, i.col, i.value, i.issue, i.suggestion, i.autofix == null ? "" : (i.autofix === "" ? "(clear)" : i.autofix)]); });
    styleHeader(ws.getRow(1)); ws.autoFilter = { from: "A1", to: "H1" };
    saveWB(wb, name);
  }

  /* ---------------- check uploaded import files ---------------- */
  var impState = { files: [], issues: [], buffers: {} };
  function openImpCheck() { $("impTitle").textContent = "Check Facilio import files"; $("impGen").hidden = true; $("impChk").hidden = false; $("impBody").innerHTML = ""; $("impActions").hidden = true; $("impGenDl").hidden = true; $("dlgImp").showModal(); }
  $("impPick").onclick = function () { $("impInput").click(); };
  $("impInput").addEventListener("change", function () { var fl = Array.prototype.slice.call(this.files); this.value = ""; loadImpFiles(fl); });
  $("impDrop").addEventListener("dragover", function (e) { e.preventDefault(); e.stopPropagation(); this.classList.add("over"); });
  $("impDrop").addEventListener("dragleave", function () { this.classList.remove("over"); });
  $("impDrop").addEventListener("drop", function (e) { e.preventDefault(); e.stopPropagation(); this.classList.remove("over"); loadImpFiles(Array.prototype.slice.call(e.dataTransfer.files)); });
  function loadImpFiles(list) {
    if (!list.length) return;
    $("impBody").innerHTML = "<div class='empty'>Reading " + list.length + " file" + (list.length > 1 ? "s" : "") + "…</div>";
    var done = 0, files = [], skipped = [];
    impState.buffers = {};
    list.forEach(function (file) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var buf = new Uint8Array(rd.result), wb = XLSX.read(buf, { type: "array", cellNF: true, cellFormula: true });
          var found = false;
          wb.SheetNames.forEach(function (sn) { var s = IC.readSheet(wb.Sheets[sn], XLSX); if (!s) return; var t = IC.detect(s.header); if (!t) return; found = true;
            files.push(Object.assign({ name: file.name + (wb.SheetNames.length > 1 ? " › " + sn : ""), fileName: file.name, sheet: sn, type: t }, s)); });
          impState.buffers[file.name] = rd.result;
          if (!found) skipped.push(file.name);
        } catch (e) { skipped.push(file.name); }
        if (++done === list.length) runImpCheck(files, skipped);
      };
      rd.readAsArrayBuffer(file);
    });
  }
  function runImpCheck(files, skipped) {
    impState.files = files;
    if (!files.length) { $("impBody").innerHTML = "<div class='empty'>No Job Plan, PPM V3 or Trigger Schedule import sheet was recognised" + (skipped.length ? " in " + esc(skipped.join(", ")) : "") + ". The headings must match the Facilio import templates.</div>"; return; }
    var P = portfolioRefs();
    impState.issues = IC.checkAll(files, P);
    var note = (skipped.length ? "Not recognised as an import file: " + skipped.join(", ") + ". " : "") + (P ? "Sites, buildings, floors, spaces and assets were also checked against the data in this workspace." : "Tip: with the onboarding workbook loaded in the workspace, PPM sites, buildings, floors, spaces and assets are checked against it too.");
    if (files.some(function (f) { return f.type === "ppm"; }) && !files.some(function (f) { return f.type === "trigger"; })) note += " Add the Trigger Schedule file to check each PPM's schedule and frequency label.";
    if (files.some(function (f) { return f.type === "ppm"; }) && !files.some(function (f) { return f.type === "jobplan"; })) note += " Add the Job Plan file to check each PPM's job plan.";
    renderImpResults($("impBody"), files, impState.issues, note);
    $("impActions").hidden = false; $("impFixDl").hidden = !impState.issues.some(function (i) { return i.autofix != null; });
  }
  $("impReportDl").onclick = function () { issuesWorkbook(impState.issues, "Facilio import check " + today() + ".xlsx"); };
  $("impFixDl").onclick = function () {
    /* write the automatic fixes into a copy of each original file, leaving everything else as it was */
    var byFile = {};
    impState.issues.forEach(function (i) { if (i.autofix == null || i.row === "") return; var f = impState.files.filter(function (x) { return x.name === i.file; })[0]; if (!f) return; (byFile[f.fileName] = byFile[f.fileName] || []).push({ f: f, i: i }); });
    Object.keys(byFile).forEach(function (fn) {
      var wb = new ExcelJS.Workbook();
      wb.xlsx.load(impState.buffers[fn]).then(function () {
        var n = 0;
        byFile[fn].forEach(function (x) {
          var ws = wb.getWorksheet(x.f.sheet); if (!ws) return;
          var col = IC.colIndex(x.f.header, x.i.col); if (col < 0) return;
          var cell = ws.getCell(+x.i.row, col + 1);
          cell.value = x.i.autofix === "" ? null : x.i.autofix; n++;
        });
        saveWB(wb, fn.replace(/\.xlsx?$/i, "") + " - corrected.xlsx"); toast(n + " fixes applied to " + fn);
      }).catch(function () { toast("Couldn't write a corrected copy of " + fn + "."); });
    });
  };

  /* ---------------- generate from the workspace ---------------- */
  var genState = null;
  function openImpGen() {
    $("impTitle").textContent = "Generate Facilio import files"; $("impGen").hidden = false; $("impChk").hidden = true; $("impActions").hidden = true;
    Object.keys(IS_DEFAULTS).forEach(function (k) { var el = $("is_" + k); if (el) el.value = IS()[k] != null ? IS()[k] : IS_DEFAULTS[k]; });
    $("impBody").innerHTML = "<div class='empty'>Review the settings, then select Generate. Data comes from the PM Assets, Asset and Job Plan sheets.</div>";
    $("dlgImp").showModal();
  }
  $("impGenGo").onclick = function () {
    Object.keys(IS_DEFAULTS).forEach(function (k) { var el = $("is_" + k); if (el) IS()[k] = el.value; }); save();
    genState = generateImports();
    if (!genState.files.some(function (f) { return f.rows.length; })) { $("impBody").innerHTML = "<div class='empty'>Nothing to generate yet. Fill in the Job Plan and PM Assets sheets first.</div>"; return; }
    var P = portfolioRefs(), issues = IC.checkAll(genState.files, P);
    impState.issues = issues; impState.files = genState.files;
    renderImpResults($("impBody"), genState.files, issues, genState.notes.join(" ") + " Problems in the generated files come from the workspace data; fix them in the sheets and generate again.");
    $("impActions").hidden = false; $("impFixDl").hidden = true; $("impGenDl").hidden = false;
  };
  $("impGenDl").onclick = function () {
    if (!genState) return;
    var names = { jobplan: "Job Plan Import", trigger: "PPM V3 Trigger Schedule Import", ppm: "PPM V3 Import" };
    genState.files.forEach(function (f, k) {
      if (!f.rows.length) return;
      setTimeout(function () {
        var wb = new ExcelJS.Workbook(), ws = wb.addWorksheet(f.type === "jobplan" ? "Import" : "Sheet1");
        ws.addRow(f.header); f.rows.forEach(function (r) { ws.addRow(r.map(function (v) { return v == null ? "" : String(v); })); });
        styleHeader(ws.getRow(1)); ws.columns.forEach(function (c, i) { c.width = Math.min(48, Math.max(12, String(f.header[i]).length + 4)); });
        saveWB(wb, names[f.type] + " " + today() + ".xlsx");
      }, k * 700);
    });
  };
  $("impClose").onclick = function () { $("dlgImp").close(); grid.focus(); };
  $("btnImp").addEventListener("click", function (e) {
    e.stopPropagation(); var old = $("impMenu"); if (old) { old.remove(); return; }
    var m = document.createElement("div"); m.className = "menu"; m.id = "impMenu";
    m.innerHTML = "<button data-im='chk'>Check import files<small>Job Plan, PPM V3 and Trigger Schedule files, against Facilio's import rules.</small></button><button data-im='gen'>Generate import files<small>Build the three import files from this workspace's PM Assets and Job Plan sheets.</small></button>";
    document.body.appendChild(m); var rc = $("btnImp").getBoundingClientRect(); m.style.position = "fixed"; m.style.top = (rc.bottom + 6) + "px"; m.style.left = Math.max(8, rc.right - 320) + "px"; m.style.width = "320px";
    setTimeout(function () { document.addEventListener("click", function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("click", close); } }); }, 0);
    m.addEventListener("click", function (ev) { var b = ev.target.closest("[data-im]"); if (!b) return; m.remove(); if (b.getAttribute("data-im") === "chk") openImpCheck(); else openImpGen(); });
  });

  /* ---------------- live import sheets inside the workspace ---------------- */
  var GEN = [{ name: "Job Plan Import", type: "jobplan" }, { name: "Trigger Schedule Import", type: "trigger" }, { name: "PPM V3 Import", type: "ppm" }];
  var genCache = null;
  function genSheet(n) { for (var i = 0; i < GEN.length; i++) if (GEN[i].name === n) return GEN[i]; return null; }
  function genRefresh() {
    var out = generateImports(), widths = {};
    out.files.forEach(function (f, k) {
      f.name = GEN[k].name;
      widths[f.name] = f.header.map(function (h, c) { var m = String(h).length; for (var i = 0; i < Math.min(f.rows.length, 300); i++) m = Math.max(m, String(f.rows[i][c] || "").length); return Math.min(360, Math.max(110, Math.round(m * 7.2) + 22)); });
    });
    genCache = { files: out.files, src: out.src, widths: widths, notes: out.notes };
    return genCache;
  }
  function genFile(n) { if (!genCache) genRefresh(); var gs = genSheet(n); return gs ? genCache.files[GEN.indexOf(gs)] : null; }
  function genLayout(n) {
    var f = genFile(n), rowsOut = [{ type: "static", kind: "header", cells: {} }];
    f.header.forEach(function (h, c) { rowsOut[0].cells[c] = { v: h, kind: "header" }; });
    f.rows.forEach(function (rw) { var cells = {}; rw.forEach(function (v, c) { cells[c] = { v: v == null ? "" : String(v), kind: "gen" }; }); rowsOut.push({ type: "static", kind: "gen", cells: cells }); });
    for (var i = 0; i < 30; i++) rowsOut.push({ type: "static", kind: "gen", cells: {} });
    return { name: n, rows: rowsOut, blocks: [], maxCol: f.header.length, gen: true, genHeader: f.header };
  }
  /* where each generated column comes from */
  var GEN_MAP = {
    jobplan: { "Name": ["task", "plan"], "Scope category": ["jobPlan", "category"], "Asset Catgeory": null, "Section/Skill Set": "setting:section", "Section sequence": "fixed:1", "Task Sequence": "counted", "Task Scope": "fixed:Selected Resources", "Section scope": "fixed:Selected Resources", "Task": ["task", "checklist"], "Input Type": ["task", "inputType"], "Options": ["task", "input"] },
    trigger: { "Name": "built", "Workorder frequency Label": ["pm", "frequency"], "Trigger": ["pm", "frequency"], "Week Frequency": null, "Times": ["pm", "execTime"], "Runs Every": ["pm", "runEvery"], "Values": ["pm", "startDate"], "Skip Every": ["pm", "skip"], "Yearly Day Value": ["pm", "startDate"], "Month Value": ["pm", "startDate"], "Yearly Day Of Week Values": null, "Start Date": ["pm", "startDate"] },
    ppm: { "PM Name": "setting:pmName", "Published": "setting:published", "Subject": "setting:pmName", "Site": ["asset", "site"], "Building": ["asset", "building"], "Floor": ["asset", "floor"], "Space": ["asset", "space"], "Asset": ["pm", "asset"], "Job Plan": ["pm", "jobPlan"], "Trigger Schedule": ["pm", "frequency"], "Assigned To": ["pm", "assignedTo"], "Created By": "setting:createdBy", "Custom Frequency": ["pm", "frequency"], "Description": ["pm", "asset"], "Maintenance Type": "setting:maintenanceType", "Planner Type": "setting:plannerType", "Priority": "setting:priority", "Scope Category": "setting:scopeCategory", "Workorder Category": ["asset", "department"], "Workorder Category Mapping": ["asset", "department"] }
  };
  var GEN_WHY = {
    jobplan: { "Name": "Job Plan sheet, task table: Job Plan Name", "Scope category": "Job Plan sheet, top table: Category of the job plan", "Asset Catgeory": "Left empty (needed only when the scope category is Asset Category)", "Section/Skill Set": "Import setting: Section / Skill Set", "Section sequence": "Always 1 (one section per job plan)", "Task Sequence": "Counted 1, 2, 3… within each job plan", "Task Scope": "Always Selected Resources", "Section scope": "Always Selected Resources", "Task": "Job Plan sheet, task table: Checklist", "Input Type": "Job Plan sheet, task table: Input Type", "Options": "Job Plan sheet, task table: Input (Radio and Reading only)" },
    trigger: { "Name": "Built from frequency, day, months and time, e.g. Monthly-15-07:00", "Workorder frequency Label": "PM Assets: Frequency and Run Every (1 M, Q, HY, 1 Y…)", "Trigger": "PM Assets: Frequency", "Week Frequency": "Not used", "Times": "PM Assets: Execution Time", "Runs Every": "PM Assets: Run Every (only when more than 1)", "Values": "PM Assets: Execution Start Date (day; weekday for WEEKLY; month for ANNUALLY)", "Skip Every": "PM Assets: Skip Every, as a number", "Yearly Day Value": "PM Assets: day of the Execution Start Date (ANNUALLY only)", "Month Value": "PM Assets: first month of the cycle containing the start date (QUARTERLY, HALF_YEARLY)", "Yearly Day Of Week Values": "Not used", "Start Date": "PM Assets: Execution Start Date, as dd/mm/yyyy" },
    ppm: { "PM Name": "Import setting: PM Name pattern", "Published": "Import setting: Published", "Subject": "Same as PM Name", "Site": "Asset sheet: Site of the asset", "Building": "Asset sheet: Building of the asset", "Floor": "Asset sheet: Floor of the asset", "Space": "Asset sheet: Space of the asset", "Asset": "PM Assets: Asset Details (code or name, per settings)", "Job Plan": "PM Assets: Job Plan", "Trigger Schedule": "Name of the matching row on Trigger Schedule Import", "Assigned To": "PM Assets: Assigned To", "Created By": "Import setting: Created By", "Custom Frequency": "Label of the matching trigger schedule", "Description": "PM Assets: Asset Details (asset code)", "Maintenance Type": "Import setting", "Planner Type": "Import setting", "Priority": "Import setting", "Scope Category": "Import setting", "Workorder Category": "Import setting (default: Asset sheet department)", "Workorder Category Mapping": "Same as Workorder Category" }
  };
  function genSource(n, r, c) {
    var gs = genSheet(n); if (!gs || r < 1 || !genCache) return null;
    var f = genFile(n), s = genCache.src[gs.type][r - 1], hdr = f.header[c], m = GEN_MAP[gs.type][hdr];
    if (!s || !m || typeof m === "string") return s ? { tab: gs.type === "jobplan" ? "task" : "pm", idx: gs.type === "jobplan" ? s.task : s.pm, key: null } : null;
    var tab = m[0], idx = tab === "task" ? s.task : tab === "jobPlan" ? s.plan : tab === "asset" ? s.asset : s.pm;
    if (idx == null) return { tab: gs.type === "jobplan" ? "task" : "pm", idx: gs.type === "jobplan" ? s.task : s.pm, key: null };
    return { tab: tab, idx: idx, key: m[1] };
  }
  function goSource(n, r, c) {
    var sr = genSource(n, r, c); if (!sr) { toast("This value comes from a setting, not a sheet."); return; }
    var sheet = TABLES[sr.tab].sheet; switchSheet(sheet);
    var b = L.blocks.filter(function (x) { return x.table === sr.tab; })[0]; if (!b) return;
    var col = sr.key ? Math.max(0, ci(sr.tab, sr.key)) : 0; select(b.dataStart - 1 + sr.idx, col); grid.focus();
  }
  function genIssues() {
    var c = genRefresh(), P = portfolioRefs(), list = IC.checkAll(c.files, P), out = [];
    list.forEach(function (i) {
      var f = c.files.filter(function (x) { return x.name === i.file; })[0]; if (!f) return;
      var r = i.row ? +i.row - 1 : null, col = IC.colIndex(f.header, i.col), gs = genSheet(f.name);
      var sr = r != null && col >= 0 ? genSource(f.name, r, col) : null, where = "";
      if (sr) { var b = sheetLayout(TABLES[sr.tab].sheet).blocks.filter(function (x) { return x.table === sr.tab; })[0]; if (b) where = " Fix it on " + TABLES[sr.tab].sheet + " row " + (b.dataStart + sr.idx) + "."; }
      out.push({ sheet: f.name, row: i.row, field: i.col, value: i.value, severity: i.severity, issue: i.issue, suggestion: (i.suggestion + where).trim(), gen: true, r: r, c: col });
    });
    return out;
  }

  function genPanel(n) {
    var gs = genSheet(n), f = genFile(n), h = "<div class='genhow'><b>How this sheet works</b><ol><li>The client fills PM Assets, Job Plan and Asset as usual.</li><li>This sheet rebuilds itself on every change, in Facilio's import format.</li><li>It is read-only: select a cell and use Go to source to correct the original value.</li><li>The Facilio team receives it in the downloaded workbook and imports it into Facilio.</li></ol></div>";
    h += "<h3>" + f.rows.length + " row" + (f.rows.length === 1 ? "" : "s") + " generated</h3>";
    if (gs.type === "ppm") h += "<p class='genhint'>One row per PM Assets row. Schedules are on Trigger Schedule Import; job plans on Job Plan Import.</p>";
    if (gs.type === "trigger") h += "<p class='genhint'>One row per distinct schedule. PM Assets rows with the same frequency, day, months and time share one schedule.</p>";
    if (gs.type === "jobplan") h += "<p class='genhint'>One row per checklist task. Task Scope and Section scope are always Selected Resources.</p>";
    h += "<h3>Where each column comes from</h3><div class='colcards'>" + f.header.map(function (hd, c) { return "<div class='colcard static'><span class='cn'>" + colLetter(c) + " · " + esc(hd) + "</span><span class='cr'>" + esc(GEN_WHY[gs.type][hd] || "") + "</span></div>"; }).join("") + "</div>";
    var keys = gs.type === "jobplan" ? ["section"] : gs.type === "ppm" ? ["createdBy", "priority", "maintenanceType", "plannerType", "published", "pmName", "woCategory", "scopeCategory", "assetField"] : [];
    var labels = { createdBy: "Created By", priority: "Priority", maintenanceType: "Maintenance Type", plannerType: "Planner Type", published: "Published", section: "Section / Skill Set", pmName: "PM Name pattern", woCategory: "Workorder Category", scopeCategory: "PPM Scope Category", assetField: "PPM Asset column (code or name)" };
    if (keys.length) {
      h += "<h3>Import settings" + (TEAM ? "" : " (set by the Facilio team)") + "</h3><div class='gensettings'>" + keys.map(function (k) {
        return "<label>" + esc(labels[k]) + (TEAM ? "<input data-gs='" + k + "' value='" + esc(setting(k)) + "'>" : "<span>" + esc(setting(k) || "—") + "</span>") + "</label>";
      }).join("") + "</div>";
      if (TEAM) h += "<p class='genhint'>Patterns can use {category}, {frequency}, {asset}, {jobplan} and {department}. Changes apply immediately.</p>";
    }
    return h;
  }
  $("pbody").addEventListener("change", function (e) { var k = e.target.getAttribute && e.target.getAttribute("data-gs"); if (!k) return; IS()[k] = e.target.value; save(); genRefresh(); relayout(); renderHead(); renderBody(); renderPanel(); scheduleValidate(); });

  window.FacilioWorkspace = { state: function () { return state; }, issues: function () { return issues; }, layout: sheetLayout, validateNow: runValidate, sheets: sheetList };

  /* ---------------- start ---------------- */
  if (sheetList().indexOf(state.active) < 0) state.active = "Overview";
  rebuildAll(); relayout(); var fr0 = firstDataRow(); sel = { r: fr0, c: 0, r2: fr0, c2: 0 };
  renderHead(); renderBody(); renderFx(); renderTabs(); renderPanel();
  if (state.idb) {   /* large saved work: read it back from IndexedDB */
    busy("Opening your saved work…", 40);
    idb("readonly", function (st) { return st.get(PID); }).then(function (raw) {
      var s1 = raw ? JSON.parse(raw) : null; busy();
      if (!s1 || s1.v !== 2) { delete state.idb; toast("The saved work couldn't be found in this browser. Import your workbook to carry on."); return; }
      ["custom", "colOrder", "fmt", "colw", "filters"].forEach(function (k) { if (!s1[k]) s1[k] = {}; }); if (!s1.sheets) s1.sheets = [];
      s1.sheets.forEach(function (d) { if (!TABLES[d.key]) { registerCustom(d); indexSheets(); } });
      Object.keys(TABLES).forEach(function (k) { if (!s1.tabs[k]) s1.tabs[k] = []; });
      state = s1; rebuildAll(); undoStack = []; redoStack = []; switchSheet(sheetList().indexOf(state.active) >= 0 ? state.active : "Overview", true); $("saveState").textContent = "Restored from this browser (large workbook)"; checkInBackground();
    }).catch(function (e) { busy(); delete state.idb; console.error(e); toast("The saved work couldn't be read from this browser."); });
  } else checkInBackground();
  if (anyData()) $("saveState").textContent = "Restored from this browser";
  if (!state.seenWalk) openWalk();
})();
