# Process Whiteboard: control check (4 Nov 2026)

Controls and feel only: there is **no connection to Miro**. Method: `tests/ui/wb-controls-check.mjs` drives a new board with the real mouse and keyboard on localhost (74 controls), plus the five older whiteboard checks. Status: **ok**, **PARTLY**, **BROKEN** (exists but fails), **BROKEN?** (failed once, not yet diagnosed), **MISSING**, **unchecked** (my test was wrong, re-run needed).

Counts after corrections: 37 ok, 27 MISSING, 5 unchecked, 2 BROKEN?, 2 PARTLY, 1 BROKEN.

Older checks run the same day: whiteboard-editing 20/20 ok, whiteboard-hover-delete 27/27 ok, whiteboard-miro-check 2 fail (pen stroke, Save as combined flow), wb-align-check and whiteboard-check stop with an error or timeout (not diagnosed).

A stored `miro` link field exists on a board (`src/whiteboard.js`, accepts only https://miro.com/ URLs) but nothing on screen uses it. Leave or remove: ask first.


## Canvas

| Control | Status | Note |
|---|---|---|
| Hand tool (H) pans the board | BROKEN? | The Hand tool gets selected but dragging did not move the view; Space + drag does. Needs diagnosis. |
| Space + drag pans | ok |  |
| Ctrl + wheel zooms | ok |  |
| Plain wheel pans | ok |  |
| Zoom buttons (+, −) and 100% reset | ok |  |
| Zoom keys + and − on the keyboard | MISSING |  |
| Fit to content (button and Shift+F) | ok |  |
| Zoom to selection | MISSING |  |
| Mini-map | MISSING |  |
| Grid on or off and snap to grid | ok |  |
| Background choices (dots, lines, none) | MISSING |  |

## Create

| Control | Status | Note |
|---|---|---|
| Sticky note (N) | ok |  |
| Rectangle (R) | ok |  |
| Oval (O) | ok |  |
| Shapes menu: diamond, triangle, input/output, hexagon | ok |  |
| Frame (F), dragged out | ok |  |
| Text (T): click, type | BROKEN? | On an empty board the Text tool click made no text box. Needs diagnosis (my test ended with Escape, which cancels). |
| Pen (P): freehand stroke | BROKEN | Draws nothing. Also fails in whiteboard-miro-check ("the pen draws a freehand stroke"), so it is likely a real bug. |
| Eraser tool | MISSING |  |
| Highlighter | MISSING |  |
| Icons or emoji stamps | MISSING |  |
| Image: import from image, reference images | ok |  |
| Paste or drop an image straight onto the board | MISSING |  |

## Connectors

| Control | Status | Note |
|---|---|---|
| Arrow (L): drag from one shape to another | ok |  |
| Elbow arrow | ok |  |
| Two-way arrow and plain line | ok |  |
| Line follows when a shape moves | ok |  |
| Pick a line: bar with straight / right-angle, arrowheads, label | unchecked | The test clicked the middle of the path box, not on the line. Re-run with a point on the line. |
| Drag a line end onto another shape | ok | ok by whiteboard-editing |
| Visible connection points on a shape | MISSING |  |
| Curved lines | MISSING |  |

## Select

| Control | Status | Note |
|---|---|---|
| Click selects, Escape clears | ok |  |
| Shift + click adds | ok | Test mistake: Playwright cannot hold Shift in mouse.click. whiteboard-hover-delete passes "Shift+click adds to the selection". |
| Drag a box on empty canvas (marquee) | ok |  |
| Select all (Ctrl+A) | ok |  |
| Drag to move | ok |  |
| Arrow keys nudge (Shift for a bigger step) | ok |  |
| Resize | PARTLY | one corner handle only (bottom right), no side handles, no proportion lock |
| Rotate | MISSING |  |
| Select all of one type | MISSING |  |
| Alignment guides while dragging (snap to other shapes) | ok |  |

## Format

| Control | Status | Note |
|---|---|---|
| Selection bar: fill, font size, bold, text colour, alignment | unchecked | whiteboard-miro-check passes this ("fill, font size and bold from the bar"). My run clicked a shape that had moved. Re-run. |
| Fill colour applies | unchecked | Same as above. |
| Border colour, line width or dash | MISSING |  |
| Opacity | MISSING |  |
| Font family | MISSING |  |
| Italic, underline, bullet lists in text | MISSING |  |

## Arrange

| Control | Status | Note |
|---|---|---|
| Copy and paste (Ctrl+C, Ctrl+V) | ok |  |
| Duplicate (Ctrl+D) | ok |  |
| Alt + drag duplicates | MISSING |  |
| Group and ungroup (Ctrl+G, Ctrl+Shift+G) | ok |  |
| Lock and unlock | ok |  |
| Align (several shapes) | ok | options: l,c,r,t,m,b,dh,dv |
| Right-click menu: bring to front, send to back | ok | items: edit,copy,dup,front,back,del |
| Layer shortcuts (Ctrl+] and Ctrl+[) | MISSING |  |
| Delete (Del) with confirmation for many | ok |  |
| Distribute evenly, flip, equal-spacing guides | PARTLY | Distribute exists (the Align menu has dh and dv). Flip and equal-spacing guides are missing. |

## Undo

| Control | Status | Note |
|---|---|---|
| Undo and redo (buttons, Ctrl+Z, Ctrl+Shift+Z) | ok |  |

## Text

| Control | Status | Note |
|---|---|---|
| Double-click a shape to edit its text (Escape cancels) | unchecked | Not confirmed: whiteboard-editing and the right-click menu offer Edit text. Re-run with the real selector. |

## Shortcuts

| Control | Status | Note |
|---|---|---|
| Tool keys V H N T L P R O F S | ok |  |
| Shortcut help panel (?) | MISSING |  |
| No shortcut fires while typing in a box | unchecked | Test mistake (the rename dialog re-rendered). Re-run. |

## Share

| Control | Status | Note |
|---|---|---|
| Export the board as PNG and JPG | ok |  |
| Export the selection only | ok |  |
| Export as PDF or SVG | MISSING |  |
| Print | MISSING |  |

## Review

| Control | Status | Note |
|---|---|---|
| Comments on items | MISSING |  |
| Presentation mode (walk through frames) | MISSING |  |
| Version history and restore | MISSING |  |
| Live cursors and presence | MISSING |  |

## Find

| Control | Status | Note |
|---|---|---|
| Search text on the board | MISSING |  |
| Outline or list of frames | MISSING |  |

## Facilio

| Control | Status | Note |
|---|---|---|
| Add State Flow, Describe with AI, Import from image, Save as state flow, Combined flows | ok |  |

## Device

| Control | Status | Note |
|---|---|---|
| Every toolbar button has a name (screen readers) | ok |  |
