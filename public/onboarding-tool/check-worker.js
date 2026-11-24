/* Runs the onboarding work that is slow on a large workbook away from the page, so 100,000 rows never freeze it (05-engine.js does the checking).
   Messages from 10-part.js, each with an id, answered with the same id:
   - read   { buf }: read an Excel file; keeps it here and answers { sheetNames, previews: { name: { count, head (first 12 rows) } } }
   - import { skip, renames, rules }: drops and renames sheets of the file read last, checks it and answers { data, lists, sheetNames }
   - check  { aoa: { sheet: rows }, rules }: builds the workbook from the rows and answers { issues, checks } */
importScripts("02-part.js", "05-engine.js");
var book = null;
function preview(ws) {
  if (!ws || !ws["!ref"]) return { count: 0, head: [] };
  var r = XLSX.utils.decode_range(ws["!ref"]), top = { s: r.s, e: { r: Math.min(r.e.r, r.s.r + 11), c: r.e.c } };
  return { count: r.e.r - r.s.r + 1, head: XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false, raw: false, range: top }) };
}
onmessage = function (e) {
  var d = e.data;
  try {
    if (d.kind === "read") {
      book = XLSX.read(new Uint8Array(d.buf), { type: "array", cellNF: true, cellDates: false }); var pv = {};
      book.SheetNames.forEach(function (n) { pv[n] = preview(book.Sheets[n]); });
      postMessage({ id: d.id, sheetNames: book.SheetNames, previews: pv }); return;
    }
    if (d.kind === "import") {
      if (!book) throw new Error("The file has to be read again.");
      (d.skip || []).forEach(function (n) { delete book.Sheets[n]; book.SheetNames = book.SheetNames.filter(function (x) { return x !== n; }); });
      (d.renames || []).forEach(function (p) { book.Sheets[p[1]] = book.Sheets[p[0]]; delete book.Sheets[p[0]]; book.SheetNames[book.SheetNames.indexOf(p[0])] = p[1]; });
      var res = OnboardingValidator.validate(book, d.rules), names = book.SheetNames; book = null;
      postMessage({ id: d.id, data: res.data, lists: res.lists, sheetNames: names }); return;
    }
    var wb = XLSX.utils.book_new(); Object.keys(d.aoa).forEach(function (n) { XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d.aoa[n]), n); });
    var r2 = OnboardingValidator.validate(wb, d.rules); postMessage({ id: d.id, issues: r2.issues, checks: r2.checks });
  } catch (err) { postMessage({ id: d.id, error: String((err && err.message) || err) }); }
};
