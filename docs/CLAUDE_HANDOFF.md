# Open in Claude: one hand-off for every button (2 Nov 2026)

What changed, why this design, what was tested, and what still needs a person. Written after reading the official Claude documentation (links at the end) and the code.

## 1. Architecture map (before the change)
| Where | What it did | Problem |
|---|---|---|
| `V.claudeHandoff` (`claudeimport.js`) used by Whiteboard (image, describe), Tasks (classify), Guide sections, Portfolio brief, Kick-off deck | prompt from the server, copy it, open claude.ai, paste the reply back | no file travelled; each caller built its own links |
| Deliverables & AI (`lifecycle.js`) | its own copy of the same steps and its own links | duplicate logic |
| Task assistant and transcript extraction (`tasks.js`) | two more copies | duplicate logic |
| Org package review (`orgpkgview.js`), project review (`claudeimport.js`), video guide brief (`studio.js`) | three more copies | duplicate logic, a 130,000-character prompt was simply copied |
All of them hard-coded `https://claude.ai/new` and `claude://claude.ai/new`, none put the prompt in the link, none could give Claude a picture, a PDF, a Word or an Excel file.

## 2. Feasibility (what the official documentation says, checked 2 Nov 2026)
1. **Claude Desktop deep link**: `claude://claude.ai/new?q=…` prefills the message box; the text is truncated at roughly 14,000 characters; values must be URL-encoded. Chat links accept **no files**. (`file=` exists only for Code and Cowork sessions and needs absolute local paths, which a web page cannot know.)
2. **Local MCP**: a desktop extension (`.mcpb`: a zip with `manifest.json` and a Node server, manifest spec 0.3) runs on the person's computer and is available **only in Claude Desktop and Claude Code**, not on the web or phone. It can return real images to Claude.
3. **Remote MCP / custom connectors**: work on every surface, but Claude connects **from Anthropic's cloud**, so the server must be reachable from the public internet; on Team and Enterprise plans only an Owner can add a custom connector. The platform's own app MCP (`mcp.facilio.work/facilio-delivery-studio`) is such a connector already, but it returns JSON text, not images.
4. **No API key or API billing** is involved in any of these; they use the person's own Claude subscription.
5. **Not possible**: a web page attaching a file to another site; local MCP serving Claude on the web.

## 3. The three options
| | A. Local MCP only | B. Remote MCP (hosted) | C. Hybrid hand-off (chosen) |
|---|---|---|---|
| How | extension fetches data from Delivery Studio | Claude's cloud calls a hosted server | Delivery Studio makes one signed package per click; deep link carries only the reference; the local extension opens it |
| Authentication problem | The app sits behind company sign-in (Entra); a local program has no browser session | OAuth sign-in works, but images are not returned as images by the platform connector | The signed link made for that click is the credential; it expires in one hour |
| Pictures and documents | yes (real image content) | text only | yes (real image content) |
| Claude on the web | no | yes | no (prompt in the link + picture on the clipboard) |
| Installation | one `.mcpb` double-click per person | owner adds a connector, each person signs in | one `.mcpb` double-click per person |
| Hosting and cost | none | needs a publicly reachable server | **none**: uses the platform's file storage |
| Security | needs a stored token | OAuth | no stored secret; one-hour capability links |

**Decision: C.** It is the simplest and cheapest, it solves the sign-in problem without storing any credential, and it is the only option that gives Claude real pictures. Claude on the web keeps the existing path, plus honest limits. If seamless web access is wanted later, the platform's own connector can be extended with a `get_handoff` tool (text only); nothing in this design blocks that.

