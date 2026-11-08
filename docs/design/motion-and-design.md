# Motion Kit and Facilio design resources: what was actually inspected

## Supplied and inspected
- `docs/design/motionkit/animations.json` — Facilio Motion Kit (26 animations, componentMap, combinations, vanilla/React/Vue code). The app is plain JS, so the **vanilla** code is used.
- NOT supplied: `llms.txt`, `map.html`, `components.html` (the JSON contains the same componentMap, usage rules and combinations).
- https://icons.facilio.run — a catalogue of the official Facilio icon library (1,599 icons in 67 groups; static SVGs at `icons.facilio.com/icons/svg/<group>/<name>.svg`; 10 animated Lottie icons in group `animated-icon`: ai-star, loader and 8 arrows). It is not an animator: nothing is created or exported there.
- Figma connector: connected (account dinesh.r, team plan). No design file or FDS library link has been given yet.
- FDS tokens: the kit only names alias tokens (`--colors-textMain`, `--colors-backgroundPrimaryDefault`, `--spacing-containerLarge`, `--border-large`, ...). Their VALUES are not in the kit, so none are defined in the app yet. The kit's literal hex values (#1570EF, #101828, #E4E7EC, #EEF4FF, #667085, #1D2939) differ from the app's current brand blue (#0a7aff).

## Applied (src/animation/motion.js + end of styles.css)
| Kit id | Component in the app | Notes |
|---|---|---|
| intro | first 10 blocks of every page, project cards on the project list | plays on route change (and on a re-render within 0.9 s of it) |
| list | table rows (up to 80) | capped stagger, as in the kit |
| drawer | `V.drawer` side panels | `is-open` class, slide + scrim fade; closing waits 0.3 s |
| modal | `V.confirmDialog` | grow + fade |
All have the kit's `prefers-reduced-motion` fallback.

## Applied later (end of styles.css)
| Kit id | Where | Notes |
|---|---|---|
| popover | `.menu`, account popover | morph from a dot at the top-right corner, kit easing and duration |
| tabs | active tab underline | draws in on the newly active tab. A sliding underline between tabs needs a persistent element and the shell re-renders, so this is the nearest fit |
| micro | custom checkbox, `.switch` knob | kit easing; values are the kit's literals, not FDS alias tokens |

## Mapped, not yet applied
slidenav, sidebar collapse, accordion, bulk bar, sticky header, reorder, movein: the app has no matching component yet (no collapsible sidebar, bulk selection bar, drag reorder), so nothing was added for them. These use FDS alias tokens in their CSS, so they wait for verified token values. No ECharts is used in the app and pivots are plain tables, so no chart animations apply.

## Verified live
Drawer opens, slides and closes; entrance animation plays and ends at full opacity (the browser pane only advances animations once it has been painted, e.g. after a screenshot).
