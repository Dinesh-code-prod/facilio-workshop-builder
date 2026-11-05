/* MSA extraction, storage and connector tools (roadmap E2 workspace 1, E11 step 2). The rules are in _msaextract.mjs; the engine is _transferapi.mjs.
   api.mjs calls installMsaExtract(deps, transfer) once, after installTransfer, with its own helpers.
   Claude reads the MSA in the person's own session (Microsoft 365 connector) and calls msa_extraction_save. The extraction is stored as a TRANSFER (dir pull, kind msa, source sharepoint or
   onedrive with the file reference as given, destination studio), so it has a status, versions, an audit trail and a review step. A person approves it in Delivery Studio (Claude cannot).
   Only then does create_project_from_msa make a NEW project from the approved version. With no project the transfer lives in the person's own holding space (the engine's collections under
   the id _msaextract.holdingId(person)): the same code and the same routes as a project's transfers, reachable by that person alone. */
import { SYSTEMS, validateExtraction, planFromExtraction, txt, holdingId } from './_msaextract.mjs';

const URL_BASE = 'https://facilio-delivery-studio.facilio.work/#/p/';

export function installMsaExtract(d, transfer) {
  const { route, ok, me, HttpError, dbGet, dbPut, dbList, withLock, audit, viaApp, projectAccess, CONNECTOR } = d; const { ops, load, access, pidOf } = transfer;
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const compact = t => ({ id: t.id, status: t.status, ver: t.ver, approvedVer: t.approvedVer, next: t.next, source: t.source, projectId: t.projectId || '' });
  const projectRow = async id => { const r = await dbGet('projects', id); return r && r.value ? r.value : null; };
  // the project's id, name and link are shown only to a person who can open it (a member, or an admin)
  const canSee = async (s, p) => (p.members || []).some(m => m.id === s.id) || projectAccess(s, p.id, 'read').then(() => true, () => false);
  const existing = async (rec, s, p) => { const seen = await canSee(s, p); return { created: false, project: seen ? { id: p.id, name: p.name, archived: !!p.archived, url: URL_BASE + p.id } : null, transferId: rec.id, complete: rec.projectComplete !== false,
    note: seen ? 'A project was already created from this transfer; nothing was changed.' : 'A project was already created from this transfer by someone else. You have no access to it, so it is not shown. Ask its owner.' }; };
  /** records the project on the transfer's head record (and its log) under the transfer's own lock */
  const link = (pid, id, s, patch, note) => withLock('xf.' + pid + '.' + id, async () => { const row = await dbGet('xf.' + pid, id); const r = row.value; Object.assign(r, patch); const at = new Date().toISOString(); r.updatedAt = at; r.log.push({ at, by: s.email, from: r.status, to: r.status, note }); if (r.log.length > 40) r.log.splice(0, r.log.length - 40); await dbPut('xf.' + pid, id, r); });
  const CLAIM_MS = 120000;   // a claim younger than this means another call is (probably) still creating the project
  /** writes one project document or record; safe to repeat (a retry after a partly finished fill writes over its own earlier write) */
  const putDoc = async (base, section, data) => { const cur = await viaApp('GET', base + '/docs/' + section); await viaApp('PUT', base + '/docs/' + section, '', { baseVersion: cur.version || 0, data }); };
  const tools = {
    /** validates and stores an MSA extraction as a transfer version, then submits it for review; project optional (no project: the person's holding space) */
    async msa_extraction_save(s, b) {
      const v = validateExtraction(b.extraction); if (!v.ok) throw new HttpError(400, 'The extraction was not saved. ' + v.errors.join(' '), { errors: v.errors, warnings: v.warnings });
      const src = isObj(b.source) ? b.source : {}; const system = typeof src.system === 'string' ? src.system.trim().toLowerCase() : ''; if (!SYSTEMS.includes(system)) throw new HttpError(400, 'source.system must be ' + SYSTEMS.join(' or ') + ' (where Claude read the MSA).');
      const ref = typeof src.ref === 'string' ? src.ref.trim() : ''; if (!ref || ref.length > 500) throw new HttpError(400, 'source.ref is required: the file reference as the Microsoft 365 connector gave it (up to 500 characters).');
      const project = String(b.project || '').trim() || 'holding', space = project === 'holding' ? 'holding' : 'project';
      const begun = await CONNECTOR.transfer_begin(s, { project, dir: 'pull', kind: 'msa', source: { system, ref, label: src.label, etag: src.etag }, dest: { system: 'studio', ref: 'msa-extraction' }, scope: '' }); const id = begun.transfer.id;
      let r = await CONNECTOR.transfer_store(s, { project, id, content: JSON.stringify(v.extraction), baseVersion: b.baseVersion, sourceEtag: src.etag, validation: { ok: true, checked: 'extraction structure', warnings: v.warnings.slice(0, 2) }, note: txt(b.note, 200) || 'MSA extraction saved by Claude' });
      if (b.submit !== false && ['Retrieved', 'Draft Generated'].includes(r.transfer.status)) r = await CONNECTOR.transfer_submit(s, { project, id, note: 'Extraction submitted for review by Claude' });
      return { space, transfer: compact(r.transfer), version: r.version || r.transfer.ver, duplicate: !!r.duplicate, warnings: v.warnings,
        note: 'Saved as an unapproved extraction (' + (space === 'holding' ? 'in your holding space; use project "holding" with the transfer tools' : 'in the project') + '). A person must approve it in Delivery Studio; Claude cannot approve it. Only then can create_project_from_msa make the project.' };
    },
    /** a NEW project from an APPROVED msa transfer; idempotent (a second call returns the project already made); never touches an existing project.
        A claim is written before the project is made; a failure after that reports the project id, and a retry RESUMES the fill of that project instead of answering "already created". */
    async create_project_from_msa(s, b) {
      if (b.confirm !== true) throw new HttpError(400, 'Ask the person to confirm creating the project, then call again with "confirm": true.');
      const id = String(b.id || ''); const pid = await pidOf(s, { project: String(b.project || '').trim() || 'holding' }); await access(s, pid, 'edit');
      const first = await load(pid, id); if (first.kind !== 'msa' || first.dir !== 'pull') throw new HttpError(400, 'That transfer is not an MSA extraction.');
      if (first.projectId && first.projectComplete !== false) { const p = await projectRow(first.projectId); if (p) return existing(first, s, p); }   // a deleted project falls through to the lock
      return withLock('msaproj.' + pid + '.' + id, async () => {
        let cur = await load(pid, id); let np = cur.projectId || '', p = np ? await projectRow(np) : null;
        if (np && !p) { await link(pid, id, s, { projectId: '', projectComplete: false, projectClaim: null }, 'Project ' + np + ' no longer exists; the link was cleared'); cur = await load(pid, id); np = ''; }
        if (np && cur.projectComplete !== false) return existing(cur, s, p);
        if (cur.status !== 'Approved' || cur.approvedVer == null) throw new HttpError(409, 'The extraction is ' + cur.status + '. A person must approve it in Delivery Studio before a project can be created from it.');
        const got = await ops.get(s, pid, id, String(cur.approvedVer)); if (!got.intact) throw new HttpError(409, 'The stored extraction does not match its recorded checksum. Save it again.');
        let parsed; try { parsed = JSON.parse(got.content); } catch (e) { parsed = null; } const v = validateExtraction(parsed); if (!v.ok) throw new HttpError(422, 'The approved extraction is not valid: ' + v.errors.join(' '));
        if (!v.extraction.customer || !v.extraction.projectName) throw new HttpError(422, 'The approved extraction has no ' + (!v.extraction.customer ? 'customer' : 'project name') + '. Save a new version with it and have it approved.');
        const plan = planFromExtraction(v.extraction, { now: new Date().toISOString(), source: cur.source, transferId: id, version: cur.approvedVer }); let resumed = !!np;
        if (!np) {
          const claim = cur.projectClaim;
          if (claim) { const mine = (await dbList('projects')).map(r => r.value).find(x => x && x.createdBy === s.id && String(x.createdAt) >= claim.at && String(x.description || '').includes('(transfer ' + id + ')')); if (mine) { np = mine.id; p = mine; resumed = true; } }   // an earlier call died between making the project and recording it
          if (!np && claim && claim.at && Date.now() - Date.parse(claim.at) < CLAIM_MS) throw new HttpError(409, 'A project is being created from this transfer right now. Wait a minute and call again; nothing was changed.');
        }
        if (!np) {
          await link(pid, id, s, { projectClaim: { at: new Date().toISOString(), by: s.id, state: 'creating' }, projectComplete: false }, 'Creating a project from version ' + cur.approvedVer);   // the claim comes first
          const made = await viaApp('POST', '/api/projects', '', plan.project); np = made.project.id;   // the normal creation path: limits, owner, people record, audit
        }
        try { await link(pid, id, s, { projectId: np, projectCreatedAt: new Date().toISOString(), projectComplete: false, projectClaim: null }, 'Project ' + np + ' ' + (resumed ? 'fill resumed' : 'created') + ' from version ' + cur.approvedVer); }
        catch (e) { throw new HttpError(500, 'The project was created (id ' + np + ') but it could not be recorded on the transfer: ' + e.message + '. Call create_project_from_msa again; it will finish the project.', { projectId: np, resume: true }); }
        await audit(np, s.id, 'project-from-msa', id + ' v' + cur.approvedVer); await audit(pid, s.id, 'transfer-project', id + ' ' + np);
        const base = '/api/projects/' + np; let step = 'planner';
        try {
          await putDoc(base, 'planner', plan.planner);
          if (plan.ctrcore) { step = 'ctrcore'; await viaApp('PUT', base + '/items/ctrcore/main', '', { data: plan.ctrcore }); }
          if (plan.scope) { step = 'scope'; await viaApp('PUT', base + '/items/scope/main', '', { data: plan.scope }); }
        } catch (e) { throw new HttpError(e.status || 500, 'The project was created (id ' + np + ') but writing the ' + step + ' record failed: ' + e.message + '. Call create_project_from_msa again with the same id to finish it.', { projectId: np, resume: true, step }); }
        await link(pid, id, s, { projectComplete: true }, 'Project ' + np + ' filled from the extraction');
        return { created: !resumed, resumed, project: { id: np, name: plan.project.name, url: URL_BASE + np }, transferId: id, complete: true, written: plan.counts, warnings: v.warnings,
          note: 'The project was ' + (resumed ? 'finished' : 'created') + '. The contract dates, obligations and scope items are in the Contract workspace and in Know Your Contract; items that are not confirmed contract text are marked uncertain for a person to review. Modules, commitments, dependencies, commercial constraints, training and support stay in the approved extraction (transfer_read, action get).' };
      });
    }
  };
  // ---------- routes for the Transfers page (the person's own click is the confirmation) ----------
  // The page reaches the holding space through the ordinary transfer routes under this id; only the id's owner can use them (_transferapi access).
  route('GET', '/api/me/holding', async () => { const s = await me(); return ok({ id: holdingId(s.id) }); });
  // the same code path as the connector tool; :id is a project id, or the person's own holding id. Idempotent: a second call returns the project already made (created: false).
  route('POST', '/api/projects/:id/transfers/:tid/start-project', async (b, G) => { const s = await me(); return ok(await tools.create_project_from_msa(s, { project: G.id === holdingId(s.id) ? 'holding' : G.id, id: G.tid, confirm: true })); });
  for (const [name, fn] of Object.entries(tools)) { if (Object.prototype.hasOwnProperty.call(CONNECTOR, name)) throw new Error('connector tool already exists: ' + name); CONNECTOR[name] = fn; }
  return { tools };
}
