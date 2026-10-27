# Design reference: the delivery lead's Claude artifact (27 Oct 2026)

Sources inspected:
- **Attached HTML export** "Silal Implementation Studio" (same design system). Fonts, colours, radii, shadows and component rules below were **read from its CSS**, not estimated.
- **Live artifact** "Al Moallam Implementation Academy" (claude.ai link), opened signed-in in the browser pane and walked tab by tab: Overview, Know your contract, Project plan, Kick-off, Workshop calendar, UAT, Go-live. Its content runs in a sandboxed cross-origin frame, so its CSS could not be read directly; layout notes for those tabs come from screenshots.

## Verified tokens (from the export's `:root`)
| Token | Value |
|---|---|
| Display font | Plus Jakarta Sans 700–800, negative tracking (-0.6 to -1.6px) |
| Text font | Inter 400–700, `cv11`, `ss01` |
| Mono font | IBM Plex Mono 400–600 (eyebrows, table headers, labels, dates) |
| Ink / text / muted / faint | #120B2E / #2B2645 / #6B6785 / #9A97AE |
| Lines / soft surfaces / page | #E7E5F0, #D9D6E6 / #F6F5FB, #EDEBF6 / #FBFAFE |
| Accents | violet #623CF6 (hover #4B23E0, soft #EFEBFF), orange #F26B1D, green #12A35B, red #D92D20, amber #B54708, cyan #0891B2, pink #C11574 |
| Night (hero) | #0F0B24, #1C1640, mint eyebrow #7CF3C6, gradient violet → purple → orange |
| Radii | 6 / 10 / 16 / 22 / full (999) |
| Shadows | sh-1 `0 1px 2px rgba(18,11,46,.05), 0 1px 1px rgba(18,11,46,.03)`; sh-2 `0 10px 30px -12px rgba(18,11,46,.18)` |

## Patterns observed per tab and where they are used in Delivery Studio
| Artifact tab | Pattern | Delivery Studio |
|---|---|---|
| All | Light editorial header: mono eyebrow, 40px display title, muted lead, actions right | Every page header (crumb is the eyebrow) |
| All | Pill buttons; segmented pill tabs; chips with dot; mono uppercase table headers | Global (`src/theme.css`) |
| Overview | "Up next" night band with calendar tiles | Project Overview (`V.homeExtra`, src/timeline.js) |
| Overview | "Who owes what": two columns with organisation tile, open actions with due dates | Project Overview, from governance actions |
| Overview | "Upcoming activities" with date tiles | Project Overview, next 45 days |
| Project plan | KPI strip (Planned / Actual / Variance / Go-live) in one split card | Plan Timeline |
| Project plan | Single plan grid: night header, task + mono owner, days, start, end, status chip, plan %, actual %, variance, bars, collapsible phases, today marker | Plan Timeline (replaces the separate task table and Gantt) |
| Project plan | S-curve with filled area and labelled planned / actual points | Plan Timeline |
| Project plan | Numbered findings with coloured edge (Status, Biggest gaps, Critical path) | Plan Timeline: Status, Biggest gaps, Overdue (no critical-path data exists, so that card is "Overdue") |
| Know your contract | Key-value cards: mono label column, bold value | Contract → Know Your Contract (`.kc-f`) |
| Workshop calendar | Session cards with coloured top edge and mono session number | Session distribution cards (`.session-card`) |
| UAT, Go-live | Section eyebrow + display H2; plan rows filtered to the stage | Headings restyled; stage filtering not added |
| Kick-off | Deck slides inside a dark bezel | Not adopted (Kick-off Deck keeps its viewer) |
| What's New | Announcements, "I'm interested" | Not built yet (Customer Showcase) |

Not copied: the artifact's horizontal tab bar (the user asked to keep the current sidebar structure), its slide bezel, and Smartsheet sync (no connection).
