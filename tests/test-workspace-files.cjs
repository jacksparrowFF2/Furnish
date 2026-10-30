'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Files=require('../scripts/workspace-files.cjs'),C=require('../src/core/repository-core.js');
const root=path.resolve(__dirname,'../output/workspace-files-tests');fs.mkdirSync(root,{recursive:true});
const run=fs.mkdtempSync(path.join(root,'run-')),repo=path.join(run,'repo');fs.mkdirSync(repo);
const plan=require('../src/data/plans.js')[0];let uid=0,time=Date.UTC(2026,9,1);
const W=require('../src/core/work-state.js').create({makeId:()=> 'file'+ ++uid,colorFor:()=> '#aabbcc',materials:require('../src/data/catalog.js').materials});
const work=W.fresh(plan),a={v:Math.max(2,require('../src/core/project-core.js').formatVersion([work])),planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[]};
const b=JSON.parse(JSON.stringify(a));b.work[plan.id].furniture[0].cx+=111;
const api=Files.create(repo,{now:()=>time}),first=api.write(a,null),source=api.info().file,original=fs.readFileSync(source,'utf8');
assert.equal(api.backups().length,0);
// A caller must not mutate the cached validated snapshot. External replacement
// must be checked by bytes even when file length and modification time match.
const detached=api.read();detached.workspace.work[plan.id].furniture[0].w=-1;assert.ok(api.read().workspace.work[plan.id].furniture[0].w>0);
const originalStat=fs.statSync(source),wrong=original.replace('furnish-workspace','x'.repeat('furnish-workspace'.length));assert.equal(wrong.length,original.length);fs.writeFileSync(source,wrong);fs.utimesSync(source,originalStat.atime,originalStat.mtime);assert.throws(()=>api.read());fs.writeFileSync(source,original);
const second=api.write(b,first.revision),entries=api.backups();assert.equal(entries.length,1);assert.equal(api.getBackup(entries[0].id).raw,original);
assert.deepEqual(api.write(b,second.revision),second);assert.equal(api.backups().length,1);
assert.throws(()=>api.write(a,first.revision),e=>e.status===409);assert.equal(api.backups().length,1);
api.recover(a);const destination=path.join(run,'用户 项目 # 1601');api.setLocation(destination,second.revision);
assert.equal(fs.readFileSync(source,'utf8'),C.text(b));assert.equal(api.read().revision,second.revision);assert.equal(api.recoveries().length,1);assert.equal(api.backups().length,2);
assert.equal(Files.create(repo).info().directory,destination);assert.equal(Files.create(repo).read().revision,second.revision);
const stale=Files.create(repo),third=path.join(run,'third');api.setLocation(third,second.revision);assert.throws(()=>stale.write(a,second.revision),e=>e.status===409);assert.equal(api.recoveries().length,1);assert.ok(api.backups().length>=2);
const occupied=path.join(run,'occupied');fs.mkdirSync(occupied);fs.writeFileSync(path.join(occupied,'workspace.furnish.json'),original);
assert.throws(()=>api.setLocation(occupied,second.revision),e=>e.status===409);assert.equal(fs.readFileSync(path.join(occupied,'workspace.furnish.json'),'utf8'),original);assert.equal(api.info().directory,third);
assert.throws(()=>api.setLocation('relative',second.revision));assert.throws(()=>api.getBackup('../workspace.furnish.json'));
const restored=api.restore(entries[0].id,second.revision);assert.equal(restored.revision,first.revision);assert.ok(api.backups().some(e=>api.getBackup(e.id).raw===C.text(b)));
// A failed backup must leave primary bytes and the acknowledged revision intact.
const backupDir=path.join(third,'backups'),savedBackupDir=path.join(third,'backups-preserved');fs.renameSync(backupDir,savedBackupDir);fs.writeFileSync(backupDir,'blocked');
assert.throws(()=>api.write(b,first.revision));assert.equal(fs.readFileSync(api.info().file,'utf8'),original);fs.unlinkSync(backupDir);fs.renameSync(savedBackupDir,backupDir);
// Interrupted temp files are never treated as a project or a history version.
fs.writeFileSync(path.join(third,'.workspace-interrupted.tmp'),'partial');assert.equal(api.read().revision,first.revision);
// Corruption stops ordinary writes; explicit restore preserves every corrupt byte.
const file=api.info().file;fs.writeFileSync(file,'broken JSON\n');assert.throws(()=>api.read());assert.throws(()=>api.write(b,first.revision));
const damaged=api.info().damagedRevision;assert.ok(damaged.startsWith('damaged:'));assert.throws(()=>api.restore(entries[0].id,'damaged:wrong'),e=>e.status===409);
api.restore(entries[0].id,damaged);assert.equal(api.read().revision,first.revision);assert.equal(fs.readFileSync(path.join(third,'damaged',Files.digest('broken JSON\n')+'.json'),'utf8'),'broken JSON\n');
// Recent versions plus daily checkpoints, without pruning recoveries or unknown files.
fs.writeFileSync(path.join(third,'backups','user-file.txt'),'keep');let revision=first.revision;
for(let day=0;day<35;day++){time+=86400000;const edited=JSON.parse(JSON.stringify(a));edited.work[plan.id].furniture[0].cx+=day+1;revision=api.write(edited,revision).revision;}
for(let i=0;i<60;i++){time+=1000;const edited=JSON.parse(JSON.stringify(a));edited.work[plan.id].furniture[0].cx+=100+i;revision=api.write(edited,revision).revision;}
const kept=api.backups();assert.ok(kept.length>=78&&kept.length<=80,kept.length);assert.equal(new Set(kept.map(e=>new Date(e.savedAt).toISOString().slice(0,10))).size,30);assert.equal(api.recoveries().length,1);assert.equal(fs.readFileSync(path.join(third,'backups','user-file.txt'),'utf8'),'keep');
// Only the known test root is removed.
assert.ok(run.startsWith(root+path.sep));fs.rmSync(run,{recursive:true,force:true});
console.log('PASS local archive migration, exact-byte backups, conflict/backup-failure protection, restart, damaged-file restore, history retention and preserved source/recoveries');
