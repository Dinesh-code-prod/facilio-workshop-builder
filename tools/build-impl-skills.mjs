// Rebuilds work/server/_skills.mjs (the catalog the connector's get_impl_skills tool serves) from the menu of a local clone of facilio-impl-ai-skills.
// Run after fetching that repo:  node tools/build-impl-skills.mjs [path to the clone]   (default D:\facilio-impl-ai-skills)
// Only names, one-line descriptions, where each runs and what it needs are copied. No skill logic and no repository login ever goes into this app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = process.argv[2] || 'D:\\facilio-impl-ai-skills';
const menu = JSON.parse(fs.readFileSync(path.join(repo, 'facilio-impl-toolbox', 'menu.json'), 'utf8'));
const RUNS = { cowork: 'Claude Cowork', 'claude-code': 'Claude Code', both: 'Claude Cowork or Claude Code' };
const NEEDS = { browser: 'Claude in Chrome (a connected browser)', 'facilio-connections-mcp': 'the Facilio MCP connection', 'facilio-connections-mcp (import connection)': 'the Facilio MCP connection with the facilio-import connection' };
const version = id => { try { return JSON.parse(fs.readFileSync(path.join(repo, id, 'manifest.json'), 'utf8')).version || ''; } catch { return ''; } };
const skills = menu.skills.filter(s => !s.hidden).map(s => ({
  id: s.id, label: s.label, does: String(s.description || '').replace(/\s+/g, ' ').trim(), runsIn: RUNS[s.surface] || s.surface,
  needs: (s.requires || []).map(r => NEEDS[r] || r), version: version(s.folder || s.id)
}));
// which skill carries on from each Delivery Studio deliverable (the task names of get_task_pack); written by hand, checked against the ids above
const TASK_SKILLS = {
  brd: ['ftr-generator', 'facilio-configuration-builder'], ftr: ['ftr-generator', 'ftr-executor'], uat: ['uat-guide-generator', 'ftr-executor'], guide: ['uat-guide-generator'], training: ['uat-guide-generator'],
  config: ['facilio-org-configuration-assistant', 'facilio-rules-optimizer', 'facilio-script-optimizer'], pkg: ['facilio-org-configuration-assistant', 'facilio-rules-optimizer'],
  golive: ['ftr-executor'], hypercare: ['support-ticket-responder'], handover: ['org-knowledgebase-builder', 'support-ticket-responder'], onboarding: ['onboarding-data-converter', 'spreadsheet-transformer', 'facilio-import-runner']
};
// the skills each Studio button job (a kind in work/server/_jobs.mjs) uses, in the order Claude opens them; the job brief hands this plan to Claude. Written by hand: only skills
// that really exist. from: impl = the facilio-impl-ai-skills repository, studio = this repository's skills/ folder, claude = Claude's built-in file skills. needed = the job cannot be done without it.
// No repository skill writes a BRD, reads an MSA, writes minutes or a project plan: for those jobs the recipe itself is the workflow and only the file skills apply.
const S = (skill, from, use, needed) => ({ skill, from, use, ...(needed ? { needed: true } : {}) });
const PDF = S('pdf', 'claude', 'read a contract or document that is a PDF'), DOCX = S('docx', 'claude', 'read or write a Word document'), XLSX = S('xlsx', 'claude', 'read or write a spreadsheet');
const ORG = S('facilio-org-configuration-assistant', 'impl', 'read what is already configured in the org (only when the org has a package)');
const JOB_SKILLS = {
  pull_msa: [PDF, DOCX], check_msa: [PDF, DOCX], check_brd: [DOCX, PDF], pull_brd: [DOCX, PDF], pull_clari: [DOCX], pull_transcript: [DOCX],
  make_from_reference: [S('pptx', 'claude', 'read or write the kick-off deck'), XLSX, DOCX], apply_change: [S('pptx', 'claude', 'change the kick-off deck when it is a file')],
  draft_brd: [DOCX], compare_solution: [XLSX, DOCX], fetch_feedback: [XLSX], import_workshop_plan: [XLSX],
  solution_expert: [ORG], update_solution: [ORG], fetch_org_status: [ORG],
  fetch_hypercare: [S('support-ticket-responder', 'impl', 'classify a hypercare ticket and draft the answer from the org knowledge')],
  build_solution_doc: [S('facilio-solution-document-builder', 'studio', 'build the Solution Document from the org package .zip', true)],
  make_ftr: [S('ftr-generator', 'impl', 'write or refresh the FTR from the BRD and the package', true), S('ftr-executor', 'impl', 'only when asked to run the FTR in the live org (needs Claude in Chrome)'), XLSX],
  make_guide: [S('facilio-uat-guide', 'studio', 'the UAT guide before go-live: test process, test scripts, defect log, sign-off'), S('guidebook-builder', 'studio', 'the handover user guide and admin guide after go-live'), S('video-to-user-guide', 'studio', 'a guide from a recording and what was said'), S('uat-guide-generator', 'impl', 'a customer UAT guide or workflow manual'), DOCX],
  change_guide: [S('guidebook-builder', 'studio', 'keep the guide structure and tone'), DOCX],
  make_handover: [S('org-knowledgebase-builder', 'impl', 'the support team knowledge base from the implementation documents'), S('facilio-solution-document-builder', 'studio', 'the Solution Document, when it is not in the pack yet'), DOCX]
};
const ids = new Set(skills.map(s => s.id)); for (const [t, l] of Object.entries(TASK_SKILLS)) for (const id of l) if (!ids.has(id)) throw new Error(`TASK_SKILLS.${t} names a skill that is not on the menu: ${id}`);
const here = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const known = { impl: id => ids.has(id), studio: id => fs.existsSync(path.join(here, 'skills', id, 'SKILL.md')), claude: id => ['docx', 'xlsx', 'pptx', 'pdf'].includes(id) };
for (const [k, l] of Object.entries(JOB_SKILLS)) for (const x of l) if (!known[x.from] || !known[x.from](x.skill)) throw new Error(`JOB_SKILLS.${k} names a skill that does not exist: ${x.from}/${x.skill}`);

