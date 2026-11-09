/* Editable component profiles imported from the production constructor.
 * Persisted values are physical primitives in mm, never a legacy recipe. */
(function(root){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v)),B=()=>root.FurnishCabinetBuilder||require('./cabinet-builder-core.js'),C=()=>root.FurnishCabinet||require('./cabinet-core.js');
 class Vector{constructor(){this.x=this.y=this.z=0;}set(x,y,z){Object.assign(this,{x,y,z});} }
 class Color{constructor(value){this.value=value;}set(value){this.value=value;} }
 class Material{constructor(color){this.color=new Color(color);}clone(){const m=new Material(this.color.value);for(const k of ['transparent','opacity','depthWrite','roughness','metalness','emissiveIntensity'])if(this[k]!==undefined)m[k]=this[k];if(this.emissive)m.emissive=new Color(this.emissive.value);return m;} }
 class Node{constructor(geometry=null,color){this.geometry=geometry;this.isMesh=!!geometry;this.isGroup=!geometry;this.position=new Vector();this.rotation=new Vector();this.children=[];this.userData={};this.material=new Material(color);}add(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}remove(node){this.children=this.children.filter(n=>n!==node);}traverse(fn){fn(this);for(const n of this.children)n.traverse(fn);} }
 class Shape{constructor(){this.commands=[];this.holes=[];}moveTo(...v){this.commands.push(['M',...v.map(n=>n*1000)]);}lineTo(...v){this.commands.push(['L',...v.map(n=>n*1000)]);}closePath(){this.commands.push(['Z']);}absarc(x,y,r,a,b,clockwise){this.commands.push(['A',x*1000,y*1000,r*1000,a,b,!!clockwise]);} }
 class Geometry{constructor(shape,options={}){this.shape=shape;this.options=options;this.angle=0;}dispose(){}rotateX(a){this.angle=a;} }
 class Sphere{constructor(radius,widthSegments,heightSegments){Object.assign(this,{radius,widthSegments,heightSegments});}dispose(){} }
 const metadataKeys=['cabinetSide','cabinetTop','cabinetBack','cabinetSection','cabinetShelf','cabinetDivider','cabinetDrawerBoard','cabinetPegboard','cabinetNicheSurface','cabinetHangingRod','cabinetAccessory','cabinetTopClosure','cabinetDoorSize','cabinetDrawerSize','furnishBoardSize','cabinetBay','cabinetTier'];
 const xyz=v=>[v.x*1000,v.y*1000,v.z*1000],shapeData=s=>({commands:copy(s.commands),holes:s.holes.map(shapeData)});
 function capture(f,options={}){
  const T={Group:Node,Shape,Path:Shape,ExtrudeGeometry:Geometry,SphereGeometry:Sphere,Color},model=(root.FurnishCabinetModel||require('../render/cabinet-model.js')).buildRaw(T,f,(w,h,d,color,x,y,z)=>{const n=new Node({box:[w*1000,h*1000,d*1000],dispose(){}},color);n.position.set(x,y+h/2,z);return n;},{...options,outlines:false}),parts=[];
  model.traverse(node=>{if(!node.isMesh)return;const g=node.geometry;let geometry;if(g.box)geometry={kind:'box',size:g.box};else if(g instanceof Sphere)geometry={kind:'sphere',radius:g.radius*1000,widthSegments:g.widthSegments,heightSegments:g.heightSegments};else if(g.shape)geometry={kind:'shape',shape:shapeData(g.shape),depth:g.options.depth*1000,angle:g.angle,curveSegments:g.options.curveSegments??12};else throw Error('柜体包含未知生产几何');
   let position=[0,0,0],moving;for(let p=node;p;p=p.parent){const a=xyz(p.position);if(p.userData.motion){moving=p;if(p.userData.motion.axis==='z')a[2]=p.userData.motion.closedZ*1000;}position=position.map((n,i)=>n+a[i]);}
   const metadata=Object.fromEntries(metadataKeys.filter(k=>node.userData[k]!==undefined).map(k=>[k,copy(node.userData[k])])),material={color:node.material.color.value??C().palette.body};for(const k of ['transparent','opacity','roughness','metalness','depthWrite','emissiveIntensity'])if(node.material[k]!==undefined)material[k]=node.material[k];if(node.material.emissive)material.emissive=node.material.emissive.value;
   if(metadata.furnishBoardSize)metadata.furnishBoardSize=metadata.furnishBoardSize.map(n=>n*1000);let motion;if(moving){let pivot=[0,0,0];for(let p=moving;p;p=p.parent){const a=xyz(p.position);if(p.userData.motion?.axis==='z')a[2]=p.userData.motion.closedZ*1000;pivot=pivot.map((n,i)=>n+a[i]);}const m=moving.userData.motion,part=moving.userData.cabinetPart??node.userData.cabinetPart??m;motion={axis:m.axis,pivot,angle:m.angle??0,travel:(m.travel??0)*1000,column:part.column??m.column??0,section:part.section??m.section??'storage',leaf:part.leaf??m.leaf??0,drawer:part.drawer??0,lane:part.lane??0,lid:!!part.lid,phase:m.axis==='z'?(moving.position.z-m.closedZ)/(m.travel||1):moving.rotation[m.axis]/(m.angle||1)};}
   parts.push({geometry,position,material,metadata,...(motion?{motion}:{})});
  });return parts;
 }
 function bounds(parts){const points=[];for(const p of parts){const g=p.geometry;if(g.kind==='box'){for(const x of [-g.size[0]/2,g.size[0]/2])for(const y of [-g.size[1]/2,g.size[1]/2])for(const z of [-g.size[2]/2,g.size[2]/2])points.push([p.position[0]+x,p.position[1]+y,p.position[2]+z]);}else if(g.kind==='shape'){const outline=g.shape.commands.filter(c=>['M','L'].includes(c[0]));for(const c of outline)for(const d of [0,g.depth])points.push(g.angle?[p.position[0]+c[1],p.position[1]-d,p.position[2]+c[2]]:[p.position[0]+c[1],p.position[1]+c[2],p.position[2]+d]);}}
  if(!points.length)points.push([0,0,0]);const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));return {lo,hi};
 }
 const labels={bottom:'底板',top:'顶板',baseTop:'地柜顶板',counter:'连续台面',displayBottom:'展示柜底板',displayTop:'展示柜顶板',operationBack:'操作区背板',fridgeCeiling:'冰箱位承顶板',drawerSeparator:'抽屉隔板',drawerGrip:'抽面手扣条',led:'灯条',plinth:'踢脚'};
 function convert(f,options={}){
  C().validate(f);if(Object.keys(f.cabinet??{}).some(k=>!['version','template','thickness','backThickness','backPanel','plinth','columns','doorOverlay','doorMaxAngle','autoFrontWidth','autoDoors','boxConstruction','boxJoints','topClosure','entry','sideboard','tiers','stackedBoxes','endPanels','sideClosures','frontTop','pegboardParts','pegboardBottom','hoodBayHeight','hoodBayCeiling','bodyHeight'].includes(k)))throw Error('此柜含暂不能完整升级的未知结构，请保留原柜');if(f.obj)throw Error('固定资产继续使用其产品模型');const c=C().config(f),lanes=C().layout(f),out={...copy(f),type:f.type==='vanity'?'vanity':'cabinet',h:C().height(f),mountHeight:(root.FurnishProducts||require('./product-rules.js')).bottomHeight(f),cabinet:{version:2,boxes:[]}};delete out.kitchen;
  const b={...B().box(),w:f.w,d:f.d,h:C().height(f),thickness:c.thickness,backThickness:C().backThickness(c),bottom:false,top:false,frontBand:C().doorOverlay(f,c)==='full',carcass:false,baseLevel:c.plinth};out.cabinet.boxes.push(b);let serial=0;const add=p=>{p.id='component'+(++serial);b.components.push(p);return p;};
  const tierRows=c.tiers?C().tierParts(f):[],cuts=tierRows.length?[...new Set(tierRows.flatMap(row=>C().layout(row.furniture).slice(1).map(l=>Math.round((l.left-c.thickness/2+row.x)*1e6)/1e6)))].sort((a,b)=>a-b):lanes.slice(1).map(l=>l.left-c.thickness/2);const grid=cuts.map(x=>add({kind:'divider',at:(x+f.w/2-c.thickness)/(f.w-2*c.thickness)}));const bayFor=i=>i?grid[i-1].id:'left';
  const captured=capture(f,options),groups=new Map(),remaining=[];
  for(const part of captured){let key;if(part.motion)key=part.motion.axis==='z'?`drawer:${part.motion.column}:${part.motion.drawer}:${part.motion.lid}:${part.motion.pivot[1]}`:`door:${part.motion.column}:${part.motion.section}:${part.motion.pivot[1]}`;else if(part.metadata.cabinetShelf)key='shelf:'+part.metadata.cabinetShelf.column+':'+part.metadata.cabinetShelf.shelf+':'+part.position[1];else if(part.geometry.kind==='box'&&part.geometry.size[0]<=b.thickness+.001&&part.geometry.size[1]>b.thickness&&part.geometry.size[2]>b.thickness){const index=grid.findIndex(p=>Math.abs(-b.w/2+b.thickness+p.at*(b.w-2*b.thickness)-part.position[0])<.001);if(index>=0){key='divider:'+index;part.metadata.cabinetDivider={divider:index,column:index};}}
   if(key){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(part);}else remaining.push(part);
  }
  const attach=(p,parts,column=0)=>{const v=bounds(parts),bay=B().bays(b)[column];p.profile={version:1,box:{w:b.w,d:b.d,h:b.h,thickness:b.thickness,base:c.plinth},bay:{left:bay?.left??-b.w/2,right:bay?.right??b.w/2},baseline:{color:f.color,...copy(Object.fromEntries(['at','front','back','bottom','height','boxTopInset','frontBottomOffset','frontTopOffset','w','h','d','x','y','z','cableGap','range','segments','lanes','handle'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])))},bounds:v,parts};return p;};
  for(let i=0;i<grid.length;i++)attach(grid[i],groups.get('divider:'+i)??[],i);for(const [key,parts]of groups){const [kind,rawColumn]=key.split(':'),originalColumn=Number(rawColumn),v=bounds(parts),center=(v.lo[0]+v.hi[0])/2,virtual=B().bays(b),column=tierRows.length?virtual.reduce((a,v,i)=>Math.abs(v.center-center)<Math.abs(virtual[a].center-center)?i:a,0):originalColumn,bay=bayFor(column),tier=tierRows.find(t=>t.key===parts[0].metadata.cabinetTier),sourceConfig=tier?C().config(tier.furniture):c;if(kind==='divider')continue;
   if(kind==='shelf'){const p=add({kind:'shelf',bay,at:(v.lo[1]-c.plinth-b.thickness)/(b.h-c.plinth-2*b.thickness),front:b.d/2-v.hi[2],back:v.lo[2]+b.d/2});attach(p,parts,column);}
   if(kind==='door'){const motions=[...new Map(parts.map(p=>[p.motion.leaf,p.motion])).values()].sort((a,b)=>a.leaf-b.leaf),mode=motions[0].axis==='x'?(motions[0].angle<0?'up':'down'):motions.length===2?'double':motions[0].angle<0?'left':'right',col=sourceConfig.columns[originalColumn],segment={id:'segment'+serial,top:1,mode,maxAngle:Math.max(...motions.map(m=>Math.abs(m.angle)*180/Math.PI)),handle:col.handle??'bar',finish:col.finish??'solid',leaves:motions.map((m,i)=>({id:'leaf'+serial+'_'+i,open:m.phase>0,angle:Math.abs(m.angle*m.phase)*180/Math.PI,...(Math.abs(m.angle)*180/Math.PI<Math.max(...motions.map(m=>Math.abs(m.angle)*180/Math.PI))?{maxAngle:Math.abs(m.angle)*180/Math.PI}:{})}))},p=add({kind:'multiDoor',bay,range:{bottom:Math.max(0,v.lo[1])/b.h,top:Math.min(b.h,v.hi[1]+1)/b.h},segments:[segment]});const leafIndices=new Map(motions.map((m,i)=>[m.leaf,i]));for(const part of parts)part.motion.leaf=leafIndices.get(part.motion.leaf);attach(p,parts,column);}
   if(kind==='drawer'){const motions=[...new Map(parts.map(p=>[p.motion.lane,p.motion])).values()].sort((a,b)=>a.lane-b.lane),col=sourceConfig.columns[originalColumn];if(motions[0].lid){const p=add({kind:'slidingTop',bay,open:motions[0].phase>0,extension:motions[0].phase||1,cableGap:col.cableGap??0});attach(p,parts,column);}else{const face=parts.filter(p=>p.metadata.cabinetDrawerBoard==='front'),fv=bounds(face),height=col.drawers[motions[0].drawer]?.height??fv.hi[1]-fv.lo[1]+2,bottom=v.lo[1],p=add({kind:'drawerModule',bay,bottom:bottom/b.h,height,lanes:motions.length,boxTopInset:Math.max(0,height-(v.hi[1]-bottom)),frontBottomOffset:fv.lo[1]-bottom-1,frontTopOffset:fv.hi[1]-bottom-height+1,handle:col.handle??'bar',open:motions[0].phase>0,extension:motions[0].phase||1,states:motions.map(m=>({open:m.phase>0,extension:m.phase||1}))});attach(p,parts,column);}}
  }
  for(const part of remaining){const v=bounds([part]),size=v.hi.map((n,i)=>n-v.lo[i]),center=v.hi.map((n,i)=>(n+v.lo[i])/2),meta=part.metadata,p=add({kind:'board',name:labels[meta.cabinetSection]??(meta.cabinetBack?'背板':meta.cabinetSide?'侧板':meta.cabinetTop?'顶板':meta.cabinetPegboard?'洞洞板':'结构板'),w:Math.max(1,size[0]),h:Math.max(1,size[1]),d:Math.max(1,size[2]),x:center[0],y:center[1],z:center[2]});attach(p,[part]);}
  for(const [i,col]of c.columns.entries())if(col.fridgeBay){const s=c.sideboard,pos=C().sideboardPosition(f,'fridge',c);add({kind:'deviceBay',bay:bayFor(i),height:s.fridgeHeight,depth:pos.depth,rear:pos.rear});}
  return B().validate(B().fit(copy(out)));
 }
 function state(p,m){if(p.kind==='multiDoor'){const s=p.segments.find(s=>s.id===m.segmentId)??p.segments[0],leaf=s.leaves[m.leaf];return leaf?{phase:leaf.open?(leaf.angle??leaf.maxAngle??s.maxAngle)/(leaf.maxAngle??s.maxAngle):0,angle:(Math.sign(m.angle)||1)*(leaf.maxAngle??s.maxAngle)*Math.PI/180,segment:s.id,leafId:leaf.id}:null;}if(['drawerModule','drawers'].includes(p.kind)){const value=B().drawerStates(p)[m.lane];return value?{phase:value.open?value.extension:0}:null;}if(p.kind==='slidingTop')return {phase:p.open?p.extension??1:0};return {phase:0};}
 function transformed(b,p,{includeHidden=false}={}){
  const r=p.profile,s=r.box,scale=[b.w/s.w,b.h/s.h,b.d/s.d],sourceBay=r.bay,targetBay=p.bay?B().bays(b).find(v=>v.id===p.bay):null,base=r.baseline,parts=copy(r.parts),sx=targetBay?(targetBay.right-targetBay.left)/(sourceBay.right-sourceBay.left):scale[0];
  const x=v=>targetBay?targetBay.left+(v-sourceBay.left)*sx:v*scale[0];let sy=scale[1],sz=scale[2],dy=0,dz=0;
  if(p.kind==='shelf'){const old=s.base+s.thickness+base.at*(s.h-s.base-2*s.thickness),level=B().baseHeight(b)+b.thickness+p.at*B().innerHeight(b);sy=1;dy=level-old;const oldRear=-s.d/2+base.back,oldFront=s.d/2-base.front,newRear=-b.d/2+p.back,newFront=b.d/2-p.front;sz=(newFront-newRear)/(oldFront-oldRear);dz=newRear-oldRear*sz;}
  if(p.kind==='divider'){sy=scale[1];}
  if(p.kind==='drawerModule'){sy=(p.height-p.boxTopInset)/(base.height-base.boxTopInset||1);dy=p.bottom*B().bodyHeight(b)-base.bottom*s.h*sy;}
  if(p.kind==='board'){const factor=(k,i)=>p[k]/(r.bounds.hi[i]-r.bounds.lo[i]||p[k])*((r.bounds.hi[i]-r.bounds.lo[i]<=s.thickness+.001&&p[k]===base[k])?b.thickness/s.thickness:scale[i]);scale[0]=factor('w',0);sy=factor('h',1);sz=factor('d',2);dy=p.y*scale[1]-(r.bounds.lo[1]+r.bounds.hi[1])/2*sy;dz=p.z*scale[2]-(r.bounds.lo[2]+r.bounds.hi[2])/2*sz;}
  if(p.kind==='multiDoor'&&p.range&&base.range){const oldBottom=base.range.bottom*s.h-(base.drop??0),oldTop=base.range.top*s.h,newBottom=p.range.bottom*b.h-(p.drop??0),newTop=p.range.top*b.h;sy=(newTop-newBottom)/(oldTop-oldBottom||1);dy=newBottom-oldBottom*sy;}
  const map=(position,accessory=false)=>{let px=x(position[0]),py=position[1]*sy+dy,pz=position[2]*sz+dz;if(p.kind==='divider')px=position[0]*scale[0]+(-b.w/2+b.thickness+p.at*(b.w-2*b.thickness))-(-s.w/2+s.thickness+base.at*(s.w-2*s.thickness))*scale[0];if(p.kind==='board')px=p.x*b.w/s.w+(position[0]-(r.bounds.lo[0]+r.bounds.hi[0])/2)*scale[0];return [px,py,pz];};
  return parts.flatMap((part,index)=>{if(r.frame?.parts[index]?.hidden&&!includeHidden)return [];const m=part.motion,pose=m?state(p,m):null;if(m&&!pose)return [];const accessory=part.geometry.kind==='sphere'||part.material.color==='#71685d',factors=[p.kind==='board'?scale[0]:sx,sy,sz],g=part.geometry;part.position=map(part.position,accessory);if(g.kind==='box')g.size=g.size.map((n,i)=>p.kind==='board'?n*factors[i]:accessory?n:n<=s.thickness+.001?n*b.thickness/s.thickness:n*factors[i]);else if(g.kind==='shape'){const shape=sh=>{sh.commands=sh.commands.map(c=>['M','L'].includes(c[0])?[c[0],c[1]*factors[0],c[2]*(g.angle?factors[2]:factors[1])]:c[0]==='A'?[c[0],c[1]*factors[0],c[2]*(g.angle?factors[2]:factors[1]),c[3],...c.slice(4)]:c);sh.holes.forEach(shape);};shape(g.shape);g.depth*=p.kind==='board'?factors[g.angle?1:2]:b.thickness/s.thickness;}
   if(m)part.motion={...m,pivot:map(m.pivot),angle:pose.angle??m.angle,travel:m.travel*scale[2],phase:pose.phase,segmentId:pose.segment,leafId:pose.leafId};return [part];});
 }
 function equivalent(a,b){const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),round=n=>Math.round(n*10000)/10000,signature=f=>M.boards(f,{includeStatic:true}).map(v=>JSON.stringify({poly:v.poly.map(p=>p.map(round)).sort(),bottom:round(v.bottom),top:round(v.top),phase:round(v.phase??0),motion:v.motion?{axis:v.motion.axis,angle:round(v.motion.angle??0),travel:round(v.motion.travel??0),pivot:v.motion.pivot.map(round)}:null})).sort();return JSON.stringify(signature(a))===JSON.stringify(signature(b));}
 function rebaseBoard(b,p){if(p.kind!=='board'||!p.profile)return;const parts=transformed(b,p,{includeHidden:true}),v=bounds(parts);for(const [i,k]of ['w','h','d'].entries())p[k]=Math.max(1,v.hi[i]-v.lo[i]);for(const [i,k]of ['x','y','z'].entries())p[k]=(v.hi[i]+v.lo[i])/2;p.profile={...p.profile,box:{w:b.w,d:b.d,h:b.h,thickness:b.thickness,base:B().baseHeight(b)},bounds:v,parts,baseline:copy(Object.fromEntries(['w','h','d','x','y','z'].map(k=>[k,p[k]])))};}
 // A frame edit operates on the editable physical parts, never on the old recipe.
 // Persist thickness axes so a 20 mm worktop / 12 mm drawer bottom cannot become
 // a carcass panel merely because a later carcass thickness happens to match it.
 function editFrame(previous,b,{makeId}={}){
  if(b.carcass===false&&b.backThickness>0&&b.backThickness!==previous.backThickness&&!previous.components.some(p=>p.profile?.parts.some(v=>v.metadata.cabinetBack))){
   for(const bay of B().bays(previous)){
    const lower=B().baseHeight(previous)+previous.thickness,upper=B().bodyHeight(previous)-previous.thickness,depth=b.backThickness;
    const part={geometry:{kind:'box',size:[bay.width,upper-lower,depth]},position:[bay.center,(lower+upper)/2,-previous.d/2+depth/2],material:{color:previous.components.find(p=>p.profile)?.profile.baseline.color??'#f3f1ec'},metadata:{cabinetBack:{kind:'solid',thickness:depth}}},v=bounds([part]);
    const p={id:makeId(),kind:'board',name:'背板',w:bay.width,h:upper-lower,d:depth,x:bay.center,y:(lower+upper)/2,z:part.position[2],profile:{version:1,box:{w:previous.w,d:previous.d,h:previous.h,thickness:previous.thickness,base:B().baseHeight(previous)},bay:{left:bay.left,right:bay.right},baseline:{w:bay.width,h:upper-lower,d:depth,x:bay.center,y:(lower+upper)/2,z:part.position[2]},bounds:v,parts:[part]}};
    previous.components.push(copy(p));b.components.push(p);
   }
  }
  const shape=p=>{const v=copy(p);delete v.profile;const strip=v=>{if(!v||typeof v!=='object')return;for(const k of ['open','angle','extension'])delete v[k];Object.values(v).forEach(strip);};strip(v);return v;};
  const profiled=previous.components.filter(p=>p.profile),reuse=profiled.length&&profiled.every(p=>p.profile.frame?.reference&&JSON.stringify(shape(p))===JSON.stringify(p.profile.frame.current));
  const references=new Map();
  if(reuse){
   previous=copy(previous);const frame=previous.components.find(p=>p.profile).profile.frame.reference;
   if(previous.w===frame.box.w&&previous.h===frame.box.h&&previous.d===frame.box.d){
    Object.assign(previous,frame.box);
    for(const p of previous.components.filter(p=>p.profile)){
     const reference=p.profile.frame.reference;references.set(p.id,reference);
     const motion=Object.fromEntries(['segments','states','open','extension'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));
     if(reference.component.id!==p.id||reference.component.kind!==p.kind)throw Error('板厚物理基准与组件身份不符');Object.assign(p,copy(reference.component),motion);p.profile=copy(reference.profile);p.profile.frame={parts:copy(reference.roles)};
    }
    // Use the same original joints for repeated thickness edits. This is a
    // physical baseline, not a template; direct component edits invalidate it.
    for(const p of b.components.filter(p=>p.profile)){const source=previous.components.find(q=>q.id===p.id),motion=Object.fromEntries(['segments','states','open','extension'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));Object.assign(p,copy(references.get(p.id).component),motion);p.profile=copy(source.profile);}
   }
  }
  for(const p of previous.components.filter(p=>p.profile))if(!references.has(p.id)){
   const component=copy(p);delete component.profile;const profile=copy(p.profile);delete profile.frame;profile.version=1;
   references.set(p.id,{box:Object.fromEntries(['w','h','d','thickness','backThickness'].map(k=>[k,previous[k]])),component,profile});
  }
  const near=(a,v)=>Math.abs(a-v)<.001,round=v=>Math.round(v*1e8)/1e8||0;
  const entries=[],groups=new Map(),oldT=previous.thickness,newT=b.thickness;
  const rigid=p=>p.geometry.kind==='sphere'||p.material.color==='#71685d';
  for(const p of b.components.filter(p=>p.profile)){
   const source=previous.components.find(v=>v.id===p.id),parts=transformed(previous,source,{includeHidden:true}),list=[];
   parts.forEach((part,i)=>{
    const v=bounds([part]),size=v.hi.map((n,a)=>n-v.lo[a]),m=part.metadata,section=m.cabinetSection,axes=[];
    let role=copy(p.profile.frame?.parts[i]??{});
    if(!p.profile.frame){
     if(!rigid(part)&&!['counter','led','drawerGrip','plinth'].includes(section)){
      if(m.cabinetBack)axes.push(2);
      else if(m.cabinetDrawerBoard){if(m.cabinetDrawerBoard!=='bottom')axes.push(m.cabinetDrawerBoard==='side'?0:2);}
      else for(let a=0;a<3;a++)if(near(size[a],oldT)&&!(a===2&&p.kind==='multiDoor'&&!m.cabinetDoorSize))axes.push(a);
     }
     role={axes,back:!!m.cabinetBack};
     if(p.kind==='multiDoor'&&!m.cabinetDoorSize&&part.material.color==='#333738'&&part.geometry.kind==='box')role={axes:[2],back:false,offset:size[2]-oldT};
    }
    const e={p,part,role,old:v,next:copy(v),rigid:rigid(part),fitting:section==='drawerGrip'||section==='led',fixed:section==='counter',index:i};
    entries.push(e);list.push(e);
   });groups.set(p,list);if(!references.get(p.id).roles)references.get(p.id).roles=list.map(e=>copy(e.role));
  }
  const isStatic=e=>!e.part.motion,refs=[[],[],[]];
  const addRef=(e,a,from,to)=>refs[a].push({e,from,to});
  // Keep the outside of sides, the underside of ordinary shelves, and the top
  // of caps fixed. Other ends are constrained to their actual mating surfaces.
  for(const e of entries){
   const {part,old,next,role,p}=e,m=part.metadata;
   if(!isStatic(e)||e.fixed||e.rigid)continue;
   for(const a of role.axes){
    const thickness=role.back?b.backThickness:newT;
    let anchor=0;
    if(a===0){if(near(old.lo[0],-previous.w/2))anchor=-1;else if(near(old.hi[0],previous.w/2))anchor=1;}
    if(a===1)anchor=m.cabinetTop||['top','baseTop','drawerSeparator'].includes(m.cabinetSection)||near(old.hi[1],previous.h)?1:-1;
    if(a===2)anchor=role.back?-1:1;
    let center=(old.lo[a]+old.hi[a])/2;
    if(p.kind==='divider'&&a===0)center=-b.w/2+newT+p.at*(b.w-2*newT);
    if(p.kind==='shelf'&&a===1){next.lo[a]=B().baseHeight(b)+newT+p.at*B().innerHeight(b);next.hi[a]=next.lo[a]+thickness;}
    else if(anchor<0){next.hi[a]=old.lo[a]+thickness;}
    else if(anchor>0){next.lo[a]=old.hi[a]-thickness;}
    else {next.lo[a]=center-thickness/2;next.hi[a]=center+thickness/2;}
    if(role.back)role.hidden=thickness===0;
    addRef(e,a,old.lo[a],next.lo[a]);addRef(e,a,role.back&&previous.backThickness===0?old.lo[a]:old.hi[a],next.hi[a]);
    if(a===0)addRef(e,a,(old.lo[a]+old.hi[a])/2,(next.lo[a]+next.hi[a])/2);
   }
  }
  const intersects=(e,r,a)=>[0,1,2].every(k=>k===a||Math.min(e.old.hi[k],r.e.old.hi[k])-Math.max(e.old.lo[k],r.e.old.lo[k])>=-1.01);
  const referenceFor=(value,a,e,tolerance=.001)=>{
   const candidates=refs[a].filter(r=>r.e!==e&&intersects(e,r,a)&&Math.abs(r.from-value)<=tolerance).sort((u,v)=>Math.abs(u.from-value)-Math.abs(v.from-value));
   return candidates[0];
  };
  const mapped=(value,a,e,tolerance=.001)=>{const ref=referenceFor(value,a,e,tolerance);return ref?value+ref.to-ref.from:value;};
  // Closed front faces supply the body-front plane even on framed glass doors.
  for(const [p,list]of groups)if(['multiDoor','drawerModule'].includes(p.kind)){
   const faces=list.filter(e=>p.kind==='multiDoor'?!e.rigid&&e.role.axes.includes(2):e.part.metadata.cabinetDrawerBoard==='front');
   for(const e of faces){e.next.lo[2]=e.old.hi[2]-newT-(e.role.offset??0);addRef(e,2,e.old.lo[2],e.next.lo[2]);addRef(e,2,e.old.hi[2],e.next.hi[2]);}
  }
  for(const e of entries.filter(isStatic))if(!e.fixed){
   for(let a=0;a<3;a++)if(!e.role.axes.includes(a)){
    if(e.rigid||e.old.hi[a]-e.old.lo[a]<=50){const hi=mapped(e.old.hi[a],a,e,e.fitting?10:.001)-e.old.hi[a],lo=mapped(e.old.lo[a],a,e,e.fitting?10:.001)-e.old.lo[a],delta=hi||lo;e.next.lo[a]+=delta;e.next.hi[a]+=delta;}
    else {e.next.lo[a]=mapped(e.old.lo[a],a,e);e.next.hi[a]=mapped(e.old.hi[a],a,e);}
   }
  }
  // Fronts retain edge gaps, ratios and hinge edges. Fittings retain their own
  // dimensions; they follow the face instead of being stretched with the wood.
  const motionGroups=new Map();for(const e of entries.filter(e=>e.part.motion)){
   const m=e.part.motion,key=JSON.stringify([e.p.id,m.section,m.leaf,m.drawer,m.lane,m.lid]);
   if(!motionGroups.has(key))motionGroups.set(key,[]);motionGroups.get(key).push(e);
  }
  for(const list of motionGroups.values()){
   const face=list.filter(e=>!e.rigid&&(e.p.kind==='multiDoor'||e.part.metadata.cabinetDrawerBoard==='front'));
   if(!face.length)continue;
   const old=bounds(face.map(e=>e.part)),next=copy(old),sample={...face[0],old};
   for(const a of [0,1])for(const end of ['lo','hi'])next[end][a]=mapped(old[end][a],a,sample,1.01);
   const front=face.find(e=>e.role.axes.includes(2))??face[0];next.lo[2]=old.lo[2]+front.next.lo[2]-front.old.lo[2];
   const map=(n,a)=>next.lo[a]+(n-old.lo[a])*(next.hi[a]-next.lo[a])/(old.hi[a]-old.lo[a]||1);
   for(const e of list){
    if(e.p.kind==='drawerModule'&&!e.rigid&&e.part.metadata.cabinetDrawerBoard!=='front')continue;
    for(let a=0;a<3;a++){
     if(e.rigid){const center=map((e.old.lo[a]+e.old.hi[a])/2,a),half=(e.old.hi[a]-e.old.lo[a])/2;e.next.lo[a]=center-half;e.next.hi[a]=center+half;}
     else if(e.role.axes.includes(a)){
      const low=Math.abs(e.old.lo[a]-old.lo[a])<=Math.abs(e.old.hi[a]-old.hi[a]);
      if(a===2){e.next.hi[a]=map(e.old.hi[a],a);e.next.lo[a]=e.next.hi[a]-newT-(e.role.offset??0);}
      else if(low){e.next.lo[a]=map(e.old.lo[a],a);e.next.hi[a]=e.next.lo[a]+newT;}
      else {e.next.hi[a]=map(e.old.hi[a],a);e.next.lo[a]=e.next.hi[a]-newT;}
     }else if(e.role.offset!==undefined&&e.old.hi[a]-e.old.lo[a]<=50){const low=Math.abs(e.old.lo[a]-old.lo[a])<=Math.abs(e.old.hi[a]-old.hi[a]),size=e.old.hi[a]-e.old.lo[a];if(low){e.next.lo[a]=map(e.old.lo[a],a);e.next.hi[a]=e.next.lo[a]+size;}else{e.next.hi[a]=map(e.old.hi[a],a);e.next.lo[a]=e.next.hi[a]-size;}}
     else if(a===2&&e.old.hi[a]-e.old.lo[a]<=50){e.next.hi[a]=e.old.hi[a];e.next.lo[a]=e.old.lo[a];}
     else {e.next.lo[a]=map(e.old.lo[a],a);e.next.hi[a]=map(e.old.hi[a],a);}
    }
    // Hinge on the same physical front edge. Flip hinges use the face centre.
    e.pivot=e.part.motion.pivot.map((n,a)=>map(n,a));
   }
   if(face[0].p.kind==='drawerModule'){
    const wooden=list.filter(e=>e.part.metadata.cabinetDrawerBoard&&e.part.metadata.cabinetDrawerBoard!=='front');
    const sides=wooden.filter(e=>e.part.metadata.cabinetDrawerBoard==='side').sort((a,b)=>a.old.lo[0]-b.old.lo[0]);
    if(sides.length>=2){
     const left=sides[0],right=sides.at(-1);
     const loX=referenceFor(left.old.lo[0],0,left,10.01)?mapped(left.old.lo[0],0,left,10.01):next.lo[0]+left.old.lo[0]-old.lo[0],hiX=referenceFor(right.old.hi[0],0,right,10.01)?mapped(right.old.hi[0],0,right,10.01):next.hi[0]+right.old.hi[0]-old.hi[0];
     for(const e of wooden){const kind=e.part.metadata.cabinetDrawerBoard;
      e.next=copy(e.old);if(kind==='side'){const isLeft=e===left;e.next.lo[0]=isLeft?loX:hiX-newT;e.next.hi[0]=e.next.lo[0]+newT;}
      else {e.next.lo[0]=loX+newT;e.next.hi[0]=hiX-newT;}
      // Preserve drawer bottom lift/thickness and top clearance under its cap.
      if(kind!=='bottom')e.next.hi[1]+=next.hi[1]-old.hi[1];
      const back=wooden.find(e=>e.part.metadata.cabinetDrawerBoard==='back');
      if(back){const rear=mapped(back.old.lo[2],2,back);if(kind==='back'){e.next.lo[2]=rear;e.next.hi[2]=rear+newT;}
       else {e.next.lo[2]=rear+newT;e.next.hi[2]=front.next.lo[2];}}
      e.pivot=e.part.motion.pivot.slice();
     }
     const depthRatio=(left.next.hi[2]-left.next.lo[2])/(left.old.hi[2]-left.old.lo[2]);for(const e of list){e.travel=list[0].part.motion.travel*depthRatio;e.pivot=list[0].part.motion.pivot.slice();}
    }
   }
  }
  // Apply an affine map to each real primitive (including original cut-outs).
  for(const e of entries){const {part,old,next}=e,g=part.geometry;
   if(e.role.hidden)next.hi[2]=next.lo[2]+(old.hi[2]-old.lo[2]); // archive a valid back for 0 -> positive
   const scale=next.hi.map((n,a)=>(n-next.lo[a])/(old.hi[a]-old.lo[a]||1));
   if(scale.some(n=>!Number.isFinite(n)||n<=0))throw Error('板厚超过此柜腔的可用尺寸（'+(e.p.name??e.p.kind)+'）');
   const map=(n,a)=>next.lo[a]+(n-old.lo[a])*scale[a];part.position=part.position.map((n,a)=>round(map(n,a)));
   if(g.kind==='box')g.size=g.size.map((n,a)=>round(n*scale[a]));
   if(g.kind==='shape'){
    const ax=g.angle?2:1,shape=s=>{s.commands=s.commands.map(c=>['M','L'].includes(c[0])?[c[0],round(c[1]*scale[0]),round(c[2]*scale[ax])]:c[0]==='A'?[c[0],round(c[1]*scale[0]),round(c[2]*scale[ax]),c[3],...c.slice(4)]:c);s.holes.forEach(shape);};shape(g.shape);g.depth=round(g.depth*scale[g.angle?1:2]);
   }
   if(part.motion){part.motion.pivot=(e.pivot??part.motion.pivot).map(round);if(part.motion.axis==='z')part.motion.travel=round(e.travel??part.motion.travel);delete part.motion.segmentId;delete part.motion.leafId;}
   if(part.metadata.cabinetBack&&typeof part.metadata.cabinetBack==='object')part.metadata.cabinetBack.thickness=b.backThickness;
   if(part.metadata.cabinetDoorSize){part.metadata.cabinetDoorSize.width=round(next.hi[0]-next.lo[0]);part.metadata.cabinetDoorSize.height=round(next.hi[1]-next.lo[1]);}
  }
  for(const [p,list]of groups){
   const parts=list.map(e=>e.part),v=bounds(parts),oldProfile=p.profile;
   if(p.kind==='board'){for(const [i,k]of ['w','h','d'].entries())p[k]=round(Math.max(1,v.hi[i]-v.lo[i]));for(const [i,k]of ['x','y','z'].entries())p[k]=round((v.hi[i]+v.lo[i])/2);}
   if(p.kind==='shelf'){p.at=(v.lo[1]-B().baseHeight(b)-newT)/B().innerHeight(b);p.front=b.d/2-v.hi[2];p.back=v.lo[2]+b.d/2;}
   if(p.kind==='multiDoor')p.range={bottom:Math.max(0,(v.lo[1]+(p.drop??0))/b.h),top:Math.min(1,(v.hi[1]+1)/b.h)};
   if(p.kind==='drawerModule'){const fv=bounds(parts.filter(v=>v.metadata.cabinetDrawerBoard==='front'));p.bottom=v.lo[1]/b.h;p.boxTopInset=Math.max(0,p.height-(v.hi[1]-v.lo[1]));p.frontBottomOffset=fv.lo[1]-v.lo[1]-1;p.frontTopOffset=fv.hi[1]-v.lo[1]-p.height+1;}
   const bay=B().bays(b).find(v=>v.id===p.bay)??B().bays(b)[0],baseline=copy(Object.fromEntries(['at','front','back','bottom','height','boxTopInset','frontBottomOffset','frontTopOffset','w','h','d','x','y','z','cableGap','range','drop','segments','lanes','handle'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])));
   p.profile={...oldProfile,version:2,box:{w:b.w,d:b.d,h:b.h,thickness:newT,base:B().baseHeight(b)},bay:{left:bay.left,right:bay.right},baseline:{color:oldProfile.baseline.color,...baseline},bounds:v,parts,frame:{parts:list.map(e=>e.role),reference:references.get(p.id),current:shape(p)}};
  }
 }
 const zoneCache=new Map();
 function hull(points){const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=ps=>{const out=[];for(const p of ps){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(sorted).slice(0,-1),...half(sorted.reverse()).slice(0,-1)];}
 function zones(f,{passage=800}={}){
  if(!f.cabinet.boxes.some(b=>b.components.some(p=>p.profile)))return [];const key=JSON.stringify([f.cabinet,passage]);if(zoneCache.has(key))return zoneCache.get(key);
  const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),V=root.FurnishBoardCollision||require('./board-motion-collision.js'),groups=new Map();
  for(const board of M.boards(f,{includeStatic:true})){const pick=board.metadata.cabinetBuilder;if(!pick?.componentId||!B().selection(f,pick).component?.profile||!board.motion)continue;const m=board.motion,part=board.metadata.cabinetPart,key=JSON.stringify([pick.boxId,pick.componentId,m.section,m.leaf,part?.drawer,part?.lane,part?.lid]),g=groups.get(key)??{boards:[],motion:m,pick,part};g.boards.push(board);groups.set(key,g);}
  const result=[...groups.values()].flatMap(({boards,motion:m,pick,part})=>{const points=[],closed=boards.flatMap(b=>V.vertices(b,0)),steps=m.axis==='z'?1:Math.max(1,Math.ceil(Math.abs(m.angle)*180/Math.PI));for(let step=0;step<=steps;step++)for(const b of boards)points.push(...V.vertices(b,step/steps));const radius=m.axis==='z'?0:Math.max(...closed.map(v=>Math.hypot(v[m.axis==='x'?1:0]-m.pivot[m.axis==='x'?1:0],v[2]-m.pivot[2]))),margin=radius*(1-Math.cos(Math.abs(m.angle??0)/steps/2))+.001,pad=poly=>hull(poly.flatMap(p=>[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>[p[0]+a*margin,p[1]+b*margin]))),poly=pad(points.map(v=>[v[0],v[2]])),left=Math.min(...points.map(v=>v[0]))-margin,right=Math.max(...points.map(v=>v[0]))+margin,front=Math.max(...points.map(v=>v[2]))+margin,bottom=Math.min(...points.map(v=>v[1]))-margin,top=Math.max(...points.map(v=>v[1]))+margin,common={column:m.column,boxId:pick.boxId,componentId:pick.componentId,...part},zone={...common,kind:m.kind,poly,ranges:[[bottom,top]],...(m.axis==='x'?{sweep:{left,right,profile:pad(points.map(v=>[v[2],v[1]])),cx:0,cy:0,rot:0,flip:false}}:{})};return [zone,...(passage>0?[{...common,kind:'cabinetpassage',poly:[[left,front],[right,front],[right,front+passage],[left,front+passage]],ranges:[[0,2000]]}]:[])];});
  zoneCache.set(key,result);if(zoneCache.size>32)zoneCache.delete(zoneCache.keys().next().value);return result;
 }
 function validate(profile){
  const keys=(v,allowed)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('组件形状字段无效');},num=(v,min=-20000,max=20000)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error('组件形状数值无效');},vector=v=>{if(!Array.isArray(v)||v.length!==3)throw Error('组件形状坐标无效');v.forEach(n=>num(n));};
  keys(profile,['version','box','bay','baseline','bounds','parts','frame']);if(![1,2].includes(profile.version))throw Error('组件形状版本无效');keys(profile.box,['w','d','h','thickness','base']);for(const k of ['w','d','h','thickness'])num(profile.box[k],1);num(profile.box.base,0);keys(profile.bay,['left','right']);num(profile.bay.left);num(profile.bay.right);if(profile.bay.right<=profile.bay.left)throw Error('组件基准隔间无效');keys(profile.bounds,['lo','hi']);vector(profile.bounds.lo);vector(profile.bounds.hi);
  if(profile.frame!==undefined){keys(profile.frame,['parts','reference','current']);if(profile.frame.reference){const r=profile.frame.reference;keys(r,['box','component','profile','roles']);if(!Array.isArray(r.roles)||r.roles.length!==r.profile?.parts?.length)throw Error('板厚基准轴无效');for(const role of r.roles){keys(role,['axes','back','hidden','offset']);if(role.offset!==undefined)num(role.offset,0,50);if(!Array.isArray(role.axes)||role.axes.some(a=>![0,1,2].includes(a))||typeof role.back!=='boolean'||role.hidden!==undefined&&typeof role.hidden!=='boolean')throw Error('板厚基准轴无效');}keys(r.box,['w','h','d','thickness','backThickness']);for(const k of ['w','h','d'])num(r.box[k],1);num(r.box.thickness,12,30);num(r.box.backThickness,0,50);if(r.profile?.frame||r.profile?.version!==1)throw Error('板厚物理基准无效');validate(r.profile);if(!r.component||!profile.frame.current)throw Error('板厚组件基准无效');}if(profile.version!==2||!Array.isArray(profile.frame.parts)||profile.frame.parts.length!==profile.parts.length)throw Error('板厚联动记录无效');for(const role of profile.frame.parts){keys(role,['axes','back','hidden','offset']);if(role.offset!==undefined)num(role.offset,0,50);if(!Array.isArray(role.axes)||role.axes.some(a=>![0,1,2].includes(a))||typeof role.back!=='boolean'||role.hidden!==undefined&&typeof role.hidden!=='boolean')throw Error('板厚联动轴无效');}}
  if(!profile.baseline||typeof profile.baseline!=='object'||Array.isArray(profile.baseline)||!Array.isArray(profile.parts)||profile.parts.length>2000)throw Error('组件生产形状无效');
  const shape=(s,depth=0)=>{keys(s,['commands','holes']);if(depth>2||!Array.isArray(s.commands)||s.commands.length>4096||!Array.isArray(s.holes)||s.holes.length>4096)throw Error('板件轮廓超出范围');for(const c of s.commands){if(!Array.isArray(c)||!['M','L','Z','A'].includes(c[0])||c.length!==({M:3,L:3,Z:1,A:7})[c[0]])throw Error('板件轮廓无效');c.slice(1,c[0]==='A'?6:undefined).forEach(v=>num(v));if(c[0]==='A'&&typeof c[6]!=='boolean')throw Error('圆弧方向无效');}s.holes.forEach(h=>shape(h,depth+1));};
  let count=0;const visit=(v,depth=0)=>{if(depth>18||++count>500000)throw Error('组件形状超出范围');if(typeof v==='number')num(v,-1e6,1e6);if(v&&typeof v==='object')for(const value of Object.values(v))visit(value,depth+1);else if(typeof v==='string'&&v.length>200)throw Error('组件形状标记过长');};visit(profile);
  for(const part of profile.parts){keys(part,['geometry','position','material','metadata','motion']);vector(part.position);const g=part.geometry;keys(g,g?.kind==='box'?['kind','size']:g?.kind==='sphere'?['kind','radius','widthSegments','heightSegments']:['kind','shape','depth','angle','curveSegments']);if(g.kind==='box'){vector(g.size);g.size.forEach(n=>num(n,.001));}else if(g.kind==='sphere'){num(g.radius,.001);num(g.widthSegments,3,64);num(g.heightSegments,2,64);}else if(g.kind==='shape'){shape(g.shape);num(g.depth,.001);if(![0,Math.PI/2].includes(g.angle))throw Error('板件挤出方向无效');num(g.curveSegments,1,64);}else throw Error('组件生产几何无效');keys(part.material,['color','transparent','opacity','roughness','metalness','depthWrite','emissiveIntensity','emissive']);for(const k of ['color','emissive'])if(part.material[k]!==undefined&&!(typeof part.material[k]==='string'&&/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(part.material[k])||Number.isInteger(part.material[k])&&part.material[k]>=0&&part.material[k]<=0xffffff))throw Error('组件材质颜色无效');for(const k of ['transparent','depthWrite'])if(part.material[k]!==undefined&&typeof part.material[k]!=='boolean')throw Error('组件材质开关无效');for(const k of ['opacity','roughness','metalness'])if(part.material[k]!==undefined)num(part.material[k],0,1);if(part.material.emissiveIntensity!==undefined)num(part.material.emissiveIntensity,0,100);keys(part.metadata,metadataKeys);if(part.motion){keys(part.motion,['axis','pivot','angle','travel','column','section','leaf','drawer','lane','lid','phase']);if(!['x','y','z'].includes(part.motion.axis))throw Error('组件活动轴无效');vector(part.motion.pivot);num(part.motion.angle,-Math.PI,Math.PI);num(part.motion.travel,0,1200);num(part.motion.phase,0,1);}}
 }
 const api={editFrame,equivalent,rebaseBoard,zones,capture,convert,transformed,validate,bounds};root.FurnishCabinetProfiles=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
