# Interaction Inventory

This inventory is inferred from the inline JavaScript and CSS state selectors in the uploaded HTML. It is not a substitute for runtime testing.

## State and accessibility patterns
- Active tabs: `.is-active`, `[aria-selected="true"]`.
- Selected options: `[aria-pressed="true"]`, `[aria-checked="true"]`.
- Disabled actions: `[disabled]`.
- Answer state: `.q.is-answered`.
- Save state: `.q__meta.saving` and `.q__meta.saved`.
- Timeline states: `.tl li.is-on`, `.tl li.is-dim`.
- Journey current step: `.journey .jstep.here`.
- Toast visible state: `.toast.show`.
- Live connection states: `.live.is-shared`, `.live.is-local`, `.live.is-readonly`.

## Source function map
- Routing and views: `parseHash`, `go`, `rerender`, `renderHub`, `renderModule`, `renderWorkspace`.
- Form flow: `questionHTML`, `saveAnswer`, `wireForm`, `syncForm`, `answersText`.
- Field review: `renderFieldTabs`, `renderFieldRows`, `syncFields`, `renderExtra`.
- Process visualization: `renderProcess`, `saveJourney`, `syncJourney`, `parseJourney`, `drawLane`, `nodeHTML`, `drawEdges`, `playLane`, `stopPlay`.
- Assistant: `renderChat`, `ensureDock`, `toggleDock`, `openDock`, `closeDock`, `renderDock`, `setupAi`, `aiConvert`.
- Persistence/sync: `initStore`, `put`, `removeDoc`, `softSync`, `renderLive`.
- Feedback/export: `toast`, `copyText`, `exportAll`, `csvAll`.

## Required browser validation
1. Load the application with its expected runtime dependencies.
2. Capture each major route and all nested tabs.
3. Exercise buttons, segmented controls, forms, accordions, process steps, timeline controls, assistant dock and exports.
4. Capture hover, focus, selected, disabled, saving, saved, empty and error states.
5. Verify keyboard focus and screen-reader state attributes.
6. Confirm persistence behavior and any backend-dependent actions in the actual target environment.
