#!/usr/bin/env python3
"""
toc_pages.py - map each document heading to its page number in a rendered PDF, so the cached
TOC entries (TOC1/TOC2 + PAGEREF) can carry real page numbers.

  soffice --headless --convert-to pdf --outdir <dir> <document.docx>
  python3 toc_pages.py <document.pdf> <headings.json> <pages_out.json> [--start "PROJECT INFORMATION"]

headings.json : [[level, "Heading text", "_Toc_anchor"], ...] in document order
                (write it from the build script while adding headings).
pages_out.json: {"_Toc_anchor": page_number, ...}

Search starts at the first page whose line equals --start (default "PROJECT INFORMATION"), so the TOC
pages themselves are skipped. Long headings that wrap are matched on their first 40 characters.
Rebuild the document with these numbers, render again and repeat until the numbers stop changing
(adding page numbers can shift pages by one). Requires poppler-utils (pdfinfo, pdftotext).
"""
import json, re, subprocess, sys


def main():
    pdf, hfile, out = sys.argv[1], sys.argv[2], sys.argv[3]
    start = sys.argv[sys.argv.index('--start') + 1] if '--start' in sys.argv else 'PROJECT INFORMATION'
    heads = json.load(open(hfile))
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    n = int(re.search(r'Pages:\s+(\d+)', info).group(1))
    norm = lambda s: re.sub(r'\s+', ' ', s).strip()
    pages = []
    for i in range(1, n + 1):
        txt = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), '-layout', pdf, '-'],
                             capture_output=True, text=True).stdout
        pages.append([norm(l) for l in txt.splitlines() if l.strip()])
    cur = next((i for i in range(n) if any(l == norm(start) for l in pages[i])), 0)
    res, miss = {}, []
    for lvl, text, anchor in heads:
        t = norm(text)
        hit = None
        for i in range(cur, n):
            if any(l == t or (l.startswith(t) and len(l) < len(t) + 4) or (len(t) > 45 and l.startswith(t[:40]))
                   for l in pages[i]):
                hit = i
                break
        if hit is None:
            miss.append(text)
            continue
        res[anchor] = hit + 1
        cur = hit
    json.dump(res, open(out, 'w'), indent=1)
    print(f'mapped {len(res)} of {len(heads)} headings; total pages {n}')
    if miss:
        print('NOT FOUND (check wording / wrapping):', *miss, sep='\n  - ')


if __name__ == '__main__':
    main()
