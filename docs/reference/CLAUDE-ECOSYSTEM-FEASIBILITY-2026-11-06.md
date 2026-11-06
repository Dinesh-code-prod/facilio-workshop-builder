# Claude ecosystem integration: feasibility study (6 Nov 2026)

Research only; nothing was built. Sources are Anthropic's own docs unless marked "secondary". None of the doc pages show a publication date; all were read on 2026-11-06. Anything not confirmed is marked **UNVERIFIED**.

## 1. The finding that decides the architecture

| Question | Evidence | Verdict |
|---|---|---|
| Each employee signs in to the **unmodified Claude Code** with their own seat | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance): allowed | **Fully possible**, on their own machine or Anthropic's own surfaces |
| A **web app / central server** that makes Claude calls on employees' seats or rate limits | Same page: Anthropic "does not permit third-party developers to offer Claude.ai login ... or to route requests through ... plan credentials on behalf of their users"; developers "may not collect, store, or intermediate Claude.ai credentials or session tokens" | **Not supported** |
| Agent SDK in a product | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview): "Unless previously approved" no claude.ai login or rate limits; use API key authentication | **Needs an API key** (Console, or Bedrock/Vertex/Foundry) unless Anthropic approves in writing |
| `claude setup-token` (one-year subscription token for CI) on a shared server | [Authentication](https://code.claude.com/docs/en/authentication): meant for CI/scripts; storing it centrally is the credential storage the legal page forbids | **Not for multi-user**; at most one owner's own automation |
| Hosting Claude Code for users, each signing in with their own subscription in the unmodified binary | Legal page carve-out exists, but is written for hosted products | **Grey zone**: ask Anthropic sales in writing before building |
| Monthly "Agent SDK credit" on subscriptions (from 15 Jun 2026) | Auth docs mention it; sources conflict, one secondary source says it was cancelled ([claudefa.st](https://claudefa.st/blog/guide/development/agent-sdk-credit) and others) | **UNVERIFIED**; do not plan on it |

Meaning: a website with a built-in Claude Chat and Claude Code running on a central agent **cannot be promised to run without API billing**. Terms may change; confirm with Anthropic sales (the docs say to contact sales for permitted authentication).

Bedrock note: Remote Control is not available on Bedrock, Vertex or Foundry ([Remote Control](https://code.claude.com/docs/en/remote-control)). Per-user Bedrock auth for Claude Code: not confirmed.

## 2. Feasibility matrix

| Requirement | Result |
|---|---|
| Studio is the project workspace and data gateway; Claude runs in each person's own Claude (Desktop, Code, claude.ai) via one connector | **Fully possible** (already built: the facilio.work connector) |
| Chat and Claude Code **embedded** in the Studio site on subscriptions | **Not supported** (API key needed) |
| Embedded Chat/Code on a company API key (Agent SDK) | Possible, with API billing and separate hosting |
| One connector for the team | **Fully possible**: Owner adds it once in Organization settings; members click Connect ([connectors](https://support.claude.com/en/articles/11175166-about-connectors)). Claude reaches the server from Anthropic's cloud, so the URL must be public HTTPS |
| Central skills via MCP | **Possible with limits**: MCP delivers tools, prompts, resources. It does not install Skills. Our `get_impl_skills` hands skill text to Claude as instructions; it cannot run a skill's bundled scripts |
| Central Skills in claude.ai | **Possible with limits**: Team/Enterprise admins can provision Skills ([announcement](https://claude.com/resources/articles/organization-skills-and-directory)); upload is by zip, no GitHub sync documented. A GitHub issue reports upload failures. Owner-only vs admin: sources differ |
| Central skills in Claude Code, updated from GitHub | **Fully possible**: plugin marketplace from a GitHub repo, pushed to everyone with `extraKnownMarketplaces` and `enabledPlugins` in managed settings ([org plugins](https://code.claude.com/docs/en/plugins/org)). Needs Claude Code on each laptop |
| Skills through the API (`/v1/skills`) | Possible, API-billed, only for API calls |
| Studio chat appears as a native chat/project in Claude Desktop | **Not supported**: no documented API to create, import or sync claude.ai projects or chats (searched; none found, so "none documented", not "proven impossible") |
| Claude Desktop retrieves and continues a Studio conversation through the connector | **Possible with limits** (see 4) |
| MCP prompts as slash commands in Desktop | **Unreliable**: a July 2026 issue reports the desktop app does not show them ([issue](https://claudeissues.com/issue/75234-desktop-app-doesnt-surface-mcp-prompts-as-mcp-server-prompt-slash-commands-works)); prefer tools |
| Auto-mapping meetings, mail, files into Studio tabs | **Possible**: Claude in the user's session reads, the Studio stores via transfers with approval (E15). A model is needed for extraction; non-AI parts: fetch, dedupe by key, audit, routing |
| Agent runtime inside Facilio Connected App | **No**: server functions are short Lambdas, no persistent process or Docker. A code agent needs separate hosting |

## 3. Central skills: what works

Three separate mechanisms, none of them is "the connector installs skills":
1. **Claude Code**: a GitHub repo `delivery-studio-skills` as a plugin marketplace; admins push it by managed settings; updating the repo updates everyone. Best fit for "update in GitHub, team gets it".
2. **claude.ai / Desktop**: admin-provisioned Skills (zip upload). Manual re-upload on change unless an admin API exists (**UNVERIFIED**).
3. **Connector**: Studio server reads `SKILL.md` from GitHub, versions and permission-checks it, and serves it through `get_impl_skills` (already built). Works on every Claude surface, behaves as instructions, not as an installed Skill.

Recommendation: keep mechanism 3 as the one common path, add 1 for developers.

## 4. Website and Claude Desktop: the closest supported experience

No native sync. The honest design: conversations live in the Studio (project, thread, messages, sources). Tools `list_conversations`, `get_conversation`, `append_to_conversation`, `get_project_context` expose them. In Claude Desktop the user says "continue Mansions - Work Order Requirements"; Claude loads the thread and context, continues, and writes new notes back. Desktop keeps its **own** chat; the Studio holds the shared record. The two chat lists will not match. Tool count limit: 40 per app, so fold actions into existing tools (it is already at 40).

## 5. Listed repositories (from GitHub pages, 6 Nov 2026; star counts as shown)

| Repo | Type | Licence | Note |
|---|---|---|---|
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | Skill/agent/hook collection (314 skills listed) | MIT | Very large; take single skills, not all. Last commit date not shown |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | Reference (DESIGN.md files), not skills | MIT | No SKILL.md found |
| [nexu-io/open-design](https://github.com/nexu-io/open-design) | Local design workspace app plus 100+ skills | Apache-2.0 | Runs local agent CLIs; not a server component |
| [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) | Claude Code plugin (codebase knowledge graph) | MIT | Tool; can use many tokens |
| [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | Reference/tutorial | MIT | Read, do not install |
| [upstash/context7](https://github.com/upstash/context7) | MCP server (library docs) | MIT | API key recommended; backend is private |
| [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | Multi-agent orchestration framework | MIT | Needs Claude Code plus subscription or key; heavy, avoid |

Not verified: last-commit dates, SKILL.md presence in most repos, and any security review of their code. Read each skill before adopting it.

## 6. Where things run

- **Stay in Facilio** (facilio.work): UI, records, transfers/gateway, connector (MCP), skill registry read from GitHub, approvals, audit.
- **Separate hosting, only if you accept API billing**: embedded code agent (isolated workspace per project, Git, command approval), Vexa call bot (needs an always-on container and speech-to-text, per [VEXA-REVIEW](VEXA-REVIEW-2026-11-04.md)).
- **Nowhere central**: employees' Claude sign-ins. Each person keeps their own.

## 7. Cost (do not read as zero)

Claude seats (per person, existing); API tokens only if an embedded agent is built (usage-based, unbounded without caps); hosting for agent runtime and bot; speech-to-text for the bot; GitHub; storage inside facilio.work. No figures are given here because prices were not checked.

## 8. Proof of concept (smallest)

1. Add to the existing connector: `get_conversation` and `append_to_conversation` on one test project (store in project records).
2. In two people's Claude Desktop (own seats), connect the connector, retrieve the thread, continue it, confirm the appended message shows in the Studio. This proves items 5 and 6 and the seat rule with no API.
3. Serve one `SKILL.md` from a test GitHub repo through `get_impl_skills`; both people get the same version; change it in GitHub; confirm both see the change.
4. Separate, optional: a Claude Code plugin marketplace on the same repo to one developer laptop.
5. Embedded central agent (items 2-3 of your list): **do not run until Anthropic sales answers in writing**; if the answer is API key, scope a small cost-capped test.

## 9. Go / no-go

- Achievable today with no API billing: Studio as visualization and gateway, one team connector, central skills text, conversation record shared through tools, auto-mapping done in each person's own Claude, approvals in the Studio.
- Not supported: native Desktop chat sync; a central server running on employees' seats; Skills installed by a connector.
- Build first: the PoC steps 1-3. This matches E15.
- Avoid: browser automation or private APIs to mirror chats, storing anyone's Claude tokens, installing the large frameworks (ECC wholesale, oh-my-claudecode).
- Open question for Anthropic sales: is hosting Claude Code or the Agent SDK for our own staff, each signing in with their own Team seat, permitted, and under what limits?
