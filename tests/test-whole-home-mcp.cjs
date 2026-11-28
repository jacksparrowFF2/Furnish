'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{_electron,chromium}=require('playwright');
const A=require('../scripts/lib/test-artifacts.cjs'),{callDesktop}=require('../scripts/furnish-mcp.cjs'),{runtimeFiles}=require('../scripts/package-desktop.cjs'),
 P=require('../src/core/project-core.js'),root=path.resolve(__dirname,'..');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source=path.join(root,'projects/workspace.furnish.json'),sourceHash=hash(source);
async function port(){
 const server=http.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const value=server.address().port;await new Promise(resolve=>server.close(resolve));return value;
}
async function main(){
 const job=A.createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:'whole-home-mcp-'}),errors=[],results=[];
 let app,browser,success=false;
 try{
  const work=job.workspace('workspace.noindex',root,{directories:['src','assets','vendor','styles'],files:['index.html','manifest.webmanifest']});
  for(const name of runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace.noindex/scripts',name));
  const staged=path.join(work,'.local/mcp-imports');fs.mkdirSync(staged,{recursive:true});
  const fileName='验收户型.dxf',surveyFileName='复尺证据.json';
  fs.copyFileSync(path.join(root,'tests/fixtures/browser/1601-source.dxf'),path.join(staged,fileName));
  const {readStagedSource}=require('../scripts/mcp-artifacts.cjs');
  const link=path.join(staged,'link.dxf');fs.symlinkSync(fileName,link);
  try{assert.throws(()=>readStagedSource(work,'link.dxf',20e6),/常规文件/);}finally{fs.unlinkSync(link);}
  const survey={
   version:1,sources:[{id:'drawing',file:fileName}],measurements:[{id:'beam-height',target:'房梁',field:'梁底标高',datum:'模型绝对标高',value:null,status:'pending',sourceId:'drawing'}],
   structureReview:{status:'verified',sourceIds:['drawing'],note:'仅用于验证隔离项目的原始结构锁定'}
  };
  fs.writeFileSync(path.join(staged,surveyFileName),JSON.stringify(survey));
  const executable=process.env.FURNISH_WHOLE_HOME_TEST_APP||require('electron'),
   env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:job.discard('profile'),FURNISH_PORT:String(await port())};
  delete env.ELECTRON_RUN_AS_NODE;delete env.FURNISH_MCP_DISABLE;
  app=await _electron.launch({executablePath:executable,args:process.env.FURNISH_WHOLE_HOME_TEST_APP?[]:[path.join(root,'desktop/main.cjs')],env,timeout:60000});
  const p=await app.firstWindow();
  p.on('pageerror',e=>errors.push(e.message));await p.waitForFunction(()=>typeof repositoryBooting==='boolean'&&!repositoryBooting&&!!window.FurnishMcp);
  const call=(name,args={})=>callDesktop(work,name,args);
  const write=(state,requestId)=>({planId:state.plan.id,revision:state.revision,requestId});
  const read=()=>call('get_current_plan',{includeDetails:true}),initial=await read();
  const layers=[['房屋','partition'],['承重墙','bearing'],['窗户','window'],['房梁','beam'],['下水','service'],['燃气','service']]
   .map(([name,role])=>({name,role}));
  const input={fileName,surveyFileName,options:{mode:'outline',name:'全案工作流验收',mmPerUnit:1,layers,windowSill:900,windowHead:2400,closeDoorGaps:true}};
  const preflight=await call('inspect_project_source',{fileName});assert.equal(preflight.converted,false);assert(preflight.diagnostics.layers.length);
  const preview=await call('inspect_project_source',input);
  assert(preview.converted&&preview.summary.rooms.length===3);assert(preview.summary.pending.some(item=>item.id==='beam-height'));
  assert.equal((await read()).revision,initial.revision);
  await assert.rejects(call('import_project_source',{...write(initial,'bad-preview'),...input,previewKey:'wrong'}),/重新预检/);
  const importArgs={...write(initial,'import-real-dxf'),...input,previewKey:preview.previewKey};
  const imported=await call('import_project_source',importArgs);
  assert(imported.persisted&&imported.plan.id!==initial.plan.id);assert.equal(imported.furniture.length,0);
  assert.deepEqual((await call('import_project_source',importArgs)).plan,imported.plan);
  let current=await read();
  assert.equal(current.work.architecture.phase,'survey');assert.equal(current.work.assets[0].name,'furnish-survey-evidence.json');
  const draft=structuredClone(current.work.architecture.draft),beam=draft.beams[0];
  Object.assign(beam,{bottomHeight:2450,topHeight:2750});
  Object.assign(survey.measurements[0],{target:beam.id,value:2450,status:'verified'});
  fs.writeFileSync(path.join(staged,surveyFileName),JSON.stringify(survey));
  const confirmed=await call('configure_building',{...write(current,'confirm-structure'),draft,surveyFileName,confirmStructure:true});
  assert(confirmed.persisted&&!confirmed.undoable);assert.equal(confirmed.undo.available,0);
  const building=await call('get_building');assert.equal(building.surveyEvidence.measurements[0].value,2450);
  current=await read();assert.equal(current.work.architecture.phase,'design');
  const bearing=current.work.architecture.draft.walls.find(wall=>wall.kind==='b'),forged=structuredClone(current.work.architecture.draft);
  forged.walls.find(wall=>wall.id===bearing.id).thickness+=10;
  await assert.rejects(call('configure_building',{...write(current,'no-bearing-changes'),draft:forged}));
  results.push('实测 DXF 预检、失配拒绝、独立导入、重放、证据保存和承重锁');
  const [room,from,to]=await p.evaluate(()=>{
   const plan=FurnishProject.effectivePlan(PLAN,state),room=plan.rooms.find(room=>room.counted!==false&&room.at&&FurnishGeometry.area(room.poly)>10);
   return [room.id,{x:room.at[0]-150,y:room.at[1]},{x:room.at[0]+150,y:room.at[1]}];
  });
  const route=await call('check_route',{from,to,width:300,height:1700});
  assert.equal(route.status,'path-found');assert.equal(route.revision,current.revision);
  current=await call('copy_design',{...write(current,'layout-a'),name:'A · 全案基础'});
  const library=await call('list_catalog',{query:'沙发'}),product=library.items.find(item=>!item.assembly&&item.h&&item.w<2600);
  assert(product);
  current=await call('add_furniture',{...write(current,'place-sofa'),catalogKey:product.catalogKey,cx:from.x,cy:from.y});
  const layoutA=current.activeDesign.id;
  current=await call('copy_design',{...write(current,'layout-b'),name:'B · 宽松动线'});
  current=await call('update_furniture',{...write(current,'move-sofa'),updates:[{id:current.furniture[0].id,cy:from.y+1000}]});
  const comparison=await call('compare_designs',{designIds:[layoutA,current.activeDesign.id]});
  assert.equal(comparison.changed.length,1);
  const wardrobe=(await call('list_catalog',{query:'衣柜'})).items.find(item=>item.type==='wardrobe'&&!item.assembly);
  assert(wardrobe);
  current=await call('add_furniture',{...write(current,'place-cabinet'),catalogKey:wardrobe.catalogKey,cx:from.x+900,cy:from.y+1000});
  current=await call('configure_ceilings',{...write(current,'plan-ceiling'),regions:[{
   id:'validation-ceiling',name:'验证平顶',style:'flat',height:2550,thickness:20,center:true,sections:[],
   polygon:[[from.x-150,from.y-150],[from.x+450,from.y-150],[from.x+450,from.y+450],[from.x-150,from.y+450]]
  }]});
  current=await call('configure_building',{...write(current,'plan-floor'),roomUpdates:[{id:room,name:'客餐厅',use:'living',mat:'tile800'}],floorFinishes:{version:1,areas:{
   [room]:{mode:'layers',rawZ:0,tileThickness:10,baseThickness:40,layout:{width:800,height:800,gap:2,angle:0,origin:[from.x,from.y]}}
  }}});
  await call('set_camera',{...write(current,'look-3d'),view:'3d',roomId:room});
  const materials=await call('get_material_surfaces'),floor=materials.surfaces.find(row=>row.target.kind==='floor'&&row.target.id===room);
  assert(floor);
  const beforeMaterial=current,change={
   ...write(current,'local-material'),scheme:{id:'natural',scopes:['furniture']},
   edits:[{target:floor.target,sample:{}}],
   selections:[{target:floor.target,product:{name:'测试地砖',sku:'TEST-TILE',length:800,width:800,pack:3,sourceUrl:'https://example.com/reference'}}]
  };
  const asset=floor.samples.find(item=>item.label==='米色方砖');assert(asset);change.edits[0].sample.asset=asset.asset;
  current=await call('configure_material_surfaces',change);
  assert(current.persisted);assert.equal(current.undo.available,beforeMaterial.undo.available+1);
  let selected=await call('get_material_surfaces');
  assert.equal(selected.surfaces.find(row=>row.target.id===room&&row.target.kind==='floor').current.asset,asset.asset);
  assert.equal(selected.procurement.totals[0].sku,'TEST-TILE');assert(selected.procurement.totals[0].estimate.packs>0);
  assert.equal((await call('get_procurement')).surfaceSelections.items.length,1);
  const changedAppearance=await call('configure_material_surfaces',{...write(current,'change-appearance'),edits:[{target:floor.target,sample:{color:'#e0ded9'}}]});
  assert.equal((await call('get_material_surfaces')).procurement.items[0].status,'appearance-changed');
  current=await call('history_action',{...write(changedAppearance,'undo-appearance'),action:'undo'});
  current=await call('history_action',{...write(current,'undo-material'),action:'undo'});
  assert.equal((await call('get_material_surfaces')).procurement.items.length,0);
  current=await call('history_action',{...write(current,'redo-material'),action:'redo'});
  assert.equal((await call('get_material_surfaces')).procurement.items.length,1);
  const screen=await call('take_screenshot',{target:'viewport'});fs.writeFileSync(path.join(job.dir,'design-preview.png'),Buffer.from(screen.image.data,'base64'));
  results.push('实际路径、方案复制及差异、正式表面编辑、实际规格分组和撤销重做');
  const files={};
  for(const format of ['handoff_html','plan_dxf','project']){
   const exported=await call('export_artifact',{...write(current,'export-'+format),format,...(format==='handoff_html'?{roomIds:[room]}:{})});
   const file=exported.artifact.file;assert.equal(hash(file),exported.artifact.sha256);assert.equal(exported.revision,current.revision);
   files[format]=file;
  }
  const html=fs.readFileSync(files.handoff_html,'utf8');
  for(const heading of ['拆改与定位','地面铺装','吊顶与构件标高','墙面立面','房间剖面','柜体板件尺寸','收口与交底事项','复尺与待确认'])assert(html.includes(heading));
  assert(html.includes(wardrobe.name)&&html.includes('验证平顶')&&html.includes('800 × 800'));
  const packed=P.unpack(JSON.parse(fs.readFileSync(files.project,'utf8'))),embedded=P.unpack(JSON.parse(html.split('id="furnish-project">')[1].split('</script>')[0]));
  assert.deepEqual(embedded,packed);assert(packed.current.assets.some(asset=>asset.name==='furnish-material-selections.json'));
  const packedName='往返测试.furnish.json';fs.copyFileSync(files.project,path.join(staged,packedName));
  const portable=await call('inspect_project_source',{fileName:packedName});assert.equal(portable.summary.designCount,packed.designs.length);
  const reopened=await call('import_project_source',{...write(current,'reopen-portable'),fileName:packedName,previewKey:portable.previewKey});
  assert(reopened.persisted&&reopened.plan.id!==current.plan.id);
  await p.reload();await p.waitForFunction(()=>typeof repositoryBooting==='boolean'&&!repositoryBooting&&!!window.FurnishMcp);
  const reloaded=await read();assert.equal(reloaded.plan.id,reopened.plan.id);assert.equal(reloaded.work.assets.length,2);
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const handoff=await browser.newPage({viewport:{width:1250,height:980}});
  handoff.on('pageerror',e=>errors.push(e.message));await handoff.goto(pathToFileURL(files.handoff_html).href);
  assert(await handoff.locator('svg').count()>3);await handoff.screenshot({path:path.join(job.dir,'handoff-drawings.png'),fullPage:true});
  await handoff.locator('section').filter({has:handoff.getByRole('heading',{name:'地面铺装',exact:true})}).screenshot({path:path.join(job.dir,'handoff-floor.png')});
  const offline=await browser.newContext({offline:true,viewport:{width:1250,height:980}}),filePage=await offline.newPage();
  filePage.on('pageerror',e=>errors.push(e.message));
  await filePage.goto(pathToFileURL(path.join(work,'index.html')).href);
  await filePage.waitForFunction(()=>!repositoryBooting&&typeof FurnishRoute==='object'&&typeof FurnishHandoff==='object'&&typeof FurnishMcp==='object');
  await offline.close();
  assert.deepEqual(errors,[]);results.push('同 revision 交底、DXF、完整项目，离线 HTML 打开和导入重载');
  fs.writeFileSync(path.join(job.dir,'result.json'),JSON.stringify({passed:true,results,files},null,2));success=true;
  console.log('PASS',results.join(' / '));console.log('Evidence: '+job.dir);
 }catch(error){
  fs.writeFileSync(path.join(job.dir,'failure.json'),JSON.stringify({error:error.message,stack:error.stack,errors,results},null,2));console.error('Evidence: '+job.dir);throw error;
 }finally{
  await browser?.close().catch(()=>{});
  if(app){
   await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(window=>window.destroy())).catch(()=>{});
   await app.close().catch(()=>{});
  }
  assert.equal(hash(source),sourceHash);job.finish(success);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
