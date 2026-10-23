(function (root) {
  "use strict";
  var X = function () { return root.XLSX; };

  /* ---------- helpers ---------- */
  function normHeader(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/\*/g, " ").replace(/\([^)]*\)?/g, " ")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function normVal(s) { return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " "); }
  function squash(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function isErr(v) { return v && typeof v === "object" && v.err; }
  function isTime(v) { return v && typeof v === "object" && "time" in v; }
  function isBlank(v) { return v == null || (typeof v === "string" && v.trim() === ""); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtTime(f) { var m = Math.round(f * 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function display(v) {
    if (v == null) return "";
    if (v instanceof Date) return isNaN(v) ? "Invalid date" : v.toISOString().slice(0, 10);
    if (isErr(v)) return v.err;
    if (isTime(v)) return fmtTime(v.time);
    return String(v);
  }
  function text(v) { return isBlank(v) || isErr(v) ? "" : display(v).trim(); }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      var t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }
  function closest(value, candidates) {
    var n = normVal(value), sq = squash(value), best = null, bd = Infinity, tie = false, i;
    if (!n || !candidates.length) return null;
    for (i = 0; i < candidates.length; i++) if (squash(candidates[i]) === sq) return candidates[i];
    for (i = 0; i < candidates.length && i < 5000; i++) {
      var c = normVal(candidates[i]), d = lev(n, c);
      if (d < bd) { bd = d; best = candidates[i]; tie = false; } else if (d === bd && c !== normVal(best)) tie = true;
    }
    return !tie && bd <= Math.max(2, Math.floor(n.length * 0.3)) ? best : null;
  }
  /* explain how an entered value differs from its closest match, word by word */
  function explainDiff(entered, expected) {
    var a = String(entered).trim().split(/\s+/), b = String(expected).trim().split(/\s+/), spell = [], caps = [];
    if (a.length !== b.length) return "the wording differs";
    for (var i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;
      if (a[i].toLowerCase() === b[i].toLowerCase()) caps.push("'" + a[i] + "' should be '" + b[i] + "'");
      else spell.push("'" + a[i] + "' should be '" + b[i] + "'");
    }
    var parts = [];
    if (spell.length) parts.push("spelling: " + spell.join(", "));
    if (caps.length) parts.push("capitals: " + caps.join(", "));
    return parts.join("; ");
  }
  function serialToDate(s) { return new Date(Math.round((s - 25569) * 86400) * 1000); }
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function mk(y, m, d) {
    if (y < 100) y += 2000;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) ? dt : null;
  }
  function parseDate(v) {
    if (v instanceof Date) return isNaN(v) ? null : { date: v, kind: "date" };
    if (typeof v === "number") return (v > 20000 && v < 80000) ? { date: serialToDate(v), kind: "serial" } : null;
    if (typeof v !== "string") return null;
    var s = v.trim(), m, dt;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) { dt = mk(+m[1], +m[2], +m[3]); return dt ? { date: dt, kind: "text" } : null; }
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})$/))) {
      var a = +m[1], b = +m[2]; dt = mk(+m[3], b, a);
      return dt ? { date: dt, kind: "text", ambiguous: a <= 12 && b <= 12 && a !== b } : null;
    }
    if ((m = s.match(/^(\d{1,2})[\s\-\/.]+([A-Za-z]{3,9})[\s\-\/.,]+(\d{2}|\d{4})$/))) {
      var mo = MONTHS[m[2].toLowerCase().slice(0, 3)];
      dt = mo ? mk(+m[3], mo, +m[1]) : null; return dt ? { date: dt, kind: "text" } : null;
    }
    return null;
  }
  function parseTimes(v) {
    if (isTime(v)) return [v.time];
    if (typeof v === "number") return v >= 0 && v < 1 ? [v] : null;
    if (v instanceof Date) return null;
    var parts = String(v).split(/[,;\n]+/).map(function (p) { return p.trim(); }).filter(Boolean), out = [];
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(/^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
      if (!m) return null;
      var h = +m[1], mi = +(m[2] || 0), ap = (m[3] || "").toLowerCase().replace(/\./g, "");
      if (!m[2] && !ap) return null;
      if (ap) { if (h < 1 || h > 12) return null; if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; }
      if (h > 23 || mi > 59) return null;
      out.push((h * 60 + mi) / 1440);
    }
    return out.length ? out : null;
  }
  function parseNumber(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string") return null;
    var s = v.trim().replace(/,/g, "");
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
  }
  function splitMulti(v) { return String(v).split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  var EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[A-Za-z]{2,}$/;

  /* ---------- reading the workbook ---------- */
  function cellVal(cell) {
    if (!cell) return null;
    if (cell.t === "e") return { err: cell.w || "#ERROR" };
    if (cell.t === "n" && cell.z && X().SSF.is_date(cell.z)) return cell.v < 1 && cell.v >= 0 ? { time: cell.v } : serialToDate(cell.v);
    if (cell.t === "d") return cell.v;
    return cell.v;
  }
  function readGrid(ws) {
    if (!ws || !ws["!ref"]) return [];
    var U = X().utils, r = U.decode_range(ws["!ref"]), out = [];
    var maxR = Math.min(r.e.r, r.s.r + 20000), maxC = Math.min(r.e.c, r.s.c + 150);
    for (var R = r.s.r; R <= maxR; R++) {
      var row = [];
      for (var C = r.s.c; C <= maxC; C++) row.push(cellVal(ws[U.encode_cell({ r: R, c: C })]));
      out.push({ excelRow: R + 1, cells: row });
    }
    return out;
  }
  function aliasIndex(ent) {
    var idx = {};
    Object.keys(ent.columns).forEach(function (k) {
      ent.columns[k].h.forEach(function (a) { var n = normHeader(a); if (n && !(n in idx)) idx[n] = k; });
    });
    return idx;
  }
  function headerScore(cells, idx) {
    var seen = {}, s = 0;
    cells.forEach(function (v) { if (typeof v !== "string") return; var k = idx[normHeader(v)]; if (k && !seen[k]) { seen[k] = 1; s++; } });
    return s;
  }
  function looksLikeDescription(cells, headerCells) {
    var filled = 0, longs = 0, echo = false;
    cells.forEach(function (v, i) {
      if (isBlank(v)) return; filled++;
      if (typeof v === "string") {
        if (v.length >= 18 && /\s/.test(v)) longs++;
        if (headerCells[i] != null && normHeader(v) && normHeader(v) === normHeader(headerCells[i])) echo = true;
      }
    });
    if (!filled) return false;
    var first = cells.filter(function (v) { return !isBlank(v); })[0];
    var starts = typeof first === "string" && /^(name of|mandatory|asset or actual|details of)/i.test(first.trim());
    return echo || starts || longs / filled >= 0.6;
  }
  var EXAMPLE = /^\s*(e\.?\s?g\.?|ex\.?|example)\s*[,.:\-]/i;

  /* ---------- main ---------- */
  function validate(wb, rules) {
    var issues = [], checks = {}, sheetsOut = {}, notes = [];
    function reg(id, label) { if (!checks[id]) checks[id] = { label: label, hits: 0 }; return id; }
    function add(o) { if (checks[o.check]) checks[o.check].hits++; issues.push(o); }
    var cStruct = reg("structure", "Template sheets and columns are present");
    var cExample = reg("example", "Template example rows have been removed");
    var cReq = reg("required", "Mandatory (*) fields are filled in");
    var cErr = reg("excelError", "No Excel error values in cells");
    var cNum = reg("number", "Numbers and counts are valid");
    var cDate = reg("date", "Dates and times are valid");
    var cEmail = reg("email", "Email addresses and phone numbers are valid");
    var cGeo = reg("geo", "Latitude and longitude are valid");
    var cList = reg("list", "Dropdown values match the allowed options");
    var cSpace = reg("spaces", "No extra, double or hidden spaces in values");
    var cUniq = reg("unique", "No duplicate records");
    var cNear = reg("near", "No near-duplicate names (same name written differently)");
    var cLoc = reg("location", "Every location exists in the Site → Building → Floors → Spaces hierarchy");
    var cRef = reg("reference", "Every cross-sheet reference points to an existing record");
    var cBiz = reg("business", "Template business rules (counts, dates, contacts, job plans)");
    var cQuality = reg("quality", "Consistent capitals and formatting within each column (code patterns, likely typos)");
    var cImport = reg("importRules", "Facilio import value rules (placeholders, text length, multi-value format, yes/no values)");

    var names = wb.SheetNames.slice(), byNorm = {};
    names.forEach(function (n) { byNorm[normHeader(n)] = n; });
    var claimed = {};
    rules.ignoreSheets.forEach(function (n) { if (byNorm[normHeader(n)]) claimed[byNorm[normHeader(n)]] = true; });

    /* lists from workbook sheets */
    var sheetLists = {};
    Object.keys(rules.sheetLists).forEach(function (k) {
      var L = rules.sheetLists[k], sn = null;
      L.sheet.forEach(function (a) { if (!sn && byNorm[normHeader(a)]) sn = byNorm[normHeader(a)]; });
      if (!sn) { sheetLists[k] = null; return; }
      claimed[sn] = true;
      var vals = [];
      readGrid(wb.Sheets[sn]).forEach(function (row, i) {
        var v = row.cells[0]; if (isBlank(v) || isErr(v)) return;
        if (i === 0 && /category|name|list/i.test(String(v))) return;
        vals.push(String(v).trim());
      });
      sheetLists[k] = { values: vals, source: "the '" + sn + "' sheet", sheet: sn };
    });

    /* locate each entity's sheet and header row */
    var grids = {}, ents = {}, bySheet = {};
    rules.entities.forEach(function (ent) {
      var sn = null;
      ent.sheet.forEach(function (a) { if (!sn && byNorm[normHeader(a)]) sn = byNorm[normHeader(a)]; });
      if (!sn) {
        if (ent.core) add({ sheet: ent.label, row: "", field: "", value: "", severity: "Critical", check: cStruct,
          issue: "The " + ent.sheet[0] + " sheet is missing, so " + ent.label.toLowerCase() + " couldn't be checked.",
          suggestion: "Keep the '" + ent.sheet[0] + "' sheet from the template, even if it has no rows." });
        return;
      }
      claimed[sn] = true;
      var grid = grids[sn] || (grids[sn] = readGrid(wb.Sheets[sn]));
      var idx = aliasIndex(ent), best = { s: 0, at: -1 };
      for (var i = 0; i < grid.length; i++) {
        var s = headerScore(grid[i].cells, idx);
        if (s > best.s) best = { s: s, at: i };
      }
      var need = Math.min(2, Object.keys(ent.columns).length);
      ents[ent.key] = { ent: ent, sheet: sn, grid: grid, idx: idx, at: best.s >= need ? best.at : -1 };
      (bySheet[sn] = bySheet[sn] || []).push(ent.key);
    });
    /* resolve clashes when two tables share a sheet: the table with the higher score keeps the row */
    Object.keys(bySheet).forEach(function (sn) {
      var keys = bySheet[sn];
      if (keys.length < 2) return;
      keys.forEach(function (k) {
        var E = ents[k]; if (E.at < 0) return;
        keys.forEach(function (o) {
          if (o === k || ents[o].at !== E.at) return;
          var sk = headerScore(E.grid[E.at].cells, E.idx), so = headerScore(E.grid[E.at].cells, ents[o].idx);
          if (so > sk) {
            var best = { s: 0, at: -1 };
            for (var i = 0; i < E.grid.length; i++) {
              if (i === E.at) continue;
              var s = headerScore(E.grid[i].cells, E.idx); if (s > best.s) best = { s: s, at: i };
            }
            E.at = best.s >= 2 ? best.at : -1;
          }
        });
      });
    });

    /* extract records */
    var data = {};
    rules.entities.forEach(function (ent) {
      var E = ents[ent.key]; if (!E) return;
      if (E.at < 0) {
        if (!ent.core) return;
        add({ sheet: E.sheet, row: "", field: "", value: "", severity: ent.core ? "Critical" : "Warning", check: cStruct,
          issue: "The " + ent.label + " column headings weren't found on this sheet.", suggestion: "Restore the heading row from the template." });
        return;
      }
      var grid = E.grid, hdr = grid[E.at], colMap = {}, unknown = [], customCols = [];
      hdr.cells.forEach(function (v, ci) {
        if (isBlank(v) || typeof v !== "string") return;
        var k = E.idx[normHeader(v)];
        if (k && !(k in colMap)) colMap[k] = { ci: ci, header: v.replace(/\*/g, "").replace(/\([^)]*\)?/g, "").replace(/\s+/g, " ").trim() };
        else if (!k) { unknown.push(v.trim()); customCols.push({ h: v.trim(), ci: ci }); }
      });
      Object.keys(ent.columns).forEach(function (k) {
        if (ent.columns[k].req && !(k in colMap)) add({ sheet: E.sheet, row: hdr.excelRow, field: ent.columns[k].h[0], value: "", severity: "Critical", check: cStruct,
          issue: "Mandatory column '" + ent.columns[k].h[0] + "' is missing.", suggestion: "Add the column back with the template heading." });
      });
      var others = (bySheet[E.sheet] || []).filter(function (o) { return o !== ent.key && ents[o].at > E.at; }).map(function (o) { return ents[o].at; });
      var end = others.length ? Math.min.apply(null, others) : grid.length;
      unknown.forEach(function (h) { add({ sheet: E.sheet, row: hdr.excelRow, field: h, value: "", severity: "Info", check: cStruct,
        issue: "Custom field: this column isn't in the template, so Facilio creates it as a new field when importing. Its values aren't checked.", suggestion: "Keep it if the client needs this information; otherwise remove the column." }); });
      var start = E.at + 1;
      if (start < end && looksLikeDescription(grid[start].cells, hdr.cells)) start++;
      var ignore = ent.activeIgnore || [], rows = [], need2 = Math.max(2, Math.ceil(Object.keys(colMap).length / 2));
      var isRepeatHeader = function (i) { return i < end && headerScore(grid[i].cells, E.idx) >= need2; };
      for (var i = start; i < end; i++) {
        var g = grid[i], rec = { _row: g.excelRow }, active = false;
        if (isRepeatHeader(i)) continue;
        var filledCount = g.cells.filter(function (v) { return !isBlank(v); }).length;
        if (filledCount <= 1 && (isRepeatHeader(i + 1) || (i + 1 === end && others.length))) continue;  /* section title above a header */
        Object.keys(colMap).forEach(function (k) { var v = g.cells[colMap[k].ci]; rec[k] = v; if (!isBlank(v) && ignore.indexOf(k) < 0) active = true; });
        customCols.forEach(function (x) { var v = g.cells[x.ci]; rec["~" + x.h] = v; if (!isBlank(v)) active = true; });
        if (!active) continue;
        var first = g.cells.filter(function (v) { return !isBlank(v); })[0];
        if (typeof first === "string" && EXAMPLE.test(first)) {
          add({ sheet: E.sheet, row: g.excelRow, field: "", value: first, severity: "Warning", check: cExample,
            issue: "This looks like the template's example row. It would be imported as real data.", suggestion: "Delete this row before sending." });
          continue;
        }
        rows.push(rec);
      }
      data[ent.key] = { key: ent.key, ent: ent, sheet: E.sheet, colMap: colMap, rows: rows, custom: customCols };
      var sk = E.sheet + (bySheet[E.sheet].length > 1 ? " › " + ent.label : "");
      sheetsOut[ent.key] = { sheet: E.sheet, label: ent.label, title: sk, rows: rows.map(function (r) { return r._row; }) };
      if (ent.minRows && rows.length < ent.minRows) add({ sheet: E.sheet, row: "", field: "", value: "", severity: "Critical", check: cReq,
        issue: "No " + ent.label.toLowerCase() + " entered. At least one is needed.", suggestion: "Fill in the " + E.sheet + " sheet." });
    });

    /* sheets nobody claimed (client-specific additions) */
    names.forEach(function (n) {
      if (claimed[n]) return;
      var g = readGrid(wb.Sheets[n]);
      if (!g.some(function (r) { return r.cells.some(function (v) { return !isBlank(v); }); })) return;
      notes.push("The '" + n + "' sheet has no rules yet, so it wasn't checked.");
      add({ sheet: n, row: "", field: "", value: "", severity: "Info", check: cStruct, issue: "This sheet isn't covered by the checker yet, so it wasn't checked.", suggestion: "Your Facilio contact will review it manually." });
    });

    function hdrOf(D, k) { return D.colMap[k] ? D.colMap[k].header : D.ent.columns[k].h[0]; }
    function A(D, r, k, sev, check, issue, sug, val) {
      add({ sheet: D.sheet, row: r ? r._row : "", field: k ? hdrOf(D, k) : "", value: val !== undefined ? val : (r && k ? display(r[k]) : ""), severity: sev, check: check, issue: issue, suggestion: sug || "" });
    }
    function listCheck(D, r, k, s, L, source, label) {
      if (L.indexOf(s) >= 0) return true;
      for (var i = 0; i < L.length; i++) if (L[i].toLowerCase() === s.toLowerCase() || squash(L[i]) === squash(s) && squash(s)) {
        A(D, r, k, "Critical", cList, "'" + s + "' doesn't match the option exactly. The import only accepts exact spelling and capitals, otherwise it stores the field blank.", "Use '" + L[i] + "' exactly.", s); return false;
      }
      var near = closest(s, L);
      A(D, r, k, "Critical", cList, "'" + s + "' isn't an allowed " + label + " (checked against " + source + ")." + (near ? " Closest option is '" + near + "' (" + explainDiff(s, near) + ")." : ""), near ? "Use '" + near + "' exactly." : "Pick a value from the dropdown.", s);
      return false;
    }

    /* ---------- field-level checks ---------- */
    Object.keys(data).forEach(function (key) {
      var D = data[key], ent = D.ent;
      D.rows.forEach(function (r) {
        Object.keys(D.colMap).forEach(function (k) {
          var c = ent.columns[k], v = r[k];
          if (isErr(v)) { A(D, r, k, "Critical", cErr, "The cell shows an Excel error instead of a value.", "Replace the formula or error with the actual value."); return; }
          if (isBlank(v)) { if (c.req) A(D, r, k, "Critical", cReq, "This mandatory field is empty.", "Enter the " + hdrOf(D, k) + "."); return; }
          if (typeof v === "string" && v !== v.trim()) A(D, r, k, c.long ? "Warning" : "Critical", cSpace, "Extra space at the start or end of the value. The Facilio data loader checks spacing exactly.", "Remove the extra space: '" + v.trim() + "'.");
          if (typeof v === "string" && /  |\t|\n|\r|\u00a0/.test(v)) A(D, r, k, c.long ? "Warning" : "Critical", cSpace, "Contains a double space, tab, line break or hidden (non-breaking) space. The Facilio data loader checks spacing exactly.", "Use single normal spaces: '" + v.replace(/[\s\u00a0]+/g, " ").trim() + "'. Fix it the same way everywhere this value is used.");
          var s = text(v);
          /* Facilio import value rules: the import accepts wrong shapes and silently stores them blank or wrong */
          var numericCol = c.type === "number" || c.type === "integer";
          if (/^(n\/?a|n\.a\.?|na|nil|none|null|tbd|tba|not applicable|-+|\?+)$/i.test(s) || (/^-(1|99|999)$/.test(s) && !numericCol) || (s === "-99" && numericCol))
            { A(D, r, k, c.req ? "Critical" : "Warning", cImport, "'" + s + "' is a placeholder. The import stores it as if it were real data.", c.req ? "Enter the actual value." : "Leave the cell empty if the value isn't known."); return; }
          if (!c.type && !c.list && !c.sheetList && !c.perm) {
            var cap = c.long ? 2000 : 255;
            if (s.length > cap) A(D, r, k, "Critical", cImport, "This is " + s.length + " characters; the limit for this field is " + cap + ".", "Shorten it to " + cap + " characters or fewer.", s.slice(0, 60) + "…");
          }
          if (c.multi && /[;\n|]/.test(s)) A(D, r, k, "Warning", cImport, "Multiple values must be separated by commas only.", "Use commas, for example: " + splitMulti(s.replace(/[|]/g, ",")).join(", ") + ".");
          if (c.type === "bool" && !/^(yes|no|true|false)$/i.test(s)) A(D, r, k, "Critical", cImport, "This should be Yes or No.", "Enter Yes or No.");
          if (c.type === "number" || c.type === "integer") {
            var n = parseNumber(v);
            if (n == null) A(D, r, k, "Critical", cNum, "This should be a number.", "Enter digits only, without units or text.");
            else if (c.type === "integer" && n !== Math.floor(n)) A(D, r, k, "Critical", cNum, "This should be a whole number.", "Enter a whole number.");
            else if (c.min != null && n < c.min) A(D, r, k, "Critical", cNum, "This must be " + c.min + " or more.", "Check the value.");
            else if (c.max != null && n > c.max) A(D, r, k, "Critical", cNum, "This must be " + c.max + " or less.", "Check the value.");
            else { r["_" + k] = n; if (typeof v === "string") A(D, r, k, "Info", cNum, "The number is stored as text.", "Format the cell as a number."); }
          }
          if (c.type === "date") {
            var p = isTime(v) ? null : parseDate(v);
            if (!p) A(D, r, k, "Critical", cDate, "This isn't a valid date.", "Enter a real date as dd/mm/yyyy, for example 15/03/2026.");
            else {
              r["_" + k] = p.date;
              var y = p.date.getUTCFullYear();
              if (y < 1950 || y > 2100) A(D, r, k, "Warning", cDate, "The year " + y + " looks wrong.", "Check the year.");
              if (p.ambiguous) A(D, r, k, "Warning", cDate, "This date could be read as day/month or month/day.", "Read as " + display(p.date) + " (day first). If that's wrong, use an Excel date cell.");
              else if (p.kind === "serial") A(D, r, k, "Info", cDate, "The date is stored as a plain number.", "Format the cell as a date; it reads as " + display(p.date) + ".");
              else if (p.kind === "text") A(D, r, k, "Warning", cDate, "The date is typed as text, not a date cell. The import needs real date cells.", "Re-enter it as a date (format the cell as Date); it reads as " + display(p.date) + ".");
            }
          }
          if (c.type === "time") {
            var t = parseTimes(v);
            if (!t) A(D, r, k, "Critical", cDate, "This isn't a valid time.", "Enter a time such as 19:00, or several separated by commas (07:00, 19:00).");
          }
          if (c.type === "email") {
            if (!EMAIL.test(s)) A(D, r, k, "Critical", cEmail, "This isn't a valid email address.", "Enter one email, like name@company.com.");
          }
          if (c.type === "phone") {
            var digits = s.replace(/\D/g, "");
            if (/[A-Za-z]/.test(s.replace(/ext\.?/i, "")) || digits.length < 7 || digits.length > 15) A(D, r, k, "Warning", cEmail, "This doesn't look like a phone number.", "Use digits with an optional + country code, for example +971 4 123 4567.");
          }
          if (c.type === "lat" || c.type === "lng") {
            var raw = s.replace(/[°\s]/g, ""), num = parseNumber(raw), lim = c.type === "lat" ? 90 : 180;
            if (num == null) A(D, r, k, "Critical", cGeo, "This should be a decimal coordinate.", "Enter a number such as 24.49003.");
            else if (Math.abs(num) > lim) A(D, r, k, "Critical", cGeo, (c.type === "lat" ? "Latitude" : "Longitude") + " must be between -" + lim + " and " + lim + ".", "Check you haven't swapped latitude and longitude.");
            else if (raw !== s.trim()) A(D, r, k, "Warning", cGeo, "The coordinate contains a degree sign or spaces.", "Enter just the number: " + num + ".");
          }
          if (c.list) {
            if (c.multi) splitMulti(s).forEach(function (part) { listCheck(D, r, k, part, rules.lists[c.list], "the template dropdown", hdrOf(D, k)); });
            else listCheck(D, r, k, s, rules.lists[c.list], "the template dropdown", hdrOf(D, k));
          }
          if (c.sheetList) {
            var SL = sheetLists[c.sheetList];
            if (SL && SL.values.length) listCheck(D, r, k, s, SL.values, SL.source, hdrOf(D, k));
          }
          if (c.perm) {
            var allowed = rules.permissions[c.perm];
            splitMulti(s).forEach(function (tok) {
              if (!allowed.some(function (a) { return a.toLowerCase() === tok.toLowerCase(); })) {
                var near = closest(tok, allowed);
                A(D, r, k, "Warning", cList, "'" + tok + "' isn't one of the permission options for this module.", (near ? "Did you mean '" + near + "'? " : "") + "Options: " + allowed.join(", ") + ".", tok);
              }
            });
          }
        });
      });
      /* duplicates */
      (ent.unique || []).forEach(function (u) {
        if (!u.cols.every(function (c) { return c in D.colMap; })) return;
        var seen = {};
        D.rows.forEach(function (r) {
          var parts = u.cols.map(function (c) { return normVal(text(r[c])); });
          if (!parts[parts.length - 1] || parts.some(function (p) { return !p; }) && u.cols.length > 1 && !parts[0]) return;
          if (parts.some(function (p) { return !p; })) return;
          var key = parts.join("|");
          if (seen[key]) A(D, r, u.cols[u.cols.length - 1], u.sev, cUniq, (u.msg ? u.msg + ". " : "Duplicate record. ") + "Same as row " + seen[key] + ".", "Remove the duplicate, or change one of them so each is distinct.");
          else seen[key] = r._row;
        });
      });
      (ent.near || []).forEach(function (nr) {
        if (!(nr.col in D.colMap)) return;
        var seen = {};
        D.rows.forEach(function (r) {
          var v = text(r[nr.col]); if (!v) return;
          var key = nr.scope.map(function (c) { return normVal(text(r[c])); }).concat(squash(v)).join("|");
          var prev = seen[key];
          if (prev && normVal(prev.v) !== normVal(v)) A(D, r, nr.col, "Warning", cNear, "Looks like '" + prev.v + "' (row " + prev.row + ") written differently.", "Use one spelling. If they're different, make the names clearly distinct.", v);
          else if (!prev) seen[key] = { v: v, row: r._row };
        });
      });
    });

    /* ---------- column quality (from the onboarding skill's quality scan) ---------- */
    function shape(s) { return s.replace(/[0-9]/g, "9").replace(/[A-Za-z]/g, "A"); }
    function sequential(a, b) {
      var f = function (x) { return x.toLowerCase().replace(/[\d.\-_\/ ]+/g, ""); };
      if (f(a) === f(b)) return true;
      /* lettered/numbered series: same words, last token is a short label (Building A / Building B, Block 1A / Block 1B) */
      var ta = a.trim().split(/[\s\-_]+/), tb = b.trim().split(/[\s\-_]+/);
      return ta.length === tb.length && ta.length > 1 && ta.slice(0, -1).join(" ").toLowerCase() === tb.slice(0, -1).join(" ").toLowerCase() && ta[ta.length - 1].length <= 3 && tb[tb.length - 1].length <= 3;
    }
    function similarity(a, b) { var m = Math.max(a.length, b.length); return m ? 1 - lev(a, b) / m : 1; }
    Object.keys(data).forEach(function (key) {
      var D = data[key], ent = D.ent;
      Object.keys(D.colMap).forEach(function (k) {
        var c = ent.columns[k];
        if (c.type || c.list || c.sheetList || c.perm || c.long || c.multi) return;
        var isLink = c.ref || (ent.location && Object.keys(ent.location).some(function (l) { return ent.location[l] === k; })) || (key === "pm" && (k === "asset" || k === "vendorContact"));
        var occ = {}, order = [];
        D.rows.forEach(function (r) {
          var v = text(r[k]); if (!v) return;
          v = v.replace(/[\s\u00a0]+/g, " ");
          if (!occ[v]) { occ[v] = { n: 0, row: r, rows: [] }; order.push(v); }
          occ[v].n++; occ[v].rows.push(r);
        });
        if (order.length < 2) return;
        /* casing: the same value typed in different capitals */
        var byFold = {};
        order.forEach(function (v) { (byFold[v.toLowerCase()] = byFold[v.toLowerCase()] || []).push(v); });
        if (!isLink) Object.keys(byFold).forEach(function (f) {
          var g = byFold[f]; if (g.length < 2) return;
          g.sort(function (a, b) { return occ[b].n - occ[a].n; });
          g.slice(1).forEach(function (v) { occ[v].rows.forEach(function (row) { A(D, row, k, "Critical", cQuality, "Capitals differ from '" + g[0] + "' used elsewhere in this column. The Facilio data loader treats these as different values.", "Use '" + g[0] + "' with the same capitals everywhere.", rawOf(row[k])); }); });
        });
        /* pattern outliers: a value whose shape differs from the column's dominant shape */
        var total = 0, shapes = {};
        order.forEach(function (v) { var s = shape(v); shapes[s] = (shapes[s] || 0) + occ[v].n; total += occ[v].n; });
        var top = Object.keys(shapes).sort(function (a, b) { return shapes[b] - shapes[a]; })[0];
        if (total >= 5 && Object.keys(shapes).length > 1 && shapes[top] / total >= 0.7 && top.length <= 40 && /[9]/.test(top)) {
          var example = order.filter(function (v) { return shape(v) === top; })[0];
          order.forEach(function (v) {
            var s = shape(v);
            if (s !== top && shapes[s] <= Math.max(3, Math.floor(total * 0.02))) A(D, occ[v].row, k, "Warning", cQuality, "Format differs from most values in this column (for example '" + example + "').", "Check for a stray space or character.", v);
          });
        }
        /* likely typos: very similar values that aren't a numbering series */
        var cand = order.filter(function (v) { return v.length >= 4; });
        if (cand.length > 1 && cand.length <= 1500) {
          var buckets = {};
          cand.forEach(function (v) { (buckets[v.slice(0, 3).toLowerCase()] = buckets[v.slice(0, 3).toLowerCase()] || []).push(v); });
          Object.keys(buckets).forEach(function (bk) {
            var m = buckets[bk];
            for (var i = 0; i < m.length; i++) for (var j = i + 1; j < m.length; j++) {
              var a = m[i], b = m[j];
              if (a.toLowerCase() === b.toLowerCase() || sequential(a, b) || squash(a) === squash(b)) continue;
              if (similarity(a.toLowerCase(), b.toLowerCase()) >= 0.88) {
                var rare = occ[a].n <= occ[b].n ? a : b, common = rare === a ? b : a;
                A(D, occ[rare].row, k, "Warning", cQuality, "Very similar to '" + common + "' in this column. Possible typo.", "If they're the same, use '" + common + "' everywhere.", rare);
              }
            }
          });
        }
      });
    });

    /* ---------- reference indexes ---------- */
    function index(entKey, col) {
      var D = data[entKey]; if (!D || !(col in D.colMap)) return null;
      var m = {};
      D.rows.forEach(function (r) { var v = text(r[col]); if (v && !m[normVal(v)]) m[normVal(v)] = { v: v, raw: rawOf(r[col]), r: r }; });
      return m;
    }
    function rawOf(v) { return isBlank(v) || isErr(v) ? "" : display(v); }
    function mismatch(entered, expected) {
      if (entered === expected) return null;
      var ne = entered.replace(/[\s\u00a0]+/g, " ").trim(), nx = expected.replace(/[\s\u00a0]+/g, " ").trim();
      if (ne === nx) return "spacing";
      if (ne.toLowerCase() === nx.toLowerCase()) return entered.toLowerCase() === expected.toLowerCase() ? "capitals" : "capitals and spacing";
      return "spelling";
    }
    function exactRef(D, r, k, entered, expected, where, how) {
      var d = mismatch(entered, expected);
      if (d === "spacing" && (entered !== entered.trim() || /  |\t|\n|\r|\u00a0/.test(entered))) return;  /* already flagged as a spacing problem on this cell */
      if (d) A(D, r, k, "Critical", how, "Doesn't match '" + expected + "' in " + where + " exactly (" + (d === "capitals" ? explainDiff(entered, expected) : d + " differ") + "). The Facilio data loader matches names exactly, so this link would fail.", "Use '" + expected + "' exactly, with the same capitals and spacing.", entered);
    }
    function vals(m) { return Object.keys(m).map(function (k) { return m[k].v; }); }
    function refMatch(D, r, k, value, m, targetLabel, how) {
      var hit = m[normVal(value)];
      if (hit) {
        exactRef(D, r, k, value, hit.raw, targetLabel, how);
        return hit;
      }
      var near = closest(value, vals(m));
      A(D, r, k, "Critical", how, "'" + value + "' isn't in " + targetLabel + "." + (near ? " Closest match is '" + near + "' (" + explainDiff(value, near) + ")." : ""), near ? "Use '" + near + "' exactly, or add it to " + targetLabel + " if it's a different one." : "Add it to " + targetLabel + ", or correct the name.", value);
      return null;
    }

    /* location hierarchy */
    var L = { site: {}, building: {}, floor: {}, space: {}, has: {} };
    function lk() { return Array.prototype.map.call(arguments, normVal).join("|"); }
    if (data.site) { L.has.site = true; data.site.rows.forEach(function (r) { var s = text(r.name); if (s && !L.site[lk(s)]) L.site[lk(s)] = rawOf(r.name); }); }
    if (data.building) { L.has.building = true; data.building.rows.forEach(function (r) { var s = text(r.site), b = text(r.name); if (s && b && !L.building[lk(s, b)]) L.building[lk(s, b)] = rawOf(r.name); }); }
    if (data.floor) { L.has.floor = true; data.floor.rows.forEach(function (r) { var s = text(r.site), b = text(r.building), f = text(r.name); if (s && b && f && !L.floor[lk(s, b, f)]) L.floor[lk(s, b, f)] = rawOf(r.name); }); }
    if (data.space) { L.has.space = true; data.space.rows.forEach(function (r) { var s = text(r.site), b = text(r.building), f = text(r.floor), p = text(r.name); if (s && b && f && p && !L.space[lk(s, b, f, p)]) L.space[lk(s, b, f, p)] = rawOf(r.name); }); }
    function under(map, prefix) { var out = []; Object.keys(map).forEach(function (k) { if (k.indexOf(prefix + "|") === 0 && k.split("|").length === prefix.split("|").length + 1) out.push(map[k]); }); return out; }
    function locCheck(D, r) {
      var map = D.ent.location, s = map.site && text(r[map.site]), b = map.building && text(r[map.building]), f = map.floor && text(r[map.floor]), p = map.space && text(r[map.space]);
      if (p && (!f || !b)) { A(D, r, map.space, "Critical", cLoc, "A space is given without its " + (!b ? "building" : "floor") + ".", "Fill in Site, Building and Floor for this space."); return; }
      if (f && !b) { A(D, r, map.floor, "Critical", cLoc, "A floor is given without its building.", "Fill in the building."); return; }
      if (!s || !L.has.site) return;
      function miss(k, v, where, list, sheet) {
        var near = closest(v, list);
        A(D, r, k, "Critical", cLoc, "'" + v + "' isn't listed " + where + " in the " + sheet + " sheet." + (near ? " Closest match is '" + near + "' (" + explainDiff(v, near) + ")." : ""), near ? "Use '" + near + "' exactly, or add '" + v.trim() + "' to the " + sheet + " sheet if it's a different one." : "Add it to the " + sheet + " sheet, or correct the location.", v);
      }
      if (!L.site[lk(s)]) { miss(map.site, s, "as a site", vals(Object.keys(L.site).reduce(function (o, k) { o[k] = { v: L.site[k] }; return o; }, {})), "Site"); return; }
      if (D.key !== "site") exactRef(D, r, map.site, rawOf(r[map.site]), L.site[lk(s)], "the Site sheet", cLoc);
      if (!b || !L.has.building) return;
      if (!L.building[lk(s, b)]) { miss(map.building, b, "under site '" + s + "'", under(L.building, lk(s)), "Building"); return; }
      if (D.key !== "building") exactRef(D, r, map.building, rawOf(r[map.building]), L.building[lk(s, b)], "the Building sheet", cLoc);
      if (!f || !L.has.floor) return;
      if (!L.floor[lk(s, b, f)]) { miss(map.floor, f, "under " + s + " › " + b, under(L.floor, lk(s, b)), "Floors"); return; }
      if (D.key !== "floor") exactRef(D, r, map.floor, rawOf(r[map.floor]), L.floor[lk(s, b, f)], "the Floors sheet", cLoc);
      if (!p || !L.has.space) return;
      if (!L.space[lk(s, b, f, p)]) { miss(map.space, p, "under " + s + " › " + b + " › " + f, under(L.space, lk(s, b, f)), "Spaces"); return; }
      if (D.key !== "space") exactRef(D, r, map.space, rawOf(r[map.space]), L.space[lk(s, b, f, p)], "the Spaces sheet", cLoc);
    }
    Object.keys(data).forEach(function (key) { var D = data[key]; if (D.ent.location) D.rows.forEach(function (r) { locCheck(D, r); }); });

    /* simple references */
    Object.keys(data).forEach(function (key) {
      var D = data[key];
      Object.keys(D.colMap).forEach(function (k) {
        var c = D.ent.columns[k]; if (!c.ref) return;
        var t = c.ref.split("."), m = index(t[0], t[1]);
        if (!m) { notes.push(hdrOf(D, k) + " on " + D.sheet + " wasn't cross-checked because the " + (ents[t[0]] ? ents[t[0]].sheet : t[0]) + " sheet is missing."); return; }
        var target = "the " + data[t[0]].sheet + " sheet" + (t[0] === "task" ? " (task list)" : "");
        D.rows.forEach(function (r) { var v = text(r[k]); if (v) refMatch(D, r, k, rawOf(r[k]), m, target, cRef); });
      });
    });

    /* ---------- business rules ---------- */
    if (data.site && data.building) {
      var bc = {}; data.building.rows.forEach(function (r) { var s = normVal(text(r.site)); if (s) bc[s] = (bc[s] || 0) + 1; });
      data.site.rows.forEach(function (r) {
        var n = r._buildings; if (n == null) return; var got = bc[normVal(text(r.name))] || 0;
        if (got !== n) A(data.site, r, "buildings", "Warning", cBiz, "Says " + n + " building" + (n === 1 ? "" : "s") + ", but the Building sheet lists " + got + " for this site.", "Update the count, or add the missing buildings.");
      });
    }
    if (data.building && data.floor) {
      var fc = {}; data.floor.rows.forEach(function (r) { var k = lk(text(r.site), text(r.building)); fc[k] = (fc[k] || 0) + 1; });
      data.building.rows.forEach(function (r) {
        var n = r._floors; if (n == null) return; var got = fc[lk(text(r.site), text(r.name))] || 0;
        if (got !== n) A(data.building, r, "floors", "Warning", cBiz, "Says " + n + " floor" + (n === 1 ? "" : "s") + ", but the Floors sheet lists " + got + " for this building.", "Update the count, or add the missing floors.");
      });
    }
    if (data.asset) data.asset.rows.forEach(function (r) {
      if (r._installDate && r._retireDate && r._retireDate <= r._installDate) A(data.asset, r, "retireDate", "Critical", cBiz, "Retire date is on or before the installation date (" + display(r._installDate) + ").", "Check both dates.");
      if (r._installDate && r._installDate > new Date()) A(data.asset, r, "installDate", "Warning", cBiz, "Installation date is in the future.", "Check the year.");
    });
    if (data.user) {
      var siteIdx = index("site", "name"), roleIdx = index("role", "name");
      data.user.rows.forEach(function (r) {
        var sv = text(r.sites);
        if (sv && siteIdx) rawOf(r.sites).split(",").forEach(function (s) { s = s.replace(/^ /, ""); if (s.trim()) refMatch(data.user, r, "sites", s, siteIdx, "the Site sheet", cRef); });
        var role = text(r.role);
        if (role && roleIdx && Object.keys(roleIdx).length && !roleIdx[normVal(role)]) A(data.user, r, "role", "Info", cRef, "Role '" + role + "' isn't defined in the roles table below the users.", "Fine if it's a standard Facilio role; otherwise add it to the roles table.");
      });
    }
    function primaryRule(D, groupCol, label) {
      if (!D || !(groupCol in D.colMap) || !("primary" in D.colMap)) return;
      var seen = {};
      D.rows.forEach(function (r) {
        if (normVal(text(r.primary)) !== "yes") return;
        var g = normVal(text(r[groupCol])); if (!g) return;
        if (seen[g]) A(D, r, "primary", "Critical", cBiz, "A second primary contact for " + label + " '" + text(r[groupCol]) + "' (first is row " + seen[g] + ").", "Only one contact per " + label + " can be primary. Set the others to No.");
        else seen[g] = r._row;
      });
    }
    primaryRule(data.vendorContact, "vendor", "vendor");
    primaryRule(data.tenantContact, "tenant", "tenant");
    if (data.task) {
      data.task.rows.forEach(function (r) {
        var t = normVal(text(r.inputType)), inp = text(r.input);
        if ((t === "radio" || t === "reading") && !inp) A(data.task, r, "input", "Critical", cBiz, "Input type " + text(r.inputType) + " needs its options or reading name in Input.", t === "radio" ? "List the options, for example Yes/No/Not Applicable." : "Enter the reading name, for example Current.");
        if ((t === "text" || t === "number") && inp) A(data.task, r, "input", "Warning", cBiz, "Input should be empty when the input type is " + text(r.inputType) + ".", "Clear the Input cell, or change the input type to Radio if these are options.", inp);
      });
      if (data.jobPlan && data.jobPlan.rows.length) {
        var defined = index("jobPlan", "name") || {}, reported = {}, used = {};
        data.task.rows.forEach(function (r) {
          var p = text(r.plan); if (!p) return; used[normVal(p)] = true;
          if (!defined[normVal(p)] && !reported[normVal(p)]) { reported[normVal(p)] = true;
            A(data.task, r, "plan", "Warning", cBiz, "Job plan '" + p + "' has tasks but isn't listed in the Name / Category table at the top of the sheet.", "Add it to that table with its category.", p); }
        });
        data.jobPlan.rows.forEach(function (r) {
          var p = text(r.name); if (p && !used[normVal(p)]) A(data.jobPlan, r, "name", "Warning", cBiz, "Job plan '" + p + "' has no tasks in the task list.", "Add its checklist tasks below, or remove it.", p);
        });
      }
    }
    if (data.pm) {
      var P = data.pm, codeIdx = index("asset", "code"), nameIdx = index("asset", "name");
      var vcRows = data.vendorContact ? data.vendorContact.rows : null;
      var FW = [["DAILY", /\bdaily\b/i], ["WEEKLY", /\bweekly\b/i], ["MONTHLY", /\bmonthly\b/i], ["QUARTERLY", /\bquar?te?r?ly\b|\bquaterly\b|\bquartely\b/i], ["HALF_YEARLY", /half[\s_-]?year|semi[\s-]?annual/i], ["ANNUALLY", /\bannual(ly)?\b|\byearly\b/i]];
      var yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      P.rows.forEach(function (r) {
        var a = text(r.asset);
        if (a && codeIdx) {
          var hit = codeIdx[normVal(a)];
          if (hit) exactRef(P, r, "asset", rawOf(r.asset), hit.raw, "the Asset sheet's Asset Code column", cRef);
          else if (nameIdx && nameIdx[normVal(a)]) { var ar = nameIdx[normVal(a)].r, code = text(ar.code);
            A(P, r, "asset", "Critical", cRef, "This is an asset name; Asset Details needs the Asset Code.", code ? "Use the code '" + code + "' (Asset row " + ar._row + ")." : "Give the asset a code on the Asset sheet (row " + ar._row + "), then use it here.", a); }
          else { var near = closest(a, vals(codeIdx));
            A(P, r, "asset", "Critical", cRef, "Asset code '" + a + "' isn't on the Asset sheet." + (near ? " Closest match is '" + near + "' (" + explainDiff(a, near) + ")." : ""), near ? "Use '" + near + "' exactly." : "Pick the code from the Asset sheet's Asset Code column.", a); }
        }
        var jp = text(r.jobPlan), fq = text(r.frequency).toUpperCase();
        if (jp && fq) FW.forEach(function (w) {
          if (w[1].test(jp) && w[0] !== fq && !(w[0] === "ANNUALLY" && /half/i.test(jp))) A(P, r, "jobPlan", "Warning", cBiz, "Job plan '" + jp + "' looks like a " + w[0].toLowerCase().replace("_", "-") + " plan, but this PM's frequency is " + fq + ".", "Check the job plan or the frequency.", jp);
        });
        var vc = text(r.vendorContact), vn = text(r.vendor);
        if (vc && vcRows) {
          var match = vcRows.filter(function (x) { return normVal(text(x.name)) === normVal(vc); });
          if (match.length) exactRef(P, r, "vendorContact", rawOf(r.vendorContact), rawOf(match[0].name), "the Vendor Contact sheet", cRef);
          if (!match.length) A(P, r, "vendorContact", "Critical", cRef, "'" + vc + "' isn't in the Vendor Contact sheet.", "Add the contact, or pick one from the Vendor Contact sheet.", vc);
          else if (vn && !match.some(function (x) { return normVal(text(x.vendor)) === normVal(vn); })) A(P, r, "vendorContact", "Critical", cRef, "'" + vc + "' is a contact for '" + text(match[0].vendor) + "', not '" + vn + "'.", "Pick a contact that belongs to " + vn + ".", vc);
        }
        if (vc && !vn) A(P, r, "vendor", "Warning", cBiz, "A vendor contact is given but the vendor is empty.", "Fill in the vendor.");
        if (r._startDate && r._startDate < yearAgo) A(P, r, "startDate", "Info", cBiz, "The start date is more than a year ago.", "Confirm this is intended; past cycles may be scheduled.");
      });
    }

    var rank = { Critical: 0, Warning: 1, Info: 2 }, order = {};
    names.forEach(function (n, i) { order[n] = i; });
    issues.sort(function (a, b) { return ((order[a.sheet] != null ? order[a.sheet] : 99) - (order[b.sheet] != null ? order[b.sheet] : 99)) || ((+a.row || 0) - (+b.row || 0)) || (rank[a.severity] - rank[b.severity]); });
    var assetCat = sheetLists.assetCategory || { values: [], source: "" };
    return { issues: issues, checks: checks, sheets: sheetsOut, lists: { assetCategory: assetCat }, notes: notes, data: data };
  }

  root.OnboardingValidator = { validate: validate, display: display };
})(typeof window !== "undefined" ? window : globalThis);
