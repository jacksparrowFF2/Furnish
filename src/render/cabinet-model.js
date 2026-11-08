/* Shared Three.js cabinet construction. box uses bottom-based vertical coordinates. */
(function(root){
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

 // All recipes use these production components, including the numeric board
 // recorder. Caller-owned sites keep exported part identities stable.
 function createComponents({THREE,C,f,c,box,options={},bodyColor,roundedBookcase,bookcase,frame=C.carcassFrame(f,c)}){
  const w=frame.width/1000,d=frame.depth/1000,t=frame.thickness/1000,split=frame.split===null?null:frame.split/1000,splitPairs=[];
  const add=(parent,W,H,D,x,y,z,shade=bodyColor)=>{
   if(split!==null&&H>2*t&&(W<=t+1e-8||D<=t+1e-8||Math.abs(z-D/2+d/2)<1e-8)&&y<split-1e-8&&y+H>split+1e-8){
    const outerSide=W<=t+1e-8&&Math.abs(Math.abs(x)-(w-t)/2)<1e-8,lowerTop=outerSide?split:split-t,upperBottom=outerSide?split:split+t;
    const lower=syncIdentity.produce('cabinet-stacked:lower',()=>box(W,lowerTop-y,D,shade,x,y,z)),upper=syncIdentity.produce('cabinet-stacked:upper',()=>box(W,y+H-upperBottom,D,shade,x,upperBottom,z));parent.add(lower,upper);splitPairs.push([lower,upper]);return lower;
   }
   const mesh=syncIdentity.produce("cabinet-model:site-1",()=>box(W,H,D,shade,x,y,z));
   // Same production board envelope feeds the numeric recorder. The render-only
   // edge easing remains inside that envelope; radius is a visual estimate.
   if(roundedBookcase&&mesh.geometry?.attributes){const r=Math.min(bookcase.edgeRadius/1000,W/4,H/4,D/4),s=new THREE.Shape();s.moveTo(-W/2+r,-H/2+r);s.lineTo(W/2-r,-H/2+r);s.lineTo(W/2-r,H/2-r);s.lineTo(-W/2+r,H/2-r);s.closePath();const geometry=new THREE.ExtrudeGeometry(s,{depth:D-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1});geometry.translate(0,0,-D/2+r);mesh.geometry.dispose();mesh.geometry=geometry;}
   if(roundedBookcase)mesh.userData.furnishBoardSize=[W,H,D];
   parent.add(mesh);return mesh;};
  const rearPanel=(parent,W,H,X,Y,site,metadata={},shade=bodyColor,kind='solid')=>{
   const part=C.backPanelPart(f,{w:W*1000,h:H*1000,x:X*1000,bottom:Y*1000,kind},c);if(!part)return;
   const mesh=syncIdentity.produce(site,()=>add(parent,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000,shade));Object.assign(mesh.userData,metadata,{cabinetBack:{kind,thickness:part.d}});return mesh;
  };
  const shelfFrame=(column,section='storage',shelf)=>shelf===undefined?C.depthLayout(f,column,c,section):C.shelfDepthLayout(f,column,shelf,c,section);
  const shelf=(parent,column,index,site,{width,x}={})=>{
   const part=C.shelfPart(f,column,index,c);if(width!==undefined)part.w=width*1000;if(x!==undefined)part.x=x*1000;
   const mesh=syncIdentity.produce(site,()=>add(parent,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000));mesh.userData.cabinetShelf={column,shelf:index};return mesh;
  };
  const drawerFrame=depth=>{const v=C.drawerDepthLayout(f,depth*1000,c);return {depth:v.depth/1000,center:v.center/1000,rearCenter:v.rearCenter/1000};};
  const door=({pose,column,section,leaf,angle,site,color,glass=false,opacity=.32,roughness,faceSection=false})=>{
   const node=new THREE.Group();node.position.set(...pose.pivot.map(v=>v/1000));node.rotation[pose.axis]=angle?pose.sign*angle*Math.PI/180:0;
   node.userData.motion={kind:'cabinetdoor',column,section,leaf,axis:pose.axis,angle:pose.sign*C.maxDoorAngle(c,c.columns[column],section,leaf)*Math.PI/180};
   const face=syncIdentity.produce(site,()=>add(node,pose.width/1000,pose.height/1000,t,pose.localX/1000,pose.localBottom/1000,0,color));
   face.userData.cabinetDoorSize={width:pose.width,height:pose.height,leaf,section};if(faceSection)face.userData.cabinetSection=section;
   if(glass||options.doors==='ghost'){face.material=face.material.clone();Object.assign(face.material,{transparent:true,opacity:options.doors==='ghost'?.15:opacity,depthWrite:false});if(roughness!==undefined)face.material.roughness=roughness;face.userData.cabinetOwnMaterial=true;}
   return node;
  };
  const mountDoor=(parent,node,pose,part)=>{
   node.children.forEach(o=>o.position.z+=pose.localZ/1000);
   node.traverse(o=>{o.userData.cabinetPart={...part};if(options.doors==='ghost')o.userData.cabinetIgnorePick=true;});parent.add(node);return node;
  };
  const drawer=({column,depth,state})=>{
   const node=new THREE.Group(),travel=depth*.7;node.position.z=state.open?travel*(state.extension??1):0;
   node.userData.motion={kind:'cabinetdrawer',column,section:'storage',axis:'z',travel,closedZ:0};return node;
  };
  const mountDrawer=(parent,node,part)=>{node.traverse(o=>o.userData.cabinetPart={...part});parent.add(node);return node;};
  const drawerBox=(node,{width,x,bottom,height,depth,sites,sideScope})=>{
   const parts=C.drawerBoxParts(f,{width:width*1000,x:x*1000,bottom:bottom*1000,height:height*1000,depth:depth*1000},c);
   const emit=part=>syncIdentity.produce(sites[part.role],()=>add(node,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000)).userData.cabinetDrawerBoard=part.role;
   emit(parts[0]);
   for(const side of syncIdentity.items(sideScope,[['item-a',-1],['item-b',1]]))emit(parts.find(part=>part.role==='side'&&part.side===side));
   emit(parts.at(-1));
  };
  const handle=(parent,{kind='bar',site,x,y,z,vertical=false,width,barHeight=.15,depth=.025})=>{
   if(kind==='none')return;const knob=kind==='knob';
   const mesh=syncIdentity.produce(site,()=>add(parent,knob?.025:vertical?.012:width,knob?.025:vertical?barHeight:.012,knob?.025:depth,x,y,z,'#71685d'));
   if(knob){mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(.0125,12,8);}return mesh;
  };
  const complete=()=>{for(const [lower,upper]of splitPairs){const {furnishPartToken,furnishPartSource,furnishPartOrdinal,...metadata}=lower.userData;Object.assign(upper.userData,metadata);}};
  return {frame,board:add,rearPanel,shelf,shelfFrame,drawerFrame,door,mountDoor,drawer,mountDrawer,drawerBox,handle,complete};
 }

 function buildRaw(THREE,f,box,options={}){
  if(f.cabinet?.version===2){
   const B=root.FurnishCabinetBuilder||require('../core/cabinet-builder-core.js'),g=new THREE.Group();
   for(const p of B.derived(f)){
    const child=buildRaw(THREE,p.furniture,box,{...options,furniture:[],sideCuts:[]});child.position.set(p.x/1000,p.y/1000,p.z/1000);
    const ds=p.box.components.filter(v=>v.kind==='divider').sort((a,b)=>a.at-b.at);
    child.traverse(o=>{const data=o.userData;if(!data)return;const part=data.cabinetPart,shelf=data.cabinetShelf,divider=data.cabinetDivider,local=part?.column??shelf?.column??divider?.column??data.cabinetBay?.column??0,map=p.maps[local];
     const component=shelf?map?.shelves[shelf.shelf]:part?part.drawer!==undefined?map?.drawers:map?.door:divider?ds[divider.divider]:data.cabinetSection==='plinth'?p.box.components.find(v=>v.kind==='plinth'):null;
     data.cabinetBuilder={boxId:p.box.id,...(component?{componentId:component.id,kind:component.kind}:{kind:'box'})};
     if(o.isMesh&&data.furnishPartToken){const scopes=JSON.parse(data.furnishPartToken).map(v=>v.replace(/column:(\d+)/g,(_,i)=>'bay:'+p.maps[Number(i)]?.bay).replace(/shelf:(\d+)/g,(_,i)=>'shelf:'+map?.shelves[Number(i)]?.id));data.furnishPartToken=JSON.stringify(['builder:'+p.box.id,'component:'+(component?.id??'shell'),...scopes]);}
     for(const [key,value]of Object.entries(data))if(value&&typeof value==='object'&&Number.isInteger(value.column))data[key]={...value,column:value.column+p.column};
    });
    g.add(child);
    for(const part of B.trimParts(f).filter(v=>v.boxId===p.box.id)){const node=syncIdentity.produce('cabinet-builder:trim:'+part.boxId+':'+part.componentId,()=>box(part.w/1000,part.h/1000,part.d/1000,f.color,part.x/1000,part.bottom/1000,part.z/1000));node.userData.cabinetBuilder={boxId:part.boxId,componentId:part.componentId,kind:'trim'};node.userData.cabinetSideClosure=part.side;g.add(node);}
   }
   return g;
  }

  if(f.laundryFloorOpen)options={...options,floorOpen:true};
  const C=root.FurnishCabinet||(typeof require==='function'?require('../core/cabinet-core.js'):null),c=C.config(f),frame=C.carcassFrame(f,c),h=frame.height/1000,w=frame.width/1000,d=frame.depth/1000,t=frame.thickness/1000,p=frame.plinth/1000,g=new THREE.Group(),color=f.color||C.palette.front;
  if(c.tiers){
   for(const part of C.tierParts(f)){
    const child=syncIdentity.produce('cabinet-tier:'+part.key,()=>buildRaw(THREE,part.furniture,box,{...options,furniture:[],sideCuts:[]}));child.position.set(part.x/1000,part.bottom/1000,part.z/1000);
    child.traverse(o=>{if(o.userData.cabinetPart)o.userData.cabinetPart={...o.userData.cabinetPart,tier:part.key};o.userData.cabinetTier=part.key;});g.add(child);
   }
   const panels=C.endPanels(c);for(const side of ['left','right'])if(panels[side]){const size=panels[side]/1000,node=syncIdentity.produce('cabinet-tier:end-panel:'+side,()=>box(size,h,d,color,(side==='left'?-1:1)*(w-size)/2,0,0));node.userData.cabinetEndPanel=side;g.add(node);}
   for(const part of C.sideClosureParts(f,c)){const node=syncIdentity.produce('cabinet-tier:closure:'+part.tier+':'+part.side,()=>box(part.w/1000,part.h/1000,part.d/1000,color,part.x/1000,part.bottom/1000,part.z/1000));node.userData.cabinetSideClosure=part.side;g.add(node);}
   return g;
  }
  const assembly=C.pegboardParts(f,c),hasUpper=assembly?.upper!==false,hasLower=assembly?.lower!==false;
  const bookcase=(root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null))?.definition('bookshelf_yeswood_y52y09')?.bookcase,roundedBookcase=!!bookcase&&c.template===bookcase.template;
  const entryStyle=C.doorOverlay(f,c)!=='inset',faceInset=C.frontInset(f,c)/1000,wood=roundedBookcase?color:C.palette.body,bodyColor=wood,shared=C.sharedSides(f,options.furniture||[]),bodyDepth=frame.bodyDepth/1000,bodyZ=frame.bodyCenter/1000;
  const components=createComponents({THREE,C,f,c,box,options,bodyColor,roundedBookcase,bookcase,frame}),{board:add,rearPanel,shelfFrame,drawerFrame}=components;
  const closure=C.topClosure(c),panels=C.endPanels(c),composition=C.assemblyLayout(f,c);
  if(!options.skipSideClosures)for(const part of C.sideClosureParts(f,c)){
   const shade=C.sideClosureColor(f,part.column,c);
   const strip=syncIdentity.produce('cabinet-side-closure:'+part.side+':'+part.index,()=>add(g,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000,shade));
   strip.userData.cabinetSideClosure=part.side;strip.userData.cabinetBay={column:part.column};
  }
  if(closure.height&&!options.skipTopClosure){
   for(const part of C.topClosureParts(f,c)){
    const column=part.column;
    const face=c.columns[column],shade=face.doorColor||(face.finish==='wood'?wood:color);
    const strip=syncIdentity.produce('cabinet-top-closure:'+part.kind+':'+column,()=>add(g,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000,shade));
    strip.userData.cabinetTopClosure=true;strip.userData.cabinetClosureKind=part.kind;strip.userData.cabinetBay={column};
   }
  }
  if(c.boxConstruction==='independent'||C.hasLocalPlinth(c)){
   for(const part of C.boxParts(f,composition)){
    const child=syncIdentity.produce('cabinet-independent:box:'+part.column,()=>buildRaw(THREE,part.furniture,box,{...options,plinthProfile:part.plinthProfile,furniture:[],sideCuts:[],skipTopClosure:true,skipSideClosures:true}));
    child.position.x=part.center/1000;
    child.traverse(o=>{for(const [key,value] of Object.entries(o.userData))if(value&&typeof value==='object'&&Number.isInteger(value.column))o.userData[key]={...value,column:part.column+value.column,...(Number.isInteger(value.divider)?{divider:part.column+value.divider}:{})};if(o.userData.cabinetSide==='left'&&part.column>0)o.userData.cabinetDivider={divider:part.column-1,column:part.column-1};if(o.userData.cabinetSide==='right'&&part.column+part.count<c.columns.length)o.userData.cabinetDivider={divider:part.column+part.count-1,column:part.column+part.count-1};});
    g.add(child);
   }
   for(const side of ['left','right'])if(panels[side]){
    const thickness=panels[side]/1000,sign=side==='left'?-1:1;
    const panel=syncIdentity.produce('cabinet-independent:end-panel:'+side,()=>add(g,thickness,C.height(f)/1000,d,sign*(w-thickness)/2,0,0,C.frontColor(f,side==='left'?0:c.columns.length-1,c)));
    panel.userData.cabinetEndPanel=side;panel.userData.cabinetBay={column:side==='left'?0:c.columns.length-1};
   }
   return g;
  }
  const nominalBays=composition.compartments.map(part=>part.clear),faceSpan=i=>{const span=C.frontSpan(f,i,c);return {left:span.left/1000,right:span.right/1000};};
  const cuts=options.sideCuts||C.sideOpenings(f,options.furniture||[]);
  const finishes=C.joinedSideFinishes(f,options.furniture||[]);
  if(c.sideboard){
   const s=c.sideboard,bays=C.layout(f),base=s.baseHeight/1000,ct=s.counterThickness/1000,niche=base+ct,display=niche+s.nicheHeight/1000,upper=display+s.displayHeight/1000,ld=s.lowerDepth/1000,ud=s.upperDepth/1000,back=-d/2;
   const storage=bays.filter((_,i)=>!c.columns[i].fridgeBay),left=storage[0].left/1000-t,right=(storage.at(-1).left+storage.at(-1).width)/1000+t,W=right-left,X=(left+right)/2;
   // Continuous counter and open working space: no vertical partitions in the niche.
   for(const [y,H,D,section] of syncIdentity.items("cabinet-model.js:generator-1",[["item-a",[p,t,ld,'bottom']],["item-b",[base-t,t,ld,'baseTop']],["item-c",[base,ct,ld,'counter']],["item-d",[display,t,ud,'displayBottom']],["item-e",[upper,t,ud,'displayTop']],["item-f",[h-t,t,ud,'top']]])){
    // Structural boards stop at the same front plane as the sides. Only the
    // worktop spans the full nominal depth; doors occupy the front panel band.
    const boardDepth=section==='counter'?D:D-t;
    const board=syncIdentity.produce("cabinet-model:site-2",()=>add(g,W,H,boardDepth,X,y,back+boardDepth/2));board.userData.cabinetSection=section;
    const control=C.structuralBoards(f).find(b=>b.section===section);if(control)board.userData.cabinetInspect={kind:'structure',column:control.column,section};
   }
   if(p)syncIdentity.produce("cabinet-model:site-3",()=>add(g,W,p,ld-.025,X,0,back+(ld-.025)/2));
   const backLeft=left+(c.columns[0].fridgeBay?t:0),backRight=right-(c.columns.at(-1).fridgeBay?t:0);
   rearPanel(g,backRight-backLeft,s.nicheHeight/1000,(backLeft+backRight)/2,niche,'cabinet-model:site-4',{cabinetSection:'operationBack'});
   for(const [y,D] of syncIdentity.items("cabinet-model.js:generator-2",[["item-a",[display,ud]],["item-b",[upper,ud]]])){
    const led=syncIdentity.produce("cabinet-model:site-5",()=>add(g,W-2*t,.004,.012,X,y+.008,back+D-t-.014,'#ffe4ab'));led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.7;led.userData.cabinetOwnMaterial=true;led.userData.cabinetSection='led';
   }
   const door=(col,i,bottom,top,D,section,glass=false,span)=>{
    const kind=glass?C.displayDoor(col):col.door;if(kind==='none'||options.doors==='hidden')return;
    if(!glass&&c.topClosure&&Math.abs(top-h)<1e-8)top=C.topDoorLimit(f,c)/1000+faceInset;
    const nominal=span||bays[i],adjusted=!glass&&c.doorOverlay!==undefined?C.frontSpan(f,i,c):null,bay=adjusted?{left:adjusted.left,width:adjusted.right-adjusted.left}:nominal,count=kind==='double'?2:1,cw=bay.width/1000,leaf=cw/count;
    if(!glass&&c.doorOverlay!==undefined){bottom+=faceInset;top-=faceInset;}
    for(let j of syncIdentity.range("cabinet-model.js:generator-3",0,count,1,false)){
     const pose=C.doorPose(kind,bay.left,bay.left+bay.width,bottom*1000,top*1000,(back+D-t/2)*1000,j,count,C.doorPairing(col),C.doorSingleHinge(col,kind),glass?undefined:col.doorLayout,undefined,c.thickness),local=pose.localX/1000,localBottom=pose.localBottom/1000;
     const pivot=components.door({pose,column:i,section,leaf:j,angle:glass?C.displayAngle(c,col,j):C.doorAngle(c,col,section,j),site:'cabinet-model:site-6',color:glass?'#b3c5c8':col.doorColor||(col.finish==='wood'?wood:color),glass:glass||col.finish==='glass',opacity:.28,roughness:.12,faceSection:true});
     if(glass){for(const y of syncIdentity.items("cabinet-model.js:generator-4",[["item-a",localBottom],["item-b",localBottom+pose.height/1000-.018]]))syncIdentity.produce("cabinet-model:site-7",()=>add(pivot,leaf-.002,.018,t+.002,local,y,0,'#333738'));for(const sign of syncIdentity.items("cabinet-model.js:generator-5",[["item-a",-1],["item-b",1]]))syncIdentity.produce("cabinet-model:site-8",()=>add(pivot,.018,pose.height/1000,t+.002,local+sign*(leaf/2-.01),localBottom,0,'#333738'));}
     else if(col.handle!=='none'){const vertical=!C.verticalDoor(kind);components.handle(pivot,{kind:col.handle,site:'cabinet-model:site-9',vertical,width:.12,barHeight:.12,depth:.018,x:vertical?local+(pose.right?-1:1)*(leaf/2-.04):local,y:localBottom+(vertical?(top-bottom)/2:kind==='up'?.04:pose.height/1000-.04),z:.012});}
     components.mountDoor(g,pivot,pose,{column:i,section,leaf:j});
    }
   };
   syncIdentity.each("cabinet-model.js:generator-6",bays,(bay,i)=>{
    const col=c.columns[i],cw=bay.width/1000,x=bay.center/1000,drawerY=base-col.drawers.reduce((n,d)=>n+d.height,0)/1000;
    if(col.fridgeBay){
     const fh=s.fridgeHeight/1000,fd=(s.fridgeDepth??f.d)/1000,fz=back+fd/2;
     // Floor and rear remain clear for a separately placed refrigerator.
     for(const sign of syncIdentity.items("cabinet-model.js:generator-7",[["item-a",-1],["item-b",1]]))syncIdentity.produce("cabinet-model:site-10",()=>add(g,t,h,fd,x+sign*(cw/2+t/2),0,fz));
     const ceiling=syncIdentity.produce("cabinet-model:site-11",()=>add(g,cw,t,fd,x,fh,fz));ceiling.userData.cabinetSection='fridgeCeiling';ceiling.userData.cabinetInspect={kind:'structure',column:i,section:'fridgeCeiling'};syncIdentity.produce("cabinet-model:site-12",()=>add(g,cw,t,fd,x,h-t,fz));
     rearPanel(g,cw,h-fh-2*t,x,fh+t,'cabinet-model:site-13',{cabinetBay:{column:i}});syncIdentity.produce("cabinet-model.js:generator-call-1",()=>door(col,i,fh+t,h,fd,'fridgeUpper'));
    }else{
     for(const [bottom,top,D] of syncIdentity.items("cabinet-model.js:generator-8",[["item-a",[p+t,base-t,ld]],["item-b",[display+t,upper,ud]],["item-c",[upper+t,h-t,ud]]])){
      if(bottom!==display+t)rearPanel(g,cw,top-bottom,x,bottom,'cabinet-model:site-14',{cabinetBay:{column:i}});
      for(const sign of syncIdentity.items("cabinet-model.js:generator-9",[["item-a",-1],["item-b",1]])){
       const neighbor=i+(sign<0?-1:1);if(sign>0&&neighbor<bays.length&&!c.columns[neighbor].fridgeBay)continue;
       if(neighbor>=0&&neighbor<bays.length&&c.columns[neighbor].fridgeBay)continue;
       if(bottom===display+t&&neighbor>=0&&neighbor<bays.length&&C.sideboardDisplayGroups(f).some(group=>group.columns.includes(i)&&group.columns.includes(neighbor)))continue;
       const mesh=syncIdentity.produce("cabinet-model:site-15",()=>add(g,t,top-bottom,D-t,x+sign*(cw/2+t/2),bottom,back+(D-t)/2));if(neighbor>=0&&neighbor<bays.length)mesh.userData.cabinetDivider={divider:i-1,column:i-1};else mesh.userData.cabinetSide=sign<0?'left':'right';
      }
     }
     if(col.drawers.length){
      syncIdentity.produce("cabinet-model:site-16",()=>add(g,cw,t,shelfFrame(i,'lower').shelfDepth/1000,x,drawerY-t,shelfFrame(i,'lower').shelfCenter/1000)).userData.cabinetSection='drawerSeparator';
      syncIdentity.produce("cabinet-model:site-17",()=>add(g,cw,.012,.008,x,drawerY-.012,back+ld-t+.004,'#71685d')).userData.cabinetSection='drawerGrip';
      const dh=col.drawers[0].height/1000,lanes=C.drawerCount(col),span=faceSpan(i);
      for(let lane of syncIdentity.range("cabinet-model.js:generator-10",1,lanes,1,false))syncIdentity.produce("cabinet-model:site-18",()=>add(g,t,dh-t,shelfFrame(i,'lower').shelfDepth/1000,x+(lane-lanes/2)*(cw+t)/lanes,drawerY,shelfFrame(i,'lower').shelfCenter/1000)).userData.cabinetDrawerDivider=true;
      for(let lane of syncIdentity.range("cabinet-model.js:generator-11",0,lanes,1,false)){
       const laneW=(cw-(lanes-1)*t)/lanes,laneX=x+(lane-(lanes-1)/2)*(laneW+t),faceW=(span.right-span.left)/lanes,faceX=span.left+faceW*(lane+.5),state=C.drawerState(col.drawers[0],lane),node=components.drawer({column:i,depth:ld,state}),faceColor=col.doorColor||(col.finish==='wood'?wood:color),bodyH=dh-t;
       syncIdentity.produce("cabinet-model:site-19",()=>add(node,faceW-.002,bodyH-.002,t,faceX,drawerY+.001,back+ld-t/2,faceColor)).userData.cabinetDrawerBoard='front';
       components.drawerBox(node,{width:laneW,x:laneX,bottom:drawerY,height:bodyH,depth:ld,sites:{bottom:'cabinet-model:site-20',side:'cabinet-model:site-21',back:'cabinet-model:site-22'},sideScope:'cabinet-model.js:generator-12'});
       if(col.handle!=='none')components.handle(node,{kind:col.handle,site:'cabinet-model:site-23',width:Math.min(.14,faceW*.4),depth:.018,x:faceX,y:drawerY+bodyH*.7,z:back+ld-.009});
       components.mountDrawer(g,node,{column:i,drawer:0,lane});
      }
     }
     syncIdentity.produce("cabinet-model.js:generator-call-2",()=>door(col,i,p,drawerY-(col.drawers.length?.012:0),ld,'lower'));syncIdentity.produce("cabinet-model.js:generator-call-3",()=>door(col,i,upper,h,ud,'upper'));
    }
    syncIdentity.each("cabinet-model.js:generator-13",col.shelves,(y,j)=>components.shelf(g,i,j,'cabinet-model:site-24',{width:cw,x}),(item,slot)=>item?.partId||"shelf:"+slot);
   },(_,column)=>"column:"+column);
   for(const group of syncIdentity.records("cabinet-model.js:generator-14",C.sideboardDisplayGroups(f))){rearPanel(g,group.width/1000,upper-display-t,(group.left+group.width/2)/1000,display+t,'cabinet-model:site-25',{cabinetBay:{column:group.column}});syncIdentity.produce("cabinet-model.js:generator-call-4",()=>door(c.columns[group.column],group.column,display,upper,ud,'display',true,group));}
   if(options.outlines)g.traverse(o=>{if(o.isMesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x493b2d,transparent:true,opacity:.9}));edge.userData.cabinetOwnMaterial=true;o.add(edge);}});
   return g;
  }
  // Split only the affected rectangle, retaining boards around a partial-depth hole.
  const sideBoard=(side,W,H,D,x,y,z,shade=bodyColor)=>{
   if(assembly?.[side]===false)return [];
   const joint=shared.find(v=>v.side===side);if(joint&&!joint.owner)return [];
   // Keep a wood rear edge inside each opening so adjacent backboards meet.
   // Removing the entire depth exposed a white slit between two cabinet backs.
   const relevant=cuts.filter(cut=>cut.side===side).map(cut=>({...cut,back:cut.back+c.thickness,bottom:cut.bottom-(joint?.owner?c.thickness:0),top:cut.top+(joint?.owner?c.thickness:0)})),ys=[y,y+H],zs=[z-D/2,z+D/2];
   const sideFinishes=finishes.filter(v=>v.side===side);for(const finish of sideFinishes)for(const value of [finish.bottom/1000,finish.top/1000])if(value>y&&value<y+H)ys.push(value);
   for(const cut of relevant){for(const value of [cut.bottom/1000,cut.top/1000])if(value>y&&value<y+H)ys.push(value);for(const value of [cut.back/1000,cut.front/1000])if(value>z-D/2&&value<z+D/2)zs.push(value);}
   ys.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);const parts=[];
   for(let i of syncIdentity.range("cabinet-model.js:generator-15",0,ys.length-1,1,false))for(let j of syncIdentity.range("cabinet-model.js:generator-16",0,zs.length-1,1,false)){const cy=(ys[i]+ys[i+1])/2,cz=(zs[j]+zs[j+1])/2;if(ys[i+1]-ys[i]<1e-8||zs[j+1]-zs[j]<1e-8||relevant.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000&&cz>=v.back/1000&&cz<=v.front/1000))continue;const rearEdge=relevant.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000&&cz<v.back/1000&&cz>=(v.back-c.thickness)/1000),joinedWood=sideFinishes.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000),mesh=syncIdentity.produce("cabinet-model:site-26",()=>add(g,W,ys[i+1]-ys[i],zs[j+1]-zs[j],x,ys[i],cz,rearEdge||joinedWood?wood:shade));mesh.userData.cabinetSide=side;if(joint)mesh.userData.cabinetSharedSide=true;if(rearEdge)mesh.userData.cabinetNicheRearEdge=true;parts.push(mesh);}return parts;
  };
  if(c.entry){
   const e=c.entry,shoe=p+e.shoeHeight/1000,lower=shoe+e.lowerHeight/1000,upper=lower+e.nicheHeight/1000,bays=C.layout(f);
   for(const joint of shared){const bay=bays[joint.side==='left'?0:bays.length-1];bay.width+=c.thickness;if(joint.side==='left')bay.left-=c.thickness;bay.center=bay.left+bay.width/2;}
   const interiorLeft=-w/2+(shared.some(v=>v.side==='left')?0:t),interiorRight=w/2-(shared.some(v=>v.side==='right')?0:t),interiorWidth=interiorRight-interiorLeft,interiorX=(interiorRight+interiorLeft)/2;
   // Zero-plinth shoe bays open directly onto the finished floor.
   const shoeBase=p?p+t:0;
   if(p){syncIdentity.produce("cabinet-model:site-27",()=>add(g,w,p,d-(options.plinthProfile?.inset??40)/1000,0,0,-(options.plinthProfile?.inset??40)/2000,wood));syncIdentity.produce("cabinet-model:site-28",()=>add(g,w,t,bodyDepth,0,p,bodyZ));}syncIdentity.produce("cabinet-model:site-29",()=>add(g,w,t,bodyDepth,0,h-t,bodyZ));
   for(const [side,sign] of syncIdentity.items("cabinet-model.js:generator-17",[["item-a",['left',-1]],["item-b",['right',1]]]))syncIdentity.produce("cabinet-model.js:generator-call-5",()=>sideBoard(side,t,h-t-shoeBase,bodyDepth,sign*(w/2-t/2),shoeBase,bodyZ));
   const extra=side=>Math.max(0,...finishes.filter(v=>v.side===side).map(v=>v.gap))/1000,edge=side=>{const common=shared.some(v=>v.side===side),open=e.openSide===side||e.openSide==='both';return open?t+extra(side)+(common?t:0):common?t:0;},leftEdge=edge('left'),rightEdge=edge('right');
   for(const level of syncIdentity.items("cabinet-model.js:generator-18",[["item-a",p+e.shoeHeight/2000],["item-b",shoe],["item-c",lower],["item-d",upper+t]].filter(([key])=>key!=="item-a"||C.entryShoeShelf(c)))){const niche=level===lower||level===upper+t,counter=level===lower;const shelf=syncIdentity.produce("cabinet-model:site-30",()=>add(g,niche?w-2*t+leftEdge+rightEdge:interiorWidth,t,shelfFrame(0,counter?'niche':level===upper+t?'upper':'lower').shelfDepth/1000,niche?(rightEdge-leftEdge)/2:interiorX,level-t,shelfFrame(0,counter?'niche':level===upper+t?'upper':'lower').shelfCenter/1000,wood));if(niche)shelf.userData.cabinetNicheSurface=counter?'counter':'ceiling';const section=level===shoe?'entryLowerBase':counter?'entryCounter':level===upper+t?'entryUpperBase':null;if(section)shelf.userData.cabinetInspect={kind:'structure',column:0,section};}
   rearPanel(g,interiorWidth,e.nicheHeight/1000,interiorX,lower,'cabinet-model:site-31',{},wood);
   rearPanel(g,interiorWidth,shoe-shoeBase,interiorX,shoeBase,'cabinet-model:site-32',{},wood);
   const led=syncIdentity.produce("cabinet-model:site-33",()=>add(g,w-2*t,.004,.012,0,upper-.01,d/2-t-.012,'#ffe4ab'));led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
   syncIdentity.each("cabinet-model.js:generator-19",c.columns,(col,i)=>{
    const bay=bays[i],cw=bay.width/1000,x=bay.center/1000,drawerY=lower-col.drawers.reduce((n,v)=>n+v.height,0)/1000,faceColor=col.doorColor||(col.finish==='wood'?wood:color==='#d5c4bb'?'#f3f1ec':color),span=faceSpan(i),faceW=span.right-span.left,faceX=(span.left+span.right)/2;
    const handle=(parent,X,Y,Z,vertical=false)=>components.handle(parent,{kind:col.handle||'bar',site:'cabinet-model:site-34',x:X,y:Y,z:Z,vertical,width:Math.min(.14,faceW*.4)});
    for(const [bottom,top] of syncIdentity.items("cabinet-model.js:generator-20",[["item-a",[shoe,lower-t]],["item-b",[upper+t,h-t]]]))rearPanel(g,cw,top-bottom,x,bottom,'cabinet-model:site-35',{cabinetBay:{column:i}});
    if(i)for(const [bottom,top] of syncIdentity.items("cabinet-model.js:generator-21",[["item-a",[shoe,lower-t]],["item-b",[upper+t,h-t]]]))syncIdentity.produce("cabinet-model:site-36",()=>add(g,t,top-bottom,shelfFrame(i,'lower').shelfDepth/1000,bay.left/1000-t/2,bottom,shelfFrame(i,'lower').shelfCenter/1000)).userData.cabinetDivider={divider:i-1,column:i-1};
    syncIdentity.each("cabinet-model.js:generator-22",col.shelves,(y,j)=>components.shelf(g,i,j,'cabinet-model:site-37',{width:cw,x}),(item,slot)=>item?.partId||"shelf:"+slot);
    let y=drawerY;const lanes=C.drawerCount(col);for(let lane of syncIdentity.range("cabinet-model.js:generator-23",1,lanes,1,false))if(col.drawers.length)syncIdentity.produce("cabinet-model:site-38",()=>add(g,t,lower-drawerY-t,shelfFrame(i,'lower').shelfDepth/1000,x+(lane-lanes/2)*(cw+t)/lanes,drawerY,shelfFrame(i,'lower').shelfCenter/1000)).userData.cabinetDrawerDivider=true;syncIdentity.each("cabinet-model.js:generator-24",col.drawers,(drawer,j)=>{const dh=drawer.height/1000;for(let lane of syncIdentity.range("cabinet-model.js:generator-25",0,lanes,1,false)){const cw=(bay.width/1000-(lanes-1)*t)/lanes,x=bay.center/1000+(lane-(lanes-1)/2)*(cw+t),faceW=(span.right-span.left)/lanes,faceX=span.left+faceW*(lane+.5),state=C.drawerState(drawer,lane),bodyH=dh-(j===col.drawers.length-1?t:0),node=components.drawer({column:i,depth:d,state});
     syncIdentity.produce("cabinet-model:site-39",()=>add(node,faceW-.002,bodyH-.002,t,faceX,y+.001,d/2-t/2,faceColor)).userData.cabinetDrawerBoard='front';
     components.drawerBox(node,{width:cw,x,bottom:y,height:bodyH,depth:d,sites:{bottom:'cabinet-model:site-40',side:'cabinet-model:site-41',back:'cabinet-model:site-42'},sideScope:'cabinet-model.js:generator-26'});
     syncIdentity.produce("cabinet-model.js:generator-call-6",()=>handle(node,faceX,y+bodyH*.7,d/2+.012));components.mountDrawer(g,node,{column:i,drawer:j,lane});}y+=dh;},(item,slot)=>item?.partId||"drawer:"+slot);
    if(col.door==='none'||options.doors==='hidden')return;
    for(const [bottom,top,section] of syncIdentity.items("cabinet-model.js:generator-27",[["item-a",[C.entryLowerDoorBounds(f,i,c).bottom/1000,C.entryLowerDoorBounds(f,i,c).top/1000,'lower']],["item-b",[upper+faceInset,C.topDoorLimit(f,c)/1000,'upper']]])){
     const count=col.door==='double'?2:1,leaf=faceW/count;
     for(let j of syncIdentity.range("cabinet-model.js:generator-28",0,count,1,false)){const pose=C.doorPose(col.door,span.left*1000,span.right*1000,bottom*1000,top*1000,(d/2-t/2)*1000,j,count,C.doorPairing(col),C.doorSingleHinge(col,col.door),col.doorLayout,undefined,c.thickness),pivot=components.door({pose,column:i,section,leaf:j,angle:C.doorAngle(c,col,section,j),site:'cabinet-model:site-43',color:faceColor,glass:col.finish==='glass',faceSection:true});
      const local=pose.localX/1000,vertical=!C.verticalDoor(col.door);syncIdentity.produce("cabinet-model.js:generator-call-7",()=>handle(pivot,vertical?local+(pose.right?-1:1)*(leaf/2-.04):local,pose.localBottom/1000+(vertical?(top-bottom)*.5:col.door==='up'?.04:pose.height/1000-.04),.025,vertical));
      components.mountDoor(g,pivot,pose,{column:i,section,leaf:j});
     }
    }
   },(item,slot)=>item?.partId||"column:"+slot);
   if(options.outlines)g.traverse(o=>{if(o.isMesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x493b2d,transparent:true,opacity:.9}));edge.userData.cabinetOwnMaterial=true;o.add(edge);}});return g;
  }
  if(hasLower&&!options.floorOpen){const part=C.plinthPart(f,c,options.plinthProfile);if(part)syncIdentity.produce('cabinet-model:site-44',()=>add(g,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000,wood)).userData.cabinetSection='plinth';}
  const movable=col=>col.top==='drawer';
  if(c.hoodBayHeight!==undefined){const bays=C.layout(f),bay=bays[1];for(const i of syncIdentity.items("cabinet-model.js:generator-29",[["item-a",0],["item-b",2]])){const left=i===0?-w/2:(bay.left+bay.width)/1000,right=i===2?w/2:bay.left/1000;syncIdentity.produce("cabinet-model:site-45",()=>add(g,right-left,t,bodyDepth,(left+right)/2,p,bodyZ)).userData.cabinetSection='hoodSideBottom';}if(C.hoodBayCeiling(f,c))syncIdentity.produce("cabinet-model:site-46",()=>add(g,bay.width/1000,t,bodyDepth,bay.center/1000,c.hoodBayHeight/1000,bodyZ)).userData.cabinetSection='hoodCeiling';}
  else if(hasLower&&!options.floorOpen){
   for(const part of C.bottomParts(f,c))syncIdentity.produce(part.site,()=>add(g,part.w/1000,part.h/1000,part.d/1000,part.x/1000,part.bottom/1000,part.z/1000)).userData.cabinetSection='bottom';
  }if(hasUpper&&!c.columns.some(movable))syncIdentity.produce("cabinet-model:site-48",()=>add(g,w,t,bodyDepth,0,h-t,bodyZ)).userData.cabinetTop=true;
  const bays=C.layout(f),inner=h-p-2*t;
  syncIdentity.each("cabinet-model.js:generator-30",bays,(bay,i)=>{
   if(!movable(c.columns[i])){
    const col=c.columns[i],cw=bay.width/1000,x=bay.center/1000,base=p+t;
    if(!col.pegboard){const start=c.hoodBayHeight!==undefined&&i===1?c.hoodBayHeight/1000+t:col.bottomPanel===false?0:base;rearPanel(g,cw,h-t-start,x,start,'cabinet-model:site-49',{cabinetBay:{column:i}});}
    else{
     const bottom=col.drawers.reduce((n,v)=>n+v.height,0)/1000,top=col.doorBottom/1000-t,H=top-bottom,wood='#bc936b';
     if(hasLower&&bottom>0)rearPanel(g,cw,bottom,x,base,'cabinet-model:site-50',{},wood,'surround');
     if(hasUpper)rearPanel(g,cw,inner-top,x,base+top,'cabinet-model:site-51',{},wood,'surround');
     const grid=C.pegboardHoles(f,i,c),radius=grid.diameter/2000,panelThickness=C.backThickness(c,'pegboard')/1000,hatches=C.pegboardHatches(f,i,c);
     const holes=[];for(let a=0;a<grid.columns;a++)for(let b=0;b<grid.rows;b++)holes.push([-cw/2+(grid.marginX+grid.pitchX*a)/1000,(grid.marginY+grid.pitchY*b)/1000]);
     function panel(parent,rect,originX=0,originY=0,moving=false,openings=[]){
      const [left,right,bottom,top]=rect;if(right-left<1e-8||top-bottom<1e-8||panelThickness<=0)return;
      const shape=new THREE.Shape();shape.moveTo(left-originX,bottom-originY);shape.lineTo(right-originX,bottom-originY);shape.lineTo(right-originX,top-originY);shape.lineTo(left-originX,top-originY);shape.closePath();
      for(const opening of openings){const [l,r,b,t]=opening,hole=new THREE.Path();hole.moveTo(l,b);hole.lineTo(l,t);hole.lineTo(r,t);hole.lineTo(r,b);hole.closePath();shape.holes.push(hole);}
      for(const [hx,hy] of holes)if(hx-radius>left&&hx+radius<right&&hy-radius>bottom&&hy+radius<top&&openings.every(opening=>hx+radius<opening[0]||hx-radius>opening[1]||hy+radius<opening[2]||hy-radius>opening[3])){const hole=new THREE.Path();hole.absarc(hx-originX,hy-originY,radius,0,Math.PI*2,true);shape.holes.push(hole);}
      const mesh=syncIdentity.produce("cabinet-model:site-52",()=>add(parent,right-left,top-bottom,panelThickness,0,0,0,wood));mesh.geometry.dispose();mesh.geometry=new THREE.ExtrudeGeometry(shape,{depth:panelThickness,bevelEnabled:false,curveSegments:8});mesh.position.set(moving?0:x,moving?0:base+col.drawers.reduce((n,v)=>n+v.height,0)/1000,moving?-panelThickness:-d/2+t);mesh.userData.cabinetBay={column:i};mesh.userData.cabinetPegboard=true;mesh.userData.cabinetBack={kind:'pegboard',thickness:panelThickness*1000};
      if(moving){mesh.userData.cabinetPart={column:i,section:'pegboardHatch'};if(options.doors==='ghost'){mesh.material=mesh.material.clone();mesh.material.transparent=true;mesh.material.opacity=.15;mesh.userData.cabinetOwnMaterial=true;}}
     }
     if(!hatches.length)syncIdentity.produce("cabinet-model.js:generator-call-8",()=>panel(g,[-cw/2,cw/2,0,H]));
     else{
      const openings=hatches.map(h=>{const left=h.left/1000-x,bottom=h.bottom/1000-(base+col.drawers.reduce((n,v)=>n+v.height,0)/1000);return [left,left+h.w/1000,bottom,bottom+h.h/1000];});
      syncIdentity.produce("cabinet-model.js:generator-call-9",()=>panel(g,[-cw/2,cw/2,0,H],0,0,false,openings));
      if(options.doors!=='hidden')for(const hatch of syncIdentity.records('cabinet-model:pegboard-hatches',hatches,(h)=>'leaf:'+h.leaf)){
       const [left,right,bottom,top]=openings[hatch.leaf],gap=hatch.gap/1000,hinge=hatch.hinge==='left'?left+gap:right-gap,sign=hatch.hinge==='left'?-1:1,pivot=new THREE.Group();
       pivot.position.set(x+hinge,base+col.drawers.reduce((n,v)=>n+v.height,0)/1000+bottom+gap,-d/2+t+panelThickness);pivot.rotation.y=hatch.open?sign*hatch.angle*Math.PI/180:0;
       const part={column:i,section:'pegboardHatch',leaf:hatch.leaf};pivot.userData.motion={kind:'cabinetdoor',...part,axis:'y',angle:sign*hatch.angle*Math.PI/180};pivot.userData.cabinetPart=part;
       syncIdentity.produce("cabinet-model.js:generator-call-10",()=>panel(pivot,[left+gap,right-gap,bottom+gap,top-gap],hinge,bottom+gap,true));pivot.children.forEach(n=>{if(n.userData.cabinetPart)n.userData.cabinetPart=part;});g.add(pivot);
      }
     }
     if(!entryStyle)for(const side of syncIdentity.items("cabinet-model.js:generator-31",[["item-a",-1],["item-b",1]])){const outer=side<0&&i===0||side>0&&i===bays.length-1;if(outer)syncIdentity.produce("cabinet-model.js:generator-call-11",()=>sideBoard(side<0?'left':'right',.006,H,d-t,x+side*(cw/2-.003),base+bottom,t/2,wood));else syncIdentity.produce("cabinet-model:site-53",()=>add(g,.006,H,d-t,x+side*(cw/2-.003),base+bottom,t/2,wood));}
     if(hasLower)syncIdentity.produce("cabinet-model:site-54",()=>add(g,cw,t,d-t,x,base+bottom-(entryStyle?t:0),t/2,wood));
     if(hasUpper)syncIdentity.produce("cabinet-model:site-55",()=>add(g,cw,.006,shelfFrame(i,'upper').shelfDepth/1000,x,base+top-.006,shelfFrame(i,'upper').shelfCenter/1000,wood));
     if(assembly?.displayShelves!==false)for(const level of syncIdentity.items("cabinet-model.js:generator-32",[["item-a",.68],["item-b",.8]]))syncIdentity.produce("cabinet-model:site-56",()=>add(g,cw*.72,.015,Math.min(.12,d-3*t),x-cw*.1,base+bottom+H*level,-d/2+t+.06,wood)).userData.cabinetAccessory='displayShelf';
     if(assembly?.hooks!==false)for(const offset of syncIdentity.items("cabinet-model.js:generator-33",[["item-a",-.28],["item-b",0],["item-c",.28]])){syncIdentity.produce("cabinet-model:site-57",()=>add(g,.012,.06,.012,x+cw*offset,base+bottom+H*.48,-d/2+t+.018,'#806647')).userData.cabinetAccessory='hook';syncIdentity.produce("cabinet-model:site-58",()=>add(g,.012,.012,.045,x+cw*offset,base+bottom+H*.48,-d/2+t+.035,'#806647')).userData.cabinetAccessory='hook';}
     if(assembly?.light!==false){const led=syncIdentity.produce("cabinet-model:site-59",()=>add(g,cw-.025,.004,.012,x,base+top-.01,d/2-t-.012,'#ffe4ab'));led.userData.cabinetAccessory='light';led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
     }
    }
   }
   const sideBase=c.columns[i].bottomPanel===false||i>0&&c.columns[i-1].bottomPanel===false?0:p+(options.floorOpen?0:t);
   if(!i)syncIdentity.produce("cabinet-model.js:generator-call-12",()=>sideBoard('left',t,h-t-sideBase,bodyDepth,bay.left/1000-t/2,sideBase,bodyZ));else syncIdentity.produce("cabinet-model:site-60",()=>add(g,t,h-t-sideBase,bodyDepth,bay.left/1000-t/2,sideBase,bodyZ)).userData.cabinetDivider={divider:i-1,column:i-1};
  },(_,column)=>"column:"+column);
  {const sideBase=c.columns.at(-1).bottomPanel===false?0:p+(options.floorOpen?0:t);syncIdentity.produce("cabinet-model.js:generator-call-13",()=>sideBoard('right',t,h-t-sideBase,bodyDepth,w/2-t/2,sideBase,bodyZ));}
  syncIdentity.each("cabinet-model.js:generator-34",c.columns,(col,i)=>{
   const cw=bays[i].width/1000,x=bays[i].center/1000,base=p+t;
   const handle=col.handle||'bar',faceColor=C.frontColor(f,i,c);
   if(c.columns.some(movable)){
    const left=(i===0?-w/2:(bays[i].left-c.thickness/2)/1000),right=(i===bays.length-1?w/2:(bays[i].left+bays[i].width+c.thickness/2)/1000),W=right-left-.002;
    if(movable(col)){
     // Top, front and tray share one horizontal drawer translation.
     const lid=new THREE.Group();lid.position.set((left+right)/2,h-t,d/2+(col.top==='drawer'&&col.topOpen?d*.7:0));
     lid.userData.motion={kind:'cabinetdrawer',column:i,section:'storage',axis:'z',travel:d*.7,closedZ:d/2};
     const gap=(col.cableGap||0)/1000,rear=-d+gap,notch=Math.min(.12,W*.35),cut=gap?Math.min(.015,d*.05):0,shape=new THREE.Shape();
     shape.moveTo(-W/2,0);shape.lineTo(W/2,0);shape.lineTo(W/2,rear);shape.lineTo(notch/2+.015,rear);shape.lineTo(notch/2,rear+cut);shape.lineTo(-notch/2,rear+cut);shape.lineTo(-notch/2-.015,rear);shape.lineTo(-W/2,rear);shape.closePath();
     const face=syncIdentity.produce("cabinet-model:site-61",()=>add(lid,W,t,d,0,0,-d/2));face.geometry.dispose();face.geometry=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false});face.geometry.rotateX(Math.PI/2);face.position.set(0,t,0);face.userData.cabinetPart={column:i,lid:true};g.add(lid);
     if(col.top==='drawer'){
      const span=faceSpan(i),bottom=p+faceInset,top=h-t;
      syncIdentity.produce("cabinet-model:site-62",()=>add(lid,entryStyle?span.right-span.left-.002:cw-.004,entryStyle?top-bottom-.002:inner,t,entryStyle?(span.left+span.right)/2-(left+right)/2:0,entryStyle?bottom+.001-(h-t):-inner,-t/2,faceColor)).userData.cabinetDrawerBoard='front';
      // Tray front ends at the front panel's inner face (local Z = -t).
      const depth=d-3*t,center=-d/2+t/2;
      syncIdentity.produce("cabinet-model:site-63",()=>add(lid,cw-2*t,.012,depth,0,-inner+.012,center)).userData.cabinetDrawerBoard='bottom';
      for(const side of syncIdentity.items("cabinet-model.js:generator-35",[["item-a",-1],["item-b",1]]))syncIdentity.produce("cabinet-model:site-64",()=>add(lid,t,Math.max(.04,inner-.04),depth,side*(cw/2-t),-inner+.024,center)).userData.cabinetDrawerBoard='side';
      lid.traverse(o=>o.userData.cabinetPart={column:i,lid:true});
     }else syncIdentity.produce("cabinet-model:site-65",()=>add(g,cw,inner,t,x,base,d/2-t/2,faceColor));
    }else syncIdentity.produce("cabinet-model:site-66",()=>add(g,W,t,d,(left+right)/2,h-t,0));
   }
   const handleMesh=(parent,X,Y,Z,vertical=false)=>components.handle(parent,{kind:handle,site:'cabinet-model:site-67',x:X,y:Y,z:Z,vertical,width:Math.min(.14,cw*.4)});
   if(hasUpper)syncIdentity.each("cabinet-model.js:generator-36",col.shelves,(y,j)=>{if(c.stackedBoxes&&j===col.shelves.length-1)return;components.shelf(g,i,j,'cabinet-model:site-68',{width:cw,x});},(item,slot)=>item?.partId||"shelf:"+slot);
   if(c.stackedBoxes&&i===0){
    const bottom=base+col.shelves.at(-1)/1000;
    const lower=syncIdentity.produce('cabinet-stacked:lower-top',()=>add(g,w-2*t,t,bodyDepth,0,bottom,bodyZ));lower.userData.cabinetShelf={column:0,shelf:col.shelves.length-1};lower.userData.cabinetStackedShelf={column:0,count:c.columns.length,shelves:c.columns.map(col=>col.shelves.length-1)};
    const upper=syncIdentity.produce('cabinet-stacked:upper-bottom',()=>add(g,w-2*t,t,bodyDepth,0,bottom+t,bodyZ));upper.userData.cabinetStackedBottom={column:0};upper.userData.cabinetBay={column:0};
   }
   const hanging=C.hangingLayout(f,i,c);
   if(hanging)syncIdentity.each('wardrobe-hanging:rods',hanging.rods,(r,j)=>{
    const rod=syncIdentity.produce('wardrobe-hanging:rod',()=>add(g,r.w/1000,r.size/1000,r.size/1000,r.x/1000,(r.y-r.size/2)/1000,r.z/1000,'#b9bec1'));
    rod.userData.cabinetHangingRod={column:i,rod:j};rod.userData.cabinetBay={column:i};
   },(_,slot)=>'rod:'+slot);
   let y=base;const drawerGeometry=drawerFrame(d),lanes=C.drawerCount(col),drawerHeight=col.drawers.reduce((sum,v)=>sum+v.height,0)/1000;for(let lane of syncIdentity.range("cabinet-model.js:generator-37",1,lanes,1,false))if(hasLower&&drawerHeight)syncIdentity.produce("cabinet-model:site-69",()=>add(g,t,drawerHeight,shelfFrame(i,'drawers').shelfDepth/1000,x+(lane-lanes/2)*(cw+t)/lanes,base,shelfFrame(i,'drawers').shelfCenter/1000)).userData.cabinetDrawerDivider=true;
   if(hasLower)syncIdentity.each("cabinet-model.js:generator-38",col.drawers,(drawer,j)=>{
    const dh=drawer.height/1000;for(let lane of syncIdentity.range("cabinet-model.js:generator-39",0,lanes,1,false)){const cw=(bays[i].width/1000-(lanes-1)*t)/lanes,x=bays[i].center/1000+(lane-(lanes-1)/2)*(cw+t),state=C.drawerState(drawer,lane),node=components.drawer({column:i,depth:d,state});
    const fullSpan=faceSpan(i),span={left:fullSpan.left+(fullSpan.right-fullSpan.left)*lane/lanes,right:fullSpan.left+(fullSpan.right-fullSpan.left)*(lane+1)/lanes},frontBottom=entryStyle&&j===0?p+(c.template==='tv-floor'?faceInset:0):y,bodyDh=dh-(entryStyle&&j===col.drawers.length-1?t:0);
    if(col.drawerStyle==='dish-basket'){
     // Two exterior fronts; the third runner carries a recessed cutlery tray.
     const hidden=j===2,top=j===1?C.frontHeight(f,c)/1000-faceInset:y+dh;
     if(!hidden){syncIdentity.produce("cabinet-model:site-70",()=>add(node,span.right-span.left-.002,top-frontBottom-.002,t,(span.left+span.right)/2,frontBottom+.001,d/2-t/2,faceColor)).userData.cabinetDrawerBoard='front';syncIdentity.produce("cabinet-model.js:generator-call-14",()=>handleMesh(node,x,frontBottom+(top-frontBottom)*.7,d/2+.012));}
     const width=cw-.024,inset=Math.min(.016,(drawerGeometry.depth)*.3),depth=drawerGeometry.depth-inset,center=drawerGeometry.center-inset/2,rear=center-depth/2,front=center+depth/2,railH=Math.min(dh-.03,hidden?.055:.15),metal='#b8bdc1';
     const bar=(W,H,D,X,Y,Z,part)=>{const mesh=syncIdentity.produce("cabinet-model:site-71",()=>add(node,W,H,D,X,Y,Z,metal));mesh.userData.cabinetBasketPart=part;mesh.material=mesh.material.clone();mesh.material.metalness=.65;mesh.material.roughness=.28;mesh.userData.cabinetOwnMaterial=true;return mesh;};
     syncIdentity.produce("cabinet-model.js:generator-call-15",()=>bar(width,.005,depth,x,y+.012,center,'tray'));
     for(const side of syncIdentity.items("cabinet-model.js:generator-40",[["item-a",-1],["item-b",1]])){syncIdentity.produce("cabinet-model.js:generator-call-16",()=>bar(.006,railH,depth,x+side*width/2,y+.017,center,'side'));syncIdentity.produce("cabinet-model.js:generator-call-17",()=>bar(.009,.012,depth,x+side*(width/2+.004),y+.023,center,'runner'));}
     for(const Z of syncIdentity.items("cabinet-model.js:generator-41",[["item-a",rear],["item-b",front]]))syncIdentity.produce("cabinet-model.js:generator-call-18",()=>bar(width,.008,.005,x,y+.017+railH-.008,Z,'rim'));
     if(hidden){for(let divider of syncIdentity.range("cabinet-model.js:generator-42",1,4,1,false))syncIdentity.produce("cabinet-model.js:generator-call-19",()=>bar(.004,railH*.65,depth,x-width/2+width*divider/4,y+.017,center,'cutlery-divider'));syncIdentity.produce("cabinet-model.js:generator-call-20",()=>bar(width,railH*.65,.005,x,y+.017,front,'inner-front'));}
     else {const count=Math.min(20,Math.max(4,Math.round(width/.055)));for(let rack of syncIdentity.range("cabinet-model.js:generator-43",1,count,1,false)){const X=x-width/2+width*rack/count;syncIdentity.produce("cabinet-model.js:generator-call-21",()=>bar(.004,.004,depth,X,y+.018,center,'rack'));if(j===0)syncIdentity.produce("cabinet-model.js:generator-call-22",()=>bar(.004,railH*.65,.004,X,y+.019,rear+.012,'plate-divider'));}}
     components.mountDrawer(g,node,{column:i,drawer:j,lane});continue;
    }
    const frontTop=c.template==='tv-floor'&&j===col.drawers.length-1?h-t:C.kitchenOverlay(f,c)&&col.door==='none'&&j===col.drawers.length-1?C.frontHeight(f,c)/1000-faceInset:y+bodyDh;
    syncIdentity.produce("cabinet-model:site-72",()=>add(node,entryStyle?span.right-span.left-.002:cw-.004,entryStyle?frontTop-frontBottom-.002:dh-.004,t,entryStyle?(span.left+span.right)/2:x,entryStyle?frontBottom+.001:y,d/2-t/2,faceColor)).userData.cabinetDrawerBoard='front';
    components.drawerBox(node,{width:cw,x,bottom:y,height:bodyDh,depth:d,sites:{bottom:'cabinet-model:site-73',side:'cabinet-model:site-74',back:'cabinet-model:site-75'},sideScope:'cabinet-model.js:generator-44'});
    syncIdentity.produce("cabinet-model.js:generator-call-23",()=>handleMesh(node,x,y+dh*.7,d/2+.012));
    components.mountDrawer(g,node,{column:i,drawer:j,lane});}y+=dh;
   },(item,slot)=>item?.partId||"drawer:"+slot);
   if(col.doorBottom!==undefined)y=base+col.doorBottom/1000;
   const door=C.frontDoor(f,i,c);if(door==='none'||options.doors==='hidden')return;
   const span=faceSpan(i),doorBottom=y-t+faceInset,doorTop=C.topDoorLimit(f,c)/1000,count=C.frontLeafCount(f,i,c);
   const bands=hanging?hanging.bands.map(b=>({...b,bottom:b.bottom/1000,top:b.top/1000})):[{section:'storage',bottom:doorBottom,top:doorTop}];
   const buildBand=band=>{
   for(let j of syncIdentity.range("cabinet-model.js:generator-45",0,count,1,false)){
    const front=d/2-(entryStyle||c.doorOverlay!==undefined||col.doorBottom!==undefined?t/2:0),pose=C.doorPose(door,span.left*1000,span.right*1000,band.bottom*1000,band.top*1000,front*1000,j,count,C.doorPairing(col),C.doorSingleHinge(col,door),col.doorLayout,col.doorRatios,c.thickness),pivot=components.door({pose,column:i,section:band.section,leaf:j,angle:hanging?C.doorAngle(c,col,band.section,j):C.doorLeafAngle(c,col,j),site:'cabinet-model:site-76',color:faceColor,glass:col.finish==='glass',roughness:.15});
    const local=pose.localX/1000,vertical=!C.verticalDoor(door);
    syncIdentity.produce("cabinet-model.js:generator-call-24",()=>handleMesh(pivot,vertical?local+(pose.right?-1:1)*((pose.width+2)/2000-.04):local,pose.localBottom/1000+(vertical?(band.top-band.bottom)*.5:door==='up'?.04:pose.height/1000-.04),.025,vertical));
    components.mountDoor(g,pivot,pose,{column:i,leaf:j,...(hanging?{section:band.section}:{})});
   }
   };if(hanging)syncIdentity.each('wardrobe-hanging:front-bands',bands,buildBand,band=>band.section);else buildBand(bands[0]);
  },(item,slot)=>item?.partId||"column:"+slot);
  if(roundedBookcase&&options.blenderAssets!==false){const loader=root.FurnishBookcaseAssetModel||(typeof require==='function'?require('./bookcase-asset-model.js'):null);if(loader)loader.apply(THREE,g);}
  components.complete();
  if(options.outlines)g.traverse(o=>{if(o.isMesh){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x493b2d,transparent:true,opacity:.9}));edges.userData.cabinetOwnMaterial=true;o.add(edges);}});
  const placement=C.pegboardPlacement(f,c);if(placement?.offset)for(const child of g.children)child.position.y+=placement.offset/1000;
  return g;
 }
 function build(THREE,f,box,options={}){
  const model=syncIdentity.produce("cabinet-model.js:generator-call-25",()=>buildRaw(THREE,f,box,options));
  // Capture the actual exterior front before service cuts replace its geometry.
  model.traverse(o=>{if(o.userData.cabinetDrawerBoard!=='front')return;const p=o.geometry.parameters;o.userData.cabinetDrawerSize={width:p.width*1000,height:p.height*1000};});
  return cutServices(THREE,model,f,{...options,cabinetOnly:f.type==='vanity'});
 }
 function cutServices(THREE,g,f,options={}){
  const services=root.FurnishServices;
  const pipes=services&&options.plan?services.pipes(options.plan).map(p=>{const z=(root.FurnishProducts||require('../core/product-rules.js')).floorBase(options.plan,f,options.furniture).z;return {...p,vertical:{bottom:p.vertical.bottom-z,top:p.vertical.top-z}};}).filter(p=>services.bodyHit(f,p,0)):[];
  if(!pipes.length)return g;
  // Cut in the closed pose once. The resulting holes travel with moving parts.
  const transforms=[];
  g.traverse(o=>{if(o.isGroup&&o.userData.cabinetPart){transforms.push([o,o.position.clone(),o.rotation.clone()]);o.rotation.set(0,0,0);if(o.userData.cabinetPart.lid)o.position.z=f.d/2000;else if(o.userData.cabinetPart.drawer!==undefined)o.position.z=0;}});
  g.updateMatrixWorld(true);
  for(const pipe of pipes){
   const local=services.local(f,pipe,{cabinetOnly:!!options.cabinetOnly}),height=(local.vertical.top-local.vertical.bottom)/1000;
   const cutter=new THREE.CylinderGeometry(pipe.radius/1000/Math.cos(Math.PI/64),pipe.radius/1000/Math.cos(Math.PI/64),height,64);cutter.translate(local.at[0]/1000,local.vertical.bottom/1000+height/2,local.at[1]/1000);
   const cutterBox=new THREE.Box3().setFromBufferAttribute(cutter.attributes.position);
   g.traverse(o=>{if(!o.isMesh)return;const bounds=new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position).applyMatrix4(o.matrixWorld);if(!bounds.intersectsBox(cutterBox))return;
    const geometry=root.FurnishSolidCut.subtract(THREE,o.geometry,o.matrixWorld,cutter);o.geometry.dispose();o.geometry=geometry;o.userData.serviceCuts=[...(o.userData.serviceCuts||[]),pipe.id];
    for(const edge of [...o.children])if(edge.isLineSegments){o.remove(edge);edge.geometry.dispose();edge.geometry=new THREE.EdgesGeometry(geometry);o.add(edge);}
   });cutter.dispose();
  }
  for(const [o,position,rotation]of transforms){o.position.copy(position);o.rotation.copy(rotation);}g.updateMatrixWorld(true);g.userData.serviceCuts=pipes.map(p=>p.id);return g;
 }
 root.FurnishCabinetModel={build,cutServices,buildRaw,createComponents};
 if(typeof module!=='undefined')module.exports=root.FurnishCabinetModel;
})(typeof globalThis!=='undefined'?globalThis:this);
