/* Module learning library for the Customer User Guide — standard Facilio Connected CMMS content per business module:
   illustrative screens, overview, worked scenarios, standard fields, process, video clips, requirement questions and
   preparation checklist. Ported from the Facilio Workshop Hub. Static reference content; no customer data. */
(function (root) {
  'use strict';
  const MODS = [];
MODS.push({
  key: 'wo',
  name: 'Work Order Management',
  short: 'Work Orders',
  group: 'Maintenance',
  icon: 'clipboard-list',
  accent: 'violet',
  tagline: 'Raise, route, track and close every maintenance job',
  lede: 'This brief shows how you will raise, assign, track and close reactive and corrective jobs in Facilio. Read it with your team before the workshop and fill in the form at the end so we arrive with your setup half drafted.',
  about: [
    'Work Order Management is the operational core of Facilio CMMS. Every reactive request, breakdown and inspection follow-up becomes a work order with a clear owner, a location, a deadline and a full history.',
    'Jobs come from the tenant portal, email, a QR scan on an asset, the technician app or a BMS alarm. Facilio routes them to the right team or vendor, runs response and resolution SLAs with escalations, and keeps labour, parts, vendor cost and evidence on the record until it is verified and closed.'
  ],
  who: [
    ['headset','Helpdesk & coordinators','Log requests, set priority, dispatch to teams'],
    ['wrench','Technicians & vendors','Get jobs on mobile, complete tasks, capture proof'],
    ['user-check','Supervisors','Watch SLAs, handle escalations, verify closure'],
    ['line-chart','Facility managers','Track backlog, SLA compliance and spend per site']
  ],
  solves: [
    ['Requests arrive by phone, email and WhatsApp and some are never logged.','Every request lands in one queue with a WO number, whatever the channel','Zero lost requests'],
    ['Nobody knows a job is late until the tenant complains.','Response and resolution SLAs on every job with tiered escalation','SLA breach alerts'],
    ['Technicians close jobs with no proof of what was done.','Mandatory tasks, readings, photos and sign-off before resolve','Audit-ready history'],
    ['Repair spend per site or asset is rebuilt from spreadsheets each month.','Labour, parts and vendor invoices captured on each work order','Cost per asset & site']
  ],
  fieldGroups: {
    'Core details': [
      ['subject','Subject','Text','Short title shown in lists and notifications','yes'],
      ['description','Description','Rich text','Symptoms, what was observed, access notes','no'],
      ['category','Category','Lookup','HVAC, Electrical, Plumbing, Civil, Soft services. Drives routing','yes'],
      ['wo_type','Type','Picklist','Corrective, Breakdown, Inspection follow-up, Minor works','yes'],
      ['priority','Priority','Picklist','P1 Emergency to P4 Planned. Sets SLA targets','yes'],
      ['source','Source','System','Portal, Email, Mobile, QR scan, BMS alarm, Phone','auto'],
      ['wo_id','Work order ID','System','Unique number with your prefix, e.g. WO-10482','auto']
    ],
    'Location & asset': [
      ['site','Site','Lookup','Property or campus the job belongs to','yes'],
      ['space','Building / Floor / Space','Lookup','Exact location down to room, zone or riser','no'],
      ['asset','Asset','Lookup','Equipment being worked on; links job to asset history','no'],
      ['access_notes','Access instructions','Text','Keys, escort, permit or tenant time-window notes','no']
    ],
    'People, SLA & escalation': [
      ['requester','Requester','Lookup','Who raised it; receives status updates','yes'],
      ['team','Team / vendor','Lookup','In-house trade team or AMC vendor responsible','yes'],
      ['assignee','Assigned to','Lookup','Individual technician','no'],
      ['sla_policy','SLA policy','Rule','Response and resolution targets by priority, site or contract','auto'],
      ['response_due','Response due','Date & time','Calculated from priority and SLA policy','auto'],
      ['resolution_due','Resolution due','Date & time','Calculated; pauses while on hold for approved reasons','auto'],
      ['escalation_level','Escalation level','System','L0 to L3, raised as SLA thresholds are crossed','auto']
    ],
    'Execution, cost & closure': [
      ['tasks','Tasks','Checklist','Steps with readings, photos or pass/fail checks','no'],
      ['labour','Labour','Time log','Hours by technician with hourly rate','no'],
      ['parts','Parts used','Lookup','Items issued from store, reducing stock','no'],
      ['vendor_cost','Vendor cost','Currency','Invoice amount for subcontracted work','no'],
      ['hold_reason','On-hold reason','Picklist','Awaiting parts, Awaiting access, Awaiting approval, Vendor','no'],
      ['root_cause','Root cause & resolution','Text','What was found and done; feeds failure analysis','yes'],
      ['signoff','Requester sign-off','Signature','Captured on mobile at completion','no']
    ]
  },
  flows: [
    {
      title: 'AHU breakdown reported by a tenant',
      scenario: 'A tenant on level 4 of Marina Tower reports no cooling at 08:40 on a weekday in August.',
      steps: [
        { actor: 'Tenant', channel: 'Portal', text: 'Raises "No cooling on level 4, office 412" with a photo of the thermostat at 29 °C.', status: 'Submitted' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Maps space to AHU-3, sets category HVAC and priority P2. Response SLA 30 min, resolution 4 h.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Routes to MEP Team A on day shift and assigns R. Menon by workload. Push sent to his phone.', status: 'Assigned' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Accepts at 08:52, scans AHU-3 QR, finds a snapped fan belt. Logs supply air at 21.4 °C.', status: 'In progress' },
        { actor: 'Store keeper', channel: 'Web app', text: 'Issues belt SPB-1800 against WO-10482. Stock drops to 3, below reorder level of 4.', status: '' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Fits belt, records supply air 13.8 °C, adds after photo and tenant signature.', status: 'Resolved' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Checks evidence and closes. Tenant gets a 1-tap CSAT survey and rates 5 of 5.', status: 'Closed' }
      ],
      outcome: 'Cooling restored in 2 h 10 min against a 4 h target, with AED 185 in parts and 1.5 labour hours on the asset history.'
    },
    {
      title: 'Overdue lift fault escalated to the vendor',
      scenario: 'Lift 2 at City Centre Mall stops with a door sensor fault and the AMC vendor misses the response window.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'BMS alarm', text: 'Lift controller alarm "Door zone fault L2" creates WO-10476, P1, assigned to vendor Apex Lifts.', status: 'Assigned' },
        { actor: 'Facilio (automation)', channel: 'Email/SMS', text: 'No acceptance after 15 min. Escalates to L1: Apex duty manager and site supervisor S. Khan.', status: '' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Accepts at 32 min, ETA 25 min. Response SLA marked breached by 2 min.', status: 'In progress' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Replaces light curtain, needs part from Dubai depot. Puts job on hold: Awaiting parts.', status: 'On hold' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Fits part next morning, uploads test certificate and invoice AED 2,400.', status: 'Resolved' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Verifies lift in service, approves invoice against the AMC and closes the job.', status: 'Closed' }
      ],
      outcome: 'Lift back in service in 19 h with 14 h correctly excluded as parts hold, and the 2-minute breach logged on the vendor scorecard.'
    }
  ],
  process: {
    title: 'Lifecycle of a work order',
    statuses: ['Submitted','Assigned','In progress','On hold','Resolved','Closed'],
    steps: [
      { t:'Request', s:'Someone reports an issue', who:'Requester, helpdesk', statusOn:0,
        p:'An issue comes in through the tenant portal, email, mobile app, QR scan or a BMS alarm. Facilio creates a work order and acknowledges the requester with a reference number.',
        happens:['Location, asset and photos captured','Duplicate check against open jobs on the same asset','Requester gets the WO number by email or app'],
        decide:['Which channels you accept requests from','Who is allowed to raise requests','What information is mandatory at creation'] },
      { t:'Triage', s:'Classify and prioritise', who:'Helpdesk, coordinator', statusOn:0,
        p:'The job gets a category and priority, which start the SLA clocks. Rules can set both automatically from keywords, location or the asset criticality.',
        happens:['Category and type set','Priority applied, response and resolution timers start','Approval triggered above a cost or scope threshold'],
        decide:['Your priority levels and what qualifies for each','Response and resolution targets per priority and contract','Which jobs need approval and from whom'] },
      { t:'Assign', s:'Route to a team or vendor', who:'Coordinator, supervisor', statusOn:1,
        p:'The job goes to an in-house team, a named technician or an AMC vendor. Assignment rules route by category, site and shift so most jobs need no manual dispatch.',
        happens:['Technician notified on mobile','Vendor receives job in the vendor portal','Escalation runs if nobody accepts in time'],
        decide:['How teams are split (trade, site, shift)','When work goes to vendors instead of in-house','Escalation levels, timings and recipients'] },
      { t:'Execute', s:'Do the work on site', who:'Technician, vendor', statusOn:2,
        p:'The technician completes the checklist, records readings, issues parts from store and logs time. Jobs can go on hold with a reason such as awaiting parts or tenant access.',
        happens:['Tasks completed with photo and reading evidence','Labour, parts and vendor cost posted to the job','Approved hold reasons pause the SLA clock'],
        decide:['Standard task lists per category','Which hold reasons stop the SLA clock','Whether photos or signatures are mandatory'] },
      { t:'Close', s:'Verify and close out', who:'Supervisor, requester', statusOn:5,
        p:'The technician marks the job resolved. A supervisor or the requester verifies and the job closes. Feedback is collected and the job joins the asset history.',
        happens:['Requester notified and asked for a rating','Costs finalised and available to finance','Root cause stored for repeat-failure reports'],
        decide:['Who verifies before closure','Whether and for how long requesters can reopen','Auto-close period if nobody verifies'] }
    ]
  },
  screens: [
    { kind:'list', title:'Work order list', desc:'Filter by site, status, priority or SLA state. Views can be saved per team and every row opens the full record.',
      list:{ title:'All Work Orders', sub:'1,284 open · 37 overdue', cta:'New Work Order', filters:['Site: All','Status: Open','Priority','Assigned to me'],
        cols:['ID','Subject','Priority','Site','Status','Due'],
        rows:[
          ['WO-10482','AHU-3 not cooling, level 4','<span class="s-badge hi">P2 High</span>','Marina Tower','<span class="s-badge info">In progress</span>','Today 12:40'],
          ['WO-10481','Leak under pantry sink, L2','<span class="s-badge md">P3 Medium</span>','Harbour Point','<span class="s-badge lo">Assigned</span>','Tomorrow'],
          ['WO-10479','Lobby downlights flickering','<span class="s-badge lo">P4 Low</span>','Marina Tower','<span class="s-badge ok">Resolved</span>','18 Oct'],
          ['WO-10476','Lift 2 door sensor fault','<span class="s-badge hi">P1 Emergency</span>','City Centre Mall','<span class="s-badge md">On hold</span>','Overdue'],
          ['WO-10470','Tripped DB-4F-02, unit 405','<span class="s-badge md">P3 Medium</span>','Harbour Point','<span class="s-badge lo">Submitted</span>','21 Oct']
        ]}},
    { kind:'detail', title:'Work order record', desc:'Everything about one job: summary, tasks, cost, SLA timers, attachments and a full activity log.',
      detail:{ id:'WO-10482 · Corrective', title:'AHU-3 not cooling, level 4', badge:'<span class="s-badge info">In progress</span>',
        tabs:['Summary','Tasks','Cost','Attachments','Activity'],
        kv:[['Site','Marina Tower'],['Space','L4 Plant room'],['Asset','AHU-3 (Carrier 39HQ)'],['Category','HVAC'],['Team','MEP Team A'],['Assigned to','R. Menon'],['Response due','Met · 08:52'],['Resolution due','Today 12:40']],
        sideTitle:'Tasks 2 of 4',
        side:'<div class="s-task"><span class="s-box done"></span>Isolate unit &amp; lock out</div><div class="s-task"><span class="s-box done"></span>Check belt tension and pulleys</div><div class="s-task"><span class="s-box"></span>Record supply air temp (°C)</div><div class="s-task"><span class="s-box"></span>After photo and tenant sign-off</div>' }},
    { kind:'mobile', title:'Technician job view', desc:'Technicians see their queue by SLA, open jobs by QR scan, complete tasks offline and resolve with photos and a signature.',
      mobile:{ bar:'My Jobs · 6', btn:'Start work', items:[['AHU-3 not cooling','Marina Tower · L4 · P2 · 1 h 48 m left'],['Leak under pantry sink','Harbour Point · L2 · P3'],['Tripped DB-4F-02','Harbour Point · L4 · P3'],['Lobby downlights','Marina Tower · G · P4']],
        noteTitle:'Works offline', note:'<span>Tasks, readings and photos save on the device in basements and plant rooms.</span><span>Everything syncs and SLA timestamps are kept when signal returns.</span>' }},
    { kind:'insight', title:'SLA & backlog dashboard', desc:'Managers see SLA compliance, backlog age, escalations and repair spend across sites without building reports by hand.',
      insight:{ title:'Maintenance overview', range:'Last 30 days', body:'<div class="s-grid" style="grid-template-columns:repeat(4,1fr)"><div class="s-card s-kpi"><b>1,284</b><small>Open work orders</small></div><div class="s-card s-kpi"><b>94.2%</b><small>Response SLA met</small></div><div class="s-card s-kpi"><b>3.6 h</b><small>Avg. resolution</small></div><div class="s-card s-kpi"><b>37</b><small>Overdue</small></div></div><div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1"><div class="s-card" style="flex:1"><h4>Closed vs raised, by week</h4><div class="s-bars"><i style="height:62%"></i><i class="alt" style="height:70%"></i><i style="height:74%"></i><i class="alt" style="height:68%"></i><i style="height:80%"></i><i class="alt" style="height:77%"></i><i style="height:88%"></i><i class="alt" style="height:72%"></i></div></div><div class="s-card"><h4>Escalations & cost</h4><div class="s-kv"><div><small>L1 escalations</small><span>58</span></div><div><small>L2 escalations</small><span>9</span></div><div><small>Repair spend</small><span>AED 212,400</span></div><div><small>Top cost site</small><span>City Centre Mall</span></div></div></div></div>' }}
  ],
  videos: ['wo','tour','sr','tenant','vendor','notifications','visibility'],
  bring: [
    ['Site and building list','Names, floors and how you refer to them internally'],
    ['Current category and priority list','Whatever you use today, even if it lives in a spreadsheet'],
    ['SLA schedule or contracts','Response and resolution times per priority, per client or AMC'],
    ['Escalation matrix','Who gets told at each level and after how long'],
    ['Team and vendor roster','Who covers which trade and site, shifts, and AMC vendors'],
    ['3 to 5 real recent jobs','One that went well, one that went badly, one with a vendor']
  ],
  people: [['user-cog','Facility / maintenance manager'],['headset','Helpdesk lead'],['wrench','Senior technician or supervisor'],['briefcase','Vendor or contracts lead'],['wallet','Finance or cost controller']],
  form: [
    { section: 'Intake & volumes', questions: [
      { id:'channels', q:'How do requests reach you today?', type:'multi', options:['Phone','Email','WhatsApp','Walk-in','Existing CAFM','BMS alarms','Tenant app'] },
      { id:'monthly_volume', q:'Roughly how many reactive work orders per month?', type:'select', options:['< 200','200–1,000','1,000–5,000','5,000+'] },
      { id:'sites', q:'How many sites are in scope for go-live?', type:'number', placeholder:'e.g. 12' },
      { id:'wo_prefix', q:'What ID format do you want for work orders?', type:'text', placeholder:'e.g. WO-10482, or a prefix per site like MT-' }
    ]},
    { section: 'Priorities, SLAs & escalation', questions: [
      { id:'has_sla', q:'Do you have contractual SLAs today?', type:'yesno', hint:'If yes, bring the SLA schedule.' },
      { id:'priority_levels', q:'How many priority levels do you use?', type:'select', options:['3 (High, Medium, Low)','4 (P1 to P4)','5 or more','None defined yet'] },
      { id:'sla_pause', q:'Which situations should pause the SLA clock?', type:'multi', options:['Awaiting parts','Awaiting tenant access','Awaiting approval','Vendor attending','Outside business hours','None'] },
      { id:'escalation', q:'Describe your escalation path when a job runs late.', type:'long', placeholder:'e.g. after 15 min to supervisor, after 1 h to FM, P1 to client account manager' }
    ]},
    { section: 'Execution & cost', questions: [
      { id:'vendor_share', q:'Roughly what share of reactive work goes to vendors?', type:'select', options:['< 10%','10–30%','30–60%','> 60%'] },
      { id:'closure_evidence', q:'What evidence must be captured before a job is resolved?', type:'multi', options:['After photo','Readings','Checklist complete','Requester signature','Vendor report','Root cause'] },
      { id:'cost_capture', q:'Do you need labour and parts cost on every work order?', type:'yesno', hint:'Tell us if costs are recharged to tenants or clients.' },
      { id:'approval_threshold', q:'Above what cost does a job need approval, and from whom?', type:'text', placeholder:'e.g. AED 5,000, FM; AED 25,000, client' }
    ]},
    { section: 'Closure & reporting', questions: [
      { id:'verify_who', q:'Who verifies a job before it closes?', type:'select', options:['Technician closes directly','Supervisor','Requester','Supervisor then requester','Auto-close after X days'] },
      { id:'maturity', q:'How mature is your current work order process?', type:'scale', options:['Ad hoc','Spreadsheets','Basic system','Well defined','Optimised'] },
      { id:'reports', q:'Which numbers does leadership or your client review each month?', type:'long', placeholder:'e.g. SLA % by site, backlog age, cost per sq ft, repeat failures' }
    ]}
  ]
});


MODS.push({
  key: 'sr',
  name: 'Service Requests & Tenant Portal',
  short: 'Service Requests',
  group: 'Service & people',
  icon: 'headset',
  accent: 'cyan',
  tagline: 'A front door for tenants, from request to rating',
  lede: 'This brief shows how your tenants and occupants will request services, track them and give feedback through Facilio, and how your helpdesk turns those requests into work. Fill in the form at the end so we can draft your service catalogue before the workshop.',
  about: [
    'Service Requests are the customer-facing side of Facilio. Tenants, occupants and staff pick a service from your catalogue on the portal, mobile app or by email, and see status updates without phoning the helpdesk.',
    'The helpdesk triages each request. Simple fixes convert to a work order, chargeable work gets a quote that the tenant approves online, and every closed request asks for a rating. Announcements, building notices and FAQs go out through the same portal so tenants have one place to look.'
  ],
  who: [
    ['building-2','Tenants & occupants','Raise requests, approve quotes, rate the service'],
    ['headset','Helpdesk agents','Triage, reply, convert to work orders'],
    ['user-cog','Property & tenant managers','Manage catalogue, notices and tenant relations'],
    ['wallet','Finance','Bill approved quotes and recharges to tenants']
  ],
  solves: [
    ['Tenants phone or email the building manager and then chase for updates.','Branded portal with live status, comments and notifications','Fewer chaser calls'],
    ['Every request is free text, so the helpdesk rewrites it before dispatch.','Service catalogue with forms that ask the right questions up front','Clean data at intake'],
    ['Chargeable work starts before the tenant agrees a price and invoices are disputed.','Quotes sent from the request, approved online before work starts','No billing disputes'],
    ['You only hear about poor service when a lease renewal is at risk.','CSAT survey on every closed request, trends by building and team','Early warning on churn']
  ],
  fieldGroups: {
    'Request details': [
      ['subject','Subject','Text','Short title shown to the tenant and helpdesk','yes'],
      ['service','Service','Lookup','Item from the service catalogue, e.g. "Extra AC hours"','yes'],
      ['description','Description','Rich text','What the tenant needs, in their words','no'],
      ['attachments','Photos & files','File','Photos, floor plan mark-ups, documents','no'],
      ['sr_id','Request ID','System','Unique number, e.g. SR-20931','auto'],
      ['source','Source','System','Portal, Mobile app, Email, Phone, Walk-in','auto']
    ],
    'Requester & location': [
      ['requester','Requester','Lookup','Tenant contact or occupant who raised it','yes'],
      ['tenant','Tenant / company','Lookup','Lease holder the request belongs to','auto'],
      ['site','Site','Lookup','Property, defaults from the tenant lease','yes'],
      ['unit','Unit / space','Lookup','Office, shop or apartment number','yes'],
      ['preferred_slot','Preferred visit time','Date & time','When the tenant wants the visit','no'],
      ['contact_pref','Contact preference','Picklist','Portal only, Email, SMS, WhatsApp','no']
    ],
    'Handling & SLA': [
      ['category','Category','Picklist','Maintenance, Cleaning, Access & security, Move in/out, Admin','yes'],
      ['priority','Priority','Picklist','Urgent, Normal, Low','yes'],
      ['agent','Helpdesk owner','Lookup','Agent responsible for replies','no'],
      ['first_response_due','First response due','Date & time','From the service SLA','auto'],
      ['linked_wo','Linked work order','Lookup','Work order created from this request','auto'],
      ['status','Status','System','Open, In review, Quote sent, Work in progress, Resolved, Closed','auto']
    ],
    'Quote, billing & feedback': [
      ['chargeable','Chargeable','Boolean','Whether the tenant pays for this service','no'],
      ['quote_amount','Quote amount','Currency','Total of quote lines incl. tax','no'],
      ['quote_approval','Quote approval','Signature','Tenant approval captured on the portal','no'],
      ['po_ref','Tenant PO number','Text','Tenant purchase order for billing','no'],
      ['csat','CSAT rating','Number','1 to 5 rating after closure','auto'],
      ['feedback','Feedback comment','Text','Free text from the survey','no']
    ]
  },
  flows: [
    {
      title: 'Chargeable office alteration with a quote',
      scenario: 'A tenant at Harbour Point asks for two extra power points and a data outlet in a new meeting room.',
      steps: [
        { actor: 'Tenant', channel: 'Portal', text: 'Picks "Minor works: electrical" from the catalogue, marks up the floor plan and uploads it.', status: 'Open' },
        { actor: 'Helpdesk', channel: 'Web app', text: 'Reviews, flags as chargeable, asks for the preferred date. Tenant replies in the request thread.', status: 'In review' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Builds quote Q-3318: 6 h electrician, 2 sockets, 1 data point, cabling. AED 2,850 + VAT.', status: 'Quote sent' },
        { actor: 'Tenant', channel: 'Portal', text: 'Approves the quote online and adds PO 45-2209. Signature and timestamp stored.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Converts to WO-10511 for the Electrical team, booked for Saturday 08:00 outside trading hours.', status: 'Work in progress' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Completes work, tests circuits, uploads photos and the tenant rep signs on the phone.', status: 'Resolved' },
        { actor: 'Finance', channel: 'Web app', text: 'Raises the recharge invoice from the approved quote. Tenant rates the job 5 of 5.', status: 'Closed' }
      ],
      outcome: 'Request to completion in 4 working days, billed at the approved AED 2,850 with zero back-and-forth on price.'
    },
    {
      title: 'After-hours AC extension and a low rating',
      scenario: 'An occupant at Marina Tower needs cooling until 22:00 for a project deadline and the request is handled late.',
      steps: [
        { actor: 'Tenant', channel: 'Mobile app', text: 'Requests "Extra AC hours", floor 9, 18:00 to 22:00 tonight. Catalogue shows AED 120 per hour.', status: 'Open' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Auto-approves under the tenant\'s monthly allowance and creates a task for the BMS operator.', status: 'Work in progress' },
        { actor: 'Facilio (automation)', channel: 'Email/SMS', text: 'Operator has not confirmed by 17:45. Escalates to duty engineer S. Khan.', status: '' },
        { actor: 'Supervisor', channel: 'BMS', text: 'Extends the AHU-9 schedule at 18:20. Tenant notified that cooling is on.', status: 'Resolved' },
        { actor: 'Tenant', channel: 'Portal', text: 'Rates 2 of 5: "Office was warm for 20 minutes". Survey closes the request.', status: 'Closed' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Rating below 3 opens a follow-up for the property manager with a 24 h response target.', status: '' }
      ],
      outcome: 'Cooling delivered 20 minutes late, 4 hours (AED 480) recharged, and the low rating reached the property manager the same evening.'
    }
  ],
  process: {
    title: 'Lifecycle of a service request',
    statuses: ['Open','In review','Quote sent','Work in progress','Resolved','Closed'],
    steps: [
      { t:'Request', s:'Tenant picks a service', who:'Tenant, occupant', statusOn:0,
        p:'The tenant chooses a service from your catalogue on the portal, mobile app or by email. Each service has its own form, so the request arrives with the location, photos and details needed.',
        happens:['Request ID sent to the tenant','Location defaulted from the tenant lease','First response SLA starts'],
        decide:['Services in your catalogue and their forms','Who in each tenant can raise requests','Which channels feed the helpdesk'] },
      { t:'Review', s:'Helpdesk triages', who:'Helpdesk agent', statusOn:1,
        p:'An agent checks the request, replies in the thread if anything is missing and decides how to handle it. Rules can skip review for routine services.',
        happens:['Category and priority confirmed','Two-way comments with the tenant','Duplicates merged'],
        decide:['Which services skip review','First response targets per service','Canned replies and templates'] },
      { t:'Quote', s:'Price chargeable work', who:'Supervisor, tenant', statusOn:2,
        p:'For chargeable work the team sends a quote from the request. The tenant approves or rejects it online, with a PO number if they need one.',
        happens:['Quote built from rate card lines','Tenant approves with a signature','Rejected quotes close with a reason'],
        decide:['Which services are chargeable','Your rate card and markup','Who can approve a quote on the tenant side'] },
      { t:'Fulfil', s:'Convert and deliver', who:'Helpdesk, technicians', statusOn:3,
        p:'The request converts to one or more work orders. The tenant sees progress on the portal while the team works, and the request resolves when the work orders do.',
        happens:['Work order inherits location, photos and slot','Status mirrored back to the tenant','Booked slot shown on the team calendar'],
        decide:['Which services always create a work order','What the tenant sees of the work order','Notification wording per status'] },
      { t:'Feedback', s:'Rate and close', who:'Tenant, property manager', statusOn:5,
        p:'When the work is done the tenant gets a short survey. Low scores open a follow-up for the property manager, and ratings roll up by building, service and team.',
        happens:['CSAT survey sent on resolve','Auto-close if no response in X days','Low ratings raise a follow-up'],
        decide:['Survey questions and scale','Score that triggers a follow-up','Auto-close period'] }
    ]
  },
  screens: [
    { kind:'mobile', title:'Tenant portal & app', desc:'Tenants browse the catalogue, raise requests with photos, approve quotes and read building notices from one app.',
      mobile:{ bar:'Harbour Point · Unit 1204', btn:'New request', items:[['SR-20931 · Extra AC hours','Floor 12 · Work in progress'],['SR-20918 · Minor works quote','AED 2,850 · Awaiting your approval'],['Notice: Water shutdown','Sat 26 Oct · 06:00 to 10:00'],['Rate your last request','SR-20877 · Pantry leak fixed']],
        noteTitle:'Your brand, your services', note:'<span>The portal uses your logo, colours and domain, and shows only the services each tenant is entitled to.</span><span>Tenants can also raise requests by replying to email.</span>' }},
    { kind:'list', title:'Helpdesk request queue', desc:'Agents work one queue across portal, email and phone, sorted by first response due, with quotes and linked work orders in view.',
      list:{ title:'Service Requests', sub:'312 open · 14 awaiting tenant', cta:'New Request', filters:['Site: All','Status: Open','Service','Unassigned'],
        cols:['ID','Subject','Tenant','Site','Status','Response due'],
        rows:[
          ['SR-20931','Extra AC hours, floor 12','Al Noor Legal','Harbour Point','<span class="s-badge info">Work in progress</span>','Met'],
          ['SR-20918','Two sockets + data, meeting rm','Gulfline Shipping','Harbour Point','<span class="s-badge md">Quote sent</span>','Met'],
          ['SR-20925','Access card for new joiner','Vertex Tech','Marina Tower','<span class="s-badge lo">Open</span>','15 min'],
          ['SR-20922','Shop shutter jammed','Zara (Unit G-14)','City Centre Mall','<span class="s-badge hi">In review</span>','Overdue'],
          ['SR-20909','Deep clean after fit-out','Orbit Advisory','Marina Tower','<span class="s-badge ok">Resolved</span>','Met']
        ]}},
    { kind:'detail', title:'Request with quote', desc:'The request thread, the quote the tenant approved, the linked work order and the feedback, all on one record.',
      detail:{ id:'SR-20918 · Minor works', title:'Two sockets and a data point, meeting room', badge:'<span class="s-badge md">Quote sent</span>',
        tabs:['Conversation','Quote','Work orders','Feedback','Activity'],
        kv:[['Tenant','Gulfline Shipping'],['Requester','A. Rahman'],['Site','Harbour Point'],['Unit','Office 1204'],['Service','Minor works: electrical'],['Chargeable','Yes'],['Preferred slot','Sat 08:00'],['Owner','Helpdesk · L. Pereira']],
        sideTitle:'Quote Q-3318',
        side:'<div class="s-kv"><div><small>Labour 6 h</small><span>AED 1,320</span></div><div><small>Materials</small><span>AED 1,230</span></div><div><small>Cabling &amp; containment</small><span>AED 300</span></div><div><small>Total excl. VAT</small><span>AED 2,850</span></div><div><small>Valid until</small><span>30 Oct</span></div></div>' }},
    { kind:'insight', title:'Tenant experience dashboard', desc:'Volume, first response, CSAT and quote conversion by building, so property managers see service quality before renewals.',
      insight:{ title:'Tenant experience', range:'Last 90 days', body:'<div class="s-grid" style="grid-template-columns:repeat(4,1fr)"><div class="s-card s-kpi"><b>2,946</b><small>Requests raised</small></div><div class="s-card s-kpi"><b>4.5 / 5</b><small>Average CSAT</small></div><div class="s-card s-kpi"><b>11 min</b><small>Median first response</small></div><div class="s-card s-kpi"><b>72%</b><small>Quotes approved</small></div></div><div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1"><div class="s-card" style="flex:1"><h4>CSAT by building</h4><div class="s-bars"><i style="height:92%"></i><i style="height:88%"></i><i class="alt" style="height:71%"></i><i style="height:90%"></i><i style="height:85%"></i><i class="alt" style="height:76%"></i></div></div><div class="s-card"><h4>Top services</h4><div class="s-kv"><div><small>Extra AC hours</small><span>612</span></div><div><small>Access cards</small><span>488</span></div><div><small>Minor works</small><span>301</span></div><div><small>Cleaning</small><span>277</span></div></div></div></div>' }}
  ],
  videos: ['sr','tenant','wo','notifications','tour','dashboards'],
  bring: [
    ['List of services you offer tenants','Including after-hours AC, access cards, cleaning, minor works, move in/out'],
    ['Rate card for chargeable work','Hourly rates, markups and standard prices per service'],
    ['Tenant and contact list','Companies, units, lease dates and who can raise or approve'],
    ['Your branding','Logo, colours and the domain you want for the portal'],
    ['Lease or service charge clauses','What is included in service charge and what is billable'],
    ['Current feedback or survey','Any CSAT, NPS or complaint log you keep today']
  ],
  people: [['headset','Helpdesk lead'],['building-2','Property or tenant relations manager'],['user-cog','Facility manager'],['wallet','Finance or billing lead'],['server','IT or brand / marketing contact']],
  form: [
    { section: 'Tenants & channels', questions: [
      { id:'portal_users', q:'Who will use the portal?', type:'multi', options:['Commercial tenants','Retail tenants','Residents','Internal staff','Visitors','Contractors'] },
      { id:'tenant_count', q:'How many tenant companies or units are in scope?', type:'number', placeholder:'e.g. 340' },
      { id:'portal_domain', q:'What domain or name should the portal use?', type:'text', placeholder:'e.g. help.marinatower.ae' },
      { id:'channels_keep', q:'Which channels must still create requests besides the portal?', type:'multi', options:['Email','Phone','WhatsApp','Walk-in reception','Mobile app','QR posters'] }
    ]},
    { section: 'Service catalogue', questions: [
      { id:'catalogue', q:'List the services tenants request most often.', type:'long', placeholder:'e.g. extra AC hours, access cards, pest control, minor works, deliveries' },
      { id:'catalogue_size', q:'Roughly how many services will the catalogue have?', type:'select', options:['< 10','10–25','25–50','50+'] },
      { id:'review_needed', q:'Should every request be reviewed by the helpdesk before work starts?', type:'yesno', hint:'If no, tell us which services can go straight to a work order.' }
    ]},
    { section: 'Quotes & billing', questions: [
      { id:'chargeable', q:'Do you charge tenants for some services?', type:'yesno', hint:'Bring your rate card if yes.' },
      { id:'quote_approver', q:'Who approves quotes on the tenant side?', type:'select', options:['Any tenant contact','Named tenant admin','Tenant admin with PO','Property manager on their behalf'] },
      { id:'billing_system', q:'Where are recharge invoices raised today?', type:'text', placeholder:'e.g. Yardi, SAP, Oracle, manual in Excel' }
    ]},
    { section: 'Feedback & communication', questions: [
      { id:'csat_scale', q:'How do you want tenants to rate a request?', type:'select', options:['1 to 5 stars','Thumbs up / down','NPS 0 to 10','No survey'] },
      { id:'notice_types', q:'Which announcements will you send through the portal?', type:'multi', options:['Planned shutdowns','Fire drills','Events','Policy updates','Emergency alerts','Newsletters'] },
      { id:'experience_today', q:'How would tenants rate your service experience today?', type:'scale', options:['Poor','Below average','Average','Good','Excellent'] }
    ]}
  ]
});


MODS.push({
  key: 'fsm',
  name: 'Field Service & Mobile',
  short: 'Field Service',
  group: 'Maintenance',
  icon: 'smartphone',
  accent: 'orange',
  tagline: 'Dispatch the right technician and run the job on site',
  lede: 'This brief shows how your technicians will receive, travel to and complete jobs on the Facilio mobile app, and how your dispatchers plan the day. Fill in the form at the end so we can set up your teams, skills, shifts and safety rules before the workshop.',
  about: [
    'Field Service & Mobile covers everything between a job being assigned and a technician leaving site. Dispatchers plan work on a board by shift, skill and location, and technicians run their day from the mobile app, online or offline.',
    'On site the app opens the asset by QR scan, walks the technician through tasks, readings and photos, and blocks high-risk work until a permit to work and safety checks are signed. Attendance, travel and time on tools flow back to work orders, so SLA, cost and utilisation reports use real field data.'
  ],
  who: [
    ['wrench','Technicians','Run the day on mobile: jobs, scans, photos, sign-off'],
    ['map','Dispatchers','Plan and reassign jobs by skill, shift and location'],
    ['hard-hat','HSE & permit issuers','Issue permits, check isolations, close out safely'],
    ['user-check','Team supervisors','Track attendance, utilisation and first-time fix']
  ],
  solves: [
    ['Dispatch happens on WhatsApp groups and nobody can see who is free.','Dispatch board shows every technician, shift and job on one screen','Live view of the field'],
    ['Basements and plant rooms have no signal, so updates are written up later.','Full offline mode with sync and original timestamps kept','Real-time records'],
    ['Hot work and HV jobs start without a valid permit.','Permit to work and safety checklist must be signed before tasks unlock','Permit compliance'],
    ['Jobs go to whoever is closest, not who is qualified, and get repeat visits.','Skills and certification matching at assignment','Higher first-time fix']
  ],
  fieldGroups: {
    'Technician & shift': [
      ['technician','Technician','Lookup','Field user receiving the job','yes'],
      ['skills','Skills & certifications','Multi-select','HVAC, LV electrical, HV authorised, F-gas, Working at height','yes'],
      ['cert_expiry','Certification expiry','Date','Expiry per certificate; expired skills block assignment','no'],
      ['shift','Shift','Schedule','Day 07:00 to 15:00, Evening, Night, On-call rota','yes'],
      ['home_site','Home site / zone','Lookup','Default site or cluster for routing','no'],
      ['attendance','Attendance','Time log','Clock in and out with geofence check','auto']
    ],
    'Dispatch & travel': [
      ['dispatch_status','Dispatch status','Picklist','Unassigned, Dispatched, Accepted, En route, On site, Completed','auto'],
      ['scheduled_start','Scheduled start','Date & time','Slot booked on the dispatch board','yes'],
      ['est_duration','Estimated duration','Duration','Used to fit jobs into the shift','no'],
      ['travel_time','Travel time','Duration','From en route to arrival, captured by the app','auto'],
      ['arrival_location','Arrival location','System','GPS point on arrival, checked against site geofence','auto'],
      ['assign_rule','Assignment rule','Rule','Match on skill, shift, zone and current workload','no']
    ],
    'On-site execution': [
      ['qr_check','Asset scan','System','QR or barcode scan confirming the technician is at the asset','auto'],
      ['tasks','Tasks','Checklist','Steps with readings, pass/fail and mandatory photos','yes'],
      ['readings','Readings','Reading','Supply air temp, ΔP, run-hours, insulation resistance','no'],
      ['photos','Before & after photos','File','Captured in-app with time and location stamp','no'],
      ['time_on_tools','Time on tools','Time log','Start, pause and finish by technician','auto'],
      ['customer_signoff','Customer sign-off','Signature','Tenant or site rep signs on the device','no']
    ],
    'Permit & safety': [
      ['permit_type','Permit type','Picklist','Hot work, Electrical isolation, Confined space, Working at height, Roof access','no'],
      ['permit_validity','Permit validity','Date & time','Start and expiry of the permit window','no'],
      ['risk_assessment','Risk assessment / method statement','File','RAMS attached to the permit','no'],
      ['safety_checks','Pre-start safety checks','Checklist','PPE, LOTO applied, gas test, fire watch, barriers','yes'],
      ['issuer_sign','Permit issuer approval','Signature','Authorised person signs before work starts','yes'],
      ['permit_closeout','Permit close-out','Signature','Area made safe, isolations removed, permit closed','yes']
    ]
  },
  flows: [
    {
      title: 'Chiller fault dispatched to a qualified technician',
      scenario: 'A BMS alarm reports high condenser pressure on CH-02 at Marina Tower at 15:20, near the day shift change.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'BMS alarm', text: 'Creates WO-10533, P1, HVAC. Needs skill "Chiller / F-gas". Day shift ends 15:00, so it checks evening shift.', status: 'Unassigned' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Suggests R. Menon: F-gas cert valid, clocked in 14:58, 9 min away at Harbour Point.', status: '' },
        { actor: 'Dispatcher', channel: 'Web app', text: 'Drags the job onto R. Menon on the dispatch board and moves his PPM filter job to tomorrow.', status: 'Dispatched' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Accepts, taps En route. App records departure and arrival inside the Marina Tower geofence at 15:41.', status: 'En route' },
        { actor: 'Technician', channel: 'QR scan', text: 'Scans CH-02 tag on the roof. Asset history shows a fouled condenser 6 months ago.', status: 'On site' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Offline on the roof: cleans condenser, logs head pressure 14.8 bar, adds photos. Syncs at 16:55.', status: '' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Chief engineer signs on the phone. Job completes with 21 min travel and 1 h 10 min on tools.', status: 'Completed' }
      ],
      outcome: 'Qualified technician on site 21 minutes after the alarm, fixed first time, inside the 4 h P1 resolution target.'
    },
    {
      title: 'Hot work on a roof under permit to work',
      scenario: 'A vendor welder needs to repair a cooling tower bracket on the City Centre Mall roof.',
      steps: [
        { actor: 'Supervisor', channel: 'Web app', text: 'Schedules WO-10540 for Tuesday 07:00 and requests a Hot work + Roof access permit with RAMS attached.', status: 'Dispatched' },
        { actor: 'Supervisor', channel: 'Web app', text: 'HSE officer S. Khan approves PTW-0871, valid 07:00 to 11:00, fire watch required.', status: '' },
        { actor: 'Vendor', channel: 'Mobile app', text: 'Arrives and checks in by QR at the roof door. Tasks stay locked until safety checks are done.', status: 'On site' },
        { actor: 'Vendor', channel: 'Mobile app', text: 'Ticks PPE, harness, extinguisher in place, smoke detectors isolated (BMS ref attached).', status: '' },
        { actor: 'Supervisor', channel: 'Mobile app', text: 'Issuer inspects the area and signs on the device. Tasks unlock at 07:24.', status: 'In progress' },
        { actor: 'Vendor', channel: 'Mobile app', text: 'Finishes 09:50, uploads weld photos. Fire watch logs 60 min post-work check.', status: 'Completed' },
        { actor: 'Supervisor', channel: 'Mobile app', text: 'Signs permit close-out at 10:55 after detectors are restored. Permit and evidence stay on the WO.', status: '' }
      ],
      outcome: 'Hot work done inside the 4-hour permit window with every check, signature and photo on record for the next HSE audit.'
    }
  ],
  process: {
    title: 'A field job from dispatch to sign-off',
    statuses: ['Unassigned','Dispatched','En route','On site','In progress','Completed'],
    steps: [
      { t:'Plan', s:'Fit jobs to shifts and skills', who:'Dispatcher, supervisor', statusOn:0,
        p:'Jobs from work orders, PPM and service requests land on the dispatch board. The dispatcher sees who is on shift, their skills and current load, and Facilio suggests the best match.',
        happens:['Unassigned jobs listed by SLA due','Technicians shown by shift, zone and load','Expired certifications excluded from matches'],
        decide:['Your skills and certification list','Shift patterns and on-call rota','Auto-assign or dispatcher approval'] },
      { t:'Dispatch', s:'Send the job to the technician', who:'Dispatcher, system', statusOn:1,
        p:'The job is pushed to the technician\'s phone with location, asset, tasks and access notes. If nobody accepts in time, it goes back to the board or to the next candidate.',
        happens:['Push notification with job pack','Acceptance timer runs','Reassignment logged for reporting'],
        decide:['How long a technician has to accept','What happens on rejection','Whether vendors use the same app'] },
      { t:'Travel', s:'Go to site and check in', who:'Technician', statusOn:2,
        p:'The technician taps En route and the app records travel. On arrival a geofence or QR scan confirms they are at the right site and asset.',
        happens:['Travel time captured','Arrival checked against site geofence','Response SLA stamped on arrival'],
        decide:['Whether GPS tracking is allowed in your region','Geofence radius per site','QR or geofence as proof of arrival'] },
      { t:'Make safe', s:'Permit and safety checks', who:'Technician, permit issuer', statusOn:3,
        p:'For high-risk work the app requires a valid permit to work and a pre-start safety checklist. Tasks stay locked until the issuer signs.',
        happens:['Permit validity checked on device','LOTO, PPE and gas test captured','Issuer signature unlocks tasks'],
        decide:['Which job types need which permit','Who can issue and close permits','Your standard pre-start checks'] },
      { t:'Complete', s:'Do the work and sign off', who:'Technician, customer', statusOn:5,
        p:'The technician completes tasks offline or online, records readings and photos, and gets a customer signature. The permit is closed and the job syncs back to the work order.',
        happens:['Tasks, readings and photos synced','Time on tools and travel posted to the WO','Permit closed out with the area made safe'],
        decide:['Mandatory evidence before completion','Who signs on the customer side','Offline data retention on the device'] }
    ]
  },
  screens: [
    { kind:'mobile', title:'Technician day view', desc:'Technicians see today\'s jobs in route order, tap En route, scan the asset and work offline with photos and signatures.',
      mobile:{ bar:'Today · 5 jobs · Day shift', btn:'Scan asset QR', items:[['CH-02 high head pressure','Marina Tower · Roof · P1 · 9 min'],['Quarterly AHU service','Marina Tower · L4 · PPM'],['DB-4F-02 trip','Harbour Point · L4 · P3 · 14 min'],['Hot work permit PTW-0871','City Centre Mall · Tue 07:00']],
        noteTitle:'Works offline', note:'<span>Job packs, manuals and checklists download at clock-in, so plant rooms without signal are not a problem.</span><span>Photos, readings and signatures sync with their original timestamps.</span>' }},
    { kind:'insight', title:'Dispatch board', desc:'Shifts and booked jobs by technician and day. Drag jobs between people and see clashes, overtime and skill gaps before you commit.',
      insight:{ title:'Dispatch board · MEP Team A', range:'Week of 13 Oct', body:'<div class="s-cal"><div style="min-height:auto;border:none;background:none;text-align:center">Mon</div><div style="min-height:auto;border:none;background:none;text-align:center">Tue</div><div style="min-height:auto;border:none;background:none;text-align:center">Wed</div><div style="min-height:auto;border:none;background:none;text-align:center">Thu</div><div style="min-height:auto;border:none;background:none;text-align:center">Fri</div><div style="min-height:auto;border:none;background:none;text-align:center">Sat</div><div style="min-height:auto;border:none;background:none;text-align:center">Sun</div><div>13<em>R. Menon · Day</em><em class="g">AHU-3</em><em class="w">CH-02 P1</em></div><div>14<em>R. Menon · Day</em><em class="w">PTW hot work</em></div><div>15<em>R. Menon · Eve</em><em class="g">FCU filters</em></div><div>16<em>R. Menon · Eve</em><em class="g">Pumps P-01</em></div><div>17<em>Off</em></div><div>18<em class="w">On-call</em></div><div>19</div><div>13<em>A. Das · Day</em><em class="g">Lift L1 PPM</em></div><div>14<em>A. Das · Day</em><em class="g">DB-4F-02</em><em class="w">Overtime</em></div><div>15<em>A. Das · Day</em><em class="g">Gen run</em></div><div>16<em>Leave</em></div><div>17<em>Leave</em></div><div>18</div><div>19<em class="w">On-call</em></div><div>13<em>J. Fernandes · Night</em><em class="g">BMS checks</em></div><div>14<em>J. Fernandes · Night</em></div><div>15<em>J. Fernandes · Night</em><em class="w">Unassigned x2</em></div><div>16<em>J. Fernandes · Night</em><em class="g">Tank level</em></div><div>17<em>J. Fernandes · Night</em></div><div>18</div><div>19</div></div>' }},
    { kind:'detail', title:'Permit to work', desc:'The permit linked to a work order, with validity window, RAMS, safety checks and the signatures that unlock and close the job.',
      detail:{ id:'PTW-0871 · Hot work + Roof access', title:'Weld repair, cooling tower CT-2 bracket', badge:'<span class="s-badge info">Active</span>',
        tabs:['Permit','Safety checks','Signatures','Attachments','History'],
        kv:[['Work order','WO-10540'],['Site','City Centre Mall · Roof'],['Valid','Tue 07:00 to 11:00'],['Issuer','S. Khan (HSE)'],['Performer','Gulf Steel Works · 2 welders'],['Fire watch','Required · 60 min after'],['Isolations','Smoke detectors Z14, Z15'],['RAMS','RAMS-CT2-rev3.pdf']],
        sideTitle:'Pre-start checks 4 of 5',
        side:'<div class="s-task"><span class="s-box done"></span>PPE and harness inspected</div><div class="s-task"><span class="s-box done"></span>Extinguisher and fire blanket in place</div><div class="s-task"><span class="s-box done"></span>Detectors isolated, BMS ref logged</div><div class="s-task"><span class="s-box done"></span>Area barricaded, 10 m clear</div><div class="s-task"><span class="s-box"></span>Issuer signature to unlock tasks</div>' }},
    { kind:'list', title:'Field team status', desc:'Who is clocked in, where they are, what they are working on and when their certifications expire.',
      list:{ title:'Technicians', sub:'42 on shift · 6 on leave · 3 certs expiring', cta:'Add Technician', filters:['Team: All','Shift: Day','Skill','Status: On site'],
        cols:['Technician','Skills','Shift','Current job','Status','Cert expiry'],
        rows:[
          ['R. Menon','HVAC, F-gas, Chiller','Day 07–15','WO-10533 · CH-02','<span class="s-badge info">On site</span>','F-gas · Mar 2027'],
          ['A. Das','LV electrical, Lifts','Day 07–15','WO-10529 · DB-4F-02','<span class="s-badge md">En route</span>','<span class="s-badge md">LV · 28 days</span>'],
          ['J. Fernandes','BMS, HVAC','Night 23–07','None','<span class="s-badge lo">Off shift</span>','Valid'],
          ['M. Qureshi','Plumbing, Confined space','Day 07–15','WO-10531 · Pump P-07','<span class="s-badge ok">Completed</span>','<span class="s-badge hi">CS · Expired</span>'],
          ['K. Pillai','HV authorised, LV','Eve 15–23','Unassigned','<span class="s-badge ok">Available</span>','HV AP · Jan 2027']
        ]}}
  ],
  videos: ['ppmTech','wo','tour','vendor','users','notifications'],
  bring: [
    ['Technician roster','Names, trades, home sites, employer (in-house or vendor) and phone models'],
    ['Skills and certificates','Trade tickets, HV authorisations, F-gas, confined space, with expiry dates'],
    ['Shift patterns and on-call rota','Shift times, rotations, weekend and night cover'],
    ['Permit to work procedure','Your PTW types, forms, issuer list and sample completed permits'],
    ['Standard safety checks','LOTO, PPE, gas test or pre-start checklists you use today'],
    ['Site addresses and access rules','Geofence points, gate passes, roof and plant room access']
  ],
  people: [['map','Dispatcher or helpdesk lead'],['user-check','Field supervisor'],['wrench','Two senior technicians'],['hard-hat','HSE manager or permit issuer'],['server','IT / mobile device contact']],
  form: [
    { section: 'Field team & devices', questions: [
      { id:'tech_count', q:'How many field technicians will use the app (in-house and vendor)?', type:'number', placeholder:'e.g. 85' },
      { id:'devices', q:'Which devices do technicians carry?', type:'multi', options:['Company Android','Company iPhone','Own phone (BYOD)','Rugged handheld','Tablet','Shared site device'] },
      { id:'connectivity', q:'How often do technicians work without mobile signal?', type:'scale', options:['Never','Rarely','Sometimes','Often','Most of the day'] },
      { id:'mdm', q:'Do you use mobile device management (Intune, MobileIron)?', type:'yesno', hint:'Tells us how the app will be deployed.' }
    ]},
    { section: 'Dispatch, shifts & skills', questions: [
      { id:'dispatch_mode', q:'How should jobs be assigned?', type:'select', options:['Dispatcher assigns all','System suggests, dispatcher confirms','Fully automatic','Technicians pick from a pool'] },
      { id:'shift_pattern', q:'Describe your shift and on-call pattern.', type:'long', placeholder:'e.g. day 07–15, evening 15–23, night 23–07, one on-call engineer per cluster at weekends' },
      { id:'skills_list', q:'Which skills or certifications must match before assigning a job?', type:'multi', options:['HVAC','LV electrical','HV authorised','F-gas','Lifts','Confined space','Working at height','Fire systems'] },
      { id:'gps_tracking', q:'Can the app record GPS on en route and arrival?', type:'select', options:['Yes, during jobs only','Yes, during shift','Arrival check only','No GPS'] }
    ]},
    { section: 'On site & evidence', questions: [
      { id:'qr_tags', q:'Are assets already tagged with QR or barcodes?', type:'select', options:['Yes, most assets','Some assets','No, we will tag during rollout','No tagging planned'] },
      { id:'signoff_needed', q:'Must the customer or tenant sign on the device to complete a job?', type:'yesno', hint:'Tell us which job types if only some.' },
      { id:'attendance_now', q:'How do technicians clock in today?', type:'text', placeholder:'e.g. biometric at site office, paper timesheet, HR app' }
    ]},
    { section: 'Permit to work & safety', questions: [
      { id:'permit_types', q:'Which permit types do you issue?', type:'multi', options:['Hot work','Electrical isolation','Confined space','Working at height','Roof access','Excavation','General work'] },
      { id:'permit_volume', q:'Roughly how many permits per month?', type:'select', options:['< 20','20–100','100–500','500+'] },
      { id:'permit_issuers', q:'Who can issue and close permits, and are vendors allowed to self-issue?', type:'long', placeholder:'e.g. HSE officers and chief engineer issue; vendors never self-issue; shift engineer closes after hours' }
    ]}
  ]
});


MODS.push({
  key: 'ppm',
  name: 'Preventive Maintenance',
  short: 'Preventive (PPM)',
  group: 'Maintenance',
  icon: 'calendar-clock',
  accent: 'green',
  tagline: 'Plan recurring maintenance once and let schedules run',
  lede: 'This brief shows how Facilio turns your maintenance plan into schedules that create jobs on time. Fill in the form at the end so we arrive at the workshop with your PPM scope already understood.',
  about: [
    'Preventive Maintenance (PPM) turns your maintenance plan into schedules that generate work orders automatically. You define what needs doing, on which assets, how often and by whom. Facilio creates the jobs ahead of time and tracks compliance for every occurrence.',
    'Plans can fire on the calendar (monthly, quarterly, annual), on a meter (every 500 run-hours) or on a condition from live BMS readings, such as filter ΔP above 250 Pa. Each plan carries a job plan with tasks, safety steps and parts, and the 52-week calendar and resource planner show load per team before jobs go out.'
  ],
  who: [
    ['calendar','Maintenance planners','Build plans, balance the calendar, manage team load'],
    ['wrench','Technicians & vendors','Receive planned jobs with job plans and parts ready'],
    ['shield-check','Compliance & HSE','Prove statutory inspections happened on time'],
    ['line-chart','Facility managers','Track PPM compliance and planned vs reactive ratio']
  ],
  solves: [
    ['Planned jobs live in a spreadsheet and some are simply forgotten.','Schedules generate work orders automatically, days before the due date','Nothing missed'],
    ['Audit time means weeks of chasing paper service sheets.','Every occurrence is recorded with readings, photos and sign-off','Audit in one report'],
    ['Chillers fail between services because frequencies are guesswork.','Run-hour and condition triggers service assets on real usage','Fewer breakdowns'],
    ['MEP Team A is overloaded one week and idle the next.','The resource planner shows hours per team so jobs can be spread out','Balanced workload']
  ],
  fieldGroups: {
    'Plan details': [
      ['plan_name','Plan name','Text','e.g. "Quarterly AHU service". Shown on generated work orders','yes'],
      ['category','Category','Lookup','Trade or discipline: HVAC, Fire, Electrical, Plumbing, Lifts','yes'],
      ['plan_type','Plan type','Picklist','Routine, Statutory, Warranty, Inspection','yes'],
      ['priority','Priority','Picklist','Priority applied to every generated work order','yes'],
      ['standard_ref','Standard reference','Text','SFG20 schedule, OEM manual or local code clause','no'],
      ['plan_id','Plan ID','System','Unique number with your prefix (e.g. PPM-0042)','auto']
    ],
    'Scope': [
      ['applies_to','Applies to','Picklist','Single asset, asset category, space or whole site','yes'],
      ['sites','Sites','Lookup','Which properties the plan covers','yes'],
      ['assets','Assets / categories','Lookup','Equipment included. New assets in a category join automatically','yes'],
      ['exclusions','Exclusions','Lookup','Specific assets to leave out, e.g. units under OEM AMC','no'],
      ['grouping','Job grouping','Picklist','One work order per asset, per floor, or one grouped job','yes']
    ],
    'Trigger & schedule': [
      ['trigger_type','Trigger type','Picklist','Time-based, Meter-based, Condition-based, Manual','yes'],
      ['frequency','Frequency','Schedule','Daily, weekly, monthly, quarterly, annual or custom pattern','yes'],
      ['meter_threshold','Meter threshold','Reading','e.g. every 500 run-hours or 10,000 lift starts','no'],
      ['condition_rule','Condition rule','Rule','e.g. filter ΔP above 250 Pa for 2 hours','no'],
      ['start_end','Start / end date','Date','When the plan starts and optionally stops','yes'],
      ['lead_time','Lead time','Duration','How far ahead work orders are created','no'],
      ['skip_rules','Skip rules','Rule','Skip public holidays, Ramadan hours, or if last job is still open','no']
    ],
    'Job plan & compliance': [
      ['job_plan','Job plan','Checklist','Tasks, readings and pass/fail checks copied to each job','yes'],
      ['safety_plan','Safety plan','Checklist','LOTO, PPE and permit to work steps before tasks unlock','no'],
      ['team','Team / vendor','Lookup','Who receives generated work orders','yes'],
      ['est_duration','Estimated duration','Duration','Hours per asset. Feeds the resource planner','no'],
      ['parts','Required parts','Lookup','Filters, belts, grease reserved from inventory','no'],
      ['compliance','Compliance status','System','On time, Late, Missed, calculated per occurrence','auto']
    ]
  },
  flows: [
    {
      title: 'Quarterly AHU service across three sites',
      scenario: 'The planner needs 14 AHUs at Marina Tower, Harbour Point and City Centre Mall serviced every quarter.',
      steps: [
        { actor: 'Planner', channel: 'Web app', text: 'Creates PPM-0042 for category AHU across 3 sites, quarterly, 7-day lead time, SFG20 job plan.', status: 'Scheduled' },
        { actor: 'Planner', channel: 'Web app', text: 'Checks the resource planner: MEP Team A at 92% in week 44, so moves Harbour Point units to week 45.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Seven days before due, creates 14 work orders, one per AHU, and reserves 28 G4 filters from store.', status: 'Generated' },
        { actor: 'Technician', channel: 'Mobile app', text: 'R. Menon scans AHU-3, completes LOTO steps, replaces filters and records coil ΔP of 145 Pa.', status: 'In progress' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Marks belt check failed on AHU-7. A corrective work order WO-10533 is raised from the task.', status: '' },
        { actor: 'Supervisor', channel: 'Web app', text: 'S. Khan reviews photos and readings, then verifies the jobs.', status: 'Verified' }
      ],
      outcome: 'All 14 AHUs serviced inside the due window, 100% on-time compliance, one defect caught before failure.'
    },
    {
      title: 'Chiller service on run-hours',
      scenario: 'Chiller CH-02 at Marina Tower must be serviced every 500 run-hours, read from the BMS.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'BMS alarm', text: 'Run-hour meter on CH-02 reaches 4,520 h, 480 h since the last service.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Threshold of 500 h will be hit in about 2 days, so the work order is generated now.', status: 'Generated' },
        { actor: 'Facilio (automation)', channel: 'Email/SMS', text: 'Chiller vendor Coolserv AMC is notified with the job plan and access window 22:00–04:00.', status: '' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Technician logs oil pressure, refrigerant pressures and approach temperature, uploads service report.', status: 'In progress' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Checks the readings against limits and closes the job. Meter counter resets.', status: 'Completed' }
      ],
      outcome: 'CH-02 serviced at 503 run-hours with no daytime downtime, against a calendar plan that would have run 6 weeks late.'
    }
  ],
  process: {
    title: 'Lifecycle of a maintenance plan',
    statuses: ['Scheduled','Generated','In progress','Overdue','Completed','Verified'],
    steps: [
      { t:'Define', s:'Decide what to maintain', who:'Planner, engineer', statusOn:0,
        p:'Start from your maintenance strategy, SFG20, OEM guidance or statutory requirements. Each plan describes the work, which assets it covers and the job plan with tasks and safety steps.',
        happens:['Plan created with scope and job plan','Job plans reused across sites and categories','Statutory plans flagged for compliance reporting'],
        decide:['Which standard you follow (OEM, SFG20, local code)','How assets are grouped into plans','Who owns and approves each plan'] },
      { t:'Schedule', s:'Set the trigger and calendar', who:'Planner', statusOn:0,
        p:'Choose how the plan fires: on the calendar, on a meter, or on a sensor condition. Lead time and skip rules make sure jobs arrive when your team can act on them.',
        happens:['Occurrences projected on the 52-week calendar','Hours previewed per team in the resource planner','Holidays and blackout windows respected'],
        decide:['Calendar vs meter vs condition triggers per asset type','Lead time before due date','Blackout periods and night-work rules'] },
      { t:'Generate', s:'Jobs are created automatically', who:'Facilio (automation)', statusOn:1,
        p:'Ahead of each due date, Facilio generates work orders from the plan, one per asset or grouped, and routes them to the assigned team or vendor with parts reserved.',
        happens:['Work orders created with job plan attached','Parts reserved from inventory','Team or vendor notified on mobile or portal'],
        decide:['One job per asset or grouped jobs','Assign to a person or to a team queue','Whether generated jobs need approval'] },
      { t:'Execute', s:'Carry out the service', who:'Technician, vendor', statusOn:2,
        p:'The technician completes safety steps, then the tasks, capturing readings and photos. A failed check raises a corrective work order on the spot.',
        happens:['Readings stored against the asset','Failed checks raise follow-up jobs','Late jobs move to Overdue and escalate'],
        decide:['Which readings are mandatory','What a failed check should trigger','Evidence required for statutory items'] },
      { t:'Review', s:'Measure and improve', who:'Facility manager', statusOn:5,
        p:'A supervisor verifies the work and compliance is calculated per occurrence. Over time, failure and cost data shows which frequencies to tighten or relax.',
        happens:['On-time, late and missed tracked per plan and site','Compliance reports ready for audits and clients','Asset history informs plan changes'],
        decide:['Your compliance target and grace window','Who verifies completed PPMs','How often plans are reviewed'] }
    ]
  },
  screens: [
    { kind:'list', title:'Planned maintenance list', desc:'All plans with scope, trigger, next due date and compliance at a glance. Filter to statutory plans before an audit.',
      list:{ title:'Planned Maintenance', sub:'214 active plans · 96.1% compliance', cta:'New Plan', filters:['Site: All','Trigger','Type: Statutory','Team'],
        cols:['Plan','Scope','Trigger','Type','Next due','Compliance'],
        rows:[
          ['Quarterly AHU service','14 AHUs · 3 sites','Every 3 months','Routine','02 Nov','<span class="s-badge ok">98%</span>'],
          ['Fire alarm weekly test','All sites','Weekly','<span class="s-badge hi">Statutory</span>','Mon 19 Oct','<span class="s-badge ok">100%</span>'],
          ['Chiller run-hour service','4 chillers','500 run-hours','Meter','~ 9 days','<span class="s-badge ok">95%</span>'],
          ['Lift monthly inspection','11 lifts','Monthly','<span class="s-badge hi">Statutory</span>','28 Oct','<span class="s-badge md">88%</span>'],
          ['AHU filter change on ΔP','14 AHUs','ΔP &gt; 250 Pa','Condition','On trigger','<span class="s-badge info">n/a</span>']
        ]}},
    { kind:'detail', title:'Plan with job plan', desc:'Scope, trigger, schedule and job plan on one record. Every generated work order inherits these settings.',
      detail:{ id:'PPM-0042 · Routine', title:'Quarterly AHU service', badge:'<span class="s-badge ok">Active</span>',
        tabs:['Details','Scope','Schedule','Job plan','History'],
        kv:[['Trigger','Time-based'],['Frequency','Every 3 months'],['Scope','Category: AHU'],['Sites','3 sites · 14 assets'],['Lead time','7 days'],['Team','MEP Team A'],['Est. duration','2 h per asset'],['Standard','SFG20 15-03']],
        sideTitle:'Job plan · 5 tasks',
        side:`<div class="s-task"><span class="s-box"></span>LOTO and permit to work</div><div class="s-task"><span class="s-box"></span>Inspect and replace G4 filters</div><div class="s-task"><span class="s-box"></span>Check belts and bearings</div><div class="s-task"><span class="s-box"></span>Record ΔP across coil (Pa)</div><div class="s-task"><span class="s-box"></span>Photo of nameplate and filters</div>`}},
    { kind:'insight', title:'52-week PPM calendar', desc:'Planned jobs by day, coloured by trade. Drag to reschedule and check team load before jobs are generated.',
      insight:{ title:'PPM calendar · October', range:'All teams', body:`<div class="s-cal">
        <div style="min-height:auto;border:none;background:none;text-align:center">Mon</div><div style="min-height:auto;border:none;background:none;text-align:center">Tue</div><div style="min-height:auto;border:none;background:none;text-align:center">Wed</div><div style="min-height:auto;border:none;background:none;text-align:center">Thu</div><div style="min-height:auto;border:none;background:none;text-align:center">Fri</div><div style="min-height:auto;border:none;background:none;text-align:center">Sat</div><div style="min-height:auto;border:none;background:none;text-align:center">Sun</div>
        <div>12<em>Fire test</em><em class="g">AHU-1</em></div><div>13<em class="w">Lift L1–4</em></div><div>14<em class="g">FCU filters</em></div><div>15<em>Gen run</em><em class="g">AHU-2</em></div><div>16<em class="w">Chiller 2</em></div><div>17</div><div>18</div>
        <div>19<em>Fire test</em></div><div>20<em class="g">Pumps</em><em class="g">AHU-5</em></div><div>21<em class="w">Lift L5–8</em></div><div>22<em>Gen run</em></div><div>23<em class="g">Tank clean</em></div><div>24</div><div>25</div>
        <div>26<em>Fire test</em><em class="w">BMS check</em></div><div>27<em class="w">Lift L9–11</em></div><div>28<em class="g">AHU-6</em></div><div>29<em>Gen run</em></div><div>30<em class="g">Cooling twr</em></div><div>31</div><div>1</div></div>`}},
    { kind:'insight', title:'Compliance & resource planner', desc:'On-time, late and missed by site, plus planned hours per team for the next weeks so overloads show early.',
      insight:{ title:'PPM compliance', range:'This quarter', body:`
        <div class="s-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="s-card s-kpi"><b>96.1%</b><small>On-time compliance</small></div>
          <div class="s-card s-kpi"><b>100%</b><small>Statutory completed</small></div>
          <div class="s-card s-kpi"><b>68 : 32</b><small>Planned : reactive</small></div>
          <div class="s-card s-kpi"><b>12</b><small>Missed this quarter</small></div>
        </div>
        <div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1">
          <div class="s-card"><h4>Compliance by site</h4><div class="s-bars"><i style="height:96%"></i><i style="height:91%"></i><i style="height:98%"></i><i class="alt" style="height:84%"></i><i style="height:95%"></i><i style="height:97%"></i></div></div>
          <div class="s-card"><h4>MEP Team A load, weeks 43–50</h4><div class="s-bars"><i style="height:72%"></i><i class="alt" style="height:92%"></i><i style="height:64%"></i><i style="height:70%"></i><i class="alt" style="height:88%"></i><i style="height:58%"></i><i style="height:66%"></i><i style="height:74%"></i></div></div>
        </div>`}}
  ],
  videos: ['ppm','ppmTech','wo','tour','visibility','reporting'],
  bring: [
    ['Current PPM schedule','Spreadsheet, CAFM export or contractor plan, whatever you have'],
    ['Statutory inspection list','Fire, lifts, pressure vessels, water hygiene and civil defence requirements'],
    ['Asset counts by category','At least counts per category and site, so we can size the plans'],
    ['OEM or SFG20 job plans','Two or three examples for your critical equipment'],
    ['Holiday and blackout calendar','Periods when planned work must not be scheduled'],
    ['Your last audit findings','Gaps the auditor or client raised help us set priorities']
  ],
  people: [['calendar','Maintenance planner'],['user-cog','Facility manager'],['shield-check','HSE / compliance lead'],['wrench','Senior technician'],['briefcase','AMC contractor representative']],
  form: [
    { section: 'Current plan & standards', questions: [
      { id:'plan_source', q:'Where does your PPM schedule live today?', type:'select', options:['Spreadsheet','Existing CAFM','Contractor holds it','Paper / logbooks','No formal schedule'] },
      { id:'standards', q:'Which standards do your plans follow?', type:'multi', options:['SFG20','OEM manuals','Local civil defence code','NFPA','CIBSE / ASHRAE','Own experience'] },
      { id:'plan_count', q:'Roughly how many distinct PPM plans or tasks do you run?', type:'number', placeholder:'e.g. 180' },
      { id:'maturity', q:'How mature is your planned maintenance today?', type:'scale', options:['Reactive only','Some PPMs','Full calendar','Tracked compliance','Optimised on data'] }
    ]},
    { section: 'Triggers & scheduling', questions: [
      { id:'meter_assets', q:'Which assets should be serviced on run-hours or cycles instead of the calendar?', type:'long', placeholder:'e.g. chillers every 500 h, generators every 250 h, lifts on starts' },
      { id:'bms_readings', q:'Can your BMS send run-hours or ΔP readings to Facilio?', type:'yesno', hint:'If yes, bring the BMS vendor name and point list.' },
      { id:'missed_rule', q:'When a PPM is missed, what should happen?', type:'select', options:['Catch up as soon as possible','Skip to next occurrence','Supervisor decides each time'] },
      { id:'blackouts', q:'When must planned work not happen?', type:'text', placeholder:'e.g. mall trading hours 10:00–22:00, Ramadan, Eid' }
    ]},
    { section: 'Execution & resources', questions: [
      { id:'job_grouping', q:'How should jobs be generated for a plan covering many assets?', type:'select', options:['One per asset','One per floor or zone','One grouped job per site'] },
      { id:'vendor_ppm', q:'Which PPMs are done by AMC contractors?', type:'long', placeholder:'e.g. lifts by Otis, chillers by Coolserv, fire by local contractor' },
      { id:'lead_days', q:'How many days ahead should jobs be created?', type:'number', placeholder:'e.g. 7' },
      { id:'safety_steps', q:'Do PPMs need permit to work or LOTO before tasks start?', type:'yesno' }
    ]},
    { section: 'Compliance & reporting', questions: [
      { id:'compliance_target', q:'What PPM compliance are you held to?', type:'select', options:['Below 90%','90–95%','95–98%','Above 98%'] },
      { id:'audit_evidence', q:'What evidence do auditors or clients ask you to show?', type:'long', placeholder:'e.g. signed service sheets, readings, photos, certificates' },
      { id:'verifier', q:'Who verifies a completed PPM before it counts as done?', type:'text', placeholder:'e.g. site supervisor, client FM representative' }
    ]}
  ]
});


MODS.push({
  key: 'asset',
  name: 'Asset Management',
  short: 'Assets',
  group: 'Assets & compliance',
  icon: 'boxes',
  accent: 'orange',
  tagline: 'One register of every asset, where it is and its cost',
  lede: 'This brief explains how Facilio holds your asset register, hierarchy, readings and lifecycle cost. Fill in the form at the end so we can plan your data migration before the workshop.',
  about: [
    'Asset Management gives you a single register of equipment across your portfolio, organised by site, building, floor and space, and by system such as chilled water or fire protection. Each asset carries its specifications, warranty, documents, meters and full maintenance history.',
    'Assets are the anchor for the rest of Facilio. Work orders, PPM plans, inspections, readings and costs all attach to them, so over time you see which equipment is reliable, what it costs to run, and when it is due for replacement. QR labels link the physical asset to its record in one scan.'
  ],
  who: [
    ['database','Asset & data owners','Maintain the register, hierarchy and specifications'],
    ['wrench','Technicians','Scan QR tags to see history, log readings, raise jobs'],
    ['piggy-bank','Finance & capital planning','Track value, depreciation and lifecycle cost'],
    ['line-chart','Facility managers','Spot unreliable assets and plan replacements']
  ],
  solves: [
    ['Nobody is sure exactly what equipment you have or where it is.','One register with location and system hierarchy, QR tags on site','Single source of truth'],
    ['Warranties expire unnoticed and repairs are paid for twice.','Warranty and AMC dates tracked with reminders 90 days ahead','Warranty claims captured'],
    ['Replacement budgets are based on age alone.','Lifecycle cost, failures, downtime and book value per asset','Evidence-based capex'],
    ['Technicians arrive on site without manuals or history.','O&M manuals, drawings and past jobs one QR scan away','Faster first-time fix']
  ],
  fieldGroups: {
    'Identity': [
      ['asset_name','Asset name','Text','e.g. "AHU-3 Level 4". Shown in lists and on work orders','yes'],
      ['asset_tag','Asset tag','Text','Your tag number, printed on the QR label','yes'],
      ['category','Category','Lookup','HVAC › AHU, Electrical › DB, Fire › Pump and so on','yes'],
      ['asset_type','Type','Picklist','Equipment, Fixture, Vehicle, IT, Furniture','no'],
      ['status','Status','Picklist','Active, In repair, Standby, Retired, Disposed','yes'],
      ['criticality','Criticality','Picklist','How severe a failure would be. Feeds work order priority','no'],
      ['asset_id','Asset ID','System','Unique system number (e.g. AST-00318)','auto']
    ],
    'Location & hierarchy': [
      ['site','Site','Lookup','Property the asset belongs to','yes'],
      ['space','Building / Floor / Space','Lookup','Exact installed location down to plant room or zone','no'],
      ['parent_asset','Parent asset','Lookup','For components, such as a motor inside a pump set','no'],
      ['system','System','Lookup','Chilled water, Fire, LV distribution. Groups related assets','no'],
      ['qr_code','QR code','System','Generated for labels and mobile scanning','auto']
    ],
    'Specifications & meters': [
      ['manufacturer','Manufacturer','Text','Make of the equipment, e.g. Carrier, Otis, Grundfos','no'],
      ['model','Model','Text','Model number from the nameplate','no'],
      ['serial_no','Serial number','Text','From the nameplate','no'],
      ['capacity','Capacity / rating','Number','kW, TR, m³/h, kVA depending on category','no'],
      ['category_specs','Category attributes','Text','Fields specific to the category, such as refrigerant or IP rating','no'],
      ['meters','Meters / readings','Reading','Run-hours, kWh, temperature, ΔP. Manual or from the BMS','no']
    ],
    'Lifecycle & finance': [
      ['commission_date','Commission date','Date','Start of service life','no'],
      ['warranty_expiry','Warranty expiry','Date','Triggers reminders before expiry','no'],
      ['amc_vendor','AMC / service vendor','Lookup','Contractor holding the maintenance contract','no'],
      ['purchase_cost','Purchase cost','Currency','Original capitalised value','no'],
      ['expected_life','Expected life','Duration','e.g. 20 years for a chiller. Used for replacement planning','no'],
      ['depreciation','Depreciation method','Picklist','Straight line or declining balance','no'],
      ['lifecycle_cost','Lifecycle cost to date','Currency','Purchase plus labour, parts and vendor cost from work orders','auto']
    ]
  },
  flows: [
    {
      title: 'Migrating a legacy register for Marina Tower',
      scenario: 'Marina Tower has 1,140 assets in an old CAFM export with missing locations and duplicate tags.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'Web app', text: 'Import of the CAFM spreadsheet flags 62 duplicate tags and 140 rows with no floor.', status: 'Planned' },
        { actor: 'Supervisor', channel: 'Web app', text: 'S. Khan maps old categories to the Facilio tree and assigns systems such as Chilled water and Fire.', status: '' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Walk-down survey fills missing floors, photographs nameplates and adds 38 untracked FCUs.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'QR labels are generated per floor and printed. PPM plans for each category attach automatically.', status: 'Active' },
        { actor: 'Technician', channel: 'QR scan', text: 'Labels are fixed and scanned once to confirm each asset is in the right space.', status: '' }
      ],
      outcome: 'A clean register of 1,116 assets in 3 weeks, 100% with location and QR tag, ready for PPM go-live.'
    },
    {
      title: 'Repair or replace a failing chiller',
      scenario: 'Chiller CH-02 at Harbour Point has broken down four times this year and its warranty has expired.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Fourth breakdown work order on CH-02 in 12 months triggers a repeat-failure flag to the FM.', status: 'In repair' },
        { actor: 'Supervisor', channel: 'Web app', text: 'R. Menon opens the asset: lifecycle cost AED 186,000, downtime 64 h, book value AED 42,000.', status: '' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Compares readings: COP has dropped from 5.4 to 4.1 over two years. Attaches the trend to a capex request.', status: '' },
        { actor: 'Finance', channel: 'Web app', text: 'Approves replacement in the Q1 budget. Old chiller is marked for retirement.', status: 'Retired' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'New chiller CH-02A takes its place in the hierarchy and inherits PPM plans and meters.', status: '' }
      ],
      outcome: 'Replacement approved in one review using real cost data, saving an estimated AED 55,000 a year in repairs and energy.'
    }
  ],
  process: {
    title: 'Lifecycle of an asset',
    statuses: ['Planned','Active','In repair','Standby','Retired','Disposed'],
    steps: [
      { t:'Onboard', s:'Load the register', who:'Data owner, Facilio team', statusOn:0,
        p:'We import your existing register, map it to Facilio categories and the location hierarchy, and remove duplicates. Where data is thin, a walk-down survey with the mobile app fills the gaps.',
        happens:['Spreadsheet or CAFM import with validation','Category, system and location mapping','QR labels generated in batches per site'],
        decide:['Which register is the master today','How deep the hierarchy goes (site to room?)','Minimum data required per asset'] },
      { t:'Classify', s:'Categories, systems, criticality', who:'Engineer, data owner', statusOn:1,
        p:'Each asset gets a category, a system and a criticality rating. The category decides which specification fields appear and which PPM plans apply.',
        happens:['Category-specific fields shown','Assets grouped into systems','Criticality feeds work order priority'],
        decide:['Your category tree','How you rate criticality','Which attributes matter per category'] },
      { t:'Operate', s:'Maintain and monitor', who:'Technicians, BMS', statusOn:2,
        p:'Day to day, work orders, PPMs and inspections are logged against the asset. Readings arrive manually or from the BMS, and thresholds can raise jobs automatically.',
        happens:['History and cost build automatically','Meters and readings trend over time','Readings outside limits create work orders'],
        decide:['Which meters and readings to track','Which BMS points to connect','Thresholds that should raise a job'] },
      { t:'Evaluate', s:'Cost and reliability', who:'Facility manager, finance', statusOn:3,
        p:'Maintenance cost, downtime and failure counts roll up per asset and category. Depreciation and expected life show which assets are nearing replacement.',
        happens:['Lifecycle cost per asset and category','Repeat-failure and warranty-expiry flags','Depreciation schedule and book value'],
        decide:['How you track asset value today','Reports finance expects each quarter','What repair cost triggers a replace decision'] },
      { t:'Retire', s:'Replace or dispose', who:'Facility manager, finance', statusOn:4,
        p:'When an asset is replaced, the old record is retired with its history kept. The new asset takes its place in the hierarchy and inherits plans and meters.',
        happens:['History preserved for audit','PPM plans move to the replacement','Disposal value and date recorded'],
        decide:['Who approves retirement','What happens to related spare parts','How long records are retained'] }
    ]
  },
  screens: [
    { kind:'list', title:'Asset register', desc:'Search and filter the full register by site, category, status or warranty. Bulk import and export from spreadsheets.',
      list:{ title:'Assets', sub:'8,412 assets · 23 sites', cta:'New Asset', filters:['Site: All','Category: HVAC','Status: Active','Warranty < 90 days'],
        cols:['Asset','Category','Location','Criticality','Status','Warranty'],
        rows:[
          ['AHU-3 Level 4','HVAC › AHU','Marina Tower · L4','<span class="s-badge hi">High</span>','<span class="s-badge ok">Active</span>','Mar 2027'],
          ['Chiller CH-02','HVAC › Chiller','Harbour Point · Roof','<span class="s-badge hi">High</span>','<span class="s-badge md">In repair</span>','Expired'],
          ['Lift L2','Vertical transport','City Centre Mall · Core A','<span class="s-badge hi">High</span>','<span class="s-badge ok">Active</span>','Dec 2026'],
          ['DB-4F-02','Electrical › DB','Harbour Point · L4','<span class="s-badge md">Medium</span>','<span class="s-badge ok">Active</span>','n/a'],
          ['Fire pump FP-01','Fire › Pump','Marina Tower · B2','<span class="s-badge hi">High</span>','<span class="s-badge lo">Standby</span>','Jun 2026']
        ]}},
    { kind:'detail', title:'Asset record', desc:'Specs, location, warranty, meters, depreciation and every work order ever raised against the asset.',
      detail:{ id:'AST-00318 · HVAC › AHU', title:'AHU-3 Level 4', badge:'<span class="s-badge ok">Active</span>',
        tabs:['Overview','Readings','Work orders','Financials','Documents'],
        kv:[['Manufacturer','Carrier'],['Model','39HQ-180'],['Serial no.','C39-22-04817'],['Capacity','18,000 m³/h'],['Location','Marina Tower · L4 Plant'],['Commissioned','14 Mar 2022'],['Warranty','Mar 2027'],['Book value','AED 61,200']],
        sideTitle:'Last 12 months',
        side:`<div class="s-kv"><div><small>Work orders</small><span>9 (2 breakdown)</span></div><div><small>Maintenance cost</small><span>AED 14,250</span></div><div><small>Downtime</small><span>11.5 h</span></div><div><small>Run-hours</small><span>6,840 h</span></div><div><small>PPM compliance</small><span>100%</span></div></div>`}},
    { kind:'insight', title:'Location & system hierarchy', desc:'Assets sit inside site, building, floor and space, and inside systems. This drives routing, reporting and access rights.',
      insight:{ title:'Portfolio › Marina Tower', range:'Tree view', body:`<div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1">
        <div class="s-card s-tree"><h4>Locations</h4><div>▾ Marina Tower</div><div class="l1">▾ Level 4</div><div class="l2">▾ Plant room</div><div class="l3">AHU-3 Level 4</div><div class="l3">DB-4F-01</div><div class="l2">▸ Offices 401–420</div><div class="l1">▸ Level 3</div><div class="l1">▸ Roof</div><div>▸ Harbour Point</div><div>▸ City Centre Mall</div></div>
        <div class="s-card s-tree"><h4>Systems</h4><div>▾ Chilled water</div><div class="l1">▾ Chillers</div><div class="l2">CH-01, CH-02</div><div class="l1">▾ Primary pumps</div><div class="l2">P-01 to P-04</div><div class="l1">▾ AHUs (14)</div><div class="l3">AHU-3 Level 4</div><div>▸ Fire protection</div><div>▸ LV distribution</div><div>▸ Vertical transport</div></div></div>`}},
    { kind:'mobile', title:'Scan a QR tag in the field', desc:'Technicians scan the QR label to open the asset, see open jobs and manuals, log a meter reading or raise a new request.',
      mobile:{ bar:'AHU-3 Level 4', btn:'Raise work order', items:[['Status: Active','Marina Tower · L4 Plant'],['Open jobs: 1','WO-10482 · In progress'],['Log reading','Run-hours 6,840 · Filter ΔP 182 Pa'],['Documents','O&M manual · Wiring diagram']],
        noteTitle:'One scan, full context', note:'<span>QR labels are generated from the register and printed in batches per site.</span><span>Existing barcode tags can be reused instead of relabelling.</span>'}}
  ],
  videos: ['tour','wo','ppm','reporting','dashboards','inventory'],
  bring: [
    ['Your current asset register','Any format. Completeness matters less than having a starting point'],
    ['Location list','Sites, buildings, floors and spaces as you name them'],
    ['Category list in use','Even an informal one. We map it to Facilio standards'],
    ['Sample nameplate photos','Five or six across different equipment types'],
    ['BMS point list (if any)','Shows which meters and readings can flow in automatically'],
    ['Warranty and AMC contracts','For your critical or newest equipment, with expiry dates']
  ],
  people: [['database','Asset / data owner'],['user-cog','Facility manager'],['wrench','Senior technician'],['piggy-bank','Finance or fixed-asset accountant'],['server','BMS / IT contact']],
  form: [
    { section: 'Register & data', questions: [
      { id:'register_source', q:'Where does your most reliable asset list live today?', type:'select', options:['Spreadsheet','Existing CAFM / CMMS','ERP fixed asset register','Contractor records','No register'] },
      { id:'asset_count', q:'Roughly how many assets are in scope?', type:'number', placeholder:'e.g. 8,000' },
      { id:'data_quality', q:'How complete is your asset data?', type:'scale', options:['Very patchy','Partial','Mostly complete','Complete','Complete and verified'] },
      { id:'survey_needed', q:'Will you need a walk-down survey to fill gaps?', type:'yesno', hint:'We can plan survey scope and labels at the workshop.' }
    ]},
    { section: 'Hierarchy & tagging', questions: [
      { id:'hierarchy_depth', q:'How deep should the location hierarchy go?', type:'select', options:['Site only','Site › Building','Site › Building › Floor','Down to room / space'] },
      { id:'systems', q:'Which systems do you want assets grouped into?', type:'multi', options:['Chilled water','HVAC air side','Fire protection','LV / HV electrical','Plumbing & drainage','Vertical transport','BMS / ELV','Lighting'] },
      { id:'existing_tags', q:'Do you already have barcode or asset tags on site?', type:'yesno', hint:'If yes, bring a photo of a tag and the numbering format.' }
    ]},
    { section: 'Readings & meters', questions: [
      { id:'meters_tracked', q:'Which readings do you want to track against assets?', type:'multi', options:['Run-hours','Energy kWh','Temperatures','Pressure / ΔP','Water consumption','Lift starts'] },
      { id:'bms_integration', q:'Which BMS or meters could feed readings automatically?', type:'long', placeholder:'e.g. Honeywell EBI at Marina Tower, Siemens Desigo at Harbour Point' },
      { id:'manual_readings', q:'Who will log manual readings on rounds?', type:'text', placeholder:'e.g. shift technicians at 08:00 and 20:00' }
    ]},
    { section: 'Finance & lifecycle', questions: [
      { id:'depreciation_owner', q:'Where is asset value and depreciation tracked today?', type:'select', options:['Not tracked','Finance spreadsheet','ERP (SAP, Oracle, etc.)','Facilio should hold it'] },
      { id:'replace_rule', q:'How do you decide to replace rather than repair?', type:'long', placeholder:'e.g. repair cost above 50% of replacement, age over 15 years' },
      { id:'warranty_assets', q:'How many assets are under warranty or AMC today?', type:'number', placeholder:'e.g. 450' }
    ]}
  ]
});


MODS.push({
  key: 'insp',
  name: 'Inspections & Compliance',
  short: 'Inspections',
  group: 'Assets & compliance',
  icon: 'clipboard-check',
  accent: 'red',
  tagline: 'Scheduled checks, statutory proof and expiry tracking',
  lede: 'This brief shows how Facilio runs your inspections, audits and statutory compliance on mobile, with evidence on every item. Fill in the form at the end so we can build your templates before the workshop.',
  about: [
    'Inspections & Compliance replaces paper checklists with digital templates that capture pass/fail answers, readings, photos and scores. Inspections run on a schedule, from a QR scan, or on demand, and every response is stored against the site, space or asset it checked.',
    'Failed items raise work orders automatically, so a blocked fire exit or a low sprinkler pressure becomes a tracked job with an SLA. Statutory obligations, such as civil defence, lift and water hygiene checks, sit in one register with their certificates and expiry dates, and audit reports come straight from the recorded data.'
  ],
  who: [
    ['shield-check','HSE & compliance leads','Own statutory register, certificates and audit packs'],
    ['hard-hat','Inspectors & technicians','Run checklists on mobile with photos and readings'],
    ['user-check','Site supervisors','Review scores, follow up failed items, sign off'],
    ['line-chart','Facility managers','See compliance and expiring certificates per site']
  ],
  solves: [
    ['Fire and safety rounds are ticked on paper and filed, never read again.','Mobile checklists with photos, GPS time stamp and inspector signature','Evidence on every item'],
    ['A failed check is noted but nobody fixes it until the next audit.','Failed items raise a work order automatically with the photo attached','Defects fixed on time'],
    ['A civil defence certificate expired and the site was fined.','Certificates tracked with reminders at 90, 30 and 7 days before expiry','No expired certificates'],
    ['Preparing an audit takes weeks of collecting files from every site.','Audit reports by site, template and period built from recorded data','Audit pack in minutes']
  ],
  fieldGroups: {
    'Template': [
      ['template_name','Template name','Text','e.g. "Monthly fire safety walk". Shown on every inspection','yes'],
      ['insp_category','Category','Picklist','Fire & life safety, HSE, Hygiene, Lift, Electrical, Soft services','yes'],
      ['questions','Questions','Checklist','Pass/fail, yes/no, reading, multiple choice, photo or signature items','yes'],
      ['scoring','Scoring','Rule','Weight per question and pass mark, e.g. 85%','no'],
      ['mandatory_evidence','Mandatory evidence','Multi-select','Photo on fail, photo always, reading limits, signature','no'],
      ['regulation_ref','Regulation reference','Text','Civil defence code, NFPA 25, ACoP L8, local lift regulation','no']
    ],
    'Schedule & scope': [
      ['scope','Scope','Lookup','Sites, spaces or asset categories the template applies to','yes'],
      ['frequency','Frequency','Schedule','Daily, weekly, monthly, quarterly, annual or custom','yes'],
      ['inspector','Inspector / team','Lookup','Person, team or vendor responsible','yes'],
      ['due_window','Due window','Duration','Grace period before the inspection counts as overdue','no'],
      ['trigger_qr','Start by QR scan','Boolean','Inspector must scan the space or asset tag to start','no']
    ],
    'Results & follow-up': [
      ['responses','Responses','Checklist','Answers, readings and photos captured per question','auto'],
      ['score','Score','Number','Calculated from weights, shown as % against the pass mark','auto'],
      ['result','Result','Picklist','Passed, Passed with remarks, Failed','auto'],
      ['failed_items','Failed items','Number','Count of items that failed or were out of range','auto'],
      ['auto_wo','Follow-up work orders','Lookup','Work orders raised from failed items','auto'],
      ['signoff','Inspector sign-off','Signature','Signature and time stamp on completion','yes']
    ],
    'Certificates & documents': [
      ['cert_type','Certificate type','Picklist','Civil defence, Lift, Pressure vessel, Water hygiene, Trade licence','yes'],
      ['issued_by','Issued by','Text','Authority or third-party inspection body','yes'],
      ['issue_date','Issue date','Date','Date the certificate was issued','yes'],
      ['expiry_date','Expiry date','Date','Drives reminders and the expiry dashboard','yes'],
      ['cert_file','Certificate file','File','Scanned certificate or inspection report (PDF)','yes'],
      ['renewal_owner','Renewal owner','Lookup','Person responsible for renewal','no'],
      ['cert_status','Certificate status','System','Valid, Expiring soon, Expired, calculated daily','auto']
    ]
  },
  flows: [
    {
      title: 'Monthly fire safety walk finds a blocked exit',
      scenario: 'City Centre Mall runs a monthly fire safety inspection across 4 levels and 26 fire exits.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'INS-2291 "Monthly fire safety walk" is created and assigned to HSE officer S. Khan.', status: 'Scheduled' },
        { actor: 'Technician', channel: 'QR scan', text: 'S. Khan scans the Level 2 zone tag to start. The 32-item checklist opens on mobile.', status: 'In progress' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Marks "Exit door E2-07 clear" as Fail with a photo of stacked cartons. Sprinkler gauge reads 6.8 bar.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Fail raises WO-10561, High priority, to mall operations with the photo and a 4-hour SLA.', status: '' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Completes all levels and signs. Score 94% against a pass mark of 90%, 1 failed item.', status: 'Completed' },
        { actor: 'Supervisor', channel: 'Web app', text: 'R. Menon checks WO-10561 is closed with an after photo, then approves the inspection.', status: 'Closed' }
      ],
      outcome: 'Blocked exit cleared in 1 h 40 min, inspection closed same day with full photo evidence for the civil defence file.'
    },
    {
      title: 'Lift certificate nearing expiry',
      scenario: 'The annual third-party certificate for Lift L2 at Marina Tower expires on 30 November.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'Email/SMS', text: '90 days before expiry, the renewal owner and the lift AMC vendor are reminded.', status: '' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Books the third-party inspection body for 12 November and logs the booking on the certificate.', status: '' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Lift contractor completes the pre-inspection checklist: brakes, ropes, door locks, alarm button.', status: '' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Uploads the new certificate PDF, valid to 30 Nov next year. Old certificate is archived.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Status returns to Valid and the next reminder is scheduled. Expiry dashboard updates.', status: '' }
      ],
      outcome: 'Certificate renewed 18 days before expiry with no lift downtime and no penalty risk.'
    }
  ],
  process: {
    title: 'Lifecycle of an inspection',
    statuses: ['Scheduled','In progress','Completed','Failed items open','Approved','Closed'],
    steps: [
      { t:'Template', s:'Build the checklist', who:'HSE lead, engineer', statusOn:0,
        p:'Each inspection starts from a template with questions, answer types, scoring and evidence rules. Templates can follow a regulation clause by clause, so the record matches what the authority asks for.',
        happens:['Questions set as pass/fail, reading, choice, photo or signature','Weights and pass mark defined','Templates versioned when they change'],
        decide:['Which paper checklists become templates first','Scoring and pass mark per template','Where photos are mandatory'] },
      { t:'Schedule', s:'Plan who checks what, when', who:'HSE lead, planner', statusOn:0,
        p:'Templates are scheduled against sites, spaces or asset categories, with an inspector or team and a due window. Statutory items are flagged so they appear in compliance reports.',
        happens:['Inspections generated on the calendar','Inspectors notified on mobile','Overdue inspections escalate'],
        decide:['Frequency per template and site','Who inspects: in-house, vendor or third party','Escalation when an inspection is missed'] },
      { t:'Inspect', s:'Run it on site with evidence', who:'Inspector, technician', statusOn:1,
        p:'The inspector scans the zone or asset QR tag, answers each item, captures readings and photos, and signs off. It works offline in basements and plant rooms.',
        happens:['Readings checked against limits as they are entered','Photos time stamped and attached','Score calculated on completion'],
        decide:['Whether a QR scan is required to start','Offline use and sync rules','Who can edit answers after submission'] },
      { t:'Follow up', s:'Fix what failed', who:'Facilio (automation), supervisor', statusOn:3,
        p:'Every failed item or out-of-range reading can raise a work order with the photo and location attached. The inspection stays open until its follow-up jobs are closed.',
        happens:['Work orders raised per failed item','Priority and SLA set from the question','Inspection links to all follow-up jobs'],
        decide:['Which failures raise a work order automatically','Priority per failure type','Whether the inspection waits for follow-ups'] },
      { t:'Report', s:'Approve and prove compliance', who:'Supervisor, compliance lead', statusOn:4,
        p:'A supervisor approves the inspection. Compliance and certificate status roll up per site, and audit reports are produced from the recorded answers and attachments.',
        happens:['Compliance % per site and template','Certificate expiry tracked with reminders','Audit report exported with evidence'],
        decide:['Who approves inspections','Which reports go to clients or authorities','How long records are retained'] }
    ]
  },
  screens: [
    { kind:'list', title:'Inspection schedule', desc:'All scheduled and completed inspections with score and result. Filter to statutory or failed items before an audit.',
      list:{ title:'Inspections', sub:'412 this month · 18 overdue · 27 with failed items', cta:'New Inspection', filters:['Site: All','Template','Result: Failed','Statutory'],
        cols:['ID','Template','Site','Score','Result','Due'],
        rows:[
          ['INS-2291','Monthly fire safety walk','City Centre Mall','94%','<span class="s-badge md">1 failed item</span>','Today'],
          ['INS-2288','Daily lift rescue check','Marina Tower','100%','<span class="s-badge ok">Passed</span>','Today'],
          ['INS-2284','Legionella temperature log','Harbour Point','78%','<span class="s-badge hi">Failed</span>','Yesterday'],
          ['INS-2279','Quarterly HSE site audit','Marina Tower','n/a','<span class="s-badge info">In progress</span>','20 Oct'],
          ['INS-2275','Kitchen hygiene audit','City Centre Mall','n/a','<span class="s-badge lo">Scheduled</span>','22 Oct']
        ]}},
    { kind:'mobile', title:'Mobile inspection checklist', desc:'Inspectors scan the zone tag, answer each item, add photos and readings, and sign. Failed items raise a work order on the spot.',
      mobile:{ bar:'Fire safety walk · L2 · 18/32', btn:'Next item', items:[['Exit door E2-07 clear','Fail · photo attached · WO raised'],['Fire extinguisher FE-214 tagged','Pass'],['Sprinkler gauge pressure (bar)','6.8 · within 6–8 bar'],['Emergency lighting test','Pass · photo required']],
        noteTitle:'Works offline', note:'<span>Basements and plant rooms often have no signal, so answers are saved on the device and sync later.</span><span>Every photo is time stamped and tied to the item it proves.</span>'}},
    { kind:'detail', title:'Certificate record', desc:'Each statutory certificate with issuer, dates, file and renewal owner. Reminders go out before expiry.',
      detail:{ id:'CERT-0187 · Lift', title:'Lift L2 annual safety certificate', badge:'<span class="s-badge md">Expiring in 45 days</span>',
        tabs:['Details','Documents','Inspections','Reminders','History'],
        kv:[['Site','Marina Tower'],['Asset','Lift L2 (Otis Gen2)'],['Issued by','Third-party inspection body'],['Issue date','30 Nov 2025'],['Expiry date','30 Nov 2026'],['Renewal owner','R. Menon'],['AMC vendor','Otis Elevators'],['Regulation','Local lift safety code']],
        sideTitle:'Renewal steps 2 of 4',
        side:`<div class="s-task"><span class="s-box done"></span>90-day reminder sent</div><div class="s-task"><span class="s-box done"></span>Inspection booked for 12 Nov</div><div class="s-task"><span class="s-box"></span>Pre-inspection checklist by AMC vendor</div><div class="s-task"><span class="s-box"></span>Upload new certificate PDF</div>`}},
    { kind:'insight', title:'Compliance & expiry dashboard', desc:'Inspection compliance by site, failed items still open, and certificates expiring in the next 90 days.',
      insight:{ title:'Compliance overview', range:'Last 30 days', body:`
        <div class="s-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="s-card s-kpi"><b>97.4%</b><small>Inspections on time</small></div>
          <div class="s-card s-kpi"><b>91%</b><small>Average score</small></div>
          <div class="s-card s-kpi"><b>27</b><small>Failed items open</small></div>
          <div class="s-card s-kpi"><b>6</b><small>Certificates expiring 90 d</small></div>
        </div>
        <div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1">
          <div class="s-card"><h4>Average score by site</h4><div class="s-bars"><i style="height:94%"></i><i style="height:88%"></i><i class="alt" style="height:78%"></i><i style="height:92%"></i><i style="height:96%"></i><i style="height:90%"></i></div></div>
          <div class="s-card"><h4>Expiring soon</h4><div class="s-kv"><div><small>Civil defence · Harbour Point</small><span><span class="s-badge hi">12 days</span></span></div><div><small>Lift L2 · Marina Tower</small><span><span class="s-badge md">45 days</span></span></div><div><small>Pressure vessel · City Centre Mall</small><span><span class="s-badge md">61 days</span></span></div><div><small>Water tank cleaning · Marina Tower</small><span><span class="s-badge lo">84 days</span></span></div></div></div>
        </div>`}}
  ],
  videos: ['ppmTech','ppm','wo','reporting','notifications','dashboards'],
  bring: [
    ['Current paper or Excel checklists','Fire walks, HSE audits, hygiene and lift checks, as many as you use'],
    ['Statutory obligation list','Every inspection the authority or insurer requires, per site'],
    ['Current certificates with expiry dates','Civil defence, lifts, pressure vessels, water hygiene, trade licences'],
    ['Last two audit reports','Internal, client or authority audits, with the findings raised'],
    ['Scoring rules (if any)','Weights or pass marks you or your client use today'],
    ['Inspector roster','Who inspects what, in-house, vendor or third party']
  ],
  people: [['shield-check','HSE / compliance lead'],['user-cog','Facility manager'],['hard-hat','Lead inspector or supervisor'],['briefcase','Client or contract representative'],['wrench','Senior technician']],
  form: [
    { section: 'Inspections today', questions: [
      { id:'insp_types', q:'Which inspections do you run today?', type:'multi', options:['Fire & life safety','HSE site audits','Lift checks','Water hygiene / Legionella','Kitchen & food hygiene','Cleaning quality','Electrical safety','Pre-handover snagging'] },
      { id:'template_count', q:'How many different checklists or templates do you use?', type:'number', placeholder:'e.g. 25' },
      { id:'insp_method', q:'How are inspections recorded today?', type:'select', options:['Paper','Excel / forms','Existing app','Mix of these'] },
      { id:'maturity', q:'How mature is your inspection process?', type:'scale', options:['Ad hoc','Paper rounds','Scheduled, paper','Digital, some reports','Digital, fully reported'] }
    ]},
    { section: 'Templates & evidence', questions: [
      { id:'scoring', q:'Do your inspections use scores or pass marks?', type:'yesno', hint:'If yes, bring the weighting or pass mark.' },
      { id:'photo_rule', q:'When must a photo be taken?', type:'select', options:['Never required','Only on failed items','On every item','Depends on template'] },
      { id:'priority_template', q:'Which checklist should we build first as the pilot?', type:'text', placeholder:'e.g. Monthly fire safety walk' }
    ]},
    { section: 'Failures & follow-up', questions: [
      { id:'auto_wo', q:'Should failed items raise a work order automatically?', type:'yesno' },
      { id:'fail_rules', q:'Which failures need immediate action and by whom?', type:'long', placeholder:'e.g. blocked exits to mall ops within 4 h, sprinkler pressure to fire contractor within 24 h' },
      { id:'approver', q:'Who approves a completed inspection?', type:'text', placeholder:'e.g. site HSE officer, client FM' }
    ]},
    { section: 'Statutory & certificates', questions: [
      { id:'cert_count', q:'How many statutory certificates do you track across all sites?', type:'number', placeholder:'e.g. 60' },
      { id:'cert_tracking', q:'How are certificate expiries tracked today?', type:'select', options:['Not tracked','Calendar reminders','Spreadsheet','Contractor tells us','Existing system'] },
      { id:'audit_reports', q:'Which audit reports do clients or authorities ask for?', type:'long', placeholder:'e.g. monthly HSE pack to client, annual civil defence file per site' }
    ]}
  ]
});


