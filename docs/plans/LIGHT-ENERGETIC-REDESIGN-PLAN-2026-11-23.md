# Light, energetic and interactive redesign: plan (23 Nov 2026)

The user's brief: a light, energetic, interactive Delivery Studio. Task management like a modern project board, and a Stateflow builder like a node editor (white dotted canvas, left toolbox, right properties panel, straight arrows). Everything existing stays: tabs, data, statuses, rules, APIs, permissions. Extends `UI-TRANSFORMATION-DIRECTIVE-2026-11-12.md` (keep every tab, progressive disclosure) and the calm pass of 23 Nov.

Status: plan only. Nothing built yet. Four sample pages come first (dashboard, task board, calendar, Stateflow builder), then the rest after review.

## 1. What already exists (reuse, do not rebuild)

| Area | Today | File |
|---|---|---|
| Project dashboard | Calm top (23 Nov): status line, three tint tiles, Do next, stage bar; charts behind a fold | `src/dashboards.js`, `src/stagedash.js` |
| Tasks | One task register per project; List (spreadsheet with saved sheets) and Board (kanban with native drag and drop); drawer with AI assistant; Excel import and export | `src/tasks.js` |
| Task statuses | To Do, In Progress, Blocked, Awaiting Customer, Awaiting Internal Input, In Review, Done, Cancelled (server checks them) | `src/tasks.js:15`, `work/server/api.mjs:1029` |
| Calendar | Day, Week, Month and Year from the plan, sessions, UAT and go-live dates, actions, sign-offs and team reminders (kind `cal`) | `src/plancal.js` |
| Stateflow builder | Toolbar, SVG canvas, sidebar; states and transitions (Before, During, After); zoom and fit; workshop edits kept as a copy of the source flow | `src/flowbuilder.js`, `D.flowSvg` |
| Design system | One set of buttons and components at the end of `src/ui.css`; reference tokens in `docs/design/reference-theme/` | `src/ui.css` |

The app is plain JavaScript bundled by esbuild. There is no React, no Tailwind and no runtime dependency.

## 2. The five libraries (checked on npm, 23 Nov 2026)

| Library | Version, licence | Needs | Fit here | Recommendation |
|---|---|---|---|---|
| shadcn/ui | 4.23.0, MIT | React, Tailwind, Radix | No: it copies React components into the app | Take its look (radii, states, focus rings, spacing) into the existing "Components, one set" CSS; add no dependency |
| React Flow (`@xyflow/react`) | 13.0.2, MIT | React 18+ | Only as a React island inside one page | Option A (recommended): upgrade our own SVG builder to the node-editor look. Option B: a React island for the builder only (+React, about 50 KB gzip, a second way of building UI). The user decides |
| FullCalendar (standard) | core 7.1.5 / plugins 6.1.22, MIT | none (vanilla JS works) | Yes | Optional. Our calendar already draws real data in four views. FullCalendar adds drag to reschedule and resize. If adopted: pin core and plugins to the same 6.1.x line, use daygrid, timegrid, list and interaction only. Never `resource-*` or `scheduler` (premium licence) |
| Motion | 14.14.0, MIT | React only for the React API; `animate()` works without it | Yes (vanilla `animate`) | Optional. The app already has CSS transitions with one easing. Use Motion's `animate()` only where CSS cannot (number count-ups, layout changes when a card moves column) |
| dnd-kit | 6.3.1, MIT | React | No | Keep native drag and drop on the board; add SortableJS (1.15.7, MIT, no dependencies) only if touch and keyboard dragging are needed |

All of the above are free; no paid component subscription or outside API is involved.

## 3. Decisions (user, 23 Nov 2026: "Yes, use them", the recommendations below)

Purple only as a second accent for AI and Stateflow; the night scenes become light; Stateflow stays our own builder (option A); the screenshots are still to come, so the samples follow the written brief until then.

### As asked

1. **Purple.** The brief asks for blue and purple accents. The standing rule (CLAUDE.md, 19 Nov) says no violet or purple. Proposal: purple as a second accent for AI and Stateflow items only, Facilio blue stays the main action colour.
2. **Dark art that stays today.** The projects home has a night-city banner and the sign-in page a night scene, both kept on purpose. The brief says no dark backgrounds. Lighten them, or keep them as the only exceptions?
3. **Stateflow builder: option A or B** (section 2).
4. **Reference screenshots.** The brief mentions two attached screenshots; they did not come through. Please attach them again (or name the products) before the sample pages are drawn.

## 4. Task board (sample 2)

- Columns are the existing statuses, never new ones. Board view: To Do, In Progress, Blocked, Waiting (Awaiting Customer and Awaiting Internal Input as one column with a chip saying which), In Review, Done; Cancelled hidden behind a toggle. "Backlog" and "Shipped" from the brief map to To Do and Done; no status is added.
- Cards: white with a coloured left label for the task type, priority chip (red, orange, yellow, grey), assignee avatars, due date (red when late), a two-line description, a progress bar when the task has a checklist, comment and attachment counts. Hover lifts the card; a dragged card tilts slightly and the target column lights up.
- Add task at the bottom of every column; search and filters (owner, priority, type, due) above the board, shared with the List view.
- Views: Board, List (today's sheet), Calendar (tasks on their due date, from `plancal`), Activity (who changed what, from the change log already kept per record).

## 5. Calendar (sample 3)

- Keep `plancal` data sources. New look: white grid, today in a Facilio-blue circle, overdue items with a red edge, one colour per category (milestone, task deadline, meeting, training, UAT, activity) and a legend.
- Click an event: a side panel with its details and a link to the record. Create and edit: the existing team reminder (kind `cal`); plan items open their own page.
- Month, Week and Day stay; Year stays as it is.

## 6. Stateflow builder (sample 4)

- Top toolbar: breadcrumb (Module, Flow name), save state (Saved, Saving, Not saved), search states, Test flow, Publish flow (publish = mark the workshop copy ready; no new server action until the user agrees).
- Left toolbox: states, triggers, actions, conditions, as the flow model already knows them; drag one onto the canvas.
- Canvas: white with a dotted grid, pan by drag and zoom by wheel (today: buttons only), straight arrows with arrowheads, node selection with a blue ring, groups shown as light frames.
- Right panel: the selected state or transition: fields, Before / During / After, conditions and actions, validation messages, Save and Test.
- The flow data model, transitions and conditions stay as they are; the canvas only reads and writes the same records.

## 7. Dashboard (sample 1)

The calm top of 23 Nov stays. Add energy without words: coloured stage chips, a count-up on the three tiles, task cards in Do next with the same look as the board.

## 8. Order of work and checks

1. User answers section 3 and resends the screenshots.
2. Build the four samples in the real app (not mock-ups), each behind its existing tab.
3. Review with the user; adjust.
4. Roll the design system across the remaining pages, one stage at a time, keeping every tab.
5. Each step: `npm test`, the UI sweep (`tests/ui/ref-theme-sweep.mjs`), drag and drop on the board, calendar events against real data, a Stateflow round trip (add state, add transition, save, reload, compare), widths 1920, 1366, 768 and 390, and a search for any gradient or dark background.
