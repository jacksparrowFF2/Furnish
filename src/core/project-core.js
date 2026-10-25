/* Project workflow, portable backups, quantities and spatial checks. No network. */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),fail=m=>{throw new Error(m);},num=v=>typeof v==='number'&&Number.isFinite(v);
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
 const core=()=>root.FurnishDraft || require('./floorplan-core.js');
 const bays=()=>root.FurnishBayWindows || require('./bay-window-core.js');
 const geometry=()=>root.FurnishGeometry || require('./layout-geometry.js');
 const design=()=>root.FurnishDesign || require('./design-core.js');
 const finishes=()=>root.FurnishWallFinish || require('./wall-finish-core.js');
 const floors=()=>root.FurnishFloorFinish || require('./floor-finish-core.js');
 const wallTiles=()=>root.FurnishWallTiling || require('./wall-tiling-core.js');
 const grouts=()=>root.FurnishTileGrout || require('./tile-grout-core.js');
 const ceilings=()=>root.FurnishCeiling || require('./ceiling-core.js');
 const inside=(p,poly)=>{let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
 const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-a[1]*b[0];},0))/2/1e6;
 const perimeter=p=>p.reduce((n,a,i)=>n+Math.hypot(a[0]-p[(i+1)%p.length][0],a[1]-p[(i+1)%p.length][1]),0)/1000;
 function upgradeArchitecture(input){
  const a=clone(input);for(const key of ['draft','baseline'])if(a[key])a[key]=core().upgrade(a[key]);if(a.originalRevisions)a.originalRevisions=a.originalRevisions.map(d=>core().upgrade(d));return a;
 }
 function architecture(input){
  const a=upgradeArchitecture(input);core().build(a.draft);if(a.originalRevisions)a.originalRevisions.forEach(d=>core().build(d));
  a.phase=a.phase==='survey'?'survey':'design';
  if(a.phase==='design'){a.baseline=a.baseline||clone(a.draft);core().build(a.baseline);if(a.baseline.id!==a.draft.id)fail('Original structure identity mismatch');assertStructure(a.baseline,a.draft);}
  else delete a.baseline;
  return a;
 }
 function assertStructure(before,after){const mapped=d=>({...d,walls:d.walls.map(w=>({...w,kind:w.kind==='e'?'b':w.kind}))});core().assertBearingUnchanged(mapped(before),mapped(after));}
 function protectOriginal(current,next){
  if(current?.phase!=='design')return next;
  if(!next||next.draft.id!==current.draft.id)fail('不能用此方案覆盖已确认的原始结构，请复制为新户型重新核对');
  assertStructure(current.baseline,next.draft);
  return architecture({...next,phase:'design',baseline:clone(current.baseline)});
 }
 function changes(base,next){
  const signature=(w,d)=>JSON.stringify([w.a.map(v=>v*d.scale),w.b.map(v=>v*d.scale),w.thickness,w.kind]);
  const old=new Map(base.walls.map(w=>[w.id,w])),now=new Map(next.walls.map(w=>[w.id,w]));
  return {removed:base.walls.filter(w=>!now.has(w.id)||signature(w,base)!==signature(now.get(w.id),next)),added:next.walls.filter(w=>!old.has(w.id)||signature(w,next)!==signature(old.get(w.id),base))};
 }
 function ceilingHeight(work={}){
  const value=work.ceilingHeight===undefined?2800:work.ceilingHeight;
  if(!num(value)||value<1000||value>10000)fail('层高须为 1000–10000 mm');
  return value;
 }
 function validateBeamCeiling(work,height=ceilingHeight(work)){
  for(const draft of [work.architecture?.draft,work.architecture?.baseline])for(const beam of draft?.beams||[])if(beam.ceilingThickness!==undefined&&!core().beamVertical(beam,height))fail('层高不能低于已设置的梁厚');return height;
 }
 function roomCeilingHeight(work,room){
  const value=work.rooms?.[room.id]?.ceilingHeight??work.rooms?.[room.parentRoom]?.ceilingHeight??work.rooms?.[room.parentArea]?.ceilingHeight;
  return value===undefined?ceilingHeight(work):ceilingHeight({ceilingHeight:value});
 }
 function ceilingAt(plan,x,y){
  const rooms=(plan.rooms||[]).filter(r=>r.counted!==false&&(r.polys||[r.poly]).some(poly=>inside([x,y],poly)||poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy);return t>=0&&t<=1&&Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<.01;})));
  if(!rooms.length)return {room:null,height:(plan.rooms||[]).some(r=>r.counted!==false)?null:ceilingHeight(plan)};
  const room=rooms.reduce((a,b)=>(b.ceilingHeight??ceilingHeight(plan))<(a.ceilingHeight??ceilingHeight(plan))?b:a);
  return {room,height:room.ceilingHeight??ceilingHeight(plan)};
 }
 function quantities(plan,arch){
  const rooms=plan.rooms.filter(r=>r.counted!==false),net=rooms.reduce((n,r)=>n+area(r.poly),0),wall=(plan.physicalRooms||rooms).filter(r=>r.counted!==false).reduce((n,r)=>n+(r.rings||[r.poly]).reduce((sum,ring)=>sum+perimeter(ring),0)*ceilingHeight(plan)/1000,0);
  // Opening widths multiplied by their actual assumed vertical height, not plan-view wall depth.
  const deduction=(o,height)=>{const r=o.rect,width=r[2]-r[0],depth=r[3]-r[1],horizontal=width>=depth,center=[(r[0]+r[2])/2,(r[1]+r[3])/2],normal=horizontal?1:0,offset=Math.min(width,depth)/2+5;let faces=0;for(const side of [-1,1]){const p=[...center];p[normal]+=side*offset;if(rooms.some(room=>inside(p,room.poly)))faces++;}return Math.max(width,depth)/1000*height*Math.max(1,faces);};
  const holes=(plan.doors||[]).reduce((n,o)=>n+deduction(o,2.1),0)+(plan.wins||[]).reduce((n,o)=>n+(o.bayId&&(o.frameLine||o.bayType==='recessed')?(o.paintRect?deduction({...o,rect:o.paintRect},o.head-o.sill):0):deduction(o,o.head-o.sill)),0)+(plan.slides||[]).reduce((n,o)=>n+deduction(o,o.v?2.4:2.1),0);
  let removed=0,added=0;
  if(arch?.baseline){const c=changes(arch.baseline,arch.draft);const len=(w,d)=>Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*d.scale/1000;removed=c.removed.reduce((n,w)=>n+len(w,arch.baseline),0);added=c.added.reduce((n,w)=>n+len(w,arch.draft),0);}
  return {net,wall,paint:Math.max(0,wall-holes),removed,added,rooms:rooms.length};
 }
 // One set of rates feeds the current budget, comparisons and exports.
 function pricing(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('预算参数格式无效');
  const result={floorWaste:input.floorWaste??5,paintWaste:input.paintWaste??10,paintPrice:input.paintPrice??28,materials:{...input.materials}};
  if(!num(result.floorWaste)||result.floorWaste<0||result.floorWaste>100||!num(result.paintWaste)||result.paintWaste<0||result.paintWaste>100)fail('损耗率须为 0–100%');
  if(!num(result.paintPrice)||result.paintPrice<0||result.paintPrice>1e7)fail('乳胶漆单价无效');
  if(input.materials!==undefined&&(!input.materials||typeof input.materials!=='object'||Array.isArray(input.materials)))fail('材料单价格式无效');
  if(Object.keys(result.materials).length>100||Object.entries(result.materials).some(([id,v])=>!id||id.length>80||!num(v)||v<0||v>1e7))fail('地面材料单价无效');
  if(input.materialSpecs!==undefined){
   if(!input.materialSpecs||typeof input.materialSpecs!=='object'||Array.isArray(input.materialSpecs)||Object.keys(input.materialSpecs).length>100)fail('材料采购规格无效');
   result.materialSpecs=Object.fromEntries(Object.entries(input.materialSpecs).map(([id,s])=>{
    if(!id||id.length>80||!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['length','width','pack','waste','unit'].includes(k))||![s.length,s.width].every(v=>num(v)&&v>=10&&v<=20000)||s.pack!==undefined&&(!Number.isInteger(s.pack)||s.pack<1||s.pack>10000)||s.waste!==undefined&&(!num(s.waste)||s.waste<0||s.waste>100)||s.unit!==undefined&&!['m2','piece','pack'].includes(s.unit)||s.unit==='pack'&&s.pack===undefined)fail('材料长宽须为 10–20000 mm，每箱片数须为整数，按箱计价需填写每箱片数');
    if(s.unit&&s.unit!=='m2'&&!Object.hasOwn(result.materials,id))fail('按片／箱计价须录入对应单价');
    return [id,{...s}];
   }));
  }
  return result;
 }
 function materialQuantity(area,settings,id){
  const spec=settings.materialSpecs?.[id],waste=spec?.waste??settings.floorWaste,required=area*(1+waste/100);
  if(!spec)return {quantity:required,required,waste,unit:'m2',purchased:required};
  const pieceArea=spec.length*spec.width/1e6,pieces=Math.ceil(required/pieceArea-1e-9),packs=spec.pack?Math.ceil(pieces/spec.pack):null,purchased=(packs===null?pieces:packs*spec.pack)*pieceArea,unit=spec.unit||'m2';
  return {quantity:unit==='piece'?(packs===null?pieces:packs*spec.pack):unit==='pack'?packs:purchased,required,waste,pieces,packs,purchased,pieceArea,unit,spec};
 }
 function materialBreakdown(plan,work,materials,priceOf){
  return estimate(plan,work,materials,priceOf).mats.map(m=>({...m,surplusArea:m.procurement.purchased-m.procurement.required,surplusPieces:m.procurement.packs===null||m.procurement.packs===undefined?0:m.procurement.packs*m.procurement.spec.pack-m.procurement.pieces,rooms:plan.rooms.filter(r=>(work.rooms?.[r.id]?.mat||r.mat)===m.m).map(r=>{const a=area(r.poly),required=a*(1+m.procurement.waste/100);return {id:r.id,name:work.rooms?.[r.id]?.name||r.name,area:a,required,...(m.procurement.pieceArea?{pieces:Math.ceil(required/m.procurement.pieceArea-1e-9)}:{})};})}));
 }
 const furniturePriceBasis=(f,value)=>f.price!==undefined?'confirmed':f.referencePrice!==undefined||value>0?'reference':'missing';
 function priceBasis(plan,work,materials,priceOf=f=>f.price??f.referencePrice??0){
  const stats=estimate(plan,work,materials,priceOf),items=[];
  for(const f of work.furniture){const value=priceOf(f),status=furniturePriceBasis(f,value);items.push({kind:'furniture',id:f.id,name:f.name,status,amount:value});}
  for(const r of stats.mats)items.push({kind:'material',id:r.m,name:materials[r.m].name,status:Object.hasOwn(stats.settings.materials,r.m)?'confirmed':'reference',amount:r.c});
  items.push({kind:'paint',id:'paint',name:'乳胶漆',status:work.pricing?.paintPrice!==undefined?'confirmed':'reference',amount:stats.paintCost});
  stats.extra.forEach((r,i)=>items.push({kind:'renovation',id:String(i),name:r.name,status:'confirmed',amount:r.total}));
  const totals=Object.fromEntries(['confirmed','reference','missing'].map(k=>[k,{count:items.filter(v=>v.status===k).length,amount:items.filter(v=>v.status===k).reduce((n,v)=>n+v.amount,0)}]));
  return {items,totals,complete:totals.reference.count===0&&totals.missing.count===0,total:stats.total};
 }
 function estimate(plan,work,materials,priceOf=f=>f.price??f.referencePrice??0){
  const settings=pricing(work.pricing),q=quantities({...plan,ceilingHeight:ceilingHeight(work)},work.architecture),counted=plan.rooms.filter(r=>r.counted!==false),byMat=new Map();
  for(const r of plan.rooms){const m=work.rooms?.[r.id]?.mat||r.mat;if(!materials[m])fail('地面材料不存在：'+m);byMat.set(m,(byMat.get(m)||0)+area(r.poly));}
  const mats=[...byMat].map(([m,a])=>{const procurement=materialQuantity(a,settings,m),price=settings.materials[m]??materials[m].price;if(procurement.unit!=='m2'&&!Object.hasOwn(settings.materials,m))fail('按片／箱计价须录入对应单价');return {m,a,price,quantity:procurement.quantity,c:procurement.quantity*price,procurement};});
  const floor=mats.reduce((n,r)=>n+r.c,0),paintQuantity=q.paint*(1+settings.paintWaste/100),paintCost=paintQuantity*settings.paintPrice,furniture=work.furniture.reduce((n,f)=>n+priceOf(f),0),extra=extraCosts(work.renovation||[],q);
  return {...q,settings,counted,tot:q.net,mats,floor,wallArea:q.wall,paintArea:q.paint,paintQuantity,paint:paintCost,paintCost,furniture,furn:furniture,extra:extra.items,renovation:extra.total,total:floor+paintCost+furniture+extra.total};
 }
 // Draft topology is independent of furniture positions. Keep one value-based
 // build and clone it before applying mutable opening/finish overrides.
 let effectiveDraftCache=null;
 // Read a version without inheriting the currently rendered opening overrides.
 function effectivePlan(base,work){
  let plan;
  if(work.architecture){const draft=work.architecture.draft,sourceDXF=draft.sourceDXF,key=JSON.stringify({...draft,sourceDXF:undefined});if(effectiveDraftCache?.key!==key||effectiveDraftCache.sourceDXF!==sourceDXF)effectiveDraftCache={key,sourceDXF,plan:core().build(draft)};const cached=effectiveDraftCache.plan;plan=clone({...cached,customDraft:{...cached.customDraft,sourceDXF:undefined}});if(sourceDXF!==undefined)plan.customDraft.sourceDXF=sourceDXF;}else plan=clone(base);
  plan.ceilingHeight=ceilingHeight(work);
  plan.furnitureDatum=work.furnitureDatum;plan.furniture=work.furniture;
  if(work.tileGrout)plan.tileGrout=clone(work.tileGrout);else delete plan.tileGrout;
  const kept=plan.walls.map((_,i)=>i).filter(i=>!(work.demolished||[]).includes('w'+i));
  plan.finishWallIds=kept.map(i=>'builtin_'+i);
  if(plan.wallRefs)plan.wallRefs=kept.map(i=>plan.wallRefs[i]);
  plan.walls=kept.map(i=>plan.walls[i]);
  (plan.doors||[]).forEach((d,i)=>Object.assign(d,geometry().doorOverride(d,work.open?.d?.[i])));
  (plan.slides||[]).forEach((s,i)=>Object.assign(s,{panels:s._panels0??s.panels??2,floorTrack:s._floorTrack0??s.floorTrack,stackSide:s._stackSide0??s.stackSide},work.open?.s?.[i]||{}));
  bays().applyWindows(plan,work.open?.w);
  plan.rooms=plan.rooms.map(r=>({...r,name:work.rooms?.[r.id]?.name||r.name,ceilingHeight:roomCeilingHeight(work,r)}));
  const finished=floors().derive(finishes().derive(plan,work),work),tiled=work.wallTiling?wallTiles().derive(finished,work):finished;return ceilings().derive(tiled,work);
 }
 function validatePlanWork(base,work){
  const plan=work.architecture?core().build(work.architecture.draft):base;if(!plan)fail('文件引用了不存在的户型');
  for(const id of work.demolished||[])if(Number(id.slice(1))>=plan.walls.length)fail('拆墙编号 '+id+' 不存在于此方案');
  for(const [kind,list] of [['d',plan.doors||[]],['w',plan.wins||[]],['s',plan.slides||[]]])for(const [index,value] of Object.entries(work.open?.[kind]||{})){
   if(Number(index)>=list.length)fail((kind==='d'?'门':kind==='s'?'推拉门':'窗')+'编号 '+index+' 不存在于此方案');
   if(kind==='d'){const r=list[index].rect,h=value.h,axis=r[2]-r[0]>=r[3]-r[1]?0:1;if(h[0]<r[0]-.01||h[0]>r[2]+.01||h[1]<r[1]-.01||h[1]>r[3]+.01)fail('门 '+index+' 的铰链位置超出洞口');const start=Math.abs(h[axis]-r[axis])<=.01,end=Math.abs(h[axis]-r[axis+2])<=.01;if(!start&&!end||value.c[1-axis]!==0||value.c[axis]!== (start?1:-1))fail('门 '+index+' 的铰链与关闭方向不匹配洞口');}
  }
  return work;
 }
 function previewPlan(payload,plans){const base=plans.find(p=>p.id===payload.planId);for(const [label,work] of [['当前方案',payload.current],...payload.designs.map(d=>['命名方案「'+d.name+'」',d.work])]){try{validatePlanWork(base,work);}catch(e){fail(label+'：'+e.message);}}return effectivePlan(base,payload.current);}
 // Version the confirmation contract: old planar records cannot establish
 // that heights, cavity geometry or physical-room passage scans were checked.
 function checkContext(plan,furniture,passage){
  return [passage,...(plan.furnitureDatum==='finished-floor'?['finished-floor-furniture-v1']:[]),plan.rooms.map(r=>[r.id,r.poly,r.counted,r.ceilingHeight,r.polys]),plan.walls,plan.doors,
   furniture.map(f=>[f.id,f.type,f.cx,f.cy,f.w,f.d,f.rot,f.frontClearance,f.h,f.flip,f.mountHeight,f.manifoldLoops,f.manifoldLengths,f.pipeBoxThickness,design().products().pipeBoxSignature(f),f.stackHeight,f.showerMixerHeight,f.showerRise,f.showerHandAngle,!!f.obj,(root.FurnishCabinet||require('./cabinet-core.js')).spatialConfig(f),(root.FurnishKitchen||require('./kitchen-core.js')).spatialConfig(f),f.counterLink,f.counterElevation,f.sinkInstall,f.sinkNotch,f.sinkStyle,f.sinkBowlHeight,f.laundryHostId,f.hoodPanelOpen,f.dishwasherDoorOpen,f.hoodGeometry,f.hobCutout,f.foldingTablePose,...(design().products().family(f,'tea-bar')?[f.teaBarUpperOpen,f.teaBarLowerOpen]:[])]),
   (plan.physicalRooms||plan.rooms).map(r=>[r.id,r.poly,r.counted]),ceilingHeight(plan),plan.beams||[],(plan.markers||[]).map(m=>[m.id,m.kind,m.at,core().serviceDiameter(m),m.name]),...(furniture.some(f=>design().products().planOutline(f))?['product-plan-shapes-v1']:[]),...(furniture.some(f=>design().products().definition(f)?.downlight)?['downlight-flat-cutout-v1']:[]),'cut-board-motion-v1','cabinet-inner-solids-v1',...(furniture.some(f=>f.kitchen?.laundry||f.type==='ksink'&&f.sinkBowlHeight!==undefined)?['laundry-basin-joins-v2']:[]),...(furniture.some(f=>f.cabinet?.template==='entry-pegboard'&&Object.values(f.cabinet.pegboardParts||{}).some(v=>v===false))?['pegboard-envelope-v3-accessory-height']:[]),...(furniture.some(f=>design().products().definition(f)?.manifold)?['manifold-curved-elbows-v2','manifold-rear-service-v1','manifold-finish-opening-v1']:[]),...(furniture.some(f=>design().products().definition(f)?.wallRecess)?['electrical-wall-recess-v1']:[]),'normalized-cabinet-structures-v2',...(furniture.some(f=>design().products().definition(f)?.solidModel)?['production-furniture-solids-v2']:[]),'cabinet-overlay-v2','kitchen-worktop-v15-integrated-laundry','hood-bay-v5-actual-ceiling','cabinet-door-directions-v5-leaf-widths','tucked-seat-v1','dishwasher-installation-v1',...(furniture.some(f=>design().products().dishwasherInstallation(f))?['dishwasher-overhead-envelope-v2']:[]),...(furniture.some(f=>design().products().family(f,'tea-table'))?['tea-table-accessories-v1']:[]),...(furniture.some(f=>design().products().family(f,'tea-bar'))?['tea-bar-doors-v1']:[]),plan.wins||[],...(plan.ceilings?['ceilings-v1',ceilings().signature(plan.ceilings)]:[]),...(plan.floorFinish?['floor-finish-v1',plan.floorFinish.signature]:[]),...(plan.wallFinish?['wall-finish-v1',plan.wallFinish.signature,plan.wallFinish.solids,plan.wallFinish.pending]:[])];
 }
 function checkFingerprint(issue,plan,furniture,passage){return JSON.stringify({version:3,issue,context:checkContext(plan,furniture,passage)});}
 let lastReview=null;
 function review(plan,work){
  const passage=work.spaceThreshold||800,context=JSON.stringify(checkContext(plan,work.furniture,passage)),key=context+JSON.stringify([work.spaceIgnored||[],work.furniture.map(f=>[f.name,design().products().modelError(f)]),plan.rooms.map(r=>r.name),(plan.doors||[]).map(d=>d.name),(plan.ceilings?.items||[]).map(c=>c.name)]);
  if(lastReview?.key===key)return clone(lastReview.issues);
  const issues=spaceCheck(plan,work.furniture,{passage}),accepted=new Set();
  // Compare shared geometry once per saved confirmation, not once per finding.
  if(work.spaceIgnored?.length){for(const key of work.spaceIgnored){try{const saved=JSON.parse(key);if(saved?.version===3&&JSON.stringify(saved.context)===context)accepted.add(JSON.stringify(saved.issue));}catch{ /* Legacy malformed confirmation is simply inactive. */ }}}
  const result=issues.map(v=>({...v,ignored:accepted.has(JSON.stringify(v))}));lastReview={key,issues:clone(result)};return result;
 }
 function explainIssue(issue){
  const groups={ceiling:['吊顶空间','核对真实截面、平顶板厚、发光位置和家具实体；安装与开启运动仍需结合现场核对。'],'dishwasher-opening':['洗碗机开启包络','核对完全开启所需的前伸空间和高度；当前开合状态不缩小保守包络，真实折叠连杆轨迹需人工复核。'],'dishwasher-side':['洗碗机出气预留','出气口侧面距墙／柜至少 200 mm；整侧机身保守检查，旋转镜像后随产品变化。'],'dishwasher-overhead':['洗碗机上方安装','核对台面至吊柜底 650 mm；机顶空间不足 50 mm 时，机门须比吊柜前沿向外错开大于 80 mm。'],'dishwasher-support':['台面承托与凸出','核对实际同高台面、孔洞及缺口；闭合机身需有承托，开门可能凸出台面。'],'dishwasher-spec':['洗碗机规格待核对','尺寸已缩放，原图安装标注不随模型缩放；按真实产品规格复核。'],model:['模型待修复','先修复模型数据，再核对实体与开启范围。'],outside:['房间边界','定位后核对折角与凹口，调整占地或家具尺寸。'],wall:['墙体占用','核对墙面净距；移动或缩小家具，不能移动锁定结构。'],overlap:['实体重叠','结合实际高度、嵌合位和安装方式核对；必要时调整位置或尺寸。'],door:['开门范围','核对门扇方向及完整开启范围，调整家具或合法的门扇设置。'],swingwall:['开门范围','核对门铰位置、开启方向和墙体；不要以删除结构消除提示。'],swings:['开门范围','核对两扇门同时打开的情况。'],beam:['竖向实体','核对家具底顶和梁底顶；未知高度需补录后复验。'],pipe:['管道实体','核对管径、板件切孔和实际安装；切孔不代表运动范围已通过。'],passage:['候选间隙','该结果是水平／竖向扫描的局部间隙，不是连续通行路径；结合实际动线核对。'],front:['操作预留','核对正面朝向、打开或操作所需空间。'],cabinetdoor:['柜门开启','核对生产门板扫掠与实际安装高度。'],cabinetdrawer:['抽屉开启','核对生产抽屉完全拉出范围。'],drawerfront:['操作预留','核对抽屉拉出后的地面操作空间。']};
  const [category,action]=groups[issue.kind]||['空间核对','结合实际安装与使用方式核对。'];return {category,action,status:issue.pending?'信息不足，待确认':issue.ignored?'已核对':'待处理'};
 }
 function readiness(plan,work){
  const items=[];
  if(work.architecture?.phase==='survey')items.push({kind:'structure',name:'原始结构',message:'尚未确认原始墙体与门窗',action:'structure'});
  for(const b of work.architecture?.draft.beams||[])if(!core().beamVertical(b,ceilingHeight(work))||core().beamVertical(b,ceilingHeight(work)).assumed)items.push({kind:'structure',id:b.id,name:'DXF 房梁',message:'已保留房梁投影，不参与房间分割；梁高待核对，三维按顶部贴房顶和默认梁厚示意；请在编辑户型确认',action:'structure'});
  for(const o of work.architecture?.draft.openings||[])if(o.review)items.push({kind:'structure',id:o.id,name:o.kind==='window'?'DXF 窗洞':'DXF 门洞',message:o.review==='window-height'?'二维图纸未提供高度，请核对窗台高与窗顶高并确认修改':'门洞由轮廓断口推导，请核对位置、宽度及开启方向并确认修改',action:'structure'});
  for(const r of plan.rooms)if(r.counted!==false&&design().inferUse(r,work.rooms?.[r.id])==='unassigned')items.push({kind:'room',id:r.id,name:work.rooms?.[r.id]?.name||r.name,message:'房间用途未分类',action:'room'});
  for(const f of work.furniture){
   const missing=[];if(f.h===undefined)missing.push('高度');if(!f.brand?.trim())missing.push('品牌');if(!f.model?.trim())missing.push('型号');
   if(missing.length)items.push({kind:'spec',id:f.id,name:f.name,message:'待补充：'+missing.join('、'),action:'product'});
   if(f.price===undefined)items.push({kind:'price',id:f.id,name:f.name,message:'使用参考价格，尚未录入确认单价',action:'product'});
  }
  for(const issue of review(plan,work))items.push({...issue,kind:'space',issue,action:'space'});
  const pending=items.filter(v=>!v.ignored),counts=Object.fromEntries(['structure','room','spec','price','space'].map(k=>[k,pending.filter(v=>v.kind===k).length]));
  return {items,counts,pending:pending.length,reviewed:items.length-pending.length,ready:pending.length===0};
 }
 function openingSchedule(plan,work){
  const width=o=>Math.round(Math.max(o.rect[2]-o.rect[0],o.rect[3]-o.rect[1])),rows=[],seen=new Set();
  (plan.doors||[]).forEach((d,i)=>rows.push({name:d.name||'门 '+(i+1),type:d.doorType==='double'?'对开门':'平开门',width:width(d),height:2100,sill:0,depth:null,parts:d.doorType==='double'?2:1}));
  (plan.slides||[]).forEach((d,i)=>rows.push({name:d.name||'推拉门 '+(i+1),type:d.panels===3?'三联动推拉门':'双扇推拉门',width:width(d),height:d.v?2400:2100,sill:0,depth:null,parts:d.panels===3?3:2}));
  (plan.wins||[]).forEach((w,i)=>{const group=w.bayId;if(group&&seen.has(group))return;if(group)seen.add(group);const opening=work.architecture?.draft.openings.find(o=>o.id===group),parts=group?plan.wins.filter(v=>(v.bayId)===group):[w];rows.push({name:group?'飘窗 '+seen.size:'窗 '+(i+1),type:group?(w.bayType==='recessed'?'正面窗飘窗（两侧实墙）':'三面飘窗'):w.panels===3?'三联动推拉窗':'普通窗',width:opening?.length??(group?parts.map(width).join(' / '):width(w)),height:Math.round((w.head-w.sill)*1000),sill:Math.round(w.sill*1000),depth:opening?.bay?.depth??null,parts:!group&&w.panels===3?3:parts.length});});
  return rows;
 }
 const purchaseStates={planned:'待选型',confirmed:'已确认',ordered:'已下单',received:'已到货'};
 const purchaseMoney=value=>'¥'+Math.round(Number(value)).toLocaleString('zh-CN');
 function procurement(plan,work,priceOf=f=>f.price??0){
  const groups=new Map(),totals=Object.fromEntries(Object.keys(purchaseStates).map(k=>[k,0]));
  for(const f of work.furniture){const light=design().products().downlightSpec(f),price=priceOf(f),basis=furniturePriceBasis(f,price),status=Object.hasOwn(purchaseStates,f.purchaseStatus)?f.purchaseStatus:'planned',note=f.purchaseNote||'',key=JSON.stringify([f.type,light,f.manifoldLoops??null,f.manifoldLengths??null,f.name,f.brand||'',f.model||'',f.w,f.d,f.h??null,price,basis,f.priceDate||'',f.sourceUrl||'',status,note,design().products().family(f,'pipe-box')?[design().products().value(f,'pipeBoxThickness'),design().products().pipeBoxSignature(f)]:null,f.type==='ksink'&&(design().products().vesselSink(f)||f.sinkNotch||f.sinkBowlHeight!==undefined)?[design().products().value(f,'sinkStyle'),design().products().vesselSink(f)?design().products().value(f,'sinkBowlHeight'):design().products().sinkBodyDepth(f)]:null,f.kitchen||f.cabinet?(f.kitchen?(root.FurnishKitchen||require('./kitchen-core.js')).specification(f):(design().products().modelError(f)?f.cabinet:(root.FurnishCabinet||require('./cabinet-core.js')).specification(f))):null]);
   const item=groups.get(key)||{name:f.name,brand:f.brand||'',model:(f.model||'')+(light?` · ${light.watts}W / ${light.kelvin}K / ${light.lumens} lm`:''),...(light?{downlight:light}:{}),w:f.w,d:f.d,h:f.h??null,price,basis,estimated:f.price===undefined,priceDate:f.priceDate||'',sourceUrl:f.sourceUrl||'',status,note,ids:[],rooms:[]};item.ids.push(f.id);
   const room=plan.rooms.find(r=>inside([f.cx,f.cy],r.poly)),name=room?.name||'未分配房间';if(!item.rooms.includes(name))item.rooms.push(name);groups.set(key,item);totals[status]+=price;
  }
  const items=[...groups.values()].map(v=>({...v,quantity:v.ids.length,total:v.price*v.ids.length}));
  return {items,totals,total:Object.values(totals).reduce((a,b)=>a+b,0),estimated:items.filter(v=>v.estimated).reduce((n,v)=>n+v.quantity,0),missingHeight:items.filter(v=>v.h===null).reduce((n,v)=>n+v.quantity,0)};
 }
 function updatePurchaseGroup(work,ids,values){
  const allowed=['brand','model','sourceUrl','priceDate','price','purchaseStatus','purchaseNote'];if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(k=>!allowed.includes(k)))fail('本组采购资料更新无效');
  for(const key of ['brand','model','sourceUrl','priceDate','purchaseStatus','purchaseNote'])if(Object.hasOwn(values,key)&&typeof values[key]!=='string')fail('采购资料须为文字');
  if(Object.hasOwn(values,'price')&&values.price!==null&&(!num(values.price)||values.price<0||values.price>1e7))fail('单价须为 0–10000000 元');
  const next=clone(work),selected=new Set(ids);if(next.furniture.filter(f=>selected.has(f.id)).length!==ids.length)fail('本组家具已变更，请重新打开采购清单');
  for(const f of next.furniture)if(selected.has(f.id)){Object.assign(f,values);if(values.price===null)delete f.price;}
  return validateWork(next);
 }
 function csv(rows){return '\ufeff'+rows.map(row=>row.map(value=>{let text=String(value??'');if(typeof value!=='number'&&/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
 function extraCosts(rows,q){
  if(!Array.isArray(rows)||rows.length>100)fail('最多 100 条装修费用');
  const sources={manual:null,net:q.net,paint:q.paint,removed:q.removed,added:q.added};
  const items=rows.map(r=>{if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!Object.hasOwn(sources,r.source)||!num(r.price)||r.price<0||r.price>1e7||!num(r.quantity)||r.quantity<0||r.quantity>1e7||typeof r.unit!=='string'||r.unit.length>12)fail('装修费用数据无效');const quantity=r.source==='manual'?r.quantity:sources[r.source];return {...r,quantity,total:quantity*r.price};});
  return {items,total:items.reduce((n,r)=>n+r.total,0)};
 }
 function remapRooms(oldRooms,newRooms,settings){
  const G=root.FurnishZoneGeometry||require('./zone-geometry.js'),overlap=(A,B)=>G.area(G.decompose([A,B],p=>G.inside(p,A)&&G.inside(p,B)));
  const used=new Map();const mapped=Object.fromEntries(newRooms.map(r=>{if(r.bayId&&r.counted===false){const old=oldRooms.find(o=>o.bayId===r.bayId&&o.counted===false);return [r.id,old&&settings[old.id]?clone(settings[old.id]):{name:r.name,mat:r.mat,use:'bay'}];}if(settings[r.id]&&oldRooms.some(o=>o.parentArea===r.id))return [r.id,clone(settings[r.id])];if(r.zone){const existing=oldRooms.find(o=>o.id===r.id);if(existing&&settings[r.id])return [r.id,clone(settings[r.id])];if(r.settingSource&&settings[r.settingSource])return [r.id,clone(settings[r.settingSource])];const source=oldRooms.map(o=>({o,a:overlap(o.poly,r.poly)})).sort((a,b)=>b.a-a.a)[0];return [r.id,{name:r.name,use:r.use,mat:(r.materialExplicit?r.mat:null)||(source?.a>0?settings[source.o.id]?.mat:null)||settings[r.parentRoom]?.mat||r.mat}];}const candidates=oldRooms.map(o=>({o,a:overlap(o.poly,r.poly)})).sort((a,b)=>b.a-a.a),match=candidates[0];if(!match||match.a<=0)return [r.id,{name:r.name,mat:r.mat,use:design().inferUse(r)}];const old=match.o,setting=clone(settings[old.id]||{name:old.name,mat:old.mat});setting.use=design().inferUse(r,setting);const count=used.get(old.id)||0;used.set(old.id,count+1);if(count)setting.name+=' · 分区 '+(count+1);return [r.id,setting];}));for(const r of newRooms)if(r.parentArea&&settings[r.parentArea]&&!mapped[r.parentArea])mapped[r.parentArea]=clone(settings[r.parentArea]);return mapped;
 }
 function remapOpenings(before,after,settings,{windowId}={}){const out={d:{},w:{},s:{}};
  (after.doorRefs||[]).forEach((id,index)=>{const previous=(before.doorRefs||[]).indexOf(id),value=settings.d?.[previous];if(previous<0||!value)return;const old=before.doors[previous].rect,next=after.doors[index].rect,h=value.h.map((v,axis)=>Math.abs(v-old[axis])<=Math.abs(v-old[axis+2])?next[axis]:next[axis+2]);out.d[index]={...clone(value),h};});
  (after.slideRefs||[]).forEach((id,index)=>{const previous=(before.slideRefs||[]).indexOf(id);if(previous>=0&&settings.s?.[previous])out.s[index]=clone(settings.s[previous]);});
  (after.winRefs||[]).forEach((id,index)=>{
   let previous=(before.winRefs||[]).indexOf(id);
   if(previous<0&&windowId&&(id===windowId||id===windowId+':front'))previous=(before.winRefs||[]).indexOf(id===windowId?windowId+':front':windowId);
   const value=settings.w?.[previous];if(previous<0||value===undefined)return;
   const old=before.wins?.[previous],next=after.wins?.[index],edited=next&&windowId&&(id===windowId||id.startsWith(windowId+':')),heightChanged=old&&next&&((old._sill0??old.sill)!==next.sill||(old._head0??old.head??2.4)!==(next.head??2.4));
   // Dimension edits replace geometry heights while retaining each face's style.
   if(edited||heightChanged){
    if(typeof value!=='object'||value===null||value.panels===undefined&&value.stackSide===undefined)return;
    out.w[index]={sill:next.sill,head:next.head??2.4,...(value.panels!==undefined?{panels:value.panels}:{}),...(value.stackSide!==undefined?{stackSide:value.stackSide}:{})};
   }else out.w[index]=clone(value);
  });return out;
 }
 function polygon(f){const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[f.cx+x*c-y*s,f.cy+x*s+y*c]);}
 function fitsInRooms(rooms,footprint){
  if(rooms.some(r=>r.polys)){
   const G=root.FurnishZoneGeometry||require('./zone-geometry.js'),polys=rooms.flatMap(r=>r.polys||[r.poly]);
   return G.area(G.decompose([footprint,...polys],p=>G.inside(p,footprint)&&!polys.some(poly=>G.inside(p,poly))))<=1;
  }
  // Room boundaries are orthogonal. Every grid cell has a uniform room membership;
  // clipping the rotated footprint to those cells also catches concave notches.
  const xs=footprint.map(p=>p[0]),ys=footprint.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const cuts=(axis,lo,hi)=>[...new Set([lo,hi,...rooms.flatMap(r=>r.poly.map(p=>p[axis])).filter(v=>v>lo&&v<hi)])].sort((a,b)=>a-b),xx=cuts(0,x0,x1),yy=cuts(1,y0,y1);
  const clip=(poly,axis,edge,sign)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=sign*(a[axis]-edge)>=0,bi=sign*(b[axis]-edge)>=0;if(ai)out.push(a);if(ai!==bi){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;};
  let outside=0;for(let i=0;i<xx.length-1;i++)for(let j=0;j<yy.length-1;j++){if(rooms.some(r=>inside([(xx[i]+xx[i+1])/2,(yy[j]+yy[j+1])/2],r.poly)))continue;let piece=footprint;for(const [axis,edge,sign] of [[0,xx[i],1],[0,xx[i+1],-1],[1,yy[j],1],[1,yy[j+1],-1]])piece=clip(piece,axis,edge,sign);if(piece.length>2)outside+=area(piece)*1e6;if(outside>1)return false;}return true;
 }
 const rect=r=>[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];
 function intersects(A,B){for(const axis of [0,1])if(Math.max(...A.map(p=>p[axis]))<=Math.min(...B.map(p=>p[axis]))||Math.max(...B.map(p=>p[axis]))<=Math.min(...A.map(p=>p[axis])))return false;for(const P of [A,B])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],nx=b[1]-a[1],ny=a[0]-b[0],l=Math.hypot(nx,ny);if(!l)continue;const pa=A.map(p=>(p[0]*nx+p[1]*ny)/l),pb=B.map(p=>(p[0]*nx+p[1]*ny)/l);if(Math.max(...pa)<=Math.min(...pb)+5||Math.max(...pb)<=Math.min(...pa)+5)return false;}return true;}
 // Source-backed installation reservations, separate from body collision and
 // independent of the door's current display pose. No state is mutated here.
 function dishwasherChecks(plan,f,{furniture=plan.furniture||[],rigidBodies}={}){
  plan=finishes().spatial(plan);
  const products=design().products(),raw=products.dishwasherInstallation(f);if(!raw)return null;const base=products.floorBase(plan,f,furniture),spec={...raw};for(const key of ['bottom','top','openingBottom','openingTop'])spec[key]+=base.z;
  const G=root.FurnishGeometry||require('./layout-geometry.js'),K=root.FurnishKitchen||require('./kitchen-core.js'),Z=root.FurnishZoneGeometry||require('./zone-geometry.js'),S=root.FurnishServices||require('./service-core.js');
  const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sign=f.flip?-1:1,EPS=1e-6;
  const local=([x,y])=>[(x-f.cx)*c*sign+(y-f.cy)*s*sign,-(x-f.cx)*s+(y-f.cy)*c],world=([x,y])=>[f.cx+x*sign*c-y*s,f.cy+x*sign*s+y*c];
  const clip=(poly,axis,edge,direction)=>{const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],ip=direction*(p[axis]-edge)>=0,iq=direction*(q[axis]-edge)>=0;if(ip)out.push(p);if(ip!==iq){const t=(edge-p[axis])/(q[axis]-p[axis]);out.push(p.map((v,j)=>v+t*(q[j]-v)));}}return out;};
  const box=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],cut=(poly,x0,y0,x1,y1)=>{for(const [axis,edge,direction] of [[0,x0,1],[0,x1,-1],[1,y0,1],[1,y1,-1]])poly=clip(poly,axis,edge,direction);return poly;},positive=poly=>poly.length>2&&Math.abs(Z.signed(poly))>EPS;
  const x=f.w/2,front=f.d/2,back=-front,opening=box(-x,front,x,front+spec.extension),vent=box(-x-spec.sideClearance,back,-x,front),whole=box(-x,back,x,front+spec.extension);
  const checks=[],add=(kind,ok,message,extra={})=>checks.push({kind,id:f.id,name:f.name,ok,pending:ok===null,message,...extra}),label=o=>o.name||o.id||'未命名障碍',mm=n=>String(Math.round(n*100)/100);
  const items=furniture.filter(o=>o.id!==f.id&&!products.modelError(o));
  const parts=rigidBodies??items.filter(o=>!['rug','plant','curtain'].includes(o.type)).flatMap(o=>G.bodyParts(o,plan,furniture).map(p=>({f:o,...p})));
  const obstacles=parts.filter(o=>o.f.id!==f.id).map(o=>({p:o.p.map(local),vertical:o.vertical,kind:'furniture',id:o.f.id,name:o.f.name}));
  (plan.walls||[]).forEach((w,i)=>obstacles.push({p:rect(w).map(local),vertical:finishes().vertical(w,plan),kind:'wall',id:'w'+i,name:'墙体 '+(i+1)}));
  (plan.wins||[]).forEach((w,i)=>obstacles.push({p:rect(w.rect).map(local),vertical:Number.isFinite(w.sill)&&Number.isFinite(w.head)?{bottom:w.sill*1000,top:w.head*1000}:null,kind:'window',id:'w'+i,name:'窗 '+(i+1)}));
  (plan.beams||[]).forEach(b=>{const v=core().beamVertical(b,ceilingHeight(plan));obstacles.push({p:b.poly.map(local),vertical:v&&!v.assumed?v:null,kind:'beam',id:b.id,name:(b.name||b.id)+'（房梁）'});});
  S.pipes(plan).forEach(p=>obstacles.push({p:p.poly.map(local),vertical:p.vertical,kind:'pipe',id:p.id,name:p.name||'竖管'}));
  const refs=o=>o.kind==='furniture'?{otherId:o.id}:o.kind==='beam'?{beamId:o.id}:o.kind==='pipe'?{markerId:o.id}:{},overlap=(v,bottom,top)=>!v||Math.min(v.top,top)-Math.max(v.bottom,bottom)>EPS;
  // Vent location/height is not dimensioned. Reserve the whole outlet-side face
  // conservatively, excluding obstacles with explicitly separate heights.
  let nearest=Infinity,sideFindings=0;
  for(const o of obstacles){
   if(!overlap(o.vertical,spec.bottom,spec.top))continue;
   let p=cut(o.p,-1e9,back,-x,front);if(!positive(p))continue;const gap=Math.max(0,-x-Math.max(...p.map(v=>v[0])));nearest=Math.min(nearest,gap);
   if(gap>=spec.sideClearance-EPS)continue;sideFindings++;
   add('dishwasher-side',o.vertical?false:null,`洗碗机出气口侧面净距 ${mm(gap)} mm，要求 ≥${spec.sideClearance} mm；${label(o)}${o.vertical?'占用出气侧预留':'高度未知，待核对'}（按整侧机身高度保守检查，随旋转／镜像）`,refs(o));
  }
  if(!sideFindings)add('dishwasher-side',true,`洗碗机出气侧 ≥${spec.sideClearance} mm：${Number.isFinite(nearest)?'最近已建模障碍 '+mm(nearest)+' mm':'已建模范围未发现阻挡'}（整侧保守预留）`);
  // All positive planar/vertical overlap counts; the global 5 mm footprint
  // tolerance must not silently waive a 1 mm installation-space shortfall.
  let openingFindings=0;
  for(const o of obstacles){
   if(!overlap(o.vertical,spec.openingBottom,spec.openingTop)||!positive(cut(o.p,-x,front,x,front+spec.extension)))continue;openingFindings++;
   add('dishwasher-opening',o.vertical?false:null,`洗碗机完全开门保守包络（总深 ${mm(spec.openDepth)} mm、前伸 ${mm(spec.extension)} mm）${o.vertical?'被 '+label(o)+' 占用':'与 '+label(o)+' 投影重叠，高度未知，待核对'}；未模拟折叠连杆轨迹`,refs(o));
  }
  const openingWorld=opening.map(world),rooms=(plan.rooms||[]).filter(r=>r.counted!==false);
  if(rooms.length&&!fitsInRooms(rooms,openingWorld)){openingFindings++;add('dishwasher-opening',false,'洗碗机完全开门保守包络超出已建模房间边界',{section:'boundary'});}
  const ceilings=rooms.length?rooms.filter(r=>(r.polys||[r.poly]).some(p=>positive(cut(p.map(local),-x,front,x,front+spec.extension)))).map(r=>({name:r.name,height:r.ceilingHeight??ceilingHeight(plan)})):[{name:'项目天花板',height:ceilingHeight(plan)}];
  for(const room of ceilings)if(room.height<spec.openingTop-EPS){openingFindings++;add('dishwasher-opening',false,`洗碗机完全开门保守包络超过${room.name||'房间'}净高 ${mm(room.height)} mm`,{section:'ceiling'});}
  if(!openingFindings)add('dishwasher-opening',true,`完全开门保守包络总深 ${mm(spec.openDepth)} mm、前伸 ${mm(spec.extension)} mm：已建模范围未发现阻挡；当前开合状态不缩小核对范围`);
  // Use every actual module/part above the device, including rotated corners;
  // clipping to the device width yields the least favourable front-edge offset.
  // Installation front-offset rules use the cabinet's closed placement envelope,
  // not a recessed board edge or the current door pose. Body collisions still
  // consume the height-clipped production boards above.
  const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),envelopes=items.filter(o=>M.supportsSolids(o)&&!design().products().definition(o)?.solidModel),envelopeIds=new Set(envelopes.map(o=>o.id));
  const overheadObstacles=obstacles.filter(o=>o.kind==='furniture'&&!envelopeIds.has(o.id)).concat(envelopes.flatMap(o=>G.footprints(o).map(p=>({p:p.map(local),vertical:design().furnitureVerticalBounds(o,plan,furniture),kind:'furniture',id:o.id,name:o.name}))));
  let overhead=0;
  for(const o of overheadObstacles){
   if(o.vertical&&o.vertical.top<=spec.bottom+EPS)continue;
   const footprint=cut(o.p,-x,back,x,front);if(!positive(footprint))continue;overhead++;
   if(!o.vertical){add('dishwasher-overhead',null,`洗碗机上方／重叠范围内的 ${label(o)} 高度未知，无法核对台面至吊柜底 ≥${spec.worktopToCabinet} mm、顶部 ${spec.topAccess} mm 和前沿错开 >${spec.frontOffset} mm`,refs(o));continue;}
   const tableGap=o.vertical.bottom-spec.bottom,topGap=o.vertical.bottom-spec.top,p=clip(clip(clip(o.p,0,-x,1),0,x,-1),1,back,1),offset=front-Math.max(...p.map(v=>v[1]));
   let ok,reason;
   if(topGap<-EPS){ok=false;reason='障碍底部低于机顶，不能用前沿错开豁免机身穿入';}
   else if(tableGap>=spec.worktopToCabinet-EPS&&topGap>=spec.topAccess-EPS){ok=true;reason='满足图示常规上方条件';}
   else if(topGap<spec.topAccess-EPS){ok=offset>spec.frontOffset+EPS;reason=ok?'顶部不足 50 mm，但前沿向外错开 >80 mm，满足图示按键操作替代条件':'顶部不足 50 mm，机门须比吊柜前沿向外错开 >80 mm（等于 80 mm 不满足）';}
   else{ok=null;reason='顶部达到 50 mm，但台面至柜底未达到图示 650 mm；两项标注的临界区需人工复核';}
   add('dishwasher-overhead',ok,`洗碗机上方 ${label(o)}：台面至柜底 ${mm(tableGap)} mm；机顶净距 ${mm(topGap)} mm；门前沿向外错开 ${mm(offset)} mm。${reason}`,{...refs(o),tableGap,topGap,frontOffset:offset});
  }
  if(!overhead)add('dishwasher-overhead',true,'已建模范围未发现覆盖机身的上方柜体／家具；按 650 mm／50 mm／>80 mm 条件核对，有新增吊柜时重新计算');
  // Coplanar supporting surfaces can span several modules. Use their union,
  // actual slab holes and L/U cuts, rather than a host bounding rectangle.
  const surfaces=[],hosts=[];
  for(const item of items){
   const v=design().furnitureVerticalBounds(item,plan,furniture);if(!v||Math.abs(v.top-spec.bottom)>EPS)continue;
   let polys;
   if(item.type==='counter'&&!item.obj)polys=K.slabGeometry(item,furniture).polys.map(p=>p.map(v=>K.world(item,...v)));
   else if(['table','desk','island','custom'].includes(item.type)&&!item.obj)polys=G.footprints(item);
   else continue;
   for(const p of polys){const q=cut(p.map(local),-x,back,x,front+spec.extension);if(positive(q)){surfaces.push(q);hosts.push(item.id);}}
  }
  if(!surfaces.length)add('dishwasher-support',null,'未找到与洗碗机底部同高的已建模台面，无法核对机身承托和开门凸出台面风险；请按实际台面顶高设置底部离地');
  else{
   const missing=poly=>Z.area(Z.decompose([poly,...surfaces],p=>Z.inside(p,poly)&&!surfaces.some(q=>Z.inside(p,q))));
   const bodyMissing=missing(box(-x,back,x,front)),openMissing=missing(whole),ok=openMissing<=EPS;
   add('dishwasher-support',ok,bodyMissing>EPS?'洗碗机闭合机身未被同高台面完整承托（已扣除台面孔洞／缺口），请核对位置与台面高度':ok?`已建模同高台面覆盖闭合机身及开门总深 ${mm(spec.openDepth)} mm，未发现开门凸出风险`:`洗碗机开门总深 ${mm(spec.openDepth)} mm 超出台面有效范围，存在门体凸出风险；不代表机身碰撞`,{otherId:hosts[0]});
  }
  if(!spec.nominal)add('dishwasher-spec',null,'洗碗机尺寸已偏离图示 550 × 350 × 598 mm；开启包络随布局尺寸缩放，200／650／50／80 mm 安装条件不缩放，真实产品要求待复核');
  if(!base.known)for(const issue of checks){issue.ok=null;issue.pending=true;issue.message+='；家具基准地面标高未知，待核对';}
  return {checks,zones:{opening:openingWorld,vent:vent.map(world)},spec};
 }
 function spaceCheck(plan,furniture,{passage=800,focusId=null,focusIds=null,scanPassages=true,maxIssues=Infinity}={}){
  plan=finishes().spatial(plan);
  if(!num(passage)||passage<300||passage>2000)fail('通道阈值须为 300–2000 mm');
  const targets=focusIds?new Set(focusIds):focusId?new Set([focusId]):null;
  const broken=[],products=design().products();
  for(const pending of plan.wallFinish?.pending||[]){const ids=targets?[...targets]:['wall-finish-'+pending.index];for(const id of ids)broken.push({kind:'wallfinish',id,wallId:pending.wallId,pending:true,name:'墙面饰面',message:pending.message});}
  furniture=furniture.filter(f=>{const message=products.modelError(f);if(!message)return true;if(!targets||targets.has(f.id))broken.push({kind:'model',id:f.id,name:f.name,pending:true,message:'家具模型异常，空间核对待修复：'+message});return false;});
  for(const f of furniture)if(!targets||targets.has(f.id))broken.push(...(root.FurnishCabinet||require('./cabinet-core.js')).pegboardAutoChecks(f,furniture,plan));
  broken.push(...floors().checks(plan,furniture).filter(i=>!targets||targets.has(i.id)));
  const ignored=new Set(['rug','pendant','acwall','wallart','curtain','mirror','tv','stove','ksink','plant']);
  const bodies=furniture.filter(f=>!ignored.has(f.type)&&!(root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null))?.definition(f)?.embedded).map(f=>{const shapes=(root.FurnishGeometry||require('./layout-geometry.js')).footprints(f);return shapes.map(p=>({f,p,box:[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))]}));}).flat(),walls=plan.walls.map(rect),issues=broken;
  // Beam bodies and opening obstacles share the same rigid-object height envelopes.
  // Wall-mounted objects are exempt from floor-footprint checks, not overhead collisions.
  const rigidBodies=furniture.filter(f=>!['rug','plant','curtain'].includes(f.type)).flatMap(f=>(root.FurnishGeometry||require('./layout-geometry.js')).bodyParts(f,plan,furniture).map(part=>({f,...part})));
  broken.push(...ceilings().checks(plan,rigidBodies).filter(i=>!targets||targets.has(i.id)));
  const beams=(plan.beams||[]).map(beam=>{const vertical=core().beamVertical(beam,ceilingHeight(plan));return {beam,vertical:vertical?.assumed?null:vertical};});
  const S=root.FurnishServices||(typeof require==='function'?require('./service-core.js'):null),pipes=S.pipes(plan);
  const G=root.FurnishGeometry||(typeof require==='function'?require('./layout-geometry.js'):null);
  for(const f of furniture){const result=dishwasherChecks(plan,f,{furniture,rigidBodies});if(result)for(const {ok,...issue} of result.checks)if(ok!==true)issues.push(issue);}
  const beamHits=new Set();
  for(const {f,p,vertical} of rigidBodies){
   if(targets&&!targets.has(f.id))continue;
   if(targets&&issues.filter(v=>targets.has(v.id)||targets.has(v.otherId)).length>=maxIssues)break;
   for(const {beam,vertical:beamRange} of beams){
    if(!intersects(p,beam.poly)||!G.verticalOverlap(f,null,[vertical,beamRange]))continue;
    const key=JSON.stringify([f.id,beam.id]);if(beamHits.has(key))continue;beamHits.add(key);
    const pending=!vertical||!beamRange,label=beam.name||beam.id;
    const detail=pending?'待核对：'+[!beamRange?'梁高未录入':'',!vertical?'家具高度未知':''].filter(Boolean).join('、'):`家具底／顶 ${vertical.bottom}／${vertical.top} mm；梁底／顶 ${beamRange.bottom}／${beamRange.top} mm`;
    issues.push({kind:'beam',id:f.id,beamId:beam.id,name:f.name,pending,at:[f.cx,f.cy],message:`${pending?'家具实体与房梁投影重叠':'家具实体与房梁三维重叠'}：${label}（${detail}）`});
   }
  }
  const swings=[];
  for(const {f,vertical} of rigidBodies){
   if(targets&&!targets.has(f.id))continue;
   for(const pipe of pipes){
    if(!S.bodyHit(f,pipe)||!G.verticalOverlap(f,null,[vertical,pipe.vertical]))continue;
    const cabinet=design().products().serviceCut(f);
    issues.push({kind:'pipe',id:f.id,markerId:pipe.id,name:f.name,pending:!vertical,cut:cabinet,at:pipe.at,message:cabinet?`柜体与 ${pipe.name} 竖管相交：板件已自动生成管道孔／缺口，开启范围另行检查`:`${vertical?'家具实体与竖管相交':'家具与管道投影重叠，家具高度待核对'}：${pipe.name}（管径 ${pipe.radius*2} mm）`});
   }
  }
  (plan.doors||[]).forEach((d,index)=>{const zones=geometry().doorSwingPolygons(d);swings.push(zones);for(const {f,p} of bodies)if(zones.some(points=>intersects(points,p)))issues.push({kind:'door',doorIndex:index,id:f.id,name:f.name,message:'开门范围与家具冲突'});if(zones.some(points=>walls.some((w,i)=>intersects(points,w)&&(!plan.walls[i][5]||finishes().vertical(plan.walls[i],plan).bottom<2100))))issues.push({kind:'swingwall',doorIndex:index,name:d.name||'门 '+(index+1),message:'开门范围与墙体冲突'});});
  for(let i=0;i<swings.length;i++)for(let j=i+1;j<swings.length;j++)if(swings[i].some(a=>swings[j].some(b=>intersects(a,b))))issues.push({kind:'swings',doorIndex:i,name:(plan.doors[i].name||'门 '+(i+1))+' / '+(plan.doors[j].name||'门 '+(j+1)),message:'两扇门的开启范围重叠，请核对同时开门情况'});
  for(const {f,p} of bodies){
   if(targets&&!targets.has(f.id))continue;
   if(targets&&issues.filter(v=>targets.has(v.id)||targets.has(v.otherId)).length>=maxIssues)break;
   const recessed=products.definition(f)?.wallRecess&&!f.obj,recessCore=recessed?(root.FurnishElectricalBox||require('./electrical-box-core.js')):null,inWall=recessed&&recessCore.contained(f,plan);
   if(recessed&&!inWall)issues.push({kind:'wall',id:f.id,name:f.name,pending:true,message:'嵌入箱体未完整位于墙体及饰面内，请核对墙厚、位置及高度'});
   if(!recessed&&walls.some((w,i)=>intersects(p,w)&&(!plan.walls[i][5]||G.verticalOverlap(f,null,[design().furnitureVerticalBounds(f,plan,furniture),finishes().vertical(plan.walls[i],plan)]))))issues.push({kind:'wall',id:f.id,name:f.name,message:'家具占用墙体空间'});
   if(!inWall&&plan.rooms.length&&!fitsInRooms(finishes().roomsAtHeight(plan,design().furnitureVerticalBounds(f,plan,furniture)),p))issues.push({kind:'outside',id:f.id,name:f.name,message:'家具占地超出房间范围（含折角／凹口）'});
   const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
   if(C?.supported(f)||f.kitchen||products.family(f,'tea-bar')&&!f.obj){
    const base=products.floorBase(plan,f,furniture),localPipes=pipes.map(p=>({...p,vertical:p.vertical?{bottom:p.vertical.bottom-base.z,top:p.vertical.top-base.z}:null})),movingParts=pipes.length&&!f.kitchen&&C.supported(f)?S.prepareOpening(f,localPipes):[];
    for(const relativeOpening of (f.kitchen?(root.FurnishKitchen||require('./kitchen-core.js')).openingZones(f,{passage}):products.family(f,'tea-bar')?products.teaBarOpeningZones(f):C.openingZones(f,{passage}))){
     const opening=C.shiftOpening(relativeOpening,base.z);
     const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),movingFurniture=f.kitchen?(opening.section?.startsWith('laundry:')?K.laundryParts(f).find(p=>p.key===opening.section.slice(8)).furniture:K.moduleFurniture(f,K.cabinetLayout(f).find(m=>m.index===opening.column))):f,partOpening=f.kitchen?(opening.section?.startsWith('laundry:')?{...opening,section:opening.sourceSection}:{...opening,column:opening.bay??0}):opening,parts=f.kitchen&&pipes.length?S.prepareOpening(movingFurniture,localPipes):movingParts;
     const hit=(poly,vertical)=>C.openingIntersects(opening,poly,vertical,intersects),physical=opening.kind!=='cabinetpassage';
     const floorHit=physical&&floors().surfaces(plan).some(a=>Number.isFinite(a.finishedZ)&&(a.room.polys||[a.room.poly]).some(p=>hit(p,{bottom:-20000,top:a.finishedZ})));
     const wallHit=plan.walls.some((w,i)=>hit(walls[i],finishes().vertical(w,plan)));
     const obstacles=rigidBodies,blocked=[],unknown=[],pipeIds=[],motionUnknown=[];
     for(const b of obstacles){if(b.f.id===f.id)continue;const vertical=b.vertical??design().furnitureVerticalBounds(b.f,plan,furniture);if(!hit(b.p,vertical))continue;(!vertical?unknown:blocked).push(b.f.name||b.f.id);}
     const ceilingRooms=physical?(plan.rooms||[]).filter(r=>r.counted!==false&&(r.polys||[r.poly]).some(poly=>hit(poly,{bottom:r.ceilingHeight??ceilingHeight(plan),top:Infinity}))):[];
     const ceilingHit=physical&&(ceilingRooms.length>0||!plan.rooms.length&&hit(opening.poly,{bottom:ceilingHeight(plan),top:Infinity}));
     for(const {beam,vertical} of beams){if(vertical){if(hit(beam.poly,vertical))blocked.push((beam.name||beam.id)+'（房梁）');}else if(physical&&hit(beam.poly,null))unknown.push((beam.name||beam.id)+'（梁高未录入）');}
     for(const pipe of pipes){const result=products.family(f,'tea-bar')?{hit:hit(pipe.poly,pipe.vertical)}:S.openingResult(movingFurniture,C.shiftOpening(partOpening,-base.z),localPipes.find(p=>p.id===pipe.id),intersects,parts);if(result.hit){blocked.push(pipe.name+(products.family(f,'tea-bar')?'（竖管，柜门开启范围相交）':'（竖管，切孔后板件运动相交）'));pipeIds.push(pipe.id);}else if(result.pending){motionUnknown.push(pipe.name+(result.reason==='geometry-unavailable'?'（未取得完整可计算板件几何）':'（上翻板件间隙接近计算精度）'));pipeIds.push(pipe.id);}}
     if(floorHit||wallHit||ceilingHit||blocked.length||unknown.length||motionUnknown.length){const reasons=[!base.known?'家具基准地面标高未知，开启高度待核对':'',floorHit?'与地面完成面冲突':'',wallHit?'与墙体冲突':'',ceilingHit?'与天花板／吊顶完成面冲突':'',blocked.length?'被 '+blocked.join('、')+' 占用':'',unknown.length?'待核对：'+unknown.join('、')+' 高度未知':'',motionUnknown.length?'待核对：'+motionUnknown.join('、'):''].filter(Boolean);
      issues.push({kind:opening.kind,id:f.id,markerId:pipeIds[0],markerIds:pipeIds,name:f.name,column:opening.column,section:opening.section||'storage',pending:!base.known||!floorHit&&!wallHit&&!ceilingHit&&!blocked.length,at:opening.poly[0],message:`分区 ${opening.column+1} ${opening.section==='display'?'展示柜门三维扫掠范围':opening.kind==='cabinetdoor'?'柜门三维开启范围':opening.kind==='cabinetdrawer'?'抽屉完全拉出范围':`抽屉拉出后前方 ${passage} mm 地面操作空间`}${reasons.join('；')}`});
     }
    }
   }
   const clearance=design().products().family(f,'pipe-box')?0:f.frontClearance??(C?.supported(f)?0:/wardrobe|cabinet|dresser|custom/.test(f.type)?600:0);if(!clearance)continue;
   const a=f.rot*Math.PI/180,front={...f,cx:f.cx-Math.sin(a)*(f.d/2+clearance/2),cy:f.cy+Math.cos(a)*(f.d/2+clearance/2),d:clearance};const zone=polygon(front);
   const dishwasher=products.dishwasherInstallation(f),height=design().furnitureVerticalBounds(f,plan,furniture);
   const wallBlocked=dishwasher?plan.walls.some((w,i)=>intersects(zone,walls[i])&&G.verticalOverlap(f,null,[height,finishes().vertical(w,plan)])):walls.some((w,i)=>intersects(zone,w)&&(!plan.walls[i][5]||G.verticalOverlap(f,null,[height,finishes().vertical(plan.walls[i],plan)])));
   const itemBlocked=dishwasher?rigidBodies.some(b=>b.f.id!==f.id&&b.vertical&&intersects(zone,b.p)&&G.verticalOverlap(f,b.f,[height,b.vertical])):bodies.some(b=>b.f.id!==f.id&&intersects(zone,b.p));
   const itemUnknown=dishwasher&&rigidBodies.some(b=>b.f.id!==f.id&&!b.vertical&&intersects(zone,b.p));
   if(wallBlocked||itemBlocked||itemUnknown)issues.push({kind:'front',id:f.id,name:f.name,...(dishwasher?{pending:!wallBlocked&&!itemBlocked}:{}),message:dishwasher?`用户设置的正面 ${clearance} mm 额外使用空间${wallBlocked||itemBlocked?'不足':'内家具高度未知，待核对'}（独立于洗碗机开门／厂家安装预留）`:`正面 ${clearance} mm 使用空间不足（柜门／抽屉）`});
  }
  const pair=(a,b)=>{if(a.f.id===b.f.id)return;if(a.box[2]<=b.box[0]||b.box[2]<=a.box[0]||a.box[3]<=b.box[1]||b.box[3]<=a.box[1])return;const G=root.FurnishGeometry||(typeof require==='function'?require('./layout-geometry.js'):null);if(G&&(G.tuckedSeatPair(a.f,b.f)||!G.verticalOverlap(a.f,b.f,[design().furnitureVerticalBounds(a.f,plan,furniture),design().furnitureVerticalBounds(b.f,plan,furniture)])||((root.FurnishCabinetMotion||require('./cabinet-motion.js')).supportsSolids(a.f)||(root.FurnishCabinetMotion||require('./cabinet-motion.js')).supportsSolids(b.f)||design().products().family(a.f,'pipe-box')||design().products().family(b.f,'pipe-box'))&&!G.volumeOverlap(a.f,b.f,plan,furniture)))return;const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);const fit=C&&(C.fridgeBayFit(a.f,b.f)||C.fridgeBayFit(b.f,a.f)||C.hoodBayFit(a.f,b.f)||C.hoodBayFit(b.f,a.f));if(fit?.fits&&products.floorBase(plan,a.f,furniture).known&&products.floorBase(plan,b.f,furniture).known&&Math.abs(products.floorBase(plan,a.f,furniture).z-products.floorBase(plan,b.f,furniture).z)<1e-6)return;if(intersects(a.p,b.p))issues.push({kind:'overlap',id:a.f.id,otherId:b.f.id,name:a.f.name+' / '+b.f.name,message:fit?.reasons.length?'设备嵌合位：'+fit.reasons.join('；'):'家具占地范围重叠，请核对实际摆放'});};
  if(targets){const selectedIssues=issues.filter(v=>targets.has(v.id)||targets.has(v.otherId));if(selectedIssues.length>=maxIssues)return selectedIssues.slice(0,maxIssues);groupPairs:for(let i=0;i<bodies.length;i++)if(targets.has(bodies[i].f.id))for(let j=0;j<bodies.length;j++)if(i!==j&&(!targets.has(bodies[j].f.id)||i<j)){const count=issues.length;pair(bodies[i],bodies[j]);if(issues.length>count)selectedIssues.push(issues[issues.length-1]);if(selectedIssues.length>=maxIssues)break groupPairs;}}else for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)pair(bodies[i],bodies[j]);
  // Raised platforms are excluded even when physical-room outlines retain the original facade.
  const raised=plan.rooms.filter(r=>r.counted===false);
  // Scan actual horizontal/vertical free intervals in rooms; these are candidate bottlenecks, not a pathfinding guarantee.
  for(const room of scanPassages?(plan.physicalRooms||plan.rooms).filter(r=>r.counted!==false):[]){const xs=room.poly.map(p=>p[0]),ys=room.poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);let narrow=null;
   for(const axis of [0,1]){const low=axis?x0:y0,high=axis?x1:y1;for(let fixed=low+200;fixed<high;fixed+=200){const other=1-axis,active=bodies.filter(b=>b.box[other]<=fixed&&b.box[other+2]>=fixed),cuts=[...(axis?ys:xs),...raised.flatMap(r=>r.poly.map(p=>p[axis]))];for(const {p} of active)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[other]<=fixed&&b[other]>=fixed)||(b[other]<=fixed&&a[other]>=fixed)){if(a[other]!==b[other])cuts.push(a[axis]+(b[axis]-a[axis])*(fixed-a[other])/(b[other]-a[other]));}}const sorted=[...new Set(cuts)].sort((a,b)=>a-b);let run=0,start=0;for(let i=0;i<sorted.length-1;i++){const point=axis?[fixed,(sorted[i]+sorted[i+1])/2]:[(sorted[i]+sorted[i+1])/2,fixed];const free=inside(point,room.poly)&&!raised.some(r=>inside(point,r.poly))&&!active.some(b=>inside(point,b.p));if(free){if(!run)start=sorted[i];run+=sorted[i+1]-sorted[i];}if((!free||i===sorted.length-2)&&run){if(run>=100&&run<passage&&(!narrow||run<narrow.width))narrow={width:run,at:axis?[fixed,start+run/2]:[start+run/2,fixed]};run=0;}}}}
   if(narrow)issues.push({kind:'passage',id:room.id,name:room.name,message:`候选狭窄间隙约 ${Math.round(narrow.width)} mm，低于自设 ${passage} mm 阈值`,at:narrow.at});
  }
  const unique=[...new Map(issues.map(v=>[JSON.stringify([v.kind,v.id,v.otherId,v.ceilingId,v.beamId,v.markerId,v.column,v.section,v.message]),v])).values()];return targets?unique.filter(v=>targets.has(v.id)||targets.has(v.otherId)):unique;
 }
 function parseOBJ(text){
  if(typeof text!=='string'||text.length>2e6)fail('OBJ 上限 2 MB');const vertices=[],positions=[];
  for(const line of text.split(/\r?\n/)){const p=line.trim().split(/\s+/);if(p[0]==='v'){const v=p.slice(1,4).map(Number);if(v.length!==3||v.some(n=>!num(n)||Math.abs(n)>1e9))fail('OBJ 顶点无效');vertices.push(v);if(vertices.length>30000)fail('OBJ 顶点过多');}else if(p[0]==='f'){const face=p.slice(1).map(v=>{const id=Number(v.split('/')[0]);if(!Number.isInteger(id)||id===0)fail('OBJ 面索引无效');const index=id<0?vertices.length+id:id-1;if(!vertices[index])fail('OBJ 面引用了不存在的顶点');return vertices[index];});if(face.length<3||face.length>100)fail('OBJ 面无效');for(let i=1;i<face.length-1;i++)positions.push(...face[0],...face[i],...face[i+1]);if(positions.length>180000)fail('OBJ 最多 20000 个三角面');}}
  if(!positions.length)fail('OBJ 未包含网格面');const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++){const axis=i%3;min[axis]=Math.min(min[axis],positions[i]);max[axis]=Math.max(max[axis],positions[i]);}if(max.some((v,i)=>v-min[i]<1e-9))fail('模型需要具有宽、高、深三个维度');return {positions,min,max};
 }
 const checksum=value=>{let hash=2166136261;for(const c of JSON.stringify(value)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');};
 function validateWork(work){
  (root.FurnishLayers||require('./layers-core.js')).validate(work?.objectLayers);
  if(work?.tilePresets!==undefined)(root.FurnishTilePresets||require('./tile-preset-core.js')).validate(work.tilePresets);
  if(work?.tileGrout!==undefined)grouts().validate(work.tileGrout);
  finishes().validate(work?.wallFinishes);floors().validate(work?.floorFinishes);if(work?.wallTiling!==undefined)wallTiles().validate(work.wallTiling);
  ceilings().validate(work?.ceilings);design().products().validateDatum(work);
  if(work?.purchaseOrders!==undefined)(root.FurnishPurchasing||require('./purchasing-core.js')).validate(work.purchaseOrders);
  ceilingHeight(work);
  if(work?.drawing!==undefined)(root.FurnishDrawing||require('./drawing-core.js')).settings(work.drawing);
  if(!work||!Array.isArray(work.furniture)||work.furniture.length>2000)fail('家具数据无效');const w=clone(work),ids=new Set();
  for(const f of w.furniture){if(!f||typeof f.id!=='string'||ids.has(f.id)||![f.cx,f.cy,f.w,f.d,f.rot].every(num)||f.w<=0||f.d<=0||f.w>20000||f.d>20000)fail('家具尺寸或编号无效');ids.add(f.id);if(f.price!==undefined&&(!num(f.price)||f.price<0||f.price>1e7)||f.h!==undefined&&(!num(f.h)||f.h<=0||f.h>20000))fail('家具价格或高度无效');if(f.frontClearance!==undefined&&(!num(f.frontClearance)||f.frontClearance<0||f.frontClearance>3000))fail('家具使用空间无效');if(f.obj){if(!Array.isArray(f.obj.positions)||!f.obj.positions.length||f.obj.positions.length>180000||f.obj.positions.length%9||f.obj.positions.some(v=>!num(v)||Math.abs(v)>1e9))fail('模型数据无效');for(let axis=0;axis<3;axis++){const values=f.obj.positions.filter((v,i)=>i%3===axis);if(Math.max(...values)-Math.min(...values)<1e-9)fail('模型必须具有三维尺寸');}}}
  for(const f of w.furniture)if(f.cabinet)(root.FurnishCabinet||require('./cabinet-core.js')).validate(f);
  for(const f of w.furniture)design().products().validate(f);
  (root.FurnishKitchen||require('./kitchen-core.js')).validateList(w.furniture);
  for(const f of w.furniture){if(f.catalogId!==undefined&&(typeof f.catalogId!=='string'||!f.catalogId||f.catalogId.length>200))fail('家具来源编号无效');if(f.catalogDetached!==undefined&&typeof f.catalogDetached!=='boolean')fail('家具来源状态无效');if(f.catalogSnapshot){const c=f.catalogSnapshot;if(typeof c.name!=='string'||!c.name||c.name.length>80||![c.w,c.d,c.h,c.price].every(num)||c.w<50||c.d<50||c.w>20000||c.d>20000||c.h<=0||c.h>20000||c.price<0||c.price>1e7||!['rect','round'].includes(c.shape)||typeof c.color!=='string'||!/^#[0-9a-f]{3,8}$/i.test(c.color)||['brand','model'].some(k=>typeof c[k]!=='string'||c[k].length>500))fail('家具原始规格无效');}}
  if(w.furniture.some(f=>f.referencePrice!==undefined&&(!num(f.referencePrice)||f.referencePrice<0||f.referencePrice>1e7)))fail('家具参考价无效');
  if(w.measures!==undefined&&(!Array.isArray(w.measures)||w.measures.length>2000||w.measures.some(m=>!m||[m.a,m.b].some(p=>!p||![p.x,p.y].every(num)))))fail('测量线数据无效');
  if(w.notes!==undefined){if(!Array.isArray(w.notes)||w.notes.length>2000||w.notes.some(n=>!n||typeof n.text!=='string'||!n.text.trim()||n.text.length>120||[n.x,n.y].some(v=>!(num(v)||typeof v==='string'&&v.trim()&&Number.isFinite(Number(v))))))fail('文字标注须有有效位置与 1–120 字文字，最多 2000 条');let noteId=0;w.notes=design().restoreNotes(w.notes,()=> 'note_'+ ++noteId);}
  if(w.demolished!==undefined&&(!Array.isArray(w.demolished)||w.demolished.length>10000||w.demolished.some(id=>typeof id!=='string'||!/^w(0|[1-9]\d*)$/.test(id))))fail('拆墙编号须为 w 加非负整数');
  if(w.open!==undefined){const object=v=>v&&typeof v==='object'&&!Array.isArray(v);if(!object(w.open)||Object.keys(w.open).some(k=>!['d','w','s'].includes(k)))fail('门窗设置格式无效');for(const [kind,values] of Object.entries(w.open)){if(!object(values)||Object.keys(values).length>10000||Object.keys(values).some(k=>!/^(0|[1-9]\d*)$/.test(k)))fail('门窗编号格式无效');if(kind==='s')for(const v of Object.values(values)){if(!object(v)||Object.keys(v).some(k=>!['panels','floorTrack','stackSide'].includes(k))||![2,3].includes(v.panels)||v.floorTrack!==undefined&&typeof v.floorTrack!=='boolean'||v.stackSide!==undefined&&!['left','right'].includes(v.stackSide))fail('推拉门扇数须为 2 或 3');}if(kind==='d')for(const [id,v] of Object.entries(values)){const pair=a=>Array.isArray(a)&&a.length===2&&a.every(num),axis=a=>pair(a)&&((Math.abs(a[0])===1&&a[1]===0)||(a[0]===0&&Math.abs(a[1])===1));if(!object(v)||Object.keys(v).some(k=>!['h','c','o','doorType'].includes(k)||v.doorType!==undefined&&!['single','double'].includes(v.doorType))||!pair(v.h)||!axis(v.c)||!axis(v.o)||v.c[0]*v.o[0]+v.c[1]*v.o[1]!==0)fail('门 '+id+' 的铰链或开启方向无效');}}}
  if(w.architecture)w.architecture=architecture(w.architecture);validateBeamCeiling(w);if(w.renovation)extraCosts(w.renovation,{net:0,paint:0,removed:0,added:0});
  if(w.rooms){if(typeof w.rooms!=='object'||Array.isArray(w.rooms))fail('房间设置无效');for(const r of Object.values(w.rooms)){if(!r||typeof r!=='object'||Array.isArray(r)||r.use!==undefined&&!Object.hasOwn(design().uses,r.use))fail('房间用途无效');if(r.ceilingHeight!==undefined)ceilingHeight(r);}}
  if(w.furniture.some(f=>f.resizeAnchor!==undefined&&!Object.hasOwn(design().resizeAnchors,f.resizeAnchor)))fail('家具尺寸调整基准无效');
  for(const f of w.furniture){if(f.purchaseStatus!==undefined&&!Object.hasOwn(purchaseStates,f.purchaseStatus))fail('采购状态无效');if(f.purchaseNote!==undefined&&(typeof f.purchaseNote!=='string'||f.purchaseNote.length>500))fail('采购备注最多 500 字');for(const key of ['brand','model','sourceUrl'])if(f[key]!==undefined&&(typeof f[key]!=='string'||f[key].length>500))fail('家具品牌、型号或来源无效');if(f.sourceUrl&&!/^https?:\/\//i.test(f.sourceUrl))fail('家具来源须为 http(s) 链接');if(f.priceDate&&(typeof f.priceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(f.priceDate)||!Number.isFinite(Date.parse(f.priceDate))||new Date(f.priceDate).toISOString().slice(0,10)!==f.priceDate))fail('价格日期无效');}
  for(const v of Object.values(w.open?.w||{})){if(typeof v==='number'){if(!num(v)||v<0||v>2.4)fail('窗台高无效');}else if(!v||!num(v.sill)||!num(v.head)||v.sill<0||v.head<=v.sill||v.head>2.8||v.panels!==undefined&&![0,3].includes(v.panels)||v.stackSide!==undefined&&!['left','right'].includes(v.stackSide))fail('窗高度或窗扇形式无效');}
  if(w.pricing!==undefined)pricing(w.pricing);
  if(w.designNote!==undefined&&(typeof w.designNote!=='string'||w.designNote.length>500))fail('方案备注无效');
  if(w.scene3d!==undefined){const s=w.scene3d;if(!s||typeof s!=='object'||Array.isArray(s)||!num(s.hour)||s.hour<7||s.hour>18||![1.2,2.8].includes(s.cut)||['lamps','wallNumbers','clearances'].some(k=>s[k]!==undefined&&typeof s[k]!=='boolean')||['furn','labels','night'].some(k=>typeof s[k]!=='boolean'))fail('三维展示设置无效');}
  if(w.spaceThreshold!==undefined&&(!num(w.spaceThreshold)||w.spaceThreshold<300||w.spaceThreshold>2000))fail('通道阈值须为 300–2000 mm');
  if(w.spaceIgnored!==undefined&&(!Array.isArray(w.spaceIgnored)||w.spaceIgnored.length>100||w.spaceIgnored.some(v=>typeof v!=='string'||v.length>1000000)))fail('忽略提示数据无效');
  if(w.assets!==undefined&&(!Array.isArray(w.assets)||w.assets.length>5||w.assets.some(a=>!a||typeof a.name!=='string'||a.name.length>150||typeof a.data!=='string'||a.data.length>2700000||!(/^[A-Za-z0-9+/]*={0,2}$/.test(a.data)))))fail('项目附件无效');
  return w;
 }
 function mergeCatalog(existing,input,makeId){
  const catalog=clone(existing),payload=clone(input),mapping=new Map(),reserved=new Set(catalog.map(c=>c.id));
  const key=c=>JSON.stringify(canonical({...c,id:undefined}));
  const byContent=new Map();for(const c of catalog)if(!byContent.has(key(c)))byContent.set(key(c),c);
  for(const c of payload.catalog){if(c.id&&mapping.has(c.id))fail('家具库编号重复');const signature=key(c);let local=byContent.get(signature);if(!local){let id;do{id=makeId();}while(reserved.has(id));reserved.add(id);local={...c,id};catalog.push(local);byContent.set(signature,local);}if(c.id)mapping.set(c.id,local);}
  if(catalog.length>500)fail('合并家具库超过 500 条，请精简当前家具库或使用空浏览器导入');
  for(const work of [payload.current,...payload.designs.map(d=>d.work)])for(const f of work.furniture){
   if(!['custom','customround'].includes(f.type))continue;
   const source=design().catalogSource(f,payload.catalog),local=source&&(mapping.get(source.id)||byContent.get(key(source)));
   if(local){f.catalogId=local.id;f.catalogSnapshot=design().catalogSnapshot(local);delete f.catalogDetached;}
   else {delete f.catalogId;if(!f.catalogSnapshot)f.catalogDetached=true;}
  }
  return {catalog,payload};
 }
 function formatVersion(works){return works.some(w=>[w?.architecture?.draft,w?.architecture?.baseline,...(w?.architecture?.originalRevisions||[])].some(d=>d?.openings?.some(o=>o.bayId||o.bay)))?16:works.some(w=>w?.objectLayers)?15:works.some(w=>w?.tilePresets?.version===2)?14:works.some(w=>w?.wallTiling?.surfaces?.some(s=>s.bands)||w?.tilePresets?.items?.some(p=>p.variants.some(v=>v.bands!==undefined)))?13:works.some(w=>w?.tilePresets||w?.tileGrout?.walls?.length)?12:works.some(w=>w?.tileGrout)?11:works.some(w=>w?.furnitureDatum==='finished-floor')?10:works.some(w=>ceilings().requiresV8(w)||ceilings().requiresV7(w)||wallTiles().requiresV7(w))?9:works.some(w=>ceilings().requiresV6(w))?6:works.some(w=>w?.ceilings)?5:works.some(w=>w?.wallTiling)?4:works.some(w=>floors().has(w))?3:works.some(w=>finishes().has(w))?2:1;}
 function pack(input){const payload=clone(input);for(const work of [payload.current,...(payload.designs||[]).map(d=>d.work)])if(work?.architecture)work.architecture=upgradeArchitecture(work.architecture);return {format:'furnish-project',version:formatVersion([payload.current,...(payload.designs||[]).map(d=>d.work)]),createdAt:new Date().toISOString(),checksum:checksum(payload),payload:clone(payload)};}
 function historyEntries(entries){const counts=new Map(),result=[];for(const entry of [...entries].sort((a,b)=>(b?.ts||0)-(a?.ts||0))){if(!entry||typeof entry.planId!=='string'||!num(entry.ts)||!entry.data||result.some(v=>v.ts===entry.ts&&v.planId===entry.planId))continue;const count=counts.get(entry.planId)||0;if(count>=8)continue;counts.set(entry.planId,count+1);result.push(entry);if(result.length===64)break;}return result;}
 function recoveryEntry(entries,planId,work,reason,now=Date.now()){
  entries=historyEntries(entries);const data=clone(work),ts=Math.max(now,...entries.map(v=>v.ts+1)),entry={ts,planId,n:data.furniture.length,reason:String(reason).slice(0,80),data};
  const result=historyEntries([entry,...entries]);while(result.length>1&&JSON.stringify(result).length>32e6)result.pop();return result;
 }
 function mergeDesigns(existing,incoming,planId){const result=clone(existing);for(const entry of incoming){const key=JSON.stringify(canonical(entry.work));if(result.some(d=>d.planId===planId&&(d.name===entry.name||d.name.startsWith(entry.name.slice(0,65)+' · 导入 '))&&JSON.stringify(canonical(d.work))===key))continue;let name=entry.name,n=1;while(result.some(d=>d.planId===planId&&d.name===name))name=entry.name.slice(0,65)+' · 导入 '+n++;if(result.filter(d=>d.planId===planId).length>=100)fail('合并后命名方案超过 100 份，请先精简已有方案');result.push({...clone(entry),name,planId});}return result;}
 function copyProject(input,id){const p=clone(input);if(!/^custom_[a-z0-9_]+$/.test(id)||!p.current.architecture)fail('只能复制自定义户型');p.planId=id;for(const w of [p.current,...p.designs.map(d=>d.work)]){w.plan=id;const a=w.architecture;if(!a)fail('方案缺少自定义户型');a.draft.id=id;if(a.baseline)a.baseline.id=id;for(const d of a.originalRevisions||[])d.id=id;}for(const d of p.designs)d.planId=id;return p;}
 function unpack(input){let data=clone(input);if(data.format==='furnish-project'){if(![1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].includes(data.version))fail('不支持的项目版本');if(checksum(data.payload)!==data.checksum)fail('项目完整性校验失败，文件可能被修改或损坏');data=data.payload;}else if(Array.isArray(data.furniture)){data={planId:data.plan,current:data,designs:[],catalog:[]};}else fail('不是 Furnish 项目文件');
  if(!data||typeof data.planId!=='string'||!Array.isArray(data.designs)||data.designs.length>100||!Array.isArray(data.catalog)||data.catalog.length>500)fail('项目结构无效');const checked=(label,work)=>{try{const validated=validateWork(work);return validateWork((root.FurnishFurnitureUpgrade||require('./furniture-upgrade.js')).upgradeWork(validated));}catch(e){fail(label+'：'+e.message);}};data.current=checked('当前方案',data.current);data.designs=data.designs.map(d=>{if(typeof d.name!=='string'||d.name.length>80)fail('方案名称无效');return {...d,work:checked('命名方案「'+d.name+'」',d.work)};});if(data.current.architecture){const id=data.current.architecture.draft.id;if(id!==data.planId||data.designs.some(d=>d.work.architecture?.draft.id!==id))fail('方案户型不一致');}
  for(const [label,work] of [['当前方案',data.current],...data.designs.map(d=>['命名方案「'+d.name+'」',d.work])])if(work.plan!==undefined&&work.plan!==data.planId)fail(label+'：方案户型编号与项目不一致');
  const catalogIds=new Set();for(const c of data.catalog){if(c?.id!==undefined){if(typeof c.id!=='string'||!c.id||c.id.length>200||catalogIds.has(c.id))fail('家具库编号无效或重复');catalogIds.add(c.id);}if(!c||typeof c.name!=='string'||c.name.length>80||![c.w,c.d,c.h,c.price].every(num)||c.w<50||c.d<50||c.w>20000||c.d>20000||c.h<=0||c.h>20000||c.price<0)fail('家具库数据无效');validateWork({furniture:[{...c,id:'model',cx:0,cy:0,rot:0}]});}return data;
 }
 root.FurnishProject={dishwasherChecks,roomCeilingHeight,ceilingAt,ceilingHeight,validateBeamCeiling,readiness,pricing,materialQuantity,furniturePriceBasis,priceBasis,estimate,architecture,assertStructure,protectOriginal,changes,quantities,effectivePlan,validatePlanWork,previewPlan,checkFingerprint,review,openingSchedule,purchaseStates,purchaseMoney,procurement,updatePurchaseGroup,csv,historyEntries,recoveryEntry,mergeDesigns,mergeCatalog,extraCosts,remapRooms,remapOpenings,spaceCheck,parseOBJ,formatVersion,pack,unpack,validateWork,copyProject,area,polygon,fitsInRooms,intersects};
 Object.assign(root.FurnishProject,{materialBreakdown,explainIssue});
 if(typeof module!=='undefined')module.exports=root.FurnishProject;
})(typeof window==='undefined'?globalThis:window);