MODS.push({
  key: 'vendor',
  name: 'Vendor Management',
  short: 'Vendors',
  group: 'Supply chain',
  icon: 'handshake',
  accent: 'blue',
  tagline: 'Onboard, contract, dispatch and score every vendor',
  lede: 'A short brief on how Facilio manages your contractors, from onboarding and AMCs to the vendor portal and monthly scorecards. Read it with your contracts lead before the workshop.',
  about: [
    'Vendor Management keeps every contractor you use in one register: company details, trades, sites covered, contracts and AMCs, agreed rates and compliance documents. Insurance and trade licence expiry dates are tracked, and vendors with lapsed documents are blocked from new jobs.',
    'Vendors work in their own portal. They accept jobs, update progress, upload evidence and submit invoices against the work order. Facilio checks each invoice against the agreed rates and the job record, and builds a scorecard from SLA, first-time fix and cost data.'
  ],
  who: [
    ['briefcase','Contracts & procurement','Onboard vendors, manage AMCs, rates and renewals'],
    ['headset','Helpdesk & coordinators','Dispatch jobs to the right vendor by trade and site'],
    ['truck','Vendors & subcontractors','Accept jobs, update status, submit invoices online'],
    ['line-chart','Facility managers','Review scorecards and decide on renewals']
  ],
  solves: [
    ['A vendor turned up on site with an insurance policy that expired two months ago.','Expiry alerts at 60/30/7 days and auto-block on lapsed documents','No lapsed vendors on site'],
    ['Vendors phone or email updates, so job status in the system is always behind.','Vendors accept and update jobs directly in the vendor portal','Live job status'],
    ['Invoices arrive with rates nobody agreed and no link to the actual job.','Invoices raised against the work order and checked against the rate card','Fewer invoice disputes'],
    ['AMC renewals are decided on gut feel, not performance.','Scorecards from SLA, first-time fix and cost per job, by vendor','Data-led renewals']
  ],
  fieldGroups: {
    'Vendor profile': [
      ['vendor_name','Vendor name','Text','Registered company name as on the trade licence','yes'],
      ['vendor_id','Vendor ID','System','Unique reference, e.g. VEN-0214','auto'],
      ['trades','Trades','Multi-select','HVAC, Lifts, Fire and life safety, Pest control, Cleaning and so on','yes'],
      ['sites_covered','Sites covered','Multi-select','Sites this vendor can be dispatched to','yes'],
      ['primary_contact','Primary contact','Lookup','Contact person who receives jobs and portal access','yes'],
      ['tax_number','Tax / VAT number','Text','TRN, GSTIN or ABN used on invoices','no'],
      ['vendor_status','Status','Picklist','Prospect, Under review, Approved, Suspended, Inactive','auto']
    ],
    'Compliance documents': [
      ['trade_licence','Trade licence','File','Copy of the current trade licence','yes'],
      ['licence_expiry','Licence expiry','Date','Drives renewal reminders and auto-block','yes'],
      ['insurance_policy','Insurance policy','File','Public liability and workers compensation certificates','yes'],
      ['insurance_expiry','Insurance expiry','Date','Earliest expiry across uploaded policies','yes'],
      ['insurance_cover','Cover amount','Currency','Public liability limit, checked against your minimum','no'],
      ['hse_approval','HSE approval','Boolean','Safety induction and method statement accepted','no']
    ],
    'Contracts & rates': [
      ['contract_ref','Contract / AMC','Lookup','Linked contract, e.g. AMC-2026-018 Lifts, Marina Tower','no'],
      ['contract_period','Contract period','Date','Start and end date of the AMC or framework','yes'],
      ['contract_value','Contract value','Currency','Annual fixed value of the AMC','no'],
      ['rate_card','Rate card','Lookup','Agreed hourly, call-out and material mark-up rates','no'],
      ['response_sla','Contracted SLA','Rule','Response and resolution times by priority','yes'],
      ['payment_terms','Payment terms','Picklist','30, 45, 60 or 90 days','no']
    ],
    'Performance': [
      ['sla_met','SLA compliance','Number','Percentage of jobs meeting response and resolution SLA','auto'],
      ['first_time_fix','First-time fix rate','Number','Jobs closed without a revisit within 7 days','auto'],
      ['avg_cost_job','Avg. cost per job','Currency','Invoiced amount divided by closed jobs','auto'],
      ['feedback_score','Feedback score','Number','Average requester rating on closed jobs','auto'],
      ['scorecard_grade','Scorecard grade','System','A, B, C or D from weighted scorecard','auto']
    ]
  },
  flows: [
    {
      title: 'Lift breakdown dispatched to the AMC vendor',
      scenario: 'Lift 2 at City Centre Mall stops between floors on a Saturday afternoon.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'BMS alarm', text: 'Lift controller fault creates WO-10512, priority High, category Lifts.', status: 'Submitted' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Routes to Gulf Lift Services under AMC-2026-018, after checking insurance is valid.', status: 'Assigned' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Engineer accepts the job in 6 minutes and shares ETA of 35 minutes.', status: 'Accepted' },
        { actor: 'Vendor', channel: 'Mobile app', text: 'Releases trapped passenger, replaces door lock contact, uploads photos and report.', status: 'In progress' },
        { actor: 'Supervisor', channel: 'Web app', text: 'S. Khan checks the lift is back in service and verifies the job.', status: 'Resolved' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Response and resolution times post to the Gulf Lift Services scorecard.', status: 'Closed' }
      ],
      outcome: 'Lift back in service in 1 h 50 min, inside the 4-hour contract SLA, with no phone calls to chase the vendor.'
    },
    {
      title: 'Vendor invoice checked against the work order',
      scenario: 'CoolAir Technical submits an invoice for a chiller repair at Harbour Point.',
      steps: [
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Raises INV-CA-3391 for AED 8,450 against WO-10467, with labour hours and parts.', status: 'Submitted' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Compares hourly rate and parts mark-up with the rate card and logged labour.', status: 'Under review' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Flags 3 extra labour hours not logged on the job and a 22% mark-up vs 15% agreed.', status: 'Flagged' },
        { actor: 'Supervisor', channel: 'Web app', text: 'R. Menon confirms the logged 5 hours and rejects the extra lines with a comment.', status: 'Returned' },
        { actor: 'Vendor', channel: 'Vendor portal', text: 'Resubmits a corrected invoice for AED 7,120.', status: 'Submitted' },
        { actor: 'Finance', channel: 'Web app', text: 'Approves the matched invoice and exports it to the ERP for payment.', status: 'Approved' }
      ],
      outcome: 'AED 1,330 overbilling caught before payment, and the invoice approved 4 days faster than the email process.'
    }
  ],
  process: {
    title: 'Lifecycle of a vendor',
    statuses: ['Prospect','Under review','Approved','Active','Suspended','Inactive'],
    steps: [
      { t:'Onboard', s:'Register and collect documents', who:'Contracts, vendor', statusOn:0,
        p:'A new vendor is invited to register or is added by your contracts team. They submit company details, trades, sites and compliance documents through a self-registration form.',
        happens:['Invitation sent with a self-registration link','Mandatory documents checked before submission','Duplicate check on tax number and trade licence'],
        decide:['Which documents are mandatory per trade','Minimum insurance cover you require','Who can invite new vendors'] },
      { t:'Approve', s:'Review and approve the vendor', who:'Procurement, HSE', statusOn:2,
        p:'Procurement and HSE review the documents and approve the vendor. Once approved, the vendor gets portal access and can be dispatched to the sites and trades they cover.',
        happens:['Approval workflow routes to each reviewer','Portal user created for the vendor contact','Vendor appears in assignment lists'],
        decide:['Approval steps and approvers','Whether HSE induction is required first','Which vendor fields are visible to the vendor'] },
      { t:'Contract', s:'Attach AMCs and rates', who:'Contracts lead', statusOn:3,
        p:'AMCs and framework agreements are linked with their scope, assets, period, value and SLA. Rate cards hold agreed hourly, call-out and material rates used to check invoices.',
        happens:['AMC assets and PPM scope linked','SLA policy applied to vendor jobs','Renewal reminders scheduled before end date'],
        decide:['How you structure AMCs (per site, per trade, portfolio)','Which rates go on the rate card','Lead time for renewal reminders'] },
      { t:'Work', s:'Dispatch, execute, invoice', who:'Helpdesk, vendor', statusOn:3,
        p:'Jobs are assigned to vendors by trade and site. Vendors accept, update and close jobs in the portal, then raise invoices against completed work orders for verification.',
        happens:['Lapsed documents block new assignments','Vendor updates flow to requesters in real time','Invoices matched to job, labour and rate card'],
        decide:['Auto-assign rules per trade and site','What a vendor must upload before closing','Invoice tolerance before a manual check'] },
      { t:'Review', s:'Score and decide renewals', who:'Facility manager', statusOn:4,
        p:'Each month Facilio builds a scorecard per vendor from SLA, first-time fix, cost and feedback. Poor performers can be suspended, and the scorecard supports renewal decisions.',
        happens:['Monthly scorecard generated and shared','Grade trends tracked over the contract term','Suspension stops new assignments'],
        decide:['Scorecard metrics and their weights','Thresholds for warning and suspension','Whether vendors see their own scorecard'] }
    ]
  },
  screens: [
    { kind:'list', title:'Vendor register', desc:'All vendors with trade, status and document health. Filter by site or trade and spot expiring documents at a glance.',
      list:{ title:'Vendors', sub:'86 approved · 7 documents expiring', cta:'Invite Vendor', filters:['Trade: All','Site: All','Status: Approved','Expiring in 30 days'],
        cols:['ID','Vendor','Trade','Insurance','Status','Score'],
        rows:[
          ['VEN-0214','Gulf Lift Services','Lifts &amp; escalators','<span class="s-badge ok">Valid to Mar 2027</span>','<span class="s-badge ok">Approved</span>','A'],
          ['VEN-0187','CoolAir Technical','HVAC','<span class="s-badge md">Expires 4 Nov</span>','<span class="s-badge ok">Approved</span>','B'],
          ['VEN-0231','SafeGuard Fire Systems','Fire &amp; life safety','<span class="s-badge ok">Valid to Jan 2027</span>','<span class="s-badge ok">Approved</span>','A'],
          ['VEN-0159','BrightSpark Electrical','Electrical','<span class="s-badge hi">Expired 2 Oct</span>','<span class="s-badge hi">Suspended</span>','C'],
          ['VEN-0240','PestAway Hygiene','Pest control','<span class="s-badge lo">Pending upload</span>','<span class="s-badge info">Under review</span>','-']
        ]}},
    { kind:'detail', title:'Vendor record', desc:'One vendor in full: profile, documents, contracts, rate card, jobs and invoices, with compliance status on the side.',
      detail:{ id:'VEN-0187 · HVAC', title:'CoolAir Technical LLC', badge:'<span class="s-badge ok">Approved</span>',
        tabs:['Summary','Documents','Contracts','Work orders','Invoices'],
        kv:[['Trades','HVAC, Chillers'],['Sites covered','Harbour Point, Marina Tower'],['Primary contact','A. Fernandes'],['Contract','AMC-2026-011 Chillers'],['Contract period','1 Jan 2026 to 31 Dec 2026'],['Annual value','AED 412,000'],['Payment terms','45 days'],['Open jobs','9']],
        sideTitle:'Compliance 3 of 4',
        side:`<div class="s-task"><span class="s-box done"></span>Trade licence valid to 14 Jun 2027</div><div class="s-task"><span class="s-box done"></span>Workers compensation valid</div><div class="s-task"><span class="s-box done"></span>HSE induction completed</div><div class="s-task"><span class="s-box"></span>Public liability renewal due 4 Nov</div>`}},
    { kind:'mobile', title:'Vendor portal on mobile', desc:'Vendor engineers accept jobs, share ETA, upload photos and reports, and raise invoices from their phone.',
      mobile:{ bar:'Assigned Jobs · 4', btn:'Accept job', items:[['Lift 2 stuck between floors','City Centre Mall · High · Due 16:30'],['Lift 4 quarterly PPM','Marina Tower · Planned · 18 Oct'],['Escalator E1 handrail noise','City Centre Mall · Medium'],['Invoice due: WO-10488','Completed 14 Oct · Ready to bill']],
        noteTitle:'No app install needed', note:'<span>Vendors log in to the portal from any phone browser with their own user.</span><span>They only see jobs, sites and documents shared with them.</span>'}},
    { kind:'insight', title:'Vendor scorecard', desc:'Compare vendors on SLA, first-time fix, cost per job and feedback, with a grade that feeds renewal decisions.',
      insight:{ title:'Vendor performance', range:'Last 90 days', body:`
        <div class="s-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="s-card s-kpi"><b>91.4%</b><small>SLA met, all vendors</small></div>
          <div class="s-card s-kpi"><b>83%</b><small>First-time fix</small></div>
          <div class="s-card s-kpi"><b>AED 1,640</b><small>Avg. cost per job</small></div>
          <div class="s-card s-kpi"><b>7</b><small>Documents expiring</small></div>
        </div>
        <div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1">
          <div class="s-card"><h4>SLA met by vendor</h4><div class="s-bars"><i style="height:96%"></i><i class="alt" style="height:88%"></i><i style="height:94%"></i><i class="alt" style="height:71%"></i><i style="height:90%"></i><i class="alt" style="height:85%"></i></div></div>
          <div class="s-card"><h4>CoolAir Technical · Grade B</h4><div class="s-kv"><div><small>SLA met</small><span>88%</span></div><div><small>First-time fix</small><span>79%</span></div><div><small>Avg. cost per job</small><span>AED 2,110</span></div><div><small>Invoice disputes</small><span><span class="s-badge md">3</span></span></div></div></div>
        </div>`}}
  ],
  videos: ['vendor','sr','wo','visibility','reporting','tour'],
  bring: [
    ['Current vendor list','Name, trade, sites covered and contact, as a spreadsheet'],
    ['Active AMCs and contracts','Scope, assets, period, value and SLA schedule for each'],
    ['Rate cards','Agreed hourly, call-out and material mark-up rates per vendor'],
    ['Compliance requirements','Which documents you require per trade and minimum insurance cover'],
    ['2–3 recent vendor invoices','Include one that was disputed, so we can design the checks'],
    ['How you rate vendors today','Any KPIs, scorecards or review templates you already use']
  ],
  people: [['briefcase','Contracts or procurement lead'],['user-cog','Facility / maintenance manager'],['headset','Helpdesk lead'],['receipt','Accounts payable / finance'],['shield-check','HSE officer']],
  form: [
    { section: 'Vendor base', questions: [
      { id:'vendor_count', q:'How many active vendors do you work with?', type:'number', placeholder:'e.g. 60' },
      { id:'vendor_trades', q:'Which trades are mostly outsourced?', type:'multi', options:['HVAC','Lifts & escalators','Fire & life safety','Electrical','Plumbing','Cleaning','Pest control','Landscaping'] },
      { id:'vendor_split', q:'What share of your work orders goes to vendors?', type:'select', options:['< 20%','20–50%','50–80%','> 80%'] },
      { id:'onboarding_today', q:'How do you onboard a new vendor today?', type:'long', placeholder:'e.g. procurement emails a form, HSE checks documents, finance sets up in ERP' }
    ]},
    { section: 'Contracts & compliance', questions: [
      { id:'amc_count', q:'How many AMCs or service contracts are active?', type:'number', placeholder:'e.g. 25' },
      { id:'mandatory_docs', q:'Which documents must a vendor hold before working on site?', type:'multi', options:['Trade licence','Public liability insurance','Workers compensation','HSE induction','Method statement','Tax / VAT certificate'] },
      { id:'block_on_expiry', q:'Should vendors with expired documents be blocked from new jobs?', type:'yesno', hint:'If no, tell us who should be warned instead.' },
      { id:'has_rate_cards', q:'Do you have agreed rate cards for call-out and hourly work?', type:'yesno', hint:'If yes, bring them to the workshop.' }
    ]},
    { section: 'Portal & invoicing', questions: [
      { id:'vendor_portal_use', q:'What should vendors be able to do in the portal?', type:'multi', options:['Accept / reject jobs','Update status','Upload reports & photos','Submit quotes','Submit invoices','Manage their documents'] },
      { id:'invoice_volume', q:'Roughly how many vendor invoices per month?', type:'select', options:['< 50','50–200','200–1,000','1,000+'] },
      { id:'invoice_checks', q:'What do you check before approving a vendor invoice?', type:'long', placeholder:'e.g. job closed, rates match AMC, PO exists, supervisor sign-off' },
      { id:'erp_name', q:'Which ERP or accounts system pays vendors?', type:'text', placeholder:'e.g. SAP, Oracle, Dynamics 365, Xero' }
    ]},
    { section: 'Performance', questions: [
      { id:'scorecard_maturity', q:'How do you measure vendor performance today?', type:'scale', options:['Not measured','Gut feel','Occasional review','Monthly KPIs','Formal scorecard'] },
      { id:'scorecard_metrics', q:'Which metrics matter most for renewals?', type:'multi', options:['SLA compliance','First-time fix','Cost per job','Feedback rating','PPM compliance','Invoice accuracy'] },
      { id:'scorecard_review', q:'Who reviews vendor performance, and how often?', type:'text', placeholder:'e.g. FM and procurement, monthly' }
    ]}
  ]
});


