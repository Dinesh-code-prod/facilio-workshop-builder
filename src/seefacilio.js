/* Product Tour: what Facilio really looks like, shown as real product screens on sample data, grouped the way a customer thinks
   (raise and track work, know your assets, quotes and invoices, field service, reports, set it up, on the move). Customers and the team see the
   same page; customers see only screens that have a picture, the team also sees the live ones. The pictures are saved in public/demokit and
   listed in src/demokit-data.js, so nothing here needs Facilio sign-in. The sample data is Acme Facilities, never a customer's own data. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const DK = () => root.FWBDemoKit || { base: '', screens: [], journeys: [] };
  const cust = () => !!(V.isCustomer && V.isCustomer());
  // the hierarchy: area -> screens, in the order a person meets them (list, then the record, then the form)
  const GROUPS = [
    { id: 'work', title: 'Raise and track work', blurb: 'A request becomes a work order, moves through its steps and is closed with a record of everything that happened.', has: x => x[1] === 'Work order' && x[2] !== 'WorkQ' },
    { id: 'assets', title: 'Know your assets', blurb: 'Every piece of equipment with its location, status, warranty and maintenance history in one place.', has: x => x[1] === 'Asset' },
    { id: 'plan', title: 'Plan maintenance', blurb: 'Planned maintenance creates the work orders for you on a schedule, from a job plan with the right crafts and tasks.', has: x => x[1] === 'Planned maintenance' || x[1] === 'Job plan' },
    { id: 'money', title: 'Quotes and invoices', blurb: 'Quote the work, get it approved, then invoice it, with the document ready to print or send.', has: x => (x[1] === 'Quote' || x[1] === 'Invoice') && x[2] === 'Maintenance' },
    { id: 'field', title: 'Field service', blurb: 'Dispatch the right technician to the right appointment from a board or a map.', has: x => x[2] === 'FSM' },
    { id: 'reports', title: 'Reports and insight', blurb: 'Reports in folders, pivots and a data explorer to answer questions about your portfolio.', has: x => x[1] === 'Analytics & reports' },
    { id: 'setup', title: 'Set it up your way', blurb: 'Setup is where your team configures Facilio: users, connected apps and customisation.', has: x => x[1] === 'Setup' },
    { id: 'mobile', title: 'On the move: the mobile app', blurb: 'Technicians open, work and close jobs from their phone, with QR scanning for assets.', has: x => x[2] === 'WorkQ' }
  ];
  V.sfGroups = GROUPS;
  const visible = () => DK().screens.map((x, i) => [x, i]).filter(([x]) => x[5]);
  const card = ([x, i]) => `<button class="card" style="padding:0;text-align:left;overflow:hidden;cursor:pointer" data-act="sfView" data-i="${i}" aria-label="Open ${esc(x[0])}">`
    + (x[5] ? `<img src="demokit/${esc(x[5])}" alt="" loading="lazy" style="width:100%;display:block;border-bottom:1px solid var(--fc-border)">` : '<div style="height:96px;display:flex;align-items:center;justify-content:center;background:var(--ds-soft,#f3f4f8)" class="small muted">Live screen only</div>')
    + `<div style="padding:10px 12px"><b class="small">${esc(x[0])}</b><div class="xs" style="margin-top:4px">${esc(x[3])}</div></div></button>`;
  // the grouped screens, reused by the Guides & Video Studio's Product Tour tab
  V.sfBody = all => {
    const list = visible(all); const used = new Set();
    const html = GROUPS.map(g => { const items = list.filter(([x]) => g.has(x)); items.forEach(([, i]) => used.add(i)); if (!items.length) return '';
      return `<div class="sec-k" style="margin-top:22px"><p>${esc(g.title)}</p><h2>${esc(g.blurb)}</h2></div><div class="grid g3">${items.map(card).join('')}</div>`; }).join('');
    return html || '<div class="card empty"><h3>No screens yet</h3><p>Screens will appear here once they are added.</p></div>';
  };
  const journeys = () => DK().journeys.length ? `<div class="sec-k" style="margin-top:22px"><p>Follow a real event</p><h2>From the first message to the closed job</h2></div>
    <div class="grid g3">${DK().journeys.map(j => `<div class="card" style="padding:14px"><b>${esc(j[0])}</b><div class="xs muted">${esc(j[1])}</div><ol class="small" style="padding-left:18px;margin:8px 0 0;line-height:1.6">${j[2].map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`).join('')}</div>` : '';
  V.seefacilio = {
    html() {
      const c = cust(); const who = (S.project && S.project.customer) || 'your team';
      return `<div class="page-header"><div class="t"><h1>Product Tour</h1><p>${c ? `This is how Facilio will look and work for ${esc(who)}. Real Facilio screens, shown with sample data.` : 'Use this in requirement sessions: show the customer how Facilio looks and how each action works. They see the same page.'}</p></div></div>
        <div class="page-body"><div class="notice">These are Facilio's own screens with sample data (Acme Facilities), not ${esc(who)}'s data. Your own setup is shaped in the workshops, so the fields and steps you see here can be changed to fit how you work.</div>
        ${V.sfBody(!c)}${journeys()}</div>`;
    }
  };
  // opens one screen: the full-size picture, or (team only) the live clickable screen, which needs Facilio sign-in in this browser
  function openScreen(i, live) {
    const x = DK().screens[i]; if (!x || !x[5]) return; const team = !cust(); const showLive = false;
    const body = `<img src="demokit/hd/${esc(x[5])}" alt="${esc(x[0])}" style="width:100%;border:1px solid var(--fc-border);border-radius:6px">`;
    const toggle = `<a class="btn" href="demokit/hd/${esc(x[5])}" target="_blank" rel="noopener">Open the picture in a new tab</a>`;
    V.drawer(x[0], `<p class="small muted">${esc(x[1])} · ${esc(x[2])}</p><p class="small">${esc(x[3])}</p>${body}`, '<span class="spacer"></span>' + toggle + '<button class="btn" data-act="closeDrawer">Close</button>', { wide: true });
  }
  ACT.sfView = a => openScreen(Number(a.getAttribute('data-i')), false);
})(typeof window !== 'undefined' ? window : globalThis);
