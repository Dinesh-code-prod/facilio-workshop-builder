# Al Moallam BRD Academy — Extracted UI Design System

## Source and extraction scope

- Source file: `Al Moallam BRD Academy (1).html`
- File size: approximately 424 KB (424,339 characters).
- Document title: `Al Moallam BRD Academy`.
- The HTML contains two embedded CSS blocks and two embedded JavaScript blocks.
- External runtime dependency detected: Lucide UMD 0.460.0; Google Fonts (Darker Grotesque, Inter, IBM Plex Mono).
- The application builds much of its interface dynamically in JavaScript templates, so a static HTML-only scan would miss many runtime components.
- This package documents the source code as provided. It does not claim to have browser-rendered or tested every interactive state.

## Visual direction extracted from source

The stylesheet explicitly describes the interface as using the Facilio.com visual language: a framed 1240px content column, hairline side rails, hatched separators between bands, Darker Grotesque display typography, Inter body typography, and IBM Plex Mono for eyebrow labels and pill buttons. The stylesheet specifies a light-only design.

## Typography

| Role | Font stack |
|---|---|
| Display | `Darker Grotesque`, Helvetica Neue, Arial, sans-serif |
| Body | `Inter`, Helvetica Neue, Helvetica, Arial, sans-serif |
| Monospace / eyebrow / pills | `IBM Plex Mono`, ui-monospace, Consolas, monospace |

## Design tokens

| Token | Value |
|---|---|
| `--display` | `'Darker Grotesque', 'Helvetica Neue', Arial, sans-serif` |
| `--font` | `'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif` |
| `--mono` | `'IBM Plex Mono', ui-monospace, Consolas, monospace` |
| `--ink` | `#0B0B12` |
| `--text` | `#33333D` |
| `--muted` | `#6B6B78` |
| `--faint` | `#9A9AA6` |
| `--line` | `#ECECF1` |
| `--line-2` | `#DEDEE6` |
| `--page` | `#FFFFFF` |
| `--soft` | `#F7F7FA` |
| `--soft-2` | `#F1F1F6` |
| `--violet` | `#623CF6` |
| `--violet-dk` | `#4C25E0` |
| `--violet-soft` | `#F0ECFF` |
| `--orange` | `#E8690B` |
| `--orange-soft` | `#FFF2E7` |
| `--red` | `#D92D20` |
| `--red-soft` | `#FFEDEB` |
| `--cyan` | `#0891B2` |
| `--cyan-soft` | `#E4F8FD` |
| `--green` | `#12A35B` |
| `--green-soft` | `#E6F7EE` |
| `--blue` | `#1570EF` |
| `--blue-soft` | `#EAF2FF` |
| `--amber` | `#B54708` |
| `--amber-soft` | `#FFF5DD` |
| `--brand-grad` | `linear-gradient(90deg, #F2780D, #DB0000 33.3%, #480BCB 66.6%, #38D7FF)` |
| `--night` | `#0E0B1F` |
| `--text-description` | `#667085` |
| `--text-caption` | `#98A2B3` |
| `--text-link` | `#1570EF` |
| `--text-success` | `#027A48` |
| `--text-warning` | `#B54708` |
| `--text-error` | `#B42318` |
| `--bg-canvas` | `#F8F9FB` |
| `--bg-container` | `#FFFFFF` |
| `--bg-subtle` | `#F3F4F6` |
| `--bg-selection` | `#EEF4FF` |
| `--bg-primary` | `#1570EF` |
| `--bg-warning-light` | `#FEF0C7` |
| `--bg-error-light` | `#FFE4E8` |
| `--bg-success-light` | `#D1FADF` |
| `--border-subtler` | `#F2F4F7` |
| `--border-subtle` | `#E4E7EC` |
| `--border-light` | `#D0D5DD` |
| `--border-primary` | `#1570EF` |
| `--icon-success` | `#12B76A` |
| `--screen-nav` | `#1D2939` |
| `--r-sm` | `6px` |
| `--r-md` | `10px` |
| `--r-lg` | `16px` |
| `--r-xl` | `24px` |
| `--r-full` | `999px` |
| `--shadow` | `0 1px 2px rgba(11,11,18,.05), 0 12px 32px -12px rgba(11,11,18,.16)` |
| `--mint` | `#BDE7A6` |
| `--mint-soft` | `#EEF9E7` |
| `--forest` | `#007C5D` |
| `--gold` | `#F5B301` |
| `--gold-soft` | `#FFF6D6` |

Full machine-readable token list: `DESIGN_TOKENS.json`.

## Component inventory

### Application shell & navigation
Framed application shell, header/navigation, breadcrumbs, secondary navigation and footer.

`.frame`, `.pad`, `.nav`, `.nav__in`, `.nav__crumb`, `.nav__right`, `.logo`, `.foot`, `.foot__in`, `.crumbs`, `.subnav`, `.subnav__in`

### Buttons & actions
Primary, secondary/ghost, plain, compact, mint/forest variants and icon/action controls.

`.btn`, `.btn--violet`, `.btn--ghost`, `.btn--plain`, `.btn--sm`, `.btn--mint`, `.btn--forest`, `.icon-btn`, `.car-btn`, `.pbtn`, `.unit-btn`

### Typography & labels
Display typography, body lead, eyebrow labels, gradient text, pills and status badges.

`.eyebrow`, `.display-1`, `.display-2`, `.display-3`, `.lead`, `.grad`, `.pill`, `.badge`, `.status-pill`

### Cards & summaries
Module cards, summary cards, hero cards, project and score/scope surfaces.

`.card`, `.mod-card`, `.mod-card__top`, `.mod-card__foot`, `.hero-card`, `.score-card`, `.scope-card`, `.proj`, `.proj__head`

