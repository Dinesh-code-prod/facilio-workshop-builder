# Facilio Delivery Studio hand-off for Claude Desktop

A small local extension (MCP server) so that **Open in Claude Desktop** in Delivery Studio gives Claude the task, the project context, the real pictures and the document text, and lets Claude send its answer back for you to check. It uses your own Claude subscription. There is no API key, no extra hosting and no cost.

## Install (about one minute, once per person)
1. Install **Claude Desktop** (Windows or macOS) and sign in with your normal Claude account.
2. In Delivery Studio open **Project Settings & Exports > Claude Desktop extension** (or any Open in Claude panel, for example Process Whiteboard > Import from image > Use My Claude) and choose **Download facilio-delivery-studio.mcpb**. The file is saved in your Downloads folder. (Same file: `/claude/facilio-delivery-studio.mcpb` on the app.)
3. Double-click the file. Claude Desktop shows the extension and its seven tools. Choose **Install**. If it asks about permissions, there is nothing to allow: it asks for no folders and no keys.
4. Back in Delivery Studio, tick **I installed the Claude extension** in the Open in Claude panel. From now on Open in Claude Desktop sends the short hand-off prompt.
5. Test: on any Open in Claude panel choose **Open Claude Desktop**. Claude should ask to use "Facilio Delivery Studio hand-off" tools; allow them.

Nothing else needs configuring. If an administrator has turned extensions off for your Claude organisation, they have to allow this one (Claude Team and Enterprise owners control extensions).

## What happens when you click Open Claude Desktop
1. Delivery Studio builds the prompt from the page you are on and stores **one private package** (instructions, project name, expected answer, your picture or documents).
2. It creates a **hand-off reference**: a signed link that works for one hour. Claude Desktop opens with a short prompt that contains it (`claude://claude.ai/new?q=...`).
3. Claude calls the extension's tools with that reference, looks at the actual picture, reads the document text, does the task, and calls `submit_task_result`.
4. Delivery Studio picks the result up by itself, checks it with the same rules as a pasted reply, shows a preview, and saves nothing until you confirm.

## The seven tools
`get_current_task`, `get_task_instructions`, `get_task_context`, `get_attached_images`, `get_attached_documents`, `get_expected_output_format`, `submit_task_result`. Also three read-only resources (instructions, context, output format).

## Safety
- It only opens signed links on Amazon S3 or `facilio.work`; any other link is refused.
- It cannot read your files, folders or clipboard, and starts no other programs.
- No password, token or key is stored. The signed link is the only credential and it expires after one hour; closing the hand-off in Delivery Studio ends it sooner.
- A package holds only what the task needs, and only the person who clicked can collect the result (checked on the server).

## Limits (honest list)
- **Claude Desktop (and Claude Code) only.** Extensions run on your computer; Claude on the web and the phone app cannot use them. For the web, Delivery Studio puts the prompt in the link and the picture on your clipboard (paste with Ctrl+V). A web page cannot attach a file to another site.
- Claude Desktop may open with the prompt typed in but waiting: press Enter to send. Prompts over about 14,000 characters are cut by Claude Desktop, so Delivery Studio sends the short reference prompt instead.
- Pictures up to about 2.5 MB in all per hand-off (Delivery Studio shrinks large pictures first). Larger documents are sent as extracted text.
- PDF, Word and Excel files are given to Claude as extracted text plus the original as an embedded file. Whether a given Claude Desktop version can read the embedded original is not guaranteed; the text always works.
- The extension needs Node 18 or newer, which Claude Desktop includes for extensions.

## Updating
Download the new `.mcpb` from Delivery Studio and double-click it; Claude Desktop replaces the old version.

## Troubleshooting
| What you see | Do this |
|---|---|
| Claude says it has no Delivery Studio tools | The extension is not installed or is switched off: Claude Desktop > Settings > Extensions. |
| "This hand-off has expired" | Click Open in Claude again in Delivery Studio (links last one hour). |
| "Delivery Studio could not be reached" | Check the internet connection and any firewall that blocks `amazonaws.com`. |
| The page never shows a result | Ask Claude to call `submit_task_result`; or paste Claude's reply into the box under the buttons. |
| Claude Desktop does not open | It is not installed, or the browser blocked the link: use Open Claude Web. |

## For developers
`node tools/claude-mcp/build.js` packs this folder into `public/claude/facilio-delivery-studio.mcpb`. The server is `server/index.js` (stdio JSON-RPC, no dependencies). Tests: `node tests/handoff.mjs`.
