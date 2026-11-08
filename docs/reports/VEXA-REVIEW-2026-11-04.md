# Vexa as the base of a Facilio call bot: review of 4 Nov 2026

Question from the user: use https://github.com/Vexa-ai/vexa as our own "Facilio call bot" that joins calls, gives questions to ask from the MSA, records live transcripts and lets Claude fetch them for Delivery Studio; check it for malware; it must cost nothing extra. Nothing from Vexa was run or installed. It was cloned (shallow, no submodules, no hooks, no LFS) into a scratch folder **outside** this repository and read by two static reviewers. **Nothing of Vexa has been copied into any Facilio repository yet.**

## What Vexa is (from its README and docs, not run)
Open-source meeting-bot and transcription API (Apache-2.0, Vexa-ai org, about 2.9k stars, last commit 4 Nov 2026, version 0.12 with many features marked planned). A bot, a headless browser in a container, joins Google Meet, Microsoft Teams and Zoom (web client) from a link, like a participant, and returns speaker-labelled transcripts in near real time (faster-whisper behind an OpenAI-compatible endpoint; REST polling works, WebSocket streaming is listed as planned). It has an MCP server (remote `/mcp`) so Claude can read transcripts. **It does not ask questions or speak in the call in the open-source core** (speaking is hosted-only), and runs no model during a meeting.

## Security review (static; commit 6b26f7b, 6,381 files, 65 MB)
Verdict from both reviewers: **no malware, no backdoor, no obfuscation, no hidden phone-home. Copy with changes.**
- No eval of decoded data, no packed or minified code in the source folders, no native executables; the only binaries are a 5 KB test archive, a small image-model file and mouse-motion data. No Sentry, PostHog or similar; no remote self-update; TLS verification is not disabled for the browser. No real secrets in the repository (matches are test fixtures). No dependency installs from git or URLs; lockfile sources are the public registries; no typosquat seen by eye.
- GitHub workflows pin third-party actions to commit hashes. They use Vexa's Docker Hub secrets and would be dead weight for us: remove them.
- Audio goes only to the transcription URL **you** set (no built-in default host); transcripts go to Redis, its own API and your own storage.

Things that must change before anyone runs it:
1. **Never run `make all` or `make lite`:** they pull prebuilt `vexaai/*` Docker images that cannot be audited from this source and are not digest-pinned. Build from source only (`make dev`) and pin the base images yourself.
2. The `runtime` service mounts the Docker socket (host-root equivalent) and the host's `~/.claude` folder. Run only on a dedicated machine, never one holding real credentials, and do not run `deploy/bin/claude-creds-sync` (macOS only; exports Claude credentials).
3. `POST /api/ai/chat` in the dashboard has no authentication and spends an LLM key if `AI_MODEL` and `AI_API_KEY` are set: leave them unset or delete the route.
4. Google Analytics is off unless an ID is set at build: leave unset. Postgres uses unverified TLS in "prefer" mode: use verify-full. Set every password and `ADMIN_TOKEN` explicitly (some default to empty or a dev value).
5. Remove what a transcript bot does not need: `core/agent` (spawns Claude and Codex subprocesses), `core/flows`, `core/crm`, `clients/terminal` (includes a `new Function` on JSX), `clients/extension`, `clients/slim`, `.github`, `.githooks`, the `prepare` script, and the stale 5 KB `.tgz` in the dashboard.
6. The bot does **not announce that it is recording**. We must add our own notice and get consent (customer calls, many regions).

**Not checked:** `deploy/`, `scripts/`, `sdks/`, `tools/`, `integrations/` line by line; all dependencies' contents and known vulnerabilities; the Docker images; runtime behaviour; the full admin API; a build of the bot's injected browser bundle against its source. A static read is not a guarantee. Anything we adopt is built from source by us, scanned again (dependency audit, image scan) and run in an isolated environment first.

## "No cost": what is true
- **The licence is free.** Apache-2.0 allows copying, changing and rebranding the code. It grants no trademark rights: remove the Vexa name and logos, keep the LICENSE and NOTICE and mark our changes.
- **Running it is not free.** It needs an always-on container host: the project's own dev guide asks for about 8 vCPU and 16 GB RAM, every meeting adds a headless-Chrome container, and speech-to-text needs a GPU or a slow CPU mode. It **cannot run on facilio.work** (25-second calls, no Docker, no long-running processes). So "no extra cost" holds only if Facilio already has spare container capacity (ask the platform or IT team) or the work runs on a machine the company already pays for. This also touches the earlier rule "no extra hosting". The hosted Vexa service costs about $0.50 per bot-hour all-in, which is against the no-cost wish.
- **Transcript sources that cost nothing extra today:** (a) **Teams meetings:** the M365 connector already has the transcript permission; the organiser must switch transcription on; reads work through Claude, no bot needed. (b) **Clari:** the company already pays for it and a Facilio Clari connector exists (off in this session; not tested). A bot is only needed for calls on neither (for example Google Meet or Zoom calls with customers that nobody records).

## A Facilio call bot: what we would build on top
1. The meeting stack only (bot, meeting API, gateway, identity, STT), rebranded as the Facilio call bot, in **its own repository** (not the Studio repository: 6,000 files would break the Studio's 50 MB site limit and its tests).
2. A thin link to Delivery Studio: a bot request tool (the push and pull engine of roadmap E4, with project and session), the transcript as a **pull** into Studio with statuses, audit and review before anything becomes a requirement.
3. **Questions to ask:** before the call, Claude (in a person's session, through the connector) reads the MSA scope, requirements and open questions and writes a preparation list. During the call, the live transcript is polled and a Studio function can ask the server model (DeepSeek through `ctx.llm`, no key, about 20 requests a minute) for "what has not been asked yet" and send the consultant a Teams DM (the E12 Otto path). The bot itself does not speak in the call.
4. Consent notice, retention rules, and customer permission recorded per project.

**Decisions needed from the user:** where it runs (who provides the container host), a separate repository name and whether to create it, the consent wording, and which calls are on Teams or Clari (those need no bot).
