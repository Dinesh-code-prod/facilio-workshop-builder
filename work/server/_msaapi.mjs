/* MSA extraction, storage and connector tools (roadmap E2 workspace 1, E11 step 2). The rules are in _msaextract.mjs; the engine is _transferapi.mjs.
   api.mjs calls installMsaExtract(deps, transfer) once, after installTransfer, with its own helpers.
   Claude reads the MSA in the person's own session (Microsoft 365 connector) and calls msa_extraction_save. The extraction is stored as a TRANSFER (dir pull, kind msa, source sharepoint or
   onedrive with the file reference as given, destination studio), so it has a status, versions, an audit trail and a review step. A person approves it in Delivery Studio (Claude cannot).
   Only then does create_project_from_msa make a NEW project from the approved version. With no project the transfer lives in the person's own holding space (the engine's collections under
   the id _msaextract.holdingId(person)): the same code and the same routes as a project's transfers, reachable by that person alone. */
import { SYSTEMS, validateExtraction, planFromExtraction, txt } from './_msaextract.mjs';

const URL_BASE = 'https://facilio-delivery-studio.facilio.work/#/p/';

export function installMsaExtract(d, transfer) {
  const { HttpError, dbGet, dbPut, withLock, audit, viaApp, CONNECTOR } = d; const { ops, load, access, pidOf } = transfer;
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const compact = t => ({ id: t.id, status: t.status, ver: t.ver, approvedVer: t.approvedVer, next: t.next, source: t.source, projectId: t.projectId || '' });
  const existing = async (rec, pid) => { const row = await dbGet('projects', rec.projectId); const p = row && row.value; return { created: false, project: { id: rec.projectId, name: p ? p.name : '', archived: !!(p && p.archived), url: URL_BASE + rec.projectId }, transferId: rec.id, complete: rec.projectComplete !== false, note: 'A project was already created from this transfer; nothing was changed.' }; };
  /** records the project on the transfer's head record (and its log) under the transfer's own lock */
  const link = (pid, id, s, patch, note) => withLock('xf.' + pid + '.' + id, async () => { const row = await dbGet('xf.' + pid, id); const r = row.value; Object.assign(r, patch); const at = new Date().toISOString(); r.updatedAt = at; r.log.push({ at, by: s.email, from: r.status, to: r.status, note }); if (r.log.length > 40) r.log.splice(0, r.log.length - 40); await dbPut('xf.' + pid, id, r); });

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
    /** a NEW project from an APPROVED msa transfer; idempotent (a second call returns the project already made); never touches an existing project */
    async create_project_from_msa(s, b) {
      if (b.confirm !== true) throw new HttpError(400, 'Ask the person to confirm creating the project, then call again with "confirm": true.');
      const id = String(b.id || ''); const pid = await pidOf(s, { project: String(b.project || '').trim() || 'holding' }); await access(s, pid, 'edit');
      const first = await load(pid, id); if (first.kind !== 'msa' || first.dir !== 'pull') throw new HttpError(400, 'That transfer is not an MSA extraction.'); if (first.projectId) return existing(first, pid);
      return withLock('msaproj.' + pid + '.' + id, async () => {
        const cur = await load(pid, id); if (cur.projectId) return existing(cur, pid);
        if (cur.status !== 'Approved' || cur.approvedVer == null) throw new HttpError(409, 'The extraction is ' + cur.status + '. A person must approve it in Delivery Studio before a project can be created from it.');
        const got = await ops.get(s, pid, id, String(cur.approvedVer)); if (!got.intact) throw new HttpError(409, 'The stored extraction does not match its recorded checksum. Save it again.');
        let parsed; try { parsed = JSON.parse(got.content); } catch (e) { parsed = null; } const v = validateExtraction(parsed); if (!v.ok) throw new HttpError(422, 'The approved extraction is not valid: ' + v.errors.join(' '));
        if (!v.extraction.customer || !v.extraction.projectName) throw new HttpError(422, 'The approved extraction has no ' + (!v.extraction.customer ? 'customer' : 'project name') + '. Save a new version with it and have it approved.');
        const plan = planFromExtraction(v.extraction, { now: new Date().toISOString(), source: cur.source, transferId: id, version: cur.approvedVer });
        const made = await viaApp('POST', '/api/projects', '', plan.project); const np = made.project.id;   // the normal creation path: limits, owner, people record, audit
        await link(pid, id, s, { projectId: np, projectCreatedAt: new Date().toISOString(), projectComplete: false }, 'Project ' + np + ' created from version ' + cur.approvedVer);
        await audit(np, s.id, 'project-from-msa', id + ' v' + cur.approvedVer); await audit(pid, s.id, 'transfer-project', id + ' ' + np);
        const base = '/api/projects/' + np; let step = 'planner';
        try {
          await viaApp('PUT', base + '/docs/planner', '', { baseVersion: 0, data: plan.planner });
          if (plan.ctrcore) { step = 'ctrcore'; await viaApp('PUT', base + '/items/ctrcore/main', '', { data: plan.ctrcore }); }
          if (plan.scope) { step = 'scope'; await viaApp('PUT', base + '/items/scope/main', '', { data: plan.scope }); }
        } catch (e) { throw new HttpError(e.status || 500, 'The project was created (id ' + np + ') but writing the ' + step + ' record failed: ' + e.message + '. Open the project and add the rest by hand.', { projectId: np }); }
        await link(pid, id, s, { projectComplete: true }, 'Project ' + np + ' filled from the extraction');
        return { created: true, project: { id: np, name: plan.project.name, url: URL_BASE + np }, transferId: id, complete: true, written: plan.counts, warnings: v.warnings,
          note: 'The project was created. The contract dates, obligations and scope items are in the Contract workspace and in Know Your Contract; items that are not confirmed contract text are marked uncertain for a person to review. Modules, commitments, dependencies, commercial constraints, training and support stay in the approved extraction (transfer_get).' };
      });
    }
  };
  for (const [name, fn] of Object.entries(tools)) { if (Object.prototype.hasOwnProperty.call(CONNECTOR, name)) throw new Error('connector tool already exists: ' + name); CONNECTOR[name] = fn; }
  return { tools };
}