MODS.push({
  key: 'inv',
  name: 'Inventory & Procurement',
  short: 'Inventory',
  group: 'Supply chain',
  icon: 'warehouse',
  accent: 'cyan',
  tagline: 'Keep spares in stock and cost every part to the job',
  lede: 'A short brief on how Facilio tracks spares, tools and purchasing across your storerooms. Read it with your store keeper and procurement lead before the workshop.',
  about: [
    'Inventory & Procurement tracks every spare part, consumable and tool across your storerooms. Each item has min and max levels, a unit cost and a bin location, so you know what is on the shelf, what is reserved and what needs reordering.',
    'Parts are reserved and issued against work orders, so stock drops and the job cost rises in the same step. When stock falls below the reorder level, Facilio raises a purchase request that flows to a PO and a GRN when goods arrive, with transfers and cycle counts keeping the numbers honest.'
  ],
  who: [
    ['warehouse','Store keepers','Receive, issue, transfer and count stock'],
    ['shopping-cart','Procurement','Turn purchase requests into POs and track deliveries'],
    ['wrench','Technicians','Reserve parts for a job and see what is in stock'],
    ['line-chart','Facility managers','Watch stock value, stock-outs and parts cost per site']
  ],
  solves: [
    ['A chiller sits down for three days because nobody noticed the last belt was used.','Min/max levels trigger a purchase request before stock runs out','Fewer stock-outs'],
    ['Technicians take parts from the store and nobody records which job they went to.','Parts are issued against a work order, by scan or from the mobile app','Parts cost per job'],
    ['POs are raised by email and goods arrive with no record of what was ordered.','Purchase request, PO and GRN linked in one chain with approvals','Full purchase audit trail'],
    ['Year-end stock count never matches the books.','Scheduled cycle counts with variance approval by item class','Accurate stock value']
  ],
  fieldGroups: {
    'Item master': [
      ['item_code','Item code','Text','Your part number, e.g. BLT-B52 or FLT-G4-592','yes'],
      ['item_name','Item name','Text','Description shown to technicians and on POs','yes'],
      ['item_category','Category','Lookup','Filters, Belts, Electrical, Plumbing, Lamps, Tools','yes'],
      ['item_type','Item type','Picklist','Consumable, Spare part, Rotating tool, Serialised spare','yes'],
      ['uom','Unit of measure','Picklist','Each, Box, Metre, Litre, Kg','yes'],
      ['preferred_vendor','Preferred vendor','Lookup','Default supplier used on new purchase requests','no'],
      ['compatible_assets','Compatible assets','Multi-select','Asset types this part fits, e.g. AHU Carrier 39HQ','no']
    ],
    'Stock & storeroom': [
      ['storeroom','Storeroom','Lookup','Store holding the stock, e.g. Marina Tower B2 Main Store','yes'],
      ['bin_location','Bin location','Text','Rack, shelf and bin, e.g. R3-S2-B04','no'],
      ['qty_on_hand','Quantity on hand','Number','Physical stock in this storeroom','auto'],
      ['qty_reserved','Quantity reserved','Number','Held for open work orders, not yet issued','auto'],
      ['min_level','Minimum level','Number','Reorder point that triggers a purchase request','yes'],
      ['max_level','Maximum level','Number','Order-up-to quantity for the reorder','yes'],
      ['last_count','Last cycle count','Date','Date of last physical count and variance','auto']
    ],
    'Cost': [
      ['unit_cost','Unit cost','Currency','Current cost per unit, used when issuing to a job','yes'],
      ['costing_method','Costing method','Picklist','Average cost, FIFO or Last purchase price','yes'],
      ['stock_value','Stock value','Currency','Quantity on hand times unit cost','auto'],
      ['wo_parts_cost','Parts cost on work order','Currency','Sum of issued items, rolled into job cost','auto'],
      ['lead_time','Lead time','Duration','Typical days from PO to delivery','no']
    ],
    'Procurement': [
      ['pr_number','Purchase request','System','PR-2291, raised manually or by reorder rule','auto'],
      ['po_number','Purchase order','System','PO-5530, with vendor, lines, prices and delivery date','auto'],
      ['po_approval','PO approval','Rule','Approval chain by value, site or category','yes'],
      ['grn','Goods receipt (GRN)','System','Quantities received against PO lines, partial or full','auto'],
      ['delivery_note','Delivery note','File','Supplier delivery note or invoice photo','no'],
      ['transfer','Stock transfer','Lookup','Move stock between storerooms with dispatch and receipt','no']
    ]
  },
  flows: [
    {
      title: 'Belt reserved and issued for an AHU repair',
      scenario: 'AHU-3 at Marina Tower trips on a snapped drive belt during a hot afternoon.',
      steps: [
        { actor: 'Technician', channel: 'Mobile app', text: 'R. Menon adds 2 x belt BLT-B52 to WO-10482 and reserves them from B2 Main Store.', status: 'Reserved' },
        { actor: 'Store keeper', channel: 'Web app', text: 'Sees the reservation in the issue queue and picks the belts from bin R3-S2-B04.', status: '' },
        { actor: 'Store keeper', channel: 'QR scan', text: 'Scans item and technician badge to issue. Stock drops from 3 to 1.', status: 'Issued' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Adds AED 184 parts cost to WO-10482 at the average unit cost of AED 92.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Stock of 1 is below the minimum of 2, so PR-2291 is raised for 4 belts.', status: 'Reorder raised' },
        { actor: 'Technician', channel: 'Mobile app', text: 'Fits the belt and returns the unused one to stock against the same job.', status: 'Closed' }
      ],
      outcome: 'AHU back on in 2 hours, parts cost on the job to the dirham, and reorder raised before the shelf was empty.'
    },
    {
      title: 'Reorder from purchase request to goods receipt',
      scenario: 'G4 filters for Harbour Point fall below their reorder level ahead of the quarterly PPM.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Raises PR-2304 for 120 x FLT-G4-592 to bring stock up to the max level.', status: 'Requested' },
        { actor: 'Planner', channel: 'Web app', text: 'S. Khan adds 40 filters for next month PPM and submits the request.', status: 'Pending approval' },
        { actor: 'Supervisor', channel: 'Email/SMS', text: 'Approves AED 9,600 from the email link, within the site limit of AED 15,000.', status: 'Approved' },
        { actor: 'Procurement', channel: 'Web app', text: 'Converts PR to PO-5530 for Al Noor Filters, delivery in 5 days.', status: 'Ordered' },
        { actor: 'Store keeper', channel: 'Mobile app', text: 'Receives 150 of 160 on GRN-1187 and photographs the delivery note.', status: 'Partially received' },
        { actor: 'Store keeper', channel: 'Web app', text: 'Receives the last 10 two days later and the PO closes.', status: 'Received' }
      ],
      outcome: 'Filters on the shelf 6 days before the PPM, with PR, PO and GRN linked for the finance audit.'
    }
  ],
  process: {
    title: 'Lifecycle of a part',
    statuses: ['Requested','Ordered','Received','In stock','Reserved','Issued'],
    steps: [
      { t:'Request', s:'Need spotted, PR raised', who:'Facilio, planner, technician', statusOn:0,
        p:'A purchase request is raised when stock falls below the minimum, when a planner needs parts for PPM, or when a technician needs a non-stock item. Requests can combine several items and sites.',
        happens:['Reorder rules check stock after every issue','Request routed for approval by value','Duplicate requests for the same item merged'],
        decide:['Which items are reorder-managed','Approval limits by site and value','Who can raise purchase requests'] },
      { t:'Order', s:'Approved PR becomes a PO', who:'Procurement', statusOn:1,
        p:'Procurement converts approved requests into purchase orders, picks the vendor and price, and sends the PO. POs can be pushed to your ERP if purchasing is done there.',
        happens:['PO generated from the PR lines','PO emailed to the vendor as PDF','Expected delivery date tracked'],
        decide:['Whether POs are created in Facilio or the ERP','PO numbering and template','How to handle price changes'] },
      { t:'Receive', s:'Goods in against the PO', who:'Store keeper', statusOn:2,
        p:'The store keeper records a goods receipt against the PO lines. Partial deliveries stay open, and rejected items are returned. Received stock goes into the right storeroom and bin.',
        happens:['GRN updates stock and unit cost','Partial receipts keep the PO open','Delivery note attached to the GRN'],
        decide:['Who can receive goods at each site','Over-receipt tolerance','Whether serial numbers are captured'] },
      { t:'Store', s:'Hold, transfer and count', who:'Store keeper', statusOn:3,
        p:'Stock sits in a storeroom and bin, with min and max levels per store. Items can be transferred between stores, and cycle counts reconcile the system to the shelf.',
        happens:['Transfers dispatched and received in two steps','Cycle counts scheduled by item class','Variances need approval before posting'],
        decide:['Your storeroom structure','Cycle count frequency for A, B and C items','Who approves stock adjustments'] },
      { t:'Issue', s:'Reserve and issue to a job', who:'Technician, store keeper', statusOn:5,
        p:'Technicians reserve parts on a work order and the store keeper issues them. The cost goes onto the job and returns are credited back. Tools are checked out and returned the same way.',
        happens:['Reserved stock is held for the job','Issue reduces stock and adds job cost','Returns put stock back and reverse the cost'],
        decide:['Whether technicians can self-issue','Mandatory work order on every issue','How tool check-out is controlled'] }
    ]
  },
  screens: [
    { kind:'insight', title:'Stock dashboard', desc:'Stock value, items below reorder, open POs and parts spend by site in one view for the store and the FM.',
      insight:{ title:'Inventory overview', range:'Last 30 days', body:`
        <div class="s-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="s-card s-kpi"><b>AED 1.86M</b><small>Stock value, 6 stores</small></div>
          <div class="s-card s-kpi"><b>42</b><small>Items below reorder</small></div>
          <div class="s-card s-kpi"><b>18</b><small>Open POs</small></div>
          <div class="s-card s-kpi"><b>97.1%</b><small>Fill rate on issues</small></div>
        </div>
        <div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1">
          <div class="s-card"><h4>Parts issued to work orders, by week</h4><div class="s-bars"><i style="height:55%"></i><i class="alt" style="height:62%"></i><i style="height:70%"></i><i class="alt" style="height:58%"></i><i style="height:81%"></i><i class="alt" style="height:66%"></i><i style="height:74%"></i><i class="alt" style="height:69%"></i></div></div>
          <div class="s-card"><h4>Below reorder level</h4><div class="s-task"><span class="s-box"></span>BLT-B52 V-belt · 1 of min 2 · <span class="s-badge hi">PR-2291</span></div><div class="s-task"><span class="s-box"></span>FLT-G4-592 filter · 18 of min 60 · <span class="s-badge md">PO-5530</span></div><div class="s-task"><span class="s-box"></span>LMP-T8-18W lamp · 22 of min 50</div><div class="s-task"><span class="s-box done"></span>CTR-32A contactor · received GRN-1187</div></div>
        </div>`}},
    { kind:'list', title:'Item and stock list', desc:'Every item by storeroom with on-hand, reserved and reorder levels. Filter by store, category or stock status.',
      list:{ title:'Items', sub:'2,416 items · 42 below reorder', cta:'New Item', filters:['Store: All','Category: All','Below reorder','Tools only'],
        cols:['Code','Item','Store','On hand','Min / Max','Status'],
        rows:[
          ['BLT-B52','V-belt B52, AHU drive','Marina Tower B2','1','2 / 6','<span class="s-badge hi">Below min</span>'],
          ['FLT-G4-592','Panel filter G4 592x592','Harbour Point','18','60 / 200','<span class="s-badge md">On order</span>'],
          ['CTR-32A','Contactor 32A, 230V coil','City Centre Mall','14','5 / 20','<span class="s-badge ok">In stock</span>'],
          ['LMP-T8-18W','LED tube T8 18W','Marina Tower B2','22','50 / 150','<span class="s-badge hi">Below min</span>'],
          ['TL-MEG-01','Insulation tester 1kV (tool)','Harbour Point','1','1 / 1','<span class="s-badge info">Checked out</span>']
        ]}},
    { kind:'detail', title:'Purchase order record', desc:'One PO with its lines, approvals, receipts and the request it came from, so procurement and stores work from the same record.',
      detail:{ id:'PO-5530 · Stock replenishment', title:'G4 panel filters for Harbour Point', badge:'<span class="s-badge md">Partially received</span>',
        tabs:['Summary','Line items','Receipts','Approvals','Activity'],
        kv:[['Vendor','Al Noor Filters Trading'],['Storeroom','Harbour Point Main Store'],['Source request','PR-2304'],['Order value','AED 9,600'],['Approved by','S. Khan · 8 Oct'],['Expected delivery','13 Oct'],['Received','150 of 160'],['Budget line','HP · HVAC consumables']],
        sideTitle:'Receipts 1 of 2',
        side:`<div class="s-kv"><div><small>GRN-1187 · 13 Oct</small><span>150 x FLT-G4-592</span></div><div><small>Delivery note</small><span>DN-88412.pdf</span></div><div><small>Outstanding</small><span>10 x FLT-G4-592</span></div><div><small>Unit cost</small><span>AED 60.00</span></div></div>`}},
    { kind:'mobile', title:'Store and technician mobile', desc:'Technicians check stock and reserve parts from the job. Store keepers issue, receive and count by scanning bin and item labels.',
      mobile:{ bar:'Store tasks · 5', btn:'Scan to issue', items:[['Issue 2 x BLT-B52','WO-10482 · R. Menon · Reserved 13:05'],['Receive PO-5530','Al Noor Filters · 10 items outstanding'],['Cycle count: Rack R3','Marina Tower B2 · 46 bins · Due today'],['Transfer TR-0412','8 x CTR-32A to Harbour Point']],
        noteTitle:'Scan, do not type', note:'<span>Barcode or QR labels on bins and items cut picking errors.</span><span>Counts done offline sync when the store has signal again.</span>'}}
  ],
  videos: ['inventory','wo','ppmTech','vendor','reporting','dashboards'],
  bring: [
    ['Current item master','Item codes, descriptions, units and categories, as a spreadsheet'],
    ['Storeroom list','Each store, its site, and how racks and bins are labelled'],
    ['Current stock on hand','Latest count per item per store, with unit cost if you have it'],
    ['Reorder levels','Any min/max or reorder points you use today, even for a few critical items'],
    ['Purchase approval matrix','Who approves POs, at what value, per site or category'],
    ['Sample PR, PO and GRN','One real set, so we can match numbering and templates']
  ],
  people: [['warehouse','Store keeper'],['shopping-cart','Procurement lead'],['user-cog','Facility / maintenance manager'],['receipt','Finance / cost controller'],['server','ERP or IT owner']],
  form: [
    { section: 'Stores & items', questions: [
      { id:'storeroom_count', q:'How many storerooms are in scope?', type:'number', placeholder:'e.g. 6' },
      { id:'item_count', q:'Roughly how many stocked items do you hold?', type:'select', options:['< 500','500–2,000','2,000–10,000','10,000+'] },
      { id:'stock_tracking', q:'How is stock tracked today?', type:'scale', options:['Not tracked','Paper log','Spreadsheet','Separate system','Integrated with CMMS'] },
      { id:'item_types', q:'What do you need to track?', type:'multi', options:['Consumables','Spare parts','Serialised spares','Tools','Chemicals','Uniforms & PPE'] }
    ]},
    { section: 'Issuing & reorder', questions: [
      { id:'self_issue', q:'Can technicians take parts without a store keeper?', type:'yesno', hint:'If yes, we will set up self-issue against the work order.' },
      { id:'reorder_method', q:'How do you decide when to reorder?', type:'select', options:['When it runs out','Store keeper judgement','Fixed min/max levels','Planned from PPM demand'] },
      { id:'costing_method', q:'How should parts be costed on work orders?', type:'select', options:['Average cost','FIFO','Last purchase price','Not needed'] },
      { id:'critical_spares', q:'Which critical spares must never run out?', type:'long', placeholder:'e.g. chiller compressor contactors, fire pump seals, lift door sensors' }
    ]},
    { section: 'Procurement', questions: [
      { id:'po_system', q:'Where are purchase orders created today?', type:'text', placeholder:'e.g. SAP MM, Oracle, Excel, Facilio' },
      { id:'po_approval_rules', q:'Describe your PO approval limits.', type:'long', placeholder:'e.g. under AED 5,000 site FM, up to 25,000 ops head, above that CFO' },
      { id:'proc_steps', q:'Which procurement steps should run in Facilio?', type:'multi', options:['Purchase requests','Quotes from vendors','Purchase orders','Goods receipt (GRN)','Stock transfers','Cycle counts'] }
    ]},
    { section: 'Counts & control', questions: [
      { id:'cycle_count', q:'How often do you count stock?', type:'select', options:['Never','Annually','Quarterly','Monthly','Rolling cycle counts'] },
      { id:'barcode_labels', q:'Are items and bins labelled with barcodes or QR codes?', type:'yesno', hint:'If not, we can generate labels from Facilio.' },
      { id:'adjust_approver', q:'Who approves stock adjustments after a count?', type:'text', placeholder:'e.g. store manager, finance controller' }
    ]}
  ]
});


