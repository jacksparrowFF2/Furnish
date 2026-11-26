/* Finish samples share one temporary work snapshot in the main 3D scene. */
(function(){
'use strict';
const S=FurnishStyles,P=FurnishProducts,B=FurnishCabinetBuilder;
const G=FurnishTileGrout,T=FurnishWallTiling,F=FurnishFloorFinish,L=FurnishLayers;
const swatches=[
 {label:'暖砂米',color:'#dfd4c2'},{label:'浅米灰',color:'#d5d1c8'},
 {label:'柔白',color:'#e9e6de'},{label:'烟灰',color:'#b9b8b2'}
];
const paints=[
 {label:'暖白',color:'#eee8dc'},{label:'砂岩米',color:'#dcccba'},
 {label:'雾灰',color:'#ced1cc'},{label:'浅鼠尾草',color:'#a9b4a1'}
];
const key=t=>JSON.stringify([t.kind,t.id,t.side,t.boxId,t.componentId,t.column]);
const floorSamples=P.styleAppearance.floorSamples.map(asset=>({label:asset.name,asset:asset.id}));
const veneers=P.cabinetAppearance.options.filter(s=>s.materialId).map(s=>({label:s.name,surface:s.id,asset:s.materialId}));
const panel=$('#material-panel'),button=$('#vMaterials'),tray=panel.querySelector('[data-material-samples]');
const sheenRow=panel.querySelector('[data-material-sheen]'),sheenOptions=panel.querySelector('[data-material-sheen-options]');
const lightingOptions=panel.querySelector('[data-material-light-options]');
const filter=panel.querySelector('[data-material-tile-kind]'),groutRow=panel.querySelector('[data-material-grout]');
const groutInput=panel.querySelector('[data-material-grout-color]'),groutAuto=panel.querySelector('[data-material-grout-auto]');
const stylePane=panel.querySelector('[data-material-style]'),styleCards=panel.querySelector('[data-material-styles]');
const styleDetails=panel.querySelector('[data-material-style-details]'),styleFields=panel.querySelector('[data-material-style-fields]');
const customColor=panel.querySelector('[data-material-custom]');
const doorRow=panel.querySelector('[data-material-door]');
const doorLeaf=doorRow.querySelector('[data-door-leaf]'),doorCasing=doorRow.querySelector('[data-door-casing]');
const doorLeafColor=doorRow.querySelector('[data-door-leaf-color]'),doorCasingColor=doorRow.querySelector('[data-door-casing-color]');
const doorPreview=doorRow.querySelector('[data-door-preview]'),doorReset=doorRow.querySelector('[data-door-reset]');
const doorStyles=P.styleAppearance.interiorDoorAppearance;
const currentCards=panel.querySelector('[data-material-current-cards]'),currentList=panel.querySelector('[data-material-current-list]');
const currentResults=panel.querySelector('[data-material-current-results]'),currentSearch=panel.querySelector('[data-material-current-search]');
const materialCategories={floor:'地面',wall:'墙面',door:'室内门',cabinet:'柜体',furniture:'家具软装'};
const category=t=>t.kind==='wallTile'?'wall':['cabinet','front','legacyFront','board'].includes(t.kind)?'cabinet':Object.hasOwn(materialCategories,t.kind)?t.kind:null;
const scopeFields={
 cabinet:{name:'柜体',roles:{front:'门板',body:'柜身／开放格'}},
 curtains:{name:'窗帘',roles:{textile:'帘布',sheer:'纱帘'}},
 furniture:{name:'家具软装',roles:{wood:'木家具',soft:'软包',pop:'点缀'}},
 frames:{name:'门窗框',roles:{frame:'框色'}},
 bays:{name:'飘窗台面',roles:{bay:'台面'}},
 floors:{name:'地面',roles:{floor:'面色'}}
};
const lightPresets={
 plan:{label:'方案光照'},morning:{label:'早晨',light:{hour:8,night:false}},midday:{label:'正午',light:{hour:12,night:false}},
 evening:{label:'傍晚',light:{hour:17.5,night:false}},night:{label:'夜间',light:{hour:21,night:true}}
};
let session=null,styleScopes=['cabinet','curtains','furniture'];
function furnitureTarget(f,part,front,legacyPart){
 if(!f||f.obj||furnitureLocked(f))return null;
 if(f.cabinet?.version===2&&part?.boxId){
  const pick={boxId:part.boxId,componentId:part.componentId},{box,component}=B.selection(f,pick);
  if(front&&component&&P.cabinetAppearance.frontKinds.includes(component.kind)&&component.kind!=='multiDoor')return {kind:'front',id:f.id,...pick};
  if(!front&&box&&(!pick.componentId||component&&P.cabinetAppearance.componentKinds.includes(component.kind)&&!P.cabinetAppearance.frontKinds.includes(component.kind)))return {kind:'board',id:f.id,...pick};
 }
 if(front&&f.cabinet?.version===1&&Number.isInteger(legacyPart?.column)&&f.cabinet.columns[legacyPart.column])return {kind:'legacyFront',id:f.id,column:legacyPart.column};
 if(front)return null;
 if(f.kitchen||f.cabinet)return {kind:'cabinet',id:f.id};
 if(P.styleRole(f))return {kind:'furniture',id:f.id};
 return null;
}
function samples(target){
 if(target.kind==='door')return [];
 if(target.kind==='floor')return [{label:'跟随方案'},...swatches,...floorSamples];
 if(target.kind==='wallTile'||target.kind==='tiles')return [{label:'跟随方案'},...swatches];
 if(target.kind==='frame'||target.kind==='bay')return [{label:'跟随方案'},...swatches];
 if(target.kind==='wall')return [{label:'恢复默认'},...paints];
 if(['front','board','cabinet'].includes(target.kind))return [...swatches,...veneers];
 return swatches;
}
function caption(t){
 if(!t)return '点选场景中的表面';
 if(t.kind==='floor')return nm(state.rooms[t.id]?.name||t.id)+' · 地面';
 if(t.kind==='wallTile')return nm(state.rooms[t.face.roomId]?.name||t.face.roomId)+' · 墙砖';
 if(t.kind==='wall')return '墙面';
 if(t.kind==='frame')return '窗框';
 if(t.kind==='door'){
  const index=S.doorIndex(PLAN,t.id),door=DOORS[index],name=nm(door?.name||tr('房门','Interior door'));
  if(index<0)return name;
  const [x,y,X,Y]=door.rect,center=[(x+X)/2,(y+Y)/2],o=door._base?.o??door.o;
  const rooms=[...new Set([-1,1].map(side=>{
   const r=roomAt(center[0]+side*o[0]*((X-x)/2+10),center[1]+side*o[1]*((Y-y)/2+10));
   return r&&nm(state.rooms[r.id]?.name||r.name);
  }).filter(Boolean))];
  return [rooms.join(' / '),name+' '+(index+1)].filter(Boolean).join(' · ');
 }
 if(t.kind==='bay')return nm(state.rooms[t.id]?.name||t.id)+' · 飘窗台面';
 const suffix={front:' · 门板／抽面',legacyFront:' · 分区门板／抽面',board:' · 柜箱／板件',cabinet:' · 柜身',furniture:''};
 return (getF(t.id)?.name||t.id)+suffix[t.kind];
}
function active(){
 return !!session&&session.plan===PLAN.id&&session.base===state&&session.version===store.updatedAt;
}
function dirty(){return active()&&!!session.preview;}
function lighting(){return active()?lightPresets[session.light].light:undefined;}
function work(value=state){
 return active()&&value===state&&session.preview?session.preview:value;
}
function tileTargets(){
 const plan=tilePlan(),ids=session.roomIds;
 const inScope=id=>!ids||ids.has(id);
 const draft=work();
 const floors=plan.rooms.filter(r=>r.counted!==false&&inScope(r.id)&&F.tiled(draft.rooms[r.id]?.mat||r.mat)).map(r=>({kind:'floor',id:r.id}));
 const walls=(plan.wallTiling?.surfaces||[]).filter(e=>inScope(e.face.roomId)).map(e=>({kind:'wallTile',id:L.faceKey(e.face),face:T.binding(e.face)}))
  .filter(t=>!session.wallKeys||session.wallKeys.has(t.id));
 return session.tileKind==='floor'?floors:session.tileKind==='wall'?walls:[...floors,...walls];
}
const tilePlan=()=>session.planGeometry??=FurnishProject.effectivePlan(PLAN,state);
const locked=t=>L.locked(state,['floor','bay'].includes(t.kind)?'floor:'+t.id:t.id);
const groutTarget=(t,draft=work())=>t?.kind==='wallTile'||t?.kind==='floor'&&F.tiled(draft.rooms[t.id]?.mat);
const groutValue=(draft,t)=>G.color(draft,t.face?.roomId??t.id,t.face?'wall':'floor',t.face);
function hasSheen(draft,t,batch){
 return t.kind==='wallTile'||t.kind==='floor'&&P.styleAppearance.supportsTileSheen(draft.rooms[t.id]?.mat,batch?undefined:S.materialValue(draft,'floorSamples',t.id));
}
const tileSheen=(draft,t)=>t.kind==='wallTile'?S.wallTileMaterial(draft,t.face)?.sheen:S.floorTileSheen(draft,t.id);
function common(values){const value=values[0];return {value,mixed:values.some(v=>v!==value)};}
function currentSample(target){
 if(!target)return null;
 const draft=work();
 if(target.kind==='floor'){
  const asset=S.materialValue(draft,'floorSamples',target.id),color=S.materialValue(draft,'floorOverrides',target.id);
  return asset?{asset}:color?{color}:{label:'跟随方案'};
 }
 if(target.kind==='wallTile'){
  const color=S.wallTileMaterial(draft,target.face)?.color;
  return color?{color}:{label:'跟随方案'};
 }
 if(target.kind==='wall'){
  const color=S.materialValue(draft,'wallPaint',S.wallKey(target.id,target.side));
  return color?{color}:{label:'恢复默认'};
 }
 if(target.kind==='frame'||target.kind==='bay'){
  const color=draft.styleAppearance?.[target.kind+'Overrides']?.[target.id];
  return color?{color}:{label:'跟随方案'};
 }
 if(target.kind==='door')return S.materialValue(draft,'doorFinishes',target.id);
 const f=draft.furniture.find(f=>f.id===target.id);
 if(!f)return null;
 const config=f.kitchen??f.cabinet;
 if(target.kind==='cabinet')return {color:config?.appearance?.bodyColor,surface:config?.appearance?.bodySurface};
 if(target.kind==='legacyFront')return {color:f.cabinet.columns[target.column]?.doorColor};
 if(target.kind==='front'||target.kind==='board'){
  const {box,component}=B.selection(f,target),p=component??box;
  return p?{color:p.color,surface:p.surface}:null;
 }
 return {color:f.color};
}
function fillChip(chip,{asset,surface,color,image}){
 const source=asset&&(surface?globalThis.FurnishWoodVeneerTextures?.[asset]?.baseColor:'assets/materials/floors/'+asset+'/color.jpg');
 chip.style.backgroundImage=source||image?'url("'+(source||image)+'")':'';
 chip.style.backgroundColor=color||(surface?'#937050':'');
}
function indexEntries(){
 const numberedWalls=new Map(),draft=work();
 return View3D.materialCatalog().map(({target,roomId,color,image})=>{
  const group=category(target),room=roomId?nm(state.rooms[roomId]?.name||roomId):'';
  const picked=currentSample(target)||{};
  const known=picked.asset?floorSamples.find(s=>s.asset===picked.asset):veneers.find(s=>s.surface===picked.surface);
  const baseColor=picked.color||color,colorName=[...swatches,...paints].find(s=>s.color===baseColor)?.label;
  const mat=MATS[draft.rooms[target.id]?.mat];
  const sheen=P.styleAppearance.tileSheen(tileSheen(draft,target))?.name;
  const door=target.kind==='door'?S.doorFinish(draft,target.id):null;
  const material=door?tr(door.leaf.name,door.leaf.en)+' · '+tr(door.casing.name,door.casing.en):known?.label||(target.kind==='floor'?(sheen||nm(mat?.name||'地面')):target.kind==='wallTile'?(sheen||'墙砖'):colorName||(target.kind==='wall'?'墙面漆':baseColor.toUpperCase()));
  let name=caption(target);
  if(group==='wall'){
   const ordinal=(numberedWalls.get(room)||0)+1;
   numberedWalls.set(room,ordinal);
   name=[room,(target.kind==='wallTile'?'墙砖 ':'墙面 ')+ordinal].filter(Boolean).join(' · ');
  }else if(group==='cabinet'||group==='furniture'){
   if(target.boxId){
    const {box,component}=B.selection(getF(target.id),target);
    const boxes=getF(target.id)?.cabinet?.boxes,index=boxes?.findIndex(b=>b.id===box?.id)??-1;
    if(index>=0)name+=' · 柜箱 '+(index+1);
    const part=box?.components.findIndex(p=>p.id===component?.id)??-1;
    if(part>=0)name+=' / '+(component.name||'部件 '+(part+1));
   }else if(target.kind==='legacyFront')name+=' '+(target.column+1);
   if(room)name=room+' · '+name;
  }
  return {id:key(target),target,group,name,material,chip:{color:door?.leafColor||baseColor,image,...known}};
 });
}
function materialCard(entry){
 const el=document.createElement('button'),chip=document.createElement('span'),text=document.createElement('span'),name=document.createElement('b'),detail=document.createElement('small');
 el.type='button';el.className='material-current-sample';el.dataset.currentTarget=entry.id;
 el.title=entry.name+' · '+entry.material;
 el.setAttribute('aria-pressed',String(session.mode==='surface'&&session.target&&key(session.target)===entry.id||false));
 chip.className='material-sample-chip';chip.setAttribute('aria-hidden','true');fillChip(chip,entry.chip);
 name.textContent=entry.name;detail.textContent=entry.material;
 text.append(name,detail);el.append(chip,text);
 return el;
}
function refreshList(){
 currentList.hidden=!session.browse;
 if(!session.browse)return;
 const query=currentSearch.value.trim().toLowerCase().split(/\s+/);
 const matches=session.entries.filter(e=>e.group===session.browse&&query.every(q=>(e.name+' '+e.material).toLowerCase().includes(q)));
 currentResults.replaceChildren(...matches.map(materialCard));
 panel.querySelector('[data-material-current-empty]').hidden=!!matches.length;
}
function refreshCurrent(){
 if(!active())return;
 session.entries=indexEntries();
 const target=session.target;
 panel.querySelector('[data-material-locate]').hidden=session.mode!=='surface'||!target||!session.entries.some(e=>e.id===key(target));
 const rendered=[];
 for(const [group,label] of Object.entries(materialCategories)){
  const list=session.entries.filter(e=>e.group===group),recent=session.recent[group];
  const entry=list.find(e=>e.id===recent)??list[0];
  const cell=document.createElement('div'),header=document.createElement('div'),title=document.createElement('span');
  cell.className='material-current-cell';header.className='material-current-heading';title.textContent=label;
  header.append(title);cell.append(header);
  if(entry){
   if(list.length>1){
    const more=document.createElement('button');
    more.type='button';more.className='btn';more.dataset.currentGroup=group;more.textContent='全部 '+list.length;
    more.setAttribute('aria-label','查看全部'+label+'样片');more.setAttribute('aria-expanded',String(session.browse===group));
    header.append(more);
   }
   cell.append(materialCard(entry));
  }else{
   const empty=document.createElement('small');empty.textContent='暂无可更换的表面';cell.append(empty);
  }
  rendered.push(cell);
 }
 currentCards.replaceChildren(...rendered);refreshList();
}
function browse(group){
 const previous=session.browse;
 session.browse=group;currentSearch.value='';refreshCurrent();
 if(group)currentSearch.focus({preventScroll:true});
 else if(previous)currentCards.querySelector('[data-current-group="'+previous+'"]')?.focus({preventScroll:true});
}
function selectCurrent(event){
 if(!active())return;
 const more=event.target.closest('[data-current-group]');
 if(more){browse(session.browse===more.dataset.currentGroup?null:more.dataset.currentGroup);return;}
 const selected=event.target.closest('[data-current-target]');
 if(!selected)return;
 const entry=session.entries.find(e=>e.id===selected.dataset.currentTarget);
 if(!entry)return;
 session.browse=null;
 choose(entry.target);
 panel.querySelector('[data-material-locate]').focus({preventScroll:true});
 View3D.locateMaterial(entry.target);
}
function change(next,t,v){
 if(t.kind==='door'){
  if(locked(t)||S.doorIndex(PLAN,t.id)<0)throw Error(tr('门已锁定或移除','Door is locked or removed'));
  S.editDoorFinish(next,t.id,v.doorFinish);
  return;
 }
 if(t.kind==='floor'){
  if(!state.rooms[t.id]||locked(t))throw Error('地面所在图层已锁定');
  if(Object.hasOwn(v,'label')){
   S.editMaterial(next,'floorSamples',t.id,v.asset);
   S.editSurface(next,'floor',t.id,v.color);
  }
  if(Object.hasOwn(v,'sheen')){
   if(v.sheen&&v.useTile&&!hasSheen(next,t,false))S.editMaterial(next,'floorSamples',t.id,undefined);
   S.editMaterial(next,'floorTileSheens',t.id,v.sheen);
  }
  return;
 }
 if(t.kind==='wallTile'){
  if(locked(t))throw Error('墙砖所在图层已锁定');
  const look={...S.wallTileMaterial(next,t.face)};
  for(const [field,has] of [['color',Object.hasOwn(v,'label')],['sheen',Object.hasOwn(v,'sheen')]]){
   if(has){if(v[field])look[field]=v[field];else delete look[field];}
  }
  S.editMaterial(next,'wallTileMaterials',t.id,Object.keys(look).length?look:undefined);
  return;
 }
 if(t.kind==='wall'){
  if(FurnishLayers.locked(state,'wallPaint:'+t.id))throw Error('墙面所在图层已锁定');
  S.editMaterial(next,'wallPaint',S.wallKey(t.id,t.side),v.color);
  return;
 }
 if(t.kind==='frame'||t.kind==='bay'){
  if(locked(t))throw Error('表面所在图层已锁定');
  S.editSurface(next,t.kind,t.id,v.color);
  return;
 }
 const i=next.furniture.findIndex(f=>f.id===t.id),f=next.furniture[i];
 if(!f||furnitureLocked(f))throw Error('家具已锁定或移除');
 if(t.kind==='furniture'){next.furniture[i]={...f,color:v.color};return;}
 if(t.kind==='legacyFront'){
  const result=structuredClone(f),C=FurnishCabinet;
  result.cabinet.columns[t.column]=C.withDoorSetting(result.cabinet.columns[t.column],'doorColor',v.color);
  C.validate(result);next.furniture[i]=result;
  return;
 }
 if(t.kind==='front'||t.kind==='board'){
  const patch={surface:v.surface||'solid',color:v.color||P.cabinetAppearance.veneer(v.surface).baseColorTintSrgb||'#ffffff'};
  next.furniture[i]=B.update(f,t,patch);
  return;
 }
 const result=P.cabinetAppearance.withBodySurface(f,v.surface||'solid'),config=result.kitchen??result.cabinet;
 if(v.color){
  config.appearance.bodyColor=v.color;
  if(config.version===3)config.bodyColor=v.color;
 }
 next.furniture[i]=result;
}
function renderStyle(){
 const scheme=session.scheme,style=S.find(scheme?.id),saved=S.find(state.style),palette=style&&S.palette(style.id,scheme.palette);
 const status=panel.querySelector('[data-material-style-status]');
 status.textContent=style?scheme.scopes.map(k=>scopeFields[k].name).join(' · ')||'选择要应用的范围'
  :saved?'当前方案 · '+tr(saved.zh,saved.en):'选择配色卡试搭';
 panel.querySelector('[data-material-style-reset]').hidden=!style;
 styleDetails.hidden=!style;
 if(styleCards.dataset.lang!==tr('zh','en')){
  styleCards.dataset.lang=tr('zh','en');
  styleCards.innerHTML=FurnishStylePresets.map(s=>{
   const p=S.palette(s.id),directions=tr(s.applicableStyles.zh.join(' · '),s.applicableStyles.en.join(' · '));
   return `<button type="button" class="design-swatch" data-style-preview="${s.id}"><span class="design-swatch-colors" aria-hidden="true">${['front','body','soft','pop','floor'].map(role=>`<i data-role="${role}" style="background:${p[role]}"></i>`).join('')}</span><b>${esc(tr(s.zh,s.en))}</b><small>${esc(directions)}</small></button>`;
  }).join('');
 }
 for(const card of styleCards.children){
  card.setAttribute('aria-pressed',String(card.dataset.stylePreview===style?.id));
  const p=card.dataset.stylePreview===style?.id?palette:S.palette(card.dataset.stylePreview);
  for(const chip of card.querySelectorAll('[data-role]'))chip.style.backgroundColor=p[chip.dataset.role];
 }
 if(!style)return;
 for(const el of styleFields.querySelectorAll('[data-style-scope]'))el.checked=scheme.scopes.includes(el.dataset.styleScope);
 const select=styleFields.querySelector('[data-style-cabinet-surface]');
 select.value=scheme.bodySurface;
 select.disabled=!scheme.scopes.includes('cabinet');
 for(const el of styleFields.querySelectorAll('[data-style-palette]')){
  el.value=palette[el.dataset.stylePalette];
  el.disabled=!scheme.scopes.includes(el.dataset.scope)||el.dataset.stylePalette==='body'&&!!P.cabinetAppearance.veneer(scheme.bodySurface||style.cabinet?.bodySurface);
 }
 const floor=styleFields.querySelector('[data-style-floor-materials]');
 floor.disabled=!scheme.scopes.includes('floors');
 floor.checked=scheme.floorMaterials&&!floor.disabled;
}
function render(){
 panel.hidden=!session;
 button.setAttribute('aria-pressed',String(!!session));
 $('#stage').classList.toggle('material-editing',!!session);
 if(!session)return;
 const styling=session.mode==='style',batch=session.mode==='tiles',t=session.target,all=batch?tileTargets():[],available=all.filter(t=>!locked(t));
 stylePane.hidden=!styling;
 if(styling)renderStyle();
 panel.querySelector('[data-material-surface-heading]').hidden=styling;
 const subjects=batch?available:!styling&&t?[t]:[],draft=work();
 const choiceTarget=batch?{kind:'tiles'}:t,choices=subjects.length?samples(choiceTarget):[];
 doorRow.hidden=styling||batch||t?.kind!=='door';
 if(!doorRow.hidden)renderDoor(draft,t);
 const selectedSamples=common(subjects.map(t=>JSON.stringify(currentSample(t))));
 const picked=selectedSamples.mixed||!selectedSamples.value?null:JSON.parse(selectedSamples.value);
 const sheenTiles=subjects.filter(t=>hasSheen(draft,t,batch)),sheen=common(sheenTiles.map(t=>tileSheen(draft,t)));
 sheenRow.hidden=!sheenTiles.length;
 for(const option of sheenOptions.children)option.setAttribute('aria-pressed',String(!sheen.mixed&&option.dataset.sheen===(sheen.value||'')));
 const groutTiles=subjects.filter(t=>groutTarget(t,draft)),grout=common(groutTiles.map(t=>groutValue(draft,t)));
 groutRow.hidden=!groutTiles.length;
 groutAuto.setAttribute('aria-pressed',String(!grout.mixed&&grout.value===undefined));
 groutInput.value=grout.value||'#d0c9bd';
 panel.querySelector('[data-material-grout-state]').textContent=grout.mixed?'多种颜色':grout.value||'';
 panel.querySelector('[data-material-tile-filter]').hidden=!batch;filter.value=session.tileKind;
 panel.querySelector('[data-material-tile-count]').textContent=batch?`${available.filter(t=>t.kind==='floor').length} 处地砖 · ${available.filter(t=>t.kind==='wallTile').length} 面墙砖${all.length>available.length?' · '+(all.length-available.length)+' 处已锁定':''}`:'';
 for(const option of panel.querySelectorAll('[data-material-mode]'))option.setAttribute('aria-pressed',String(option.dataset.materialMode===session.mode));
 for(const option of lightingOptions.children)option.setAttribute('aria-pressed',String(option.dataset.light===session.light));
 const batchTitle=session.roomIds?.size===1?nm(state.rooms[[...session.roomIds][0]]?.name||'所选房间')+' · 瓷砖':session.roomIds?'所选房间 · 瓷砖':'批量更换瓷砖';
 panel.querySelector('[data-material-target]').textContent=batch?batchTitle:caption(t);
 customColor.hidden=styling||batch||!['floor','frame','bay'].includes(t?.kind);
 if(!customColor.hidden){
  const fallback=t.kind==='floor'?MATS[draft.rooms[t.id]?.mat]?.sw:t.kind==='frame'?'#5d6166':'#eee8df';
  customColor.querySelector('input').value=S.surfaceColor(draft,t.kind,t.id)||fallback||'#dfd7c9';
 }
 const staged=[session.scheme?.scopes.length?'风格':'',session.edits.size?session.edits.size+' 处表面':''].filter(Boolean);
 panel.querySelector('[data-material-count]').textContent=dirty()?staged.join(' · ')+' 待应用':'';
 panel.querySelector('[data-material-apply]').disabled=!dirty();
 refreshCurrent();
 const signature=JSON.stringify([choiceTarget,batch&&[session.tileKind,available.length],picked]);
 if(tray.dataset.signature===signature)return;
 tray.dataset.signature=signature;tray.replaceChildren();
 choices.forEach((sample,i)=>{
  const el=document.createElement('button');
  el.type='button';el.className='material-sample';el.dataset.materialSample=i;el.draggable=!batch;
  const pressed=sample.asset?sample.asset===picked?.asset||sample.surface&&sample.surface===picked?.surface:sample.color?sample.color===picked?.color&&(!picked.surface||picked.surface==='solid'):sample.label===picked?.label;
  el.setAttribute('aria-pressed',String(!!pressed));
  const chip=document.createElement('span');chip.className='material-sample-chip';
  fillChip(chip,sample);
  const label=document.createElement('span');label.textContent=sample.label;
  el.append(chip,label);el.onclick=()=>batch?stageMany(tileTargets().filter(t=>!locked(t)),sample):stage(t,sample);
  el.addEventListener('dragstart',event=>{
   if(batch){event.preventDefault();return;}
   event.dataTransfer.setData('application/x-furnish-material',JSON.stringify([t.kind,i]));
   event.dataTransfer.effectAllowed='copy';
  });
  tray.append(el);
 });
}
function choose(target){
 if(!active())return;
 if(!target){
  if(session.mode==='surface'&&session.target)panel.querySelector('[data-material-message]').textContent='请点选可编辑的地面、墙面、室内门或家具表面';
  return;
 }
 if(locked(target)){toast('表面所在图层已锁定');return;}
 if(target.kind==='door'&&S.doorIndex(PLAN,target.id)<0)return;
 if(session.target?.id!==target.id||session.target?.kind!==target.kind)session.doorOpen=false;
 session.mode='surface';
 session.target=target;
 const group=category(target);
 if(group)session.recent[group]=key(target);
 panel.querySelector('[data-material-message]').textContent=target.kind==='floor'?'地面外观用于三维搭配，施工铺贴和采购沿用项目设置。':'';
 render();View3D.sync();
}
function stage(target,sample){
 if(target)stageMany([target],sample);
}
function renderDoor(draft,t){
 const saved=currentSample(t),appearance=S.doorFinish(draft,t.id);
 for(const [select,options,value] of [[doorLeaf,doorStyles.leaves,saved?.leaf??'original'],[doorCasing,doorStyles.casings,saved?.casing??'auto']]){
  const lang=tr('简体','English');
  if(select.dataset.lang!==lang){
   select.replaceChildren(...Object.entries(options).map(([id,o])=>new Option(tr(o.name,o.en),id)));
   select.dataset.lang=lang;
  }
  select.value=value;
 }
 doorLeafColor.value=appearance.leafColor;
 doorCasingColor.value=appearance.casingColor;
 doorCasingColor.disabled=!appearance.casing.profile;
 doorReset.disabled=!saved;
 doorPreview.textContent=session.doorOpen?tr('关门查看','View closed'):tr('开门查看','View open');
 doorPreview.setAttribute('aria-pressed',String(!!session.doorOpen));
}
for(const [field,input] of [['leaf',doorLeaf],['casing',doorCasing],['leafColor',doorLeafColor],['casingColor',doorCasingColor]]){
 input.onchange=()=>{
  const t=session?.target;
  if(active()&&t?.kind==='door')stage(t,{doorFinish:{...currentSample(t),[field]:input.value}});
 };
}
doorReset.onclick=()=>{if(active()&&session.target?.kind==='door')stage(session.target,{doorFinish:null});};
doorPreview.onclick=()=>{
 if(!active()||session.target?.kind!=='door')return;
 session.doorOpen=!session.doorOpen;render();View3D.sync();
};
function stageMany(targets,sample){
 if(!active()||!targets.length)return;
 const edits=new Map(session.edits);
 for(const target of targets){
  const id=key(target),previous=edits.get(id)?.sample;
  if(target.kind==='door'&&JSON.stringify(S.doorFinishValue(sample.doorFinish))===JSON.stringify(S.materialValue(state,'doorFinishes',target.id))){
   edits.delete(id);continue;
  }
  const merged=target.kind==='floor'||target.kind==='wallTile'?{...previous,...(sample.label?{asset:sample.asset,color:sample.color}:{}),...sample}:sample;
  edits.set(id,{target,sample:merged});
 }
 if(rebuild(edits)&&session.mode==='surface'&&(!session.target||key(session.target)!==key(targets[0])))choose(targets[0]);
}
function preview(edits,scheme,plan){
  let preview={...state,styleAppearance:state.styleAppearance?structuredClone(state.styleAppearance):undefined,furniture:state.furniture.slice()};
  if(scheme?.scopes.length){
   if(!S.applySelected(preview,ROOMS,scheme.id,{...scheme,bodySurface:scheme.bodySurface||undefined}))throw Error('找不到配色方案');
   preview.furniture=preview.furniture.map((f,i)=>f!==state.furniture[i]&&furnitureLocked(state.furniture[i])?state.furniture[i]:f);
   if(scheme.floorMaterials&&scheme.scopes.includes('floors'))S.applyFloorMaterials(preview,ROOMS,scheme.id,!!PLAN.customDraft);
  }
  const grout=[];
  for(const {target,sample} of edits.values()){
   if(Object.hasOwn(sample,'grout')&&groutTarget(target,preview)&&groutValue(state,target)!==sample.grout)grout.push({roomId:target.face?.roomId??target.id,face:target.face,value:sample.grout,groups:['grout']});
   if(!Object.hasOwn(sample,'grout')||Object.hasOwn(sample,'label')||Object.hasOwn(sample,'sheen'))change(preview,target,sample);
  }
  if(grout.length){
   preview=G.editSurfaces(preview,plan(),grout);
   if(state.tilePresets?.bindings?.length)preview.tilePresets=FurnishTilePresets.unsubscribe({tilePresets:state.tilePresets},grout).tilePresets;
  }
  return preview;
}
function rebuild(edits=session.edits,scheme=session.scheme){
 try{
  session.preview=scheme?.scopes.length||edits.size?preview(edits,scheme,tilePlan):null;
  session.edits=edits;session.scheme=scheme;
  render();View3D.sync();
  return true;
 }catch(err){render();toast(err.message);return false;}
}
function drop(event,target){
 if(!active()||session.mode==='tiles'||!target)return;
 try{
  const [kind,i]=JSON.parse(event.dataTransfer.getData('application/x-furnish-material'));
  const drag=Object.hasOwn({floor:1,wall:1,wallTile:1,front:1,legacyFront:1,board:1,cabinet:1,furniture:1,frame:1,bay:1},kind)&&samples({kind})[i];
  const sample=drag&&samples(target).find(v=>v.label===drag.label);
  if(sample)stage(target,sample);else choose(target);
 }catch{/* Unrelated drags use their original handlers. */}
}
function close(){
 if(!session)return;
 session=null;render();View3D.sync();
}
function afterRender(){if(session&&(!active()||!is3D()))close();}
async function open(target,mode=target?'surface':'style'){
 if(active()){if(target)choose(target);else setMode(mode);return;}
 if(!$('#dlg').hidden||FurnishElectricalUI.active()||FurnishCatalog.active()){
  toast('请先结束当前编辑或预览');return;
 }
 const source={base:state,plan:PLAN.id,version:store.updatedAt};
 if(!is3D())await setView('3d');
 if(!is3D()||source.base!==state||source.plan!==PLAN.id||source.version!==store.updatedAt)return;
 if(active()){if(target)choose(target);else setMode(mode);return;}
 if($('#vMeasure').getAttribute('aria-pressed')==='true')$('#vMeasure').click();
 styleDetails.open=false;
 session={...source,target:null,edits:new Map(),preview:null,scheme:null,light:'plan',mode,tileKind:'all',recent:{},browse:null};
 if(target)choose(target);
 else if(ui.sel?.kind==='room'&&state.rooms[ui.sel.id]&&!L.locked(state,'floor:'+ui.sel.id)){
  session.target={kind:ROOMS.find(r=>r.id===ui.sel.id)?.counted===false?'bay':'floor',id:ui.sel.id};
  session.recent.floor=key(session.target);
 }
 render();View3D.sync();
}
async function openStyle(id){
 await open();
 if(active()&&S.find(id)&&session.scheme?.id!==id)selectStyle(id);
}
async function openTiles({ids,kinds,faces}={}){
 if(!active())await open();
 if(!active())return;
 session.roomIds=ids?new Set(ids):null;session.wallKeys=faces?new Set(faces.map(L.faceKey)):null;
 session.tileKind=kinds?.length===1?kinds[0]:'all';setMode('tiles');
}
function setMode(mode){
 if(!active())return;
 if(mode==='surface'&&session.mode!=='surface'&&session.target){choose(session.target);return;}
 session.mode=mode;
 panel.querySelector('[data-material-message]').textContent='';
 render();View3D.sync();
}
function stageGrout(value){
 if(!active())return;
 const tiles=(session.mode==='tiles'?tileTargets():[session.target]).filter(t=>groutTarget(t)&&!locked(t));
 stageMany(tiles.filter(t=>groutValue(work(),t)!==value),{grout:value});
}
function commitPreview(result){
 const appearanceEdit=result.rooms===state.rooms;
 mutate(()=>{
   if(result.style!==undefined)state.style=result.style;
   state.rooms=result.rooms;
   if(result.styleAppearance===undefined)delete state.styleAppearance;else state.styleAppearance=result.styleAppearance;
   if(result.tileGrout===undefined)delete state.tileGrout;else state.tileGrout=result.tileGrout;
   if(result.tilePresets===undefined)delete state.tilePresets;else state.tilePresets=result.tilePresets;
  state.furniture=result.furniture;
  if(result.assets!==state.assets){if(result.assets)state.assets=result.assets;else delete state.assets;}
 },{sceneFirst:true,appearanceEdit});
}
function apply(){
 if(!dirty())return;
 const result=session.preview,original=session;
 session=null;render();
 try{
  commitPreview(result);
  toast('搭配已应用，可一次撤销');
 }catch(err){session=original;if(!active())session=null;render();View3D.sync();toast(err.message);}
}
function automationSurfaces(){
 return indexEntries().map(({target,name,material})=>({target,name,material,
  current:{...currentSample(target),sheen:tileSheen(state,target)??null,grout:groutValue(state,target)??null},
  samples:samples(target),groutEditable:groutTarget(target,state)}));
}
function configureSurfaces({scheme,edits=[],selections=[]}){
 const entries=new Map(automationSurfaces().map(row=>[JSON.stringify(FurnishMaterialSchedule.canonical(row.target)),row]));
 const resolve=input=>{
  const row=entries.get(JSON.stringify(FurnishMaterialSchedule.canonical(input)));
  if(!row)throw Error('表面身份无效、不可见或已锁定，请重新读取正式表面');
  return row;
 };
 const patches=new Map();
 for(const {target:input,sample:raw} of edits){
  const row=resolve(input),target=row.target,kind=target.kind,sample={...raw},fields=Object.keys(sample);
  const allowed={floor:['asset','color','sheen','useTile','grout'],wall:['color'],wallTile:['color','sheen','grout'],door:['doorFinish'],
   cabinet:['color','surface'],front:['color','surface'],board:['color','surface'],legacyFront:['color'],furniture:['color'],bay:['color'],frame:['color']}[kind];
  if(patches.has(key(target))||!fields.length||fields.some(field=>!allowed?.includes(field)))throw Error('表面重复或不支持指定的材质字段');
  if(Object.hasOwn(sample,'grout')&&(!row.groutEditable||sample.grout!==null&&!/^#[0-9a-f]{6}$/i.test(sample.grout)))throw Error('该表面不支持指定的美缝');
  if(sample.asset&&!floorSamples.some(item=>item.asset===sample.asset)||sample.surface&&!P.cabinetAppearance.surfaces.includes(sample.surface))throw Error('样片或木饰面不存在');
  if(Object.hasOwn(sample,'color')&&sample.color===null&&kind==='furniture')throw Error('家具颜色须明确填写');
  if(Object.hasOwn(sample,'color')||Object.hasOwn(sample,'asset'))sample.label='自定义';
  if(kind==='cabinet'||kind==='front'||kind==='board'){
   sample.surface=Object.hasOwn(raw,'surface')?raw.surface:row.current.surface;
   sample.color=Object.hasOwn(raw,'color')?raw.color:Object.hasOwn(raw,'surface')?undefined:row.current.color;
  }
  for(const field of Object.keys(sample))if(sample[field]===null)sample[field]=undefined;
  patches.set(key(target),{target,sample});
 }
 const plan=()=>FurnishProject.effectivePlan(PLAN,state),next=preview(patches,scheme,plan);
 if(selections.length)FurnishMaterialSchedule.apply(next,selections.map(item=>({...item,target:resolve(item.target).target})));
 FurnishProject.validateWork(next);FurnishProject.validatePlanWork(PLAN,next);FurnishLayers.assertEditable(state,next);
 commitPreview(next);
}
function selectStyle(id){
 const current=session.scheme;
 if(current?.id===id)return;
 rebuild(session.edits,{id,scopes:[...styleScopes],palette:{},bodySurface:'',floorMaterials:current?.floorMaterials??false});
}
styleFields.innerHTML=Object.entries(scopeFields).map(([id,{name,roles}])=>`<div class="style-scope-row">
 <label><input type="checkbox" data-style-scope="${id}">${name}</label><div>
 ${Object.entries(roles).map(([key,label])=>`<label>${label}<input type="color" aria-label="${name} · ${label}" data-style-palette="${key}" data-scope="${id}"></label>`).join('')}
 ${id==='cabinet'?`<label>柜身饰面<select data-style-cabinet-surface><option value="">随配色预设</option>${P.cabinetAppearance.options.map(({id,name})=>`<option value="${id}">${esc(name)}</option>`).join('')}</select></label>`:''}
 ${id==='floors'?'<label><input type="checkbox" data-style-floor-materials>同时套用预设地面类别</label>':''}
 </div></div>`).join('');
styleFields.onchange=({target})=>{
 if(!active()||!session.scheme)return;
 const scheme={...session.scheme,palette:{...session.scheme.palette}};
 if(target.matches('[data-style-scope]'))scheme.scopes=[...styleFields.querySelectorAll('[data-style-scope]:checked')].map(el=>el.dataset.styleScope);
 else if(target.matches('[data-style-palette]'))scheme.palette[target.dataset.stylePalette]=target.value;
 else if(target.matches('[data-style-cabinet-surface]'))scheme.bodySurface=target.value;
 else if(target.matches('[data-style-floor-materials]'))scheme.floorMaterials=target.checked;
 if(rebuild(session.edits,scheme))styleScopes=scheme.scopes;
};
styleCards.onclick=({target})=>{const card=target.closest('[data-style-preview]');if(card&&active())selectStyle(card.dataset.stylePreview);};
panel.querySelector('[data-material-style-reset]').onclick=()=>{
 if(active()){styleDetails.open=false;rebuild(session.edits,null);}
};
customColor.querySelector('input').onchange=({target})=>stage(session?.target,{label:'自定义',color:target.value});
button.onclick=()=>active()?close():open();
for(const el of panel.querySelectorAll('[data-material-mode]'))el.onclick=()=>el.dataset.materialMode==='tiles'?openTiles():setMode(el.dataset.materialMode);
filter.onchange=()=>{if(active()){session.tileKind=filter.value;render();}};
groutAuto.onclick=()=>stageGrout(undefined);
panel.querySelector('[data-material-grout-use]').onclick=()=>stageGrout(groutInput.value);
for(const option of [{id:'',name:'原砖面'},...P.styleAppearance.tileSheens]){
 const el=document.createElement('button');el.type='button';el.className='btn';el.dataset.sheen=option.id;el.textContent=option.name;
 if(option.description)el.title=option.description;
 el.onclick=()=>{
  if(!active()||sheenRow.hidden||el.getAttribute('aria-pressed')==='true')return;
  const batch=session.mode==='tiles',tiles=batch?tileTargets().filter(t=>!locked(t)):[session.target];
  stageMany(tiles.filter(t=>hasSheen(work(),t,batch)),{sheen:option.id||undefined,useTile:batch});
 };
 sheenOptions.append(el);
}
for(const [id,preset] of Object.entries(lightPresets)){
 const el=document.createElement('button');el.type='button';el.className='btn';el.dataset.light=id;el.textContent=preset.label;
 el.onclick=()=>{if(active()&&session.light!==id){session.light=id;render();View3D.sync();}};
 lightingOptions.append(el);
}
panel.querySelector('[data-material-close]').onclick=close;
panel.querySelector('[data-material-apply]').onclick=apply;
panel.querySelector('[data-material-locate]').onclick=()=>{if(active()&&session.target)View3D.locateMaterial(session.target);};
currentCards.onclick=currentResults.onclick=selectCurrent;
currentSearch.oninput=()=>{if(active())refreshList();};
panel.querySelector('[data-material-current-collapse]').onclick=()=>{if(active())browse(null);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active()){e.stopImmediatePropagation();close();button.focus();}},true);
const target=()=>active()&&session.mode==='surface'?session.target:null;
const doorPose=()=>target()?.kind==='door'?{id:session.target.id,open:!!session.doorOpen}:null;
window.FurnishMaterialUI={open,openStyle,openTiles,close,active,dirty,lighting,choose:t=>{if(session?.mode!=='tiles')choose(t);},drop,work,afterRender,furnitureTarget,refreshCurrent,targetKey:key,target,doorPose,automationSurfaces,configureSurfaces};
})();
