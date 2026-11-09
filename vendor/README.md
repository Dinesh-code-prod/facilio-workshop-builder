# vendor: third-party libraries

Ready-made code from other people that the app loads when it needs it. Nothing here is edited by hand. Each file keeps its own licence notice at the top (or a licence file beside it).

| File or folder | What it is used for |
|---|---|
| `gsap.min.js` | GSAP, the animation timeline library behind the sign-in explainer (free under GreenSock's standard licence, https://gsap.com/standard-license) |
| `lottie_light.min.js` | Plays the small illustrations (for example the skyline) |
| `docx.iife.js`, `mammoth.browser.min.js` | Writes and reads Word files |
| `exceljs.min.js` | Reads and writes Excel files (the FTR and KPI workbooks) |
| `pdfmake.min.js`, `vfs_fonts.js`, `pdfjs/` | Makes PDFs and reads PDFs |
| `pptx-renderer.es.js` | Reads PowerPoint decks (the kick-off deck) |
| `jszip.min.js` | Opens and builds ZIP files |
| `tesseract/` | Reads text out of pictures (offline) |
| `fonts/` | The fonts, each with its licence (Carlito is the PDF body font: same widths as Calibri, SIL OFL, from Google Fonts) |

The built site must stay under 50 MB, and about half of that is this folder. Before adding a library check the size (`du -sm dist` after `node build.mjs`).