MODS.push({
  key: 'budget',
  name: 'Budgets & Financials',
  short: 'Budgets',
  group: 'Supply chain',
  icon: 'wallet',
  accent: 'violet',
  tagline: 'Plan maintenance spend and track every dirham to the job',
  lede: 'A short brief on how Facilio sets maintenance budgets, rolls up work order costs and tracks budget against actual. Read it with your finance controller before the workshop.',
  about: [
    'Budgets & Financials holds your maintenance budgets by site, category and period, mapped to your chart of accounts. Every quote, purchase order, vendor invoice and work order cost is tagged to a budget line, so committed and actual spend are always visible.',
    'Work order costs roll up automatically from labour time logs, parts issued from inventory and vendor invoices. Quotes are approved against available budget, overspend alerts fire before a line runs out, and approved invoices can be exported to your ERP for payment.'
  ],
  who: [
    ['scale','Finance controllers','Set budgets, map GL codes, review budget vs actual'],
    ['user-cog','Facility managers','Approve quotes and watch spend per site and trade'],
    ['receipt','Accounts payable','Verify and export invoices for payment'],
    ['building-2','Owners & clients','See maintenance spend and recharges per property']
  ],
  solves: [
    ['Finance finds out a site is over budget at quarter end, when it is too late.','Committed and actual spend tracked live, with alerts at 80% and 100%','Early overspend warning'],
    ['Nobody can say what a single AHU or a single site really cost to maintain.','Labour, parts and vendor costs roll up from each work order','True cost per asset & site'],
    ['Quotes are approved by email with no check on remaining budget.','Quote approval shows budget left on the line before sign-off','Spend within budget'],
    ['Month-end means re-keying invoices into the ERP with the right GL codes.','Budget lines carry GL and cost centre codes, exported with each invoice','Faster month-end close']
  ],
  fieldGroups: {
    'Budget setup': [
      ['budget_name','Budget name','Text','e.g. FY2027 Marina Tower Maintenance','yes'],
      ['fiscal_year','Fiscal year','Picklist','Financial year the budget covers, with your start month','yes'],
      ['budget_period','Period split','Picklist','Monthly, Quarterly or Annual phasing','yes'],
      ['budget_site','Site','Lookup','Site or portfolio the budget belongs to','yes'],
      ['budget_category','Category','Lookup','HVAC, Electrical, Lifts, Soft services, Capex projects','yes'],
      ['budget_amount','Budget amount','Currency','Approved amount per line and period','yes'],
      ['budget_status','Status','System','Draft, Submitted, Approved, Active, Closed','auto']
    ],
    'Accounts mapping': [
      ['gl_account','GL account','Lookup','Chart of accounts code, e.g. 6120 Repairs and maintenance','yes'],
      ['cost_centre','Cost centre','Lookup','Cost centre or property code in your ERP','yes'],
      ['opex_capex','Opex / Capex','Picklist','Classifies spend for reporting and approvals','yes'],
      ['recharge_flag','Rechargeable','Boolean','Whether the cost is recharged to a tenant or client','no'],
      ['tax_code','Tax code','Picklist','VAT or GST treatment applied on export','no']
    ],
    'Cost roll-up': [
      ['labour_cost','Labour cost','Currency','Hours from time logs times technician rate','auto'],
      ['parts_cost','Parts cost','Currency','Items issued from inventory at unit cost','auto'],
      ['vendor_cost','Vendor cost','Currency','Approved vendor invoice amount on the job','auto'],
      ['other_cost','Other cost','Currency','Equipment hire, permits, disposal and similar','no'],
      ['total_wo_cost','Total work order cost','Currency','Sum of labour, parts, vendor and other','auto'],
      ['committed','Committed spend','Currency','Approved quotes and open POs not yet invoiced','auto']
    ],
    'Quotes & invoices': [
      ['quote_ref','Quote','Lookup','Vendor quote linked to a work order or service request','no'],
      ['quote_amount','Quote amount','Currency','Quoted price before approval','yes'],
      ['quote_approval','Approval rule','Rule','Approvers by amount, site and Opex or Capex','yes'],
      ['invoice_ref','Invoice','Lookup','Vendor invoice matched to the work order and PO','no'],
      ['invoice_status','Invoice status','Picklist','Submitted, Verified, Approved, Exported, Paid','auto'],
      ['overspend_alert','Overspend alert','Rule','Notify at 80% and 100% of a budget line','no']
    ]
  },
  flows: [
    {
      title: 'Chiller repair quote approved against budget',
      scenario: 'Chiller CH-2 at Harbour Point needs a compressor rebuild that the AMC does not cover.',
      steps: [
        { actor: 'Vendor', channel: 'Vendor portal', text: 'CoolAir Technical submits Q-0871 for AED 48,500 against WO-10467.', status: 'Submitted' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Maps the quote to HP · HVAC · Q4 and shows AED 61,200 left on the line.', status: 'Pending approval' },
        { actor: 'Supervisor', channel: 'Web app', text: 'R. Menon checks scope and recommends approval with a note on downtime risk.', status: '' },
        { actor: 'Finance', channel: 'Email/SMS', text: 'S. Khan approves, as the amount is above the AED 25,000 FM limit.', status: 'Approved' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Books AED 48,500 as committed. Line now at 84% used and sends an 80% alert.', status: 'Committed' },
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Matched invoice moves the amount from committed to actual and exports to the ERP.', status: 'Invoiced' }
      ],
      outcome: 'Approval in under 1 day instead of a week of emails, and the FM knew the line was at 84% before the next spend.'
    },
    {
      title: 'Monthly budget vs actual review',
      scenario: 'The FM and finance controller review October spend for City Centre Mall.',
      steps: [
        { actor: 'Facilio (automation)', channel: 'Automation', text: 'Closes 312 work orders into actuals: labour AED 86k, parts AED 21k, vendors AED 140k.', status: '' },
        { actor: 'Facilio (automation)', channel: 'Email/SMS', text: 'Sends the budget vs actual pack to the FM and finance on the 1st working day.', status: '' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Drills into Lifts, 18% over, and finds 4 call-outs on escalator E1.', status: '' },
        { actor: 'Finance', channel: 'Web app', text: 'Moves AED 15,000 from Soft services to Lifts with an approval note.', status: 'Revised' },
        { actor: 'Supervisor', channel: 'Web app', text: 'Raises a root cause job for E1 and flags its recharge to the tenant.', status: '' },
        { actor: 'Finance', channel: 'Web app', text: 'Locks October and exports actuals by GL and cost centre to the ERP.', status: 'Period closed' }
      ],
      outcome: 'Month-end review done in 2 hours with no spreadsheets, and AED 6,800 of escalator cost recharged to the tenant.'
    }
  ],
  process: {
    title: 'Lifecycle of a budget',
    statuses: ['Draft','Submitted','Approved','Active','Revised','Closed'],
    steps: [
      { t:'Plan', s:'Build budget lines', who:'FM, finance controller', statusOn:0,
        p:'Budgets are drafted per site, category and period, often seeded from last year actuals plus the PPM plan and AMC values. Each line is mapped to a GL account and cost centre.',
        happens:['Lines created from template or import','Last year actuals shown beside each line','AMC fixed costs pre-filled from contracts'],
        decide:['Budget structure: site, category, period','Whether Opex and Capex are separate budgets','How you phase spend across months'] },
      { t:'Approve', s:'Submit and sign off', who:'Finance, leadership', statusOn:2,
        p:'The draft is submitted for approval. Once approved it becomes active and every quote, PO and work order cost starts drawing against it.',
        happens:['Approval routed to finance and leadership','Approved budget locked against edits','Version kept for audit'],
        decide:['Who approves the annual budget','Whether sites can see each other budgets','How changes after approval are handled'] },
      { t:'Commit', s:'Quotes and POs reserve money', who:'FM, procurement', statusOn:3,
        p:'Approved quotes and purchase orders are booked as committed spend on their budget line. Approvers see remaining budget before they sign, and alerts fire as lines fill up.',
        happens:['Committed spend updates on approval','Alerts at 80% and 100% of a line','Over-budget approvals escalate a level'],
        decide:['Quote and PO approval limits','Alert thresholds and recipients','Whether over-budget spend is blocked or escalated'] },
      { t:'Actual', s:'Costs roll up from jobs', who:'Facilio, accounts payable', statusOn:3,
        p:'Labour, parts and vendor costs flow from closed work orders into actuals. Verified invoices move amounts from committed to actual and can be exported to the ERP with GL codes.',
        happens:['Work order cost totals calculated on close','Invoices matched to job and PO','Export file or API push to the ERP'],
        decide:['Labour rates used for internal costing','When a cost counts as actual','ERP export format and timing'] },
      { t:'Review', s:'Compare, revise, close', who:'FM, finance controller', statusOn:4,
        p:'Budget vs actual is reviewed each month by site and category. Funds can be moved between lines with approval, and periods are closed once actuals are final.',
        happens:['Variance shown per line and period','Reallocations logged with reason','Closed periods locked from new costs'],
        decide:['Monthly report pack and audience','Who can reallocate between lines','Period close date each month'] }
    ]
  },
  screens: [
    { kind:'insight', title:'Budget vs actual dashboard', desc:'Budget, committed and actual spend by site and category, with lines at risk highlighted before they overspend.',
      insight:{ title:'FY2027 maintenance spend', range:'Year to date · Oct', body:`
        <div class="s-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="s-card s-kpi"><b>AED 14.2M</b><small>Annual budget</small></div>
          <div class="s-card s-kpi"><b>AED 9.8M</b><small>Actual to date</small></div>
          <div class="s-card s-kpi"><b>AED 1.1M</b><small>Committed</small></div>
          <div class="s-card s-kpi"><b>5</b><small>Lines over 90%</small></div>
        </div>
        <div class="s-grid" style="grid-template-columns:1fr 1fr;flex:1">
          <div class="s-card"><h4>Budget vs actual, by month</h4><div class="s-bars"><i style="height:68%"></i><i class="alt" style="height:64%"></i><i style="height:70%"></i><i class="alt" style="height:73%"></i><i style="height:72%"></i><i class="alt" style="height:79%"></i><i style="height:70%"></i><i class="alt" style="height:68%"></i><i style="height:74%"></i><i class="alt" style="height:86%"></i></div></div>
          <div class="s-card"><h4>Lines at risk</h4><div class="s-kv"><div><small>CCM · Lifts</small><span><span class="s-badge hi">118%</span></span></div><div><small>HP · HVAC</small><span><span class="s-badge md">84%</span></span></div><div><small>MT · Electrical</small><span><span class="s-badge md">91%</span></span></div><div><small>MT · Soft services</small><span><span class="s-badge ok">62%</span></span></div></div></div>
        </div>`}},
    { kind:'list', title:'Budget lines', desc:'Every budget line with GL code, budget, committed and actual. Filter by site, category or period.',
      list:{ title:'Budget Lines · FY2027', sub:'64 lines · 5 over 90%', cta:'New Budget', filters:['Site: All','Category: All','Period: Q4','Opex'],
        cols:['Line','GL account','Budget','Committed','Actual','Used'],
        rows:[
          ['CCM · Lifts · Q4','6130 Lifts AMC','AED 180,000','AED 12,400','AED 200,600','<span class="s-badge hi">118%</span>'],
          ['HP · HVAC · Q4','6120 Repairs','AED 320,000','AED 48,500','AED 220,300','<span class="s-badge md">84%</span>'],
          ['MT · Electrical · Q4','6120 Repairs','AED 140,000','AED 9,200','AED 118,700','<span class="s-badge md">91%</span>'],
          ['MT · Soft services · Q4','6210 Cleaning','AED 410,000','AED 0','AED 254,000','<span class="s-badge ok">62%</span>'],
          ['HP · Fire safety · Q4','6140 Fire systems','AED 95,000','AED 18,000','AED 31,500','<span class="s-badge lo">52%</span>']
        ]}},
    { kind:'detail', title:'Work order cost roll-up', desc:'Labour, parts and vendor costs on one job, with the budget line it draws from and the invoice behind it.',
      detail:{ id:'WO-10467 · Corrective', title:'CH-2 compressor rebuild, Harbour Point', badge:'<span class="s-badge ok">Invoiced</span>',
        tabs:['Summary','Cost','Quote','Invoices','Activity'],
        kv:[['Site','Harbour Point'],['Asset','CH-2 (Trane RTAC 300)'],['Budget line','HP · HVAC · Q4'],['GL account','6120 Repairs and maintenance'],['Cost centre','HP-OPS-01'],['Quote','Q-0871 · AED 48,500'],['Invoice','INV-CA-3418 · Verified'],['Opex / Capex','Opex']],
        sideTitle:'Cost breakdown',
        side:`<div class="s-kv"><div><small>Labour · 14.5 h</small><span>AED 2,610</span></div><div><small>Parts · 6 items</small><span>AED 3,940</span></div><div><small>Vendor · CoolAir Technical</small><span>AED 48,500</span></div><div><small>Other · crane hire</small><span>AED 1,800</span></div><div><small>Total</small><span>AED 56,850</span></div></div>`}},
    { kind:'mobile', title:'Approvals on mobile', desc:'Managers approve quotes, POs and invoices from their phone, with the remaining budget shown before they sign.',
      mobile:{ bar:'Approvals · 4', btn:'Approve', items:[['Q-0871 · AED 48,500','CH-2 rebuild · HP HVAC · 61,200 left'],['PO-5534 · AED 7,200','Lamps restock · MT Electrical · 21,300 left'],['INV-GL-2207 · AED 12,400','Lift call-outs · CCM Lifts · Over budget'],['Reallocation · AED 15,000','Soft services to Lifts · CCM']],
        noteTitle:'Budget before you sign', note:'<span>Each approval shows the line it hits and what is left after it.</span><span>Over-budget items are marked and escalate to the next approver.</span>'}}
  ],
  videos: ['sr','reporting','dashboards','wo','vendor','inventory','visibility'],
  bring: [
    ['Current maintenance budget','This year budget by site and category, as the spreadsheet finance uses'],
    ['Chart of accounts extract','GL codes and cost centres used for maintenance spend'],
    ['Approval matrix','Who approves quotes, POs and invoices, at what value'],
    ['Labour rates','Internal hourly rates by trade or grade for costing in-house work'],
    ['Last month spend report','The budget vs actual pack leadership reviews today'],
    ['ERP export sample','An example invoice or journal import file your ERP accepts']
  ],
  people: [['scale','Finance controller'],['user-cog','Facility / maintenance manager'],['receipt','Accounts payable lead'],['briefcase','Procurement or contracts lead'],['server','ERP or IT owner']],
  form: [
    { section: 'Budget structure', questions: [
      { id:'budget_dimensions', q:'How do you split your maintenance budget?', type:'multi', options:['By site','By building','By category / trade','By asset class','By client or tenant','Opex vs Capex'] },
      { id:'budget_phasing', q:'How is the budget phased?', type:'select', options:['Annual only','Quarterly','Monthly'] },
      { id:'fy_start', q:'When does your financial year start?', type:'text', placeholder:'e.g. 1 January, 1 April' },
      { id:'annual_spend', q:'Approximate annual maintenance spend in scope?', type:'number', placeholder:'e.g. 14000000' }
    ]},
    { section: 'Cost capture', questions: [
      { id:'cost_types', q:'Which costs should roll up to a work order?', type:'multi', options:['Internal labour','Parts from inventory','Vendor invoices','Equipment hire','Permits & fees','Overtime'] },
      { id:'labour_costing', q:'Do you cost in-house labour on jobs?', type:'yesno', hint:'If yes, bring hourly rates by trade or grade.' },
      { id:'cost_maturity', q:'How well can you report cost per site or asset today?', type:'scale', options:['Not possible','Rough estimate','Monthly spreadsheet','Per site in ERP','Per asset, on demand'] },
      { id:'recharges', q:'Do you recharge any maintenance costs to tenants or clients?', type:'yesno', hint:'If yes, explain the rules in the workshop.' }
    ]},
    { section: 'Approvals & alerts', questions: [
      { id:'approval_limits', q:'Describe your quote and invoice approval limits.', type:'long', placeholder:'e.g. FM up to AED 25,000, ops director to 100,000, CFO above' },
      { id:'overspend_action', q:'What should happen when a line goes over budget?', type:'select', options:['Warn only','Escalate approval','Block new spend','Case by case'] },
      { id:'alert_recipients', q:'Who should get overspend alerts?', type:'text', placeholder:'e.g. site FM and finance controller' }
    ]},
    { section: 'Finance integration', questions: [
      { id:'erp_system', q:'Which ERP or accounts system do you use?', type:'select', options:['SAP','Oracle','Microsoft Dynamics','Xero / QuickBooks','Other','None'] },
      { id:'erp_sync', q:'What should flow between Facilio and the ERP?', type:'multi', options:['GL codes & cost centres','Budgets','Purchase orders','Vendor invoices','Actual costs / journals','Payment status'] },
      { id:'month_end', q:'Describe your month-end close for maintenance costs.', type:'long', placeholder:'e.g. AP keys invoices by the 5th, finance accrues open jobs, report out by the 10th' }
    ]}
  ]
});

const VBASE = 'https://videos.facilio.com/';
const VIDEOS = {
  tour:      { t:'Facility Maintenance tour', d:'03:18', th:'wo', tag:'Overview', p:'rN7y3Yhz7tGcYe5xQ3MitQ/lLgNSmXgV5l7wPpiD8U8hw', s:'A walk through Connected CMMS: role-based dashboards, reactive and planned maintenance, inventory and budgets.' },
  visibility:{ t:'Operational visibility', d:'01:38', th:'plat', tag:'Dashboards', p:'rN7y3Yhz7tGcYe5xQ3MitQ/iNALASSX4d29t4sYVU74dw', s:'Role-based dashboards that give each stakeholder the metrics they care about.' },
  wo:        { t:'Reactive maintenance: Work Orders', th:'wo', tag:'Work orders', p:'rN7y3Yhz7tGcYe5xQ3MitQ/l9KcJ45LBWFine6Tit6OtA', s:'A work order from creation to closure, with workflows, SLAs and escalations.' },
  sr:        { t:'Service Requests & Quotes', th:'portal', tag:'Requests', p:'rN7y3Yhz7tGcYe5xQ3MitQ/CO6tpCbjc6Q9E1LrcdBC7g', s:'Service catalogue, requests from the tenant portal, and quotes sent for approval.' },
  ppm:       { t:'PPM Overview', th:'ppm', tag:'Planned maintenance', p:'rN7y3Yhz7tGcYe5xQ3MitQ/NqqDbVr5Xpj18zCDHkZsqA', s:'Setting up planned maintenance across a portfolio in three steps.' },
  ppmTech:   { t:'Job plans, safety plans & schedulers', th:'ppm', tag:'PPM for technicians', p:'rN7y3Yhz7tGcYe5xQ3MitQ/lJ4Qv5SrVkSS5by2G6m9EQ', s:'Mapping routine tasks to job plans, adding safety plans, rescheduling by availability.' },
  inventory: { t:'Integrated inventory', d:'02:24', th:'asset', tag:'Inventory', p:'rN7y3Yhz7tGcYe5xQ3MitQ/PrfveGhaRkz28MBf7PiZHA', s:'Reserve and issue parts against work orders and track spares during maintenance.' },
  vendor:    { t:'Vendor portal', d:'03:49', th:'portal', tag:'Vendors', p:'4EvOgYqsJ28I3Im4t2osOA/B9bKpkfSZwhVL5fku0xp7Q', s:'How vendors receive, update and close jobs from their own portal.' },
  tenant:    { t:'Tenant Service Portal', d:'02:37', th:'portal', tag:'Occupants', p:'4EvOgYqsJ28I3Im4t2osOA/xMb1a12cJ88rX7673ZE4uA', s:'Occupants raise requests and follow progress from a branded portal.' },
  custom:    { t:'Custom Module', th:'plat', tag:'Platform', p:'5boQlXeJMArq4p6o5hcYzQ/eizFtafiJJhA1pA8D1w8Sw', s:'Extending the data model with your own modules and fields.' },
  reporting: { t:'Reporting', d:'03:33', th:'plat', tag:'Platform', p:'5boQlXeJMArq4p6o5hcYzQ/6fYw2AwDJQgoDoKsVVQ2mQ', s:'Building and scheduling reports on any module.' },
  dashboards:{ t:'Dashboards', th:'plat', tag:'Platform', p:'5boQlXeJMArq4p6o5hcYzQ/DMu8j4iXDtRVA7fuxyJ6tg', s:'Live dashboards for portfolio, site and team views.' },
  notifications:{ t:'Notifications', th:'plat', tag:'Platform', p:'5boQlXeJMArq4p6o5hcYzQ/uWqZlPgYuA5wp8te8sYXrQ', s:'Email, SMS and push notifications driven by your rules.' },
  users:     { t:'User Management', th:'plat', tag:'Platform', p:'5boQlXeJMArq4p6o5hcYzQ/dZ4j5sQYaA8oRm8q1Uf1BQ', s:'Roles, permissions, teams and portal users.' },
  views:     { t:'View manager', th:'plat', tag:'Platform', p:'5boQlXeJMArq4p6o5hcYzQ/jOcbMAYWx9P4VPFBH5SaxA', s:'Saved list views, filters and columns per team.' }
};
const PLATFORM = ['reporting','dashboards','views','users','notifications','custom'];
  // Facilio module names (as used in the configuration) that each learning module covers.
  const MAP = {
    wo: ['workorder'], sr: ['serviceRequest'], fsm: ['serviceAppointment', 'serviceOrder', 'serviceTasks', 'trip'],
    ppm: ['plannedmaintenance', 'preventivemaintenance', 'jobplan'], asset: ['asset', 'assetcategory'],
    insp: ['inspectionTemplate', 'inspectionResponse'], vendor: ['vendors', 'vendorQuotes', 'requestForQuotation', 'vendorcontact', 'contracts'],
    inv: ['item', 'tool', 'storeRoom', 'inventoryrequest', 'purchaserequest', 'purchaseorder', 'receivable', 'transferrequest'], budget: ['budget', 'chartofaccount']
  };
  const BY = Object.fromEntries(MODS.map(m => [m.key, m]));
  const forModule = name => { const n = String(name || '').toLowerCase(); const k = Object.keys(MAP).find(key => MAP[key].some(x => x.toLowerCase() === n)); return k ? BY[k] : null; };
  root.FWBLearn = { MODS, BY, VIDEOS, VBASE, PLATFORM, MAP, forModule };
})(typeof window !== 'undefined' ? window : globalThis);
