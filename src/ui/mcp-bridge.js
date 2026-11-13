/* Live desktop operations. No file writes, alternate state, or alternate undo stack. */
(function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),core=FurnishMcpCore,receipts=new Map(),session=Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
 let queue=Promise.resolve();
 const writes=new Set(['copy_design','update_furniture','add_furniture','add_furniture_batch','configure_furniture','configure_ceilings','remove_furniture','configure_scene']);
 function catalog(){return libAll().flatMap(c=>c.items.map(it=>({catalogKey:JSON.stringify([it[0],it[1],it[7]||null,it[9]||null,it[10]||null]),category:c.cat,it})));}
 function parameters(id,f=getF(id)){if(!f)throw Error('家具不存在：'+id);const def=FurnishProducts.definition(f),fields={...Object.fromEntries(Object.entries(core.commonParameters).map(([k,rule])=>[k,{...rule,value:f[k]??null}])),...Object.fromEntries((def?.fields||[]).map(k=>[k,{...FurnishProducts.fields[k],value:f[k]??null,default:def.defaults?.[k]??null}]))};if(def?.inventoryArray&&!f.obj){fields.inventoryArray.readOnly=true;fields.arrayEdit={value:null,limits:def.inventoryArray,description:'阵列动作：新建{memberIds:[现有ID按顺序],arrayId:新ID,columns,rows,gapX,gapZ,gapY,pattern,angle}，须与原位置完全一致且不移动；已在阵列中时可编辑count/columns/rows/gapX/gapZ/gapY/pattern/angle，或{detach:true}。动作不持久化。'};}fields.replacementCatalogKey={type:'string',minLength:1,maxLength:2000,value:null,description:'使用list_catalog的catalogKey替换为单件模型，保持ID和中心；只写动作，不持久化此键'};if(FurnishCabinet.supported(f)&&!f.kitchen)fields.cabinet={value:f.cabinet??null,description:'完整 cabinet 结构替换，沿柜体核心校验'};if(FurnishCabinet.supported(f)&&!f.kitchen&&!FurnishCabinetBuilder.is(f))fields.cabinetUpgrade={type:'boolean',value:null,description:'true 显式升级支持的普通柜为组件柜，保留ID/位置/尺寸/参考价；不支持的结构拒绝。动作不持久化，不能与cabinet或替换动作混用。'};if(FurnishProducts.supports(f,'paperArray'))Object.assign(fields.paperArray,{value:FurnishProducts.paperArrayConfig(f),limits:def.paperArray,description:'完整阵列对象；单件尺寸和间距为mm。编辑自动计算w/d/h；null恢复原单层排列，保留单件尺寸。'});return {id,type:f.type,parameters:clone(fields),furniture:clone(f),semantics:'null 删除可选覆盖；嵌套对象整体替换。使用 update_furniture 调整位置和机身尺寸。'};}
 function visualReady(){ready();if(typeof drag!=='undefined'&&drag||ui.mA||!$('#dlg').hidden||globalThis.FurnishCatalog?.active()||globalThis.FurnishWorkflowTools?.styleId())throw Error('请先结束拖动、绘制、模态编辑或临时预览');}
 async function camera(){const r=$('#stage').getBoundingClientRect();return {view:is3D()?'3d':'2d',camera:is3D()?await window.View3D.automationCamera():null,planView:clone(view),viewport:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}};}
 function applyWork(work){FurnishProject.validateWork(work);const preview=clone(work);normalizeFurnitureEdit(preview,state);FurnishLayers.assertEditable(state,preview);FurnishProject.validateWork(preview);FurnishProject.validatePlanWork(PLAN,preview);mutate(()=>{state.furniture=work.furniture;if(work.objectLayers)state.objectLayers=work.objectLayers;else delete state.objectLayers;});}
 function ceilings(){
  const plan=FurnishProject.effectivePlan(PLAN,state),data=clone(state.ceilings||{version:1,items:[]});
  return {ceilings:data,measurements:(data.regions||[]).map(r=>({id:r.id,...FurnishCeiling.heightMeasurements(plan,r.polygon,FurnishCeiling.regionItems(r).map(c=>c.kind==='flat'?c.height:c.height-Math.max(...FurnishCeiling.sectionPoints(c.section).map(v=>v.d))))})),sectionPresets:{plain:FurnishCeiling.sectionPreset('plain'),up:FurnishCeiling.sectionPreset('upMount')},heightSemantics:'region.height及构件标高为模型绝对mm；measurements为完成面派生读数，不直接回写height'};
 }
 function applyCeilings(args){
  let next=clone(state);const regions=args.regions||[],removed=args.removeIds||[];
  for(const id of [...regions.map(r=>r.id),...removed]){const before=state.ceilings?.regions?.find(r=>r.id===id),after=regions.find(r=>r.id===id),parts=(state.ceilings?.items||[]).filter(c=>c.regionId===id);if(before&&after&&FurnishCeiling.sameValue(before,after))continue;if(parts.some(c=>FurnishLayers.locked(state,'ceiling:'+c.id))||!parts.length&&FurnishLayers.list(state).some(l=>l.id==='0'&&l.locked))throw Error('吊顶区域或默认图层已锁定：'+id);}
  for(const id of removed)next=FurnishCeiling.removeRegion(next,id);
  for(const region of regions)next=FurnishCeiling.setRegion(next,region);
  const remaining=new Set((next.ceilings?.items||[]).map(c=>'ceiling:'+c.id));
  if(next.objectLayers)for(const c of state.ceilings?.items||[])if(!remaining.has('ceiling:'+c.id))delete next.objectLayers.assignments['ceiling:'+c.id];
  FurnishLayers.assertEditable(state,next);FurnishProject.validateWork(next);FurnishProject.validatePlanWork(PLAN,next);
  mutate(()=>{if(next.ceilings)state.ceilings=next.ceilings;else delete state.ceilings;if(next.objectLayers)state.objectLayers=next.objectLayers;});
 }
 function ready(writing=false){
  if(repositoryBooting||storageWiping)throw Error('Furnish 尚未就绪');
  if(writing&&(typeof drag!=='undefined'&&drag||ui.mA||!$('#dlg').hidden))throw Error('请先完成当前拖动、绘制或编辑窗口');
  if(writing&&(!repositoryClient?.flush||repositoryClient.blocked||['error','conflict','loading'].includes(repositoryClient.status.mode)))throw Error('正式文件保存尚未就绪或存在冲突，请先处理保存状态');
 }
 const revisionSource=()=>JSON.stringify([session,store.updatedAt||null,PLAN.id,store.activeDesigns?.[PLAN.id]||null,state,store.designs.map(d=>[d.id,d.name,d.ts])]);
 async function revision(source=revisionSource()){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),v=>v.toString(16).padStart(2,'0')).join('');}
 async function assertRevision(args){const source=revisionSource();if(args.planId!==PLAN.id||args.revision!==await revision(source)||source!==revisionSource())throw Error('当前方案已变化，请重新读取 revision');}
 function saving(){return {mode:repositoryClient?.status.mode||'cache',message:repositoryClient?.status.message||'',pending:!!repositoryClient?.pending};}
 async function read(includeDetails=false){
  ready();const p=FurnishProject.effectivePlan(PLAN,state),active=FurnishDesign.activeDesign(store,PLAN.id);
  const source=revisionSource(),result={plan:{id:PLAN.id,name:PLAN.name,bounds:clone(p.bounds),rooms:clone(p.rooms||[]),walls:clone(p.walls||[]),doors:clone(p.doors||[]),windows:clone(p.wins||[])},coordinates:{unit:'mm',position:'cx/cy 为户型模型坐标中的家具中心',dimensions:'w/d 为局部宽深；h 为机身高度，缺失高度保持未知；旋转与镜像按现有模型解释',rotationUnit:'degree'},activeDesign:active?{id:active.id,name:active.name}:null,designs:store.designs.filter(d=>d.planId===PLAN.id&&d.editable).map(d=>({id:d.id,name:d.name})),furniture:clone(state.furniture),save:saving(),undo:{available:undoStack.length,redoAvailable:redoStack.length},...(includeDetails?{work:clone(state)}:{})};result.revision=await revision(source);return result;
 }
 function space(args){const passage=state.spaceThreshold||800,plan=FurnishProject.effectivePlan(PLAN,state),options={passage,...(args.focusIds?{focusIds:args.focusIds}:{}),scanPassages:true};if(args.focusIds?.some(id=>!getF(id)))throw Error('空间核对包含不存在的家具');const issues=FurnishProject.spaceCheck(plan,state.furniture,options).map(issue=>({...issue,confirmed:(state.spaceIgnored||[]).includes(FurnishProject.checkFingerprint(issue,plan,state.furniture,passage))}));return {passage,issues:clone(issues),count:issues.length,pending:issues.filter(i=>i.pending).length,limit:'按现有空间算法输出；未知信息不代表通过，未自动确认或移动家具。'};}
 async function execute(name,args){
  core.validate(name,args);ready(writes.has(name));
  if(name==='get_current_plan')return read(args.includeDetails);
  if(name==='get_ceilings'){const source=revisionSource();return {revision:await revision(source),...ceilings()};}
  if(name==='list_catalog')return {items:catalog().filter(c=>!args.query||[...c.it,c.category].join(' ').toLowerCase().includes(args.query.toLowerCase())).map(({it,...c})=>({...c,type:it[0],name:it[1],w:it[2],d:it[3],h:FurnishCatalogData.itemHeight(it)??null,kind:FurnishProducts.kind(it[0]),assembly:FurnishKitchen.isLaundryAreaItem(it)}))};
  if(name==='get_furniture_parameters'){const source=revisionSource(),result=parameters(args.id);return {revision:await revision(source),...result};}
  if(name==='get_camera')return {revision:await revision(),...await camera()};
  if(name==='take_screenshot'){visualReady();if(is3D())await window.View3D.automationReady();const source=revisionSource();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(source!==revisionSource())throw Error('截图期间方案变化，请重试');return {revision:await revision(source),...await camera(),save:saving(),screenshotTarget:args.target||'viewport'};}
  if(name==='check_space'){const source=revisionSource(),result=space(args);return {revision:await revision(source),...result,save:saving()};}
  await assertRevision(args);
  if(name==='set_camera'){visualReady();if(args.focusIds?.some(id=>!getF(id)))throw Error('取景家具不存在');if(args.roomId&&!ROOMS.some(r=>r.id===args.roomId))throw Error('取景房间不存在');await setView(args.view);await assertRevision(args);if((is3D()?'3d':'2d')!==args.view)throw Error('视图切换失败');if(is3D())await window.View3D.automationCamera(args);return {viewChanged:true,undoable:false,revision:await revision(),...await camera()};}
  await repositoryClient.flush();ready(true);
  await assertRevision(args);ready(true);
  let addedIds;
  if(['add_furniture','add_furniture_batch'].includes(name)&&FurnishLayers.list(state).some(l=>l.id==='0'&&l.locked))throw Error('默认图层已锁定，请先解锁');
  if(name==='copy_design')FurnishDesignUI.createDesign(args.name);
  else if(name==='configure_ceilings')applyCeilings(args);
  else if(name==='configure_scene'){
   const scene3d=FurnishDesign.sceneSettings({...FurnishDesign.sceneSettings(state.scene3d),...args.settings});FurnishProject.validateWork({...state,scene3d});mutate(()=>{state.scene3d=scene3d;});
  }else if(name==='remove_furniture'){
   for(const id of args.ids){const f=getF(id);if(!f)throw Error('家具不存在：'+id);if(furnitureLocked(f))throw Error('家具或所在图层已锁定：'+id);}
   const ids=new Set(args.ids),work=clone(state);work.furniture=work.furniture.filter(f=>!ids.has(f.id));if(work.objectLayers)for(const id of ids)delete work.objectLayers.assignments['furniture:'+id];applyWork(work);ui.sel=null;
  }
  else if(name==='add_furniture_batch'){
   const work=clone(state),entries=catalog();addedIds=[];
   for(const item of args.items){const entry=entries.find(c=>c.catalogKey===item.catalogKey);if(!entry||FurnishKitchen.isLaundryAreaItem(entry.it))throw Error('批量新增须使用有效的单件家具库条目');const created=createCatalogFurniture(entry.it,item.cx,item.cy);if(created.length!==1)throw Error('批量新增不支持关联组合');let f=created[0];const sizes=Object.fromEntries(['w','d','h'].filter(k=>Object.hasOwn(item,k)).map(k=>[k,item[k]]));if(Object.keys(sizes).length)f=FurnishDesign.resizeFurniture(f,sizes);if(item.rot!==undefined)f.rot=((item.rot%360)+360)%360;
    for(const [key,value]of Object.entries(item.parameters||{})){if(Object.hasOwn(core.commonParameters,key)){if(value===null)throw Error('批量新建通用参数须显式填写');core.validateCommonParameter(key,value);}else{if(!FurnishProducts.supports(f,key)||['inventoryArray','paperArray'].includes(key))throw Error('批量新增不支持此参数或结构动作：'+key);if(value!==null)FurnishProducts.validateField(f,key,value);}if(value===null)delete f[key];else f[key]=clone(value);}
    FurnishProducts.validate(f);work.furniture.push(f);addedIds.push(f.id);
   }applyWork(work);
  }else if(name==='add_furniture'){
   const entry=catalog().find(c=>c.catalogKey===args.catalogKey);if(!entry)throw Error('家具库条目已变化或不存在，请重新查询');
   const items=createCatalogFurniture(entry.it,args.cx,args.cy),work=clone(state);work.furniture.push(...items);applyWork(work);addedIds=items.map(f=>f.id);
  }else if(name==='configure_furniture'){
   let work=clone(state);
   for(const update of args.updates){let f=work.furniture.find(f=>f.id===update.id);if(!f)throw Error('家具不存在：'+update.id);if(furnitureLocked(getF(f.id)))throw Error('家具或所在图层已锁定：'+f.id);if(Object.hasOwn(update.parameters,'replacementCatalogKey')){const entry=catalog().find(c=>c.catalogKey===update.parameters.replacementCatalogKey);if(!entry||FurnishKitchen.isLaundryAreaItem(entry.it))throw Error('替换须使用有效的单件家具库条目');if(f.kitchen?.laundry||f.laundryHostId)throw Error('关联洗衣组合须通过原组合编辑器替换');const items=createCatalogFurniture(entry.it,f.cx,f.cy);if(items.length!==1)throw Error('组合模型不支持单件替换');const candidate={...items[0]};if(entry.it[7])candidate.id=entry.it[7];else delete candidate.id;const index=work.furniture.indexOf(f);f=FurnishDesign.replaceFurniture(f,candidate,{anchor:'center'});work.furniture[index]=f;}const allowed=parameters(f.id,f).parameters;if(Object.hasOwn(update.parameters,'cabinetUpgrade')){if(!allowed.cabinetUpgrade||update.parameters.cabinetUpgrade!==true||['cabinet','replacementCatalogKey'].some(k=>Object.hasOwn(update.parameters,k)))throw Error('柜体升级须为true，且不能与结构替换混用');const index=work.furniture.indexOf(f);f=FurnishCabinetBuilder.upgrade(f,{referencePrice:priceOf(f)});work.furniture[index]=f;}for(const [key,value]of Object.entries(update.parameters)){if(['replacementCatalogKey','cabinetUpgrade'].includes(key))continue;if(key==='arrayEdit'){if(!Object.hasOwn(allowed,key))throw Error('此物品不支持物品阵列');work=FurnishDesign.applyInventoryArray(work,f.id,value,uid);f=work.furniture.find(item=>item.id===f.id);continue;}if(key==='inventoryArray')throw Error('阵列参数请通过arrayEdit操作');if(!Object.hasOwn(allowed,key))throw Error('不支持的产品参数：'+key);if(Object.hasOwn(core.commonParameters,key)&&value!==null)core.validateCommonParameter(key,value);if(value===null&&['name','color'].includes(key))throw Error('名称与颜色须显式填写');if(key==='paperArray'&&value===null){const next=FurnishProducts.clearPaperArray(f);delete f.paperArray;Object.assign(f,next);}else if(key==='paperArray'&&value!==null){FurnishProducts.validateField(f,key,value);Object.assign(f,FurnishProducts.editPaperArray(f,clone(value)));}else if(value===null)delete f[key];else f[key]=clone(value);}}
   applyWork(work);
  }else{
   const candidates=args.updates.map(update=>{
    const f=getF(update.id);if(!f)throw Error('家具不存在：'+update.id);if(furnitureLocked(f))throw Error('家具或所在图层已锁定：'+update.id);
    const sizes=Object.fromEntries(['w','d','h'].filter(k=>Object.hasOwn(update,k)).map(k=>[k,update[k]]));
    const next=Object.keys(sizes).length?FurnishDesign.resizeFurniture(f,sizes):clone(f);
    for(const k of ['cx','cy','rot'])if(Object.hasOwn(update,k))next[k]=k==='rot'?((update[k]%360)+360)%360:update[k];
    FurnishProducts.validate(next);return next;
   });
   const preview=clone(state);for(const next of candidates)Object.assign(preview.furniture.find(f=>f.id===next.id),next);normalizeFurnitureEdit(preview,state);FurnishLayers.assertEditable(state,preview);FurnishProject.validateWork(preview);FurnishProject.validatePlanWork(PLAN,preview);
   mutate(()=>{for(const next of candidates)Object.assign(getF(next.id),next);});
  }
  let saveError=null;try{await repositoryClient.flush();}catch(e){saveError=e.message;}
  const result={applied:true,persisted:!saveError&&!repositoryClient.blocked&&repositoryClient.status.mode==='saved',...(saveError?{saveError}:{}),...(addedIds?{addedIds}:{}),...(name==='copy_design'?{undoable:false}:{}),...await read()};
  toast(name==='copy_design'?'MCP 已复制当前方案':'MCP 已应用调整，可使用撤销');return result;
 }
 window.FurnishMcp=Object.freeze({execute(name,args={}){
  try{core.validate(name,args);}catch(e){return Promise.reject(e);}
  const key=args.requestId,signature=JSON.stringify([name,args]);
  if(key&&receipts.has(key)){const old=receipts.get(key);return old.signature===signature?old.promise:Promise.reject(Error('requestId 已用于不同请求'));}
  const promise=queue.catch(()=>{}).then(()=>execute(name,args));queue=promise;
  if(key){receipts.set(key,{signature,promise});if(receipts.size>200)receipts.delete(receipts.keys().next().value);}
  return promise;
 }});
})();
