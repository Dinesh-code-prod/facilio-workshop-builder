"""Build the UAT test workbook from a JSON spec (see SKILL.md).

Usage: python build_uat_workbook.py spec.json <out-folder>
Writes UAT-<customer>-workbook.xlsx (sheets: Read me, Test scripts, Defect log, Sign-off) when openpyxl
is installed, otherwise one CSV file per sheet. Prints XLSX or CSV and the paths written.
The tester columns (Actual result, Pass/Fail, Defect id, Tested by, Date) are always left empty.
"""
import csv
import json
import os
import re
import sys

SCRIPT_COLS = ["Scenario id", "Module", "Role", "Scenario", "Requirement ids", "Preconditions", "Step",
               "Action", "Expected result", "Actual result", "Pass/Fail", "Defect id", "Tested by", "Date"]
DEFECT_COLS = ["Defect id", "Scenario id", "Step", "Summary", "Steps to reproduce", "Expected", "Actual", "Severity",
               "Raised by", "Date raised", "Status", "Fixed in", "Re-tested by", "Date closed"]
SIGN_COLS = ["Role", "Name", "Decision", "Conditions", "Signature", "Date"]
SEVERITY = ["Critical", "High", "Medium", "Low"]
STATUS = ["Open", "In fix", "Ready to re-test", "Closed"]
DECISION = ["Accepted", "Accepted with conditions", "Not accepted"]
ID_RE = re.compile(r"^UAT-[A-Z]{2,4}-\d{2,3}$")


def fail(msg):
    print("ERROR " + msg)
    sys.exit(2)


def check(spec):
    """The spec problems that would make a wrong workbook; an empty list means it is fine."""
    errs = []
    if not isinstance(spec, dict):
        return ["the spec must be a JSON object"]
    if not str(spec.get("customer", "")).strip():
        errs.append("customer is missing")
    sc = spec.get("scenarios")
    if not isinstance(sc, list) or not sc:
        return errs + ["scenarios must be a non-empty list"]
    seen = set()
    for i, s in enumerate(sc, 1):
        sid = str((s or {}).get("id", ""))
        if not ID_RE.match(sid):
            errs.append("scenario %d: id %r is not like UAT-WO-01" % (i, sid))
        if sid in seen:
            errs.append("scenario %d: id %s is used twice" % (i, sid))
        seen.add(sid)
        steps = (s or {}).get("steps")
        if not isinstance(steps, list) or not steps:
            errs.append("scenario %s: no steps" % sid)
            continue
        for j, st in enumerate(steps, 1):
            if not str((st or {}).get("action", "")).strip() or not str((st or {}).get("expected", "")).strip():
                errs.append("scenario %s step %d: every step needs an action and an expected result" % (sid, j))
    return errs


def rows(spec):
    """(read me lines, test script rows, sign-off rows) from the spec."""
    win = spec.get("window") or {}
    readme = [
        ["User Acceptance Testing workbook"],
        ["Customer", spec.get("customer", "")], ["Project", spec.get("project", "")],
        ["Version", spec.get("version", "1.0")], ["Date", spec.get("date", "")],
        ["UAT window", ("%s to %s" % (win.get("start", ""), win.get("end", ""))).strip(" to")],
        ["Environment", spec.get("environment", "")],
        [""],
        ["How to use"],
        ["1. Test scripts: filter on your role, do each step in order and compare with Expected result."],
        ["2. Fill Actual result only when it differs, then Pass or Fail, your name and the date."],
        ["3. On a fail add a row in Defect log, choose the severity, and put the defect id next to the step."],
        ["4. Sign-off: the UAT lead records the decision when every scenario has been run."],
        [""],
        ["Severity: Critical = cannot be done, no workaround; High = workaround or wrong data; Medium = easy workaround; Low = cosmetic."],
    ]
    script = []
    for s in spec["scenarios"]:
        title = s.get("title", "") + (" (Suggested additional test)" if s.get("suggested") else "")
        for j, st in enumerate(s["steps"], 1):
            first = j == 1
            script.append([s["id"], s.get("module", "") if first else "", s.get("role", "") if first else "",
                           title if first else "", ", ".join(s.get("requirements") or []) if first else "",
                           s.get("preconditions", "") if first else "", j, st["action"], st["expected"],
                           "", "", "", "", ""])
    sign = [[x.get("role", ""), x.get("name", ""), "", "", "", ""] for x in (spec.get("signoff") or [])] or \
           [["Customer UAT lead", "", "", "", "", ""], ["Facilio project manager", "", "", "", "", ""]]
    return readme, script, sign


