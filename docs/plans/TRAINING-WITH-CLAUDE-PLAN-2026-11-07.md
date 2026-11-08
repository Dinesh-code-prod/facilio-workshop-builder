# Training guides with Claude (plan, 7 Nov 2026)

User direction: look at the Training tab again; Claude should make the user guide, UAT guide, training guide and video script easily; fewer buttons; a way to ask Claude when something must change; the chat box should look like Project settings.

## What was there
Training guides (`src/guideslist.js`) listed five kinds with one "open" button each, spread over three menu pages (Training guides, User Guide Builder, Video to Guide). Claude could only be reached through the general chat; nothing said how to change a guide later.

## What changes (this slice)
- **One box instead of many buttons.** Training guides now has one "Ask Claude" card: pick Make a new one or Change one, pick User guide, UAT guide, Training guide or Video script, write what is needed (optional for a new one), press one button. The five open buttons became small links in "What exists".
- **Two job kinds** in `work/server/_jobs.mjs`: `make_guide` (section user, uat, training or video; recipe uses the existing task packs guide, uat, training, vidguide) and `change_guide` (section the kind, note the change). Both end in `save_draft`: an UNAPPROVED draft a person reads and approves. Nothing is overwritten. No new connector tool (still 39).
- **The chat box (Assistant panel)** is restyled in `src/ui.css` with the Project settings look: white surface, hairline borders, 12 px bubbles in neutral greys, accent only on the person's own message and the send button, no navy bar.
- Claude side in step: connector help text, Team Guide tip, Claude setup line, tests `guides_list.mjs` (request rules) and `jobs.mjs`.

## Not done (next slices)
- The finished draft is not yet turned into a User Guide Builder record by itself: a person still moves it (Deliverables & AI to the builder). A `ugd` save action through the connector would close that gap.
- User Guide Builder and Video to Guide pages are unchanged; they could fold into this page as tabs once the user confirms.
- Not checked: a real Claude run.
