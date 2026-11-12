# UI/UX transformation directive (user, 12 Nov 2026)

Standing master directive for Delivery Studio's look and feel. Every UI session reads this first, together with `docs/design/design-reference.md` and the "Look and feel" rules in `CLAUDE.md`.

## Goal
A genuine, app-wide design and UX transformation into a premium, Apple-inspired enterprise product. Not a colour refresh, not a few dashboard cards.

## Problems to fix
- Too much information at once; tabs and sections feel cluttered.
- Main tabs, sub-tabs and mini-tabs compete visually.
- Headings look like ordinary text.
- Components are generic and repetitive; no hierarchy or composition.
- Important information does not stand out; the app is not enjoyable.
- Some screens still carry the older UI.
- Design docs and installed design skills are not reflected in the code.

## Rules
1. **Skills.** Discover the installed skills, read the relevant ones in full and follow them. Mandatory: `tastemaker`, `emil-design-eng`, `ui-taste`, `ui-ux-pro-max`. Also use the relevant ones for typography, layout, accessibility, motion, browser testing. Never claim a skill was used unless it was read and followed.
2. **Design document.** The repo's design reference is the implementation reference. Check why the code drifts from it (legacy CSS layers, hard-coded page styles, bypassed components). Reconcile, do not invent a competing system.
3. **Apple-inspired**, not an Apple copy: hierarchy, typography, whitespace, restrained colour, subtle depth, purposeful motion, minimal noise. Not "rounded cards, gradients and glass everywhere".
4. **Audit every page**, route, tab, nested tab, modal, drawer, menu and empty/loading/error/success state, top to bottom.
5. **Preserve every tab.** Never remove, hide, merge or rename tabs. Fix how they look, not how many there are. Each level gets its own visual identity:
   - main app navigation: clear, strong active state, aligned icons and labels;
   - project stage navigation: prominent, current stage obvious, inactive stages visible;
   - workspace sub-tabs: secondary, refined type, clear active indicator, not button-like;
   - mini-tabs: compact, contextual, visibly tied to their parent;
   - content actions: one obvious primary, secondary ones quiet.
   No stacked rows of identical pills. Use underlines, segmented controls, side navigation and separators as fits; don't force one pattern.
6. **Reduce overload** with progressive disclosure, never by deleting business information: summaries, expandable advanced settings, grouping, fewer cards, no nested cards, fewer badges/stats, no repeated headings or descriptions.
7. **Typography system**: page title, workspace title, section, subsection, description, body, label, metadata, helper, table header. Scannable structure; not every heading big or in a card.
8. **Components by purpose**: timelines, structured lists, tables, progress, split layouts, focused editors, diagrams, contextual toolbars. Redesign buttons, inputs, selects, tables, cards, modals, drawers, tabs, tooltips, toasts, status, search/filters, progress, empty/loading/error states, AI chat, document previews, builders.
9. **Distinct but consistent pages**: each workspace laid out for its job (overview = status/milestones/next actions; BRD = focused authoring; solution = forms, mockups, flows; UAT = test execution).
10. **AI UI** follows the same language: message hierarchy, input, thinking states, structured output, attachments, context and approval states. Not a generic messenger look.
11. **States and responsiveness**: hover, focus, active, selected, disabled, expanded, loading, success, error; subtle motion; desktop, laptop, tablet, mobile; keyboard and accessibility.
12. **Process per page**: understand, evaluate, conceptualise, design, implement, inspect in the browser, refine. Compiling is not proof of good design.
13. **Real browser verification** for every redesigned page: scroll it, open nested tabs, menus and modals, screenshots before/after, responsive widths.
14. **Preserve functionality**: APIs, data, auth, permissions, AI, integrations, routes, workflows.

## Stages
A skills and reference discovery · B full audit and page-by-page plan · C pilot pages, screenshots, approved direction · D every workspace · E final QA (every route and tab, build, tests, visual checks).

## Acceptance
All 15 criteria of the original directive: skills genuinely used, design doc applied, consistent direction, every page inspected, every tab kept and working, distinct nav levels, less overload, heading hierarchy, purposeful components, engaging pages, AI UI consistent, browser verification, responsive checks, functionality intact, build and tests run. Final report: skills used, doc findings, pages inspected, components and nav redesigned, density changes, screenshots, tests, remaining issues. Never claim untested work as done.
