/* OneDrive project folders on New project (pure code, tested by tests/onedrive_pick.mjs). The Studio cannot see Microsoft 365, so the person's Claude reads the
   team's onboarding folder and saves the list of customer folders in that person's holding space (a pull transfer of kind onedrive_folders, never submitted).
   New project offers the list; picking a folder makes Create project ask Claude (job pull_msa with the folder's reference) to find and read EVERY contract
   document in that folder (MSA, SOW, service order, amendments, CRs, whatever their file names) and save one combined extraction. */
(function (root) {
  'use strict';
  const KIND = 'onedrive_folders';
  const ROOT_NAME = 'Facilio - OnBoarding';
  const ROOT_HINT = 'G-Drive(21-12-24)/swami@facilio.com/Facilio - OnBoarding';
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

  /** the stored version's text (a JSON array, or { folders: [...] }) → [{ name, ref, group }] sorted by name; only file:/// references, no repeats */
  function parseFolders(text) {
    let a; try { a = JSON.parse(String(text || '')); } catch (e) { return []; }
    if (a && !Array.isArray(a) && Array.isArray(a.folders)) a = a.folders;
    if (!Array.isArray(a)) return [];
    const seen = new Set(), out = [];
    for (const f of a) {
      if (!f || typeof f !== 'object') continue;
      const name = clean(f.name, 120), ref = clean(f.ref, 500), group = clean(f.group, 60);
      if (!name || !/^file:\/\/\/\S/.test(ref) || seen.has(ref)) continue;
      seen.add(ref); out.push({ name, ref, group });
    }
    return out.sort((x, y) => x.name.localeCompare(y.name, 'en', { sensitivity: 'base' }) || x.group.localeCompare(y.group));
  }
  /** what the picker shows; a group keeps two folders of the same name apart */
  const label = f => (f.group ? f.name + ' (' + f.group + ')' : f.name);
  const find = (list, typed) => { const t = clean(typed, 200).toLowerCase(); return t ? (list || []).find(f => label(f).toLowerCase() === t) || null : null; };

  /** the prompt that makes (or refreshes) the person's folder list */
  const listPrompt = () => [
    'Make the list of customer project folders for the New project form in Delivery Studio.',
    '1. With the Microsoft 365 connector open the team\'s onboarding folder "' + ROOT_NAME + '". It is usually at ' + ROOT_HINT + ' in a colleague\'s OneDrive; find it with sharepoint_folder_search or read_resource, and ask me if you find more than one.',
    '2. Read EVERY page of its folder listing (it has more than 200 entries; follow startPage). Keep each customer project folder. Skip folders whose name starts with "_" and template or admin folders such as "Standard Project Folder Template", "Project Folder", "Process Improvements", "PAM" and "AI".',
    '3. Also read its subfolder "_Implementation Yet To Start" and add the folders in it with group "Yet to start".',
    '4. Save the list with the Delivery Studio connector: transfer_write action begin with project "holding", dir "pull", kind "' + KIND + '", scope "folder list", source { system "onedrive", ref: the reference of "' + ROOT_NAME + '" exactly as the connector gave it, label "' + ROOT_NAME + '" }, dest { system "studio", ref "' + KIND + '", label "OneDrive project folders" }.',
    '5. Then transfer_write action store with that id and content set to a JSON array with one object per folder: {"name": the folder name, "ref": its file:/// reference exactly as the connector gave it, "group": "" or "Yet to start"}.',
    'Do not submit it for review: it is a pick list for the New project form, not project data. Tell me how many folders you saved.'
  ].join('\n');

  /** the job Create project files when a folder was picked (the recipe of pull_msa in work/server/_jobs.mjs searches the folder named by ref) */
  const pullJob = (customer, project, folder) => ({ kind: 'pull_msa', note: clean([customer, project].filter(Boolean).join(' / ') + ' / OneDrive project folder: ' + folder.name + ' (read every contract document in it)', 600), ref: folder.ref });

  const api = { KIND, ROOT_NAME, ROOT_HINT, parseFolders, label, find, listPrompt, pullJob };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBOneDrive = api;
})(typeof window !== 'undefined' ? window : globalThis);
