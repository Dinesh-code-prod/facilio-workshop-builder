/* Agent catalogue only (the Agent Setup, Connection & Data, Rules & Guardrails and Agent Testing tabs were removed on 7 Nov 2026). The customer guides still read V.agentCatalog. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  (V.extraSections = V.extraSections || []).push('agentscope');
  // [key, name, what it does, data to collect from the customer, how to test it]
  const AGENTS = [
    ['helpdesk', 'Helpdesk AI agent', 'Answers service requests, including after hours, logs them against the right asset and routes them.', ['Asset register and locations', 'Request categories and priorities', 'SLA and routing rules', 'Channels people use (email, portal, chat)'], 'Send sample requests: after hours, wrong site, duplicate, missing detail. Check asset, priority and route.'],
    ['invoice', 'Invoice validation AI agent', 'Reads a contractor invoice against the work order and flags the mismatch before approval.', ['Work orders with costs', 'Vendor list, rates and contracts', 'Sample invoices in each format', 'The approval chain'], 'Run past invoices with known errors (wrong rate, extra hours, missing work order). Confirm each is flagged.'],
    ['reporting', 'Reporting AI agent', 'Compiles a report across all sites without anyone building it by hand.', ['KPI definitions', 'Site and asset hierarchy', 'Report layouts and recipients', 'Schedule'], 'Compare one generated report with the report the team builds today, number by number.'],
    ['compliance', 'Compliance AI agent', 'Runs contractor check-ins and compliance tracking without chasing paperwork.', ['Compliance requirements per site or asset', 'Certificate types and expiry rules', 'Contractor list and contacts', 'Reminder rules'], 'Use contractors with expired, expiring and valid papers. Check who is reminded and when.'],
    ['wcv', 'Work Completion Validator', 'Checks photos, time on site, checklists and meter readings before a work order closes.', ['Work order types and completion rules', 'Checklist templates', 'Photo rules (before and after)', 'Meter points'], 'Close work orders with missing photos, short time on site and blank checklist items. Each should be held.'],
    ['ops', 'Ops Performance Intelligence', 'Answers on demand: top-cost assets, vendor scorecards, SLA patterns, contract risk.', ['Cost history by asset', 'SLA definitions', 'Vendor and contract data'], 'Ask the ten questions managers ask most. Check each answer against the source records.'],
    ['audit', 'Audit Report Intelligence', 'Reads inspection reports (text, voice, photo, PDF), extracts findings and raises corrective work orders.', ['Inspection templates', 'Sample reports in each format', 'Finding-to-work-order mapping', 'Severity rules'], 'Feed real reports. Check every finding is extracted and each corrective work order is right.'],
    ['contractor', 'Contractor Work Tracker', 'Takes updates sent by WhatsApp, voice or message and structures them into the CMMS.', ['Contractor contacts and channels', 'Work categories', 'Photo classification rules', 'Which fields an update fills'], 'Send updates in every channel, with good and bad photos. Check the records created.']
  ];
  V.agentCatalog = AGENTS;
})(typeof window !== 'undefined' ? window : globalThis);
