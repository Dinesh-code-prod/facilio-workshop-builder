/* Discover more with Facilio: the solution areas shown to a customer, and which modules of the organisation package belong to each. Only modules that
   exist in the loaded package and are NOT in this project's scope are shown; the words about each module come from the package itself (its own
   description), so nothing is claimed that the package does not say. The area blurbs are general descriptions of what the modules in that area do. */
(function (root) {
  'use strict';
  const AREAS = [
    { id: 'visitors', icon: 'shield', title: 'Visitors and security', blurb: 'Welcome guests, track every visit and keep a watch list, with inductions for visitors and new starters.',
      mods: ['visitor', 'visitorlog', 'watchlist', 'groupinvite', 'inductionTemplate', 'inductionResponse'] },
    { id: 'community', icon: 'mail', title: 'Tenant and employee engagement', blurb: 'Keep people informed and involved: announcements, news, offers, surveys and a contact directory.',
      mods: ['announcement', 'peopleannouncement', 'audience', 'newsandinformation', 'neighbourhood', 'dealsandoffers', 'surveyTemplate', 'surveyResponse', 'contactdirectory', 'admindocuments'] },
    { id: 'safety', icon: 'check', title: 'Health, safety and risk', blurb: 'Define hazards and precautions, plan for safety and keep a register of risks.',
      mods: ['safetyPlan', 'hazard', 'precaution', 'riskRegistry', 'inspectionTemplate'] },
    { id: 'workplace', icon: 'modules', title: 'Workplace and space', blurb: 'Manage rooms, desks, lockers, parking, deliveries and moves, with floor plans of your spaces.',
      mods: ['desks', 'lockers', 'facility', 'amenity', 'rooms', 'moves', 'parkingstall', 'deliveryArea', 'deliveries', 'indoorfloorplan'] },
    { id: 'energy', icon: 'spark', title: 'Energy, meters and utilities', blurb: 'Digitise meters and utility bills, track readings and KPIs, and set rules and control actions on them.',
      mods: ['meter', 'virtualMeterTemplate', 'utilityIntegrationCustomer', 'utilityIntegrationTariff', 'utilityIntegrationBills', 'utilityAccountBill', 'utilityDispute', 'readingkpi', 'newreadingrules', 'controlAction', 'controlActionTemplate', 'calendar', 'calendarEvent', 'alarmType'] },
    { id: 'finance', icon: 'dash', title: 'Finance and budgets', blurb: 'Plan budgets and keep your accounts and credit notes in one place.',
      mods: ['budget', 'chartofaccount', 'accounttype', 'creditNote', 'vendorCredit', 'clientCredit'] },
    { id: 'maintenance', icon: 'gear', title: 'Smarter maintenance', blurb: 'Standardise failures, group assets, plan routes and job plans, and keep time logs.',
      mods: ['failureclass', 'failurecode', 'routes', 'assetgroup', 'jobplan', 'inventoryReturn', 'assigneeTimeLog', 'assigneeTimeSheet'] },
    { id: 'workforce', icon: 'flag', title: 'Workforce', blurb: 'Schedule shifts and breaks, record attendance and organise teams and departments.',
      mods: ['shift', 'break', 'attendance', 'peopleGroup', 'department'] },
    { id: 'contacts', icon: 'book', title: 'Vendors, tenants and contacts', blurb: 'Keep contact details and units for vendors, tenants and clients together.',
      mods: ['vendorcontact', 'tenantcontact', 'clientcontact', 'tenantunit', 'vendorDiversityCertification'] }
  ];
  root.FWBExplore = { AREAS };
})(typeof window !== 'undefined' ? window : globalThis);