def safe(name):
    return re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-") or "customer"


def write_xlsx(path, readme, script, sign):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation
    wb = Workbook()
    ws = wb.active
    ws.title = "Read me"
    for r in readme:
        ws.append(r)
    ws["A1"].font = Font(bold=True, size=14)
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 70
    head = PatternFill("solid", fgColor="1D1A5E")

    def sheet(title, cols, data, widths):
        sh = wb.create_sheet(title)
        sh.append(cols)
        for c in sh[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = head
            c.alignment = Alignment(wrap_text=True, vertical="top")
        for r in data:
            sh.append(r)
        for i, w in enumerate(widths, 1):
            sh.column_dimensions[sh.cell(row=1, column=i).column_letter].width = w
        for row in sh.iter_rows(min_row=2):
            for c in row:
                c.alignment = Alignment(wrap_text=True, vertical="top")
        sh.freeze_panes = "A2"
        return sh

    sc = sheet("Test scripts", SCRIPT_COLS, script, [12, 16, 16, 30, 16, 24, 6, 40, 40, 28, 10, 10, 14, 12])
    dv = DataValidation(type="list", formula1='"Pass,Fail,Blocked,Not run"', allow_blank=True)
    sc.add_data_validation(dv)
    dv.add("K2:K%d" % max(2, len(script) + 1))
    df = sheet("Defect log", DEFECT_COLS, [], [10, 12, 6, 30, 36, 28, 28, 10, 14, 12, 14, 10, 14, 12])
    for col, values in (("H", SEVERITY), ("K", STATUS)):
        v = DataValidation(type="list", formula1='"%s"' % ",".join(values), allow_blank=True)
        df.add_data_validation(v)
        v.add("%s2:%s500" % (col, col))
    sg = sheet("Sign-off", SIGN_COLS, sign, [26, 24, 24, 36, 20, 12])
    v = DataValidation(type="list", formula1='"%s"' % ",".join(DECISION), allow_blank=True)
    sg.add_data_validation(v)
    v.add("C2:C20")
    wb.save(path)


def main(argv):
    if len(argv) != 3:
        fail("usage: build_uat_workbook.py spec.json <out-folder>")
    try:
        with open(argv[1], encoding="utf-8") as f:
            spec = json.load(f)
    except Exception as e:  # unreadable or not JSON
        fail("cannot read the spec: %s" % e)
    errs = check(spec)
    if errs:
        fail("; ".join(errs))
    out = argv[2]
    os.makedirs(out, exist_ok=True)
    readme, script, sign = rows(spec)
    base = "UAT-%s-workbook" % safe(spec["customer"])
    try:
        import openpyxl  # noqa: F401
        path = os.path.join(out, base + ".xlsx")
        write_xlsx(path, readme, script, sign)
        print("XLSX " + path)
    except ImportError:
        paths = []
        for name, cols, data in (("read-me", None, readme), ("test-scripts", SCRIPT_COLS, script),
                                 ("defect-log", DEFECT_COLS, []), ("sign-off", SIGN_COLS, sign)):
            p = os.path.join(out, "%s-%s.csv" % (base, name))
            with open(p, "w", newline="", encoding="utf-8-sig") as f:
                w = csv.writer(f)
                if cols:
                    w.writerow(cols)
                w.writerows(data)
            paths.append(p)
        print("CSV " + " ".join(paths))
    print("scenarios %d, steps %d" % (len(spec["scenarios"]), len(script)))


if __name__ == "__main__":
    main(sys.argv)
