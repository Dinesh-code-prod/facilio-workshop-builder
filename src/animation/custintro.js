/* Customer introduction (prompt section 7): an optional, per-project, customer-safe page built from existing project data and exported as ONE standalone HTML file.
   facilio.work lets only Facilio staff sign in, so the customer receives the exported file (or prints it to PDF). Nothing internal is included unless ticked:
   no notes, RAID, AI drafts, other customers or fees. Stage status comes from recorded data (V.roadmapStages).
   The team can add the customer's logo, a cover picture and a few pictures (a building, a site); each is shrunk in the browser and kept inside the document as a data URL. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { toast } = V;
  V.extraSections = (V.extraSections || []).concat(['custintro']);
  const MAX_GAL = 6;
  const D = () => { const d = F.doc('custintro'); d.include = d.include || { objectives: true, modules: true, roadmap: true, guides: false }; if (d.include.gallery === undefined) d.include.gallery = true; d.objectives = d.objectives || ''; d.welcome = d.welcome || ''; d.logo = d.logo || ''; d.cover = d.cover || ''; d.gallery = Array.isArray(d.gallery) ? d.gallery : []; return d; };
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const SEC = [['objectives', 'Objectives and scope summary'], ['modules', 'Modules in scope'], ['roadmap', 'Delivery roadmap with recorded status'], ['guides', 'Approved user guides (titles only)'], ['gallery', 'Pictures']];
  const okImg = s => typeof s === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(s);
  function data() {
    const p = S.project || {}; const d = D(); const mods = F.allModules().filter(m => m.inScope && !(V.controls && V.controls().hiddenModules || []).includes(m.name)).map(m => m.label || m.name).sort();
    const guides = I().list('ugd').filter(g => g.status === 'approved').map(g => g.title);
    return { p, d, mods, guides, stages: V.roadmapStages ? V.roadmapStages() : [] };
  }
  // shrink a picture in the browser: logo keeps transparency (PNG), the rest become JPEG
  function shrink(file, maxW, maxH, png) {
    return new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => { URL.revokeObjectURL(u); const k = Math.min(1, maxW / im.width, maxH / im.height); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); const g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.82)); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('This picture could not be read')); }; im.src = u; });
  }
  function pageHtml() {
    const { p, d, mods, guides, stages } = data(); const inc = d.include; const col = { none: '#98A2B3', progress: '#1570EF', done: '#027A48' }; const lab = { none: 'Not started', progress: 'In progress', done: 'Complete' };
    const name = p.customer || p.name || 'Your project'; const done = stages.filter(s => s.state === 'done').length;
    const facts = [p.startDate ? ['Start', V.fmtDate(p.startDate)] : null, p.endDate ? ['Go-live', V.fmtDate(p.endDate)] : null, inc.modules && mods.length ? ['Modules', String(mods.length)] : null, inc.roadmap && stages.length ? ['Stages complete', done + ' of ' + stages.length] : null].filter(Boolean);
    const gal = inc.gallery ? d.gallery.filter(g => okImg(g.src)) : []; const nav = [inc.objectives && (d.objectives || p.description) ? ['scope', 'Scope'] : null, inc.modules && mods.length ? ['modules', 'Modules'] : null, inc.roadmap && stages.length ? ['roadmap', 'Roadmap'] : null, inc.guides && guides.length ? ['guides', 'Guides'] : null, gal.length ? ['pics', 'Pictures'] : null].filter(Boolean);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)} — Facilio implementation</title><style>
:root{--ink:#101828;--mute:#667085;--line:#E4E7EC;--blue:#1570EF;--navy:#1D1A5E;--soft:#F5F8FF}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font:16px/1.6 "Geist",Inter,Roboto,system-ui,sans-serif;color:var(--ink);background:#fff}
.top{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}.top div{max-width:1040px;margin:0 auto;padding:12px 24px;display:flex;gap:22px;align-items:center;font-size:14px}.top b{margin-right:auto;color:var(--navy)}.top a{color:var(--mute);text-decoration:none}.top a:hover{color:var(--blue)}
.hero{background:linear-gradient(180deg,var(--soft),#fff)}.hero>div{max-width:1040px;margin:0 auto;padding:56px 24px 40px;display:grid;grid-template-columns:${okImg(d.cover) ? '1.1fr .9fr' : '1fr'};gap:36px;align-items:center}.logo{height:52px;max-width:220px;object-fit:contain;display:block;margin-bottom:22px}.eyebrow{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--blue);font-weight:600}
h1{font-size:44px;line-height:1.1;margin:8px 0 12px;color:var(--navy);letter-spacing:-.02em}.lead{font-size:18px;color:#344054;margin:0;max-width:34em}.cover{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:20px;border:1px solid var(--line)}
.facts{max-width:1040px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.facts div{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fff}.facts small{display:block;color:var(--mute);font-size:12px;text-transform:uppercase;letter-spacing:.05em}.facts b{font-size:20px;color:var(--navy)}
section{max-width:1040px;margin:0 auto;padding:44px 24px 0}h2{font-size:26px;margin:0 0 6px;color:var(--navy);letter-spacing:-.01em}.sec{color:var(--mute);margin:0 0 18px}.card{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:#fff}
.mods{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:0;list-style:none;margin:0}.mods li{border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-weight:500}
.tl{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;padding:0;list-style:none;margin:0}.tl li{border-top:4px solid var(--c);padding:12px 4px 0}.tl .n{font-size:12px;color:var(--mute)}.tl b{display:block;font-size:16px}.tl small{color:var(--c);font-weight:600}.tl em{display:block;color:var(--mute);font-size:13px;font-style:normal}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}.gal figure{margin:0}.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;border:1px solid var(--line);display:block}.gal figcaption{font-size:13px;color:var(--mute);margin-top:6px}
footer{max-width:1040px;margin:56px auto 0;padding:20px 24px 48px;color:var(--mute);font-size:13px;border-top:1px solid var(--line)}@media(max-width:760px){.hero>div{grid-template-columns:1fr}h1{font-size:34px}.top a{display:none}}@media print{.top{display:none}section{break-inside:avoid}}
</style></head><body><div class="top"><div><b>${esc(name)}</b>${nav.map(([k, l]) => `<a href="#${k}">${l}</a>`).join('')}</div></div>
<header class="hero"><div><div>${okImg(d.logo) ? `<img class="logo" src="${d.logo}" alt="${esc(name)} logo">` : ''}<div class="eyebrow">Facilio implementation</div><h1>${esc(p.name && p.name !== name ? p.name : name)}</h1><p class="lead">${d.welcome ? esc(d.welcome).replace(/\n/g, '<br>') : 'This page shows what we are delivering together, the modules in scope and where the project stands today.'}</p></div>${okImg(d.cover) ? `<img class="cover" src="${d.cover}" alt="">` : ''}</div></header>
${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
${inc.objectives && (d.objectives || p.description) ? `<section id="scope"><h2>Objectives and scope</h2><p class="sec">What this project is meant to achieve.</p><div class="card">${esc(d.objectives || p.description).replace(/\n/g, '<br>')}</div></section>` : ''}
${inc.modules && mods.length ? `<section id="modules"><h2>Modules in scope</h2><p class="sec">The parts of Facilio your team will use.</p><ul class="mods">${mods.map(m => `<li>${esc(m)}</li>`).join('')}</ul></section>` : ''}
${inc.roadmap && stages.length ? `<section id="roadmap"><h2>Delivery roadmap</h2><p class="sec">Shows only what has been recorded in the project.</p><ol class="tl">${stages.map((s, i) => `<li style="--c:${col[s.state]}"><span class="n">Step ${i + 1}</span><b>${esc(s.name)}</b><small>${lab[s.state]}</small>${s.detail ? `<em>${esc(s.detail)}</em>` : ''}</li>`).join('')}</ol></section>` : ''}
${inc.guides && guides.length ? `<section id="guides"><h2>User guides</h2><p class="sec">Ready for your team.</p><div class="card">${guides.map(g => `<div>${esc(g)}</div>`).join('')}</div></section>` : ''}
${gal.length ? `<section id="pics"><h2>Pictures</h2><div class="gal">${gal.map(g => `<figure><img src="${g.src}" alt="${esc(g.cap || '')}">${g.cap ? `<figcaption>${esc(g.cap)}</figcaption>` : ''}</figure>`).join('')}</div></section>` : ''}
<footer>Prepared ${esc(V.fmtDate(new Date().toISOString()))} from the project record by Facilio. Status shows only what has been recorded.</footer></body></html>`;
  }
  const pic = (k, label, hint, d, can) => { const has = k === 'logo' ? okImg(d.logo) : okImg(d.cover); return `<div class="row" style="gap:10px;margin-top:8px;align-items:center">${has ? `<img src="${d[k]}" alt="" style="height:40px;width:${k === 'logo' ? 'auto' : '60px'};object-fit:${k === 'logo' ? 'contain' : 'cover'};border:1px solid var(--cs-border,#e4e7ec);border-radius:8px">` : ''}<b class="small" style="min-width:90px">${label}</b>${can ? `<button class="btn sm" data-act="ciImg" data-k="${k}">${has ? 'Replace' : 'Add'}</button>${has ? `<button class="btn sm" data-act="ciImgDel" data-k="${k}">Remove</button>` : ''}` : ''}<span class="xs muted">${hint}</span></div>`; };
  V.custintro = {
    html() {
      I().load(['scope', 'build', 'uat', 'checklist', 'ugd', 'hc', 'ho', 'close']); if (!I().ready(['ugd'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const d = D(); const can = canEdit(); const dis = can ? '' : 'disabled';
      return `<div class="page-header"><div class="t"><h1>Customer Introduction</h1><p>A customer-safe overview page for this project: add the customer's logo and pictures, choose what to include and write a short welcome. Preview it, then export one HTML file to send (or print to PDF). Internal notes, risks, AI drafts, fees and other customers are never part of it.</p></div><div class="row"><button class="btn primary" data-act="ciExport">Export HTML</button></div></div>
      <div class="page-body"><div class="grid g2"><div class="card" style="padding:16px"><label class="f">Welcome message (optional)</label><textarea rows="3" data-bind="@custintro:welcome" data-change="ciRefresh" ${dis}>${esc(d.welcome)}</textarea><label class="f" style="margin-top:10px">Objectives and scope summary (defaults to the project description)</label><textarea rows="5" data-bind="@custintro:objectives" data-change="ciRefresh" ${dis}>${esc(d.objectives)}</textarea>
      <div style="margin-top:14px"><b class="small">Pictures</b>${pic('logo', 'Logo', 'PNG or JPG, shown top left', d, can)}${pic('cover', 'Cover picture', 'The main picture beside the title', d, can)}
      <div style="margin-top:10px"><span class="small muted">More pictures (up to ${MAX_GAL}), for example a building or a site</span>${d.gallery.map((g, i) => `<div class="row" style="gap:8px;margin-top:6px;align-items:center">${okImg(g.src) ? `<img src="${g.src}" alt="" style="height:36px;width:48px;object-fit:cover;border-radius:6px;border:1px solid var(--cs-border,#e4e7ec)">` : ''}<input type="text" maxlength="80" placeholder="Caption" value="${esc(g.cap || '')}" data-change="ciCap" data-i="${i}" ${dis} style="flex:1">${can ? `<button class="btn sm" data-act="ciGalDel" data-i="${i}">Remove</button>` : ''}</div>`).join('')}${can && d.gallery.length < MAX_GAL ? `<button class="btn sm" style="margin-top:8px" data-act="ciImg" data-k="gal">+ Add a picture</button>` : ''}</div></div>
      <div style="margin-top:14px"><b class="small">Include</b>${SEC.map(([k, l]) => `<label class="row" style="gap:8px;margin-top:6px"><input type="checkbox" data-change="ciInc" data-k="${k}" ${d.include[k] ? 'checked' : ''} ${dis}> ${esc(l)}</label>`).join('')}</div></div>
      <div class="card" style="padding:0;overflow:hidden"><div class="card-h"><h3>Preview</h3></div><iframe title="Customer introduction preview" sandbox style="width:100%;height:680px;border:0" srcdoc="${esc(pageHtml())}"></iframe></div></div></div>`;
    }
  };
  const touch = what => F.changed('Customer introduction updated', what, { section: 'custintro' });
  ACT.ciInc = el => { if (!canEdit()) return; const d = D(); d.include[el.getAttribute('data-k')] = el.checked; touch(el.getAttribute('data-k')); V.render(); };
  ACT.ciRefresh = () => setTimeout(() => V.render(), 60);
  ACT.ciImg = async a => { if (!canEdit()) return; const k = a.getAttribute('data-k'); const f = (await V.pickFile('.png,.jpg,.jpeg,.webp'))[0]; if (!f) return;
    if (f.size > 15e6) { toast('Use a picture under 15 MB', 5000, true); return; }
    try { const d = D(); if (k === 'logo') d.logo = await shrink(f, 480, 160, true); else if (k === 'cover') d.cover = await shrink(f, 1400, 1050, false); else { if (d.gallery.length >= MAX_GAL) return; d.gallery.push({ src: await shrink(f, 1000, 750, false), cap: '' }); } touch(k === 'gal' ? 'picture' : k); V.render(); }
    catch (e) { toast(e.message, 5000, true); } };
  ACT.ciImgDel = a => { if (!canEdit()) return; D()[a.getAttribute('data-k')] = ''; touch('picture removed'); V.render(); };
  ACT.ciGalDel = a => { if (!canEdit()) return; D().gallery.splice(+a.getAttribute('data-i'), 1); touch('picture removed'); V.render(); };
  ACT.ciCap = el => { if (!canEdit()) return; const g = D().gallery[+el.getAttribute('data-i')]; if (g) { g.cap = String(el.value || '').slice(0, 80); touch('caption'); V.render(); } };
  ACT.ciExport = () => { const p = S.project || {}; V.download((p.customer || p.name || 'project').replace(/[^A-Za-z0-9 _-]/g, '') + ' - Delivery introduction.html', pageHtml(), 'text/html'); toast('Introduction exported'); };
})(typeof window !== 'undefined' ? window : globalThis);