## 4. What was built
- **Server** (`work/server/api.mjs`): `POST /api/projects/:id/handoff` stores one private package (instructions, project and customer name, module, expected answer, pictures and documents, and a signed upload link for the answer) and returns a signed reference valid for one hour. `GET /api/projects/:id/handoff/:id` returns the answer when it has arrived; `DELETE` closes the hand-off. Only the person who made it can collect the answer; files are type-checked by their first bytes; about 2.5 MB of files per hand-off; the package and the answer file are deleted on expiry or close; every hand-off is in the audit log; editors only (not viewers, not customers).
- **Shared rules** (`src/claudelogic.js`): a prompt goes in a link only if its encoded length fits (6,500 characters for the web, 7,500 for Desktop); a longer prompt is **never cut**: it is copied, or carried as a package. The short reference prompt. The common header on every prompt (who is asking, which project, page, module, task, what happens to the answer).
- **One engine** (`src/claudehand.js`): `V.claudeHandoff` (panel with a reply box) and `V.claudeLaunch` / `V.claudeOpenSimple` (open Claude). Every button in the app now goes through it; no other file contains a Claude link. With the extension ticked, Open Claude Desktop sends the short reference prompt and the page collects the answer by itself (it checks every four seconds while the panel is open); otherwise it behaves as before, with the honest limits stated.
- **Local extension** (`tools/claude-mcp`, packaged to `public/claude/facilio-delivery-studio.mcpb`, no dependencies): tools `get_current_task`, `get_task_instructions`, `get_task_context`, `get_attached_images` (real image content), `get_attached_documents` (extracted text plus the original as an embedded file), `get_expected_output_format`, `submit_task_result`; resources for instructions, context and output format. It only opens signed links on Amazon S3 or facilio.work, has no tool for the disk, stores nothing, refuses expired packages and caps sizes.
- **Whiteboard**: Import from image sends the original file (or a 1600 px copy if over 2.4 MB) to the extension; Describe with AI sends its prompt and the expected diagram shape.
- DeepSeek stays the default provider for every in-app AI feature; none of this calls Claude's API.

## 5. Employee installation
**Where to get it:** Project Settings and Exports > **Claude Desktop extension** (the file is `facilio-delivery-studio.mcpb`), or the **Download** and **Where and how to install it** buttons in any Open in Claude panel. **Where to install it:** in the Claude Desktop app on the own computer of each person (not a browser, not claude.ai, not the phone app): double-click the file, or drag it onto the Extensions screen of Claude Desktop (Settings > Desktop app > Manage next to Extensions in newer versions), choose Install, then tick "I installed the Claude extension" in Delivery Studio. Full steps, update and troubleshooting: `tools/claude-mcp/README.md`. The Claude Desktop menu names are taken from the Anthropic help pages and can differ by version; this was not checked on a real Claude Desktop.

## 6. Testing report
| Test | Result |
|---|---|
| `tests/claude_launch.mjs` (6): link limits, encoding of special characters and Unicode, no silent cutting, reference prompt, common header | passed |
| `tests/work_adapter.mjs` new case: package contents, file checks (wrong type, wrong first bytes, too large, empty task), viewer refused, answer collected only by the creator, invented id, expiry deletes files, close, audit | passed |
| `tests/handoff_mcp.mjs` (8): the extension over stdio: handshake, seven tools, real image content, document text, resources, result upload, allowlist (other hosts, file://, plain http refused), expiry, bad JSON, packaged zip equals the source | passed |
| `tests/handoff_e2e.mjs` (6): the **packaged** extension unpacked as Claude Desktop would, against the preview server standing in for signed storage: make a hand-off, read the task, see the picture, send a diagram, receive it, run it through the normal reply checks, close it | passed |
| Browser (preview server): Whiteboard import panel with the three buttons and download link; web launch opens `claude.ai/new?q=` with the full prompt and puts the picture on the clipboard; extension on: the Desktop link is 496 characters with only the reference; the package holds the picture and instructions; an answer put to the signed link was collected by the page by itself and showed the review | passed |
| Regression: `npm test` (all existing suites) | passed |

## 7. What is NOT verified, and what needs someone
- **Claude Desktop itself was not driven.** I did not install Claude Desktop, so these are unverified: that `claude://…?q=` prefills the box on your Windows build, that Claude Desktop accepts the extension and shows the tools, that it uses the embedded PDF / Word / Excel original (the extracted text always works), and how it behaves with a long prompt. The protocol side was tested by playing Claude's part over the same stdio protocol.
- **Real signed storage was not exercised**: the platform's `ctx.files.url` and `uploadUrl` were stood in for by the preview server. First live test: make one hand-off on the live app and check that the extension can read it and that the answer comes back. If the platform's signed links turn out to forbid a plain PUT, the answer falls back to pasting into the box.
- **Claude on the web**: prompt in the link and the picture on the clipboard; a page cannot attach the file, so one Ctrl+V remains. No local access is claimed.
- **Needs an administrator**: on Claude Team or Enterprise an owner must allow desktop extensions for the organisation.
- **Needs each employee**: install the extension once and tick the box.
- **Needs remote hosting**: only seamless Claude Web access to files. Not built, because it would need a connector Anthropic's cloud can reach and, for pictures, a server that returns real image content.
- Documents over about 2.5 MB in all are sent as extracted text only; files are not retrieved from the project's file store, only from what the page hands over at the click.

## Sources
Open Claude Desktop with a link: https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link · When to use desktop and web connectors: https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors · Custom connectors using remote MCP: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp · MCPB manifest: https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md
