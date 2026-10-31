/* Live desktop operations. No file writes, alternate state, or alternate undo stack. */
(function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),core=FurnishMcpCore,receipts=new Map(),session=Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
 let queue=Promise.resolve();
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
  core.validate(name,args);ready(name==='copy_design'||name==='update_furniture');
  if(name==='get_current_plan')return read(args.includeDetails);
  if(name==='check_space'){const source=revisionSource(),result=space(args);return {revision:await revision(source),...result,save:saving()};}
  await assertRevision(args);
  await repositoryClient.flush();ready(true);
  await assertRevision(args);ready(true);
  if(name==='copy_design')FurnishDesignUI.createDesign(args.name);
  else{
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
  const result={applied:true,persisted:!saveError&&!repositoryClient.blocked&&repositoryClient.status.mode==='saved',...(saveError?{saveError}:{}),...(name==='copy_design'?{undoable:false}:{}),...await read()};
  toast(name==='copy_design'?'MCP 已复制当前方案':'MCP 已调整家具，可使用撤销');return result;
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
