'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const docs=[...walk(path.join(root,'docs')),...walk(path.join(root,'skills')),path.join(root,'README.md')].filter(file=>file.endsWith('.md'));
let links=0;
for(const file of docs)for(const [,raw] of fs.readFileSync(file,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
 const target=raw.split('#')[0].replace(/^<|>$/g,'');if(!target||/^[a-z][a-z0-9+.-]*:/i.test(target))continue;
 const resolved=path.resolve(path.dirname(file),target);
 assert.ok(!resolved.startsWith(path.join(root,'output')+path.sep),'Tracked documentation must not link to ignored output: '+path.relative(root,file)+' → '+target);
 assert.ok(fs.existsSync(resolved),'Broken documentation link: '+path.relative(root,file)+' → '+target);links++;
}
const archive=JSON.parse(fs.readFileSync(path.join(root,'docs/validation/output-cleanup-20261016.json'),'utf8'));
for(const record of [...archive.preserved,...archive.previewTemplates]){
 const target=path.resolve(root,record.retained);assert.ok(target.startsWith(root+path.sep));assert.ok(fs.existsSync(target),'Missing archived source: '+record.retained);
}
const report=path.join(root,'docs/validation/ui-audit-20261016/report.html');
for(const [,target] of fs.readFileSync(report,'utf8').matchAll(/(?:href|src)="([^"]+)"/g)){
 if(/^(?:#|https?:|data:)/.test(target))continue;
 assert.ok(fs.existsSync(path.resolve(path.dirname(report),target)),'Broken UI audit asset: '+target);
}
console.log('PASS '+links+' documentation links, archived references/skills/evidence and standalone UI audit assets');
