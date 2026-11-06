# Building the .docx (format fidelity recipe)

Read the `docx` skill first (it holds the OOXML rules and `validate.py`). Use python-docx + lxml.

## 1. Shell from the reference
```python
from docx import Document
from copy import deepcopy as dc
from lxml import etree
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def w(t): return '{%s}%s' % (W, t)

d = Document('reference.docx')
body = d.element.body
children = list(body)
# 1) capture template elements BEFORE clearing (find them by style name / content, print to confirm):
#    cover paragraphs + logo runs, TOC sdt, H1, H2, body paragraph, bold label paragraph, bullet paragraph,
#    image paragraph, hyperlink paragraph, project-info table, functional-requirements table (3 cols),
#    field-list table (with a red row and a merged sub-header row).
# 2) remove everything except the cover block, the TOC sdt and the final sectPr; then append new content
#    before sectPr.
sectPr = body.find(w('sectPr'))
def append(e):
    sectPr.addprevious(e); return e
```

## 2. Text helpers (keep the template's run formatting)
```python
def first_rpr(p):
    r = p.find(w('r')); return dc(r.find(w('rPr'))) if r is not None and r.find(w('rPr')) is not None else None

def set_text(p, text):
    rpr = first_rpr(p)
    for r in p.findall(w('r')) + p.findall(w('hyperlink')): p.remove(r)
    r = etree.SubElement(p, w('r'))
    if rpr is not None: r.append(rpr)
    t = etree.SubElement(r, w('t')); t.text = text
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    return p
```
- Headings: clone the template H1/H2, set text, add a unique bookmark `_Toc<n>` around the text, set
  `keepNext`. Set font/colour/size explicitly on runs if the reference relies on direct formatting
  (default: Calibri, bold, 351C75, H1 16pt, H2 14pt).
- Bold labels (`REQID: Feature`): body paragraph with one bold run — not a heading style (keeps them out of the TOC).
- Bullets: clone the template bullet paragraph (keeps numbering).

## 3. Tables
```python
def finalize_table(t):
    for i, tr in enumerate(t.findall(w('tr'))):
        trpr = tr.find(w('trPr'))
        if trpr is None: trpr = etree.Element(w('trPr')); tr.insert(0, trpr)
        if trpr.find(w('cantSplit')) is None: trpr.insert(0, etree.Element(w('cantSplit')))
        sub = len(tr.findall(w('tc'))) == 1 and i > 0          # merged sub-header row
        if i == 0 and trpr.find(w('tblHeader')) is None: etree.SubElement(trpr, w('tblHeader'))
        if i == 0 or sub:
            for p in tr.iter(w('p')): keep_next(p)
    return t

def keep_next(p):   # schema order: pStyle, keepNext, keepLines, pageBreakBefore, ...
    ppr = p.find(w('pPr'))
    if ppr is None: ppr = etree.Element(w('pPr')); p.insert(0, ppr)
    for k in ppr.findall(w('keepNext')): ppr.remove(k)
    kn = etree.Element(w('keepNext'))
    ps = ppr.find(w('pStyle'))
    (ps.addnext(kn) if ps is not None else ppr.insert(0, kn))
    return p
```
- Build every table by cloning the reference table: keep `tblPr`, rebuild `tblGrid` widths (sum = text width,
  e.g. 9483 twips for A4 with ~2 cm margins), clone the header cell and body cells, replace text.
- Header row: bold, centred, fill 8DB3E2 (or the reference fill); single black borders.
- Field List: mandatory field name runs coloured CC0000; sub-header rows = one merged cell (`gridSpan`) bold.
- Multi-line cell text: one run per line separated by `<w:br/>`.
- Consecutive field blocks of the same module go in ONE table (do not split tables by accident).
- Put `keepNext` on the paragraph before every table and image (heading → table stays together).

## 4. Images (logos and flow diagrams)
- Clone the reference image paragraph or use `run.add_picture(path, width=Inches(w))`.
- Fit within 6.0 in wide × 8.3 in tall (keep ratio). Split very tall flows into parts.
- Cover logos: replace the reference's logo images (same size box), not added beside them.

## 5. TOC with real page numbers
1. Keep the reference TOC `sdt`. Inside `sdtContent`, keep the first paragraph's field-begin runs
   (`fldChar begin` + `instrText TOC \o "1-2" \h \z \u` + `fldChar separate`) and the last paragraph's
   `fldChar end`.
2. For each heading in order, clone a TOC1/TOC2 paragraph: hyperlink `w:anchor="_Toc<n>"`, text, tab, page
   number, and an inner `PAGEREF _Toc<n> \h` field. Put the field-begin runs before the FIRST entry only,
   iterating in document order (inserting in reverse order scrambles the field).
3. Write `headings.json` (`[[level, text, anchor], ...]`) while adding headings.
4. Save → `soffice --headless --convert-to pdf` → `python3 scripts/toc_pages.py doc.pdf headings.json pages.json`
   → rebuild with the page numbers → render again → repeat until stable (usually 2 passes).
5. Tell the user: in Word, right-click the TOC → Update Field → Update entire table.

## 6. Clean-up before saving
```python
import re
from docx.opc.constants import RELATIONSHIP_TYPE as RT
xml = etree.tostring(d.element).decode()
used = set(re.findall(r'r:(?:id|embed)="([^"]+)"', xml))
for rid, rel in list(d.part.rels.items()):
    if rel.reltype in (RT.IMAGE, RT.HYPERLINK) and rid not in used:
        d.part.drop_rel(rid)                       # drop the reference's unused images / links
for el in d.element.iter():                        # cloned paragraphs duplicate paraIds
    for a in list(el.attrib):
        if a.endswith('}paraId') or a.endswith('}textId'): del el.attrib[a]
cp = d.core_properties
cp.title = '<Client> Solution Document'; cp.author = cp.last_modified_by = '<Consultant>'
d.save(out_path)
```
- Remove reference header/footer text that names the old client; keep page numbering fields.
- Replace any reference document properties (company, subject, keywords).

## 7. Render and inspect
```bash
soffice --headless --convert-to pdf --outdir out/ out/<Client>_Solution_Document_v1.docx
pdftoppm -r 50 -png out/<file>.pdf out/pg          # contact sheet thumbnails
pdftoppm -r 110 -png -f <n> -l <n> out/<file>.pdf out/zoom
python3 <docx-skill>/scripts/validate.py out/<file>.docx --original reference.docx
```
Look at: cover, TOC, Project Information, first module (all Heading 2s), a state flow table that crosses a page,
a field list with sub-headers and red fields, a diagram page, the role matrix. Fix orphan headings, split
rows, overflowing tables, blank pages.

## Common errors seen before
- Graphviz label with `&` → syntax error. Write "and".
- `keepNext` inserted after `pageBreakBefore` → schema validation error. Insert right after `pStyle`.
- TOC entries in reverse order → iterate in order and add field-begin runs to the first entry only.
- A long heading wrapped over two lines in the PDF → page mapping fails; `toc_pages.py` matches on prefix.
- Field tables split into many small tables → merge consecutive blocks.
- Table header alone at the bottom of a page → `keepNext` on header rows plus `cantSplit`.
