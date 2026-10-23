const fs=require('fs'),path=require('path');const {DOMParser}=require('@xmldom/xmldom');
const P=require('../src/parser.js');
const dir=process.argv[2];const files={};
function walk(d,rel){for(const f of fs.readdirSync(d)){const p=path.join(d,f),r=rel?rel+'/'+f:f;if(fs.statSync(p).isDirectory())walk(p,r);else if(/\.xml$/.test(f))files[r]=fs.readFileSync(p,'utf8');}}
walk(dir,'');
const t0=Date.now();const b=P.parsePackage(files,{DOMParser,sourceName:'test.zip'});
console.log('ms',Date.now()-t0);
const mods=Object.values(b.modules);
console.log('modules',mods.length,'inUse',mods.filter(m=>m.inUse).length,'high',mods.filter(m=>m.priority=='high').map(m=>m.name).join(','));
console.log('medium',mods.filter(m=>m.priority=='medium').map(m=>m.name).join(','));
console.log('fields',mods.reduce((n,m)=>n+m.fields.length,0),'forms',Object.keys(b.forms).length,'flows',b.flows.length,'trans',b.transitions.length,'roles',b.roles.length,'approvals',b.approvals.length,'notif',b.notifications.length);
console.log('gaps',b.gaps.length, b.gaps.slice(0,6));
const wo=b.transitions.filter(t=>t.module=='workorder');console.log(JSON.stringify(wo.slice(0,2),null,0).slice(0,1500));
console.log(JSON.stringify(b.portalEvidence.map(p=>({n:p.name,tabs:p.tabs.length,forms:p.forms.length,roles:p.roles,tr:p.transitions.length}))));
console.log(JSON.stringify(b.roles.find(r=>r.name=='Vendor User').permissions.slice(0,4)));
console.log(JSON.stringify(b.notifications.slice(0,3).map(n=>({n:n.name,m:n.module,e:n.eventLabel,c:n.criteria&&n.criteria.text,r:n.actions.recipients}))));
console.log(JSON.stringify(b.portfolio), JSON.stringify(b.assetLinks));
fs.writeFileSync('/tmp/claude-0/-home-claude/821e0287-8d5b-5e33-8ad9-50e9cc663de3/scratchpad/baseline.json',JSON.stringify(b));
console.log('json size',JSON.stringify(b).length);