### Tabs & segmented controls
Workspace navigation, flow tabs, segmented controls, form navigation and library tabs.

`.subnav`, `.flow-tabs`, `.flow-tab`, `.seg-tabs`, `.seg-tab`, `.form-nav`, `.prep-tabs`, `.sec-tabs`, `.lib-tabs`, `.ed-tabs`

### Forms & inputs
Text inputs, question blocks, option controls, scales, checklists and form actions.

`.inp`, `.extra-form`, `.ws-form`, `.q`, `.opts`, `.opt`, `.scale`, `.check`, `.checks`, `.form-actions`

### Tables & data
Field tables, descriptions, requirement indicators, decision controls and mock application tables.

`.ftable-wrap`, `.ftable`, `.fname`, `.fdesc`, `.tpill`, `.req`, `.decide`, `.s-table`, `.uc-table`

### Workflow & process visualization
Timeline, process list/detail, stateflow, journey and diagram nodes.

`.flow`, `.tl`, `.proc`, `.proc__list`, `.proc__detail`, `.sflow`, `.journey`, `.jstep`, `.sflow`, `.sl-wrap`, `.node`, `.node__n`

### Media & learning
Preview carousel, video thumbnails, featured learning content and course cards.

`.preview`, `.car-viewport`, `.car-slide`, `.thumb`, `.vfeat`, `.vgrid`, `.vcard`, `.course`, `.course__cover`

### Notifications & overlays
Toast notifications, banners, assistant dock/chat, message bubbles and export panel.

`.toast`, `.banner`, `.dock`, `.chat`, `.msg`, `.msg__bubble`, `.export-box`

### Mock application previews
Facilio-style simulated application screens, navigation, tables, cards, tabs and mobile previews.

`.screen`, `.screen__chrome`, `.screen__body`, `.s-nav`, `.s-main`, `.s-table`, `.s-card`, `.s-tabs`, `.s-phone`

## Component conventions observed

- Button family: `.btn` with modifier variants such as `--violet`, `--ghost`, `--plain`, `--sm`, `--mint`, and `--forest`; disabled state is explicitly styled.
- Navigation: primary shell `.nav`, secondary `.subnav`, module/flow tabs and several compact tab families; active states use `is-active`, `aria-selected="true"`, or equivalent attributes.
- Form controls: `.inp` includes a focus treatment; option controls expose `aria-pressed` / `aria-checked`; question blocks have answered and saving/saved states.
- Status and decision semantics: `.req--yes`, `.req--no`, `.req--auto`, `.decide` with `data-d` values, and status/badge variants.
- Process visuals: timeline rows, selectable process steps, stateflow nodes, journey steps and connector/edge drawing functions.
- Feedback: `.toast` has a `.show` state; banners distinguish local and read-only conditions.
- Mock product UI: `.screen` family provides simulated desktop application chrome, side navigation, toolbars, tables, badges, cards, tabs and phone previews.

## Interaction and behavior inventory

JavaScript function names and event-driven rendering indicate the following interaction groups (names are source-derived; exact behavior should be confirmed in a running browser):
- Navigation/routing: `parseHash`, `go`, `rerender`, `renderHub`, `renderModule`, `renderWorkspace`.
- Form and answer persistence: `questionHTML`, `saveAnswer`, `wireForm`, `syncForm`, `answersText`, `csvAll`, `exportAll`.
- Field decisions: `renderFieldTabs`, `renderFieldRows`, `syncFields`, `renderExtra`.
- Process/journey: `renderProcess`, `saveJourney`, `syncJourney`, `parseJourney`, `drawLane`, `nodeHTML`, `drawEdges`, `playLane`, `stopPlay`.
- Learning content: `renderVideos`, `thumb`, `renderLibrary`, `playInDock`.
- Assistant/chat: `renderChat`, `ensureDock`, `toggleDock`, `openDock`, `closeDock`, `renderDock`, `setupAi`, `aiConvert`.
- Persistence and synchronization: `initStore`, `put`, `removeDoc`, `softSync`, `renderLive`.
- Feedback and utility: `toast`, `copyText`, `fallback`, `unitDone`, `modProgress`, `stats`, `nextUp`.

## CSS class reference

Extracted 312 distinct class names from static HTML and JavaScript template strings. See `CSS_CLASS_INDEX.txt` for the complete alphabetized index.

## External dependencies and missing context

- Google Fonts is loaded externally; if offline or blocked, fallback font stacks apply.
- Lucide icon library is loaded from jsDelivr; icon rendering depends on that external script.
- No external CSS stylesheet was linked in the HTML; the main styling is embedded in `<style>` blocks.
- No local asset folder was included with this upload. Any external media URLs or runtime-provided assets should be checked separately.
- JavaScript can create DOM elements and class combinations at runtime; a browser inspection is required to capture exact rendered appearance and state-specific variants.
- The source includes app-level persistence/sync abstractions. Their backend/runtime behavior cannot be fully validated from this file alone.

## Guidance for an AI coding agent

1. Read this document and `DESIGN_TOKENS.json` before implementing UI based on this source.
2. Treat the original CSS as the styling source of truth; do not approximate colors, spacing, typography or states where source rules exist.
3. Reuse component families and modifier conventions rather than inventing unrelated components.
4. Preserve semantic states and accessibility attributes (`aria-selected`, `aria-pressed`, `aria-checked`, disabled states).
5. When reproducing interactions, inspect the corresponding JavaScript functions and validate the behavior in a browser.
6. Do not assume every class in the index is a standalone reusable component; some are internal layout or state classes.
7. Do not infer missing behavior from class names alone.
