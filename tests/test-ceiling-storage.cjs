'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),C=require('../src/core/ceiling-core.js'),P=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),Server=require('../scripts/repository-server.cjs'),Client=require('../src/io/repository-storage.js');
(async()=>{
 for(const version of [5,6,7,8]){
 const payload=P.unpack(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/ceilings.furnish.json'),'utf8'))),plan=P.previewPlan(payload,[]),room=plan.rooms[0],cove={id:'test_cove',kind:'profile',name:'低灯槽',roomId:room.id,height:2800,path:C.boundaryPaths(room)[0],section:C.lowCove()};
 if(version>=6){const paths=C.boundaryPaths(room);cove.path=C.joinedPath(paths[0],paths[1]);}
 if(version>=7)cove.section.light.corner={mode:'arc',radius:20};
 if(version===8)cove.ends={start:{enabled:true,thickness:12,lightGap:5},end:{enabled:true,thickness:15,lightGap:3}};
 let work=C.edit(payload.current,cove);work=C.edit(work,{id:'test_flat',kind:'flat',name:'平顶',roomId:room.id,height:2600,thickness:12,polygon:room.poly});
 const workspace={v:version,planId:plan.id,work:{[plan.id]:work},designs:[{id:'saved',name:'吊顶',planId:plan.id,work}],customPlans:[work.architecture.draft],custom:[],updatedAt:100},output=path.resolve(__dirname,'../output/playwright');fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'ceiling-storage-')),api=Server.create(root),first=api.write(workspace,null);
 assert.equal(api.read().revision,first.revision);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'projects/workspace.furnish.json'),'utf8')).version,version===5?5:version===6?6:9);assert.deepEqual(api.read().workspace,R.portable(R.validate(workspace)));assert(api.recover(workspace).id);assert.deepEqual(api.recoveries()[0].workspace,workspace);
 const empty=Server.create(fs.mkdtempSync(path.join(output,'ceiling-cache-'))),client=Client.create({request:async(route,method='GET',body)=>route==='/workspace'?(method==='GET'?empty.read():empty.write(body.workspace,body.baseRevision)):empty.recover(body.workspace),fingerprint:async w=>Server.digest(R.text(w)),onChange(){}});
 const migrated=await client.initialize([workspace]);assert.equal(migrated.v,version);assert.deepEqual(empty.read().workspace.work[plan.id].ceilings,workspace.work[plan.id].ceilings);client.stop();
 }
 console.log('PASS v5/v6/v7/v8 actual repository writes, reads, named designs, recovery copies and cache migration in isolated directories');
})().catch(e=>{console.error(e);process.exitCode=1;});
