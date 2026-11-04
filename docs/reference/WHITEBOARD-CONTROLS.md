# Process Whiteboard: control check (4 Nov 2026)

Controls and feel only: there is **no connection to Miro**. Method: `tests/ui/wb-controls-check.mjs` drives a new board with the real mouse and keyboard on localhost (74 controls), plus the older whiteboard checks (whiteboard-editing 20/20, whiteboard-hover-delete 27/27 pass).

Counts: 50 ok, 23 MISSING, 1 PARTLY.

**Added on 4 Nov 2026 (deploy 147):** zoom keys (+ and -), Shift+1 fit all, Shift+2 zoom to selection (and a Sel button), a shortcut help panel (? key and a ? button), Ctrl+] and Ctrl+[ to bring to front and send to back, Alt + drag to duplicate, Enter or F2 to edit a shape's text. Pen, Hand and Text tools work (an earlier worry was my test drawing below the board).

Board size: a **Full screen** button (Ctrl+Shift+F) and a **New tab** button (deploy 145).

A stored `miro` link field exists on a board (`src/whiteboard.js`) but nothing on screen uses it. Leave or remove: ask first.


## Canvas

| Control | Status | Note |
|---|---|---|
| Hand tool (H) pans the board | ok |  |
| Space + drag pans | ok |  |
| Ctrl + wheel zooms | ok |  |
| Plain wheel pans | ok |  |
| Zoom buttons (+, −) and 100% reset | ok |  |
| Zoom keys + and − on the keyboard | ok |  |
| Fit to content (button and Shift+F) | ok |  |
| Zoom to selection | ok |  |
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
| Text (T): click, type | ok |  |
| Pen (P): freehand stroke | ok |  |
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
| Pick a line: bar with straight / right-angle, arrowheads, label | ok (by hand) | Worked on a fresh board: the bar offers straight and right-angle, arrowheads and a label. The inventory row fails because of leftover state from earlier rows; fix the test. |
| Drag a line end onto another shape | ok | ok by whiteboard-editing |
| Visible connection points on a shape | MISSING |  |
| Curved lines | MISSING |  |

## Select

| Control | Status | Note |
|---|---|---|
| Click selects, Escape clears | ok |  |
| Shift + click adds | ok |  |
| Drag a box on empty canvas (marquee) | ok |  |
| Select all (Ctrl+A) | ok |  |
| Drag to move | ok |  |
| Arrow keys nudge (Shift for a bigger step) | ok |  |
| Resize | PARTLY | One corner handle only (bottom right), no side handles, no proportion lock. |
| Rotate | MISSING |  |
| Select all of one type | MISSING |  |
| Alignment guides while dragging (snap to other shapes) | ok |  |

## Format

| Control | Status | Note |
|---|---|---|
| Selection bar: fill, font size, bold, text colour, alignment | ok (by hand) | Worked on a fresh board: fill, font size, bold, text colour, alignment, lock, duplicate, export, delete. Inventory row needs a state fix. |
| Fill colour applies | ok (by hand) | Worked on a fresh board (fill changed to the chosen colour). Inventory row needs a state fix. |
| Border colour, line width or dash | MISSING |  |
| Opacity | MISSING |  |
| Font family | MISSING |  |
| Italic, underline, bullet lists in text | MISSING |  |

## Arrange

| Control | Status | Note |
|---|---|---|
| Copy and paste (Ctrl+C, Ctrl+V) | ok |  |
| Duplicate (Ctrl+D) | ok |  |
| Alt + drag duplicates | ok |  |
| Group and ungroup (Ctrl+G, Ctrl+Shift+G) | ok |  |
| Lock and unlock | ok |  |
| Align (several shapes) | ok | options: l,c,r,t,m,b,dh,dv |
| Right-click menu: bring to front, send to back | ok | items: edit,copy,dup,front,back,del |
| Layer shortcuts (Ctrl+] and Ctrl+[) | ok |  |
| Delete (Del) with confirmation for many | ok |  |
| Distribute evenly, flip, equal-spacing guides | MISSING |  |

## Undo

| Control | Status | Note |
|---|---|---|
| Undo and redo (buttons, Ctrl+Z, Ctrl+Shift+Z) | ok |  |

## Text

| Control | Status | Note |
|---|---|---|
| Edit the text of a shape: select it, press Enter or F2 (Ctrl+Enter or a click away saves, Escape cancels) | ok | Enter and F2 open the editor. A double-click on a shape does not open it reliably in an automated browser (the shape is redrawn between the clicks); not changed, to keep group selection working. |

## Shortcuts

| Control | Status | Note |
|---|---|---|
| Tool keys V H N T L P R O F S | ok |  |
| Shortcut help panel (?) | ok |  |
| No shortcut fires while typing in a box | ok |  |

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
