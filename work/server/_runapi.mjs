/* Facilio Run (facilio.run) in Delivery Studio (plan docs/plans/FACILIO-RUN-INTEGRATION-PLAN-2026-11-27.md; tests: tests/run_integration.mjs).
   facilio.run is Facilio's internal site hosting. Its directory can be read only when signed in there and sends no CORS headers, so neither this server nor the page can read it.
   Claude reads it in the person's own session with the Facilio Run connector (list_sites) and saves a copy here with project_jobs action run_directory; the Facilio tools page shows that copy.
   Publish to facilio.run: Claude deploys a page with the Facilio Run connector (deploy_site), then records its address on the project with project_jobs action run_link.
   Both are team-only writes; addresses must be https://<name>.facilio.run. Text is stored as plain data. */
const NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_SITES = 1000, MAX_LINKS = 20;
const plain = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const day = v => { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : ''; };

/** https://<name>.facilio.run with an optional path, nothing else (no sign-in details, port or look-alike hosts); returns the clean address or '' */
export function runUrl(v) {
  let u; try { u = new URL(String(v || '').trim()); } catch (e) { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return '';
  const h = u.hostname.toLowerCase(); if (h === 'facilio.run') return 'https://facilio.run' + u.pathname;
  const m = h.match(/^([^.]+)\.facilio\.run$/); return m && NAME.test(m[1]) ? 'https://' + h + u.pathname : '';
}
/** the site list as Claude read it from list_sites: kept fields only, valid names only, duplicates dropped, at most MAX_SITES */
export function cleanSites(raw) {
  const out = [], seen = new Set();
  for (const s of Array.isArray(raw) ? raw : []) {
    if (!s || typeof s !== 'object') continue; const name = plain(s.name, 63).toLowerCase(); if (!NAME.test(name) || seen.has(name)) continue;
    seen.add(name); out.push({ name, url: 'https://' + name + '.facilio.run/', description: plain(s.description, 240), by: plain(s.by || s.creator || s.last_deploy_by, 120), updated: day(s.updated || s.last_deploy_at || s.updated_at) });
    if (out.length >= MAX_SITES) break;
  }
  return out;
}

/** connector_help topic facilio_run (merged into TOOL_DOCS by api.mjs) */
export const RUN_DOCS = {
  facilio_run: { description: 'facilio.run is Facilio\'s internal site hosting (https://<name>.facilio.run); every Facilio employee can open every site and anyone can overwrite one. Its own connector is Facilio Run (https://mcp.facilio.run/mcp). '
    + 'action directory: Delivery Studio cannot read the directory itself, so call the Facilio Run connector\'s list_sites (every page, until there is no cursor), then project_jobs action run_directory once with all the sites. Never invent a site. '
    + 'action link (publish a page, for example the Report pack): 1) read what the page shows through this connector (for the Report pack: project_overview, uat_summary, get_records for raid, action and signoff); 2) write ONE static index.html in the Facilio document look (Roboto, ink #283648, Facilio blue #0024D6, white page), no scripts that call other sites, no secrets, no customer contact details, nothing marked confidential; 3) tell the person that every Facilio employee can open the page and anyone can overwrite or delete it, and wait for their OK; 4) deploy_site with the Facilio Run connector to ds-<short project name>-report (lower case letters, digits and hyphens); 5) project_jobs action run_link with the project and the address deploy_site returned.',
    inputs: { action: 'run_directory or run_link', sites: 'run_directory: the sites exactly as list_sites gave them: name (the part before .facilio.run), description, creator, last_deploy_at. At most 1000 are kept; invalid names are skipped and counted.', project: 'run_link: project name or id', url: 'run_link: the published address, https://<name>.facilio.run (the bare directory facilio.run is refused)' } }
};

export function installRun(d) {
  const { route, ok, HttpError, me, dbGet, dbPut, projectAccess, pickProject, audit, memberProjects, adminRole } = d;
  const team = async (s, pid, need) => { const a = await projectAccess(s, pid, need); if (a && a.role === 'customer') throw new HttpError(403, 'Facilio Run is for the Facilio team only'); return a; };
  // the directory names other customers' sites, so only an admin or a team member (not a customer) of at least one project reads or replaces it
  const staff = async s => { if ((await adminRole(s)) || (await memberProjects(s)).length) return; throw new HttpError(403, 'The Facilio Run directory is for the Facilio team only'); };
  const linksOf = async pid => { const r = await dbGet('runlinks', pid).catch(() => null); return (r && r.value && Array.isArray(r.value.links)) ? r.value.links : []; };
  route('GET', '/api/run/directory', async () => { await staff(await me()); const r = await dbGet('rundir', 'main').catch(() => null); const v = (r && r.value) || {}; return ok({ sites: v.sites || [], refreshedAt: v.refreshedAt || '', by: v.by || '' }); });
  route('GET', '/api/projects/:id/runlinks', async (b, P) => { const s = await me(); await team(s, P.id, 'read'); return ok({ links: await linksOf(P.id) }); });
  const ACT = {
    async directory(s, b) {
      await staff(s); const sites = cleanSites(b.sites); if (!sites.length) throw new HttpError(400, 'Give sites: the list from the Facilio Run connector\'s list_sites (name, description, creator, last_deploy_at)');
      const at = new Date().toISOString(); await dbPut('rundir', 'main', { sites, refreshedAt: at, by: s.email || s.id });
      return { saved: sites.length, skipped: (Array.isArray(b.sites) ? b.sites.length : 0) - sites.length, refreshedAt: at, message: 'Saved ' + sites.length + ' Facilio Run sites. Delivery Studio shows them under Help > Facilio tools > Facilio Run.' };
    },
    async link(s, b) {
      const p = await pickProject(s, b.project); await team(s, p.id, 'edit');
      const url = runUrl(b.url); if (!url || url.startsWith('https://facilio.run')) throw new HttpError(400, 'url must be the published site, https://<name>.facilio.run');
      const page = plain(b.page, 40) || 'Report pack', title = plain(b.title, 160);
      const links = [{ url, page, title, at: new Date().toISOString(), by: s.email || s.id }].concat((await linksOf(p.id)).filter(l => l.url !== url)).slice(0, MAX_LINKS);
      await dbPut('runlinks', p.id, { links }); await audit(p.id, s.id, 'run-published', page + ' ' + url);
      return { saved: true, url, message: 'Recorded on ' + p.name + ': ' + page + ' published at ' + url + '. It shows on the Report pack.' };
    }
  };
  return { run_directory: ACT.directory, run_link: ACT.link };   // project_jobs actions run_directory and run_link (ACTION_TOOLS in api.mjs): the platform allows 40 tools
}
