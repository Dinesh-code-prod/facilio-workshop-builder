/* =====================================================================
   Facilio import-file checks: Job Plan import (pmTasksImport),
   PPM V3, and PPM V3 Trigger Schedule. Rules come from the reference
   files: Binghatti job plan import, Masaken trigger schedule, Berkeley
   trigger sheet (old format) and the PPM V3 sample.
   ===================================================================== */
(function (root) {
  "use strict";
  var IMPORT_RULES = {
    taskScope: "Selected Resources",                 /* required in Task Scope and Section scope */
    jobPlanScopeCategories: ["Asset Category", "Space Category", "Spaces", "Assets", "Buildings", "Floors"],
    inputTypes: ["Radio", "Reading", "Text", "Number"],
    triggers: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUALLY"],
    labelFor: { DAILY: "D", WEEKLY: "W", MONTHLY: "M", QUARTERLY: "Q", HALF_YEARLY: "HY", ANNUALLY: "Y" },
    nameWord: { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", QUARTERLY: "Quarterly", HALF_YEARLY: "Half Yearly", ANNUALLY: "Annually" },
    weekdays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
    months: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
    pmScopeCategories: ["Asset", "Space", "Asset Category", "Space Category", "Building", "Floor", "Site"],
    knownMaintenanceTypes: ["Preventive"],
    knownPlannerTypes: ["Custom"]
  };
  var HEAD = {
    jobplan: ["Name", "Scope category", "Asset Catgeory", "Section/Skill Set", "Section sequence", "Task Sequence", "Task Scope", "Section scope", "Task", "Input Type", "Options"],
    ppm: ["PM Name", "Published", "Subject", "Site", "Building", "Floor", "Space", "Asset", "Job Plan", "Trigger Schedule", "Assigned To", "Created By", "Custom Frequency", "Description", "Maintenance Type", "Planner Type", "Priority", "Scope Category", "Workorder Category", "Workorder Category Mapping"],
    trigger: ["Name", "Workorder frequency Label", "Trigger", "Week Frequency", "Times", "Runs Every", "Values", "Skip Every", "Yearly Day Value", "Month Value", "Yearly Day Of Week Values", "Start Date"]
  };
  var TYPE_LABEL = { jobplan: "Job Plan import", ppm: "PPM V3 import", trigger: "Trigger Schedule import" };
  function nh(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function str(v) { return v == null ? "" : String(v); }
  function title(m) { return m.charAt(0) + m.slice(1).toLowerCase(); }

  /* which import is this? decided by its headings */
  function detect(header) {
    var h = header.map(nh), best = null, bestScore = 0;
    Object.keys(HEAD).forEach(function (t) {
      var score = HEAD[t].filter(function (x) { return h.indexOf(nh(x)) >= 0; }).length / HEAD[t].length;
      if (score > bestScore) { bestScore = score; best = t; }
    });
    return bestScore >= 0.6 ? best : null;
  }
  function colIndex(header, name) { var n = nh(name), alt = { "asset catgeory": ["asset category"], "section skill set": ["section", "skill set"] }[n] || []; var h = header.map(nh); var i = h.indexOf(n); if (i < 0) alt.some(function (a) { i = h.indexOf(a); return i >= 0; }); return i; }

  /* first month of the cycle a month belongs to: June -> MARCH for quarterly (Mar/Jun/Sep/Dec), June -> JUNE for half-yearly (Jun/Dec) */
  function cycleStart(monthIdx, span) { return IMPORT_RULES.months[monthIdx % span]; }
  function cycleList(startIdx, span) { var out = []; for (var m = startIdx; m < 12; m += span) out.push(title(IMPORT_RULES.months[m])); return out.join(" / "); }
  function parseTimeList(s) { var p = str(s).split(",").map(function (x) { return x.trim(); }).filter(Boolean); if (!p.length) return null; for (var i = 0; i < p.length; i++) { var m = p[i].match(/^(\d{1,2}):(\d{2})$/); if (!m || +m[1] > 23 || +m[2] > 59) return null; } return p; }
  function dayInMonth(d, monthName) { var max = { FEBRUARY: 29, APRIL: 30, JUNE: 30, SEPTEMBER: 30, NOVEMBER: 30 }[monthName] || 31; return d >= 1 && d <= max; }
  function intVal(s) { s = str(s).trim(); return /^\d+$/.test(s) ? +s : null; }
  function parseDMY(s) {
    s = str(s).trim(); var m;
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { var d = +m[1], mo = +m[2], y = +m[3], dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return { d: d, m: mo, y: y, ambiguous: d <= 12 && mo <= 12 && d !== mo }; }
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return { d: +m[3], m: +m[2], y: +m[1] };
    return null;
  }
  /* canonical schedule name, as in the Masaken file */
  function triggerName(t, values, monthValue, yearlyDay, times) {
    var time = (times || "").split(",")[0].trim(), w = IMPORT_RULES.nameWord[t];
    if (t === "DAILY") return w + "-" + time;
    if (t === "WEEKLY") return w + "-" + values + "-" + time;
    if (t === "MONTHLY") return w + "-" + values + "-" + time;
    if (t === "QUARTERLY") return w + "-" + values + "-(" + cycleList(IMPORT_RULES.months.indexOf(monthValue), 3) + ")-" + time;
    if (t === "HALF_YEARLY") return w + "-" + values + "-(" + cycleList(IMPORT_RULES.months.indexOf(monthValue), 6) + ")-" + time;
    if (t === "ANNUALLY") return w + "-" + yearlyDay + "-(" + values + ")-" + time;
    return "";
  }

  /* ---------------- per-file checks ---------------- */
  function checkFile(file, ctx) {
    var out = [], H = file.header, rows = file.rows, t = file.type;
    function add(r, col, sev, issue, fix, value, autofix) { out.push({ file: file.name, type: t, row: r == null ? "" : file.rowNums[r], col: col, severity: sev, issue: issue, suggestion: fix || "", value: value == null ? "" : str(value), autofix: autofix }); }
    var C = {}; HEAD[t].forEach(function (h) { C[h] = colIndex(H, h); });
    HEAD[t].forEach(function (h) { if (C[h] < 0) add(null, h, ["Name", "PM Name", "Trigger", "Task", "Trigger Schedule", "Job Plan", "Values", "Times"].indexOf(h) >= 0 ? "Critical" : "Warning", "Column '" + h + "' is missing.", "Add the column with this exact heading, as in the Facilio import template."); });
    function v(r, h) { return C[h] >= 0 ? str(rows[r][C[h]]) : ""; }
    function exactList(r, h, list, sev, label) {
      var s = v(r, h); if (!s) return;
      if (list.indexOf(s) >= 0) return;
      var ci = list.filter(function (x) { return x.toLowerCase() === s.trim().toLowerCase(); })[0];
      if (ci) add(r, h, "Critical", "'" + s + "' must be written exactly as '" + ci + "'.", "Use '" + ci + "'.", s, ci);
      else add(r, h, sev || "Critical", "'" + s + "' isn't a valid " + (label || h) + ".", "Use one of: " + list.join(", ") + ".", s);
    }
    function spaces(r, h) { var s = v(r, h); if (s && (s !== s.trim() || /\s{2,}|\u00a0/.test(s))) add(r, h, "Critical", "Extra, double or hidden spaces in the value.", "Use '" + s.replace(/[\s\u00a0]+/g, " ").trim() + "'.", s, s.replace(/[\s\u00a0]+/g, " ").trim()); }
    function req(r, h, sev) { if (!v(r, h).trim()) { add(r, h, sev || "Critical", h + " is empty.", "Fill in " + h + "."); return false; } return true; }

    if (t === "jobplan") {
      var seenPlan = {}, seqExpect = {}, taskSeen = {}, lastPlan = null;
      rows.forEach(function (row, r) {
        ["Name", "Scope category", "Section/Skill Set", "Task", "Input Type"].forEach(function (h) { req(r, h); });
        ["Name", "Section/Skill Set", "Task", "Options", "Asset Catgeory"].forEach(function (h) { spaces(r, h); });
        exactList(r, "Scope category", IMPORT_RULES.jobPlanScopeCategories, "Critical", "scope category");
        ["Task Scope", "Section scope"].forEach(function (h) {
          var s = v(r, h).trim();
          if (!s) add(r, h, "Critical", h + " is empty.", "Use '" + IMPORT_RULES.taskScope + "'.", "", IMPORT_RULES.taskScope);
          else if (s !== IMPORT_RULES.taskScope) add(r, h, "Critical", "'" + s + "' isn't used for job plan imports any more.", "Use '" + IMPORT_RULES.taskScope + "'.", s, IMPORT_RULES.taskScope);
        });
        var name = v(r, "Name").trim(), scope = v(r, "Scope category").trim();
        if (name) {
          if (seenPlan[name] && seenPlan[name].scope !== scope) add(r, "Scope category", "Critical", "Job plan '" + name + "' has a different scope category here ('" + scope + "') than on row " + file.rowNums[seenPlan[name].r] + " ('" + seenPlan[name].scope + "').", "Use the same scope category on every row of a job plan.", scope, seenPlan[name].scope);
          if (!seenPlan[name]) seenPlan[name] = { scope: scope, r: r };
          if (scope === "Asset Category" && !v(r, "Asset Catgeory").trim()) add(r, "Asset Catgeory", "Critical", "Scope category is 'Asset Category' but Asset Catgeory is empty.", "Enter the asset category the job plan applies to.");
        }
        var secSeq = intVal(v(r, "Section sequence"));
        if (v(r, "Section sequence") && secSeq == null) add(r, "Section sequence", "Critical", "Section sequence must be a whole number.", "Use 1 for the first section.", v(r, "Section sequence"));
        var ts = v(r, "Task Sequence"), tsv = intVal(ts), key = name + "|" + v(r, "Section/Skill Set") + "|" + secSeq;
        if (/^=/.test(ts.trim())) add(r, "Task Sequence", "Critical", "Task Sequence is a formula with no saved value.", "Paste the column as values before importing.", ts, String(seqExpect[key] || 1));
        else if (tsv == null) add(r, "Task Sequence", "Critical", "Task Sequence must be a whole number.", "Number the tasks 1, 2, 3… within each job plan.", ts, String(seqExpect[key] || 1));
        else { var exp = seqExpect[key] || 1; if (name !== lastPlan && tsv !== 1 && !seqExpect[key]) add(r, "Task Sequence", "Warning", "The first task of job plan '" + name + "' should be 1.", "Start each job plan at 1.", ts, "1"); else if (seqExpect[key] && tsv !== exp) add(r, "Task Sequence", "Warning", "Expected " + exp + " here (tasks count up by 1 within a job plan).", "Use " + exp + ".", ts, String(exp)); }
        seqExpect[key] = (tsv || seqExpect[key] || 0) + 1; lastPlan = name;
        var it = v(r, "Input Type").trim(), opt = v(r, "Options");
        if (it) exactList(r, "Input Type", IMPORT_RULES.inputTypes, "Critical", "input type");
        if (it.toLowerCase() === "radio") {
          if (!opt.trim()) add(r, "Options", "Critical", "Radio tasks need their options.", "List them separated by '/', for example Yes/No/Not Applicable.");
          else { var parts = opt.split("/"); if (parts.some(function (p) { return !p.trim(); })) add(r, "Options", "Critical", "An option is empty (check for '//' or a trailing '/').", "Remove the empty option.", opt); else if (parts.some(function (p) { return p !== p.trim(); })) add(r, "Options", "Warning", "Spaces around '/' between options.", "Use '" + parts.map(function (p) { return p.trim(); }).join("/") + "'.", opt, parts.map(function (p) { return p.trim(); }).join("/")); if (parts.length < 2) add(r, "Options", "Warning", "A radio task with only one option.", "Add the other choices, separated by '/'.", opt); }
        } else if ((it.toLowerCase() === "text" || it.toLowerCase() === "number") && opt.trim()) add(r, "Options", "Warning", "Options should be empty for " + it + " tasks.", "Clear Options, or change Input Type to Radio.", opt, "");
        var tk = name + "|" + v(r, "Task").trim().toLowerCase();
        if (v(r, "Task").trim() && taskSeen[tk]) add(r, "Task", "Warning", "The same task appears twice in job plan '" + name + "' (also row " + taskSeen[tk] + ").", "Remove the duplicate unless it's intended.", v(r, "Task"));
        else if (v(r, "Task").trim()) taskSeen[tk] = file.rowNums[r];
        if (v(r, "Task").length > 255) add(r, "Task", "Warning", "The task is " + v(r, "Task").length + " characters long.", "Keep tasks under 255 characters.", v(r, "Task").slice(0, 60) + "…");
      });
      ctx.jobPlans = Object.keys(seenPlan);
      ctx.jobPlanScope = {}; Object.keys(seenPlan).forEach(function (k) { ctx.jobPlanScope[k] = seenPlan[k].scope; });
    }

    if (t === "trigger") {
      var names = {};
      ctx.triggers = {};
      rows.forEach(function (row, r) {
        var name = v(r, "Name").trim(), tr = v(r, "Trigger").trim(), trU = tr.toUpperCase(), label = v(r, "Workorder frequency Label").trim();
        req(r, "Name"); req(r, "Trigger"); req(r, "Times"); req(r, "Start Date"); req(r, "Workorder frequency Label");
        spaces(r, "Name");
        if (name) { if (names[name]) add(r, "Name", "Critical", "Schedule name '" + name + "' is used twice (also row " + names[name] + "). PPM rows refer to schedules by name.", "Remove the duplicate row, or give it a different name.", name); else names[name] = file.rowNums[r]; }
        if (tr && IMPORT_RULES.triggers.indexOf(tr) < 0) { if (IMPORT_RULES.triggers.indexOf(trU) >= 0) add(r, "Trigger", "Critical", "Trigger must be in upper case.", "Use '" + trU + "'.", tr, trU); else add(r, "Trigger", "Critical", "'" + tr + "' isn't a Facilio trigger.", "Use one of: " + IMPORT_RULES.triggers.join(", ") + ".", tr); }
        var T = IMPORT_RULES.triggers.indexOf(trU) >= 0 ? trU : null;
        var vals = v(r, "Values").trim(), mv = v(r, "Month Value").trim(), yd = v(r, "Yearly Day Value").trim(), times = v(r, "Times").trim(), runs = v(r, "Runs Every").trim(), skip = v(r, "Skip Every").trim();
        if (times && !parseTimeList(times)) add(r, "Times", "Critical", "Times must be 24-hour hh:mm, such as 07:00 (several separated by commas).", "Use hh:mm, for example 07:00.", times);
        if (runs && !(intVal(runs) >= 1)) add(r, "Runs Every", "Critical", "Runs Every must be a whole number of 1 or more.", "Leave it empty for every cycle, or enter 2 for every second cycle.", runs);
        if (skip && !(intVal(skip) >= 1)) add(r, "Skip Every", "Critical", "Skip Every must be a whole number.", "Leave it empty unless cycles are skipped.", skip);
        var sd = v(r, "Start Date").trim(), pd = sd ? parseDMY(sd) : null;
        if (sd && !pd) add(r, "Start Date", "Critical", "Start Date isn't a date in dd/mm/yyyy.", "Use dd/mm/yyyy, for example 07/08/2026.", sd);
        if (T) {
          var unit = IMPORT_RULES.labelFor[T];
          if (label) { var okLabel = (unit === "Q" || unit === "HY") ? label === unit : new RegExp("^\\d+ " + unit + "$").test(label); if (!okLabel) add(r, "Workorder frequency Label", "Critical", "Label '" + label + "' doesn't match trigger " + T + ".", "Use '" + ((unit === "Q" || unit === "HY") ? unit : (intVal(runs) || 1) + " " + unit) + "'.", label, (unit === "Q" || unit === "HY") ? unit : (intVal(runs) || 1) + " " + unit); }
          var up = function (h, s) { if (s && s !== s.toUpperCase()) add(r, h, "Critical", "Must be in upper case (Facilio import rule).", "Use '" + s.toUpperCase() + "'.", s, s.toUpperCase()); };
          var mustEmpty = function (h, s) { if (s) add(r, h, "Critical", h + " must be empty for " + T + " schedules.", "Clear " + h + ".", s, ""); };
          var dayOk = function (s) { return s.split(",").every(function (p) { var n = intVal(p); return n != null && n >= 1 && n <= 31; }); };
          if (T === "DAILY") { mustEmpty("Values", vals); mustEmpty("Month Value", mv); mustEmpty("Yearly Day Value", yd); }
          if (T === "WEEKLY") {
            up("Values", vals);
            if (!vals) add(r, "Values", "Critical", "Weekly schedules need the weekday(s) in Values.", "For example FRIDAY, or MONDAY,TUESDAY.");
            else vals.toUpperCase().split(",").forEach(function (d) { if (IMPORT_RULES.weekdays.indexOf(d.trim()) < 0) add(r, "Values", "Critical", "'" + d.trim() + "' isn't a weekday.", "Use MONDAY … SUNDAY, separated by commas with no spaces.", vals); });
            if (/,\s/.test(vals)) add(r, "Values", "Warning", "Weekdays should be separated by commas without spaces.", "Use '" + vals.replace(/\s*,\s*/g, ",") + "'.", vals, vals.replace(/\s*,\s*/g, ",").toUpperCase());
            mustEmpty("Month Value", mv); mustEmpty("Yearly Day Value", yd);
          }
          if (T === "MONTHLY") {
            if (!vals) add(r, "Values", "Critical", "Monthly schedules need the day of the month in Values.", "Enter a day from 1 to 31.");
            else if (!dayOk(vals)) add(r, "Values", "Critical", "Values must be a day of the month (1–31).", "Enter the day, for example 15.", vals);
            else if (vals.split(",").some(function (p) { return +p > 28; })) add(r, "Values", "Info", "Day " + vals + " doesn't occur in every month.", "Confirm how shorter months should be handled, or use a day up to 28.", vals);
            mustEmpty("Month Value", mv); mustEmpty("Yearly Day Value", yd);
          }
          if (T === "QUARTERLY" || T === "HALF_YEARLY") {
            var span = T === "QUARTERLY" ? 3 : 6, allowed = IMPORT_RULES.months.slice(0, span);
            if (!vals) add(r, "Values", "Critical", T + " schedules need the day of the month in Values.", "Enter a day from 1 to 31.");
            else if (!dayOk(vals)) add(r, "Values", "Critical", "Values must be a day of the month (1–31).", "Enter the day, for example 15.", vals);
            up("Month Value", mv);
            if (!mv) add(r, "Month Value", "Critical", "Month Value is needed: the first month of the " + (span === 3 ? "quarter" : "half-year") + " cycle.", "Use one of " + allowed.join(", ") + ".");
            else { var mi = IMPORT_RULES.months.indexOf(mv.toUpperCase());
              if (mi < 0) add(r, "Month Value", "Critical", "'" + mv + "' isn't a month.", "Use one of " + allowed.join(", ") + ".", mv);
              else if (mi >= span) add(r, "Month Value", "Critical", "For " + T + " schedules, Month Value is the first month of the cycle, so " + mv.toUpperCase() + " should be " + cycleStart(mi, span) + " (" + cycleList(mi % span, span) + ").", "Use '" + cycleStart(mi, span) + "'.", mv, cycleStart(mi, span)); }
            mustEmpty("Yearly Day Value", yd);
          }
          if (T === "ANNUALLY") {
            up("Values", vals);
            if (!vals) add(r, "Values", "Critical", "Annual schedules need the month in Values.", "For example SEPTEMBER.");
            else if (IMPORT_RULES.months.indexOf(vals.toUpperCase()) < 0) add(r, "Values", "Critical", "For ANNUALLY, Values is the month name, not '" + vals + "'.", /^\d+$/.test(vals) ? "Put the day in Yearly Day Value and the month (e.g. SEPTEMBER) in Values." : "Use a month such as SEPTEMBER.", vals);
            if (!yd) add(r, "Yearly Day Value", "Critical", "Annual schedules need the day of the month in Yearly Day Value.", "Enter a day, for example 8.");
            else if (!(intVal(yd) >= 1) || (IMPORT_RULES.months.indexOf(vals.toUpperCase()) >= 0 && !dayInMonth(intVal(yd), vals.toUpperCase()))) add(r, "Yearly Day Value", "Critical", "Day " + yd + " isn't valid" + (vals ? " for " + vals.toUpperCase() : "") + ".", "Enter a day that exists in that month.", yd);
            mustEmpty("Month Value", mv);
          }
          /* the schedule name should describe the same schedule */
          var canon = triggerName(T, T === "ANNUALLY" ? vals.toUpperCase() : (T === "WEEKLY" ? vals.toUpperCase().replace(/\s/g, "") : vals), mv.toUpperCase(), yd, times);
          var mIdx = IMPORT_RULES.months.indexOf(mv.toUpperCase()), cycleOk = !(T === "QUARTERLY" || T === "HALF_YEARLY") || (mIdx >= 0 && mIdx < (T === "QUARTERLY" ? 3 : 6));
          if (name && canon && cycleOk && canon.indexOf("undefined") < 0 && name !== canon)
            add(r, "Name", "Warning", "The name doesn't describe this schedule's settings (expected '" + canon + "').", "Rename it, or check Values, Month Value and Times. PPM rows must use the same name.", name);
          ctx.triggers[name] = { label: label, trigger: T, row: file.rowNums[r] };
        }
      });
    }

    if (t === "ppm") {
      var dupe = {};
      rows.forEach(function (row, r) {
        ["PM Name", "Subject", "Site", "Job Plan", "Trigger Schedule", "Maintenance Type", "Planner Type", "Priority", "Scope Category", "Workorder Category"].forEach(function (h) { req(r, h); });
        if (!ctx.triggers || !ctx.triggers[v(r, "Trigger Schedule").trim()]) req(r, "Custom Frequency");
        ["PM Name", "Subject", "Site", "Building", "Floor", "Space", "Asset", "Job Plan", "Trigger Schedule"].forEach(function (h) { spaces(r, h); });
        var pub = v(r, "Published").trim();
        if (pub && pub !== "true" && pub !== "false") add(r, "Published", "Critical", "Published must be the literal value true or false.", "Use '" + (/^(yes|y|1|true)$/i.test(pub) ? "true" : "false") + "'.", pub, /^(yes|y|1|true)$/i.test(pub) ? "true" : "false");
        var scope = v(r, "Scope Category").trim();
        if (scope && IMPORT_RULES.pmScopeCategories.indexOf(scope) < 0) { var ci2 = IMPORT_RULES.pmScopeCategories.filter(function (x) { return x.toLowerCase() === scope.toLowerCase() || x.toLowerCase() + "s" === scope.toLowerCase(); })[0]; add(r, "Scope Category", ci2 ? "Critical" : "Warning", ci2 ? "PPM Scope Category is '" + ci2 + "' (singular, exact case)." : "'" + scope + "' isn't a usual PPM scope category.", ci2 ? "Use '" + ci2 + "'." : "Check it exists in the org: " + IMPORT_RULES.pmScopeCategories.join(", ") + ".", scope, ci2); }
        if (scope === "Asset" && !v(r, "Asset").trim()) add(r, "Asset", "Critical", "Scope Category is Asset but Asset is empty.", "Enter the asset this PPM maintains.");
        var mt = v(r, "Maintenance Type").trim(); if (mt && IMPORT_RULES.knownMaintenanceTypes.indexOf(mt) < 0) add(r, "Maintenance Type", "Warning", "'" + mt + "' differs from the usual 'Preventive'.", "Confirm the value exists in the org exactly as written.", mt);
        var pt = v(r, "Planner Type").trim(); if (pt && IMPORT_RULES.knownPlannerTypes.indexOf(pt) < 0) add(r, "Planner Type", "Warning", "'" + pt + "' differs from the usual 'Custom'.", "Confirm the value exists in the org exactly as written.", pt);
        var wc = v(r, "Workorder Category").trim(), wm = v(r, "Workorder Category Mapping").trim();
        if (wc && C["Workorder Category Mapping"] >= 0 && wm !== wc) add(r, "Workorder Category Mapping", "Warning", "Workorder Category Mapping differs from Workorder Category ('" + wc + "').", "Use the same value in both columns.", wm, wc);
        var cf = v(r, "Custom Frequency").trim();
        if (cf && !/^(\d+ [DWMY]|Q|HY)$/.test(cf)) add(r, "Custom Frequency", "Critical", "'" + cf + "' isn't a Facilio frequency label.", "Use 1 D, 1 W, 1 M, Q, HY or 1 Y (a number and unit for D, W, M and Y).", cf);
        var ts = v(r, "Trigger Schedule").trim();
        if (ctx.triggers && ts) {
          var tg = ctx.triggers[ts];
          if (!tg) { var near = closestName(ts, Object.keys(ctx.triggers)); add(r, "Trigger Schedule", "Critical", "Schedule '" + ts + "' isn't in the Trigger Schedule import.", near ? "Did you mean '" + near + "'?" : "Add it to the Trigger Schedule import, or correct the name.", ts); }
          else if (cf && tg.label && cf !== tg.label) add(r, "Custom Frequency", "Critical", "Custom Frequency '" + cf + "' doesn't match the schedule's label '" + tg.label + "' (Trigger Schedule row " + tg.row + ").", "Use '" + tg.label + "'.", cf, tg.label);
          else if (!cf && tg.label) add(r, "Custom Frequency", "Critical", "Custom Frequency is empty.", "Use '" + tg.label + "', the label of schedule '" + ts + "'.", "", tg.label);
        }
        var jp = v(r, "Job Plan").trim();
        if (ctx.jobPlans && jp && ctx.jobPlans.indexOf(jp) < 0) { var n2 = closestName(jp, ctx.jobPlans); add(r, "Job Plan", "Critical", "Job plan '" + jp + "' isn't in the Job Plan import.", n2 ? "Did you mean '" + n2 + "'?" : "Add the job plan, or correct the name.", jp); }
        if (ctx.jobPlanScope && jp && ctx.jobPlanScope[jp] && scope === "Asset" && ["Assets", "Asset Category"].indexOf(ctx.jobPlanScope[jp]) < 0) add(r, "Job Plan", "Warning", "This PPM is scoped to an asset but job plan '" + jp + "' is scoped to '" + ctx.jobPlanScope[jp] + "'.", "Use a job plan scoped to Assets or Asset Category.", jp);
        /* frequency words in names should agree with the schedule */
        var trig = ctx.triggers && ctx.triggers[ts] ? ctx.triggers[ts].trigger : (cf ? { "Q": "QUARTERLY", "HY": "HALF_YEARLY" }[cf] || { D: "DAILY", W: "WEEKLY", M: "MONTHLY", Y: "ANNUALLY" }[cf.slice(-1)] : null);
        if (trig) [["PM Name", v(r, "PM Name")], ["Job Plan", jp]].forEach(function (x) { var w = freqWord(x[1]); if (w && w !== trig) add(r, x[0], "Warning", "'" + x[1] + "' reads as " + w.toLowerCase().replace("_", "-") + ", but the schedule is " + trig.toLowerCase().replace("_", "-") + ".", "Check the " + (x[0] === "Job Plan" ? "job plan" : "PM name") + " or the schedule.", x[1]); });
        var dk = [v(r, "PM Name").trim(), v(r, "Asset").trim(), ts, jp].join("|");
        if (dupe[dk]) add(r, "PM Name", "Warning", "Same PM, asset, schedule and job plan as row " + dupe[dk] + "; this would create a duplicate PPM.", "Remove one of the rows.", v(r, "PM Name")); else dupe[dk] = file.rowNums[r];
        /* links to the onboarding data, when the workspace has it */
        if (ctx.portfolio) linkChecks(r, add, v, ctx.portfolio);
      });
      /* casing consistency within columns (Floor 'Roof floor' vs 'Roof Floor') */
      ["PM Name", "Site", "Building", "Floor", "Space", "Job Plan"].forEach(function (h) {
        if (C[h] < 0) return; var groups = {};
        rows.forEach(function (row, r) { var s = v(r, h).trim(); if (s) (groups[s.toLowerCase()] = groups[s.toLowerCase()] || {})[s] = (groups[s.toLowerCase()][s] || []).concat([r]); });
        Object.keys(groups).forEach(function (k) { var vs = Object.keys(groups[k]); if (vs.length < 2) return; vs.sort(function (a, b) { return groups[k][b].length - groups[k][a].length; });
          vs.slice(1).forEach(function (s) { groups[k][s].forEach(function (r) { add(r, h, "Critical", "Capitals differ from '" + vs[0] + "' used on other rows. Facilio treats them as different values.", "Use '" + vs[0] + "' (or the spelling used in Facilio) on every row.", s); }); }); });
      });
    }
    return out;
  }
  function freqWord(s) {
    s = str(s);
    if (/half[\s_-]*year|semi[\s-]*annual/i.test(s)) return "HALF_YEARLY";
    if (/quar?te?r?ly|quaterly/i.test(s)) return "QUARTERLY";
    if (/\bmonthly\b/i.test(s)) return "MONTHLY";
    if (/\bweekly\b/i.test(s)) return "WEEKLY";
    if (/\bdaily\b/i.test(s)) return "DAILY";
    if (/\bannual(ly)?\b|\byearly\b/i.test(s)) return "ANNUALLY";
    return null;
  }
  function lev(a, b) { var m = a.length, n = b.length, p = [], c = [], i, j; for (j = 0; j <= n; j++) p[j] = j; for (i = 1; i <= m; i++) { c[0] = i; for (j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); var t = p; p = c; c = t; } return p[n]; }
  function closestName(s, list) { var a = s.toLowerCase(), best = null, bd = 1e9; list.forEach(function (x) { if (x.toLowerCase() === a) { best = x; bd = -1; return; } if (bd < 0) return; var d = lev(a, x.toLowerCase()); if (d < bd) { bd = d; best = x; } }); return bd <= Math.max(2, Math.floor(a.length * 0.25)) ? best : null; }
  function linkChecks(r, add, v, P) {
    var site = v(r, "Site").trim(), b = v(r, "Building").trim(), f = v(r, "Floor").trim(), sp = v(r, "Space").trim(), a = v(r, "Asset").trim();
    function miss(h, val, list, where) { var near = closestName(val, list); add(r, h, "Critical", "'" + val + "' isn't " + where + " in the onboarding workbook.", near ? "Did you mean '" + near + "'?" : "Add it to the onboarding workbook, or correct it.", val); }
    if (site && P.sites.length && P.sites.indexOf(site) < 0) { miss("Site", site, P.sites, "a site"); return; }
    if (b && P.buildings[site] && P.buildings[site].indexOf(b) < 0) { miss("Building", b, P.buildings[site], "a building of " + site); return; }
    if (f && P.floors[site + "|" + b] && P.floors[site + "|" + b].indexOf(f) < 0) { miss("Floor", f, P.floors[site + "|" + b], "a floor of " + b); return; }
    if (sp && P.spaces[site + "|" + b + "|" + f] && P.spaces[site + "|" + b + "|" + f].indexOf(sp) < 0) miss("Space", sp, P.spaces[site + "|" + b + "|" + f], "a space on " + f);
    if (a && P.assets.length && P.assets.indexOf(a) < 0 && P.assetCodes.indexOf(a) < 0) miss("Asset", a, P.assets.concat(P.assetCodes), "an asset (name or code)");
  }

  /* run every loaded file; job plans and schedules first so PPM rows can be checked against them */
  function checkAll(files, portfolio) {
    var ctx = { portfolio: portfolio || null }, issues = [];
    ["jobplan", "trigger", "ppm"].forEach(function (t) { files.filter(function (f) { return f.type === t; }).forEach(function (f) { issues = issues.concat(checkFile(f, ctx)); }); });
    /* unused job plans / schedules */
    var ppm = files.filter(function (f) { return f.type === "ppm"; });
    if (ppm.length) {
      var usedJP = {}, usedT = {};
      ppm.forEach(function (f) { var j = colIndex(f.header, "Job Plan"), t = colIndex(f.header, "Trigger Schedule"); f.rows.forEach(function (row) { if (j >= 0) usedJP[str(row[j]).trim()] = 1; if (t >= 0) usedT[str(row[t]).trim()] = 1; }); });
      files.forEach(function (f) {
        if (f.type === "jobplan") { var seen = {}; var n = colIndex(f.header, "Name"); f.rows.forEach(function (row, r) { var nm = str(row[n]).trim(); if (nm && !seen[nm]) { seen[nm] = 1; if (!usedJP[nm]) issues.push({ file: f.name, type: "jobplan", row: f.rowNums[r], col: "Name", severity: "Info", issue: "Job plan '" + nm + "' isn't used by any PPM row.", suggestion: "Fine if it's for later; otherwise remove it.", value: nm }); } }); }
        if (f.type === "trigger") { var n2 = colIndex(f.header, "Name"); f.rows.forEach(function (row, r) { var nm = str(row[n2]).trim(); if (nm && !usedT[nm]) issues.push({ file: f.name, type: "trigger", row: f.rowNums[r], col: "Name", severity: "Info", issue: "Schedule '" + nm + "' isn't used by any PPM row.", suggestion: "Fine if it's for later; otherwise remove it.", value: nm }); }); }
      });
    }
    var rank = { Critical: 0, Warning: 1, Info: 2 };
    issues.sort(function (a, b) { return a.file < b.file ? -1 : a.file > b.file ? 1 : ((+a.row || 0) - (+b.row || 0)) || rank[a.severity] - rank[b.severity]; });
    return issues;
  }

  /* read a worksheet (SheetJS) into header + rows of strings; formula cells keep their saved value */
  function readSheet(ws, XLSX) {
    if (!ws || !ws["!ref"]) return null;
    var rng = XLSX.utils.decode_range(ws["!ref"]), grid = [];
    for (var R = rng.s.r; R <= Math.min(rng.e.r, rng.s.r + 50000); R++) {
      var row = [], any = false;
      for (var C = rng.s.c; C <= Math.min(rng.e.c, 60); C++) {
        var cell = ws[XLSX.utils.encode_cell({ r: R, c: C })], v = "";
        if (cell) {
          if (cell.f && (cell.v === undefined || cell.v === null)) v = "=" + cell.f;
          else if (cell.t === "n" && cell.z && XLSX.SSF.is_date(cell.z)) { var d = XLSX.SSF.parse_date_code(cell.v); v = cell.v < 1 ? (("0" + d.H).slice(-2) + ":" + ("0" + d.M).slice(-2)) : (("0" + d.d).slice(-2) + "/" + ("0" + d.m).slice(-2) + "/" + d.y); }
          else if (cell.t === "b") v = cell.v ? "true" : "false";
          else v = cell.w != null && cell.t === "n" ? String(cell.v) : String(cell.v);
        }
        if (v !== "") any = true; row.push(v);
      }
      grid.push({ excelRow: R + 1, cells: row, any: any });
    }
    var hi = -1; for (var i = 0; i < Math.min(grid.length, 10); i++) if (grid[i].any) { hi = i; break; }
    if (hi < 0) return null;
    var header = grid[hi].cells.map(function (x) { return String(x).trim(); }), rows = [], rowNums = [];
    for (var k = hi + 1; k < grid.length; k++) if (grid[k].any) { rows.push(grid[k].cells); rowNums.push(grid[k].excelRow); }
    /* trailing note blocks (like the Berkeley sheet) are rows with only the first cell filled after a gap; keep data rows only */
    return { header: header, rows: rows, rowNums: rowNums };
  }

  root.FacilioImportCheck = { RULES: IMPORT_RULES, HEAD: HEAD, TYPE_LABEL: TYPE_LABEL, detect: detect, checkAll: checkAll, readSheet: readSheet, triggerName: triggerName, cycleStart: cycleStart, colIndex: colIndex, freqWord: freqWord };
})(typeof window !== "undefined" ? window : globalThis);