// what changed since the last build, and where the repository's own guide (README.md, AGENTS.md) is behind its skill folders: printed for the person who runs this
const target = path.join(here, 'work', 'server', '_skills.mjs');
const before = fs.existsSync(target) ? (await import(new URL('file:///' + target.replace(/\\/g, '/')).href)).IMPL_SKILLS.skills : [];
const was = new Map(before.map(s => [s.id, s.version || '']));
for (const s of skills) if (!was.has(s.id)) console.log('new skill: ' + s.id); else if (was.get(s.id) && was.get(s.id) !== s.version) console.log(`updated: ${s.id} ${was.get(s.id)} -> ${s.version}`);
for (const id of was.keys()) if (!ids.has(id)) console.log('gone from the menu: ' + id);
const guide = ['README.md', 'AGENTS.md'].map(f => [f, fs.readFileSync(path.join(repo, f), 'utf8')]);
for (const d of fs.readdirSync(repo)) if (fs.existsSync(path.join(repo, d, 'SKILL.md'))) {
  for (const [f, t] of guide) if (!t.includes(d + '/')) console.log(`guide gap: ${f} does not describe ${d}`);
  const front = fs.readFileSync(path.join(repo, d, 'SKILL.md'), 'utf8').replace(/\r/g, '').split('\n---')[0];
  const desc = (front.match(/^description:\s*(?:>-?)?\s*([\s\S]*?)(?=\n[a-z_-]+:|(?![\s\S]))/m) || [])[1] || '';
  if (desc.replace(/\s+/g, ' ').trim().length > 1024) console.log(`too long: ${d} description is over 1024 characters (Claude apps refuse such a skill on upload)`);
}

const out = `// GENERATED by tools/build-impl-skills.mjs from facilio-impl-ai-skills (menu version ${menu.version}). Do not edit by hand.\nexport const IMPL_SKILLS = ${JSON.stringify({ menuVersion: menu.version, skills, taskSkills: TASK_SKILLS, jobSkills: JOB_SKILLS }, null, 1)};\n`;
fs.writeFileSync(target, out);
console.log(`${skills.length} skills and ${Object.keys(JOB_SKILLS).length} job skill plans written to work/server/_skills.mjs`);
